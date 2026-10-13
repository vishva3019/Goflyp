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
// PATCH /api/trips/:id/start - Captain starts trip
router.patch('/:id/start', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const { id } = req.params;
    const captainId = req.user.id;
    const ride = database_1.db.prepare('SELECT id, captain_id, status FROM rides WHERE id = ?').get(id);
    if (!ride) {
        res.status(404).json({ error: 'Ride not found.' });
        return;
    }
    if (ride.captain_id !== captainId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized to start this ride.' });
        return;
    }
    if (ride.status !== 'published') {
        res.status(400).json({ error: `Cannot start ride with current status '${ride.status}'.` });
        return;
    }
    database_1.db.prepare("UPDATE rides SET status = 'started' WHERE id = ?").run(id);
    database_1.db.prepare("UPDATE bookings SET status = 'accepted' WHERE ride_id = ? AND status = 'pending'").run(id);
    // Notify riders
    const bookings = database_1.db.prepare('SELECT rider_id FROM bookings WHERE ride_id = ?').all(id);
    for (const b of bookings) {
        const notifId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, action_url)
      VALUES (?, ?, 'Journey Started', 'Captain has started the motorcycle journey. Strapping on helmets.', 'ride_started', ?)
    `).run(notifId, b.rider_id, `/trip/${id}`);
    }
    res.json({ message: 'Trip successfully started.', status: 'started' });
});
// PATCH /api/trips/:id/complete - Captain completes trip
router.patch('/:id/complete', auth_1.requireAuth, auth_1.requireCaptain, (req, res) => {
    const { id } = req.params;
    const captainId = req.user.id;
    const ride = database_1.db.prepare('SELECT id, captain_id, status, distance_km FROM rides WHERE id = ?').get(id);
    if (!ride) {
        res.status(404).json({ error: 'Ride not found.' });
        return;
    }
    if (ride.captain_id !== captainId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
    }
    if (ride.status !== 'started') {
        res.status(400).json({ error: 'Trip must be started before it can be completed.' });
        return;
    }
    const co2PreventedKg = Math.round((ride.distance_km * 0.12) * 10) / 10; // ~120g CO2 per km car displacement
    database_1.db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
        database_1.db.prepare("UPDATE rides SET status = 'completed' WHERE id = ?").run(id);
        database_1.db.prepare("UPDATE bookings SET status = 'completed', updated_at = datetime('now') WHERE ride_id = ? AND status = 'accepted'").run(id);
        // Update Captain stats
        database_1.db.prepare(`
      UPDATE users SET 
        trips_completed = trips_completed + 1,
        co2_saved_kg = co2_saved_kg + ?
      WHERE id = ?
    `).run(co2PreventedKg, captainId);
        // Update Rider stats
        const riders = database_1.db.prepare("SELECT rider_id FROM bookings WHERE ride_id = ? AND status = 'completed'").all(id);
        for (const r of riders) {
            database_1.db.prepare(`
        UPDATE users SET 
          trips_completed = trips_completed + 1,
          co2_saved_kg = co2_saved_kg + ?
        WHERE id = ?
      `).run(co2PreventedKg, r.rider_id);
            const notifId = node_crypto_1.default.randomUUID();
            database_1.db.prepare(`
        INSERT INTO notifications (id, user_id, title, message, type, action_url)
        VALUES (?, ?, 'Journey Completed!', 'You have arrived safely. Please complete your direct peer fuel contribution.', 'system', ?)
      `).run(notifId, r.rider_id, `/payment/${id}`);
        }
        database_1.db.exec('COMMIT;');
        res.json({ message: 'Trip successfully completed.', status: 'completed', co2SavedKg: co2PreventedKg });
    }
    catch (err) {
        database_1.db.exec('ROLLBACK;');
        res.status(500).json({ error: 'Failed to complete trip.', details: err.message });
    }
});
// POST /api/trips/telemetry - Captain posts real GPS coordinate during trip
router.post('/telemetry', auth_1.requireAuth, (req, res) => {
    const { tripId, lat, lng, speed, heading } = req.body;
    const userId = req.user.id;
    if (!tripId || lat === undefined || lng === undefined) {
        res.status(400).json({ error: 'tripId, lat, and lng are required.' });
        return;
    }
    const pingId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO trip_telemetry (id, trip_id, user_id, lat, lng, speed, heading, event_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'location_ping')
  `).run(pingId, tripId, userId, lat, lng, speed || 0, heading || 0);
    res.json({ success: true, timestamp: new Date().toISOString() });
});
// GET /api/trips/:id/telemetry - Fetch live GPS updates for trip participants
router.get('/:id/telemetry', auth_1.requireAuth, (req, res) => {
    const { id } = req.params;
    const latestPing = database_1.db.prepare(`
    SELECT lat, lng, speed, heading, created_at
    FROM trip_telemetry
    WHERE trip_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(id);
    res.json({ telemetry: latestPing || null });
});
// POST /api/trips/sos - Emergency SOS Alert
router.post('/sos', auth_1.requireAuth, (req, res) => {
    const { tripId, lat, lng, message } = req.body;
    const userId = req.user.id;
    const incidentId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO incident_reports (id, user_id, ride_id, lat, lng, message, status)
    VALUES (?, ?, ?, ?, ?, ?, 'open')
  `).run(incidentId, userId, tripId || null, lat || 12.8256, lng || 77.7123, message || 'Emergency SOS triggered by student.');
    res.status(201).json({
        message: 'Campus Security SOS triggered. Coordinates transmitted to Alliance University Desk.',
        incidentId,
        emergencyHotline: '080-4619-9000',
    });
});
exports.default = router;
