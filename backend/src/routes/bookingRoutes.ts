import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db/database';
import { requireAuth, requireRider, requireCaptain, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/bookings - Rider requests a seat (Atomic reservation)
router.post('/', requireAuth, requireRider, (req: AuthRequest, res: Response) => {
  const riderId = req.user!.id;
  const { rideId, pickupName, pickupLat, pickupLng, dropoffName, dropoffLat, dropoffLng } = req.body;

  if (!rideId) {
    res.status(400).json({ error: 'rideId is required to book a seat.' });
    return;
  }

  // Atomic transaction
  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    const ride = db.prepare(`
      SELECT id, captain_id, origin_name, destination_name, available_seats, contribution_amount, status
      FROM rides 
      WHERE id = ?
    `).get(rideId) as any;

    if (!ride) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Ride not found.' });
      return;
    }

    if (ride.status !== 'published') {
      db.exec('ROLLBACK;');
      res.status(400).json({ error: `Cannot book a ride that is already ${ride.status}.` });
      return;
    }

    // Prevent Self-booking
    if (ride.captain_id === riderId) {
      db.exec('ROLLBACK;');
      res.status(400).json({ error: 'Captains cannot book a seat on their own ride.' });
      return;
    }

    // Prevent Duplicate booking
    const existing = db.prepare(`
      SELECT id, status FROM bookings 
      WHERE ride_id = ? AND rider_id = ? AND status IN ('pending', 'accepted')
    `).get(rideId, riderId) as any;

    if (existing) {
      db.exec('ROLLBACK;');
      res.status(409).json({ error: 'You already have an active seat reservation on this journey.' });
      return;
    }

    // Check available capacity (Strictly prevent overbooking)
    if (ride.available_seats <= 0) {
      db.exec('ROLLBACK;');
      res.status(409).json({ error: 'This motorcycle journey has reached maximum passenger capacity (Full).' });
      return;
    }

    // Decrement available seats atomically
    db.prepare('UPDATE rides SET available_seats = available_seats - 1 WHERE id = ?').run(rideId);

    const bookingId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO bookings (
        id, ride_id, rider_id, pickup_name, pickup_lat, pickup_lng, dropoff_name, dropoff_lat, dropoff_lng,
        seats_requested, status, contribution_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'pending', ?)
    `).run(
      bookingId,
      rideId,
      riderId,
      pickupName || ride.origin_name,
      pickupLat || null,
      pickupLng || null,
      dropoffName || ride.destination_name,
      dropoffLat || null,
      dropoffLng || null,
      ride.contribution_amount
    );

    // Create Initial Payment Record in 'pending' status
    const paymentId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO payments (id, booking_id, amount, payment_method, status)
      VALUES (?, ?, ?, 'upi', 'pending')
    `).run(paymentId, bookingId, ride.contribution_amount);

    // Notify Captain
    const notifId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, action_url)
      VALUES (?, ?, 'New Seat Request', ?, 'seat_request', ?)
    `).run(
      notifId,
      ride.captain_id,
      `${req.user!.fullName} requested a seat on your journey to ${ride.destination_name}.`,
      `/trip/${bookingId}`
    );

    db.exec('COMMIT;');

    res.status(201).json({
      message: 'Seat requested successfully. Awaiting Captain confirmation.',
      bookingId,
      status: 'pending',
      contributionAmount: ride.contribution_amount,
    });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to process booking reservation.', details: err.message });
  }
});

// GET /api/bookings/rider/my-bookings
router.get('/rider/my-bookings', requireAuth, requireRider, (req: AuthRequest, res: Response) => {
  const riderId = req.user!.id;
  const bookings = db.prepare(`
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
  `).all(riderId) as any[];

  res.json({ count: bookings.length, bookings });
});

// GET /api/bookings/captain/requests
router.get('/captain/requests', requireAuth, requireCaptain, (req: AuthRequest, res: Response) => {
  const captainId = req.user!.id;
  const status = req.query.status as string | undefined;

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
  const params: any[] = [captainId];

  if (status) {
    query += ' AND b.status = ?';
    params.push(status);
  }

  query += ' ORDER BY b.booked_at DESC';

  const requests = db.prepare(query).all(...params) as any[];

  res.json({ count: requests.length, requests });
});

// GET /api/bookings/:id - Get specific booking details
router.get('/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const booking = db.prepare(`
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
  `).get(id) as any;

  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  // Authorization check: User must be either the rider or captain (or admin)
  if (booking.rider_id !== userId && booking.captain_id !== userId && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized to view this booking record.' });
    return;
  }

  res.json({ booking });
});

// PATCH /api/bookings/:id/accept - Captain accepts booking
router.patch('/:id/accept', requireAuth, requireCaptain, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const captainId = req.user!.id;

  const booking = db.prepare(`
    SELECT b.id, b.status, b.rider_id, r.destination_name, r.captain_id 
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    WHERE b.id = ?
  `).get(id) as any;

  if (!booking) {
    res.status(404).json({ error: 'Booking not found.' });
    return;
  }

  if (booking.captain_id !== captainId && req.user!.role !== 'admin') {
    res.status(403).json({ error: 'Unauthorized to accept requests for this ride.' });
    return;
  }

  db.prepare("UPDATE bookings SET status = 'accepted', updated_at = datetime('now') WHERE id = ?").run(id);

  const updatedBooking = db.prepare(`
    SELECT b.*, r.origin_name, r.destination_name, r.departure_time, u.full_name as rider_name
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    JOIN users u ON b.rider_id = u.id
    WHERE b.id = ?
  `).get(id);

  // Notify Rider
  const notifId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, action_url)
    VALUES (?, ?, 'Seat Request Accepted!', 'Captain accepted your seat reservation. View confirmed trip.', 'ride_confirmed', ?)
  `).run(notifId, booking.rider_id, `/trip/${id}`);

  res.json({ message: 'Booking request accepted.', status: 'accepted', booking: updatedBooking });
});

