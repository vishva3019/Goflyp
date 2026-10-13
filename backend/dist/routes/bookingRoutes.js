"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/bookings - Rider requests a seat (Atomic reservation)
router.post('/', auth_1.requireAuth, auth_1.requireRider, (req, res) => {
    const riderId = req.user.id;
    const { rideId, pickupName, pickupLat, pickupLng, dropoffName, dropoffLat, dropoffLng } = req.body;
    if (!rideId) {
        res.status(400).json({ error: 'rideId is required to book a seat.' });
        return;
    }
    // Atomic transaction
    database_1.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
        const ride = database_1.db.prepare(`
      SELECT id, captain_id, origin_name, destination_name, available_seats, contribution_amount, status
      FROM rides 
      WHERE id = ?
    `).get(rideId);
        if (!ride) {
            database_1.db.exec('ROLLBACK;');
            res.status(404).json({ error: 'Ride not found.' });
            return;
        }
        if (ride.status !== 'published') {
            database_1.db.exec('ROLLBACK;');
            res.status(400).json({ error: `Cannot book a ride that is already ${ride.status}.` });
            return;
        }
        // Prevent Self-booking
        if (ride.captain_id === riderId) {
            database_1.db.exec('ROLLBACK;');
            res.status(400).json({ error: 'Captains cannot book a seat on their own ride.' });
            return;
        }
        // Prevent Duplicate booking
        const existing = database_1.db.prepare(`
      SELECT id, status FROM bookings 
      WHERE ride_id = ? AND rider_id = ? AND status IN ('pending', 'accepted')
    `).get(rideId, riderId);
        if (existing) {
            database_1.db.exec('ROLLBACK;');
            res.status(409).json({ error: 'You already have an active seat reservation on this journey.' });
            return;
        }
        // Check available capacity (Strictly prevent overbooking)
        if (ride.available_seats <= 0) {
            database_1.db.exec('ROLLBACK;');
            res.status(409).json({ error: 'This motorcycle journey has reached maximum passenger capacity (Full).' });
            return;
        }
        // Decrement available seats atomically
        database_1.db.prepare('UPDATE rides SET available_seats = available_seats - 1 WHERE id = ?').run(rideId);
        const bookingId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO bookings (
        id, ride_id, rider_id, pickup_name, pickup_lat, pickup_lng, dropoff_name, dropoff_lat, dropoff_lng,
        seats_requested, status, contribution_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?)
    `).run(bookingId, rideId, riderId, pickupName || ride.origin_name, pickupLat || null, pickupLng || null, dropoffName || ride.destination_name, dropoffLat || null, dropoffLng || null, ride.contribution_amount);
        // Create Initial Payment Record in 'pending' status
        const paymentId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO payments (id, booking_id, amount, payment_method, status)
      VALUES (?, ?, ?, 'upi', 'pending')
    `).run(paymentId, bookingId, ride.contribution_amount);
        // Notify Captain
        const notifId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, action_url)
      VALUES (?, ?, 'New Seat Request', ?, 'seat_request', ?)
    `).run(notifId, ride.captain_id, `${req.user.fullName} requested a seat on your journey to ${ride.destination_name}.`, `/trip/${bookingId}`);
        database_1.db.exec('COMMIT;');
        res.status(201).json({
            message: 'Seat requested successfully. Awaiting Captain confirmation.',
            bookingId,
            status: 'pending',
            contributionAmount: ride.contribution_amount,
        });
    }
    catch (err) {
        database_1.db.exec('ROLLBACK;');
        res.status(500).json({ error: 'Failed to process booking reservation.', details: err.message });
    }
});
// GET /api/bookings/rider/my-bookings
router.get('/rider/my-bookings', auth_1.requireAuth, auth_1.requireRider, (req, res) => {
    const riderId = req.user.id;
    const bookings = database_1.db.prepare(`
    SELECT 
      b.*,
      r.origin_name,
      r.destination_name,
      r.departure_date,
      r.departure_time,
      r.distance_km,
      r.duration_minutes,
      r.status as ride_status,
      u.full_name as captain_name,
      u.phone as captain_phone,
      u.rating as captain_rating,
      u.is_verified as captain_verified,
      u.upi_id as captain_upi,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.registration_number as vehicle_plate,
      p.status as payment_status,
      p.payment_method,
      p.upi_reference
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON r.captain_id = u.id
    LEFT JOIN vehicles v ON v.user_id = u.id
    LEFT JOIN payments p ON p.booking_id = b.id
    WHERE b.rider_id = ?
    ORDER BY b.booked_at DESC
  `).all(riderId);
    res.json({ count: bookings.length, bookings });
});
// GET /api/bookings/captain/requests
router.get('/captain/requests', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const captainId = req.user.id;
    const status = req.query.status;
    let query = `
    SELECT 
      b.*,
      r.origin_name,
      r.destination_name,
      r.origin_lat,
      r.origin_lng,
      r.destination_lat,
      r.destination_lng,
      r.departure_date,
      r.departure_time,
      r.distance_km,
      r.duration_minutes,
      r.status as ride_status,
      u.full_name as rider_name,
      u.phone as rider_phone,
      u.rating as rider_rating,
      u.department as rider_department,
      u.is_verified as rider_verified,
      p.status as payment_status
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON b.rider_id = u.id
    LEFT JOIN payments p ON p.booking_id = b.id
    WHERE r.captain_id = ?
  `;
    const params = [captainId];
    if (status) {
        query += ' AND b.status = ?';
        params.push(status);
    }
    query += ' ORDER BY b.booked_at DESC';
    const requests = database_1.db.prepare(query).all(...params);
    res.json({ count: requests.length, requests });
});
// GET /api/bookings/:id - Get specific booking details
router.get('/:id', auth_1.requireAuth, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const booking = database_1.db.prepare(`
    SELECT 
      b.*,
      r.origin_name,
      r.destination_name,
      r.origin_lat,
      r.origin_lng,
      r.destination_lat,
      r.destination_lng,
      r.departure_date,
      r.departure_time,
      r.distance_km,
      r.duration_minutes,
      r.status as ride_status,
      r.captain_id,
      cu.full_name as captain_name,
      cu.phone as captain_phone,
      cu.rating as captain_rating,
      cu.is_verified as captain_verified,
      cu.upi_id as captain_upi,
      ru.full_name as rider_name,
      ru.phone as rider_phone,
      ru.rating as rider_rating,
      ru.department as rider_department,
      ru.is_verified as rider_verified,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.registration_number as vehicle_plate,
      p.status as payment_status,
      p.payment_method,
      p.upi_reference
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users cu ON r.captain_id = cu.id
    JOIN users ru ON b.rider_id = ru.id
    LEFT JOIN vehicles v ON v.user_id = cu.id
    LEFT JOIN payments p ON p.booking_id = b.id
    WHERE b.id = ?
  `).get(id);
    if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
    }
    // Authorization check: User must be either the rider or captain (or admin)
    if (booking.rider_id !== userId && booking.captain_id !== userId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized to view this booking record.' });
        return;
    }
    res.json({ booking });
});
// PATCH /api/bookings/:id/accept - Captain accepts booking
router.patch('/:id/accept', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const { id } = req.params;
    const captainId = req.user.id;
    const booking = database_1.db.prepare(`
    SELECT b.id, b.status, b.rider_id, r.destination_name, r.captain_id 
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    WHERE b.id = ?
  `).get(id);
    if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
    }
    if (booking.captain_id !== captainId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized to accept requests for this ride.' });
        return;
    }
    database_1.db.prepare("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(id);
    const updatedBooking = database_1.db.prepare(`
    SELECT b.*, r.origin_name, r.destination_name, r.departure_time, u.full_name as rider_name
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON b.rider_id = u.id
    WHERE b.id = ?
  `).get(id);
    // Notify Rider
    const notifId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, action_url)
    VALUES (?, ?, 'Seat Request Accepted!', 'Captain accepted your seat reservation. View confirmed trip.', 'ride_confirmed', ?)
  `).run(notifId, booking.rider_id, `/trip/${id}`);
    res.json({ message: 'Booking request accepted.', status: 'accepted', booking: updatedBooking });
});
// PATCH /api/bookings/:id/reject - Captain rejects booking
router.patch('/:id/reject', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const { id } = req.params;
    const captainId = req.user.id;
    database_1.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
        const booking = database_1.db.prepare(`
      SELECT b.id, b.ride_id, b.status, b.rider_id, r.captain_id 
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE b.id = ?
    `).get(id);
        if (!booking) {
            database_1.db.exec('ROLLBACK;');
            res.status(404).json({ error: 'Booking not found.' });
            return;
        }
        if (booking.captain_id !== captainId && req.user.role !== 'admin') {
            database_1.db.exec('ROLLBACK;');
            res.status(403).json({ error: 'Unauthorized.' });
            return;
        }
        database_1.db.prepare("UPDATE bookings SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(id);
        // Release reserved seat back to available capacity
        database_1.db.prepare('UPDATE rides SET available_seats = available_seats + 1 WHERE id = ?').run(booking.ride_id);
        database_1.db.exec('COMMIT;');
        res.json({ message: 'Booking request rejected. Seat released.', status: 'rejected', bookingId: id });
    }
    catch (err) {
        database_1.db.exec('ROLLBACK;');
        res.status(500).json({ error: 'Failed to reject booking.', details: err.message });
    }
});
// PATCH /api/bookings/:id/cancel - Rider cancels booking
router.patch('/:id/cancel', auth_1.requireAuth, auth_1.requireRider, (req, res) => {
    const { id } = req.params;
    const riderId = req.user.id;
    database_1.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
        const booking = database_1.db.prepare(`
      SELECT b.id, b.ride_id, b.status, b.rider_id, r.captain_id 
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE b.id = ? AND b.rider_id = ?
    `).get(id, riderId);
        if (!booking) {
            database_1.db.exec('ROLLBACK;');
            res.status(404).json({ error: 'Booking not found or unauthorized.' });
            return;
        }
        if (booking.status === 'completed' || booking.status === 'cancelled') {
            database_1.db.exec('ROLLBACK;');
            res.status(400).json({ error: `Cannot cancel booking with status ${booking.status}.` });
            return;
        }
        database_1.db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
        // Release seat back to ride
        database_1.db.prepare('UPDATE rides SET available_seats = available_seats + 1 WHERE id = ?').run(booking.ride_id);
        database_1.db.exec('COMMIT;');
        res.json({ message: 'Reservation cancelled. Seat released back to ride.', status: 'cancelled' });
    }
    catch (err) {
        database_1.db.exec('ROLLBACK;');
        res.status(500).json({ error: 'Failed to cancel booking.', details: err.message });
    }
});
exports.default = router;
