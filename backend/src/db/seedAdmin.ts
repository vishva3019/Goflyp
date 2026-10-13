import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { db, initDatabase } from './database';
import dotenv from 'dotenv';

dotenv.config();

initDatabase();

const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];
const fullName = process.env.ADMIN_NAME || process.argv[4] || 'Alliance University Campus Admin';

if (!email || !password) {
  console.error('\nUsage: npm run seed:admin <admin_email> <admin_password> [admin_name]');
  console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.\n');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

if (existing) {
  console.log(`User with email "${email}" already exists.`);
  process.exit(0);
}

const salt = bcrypt.genSaltSync(10);
const passwordHash = bcrypt.hashSync(password, salt);
const adminId = crypto.randomUUID();

db.prepare(`
  INSERT INTO users (
    id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified
  ) VALUES (?, ?, ?, ?, ?, 'admin', 'Alliance University', 'Campus Administration', 'ADMIN-001', 1)
`).run(adminId, email, passwordHash, fullName, '+91 80461 99000');

console.log(`\nSuccessfully created Administrator account!`);
console.log(`ID: ${adminId}`);
console.log(`Email: ${email}`);
console.log(`Role: admin`);
console.log(`\nYou can now log in securely via the Admin Portal.\n`);
