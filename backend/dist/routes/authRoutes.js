"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_1 = require("../db/database");
const auth_1 = require("../middleware/auth");
const domain_1 = require("../utils/domain");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'goflyp_jwt_secret_alliance_university_campus_ride_split_2026_super_secure';
// POST /api/auth/register
router.post('/register', (req, res) => {
    const { email, password, fullName, phone, role, university, department, regNumber, vehicle } = req.body;
    if (!email || !password || !fullName || !phone || !role) {
        res.status(400).json({
            error: 'Missing required registration fields (email, password, fullName, phone, role).',
            code: 'MISSING_FIELDS',
        });
        return;
    }
    // Validate email domain against campus setting / runtime domain
    const campusSetting = database_1.db.prepare('SELECT allowed_email_domain FROM campus_settings LIMIT 1').get();
    const allowedDomain = campusSetting?.allowed_email_domain || (0, domain_1.getAllianceEmailDomain)();
    if (role !== 'admin' && !(0, domain_1.isValidAllianceEmail)(email, allowedDomain)) {
        res.status(400).json({
            error: `Invalid university email. Please use your official university email (@${allowedDomain} or subdomains like @ced.${allowedDomain}).`,
            code: 'INVALID_EMAIL_DOMAIN',
        });
        return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const existing = database_1.db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
        res.status(409).json({
            error: 'An account with this university email already exists. Please log in.',
            code: 'ACCOUNT_EXISTS',
        });
        return;
    }
    const salt = bcryptjs_1.default.genSaltSync(10);
    const passwordHash = bcryptjs_1.default.hashSync(password, salt);
    const userId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO users (
      id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)
  `).run(userId, cleanEmail, passwordHash, fullName.trim(), phone.trim(), role, university || 'Alliance University', department || 'Alliance College of Engineering and Design (ACED)', regNumber || null);
    // If registering as Captain with vehicle
    let vehicleRecord = null;
    if ((role === 'captain' || role === 'both') && vehicle) {
        const vehicleId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO vehicles (
        id, user_id, make, model, year, registration_number, color, helmet_provided, rc_document_url, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(vehicleId, userId, vehicle.make || 'Motorcycle', vehicle.model || 'Bike', vehicle.year || 2024, vehicle.registrationNumber ? vehicle.registrationNumber.toUpperCase().trim() : 'PENDING', vehicle.color || 'Black', vehicle.helmetProvided ? 1 : 0, vehicle.rcDocumentUrl || null);
        vehicleRecord = database_1.db.prepare('SELECT * FROM vehicles WHERE id = ?').get(vehicleId);
    }
    // Automatically submit initial student verification record
    const verifId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO student_verifications (
      id, user_id, verification_type, university_email, reg_number, status
    ) VALUES (?, ?, 'student_id', ?, ?, 'pending')
  `).run(verifId, userId, cleanEmail, regNumber || 'STUDENT');
    const token = jsonwebtoken_1.default.sign({ id: userId, email: cleanEmail, role }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
        message: 'Registration successful. Account created.',
        token,
        user: {
            id: userId,
            email: cleanEmail,
            fullName: fullName.trim(),
            phone: phone.trim(),
            role,
            university: university || 'Alliance University',
            department: department || 'Alliance College of Engineering and Design (ACED)',
            regNumber: regNumber || null,
            isVerified: false,
            verificationStatus: 'pending',
            vehicle: vehicleRecord,
        },
    });
});
// POST /api/auth/login
router.post('/login', (req, res) => {
    const { email, password, requestedRole } = req.body;
    if (!email || !password) {
        res.status(400).json({
            error: 'Please enter your university email and password.',
            code: 'MISSING_FIELDS',
        });
        return;
    }
    const cleanEmail = email.toLowerCase().trim();
    // Validate domain against configured university domain
    const campusSetting = database_1.db.prepare('SELECT allowed_email_domain FROM campus_settings LIMIT 1').get();
    const allowedDomain = campusSetting?.allowed_email_domain || (0, domain_1.getAllianceEmailDomain)();
    if (requestedRole !== 'admin' && !(0, domain_1.isValidAllianceEmail)(cleanEmail, allowedDomain)) {
        res.status(400).json({
            error: `Invalid university email domain. Please use your official university email ending in @${allowedDomain} or subdomains like @ced.${allowedDomain}.`,
            code: 'INVALID_EMAIL_DOMAIN',
        });
        return;
    }
    const user = database_1.db.prepare(`
    SELECT id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active, rating, total_ratings, trips_completed, co2_saved_kg, upi_id
    FROM users 
    WHERE email = ?
  `).get(cleanEmail);
    if (!user) {
        res.status(404).json({
            error: `No account found for "${cleanEmail}". Please register as a ${requestedRole === 'captain' ? 'Captain' : 'Rider'} first.`,
            code: 'ACCOUNT_NOT_FOUND',
        });
        return;
    }
    if (user.is_active === 0) {
        res.status(403).json({
            error: 'This university account has been disabled. Please contact the campus administrator.',
            code: 'ACCOUNT_DISABLED',
        });
        return;
    }
    const isValidPassword = bcryptjs_1.default.compareSync(password, user.password_hash);
    if (!isValidPassword) {
        res.status(401).json({
            error: 'Incorrect university email or password. Please verify your credentials.',
            code: 'INVALID_CREDENTIALS',
        });
        return;
    }
    // Validate role if requested
    if (requestedRole && requestedRole !== 'admin' && user.role !== requestedRole && user.role !== 'both' && user.role !== 'admin') {
        res.status(403).json({
            error: `Account role mismatch. This account is registered as a ${user.role}. Please log in through the ${user.role} portal or register your motorcycle.`,
            code: 'ROLE_MISMATCH',
        });
        return;
    }
    if (requestedRole === 'admin' && user.role !== 'admin') {
        res.status(403).json({
            error: 'Access denied. Administrative privileges are required for the Admin Console.',
            code: 'ROLE_UNAUTHORIZED',
        });
        return;
    }
    // Fetch vehicle if captain
    let vehicle = null;
    if (user.role === 'captain' || user.role === 'both' || user.role === 'admin') {
        vehicle = database_1.db.prepare('SELECT * FROM vehicles WHERE user_id = ? LIMIT 1').get(user.id);
    }
    // Fetch student verification status
    const verification = database_1.db.prepare('SELECT status FROM student_verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1').get(user.id);
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
        message: 'Login successful.',
        token,
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone,
            role: user.role,
            university: user.university,
            department: user.department,
            regNumber: user.reg_number,
            isVerified: Boolean(user.is_verified),
            verificationStatus: user.is_verified ? 'approved' : (verification?.status || 'pending'),
            rating: user.rating,
            totalRatings: user.total_ratings,
            tripsCompleted: user.trips_completed,
            co2SavedKg: user.co2_saved_kg,
            upiId: user.upi_id,
            vehicle,
        },
    });
});
// GET /api/auth/me
router.get('/me', auth_1.requireAuth, (req, res) => {
    const userId = req.user.id;
    const user = database_1.db.prepare(`
    SELECT id, email, full_name, phone, role, university, department, reg_number, is_verified, rating, total_ratings, trips_completed, co2_saved_kg, upi_id, avatar_url
    FROM users 
    WHERE id = ?
  `).get(userId);
    if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
    }
    const vehicle = database_1.db.prepare('SELECT * FROM vehicles WHERE user_id = ? LIMIT 1').get(userId);
    const verification = database_1.db.prepare('SELECT * FROM student_verifications WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1').get(userId);
    res.json({
        user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            phone: user.phone,
            role: user.role,
            university: user.university,
            department: user.department,
            regNumber: user.reg_number,
            isVerified: Boolean(user.is_verified),
            rating: user.rating,
            totalRatings: user.total_ratings,
            tripsCompleted: user.trips_completed,
            co2SavedKg: user.co2_saved_kg,
            upiId: user.upi_id,
            avatarUrl: user.avatar_url,
            vehicle,
            verification,
        },
    });
});
// POST /api/auth/verify - Submit student verification request
router.post('/verify', auth_1.requireAuth, (req, res) => {
    const { regNumber, idCardImageUrl, verificationType } = req.body;
    const userId = req.user.id;
    if (!regNumber) {
        res.status(400).json({ error: 'University registration number is required.' });
        return;
    }
    const ALLOWED_TYPES = ['student_id', 'vehicle_rc', 'driving_license'];
    const type = verificationType || 'student_id';
    if (!ALLOWED_TYPES.includes(type)) {
        res.status(400).json({ error: `Invalid verification type: "${type}". Allowed types: ${ALLOWED_TYPES.join(', ')}` });
        return;
    }
    const verifId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO student_verifications (
      id, user_id, verification_type, university_email, reg_number, id_card_image_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(verifId, userId, type, req.user.email, regNumber, idCardImageUrl || null);
    database_1.db.prepare('UPDATE users SET reg_number = ? WHERE id = ?').run(regNumber, userId);
    res.json({
        message: 'Student verification submitted. Alliance University Campus Desk will review your ID.',
        verificationId: verifId,
        status: 'pending',
    });
});
// POST /api/auth/vehicle - Captain updates or registers motorcycle
router.post('/vehicle', auth_1.requireAuth, (req, res) => {
    const { make, model, year, registrationNumber, color, helmetProvided, rcDocumentUrl } = req.body;
    const userId = req.user.id;
    if (!make || !model || !registrationNumber) {
        res.status(400).json({ error: 'Make, model, and registration number are required.' });
        return;
    }
    const existingVehicle = database_1.db.prepare('SELECT id, registration_number, is_verified FROM vehicles WHERE user_id = ?').get(userId);
    if (existingVehicle) {
        const cleanNewReg = registrationNumber.toUpperCase().trim();
        const cleanOldReg = existingVehicle.registration_number?.toUpperCase().trim();
        // If registration plate changed, reset verification status back to 0
        const newVerified = cleanNewReg !== cleanOldReg ? 0 : existingVehicle.is_verified;
        database_1.db.prepare(`
      UPDATE vehicles SET 
        make = ?, model = ?, year = ?, registration_number = ?, color = ?, helmet_provided = ?, rc_document_url = ?, is_verified = ?
      WHERE id = ?
    `).run(make, model, year || 2023, cleanNewReg, color || 'Black', helmetProvided ? 1 : 0, rcDocumentUrl || null, newVerified, existingVehicle.id);
    }
    else {
        const newId = node_crypto_1.default.randomUUID();
        database_1.db.prepare(`
      INSERT INTO vehicles (
        id, user_id, make, model, year, registration_number, color, helmet_provided, rc_document_url, is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(newId, userId, make, model, year || 2023, registrationNumber.toUpperCase().trim(), color || 'Black', helmetProvided ? 1 : 0, rcDocumentUrl || null);
    }
    // Update role to Captain or Both if not already
    if (req.user.role === 'rider') {
        database_1.db.prepare("UPDATE users SET role = 'both' WHERE id = ?").run(userId);
    }
    const updatedVehicle = database_1.db.prepare('SELECT * FROM vehicles WHERE user_id = ? LIMIT 1').get(userId);
    res.json({ message: 'Vehicle details saved successfully.', vehicle: updatedVehicle });
});
// PATCH /api/auth/profile - Update user profile
router.patch('/profile', auth_1.requireAuth, (req, res) => {
    const userId = req.user.id;
    const { fullName, phone, department, regNumber, emergencyContact, upiId } = req.body;
    const user = database_1.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
    }
    database_1.db.prepare(`
    UPDATE users SET 
      full_name = ?,
      phone = ?,
      department = ?,
      reg_number = ?,
      emergency_contact = ?,
      upi_id = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(fullName !== undefined ? fullName.trim() : user.full_name, phone !== undefined ? phone.trim() : user.phone, department !== undefined ? department.trim() : user.department, regNumber !== undefined ? regNumber.trim() : user.reg_number, emergencyContact !== undefined ? emergencyContact.trim() : user.emergency_contact, upiId !== undefined ? upiId.trim() : user.upi_id, userId);
    const updatedUser = database_1.db.prepare(`
    SELECT id, email, full_name, phone, role, university, department, reg_number, emergency_contact, is_verified, rating, total_ratings, trips_completed, co2_saved_kg, upi_id, avatar_url
    FROM users WHERE id = ?
  `).get(userId);
    const vehicle = database_1.db.prepare('SELECT * FROM vehicles WHERE user_id = ? LIMIT 1').get(userId);
    res.json({
        message: 'Profile updated successfully.',
        user: {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            phone: updatedUser.phone,
            role: updatedUser.role,
            university: updatedUser.university,
            department: updatedUser.department,
            regNumber: updatedUser.reg_number,
            emergencyContact: updatedUser.emergency_contact,
            isVerified: Boolean(updatedUser.is_verified),
            rating: updatedUser.rating,
            totalRatings: updatedUser.total_ratings,
            tripsCompleted: updatedUser.trips_completed,
            co2SavedKg: updatedUser.co2_saved_kg,
            upiId: updatedUser.upi_id,
            avatarUrl: updatedUser.avatar_url,
            vehicle,
        },
    });
});
// POST /api/auth/forgot-password - Request password reset code
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email || !email.trim()) {
        res.status(400).json({ error: 'Alliance University email is required.' });
        return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const user = database_1.db.prepare('SELECT id, email FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
        res.status(404).json({ error: 'No account registered with this university email.' });
        return;
    }
    // Generate 6-digit numeric reset token
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const resetId = node_crypto_1.default.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
    // Invalidate any prior active tokens for this user
    database_1.db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(user.id);
    database_1.db.prepare(`
    INSERT INTO password_resets (id, user_id, email, token, expires_at, used)
    VALUES (?, ?, ?, ?, ?, 0)
  `).run(resetId, user.id, cleanEmail, token, expiresAt);
    res.json({
        message: 'Password reset code generated successfully.',
        resetToken: token, // Returned for instant in-app sandbox verification
        expiresIn: '15 minutes',
    });
});
// POST /api/auth/reset-password - Verify token and update password
router.post('/reset-password', (req, res) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
        res.status(400).json({ error: 'Email, reset token, and new password are required.' });
        return;
    }
    if (newPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const resetRecord = database_1.db.prepare(`
    SELECT * FROM password_resets 
    WHERE email = ? AND token = ? AND used = 0
    ORDER BY created_at DESC LIMIT 1
  `).get(cleanEmail, token.trim());
    if (!resetRecord) {
        res.status(400).json({ error: 'Invalid or expired password reset code.' });
        return;
    }
    if (new Date(resetRecord.expires_at).getTime() < Date.now()) {
        res.status(400).json({ error: 'Password reset code has expired. Please request a new one.' });
        return;
    }
    const salt = bcryptjs_1.default.genSaltSync(10);
    const passwordHash = bcryptjs_1.default.hashSync(newPassword, salt);
    database_1.db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?').run(passwordHash, resetRecord.user_id);
    database_1.db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);
    res.json({ message: 'Password has been successfully reset. You may now log in.' });
});
exports.default = router;
