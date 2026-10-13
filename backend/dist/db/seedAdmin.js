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
const email = process.env.ADMIN_EMAIL || process.argv[2];
const password = process.env.ADMIN_PASSWORD || process.argv[3];
const fullName = process.env.ADMIN_NAME || process.argv[4] || 'Alliance University Campus Admin';
if (!email || !password) {
    console.error('\nUsage: npm run seed:admin <admin_email> <admin_password> [admin_name]');
    console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.\n');
    process.exit(1);
}
const existing = database_1.db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
    console.log(`User with email "${email}" already exists.`);
    process.exit(0);
}
const salt = bcryptjs_1.default.genSaltSync(10);
const passwordHash = bcryptjs_1.default.hashSync(password, salt);
const adminId = node_crypto_1.default.randomUUID();
database_1.db.prepare(`
  INSERT INTO users (
    id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified
  ) VALUES (?, ?, ?, ?, ?, 'admin', 'Alliance University', 'Campus Administration', 'ADMIN-001', 1)
`).run(adminId, email, passwordHash, fullName, '+91 80461 99000');
console.log(`\nSuccessfully created Administrator account!`);
console.log(`ID: ${adminId}`);
console.log(`Email: ${email}`);
console.log(`Role: admin`);
console.log(`\nYou can now log in securely via the Admin Portal.\n`);
