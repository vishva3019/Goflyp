"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/payments/:bookingId/report - Rider reports payment
router.post('/:bookingId/report', auth_1.requireAuth, (req, res) => {
    const { bookingId } = req.params;
    const { paymentMethod, upiReference } = req.body;
    const riderId = req.user.id;
    const booking = database_1.db.prepare('SELECT id, rider_id FROM bookings WHERE id = ?').get(bookingId);
    if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
    }
    if (booking.rider_id !== riderId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
    }
    database_1.db.prepare(`
    UPDATE payments SET 
      payment_method = ?,
      status = 'reported',
      upi_reference = ?,
      reported_at = datetime('now')
    WHERE booking_id = ?
  `).run(paymentMethod || 'upi', upiReference || null, bookingId);
    res.json({ message: 'Payment reported successfully. Awaiting Captain confirmation.', status: 'reported' });
});
// PATCH /api/payments/:bookingId/confirm - Captain confirms payment receipt
router.patch('/:bookingId/confirm', auth_1.requireAuth, (req, res) => {
    const { bookingId } = req.params;
    const captainId = req.user.id;
    const booking = database_1.db.prepare(`
    SELECT b.id, r.captain_id 
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    WHERE b.id = ?
  `).get(bookingId);
    if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
    }
    if (booking.captain_id !== captainId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
    }
    database_1.db.prepare(`
    UPDATE payments SET 
      status = 'confirmed',
      confirmed_at = datetime('now')
    WHERE booking_id = ?
  `).run(bookingId);
    res.json({ message: 'Payment confirmed. Fuel contribution settled.', status: 'confirmed' });
});
// POST /api/payments/:bookingId/dispute - Captain reports payment issue
router.post('/:bookingId/dispute', auth_1.requireAuth, (req, res) => {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const captainId = req.user.id;
    const booking = database_1.db.prepare(`
    SELECT b.id, r.captain_id 
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    WHERE b.id = ?
  `).get(bookingId);
    if (!booking || (booking.captain_id !== captainId && req.user.role !== 'admin')) {
        res.status(403).json({ error: 'Unauthorized.' });
        return;
    }
    database_1.db.prepare(`
    UPDATE payments SET 
      status = 'disputed',
      dispute_reason = ?
    WHERE booking_id = ?
  `).run(reason || 'Payment not received.', bookingId);
    res.json({ message: 'Payment dispute registered.', status: 'disputed' });
});
exports.default = router;
