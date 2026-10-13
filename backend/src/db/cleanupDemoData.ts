import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, initDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();
initDatabase();

console.log('--- Cleaning Up Demo & Duplicated Test Data ---');

// 1. Clear out all test rides, bookings, telemetry, payments
db.exec('PRAGMA foreign_keys = OFF;');

db.exec(`
  DELETE FROM payments;
  DELETE FROM trip_telemetry;
  DELETE FROM bookings;
  DELETE FROM rides;
  DELETE FROM incident_reports;
`);

console.log('✓ Purged all rides, bookings, payments, and telemetry records.');

// 2. Remove all automated test/demo users
db.exec(`
  DELETE FROM users 
  WHERE email LIKE '%lifecycle%' 
     OR email LIKE '%dynamic_pub%' 
     OR email LIKE '%test%' 
     OR email LIKE '%verif%' 
     OR email LIKE 'student_%'
     OR email LIKE 'rider_%'
     OR email LIKE 'captain_%';
`);

console.log('✓ Purged all automated test/demo users.');

// 3. Remove orphaned vehicles and verifications
db.exec(`
  DELETE FROM vehicles WHERE user_id NOT IN (SELECT id FROM users);
  DELETE FROM student_verifications WHERE user_id NOT IN (SELECT id FROM users);
`);

db.exec('PRAGMA foreign_keys = ON;');

// 4. Securely hash password 'Life@789' with bcrypt
const devPasswordPlain = 'Life@789';
const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(devPasswordPlain, salt);

// 5. Seed / Update Development Captain account
const captainEmail = 'vishvanthbtech24@ced.alliance.edu.in';
const existingCaptain = db.prepare('SELECT id FROM users WHERE email = ?').get(captainEmail) as any;
let captainId: string;

if (existingCaptain) {
  captainId = existingCaptain.id;
  db.prepare(`
    UPDATE users SET
      password_hash = ?,
      full_name = 'Vishvanth B.Tech',
      phone = '+91 98765 43210',
      role = 'captain',
      university = 'Alliance University',
      department = 'Alliance College of Engineering and Design (ACED)',
      reg_number = '2024CED001',
      is_verified = 1,
      is_active = 1,
      rating = 5.0,
      total_ratings = 0,
      trips_completed = 0,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(passwordHash, captainId);
  console.log(`✓ Updated Captain account "${captainEmail}" with hashed password.`);
} else {
  captainId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (
      id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active, rating, total_ratings, trips_completed
    ) VALUES (?, ?, ?, 'Vishvanth B.Tech', '+91 98765 43210', 'captain', 'Alliance University', 'Alliance College of Engineering and Design (ACED)', '2024CED001', 1, 1, 5.0, 0, 0)
  `).run(captainId, captainEmail, passwordHash);
  console.log(`✓ Created Captain account "${captainEmail}" with hashed password.`);
}

// 6. Ensure Captain vehicle exists and is verified
const existingVehicle = db.prepare('SELECT id FROM vehicles WHERE user_id = ?').get(captainId) as any;
if (existingVehicle) {
  db.prepare(`
    UPDATE vehicles SET
      make = 'Royal Enfield',
      model = 'Hunter 350',
      year = 2024,
      registration_number = 'KA01EQ2024',
      color = 'Dapper Ash',
      helmet_provided = 1,
      is_verified = 1
    WHERE id = ?
  `).run(existingVehicle.id);
} else {
  const vehicleId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO vehicles (
      id, user_id, make, model, year, registration_number, color, helmet_provided, rc_document_url, is_verified
    ) VALUES (?, ?, 'Royal Enfield', 'Hunter 350', 2024, 'KA01EQ2024', 'Dapper Ash', 1, null, 1)
  `).run(vehicleId, captainId);
}
console.log('✓ Registered and verified Captain vehicle: Royal Enfield Hunter 350 (KA01EQ2024).');

// 7. Seed / Update Admin accounts with password 'Life@789'
const adminEmails = ['admin@ced.alliance.edu.in', 'admin@alliance.edu.in'];

for (const adminEmail of adminEmails) {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail) as any;
  if (existingAdmin) {
    db.prepare(`
      UPDATE users SET
        password_hash = ?,
        role = 'admin',
        is_verified = 1,
        is_active = 1,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(passwordHash, existingAdmin.id);
    console.log(`✓ Updated Admin account "${adminEmail}" with hashed password.`);
  } else {
    const adminId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (
        id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active
      ) VALUES (?, ?, ?, 'Alliance Campus Administrator', '+91 80461 99000', 'admin', 'Alliance University', 'Campus Security & Administration', 'ADMIN-001', 1, 1)
    `).run(adminId, adminEmail, passwordHash);
    console.log(`✓ Created Admin account "${adminEmail}" with hashed password.`);
  }
}

// 8. Verify state
const finalRidesCount = (db.prepare('SELECT count(*) as count FROM rides').get() as any).count;
const usersList = db.prepare('SELECT id, email, role, full_name FROM users').all();

console.log('\n=================================================');
console.log('CLEANUP & SEED SUMMARY:');
console.log(`Total Active Rides: ${finalRidesCount} (Expected: 0)`);
console.log('Active Users:');
usersList.forEach((u: any) => console.log(`  - [${u.role.toUpperCase()}] ${u.email} (${u.full_name})`));
console.log(`Development Password for all accounts: ${devPasswordPlain} (Bcrypt Hashed)`);
console.log('=================================================\n');
