"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const database_1 = require("./database");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
(0, database_1.initDatabase)();
const email = (process.env.CAPTAIN_EMAIL || process.argv[2] || 'vishvanthbtech24@ced.alliance.edu.in').toLowerCase().trim();
const password = process.env.CAPTAIN_PASSWORD || process.argv[3] || 'Life@789';
const fullName = process.env.CAPTAIN_NAME || process.argv[4] || 'Vishvanth B.Tech';
const phone = process.env.CAPTAIN_PHONE || '+91 98765 43210';
const department = 'Alliance College of Engineering and Design (ACED)';
const regNumber = '2024CED001';
const salt = bcryptjs_1.default.genSaltSync(10);
const passwordHash = bcryptjs_1.default.hashSync(password, salt);
const existingUser = database_1.db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);
let userId;
if (existingUser) {
    userId = existingUser.id;
    database_1.db.prepare(`
    UPDATE users SET 
      password_hash = ?,
      full_name = ?,
      phone = ?,
      role = 'captain',
      university = 'Alliance University',
      department = ?,
      reg_number = ?,
      is_active = 1,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(passwordHash, fullName, phone, department, regNumber, userId);
    console.log(`Updated existing user "${email}" with Captain profile and hashed credentials.`);
}
else {
    userId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO users (
      id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active
    ) VALUES (?, ?, ?, ?, ?, 'captain', 'Alliance University', ?, ?, 0, 1)
  `).run(userId, email, passwordHash, fullName, phone, department, regNumber);
    console.log(`Created new Captain user "${email}".`);
}
// Ensure Captain vehicle exists
const existingVehicle = database_1.db.prepare('SELECT id FROM vehicles WHERE user_id = ?').get(userId);
if (existingVehicle) {
    database_1.db.prepare(`
    UPDATE vehicles SET 
      make = 'Royal Enfield',
      model = 'Hunter 350',
      year = 2024,
      registration_number = 'KA01EQ2024',
      color = 'Dapper Ash',
      helmet_provided = 1,
      is_verified = 0
    WHERE id = ?
  `).run(existingVehicle.id);
    console.log('Updated Captain vehicle details: Royal Enfield Hunter 350 (KA01EQ2024).');
}
else {
    const vehicleId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO vehicles (
      id, user_id, make, model, year, registration_number, color, helmet_provided, rc_document_url, is_verified
    ) VALUES (?, ?, 'Royal Enfield', 'Hunter 350', 2024, 'KA01EQ2024', 'Dapper Ash', 1, null, 0)
  `).run(vehicleId, userId);
    console.log('Registered Captain vehicle: Royal Enfield Hunter 350 (KA01EQ2024).');
}
// Ensure Student Verification record exists in pending status
const existingVerif = database_1.db.prepare('SELECT id FROM student_verifications WHERE user_id = ?').get(userId);
if (!existingVerif) {
    const verifId = node_crypto_1.default.randomUUID();
    database_1.db.prepare(`
    INSERT INTO student_verifications (
      id, user_id, verification_type, university_email, reg_number, status
    ) VALUES (?, ?, 'student_id', ?, ?, 'pending')
  `).run(verifId, userId, email, regNumber);
    console.log('Submitted student verification record for Campus Desk review (type: student_id).');
}
console.log('\n=================================================');
console.log('CAPTAIN ACCOUNT SEEDED SUCCESSFULLY');
console.log(`Email:      ${email}`);
console.log(`Role:       captain`);
console.log(`Name:       ${fullName}`);
console.log(`Department: ${department}`);
console.log(`Password:   ${password}`);
console.log(`Vehicle:    Royal Enfield Hunter 350 [KA01EQ2024]`);
console.log('Verification: Pending Campus Desk Approval (is_verified: 0)');
console.log('=================================================\n');
