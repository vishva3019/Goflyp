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
// GET /api/chat/:bookingId - Fetch messages for this booking
router.get('/:bookingId', auth_1.requireAuth, (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const booking = database_1.db.prepare(`
    SELECT b.id, b.rider_id, r.captain_id, b.status 
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    WHERE b.id = ?
  `).get(bookingId);
    if (!booking) {
        res.status(404).json({ error: 'Journey booking not found.' });
        return;
    }
    // Authorization check: User must be either the rider or the captain
    if (booking.rider_id !== userId && booking.captain_id !== userId && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized to view messages for this booking.' });
        return;
    }
    // Mark unread messages sent by the other party as read
    database_1.db.prepare(`
    UPDATE chat_messages 
    SET is_read = 1 
    WHERE booking_id = ? AND sender_id != ? AND is_read = 0
  `).run(bookingId, userId);
    // Retrieve chat messages with sender details
    const messages = database_1.db.prepare(`
    SELECT 
      m.id,
      m.booking_id,
      m.sender_id,
      m.message,
      m.is_read,
      m.created_at,
      u.full_name as sender_name,
      u.role as sender_role
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.booking_id = ?
    ORDER BY m.created_at ASC
  `).all(bookingId);
    res.json({
        count: messages.length,
        messages: messages.map((m) => ({
            id: m.id,
            bookingId: m.booking_id,
            senderId: m.sender_id,
            senderName: m.sender_name,
            message: m.message,
            isRead: Boolean(m.is_read),
            createdAt: m.created_at,
            isMe: m.sender_id === userId,
        })),
    });
});
// POST /api/chat/:bookingId - Send a chat message
router.post('/:bookingId', auth_1.requireAuth, (req, res) => {
    const { bookingId } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
    }
    const booking = database_1.db.prepare(`
    SELECT b.id, b.rider_id, r.captain_id, b.status 
    FROM bookings b
    JOIN rides r ON b.ride_id = r.id
    WHERE b.id = ?
  `).get(bookingId);
    if (!booking) {
        res.status(404).json({ error: 'Journey booking not found.' });
        return;
    }
    // Authorization check
    const isRider = booking.rider_id === userId;
    const isCaptain = booking.captain_id === userId;
    if (!isRider && !isCaptain && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Unauthorized to participate in this journey chat.' });
        return;
    }
    const messageId = node_crypto_1.default.randomUUID();
    const createdAt = new Date().toISOString();
    database_1.db.prepare(`
    INSERT INTO chat_messages (id, booking_id, sender_id, message, is_read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(messageId, bookingId, userId, message.trim(), createdAt);
    // Notify the other party
    const recipientId = isRider ? booking.captain_id : booking.rider_id;
    const notifId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, type, action_url)
    VALUES (?, ?, 'New Message', ?, 'chat_message', ?)
  `).run(notifId, recipientId, `${req.user.fullName}: ${message.trim().slice(0, 80)}`, `/chat/${bookingId}`);
    res.status(201).json({
        message: 'Message sent.',
        chatMessage: {
            id: messageId,
            bookingId,
            senderId: userId,
            senderName: req.user.fullName,
            message: message.trim(),
            isRead: false,
            createdAt,
            isMe: true,
        },
    });
});
exports.default = router;
