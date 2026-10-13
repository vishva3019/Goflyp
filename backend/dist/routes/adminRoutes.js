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
// GET /api/admin/stats - Live database statistics
router.get('/stats', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const totalUsers = database_1.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const verifiedStudents = database_1.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_verified = 1').get().count;
    const totalCaptains = database_1.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'captain' OR role = 'both'").get().count;
    const publishedRides = database_1.db.prepare("SELECT COUNT(*) as count FROM rides WHERE status = 'published'").get().count;
    const completedTrips = database_1.db.prepare("SELECT COUNT(*) as count FROM rides WHERE status = 'completed'").get().count;
    const totalRides = database_1.db.prepare('SELECT COUNT(*) as count FROM rides').get().count;
    const co2Result = database_1.db.prepare('SELECT SUM(co2_saved_kg) as total_co2 FROM users').get();
    const totalCo2SavedKg = Math.round((co2Result?.total_co2 || 0) * 10) / 10;
    const pendingVerifications = database_1.db.prepare("SELECT COUNT(*) as count FROM student_verifications WHERE status = 'pending'").get().count;
    const pendingVehicles = database_1.db.prepare('SELECT COUNT(*) as count FROM vehicles WHERE is_verified = 0').get().count;
    const statsPayload = {
        totalUsers,
        totalStudents: verifiedStudents,
        verifiedStudents,
        totalCaptains,
        publishedRides,
        completedTrips,
        totalRides,
        totalCo2SavedKg,
        pendingVerifications,
        pendingVehicles,
    };
    res.json({
        stats: statsPayload,
        ...statsPayload,
    });
});
// GET /api/admin/verifications - Pending & submitted student and vehicle verification requests
router.get('/verifications', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    // 1. Query student identity verifications
    const studentVerifs = database_1.db.prepare(`
    SELECT 
      sv.id,
      sv.user_id,
      sv.verification_type,
      sv.university_email,
      sv.reg_number,
      sv.id_card_image_url,
      sv.status,
      sv.submitted_at,
      sv.reviewed_at,
      sv.reviewer_id,
      sv.remarks,
      u.full_name,
      u.email,
      u.phone,
      u.department,
      u.role,
      v.make as vehicle_make,
      v.model as vehicle_model,
      v.year as vehicle_year,
      v.registration_number,
      v.color as vehicle_color,
      v.rc_document_url
    FROM student_verifications sv
    JOIN users u ON sv.user_id = u.id
    LEFT JOIN vehicles v ON v.user_id = u.id
    ORDER BY sv.submitted_at DESC
  `).all();
    const mappedStudentVerifs = studentVerifs.map((row) => {
        let verificationType = row.verification_type;
        if (!verificationType) {
            if (process.env.NODE_ENV !== 'test') {
                console.warn(`[Admin API] Legacy record: student verification ${row.id} for user ${row.user_id} has null/missing verification_type.`);
            }
            verificationType = null; // Do NOT fabricate; preserve null so frontend can render UNKNOWN / UNSPECIFIED
        }
        return {
            id: row.id,
            user_id: row.user_id,
            verification_type: verificationType,
            status: row.status || 'pending',
            full_name: row.full_name || 'Alliance Student',
            email: row.email || row.university_email || 'N/A',
            phone: row.phone || '',
            department: row.department || 'Alliance University',
            reg_number: row.reg_number || null,
            id_card_image_url: row.id_card_image_url || null,
            submitted_at: row.submitted_at,
            reviewed_at: row.reviewed_at || null,
            reviewer_id: row.reviewer_id || null,
            remarks: row.remarks || null,
            vehicle_make: row.vehicle_make || null,
            vehicle_model: row.vehicle_model || null,
            vehicle_year: row.vehicle_year || null,
            registration_number: row.registration_number || null,
            vehicle_color: row.vehicle_color || null,
            rc_document_url: row.rc_document_url || null,
        };
    });
    // 2. Query motorcycle RC verifications
    const vehicleRows = database_1.db.prepare(`
    SELECT 
      v.id,
      v.user_id,
      v.make,
      v.model,
      v.year,
      v.registration_number,
      v.color,
      v.helmet_provided,
      v.rc_document_url,
      v.is_verified,
      v.created_at,
      u.full_name,
      u.email,
      u.phone,
      u.department,
      u.reg_number
    FROM vehicles v
    JOIN users u ON v.user_id = u.id
    ORDER BY v.created_at DESC
  `).all();
    const mappedVehicleVerifs = vehicleRows.map((v) => ({
        id: v.id,
        user_id: v.user_id,
        verification_type: 'vehicle_rc',
        status: v.is_verified === 1 ? 'approved' : 'pending',
        full_name: v.full_name || 'Captain Student',
        email: v.email || 'N/A',
        phone: v.phone || '',
        department: v.department || 'Alliance University',
        reg_number: v.reg_number || null,
        id_card_image_url: null,
        submitted_at: v.created_at,
        reviewed_at: null,
        reviewer_id: null,
        remarks: null,
        vehicle_make: v.make,
        vehicle_model: v.model,
        vehicle_year: v.year,
        registration_number: v.registration_number,
        vehicle_color: v.color,
        rc_document_url: v.rc_document_url,
    }));
    // Combine both types of verification into a single unified list
    const allVerifications = [...mappedStudentVerifs, ...mappedVehicleVerifs].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    res.json({
        verifications: allVerifications,
        vehicles: vehicleRows,
    });
});
// PATCH /api/admin/verifications/:id/approve - Approve student verification or motorcycle RC
router.patch('/verifications/:id/approve', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    // Check student_verifications table
    const verif = database_1.db.prepare('SELECT user_id FROM student_verifications WHERE id = ?').get(id);
    if (verif) {
        database_1.db.prepare(`
      UPDATE student_verifications SET 
        status = 'approved',
        reviewed_at = datetime('now'),
        reviewer_id = ?
      WHERE id = ?
    `).run(adminId, id);
        database_1.db.prepare('UPDATE users SET is_verified = 1 WHERE id = ?').run(verif.user_id);
        const logId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
      VALUES (?, ?, 'APPROVE_STUDENT', 'user', ?, 'Approved Alliance University student ID credentials.')
    `).run(logId, adminId, verif.user_id);
        res.json({ message: 'Student verification approved.', id, status: 'approved' });
        return;
    }
    // Check vehicles table
    const vehicle = database_1.db.prepare('SELECT id, user_id FROM vehicles WHERE id = ?').get(id);
    if (vehicle) {
        database_1.db.prepare('UPDATE vehicles SET is_verified = 1 WHERE id = ?').run(id);
        const logId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
      VALUES (?, ?, 'APPROVE_VEHICLE', 'vehicle', ?, 'Motorcycle RC and safety compliance verified.')
    `).run(logId, adminId, id);
        res.json({ message: 'Vehicle RC document approved.', id, status: 'approved' });
        return;
    }
    res.status(404).json({ error: 'Verification submission not found.' });
});
// PATCH /api/admin/verifications/:id/reject - Reject student verification or motorcycle RC
router.patch('/verifications/:id/reject', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;
    const reason = rejectionReason || 'Document requirements not met.';
    // Check student_verifications table
    const verif = database_1.db.prepare('SELECT user_id FROM student_verifications WHERE id = ?').get(id);
    if (verif) {
        database_1.db.prepare(`
      UPDATE student_verifications SET 
        status = 'rejected',
        reviewed_at = datetime('now'),
        reviewer_id = ?,
        remarks = ?
      WHERE id = ?
    `).run(adminId, reason, id);
        database_1.db.prepare('UPDATE users SET is_verified = 0 WHERE id = ?').run(verif.user_id);
        const logId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REJECT_STUDENT', 'user', ?, ?)
    `).run(logId, adminId, verif.user_id, `Rejected student ID credentials: ${reason}`);
        res.json({ message: 'Student verification rejected.', id, status: 'rejected' });
        return;
    }
    // Check vehicles table
    const vehicle = database_1.db.prepare('SELECT id, user_id FROM vehicles WHERE id = ?').get(id);
    if (vehicle) {
        database_1.db.prepare('UPDATE vehicles SET is_verified = 0 WHERE id = ?').run(id);
        const logId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
      VALUES (?, ?, 'REJECT_VEHICLE', 'vehicle', ?, ?)
    `).run(logId, adminId, id, `Rejected vehicle RC compliance: ${reason}`);
        res.json({ message: 'Vehicle RC document rejected.', id, status: 'rejected' });
        return;
    }
    res.status(404).json({ error: 'Verification submission not found.' });
});
// PATCH /api/admin/vehicles/:id/approve - Approve Captain motorcycle RC
router.patch('/vehicles/:id/approve', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const { id } = req.params;
    const adminId = req.user.id;
    const vehicle = database_1.db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!vehicle) {
        res.status(404).json({ error: 'Vehicle record not found.' });
        return;
    }
    database_1.db.prepare('UPDATE vehicles SET is_verified = 1 WHERE id = ?').run(id);
    const logId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
    VALUES (?, ?, 'APPROVE_VEHICLE', 'vehicle', ?, 'Motorcycle RC and safety compliance verified.')
  `).run(logId, adminId, id);
    res.json({ message: 'Vehicle RC document approved.' });
});
// PATCH /api/admin/vehicles/:id/reject - Reject Captain motorcycle RC
router.patch('/vehicles/:id/reject', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.id;
    const vehicle = database_1.db.prepare('SELECT id FROM vehicles WHERE id = ?').get(id);
    if (!vehicle) {
        res.status(404).json({ error: 'Vehicle record not found.' });
        return;
    }
    database_1.db.prepare('UPDATE vehicles SET is_verified = 0 WHERE id = ?').run(id);
    const logId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
    VALUES (?, ?, 'REJECT_VEHICLE', 'vehicle', ?, ?)
  `).run(logId, adminId, id, rejectionReason || 'Motorcycle RC document rejected.');
    res.json({ message: 'Vehicle RC document rejected.' });
});
// GET /api/admin/campus - Campus settings
router.get('/campus', (req, res) => {
    const settings = database_1.db.prepare('SELECT * FROM campus_settings LIMIT 1').get();
    if (!settings) {
        res.status(404).json({ error: 'Campus settings not found.' });
        return;
    }
    res.json({
        ...settings,
        approvedPickupPoints: JSON.parse(settings.approved_pickup_points_json),
    });
});
// PUT /api/admin/campus - Update Campus settings
router.put('/campus', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const { campusName, centerLat, centerLng, allowedEmailDomain, mainEntranceName, approvedPickupPoints } = req.body;
    const adminId = req.user.id;
    database_1.db.prepare(`
    UPDATE campus_settings SET 
      campus_name = ?,
      center_lat = ?,
      center_lng = ?,
      allowed_email_domain = ?,
      main_entrance_name = ?,
      approved_pickup_points_json = ?,
      updated_at = datetime('now')
  `).run(campusName, centerLat, centerLng, allowedEmailDomain, mainEntranceName, JSON.stringify(approvedPickupPoints || []));
    const logId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details)
    VALUES (?, ?, 'UPDATE_CAMPUS_SETTINGS', 'campus', 'alliance', 'Updated verified campus coordinates and pickup gates.')
  `).run(logId, adminId);
    res.json({ message: 'Campus settings updated successfully.' });
});
// GET /api/admin/audit-logs
router.get('/audit-logs', auth_1.requireAuth, auth_1.requireAdmin, (req, res) => {
    const logs = database_1.db.prepare(`
    SELECT al.*, u.full_name as actor_name, u.email as actor_email
    FROM audit_logs al
    JOIN users u ON al.actor_id = u.id
    ORDER BY al.timestamp DESC
    LIMIT 50
  `).all();
    res.json({ logs });
});
exports.default = router;