// PATCH /api/bookings/:id/reject - Captain rejects booking
router.patch('/:id/reject', requireAuth, requireCaptain, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const captainId = req.user!.id;

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const booking = db.prepare(`
      SELECT b.id, b.ride_id, b.status, b.rider_id, r.captain_id 
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE b.id = ?
    `).get(id) as any;

    if (!booking) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (booking.captain_id !== captainId && req.user!.role !== 'admin') {
      db.exec('ROLLBACK;');
      res.status(403).json({ error: 'Unauthorized.' });
      return;
    }

    db.prepare("UPDATE bookings SET status = 'rejected', updated_at = datetime('now') WHERE id = ?").run(id);
    // Release reserved seat back to available capacity
    db.prepare('UPDATE rides SET available_seats = available_seats + 1 WHERE id = ?').run(booking.ride_id);

    db.exec('COMMIT;');
    res.json({ message: 'Booking request rejected. Seat released.', status: 'rejected', bookingId: id });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to reject booking.', details: err.message });
  }
});

// PATCH /api/bookings/:id/cancel - Rider cancels booking
router.patch('/:id/cancel', requireAuth, requireRider, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const riderId = req.user!.id;

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const booking = db.prepare(`
      SELECT b.id, b.ride_id, b.status, b.rider_id, r.captain_id 
      FROM bookings b
      JOIN rides r ON b.ride_id = r.id
      WHERE b.id = ? AND b.rider_id = ?
    `).get(id, riderId) as any;

    if (!booking) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Booking not found or unauthorized.' });
      return;
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      db.exec('ROLLBACK;');
      res.status(400).json({ error: `Cannot cancel booking with status ${booking.status}.` });
      return;
    }

    db.prepare("UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
    // Release seat back to ride
    db.prepare('UPDATE rides SET available_seats = available_seats + 1 WHERE id = ?').run(booking.ride_id);

    db.exec('COMMIT;');
    res.json({ message: 'Reservation cancelled. Seat released back to ride.', status: 'cancelled' });
  } catch (err: any) {
    db.exec('ROLLBACK;');
    res.status(500).json({ error: 'Failed to cancel booking.', details: err.message });
  }
});

export default router;
