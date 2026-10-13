"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireCaptain = requireCaptain;
exports.requireRider = requireRider;
exports.requireAdmin = requireAdmin;
exports.requireVerifiedStudent = requireVerifiedStudent;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../db/database");
const JWT_SECRET = process.env.JWT_SECRET || 'goflyp_jwt_secret_alliance_university_campus_ride_split_2026_super_secure';
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required. No token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const userRow = database_1.db.prepare(`
      SELECT id, email, full_name, role, is_verified 
      FROM users 
      WHERE id = ?
    `).get(decoded.id);
        if (!userRow) {
            res.status(401).json({ error: 'Invalid session. User no longer exists.' });
            return;
        }
        req.user = {
            id: userRow.id,
            email: userRow.email,
            fullName: userRow.full_name,
            role: userRow.role,
            isVerified: Boolean(userRow.is_verified),
        };
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
}
function requireCaptain(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
    }
    if (req.user.role !== 'captain' && req.user.role !== 'both' && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden. Captain role permissions required to publish or manage rides.' });
        return;
    }
    next();
}
function requireRider(req, res, next) {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
    }
    if (req.user.role !== 'rider' && req.user.role !== 'both' && req.user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden. Rider role permissions required to search or book seats.' });
        return;
    }
    next();
}
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden. Administrator authorization required.' });
        return;
    }
    next();
}
function requireVerifiedStudent(req, res, next) {
    if (!req.user || !req.user.isVerified) {
        res.status(403).json({
            error: 'Campus verification required. Please submit your Alliance University student ID for approval.',
            needsVerification: true,
        });
        return;
    }
    next();
}
