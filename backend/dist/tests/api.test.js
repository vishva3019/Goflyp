"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.NODE_ENV = 'test';
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const server_1 = __importDefault(require("../server"));
let server;
let port;
let baseUrl;
function makeRequest(path, options = {}) {
    const url = `${baseUrl}${path}`;
    const headers = options.headers || {};
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    return fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
}
node_test_1.default.before(async () => {
    process.env.NODE_ENV = 'test';
    // Seed test accounts in isolated test database
    const { db } = await Promise.resolve().then(() => __importStar(require('../db/database')));
    const bcrypt = await Promise.resolve().then(() => __importStar(require('bcryptjs')));
    const crypto = await Promise.resolve().then(() => __importStar(require('node:crypto')));
    const devPasswordPlain = 'Life@789';
    const salt = bcrypt.default.genSaltSync(10);
    const passwordHash = bcrypt.default.hashSync(devPasswordPlain, salt);
    const captainId = crypto.default.randomUUID();
    db.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active
    ) VALUES (?, 'vishvanthbtech24@ced.alliance.edu.in', ?, 'Vishvanth B.Tech', '+91 98765 43210', 'captain', 'Alliance University', 'Alliance College of Engineering and Design (ACED)', '2024CED001', 0, 1)
  `).run(captainId, passwordHash);
    db.prepare(`
    INSERT OR REPLACE INTO vehicles (
      id, user_id, make, model, year, registration_number, color, helmet_provided, is_verified
    ) VALUES (?, ?, 'Royal Enfield', 'Hunter 350', 2024, 'KA01EQ2024', 'Dapper Ash', 1, 0)
  `).run(crypto.default.randomUUID(), captainId);
    db.prepare(`
    INSERT OR REPLACE INTO student_verifications (
      id, user_id, verification_type, university_email, reg_number, status
    ) VALUES (?, ?, 'student_id', 'vishvanthbtech24@ced.alliance.edu.in', '2024CED001', 'pending')
  `).run(crypto.default.randomUUID(), captainId);
    const adminId = crypto.default.randomUUID();
    db.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, password_hash, full_name, phone, role, university, department, reg_number, is_verified, is_active
    ) VALUES (?, 'admin@alliance.edu.in', ?, 'Alliance Campus Administrator', '+91 80461 99000', 'admin', 'Alliance University', 'Campus Security & Administration', 'ADMIN-001', 1, 1)
  `).run(adminId, passwordHash);
    await new Promise((resolve) => {
        server = server_1.default.listen(0, '127.0.0.1', () => {
            const address = server.address();
            port = address.port;
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
    });
});
node_test_1.default.after(() => {
    server.close();
    try {
        const fs = require('node:fs');
        if (fs.existsSync('./data/goflyp_test.db')) {
            fs.unlinkSync('./data/goflyp_test.db');
        }
    }
    catch (e) {
        // Ignore cleanup error
    }
});
(0, node_test_1.default)('1. System Health Check', async () => {
    const res = await makeRequest('/api/health');
    node_assert_1.default.strictEqual(res.status, 200);
    const data = (await res.json());
    node_assert_1.default.strictEqual(data.status, 'ONLINE');
    node_assert_1.default.strictEqual(data.university, 'Alliance University');
});
(0, node_test_1.default)('2. Authentication: Reject non-Alliance university email', async () => {
    const res = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: 'test@gmail.com',
            password: 'Password@123',
            fullName: 'Outside User',
            phone: '+91 99999 11111',
            role: 'rider',
        },
    });
    node_assert_1.default.strictEqual(res.status, 400);
    const data = (await res.json());
    node_assert_1.default.match(data.error, /alliance\.edu\.in/);
});
(0, node_test_1.default)('3. Authentication: Register Captain with Vehicle', async () => {
    const email = `captain_${Date.now()}@alliance.edu.in`;
    const res = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email,
            password: 'SecurePassword123',
            fullName: 'Test Captain Student',
            phone: '+91 98888 22222',
            role: 'captain',
            university: 'Alliance University',
            department: 'Mechanical Engineering',
            regNumber: 'AL-ME-2023-01',
            vehicle: {
                make: 'Royal Enfield',
                model: 'Hunter 350',
                registrationNumber: `KA01EQ${Math.floor(1000 + Math.random() * 9000)}`,
                color: 'Ash Grey',
                helmetProvided: true,
            },
        },
    });
    node_assert_1.default.strictEqual(res.status, 201);
    const data = (await res.json());
    node_assert_1.default.ok(data.token);
    node_assert_1.default.strictEqual(data.user.role, 'captain');
});
(0, node_test_1.default)('4. Authentication: Register Rider', async () => {
    const email = `rider_${Date.now()}@alliance.edu.in`;
    const res = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email,
            password: 'SecurePassword123',
            fullName: 'Test Rider Student',
            phone: '+91 97777 33333',
            role: 'rider',
            university: 'Alliance University',
            department: 'Computer Science',
            regNumber: 'AL-CS-2023-02',
        },
    });
    node_assert_1.default.strictEqual(res.status, 201);
    const data = (await res.json());
    node_assert_1.default.ok(data.token);
    node_assert_1.default.strictEqual(data.user.role, 'rider');
});
(0, node_test_1.default)('5. Geospatial: Search Campus Locations', async () => {
    const res = await makeRequest('/api/geo/search?q=Alliance');
    node_assert_1.default.strictEqual(res.status, 200);
    const data = (await res.json());
    node_assert_1.default.ok(Array.isArray(data.places));
    node_assert_1.default.ok(data.places.length > 0);
    node_assert_1.default.ok(data.places[0].lat !== undefined);
});
(0, node_test_1.default)('6. Geospatial: Calculate Real Road Route', async () => {
    const res = await makeRequest('/api/geo/route', {
        method: 'POST',
        body: {
            origin: { lat: 12.8256, lng: 77.7123 },
            destination: { lat: 12.8452, lng: 77.6602 },
        },
    });
    node_assert_1.default.strictEqual(res.status, 200);
    const data = (await res.json());
    node_assert_1.default.ok(data.distanceKm > 0);
    node_assert_1.default.ok(data.durationMinutes > 0);
    node_assert_1.default.ok(Array.isArray(data.polyline));
    node_assert_1.default.ok(data.polyline.length > 2);
});
(0, node_test_1.default)('7. End-to-end Lifecycle: Captain publishes ride, Rider books, Captain starts and completes, Rider pays', async () => {
    // Step A: Register Captain
    const captainEmail = `lifecycle_c_${Date.now()}@alliance.edu.in`;
    const cReg = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: captainEmail,
            password: 'Password123',
            fullName: 'Lifecycle Captain',
            phone: '+91 91234 56789',
            role: 'captain',
            university: 'Alliance University',
            department: 'CSE',
            vehicle: {
                make: 'KTM',
                model: 'Duke 250',
                registrationNumber: `KA05KM${Math.floor(1000 + Math.random() * 9000)}`,
                color: 'Black',
                helmetProvided: true,
            },
        },
    });
    const cData = (await cReg.json());
    const captainToken = cData.token;
    // Step B: Register Rider
    const riderEmail = `lifecycle_r_${Date.now()}@alliance.edu.in`;
    const rReg = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: riderEmail,
            password: 'Password123',
            fullName: 'Lifecycle Rider',
            phone: '+91 99887 66554',
            role: 'rider',
            university: 'Alliance University',
            department: 'BBA',
        },
    });
    const rData = (await rReg.json());
    const riderToken = rData.token;
    // Step C: Captain publishes ride with real coordinates
    const pubRes = await makeRequest('/api/rides', {
        method: 'POST',
        headers: { Authorization: `Bearer ${captainToken}` },
        body: {
            originName: 'Alliance University Main Gate',
            originLat: 12.8256,
            originLng: 77.7123,
            destinationName: 'Electronic City Metro Station (Phase 1)',
            destinationLat: 12.8452,
            destinationLng: 77.6602,
            departureDate: 'Today',
            departureTime: '6:00 PM',
            availableSeats: 1,
            totalSeats: 1,
            contributionAmount: 35,
            waypoints: [
                { name: 'Chandapura Flyover', lat: 12.7954, lng: 77.6989, eta: '6:12 PM' },
            ],
            note: 'Sanitized helmet ready.',
        },
    });
    node_assert_1.default.strictEqual(pubRes.status, 201);
    const pubData = (await pubRes.json());
    const rideId = pubData.rideId;
    node_assert_1.default.ok(rideId);
    node_assert_1.default.ok(pubData.distanceKm > 0);
    // Step D: Prevent Self-booking / Role check
    const selfRes = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${captainToken}` },
        body: { rideId },
    });
    node_assert_1.default.ok(selfRes.status === 400 || selfRes.status === 403);
    // Step E: Rider requests a seat
    const bookRes = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
            rideId,
            pickupName: 'Alliance University Main Gate',
            dropoffName: 'Electronic City Metro',
        },
    });
    node_assert_1.default.strictEqual(bookRes.status, 201);
    const bookData = (await bookRes.json());
    const bookingId = bookData.bookingId;
    node_assert_1.default.ok(bookingId);
    // Step F: Overbooking prevention (Rider 2 tries to reserve when capacity 0)
    const rider2Email = `rider2_${Date.now()}@alliance.edu.in`;
    const r2Reg = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: rider2Email,
            password: 'Password123',
            fullName: 'Rider Two',
            phone: '+91 97777 88888',
            role: 'rider',
        },
    });
    const r2Data = (await r2Reg.json());
    const overbookRes = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${r2Data.token}` },
        body: { rideId },
    });
    node_assert_1.default.strictEqual(overbookRes.status, 409); // Full capacity reached
    // Step G: Captain accepts booking
    const acceptRes = await makeRequest(`/api/bookings/${bookingId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${captainToken}` },
    });
    node_assert_1.default.strictEqual(acceptRes.status, 200);
    // Step H: Captain starts trip
    const startRes = await makeRequest(`/api/trips/${rideId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${captainToken}` },
    });
    node_assert_1.default.strictEqual(startRes.status, 200);
    // Step I: Captain completes trip
    const completeRes = await makeRequest(`/api/trips/${rideId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${captainToken}` },
    });
    node_assert_1.default.strictEqual(completeRes.status, 200);
    // Step J: Rider reports direct peer UPI payment
    const payRes = await makeRequest(`/api/payments/${bookingId}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: {
            paymentMethod: 'upi',
            upiReference: 'UPI425619882190',
        },
    });
    node_assert_1.default.strictEqual(payRes.status, 200);
    // Step K: Captain confirms receipt
    const confirmRes = await makeRequest(`/api/payments/${bookingId}/confirm`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${captainToken}` },
    });
    node_assert_1.default.strictEqual(confirmRes.status, 200);
});
(0, node_test_1.default)('8. Subdomain Authentication: Register and Login with @ced.alliance.edu.in', async () => {
    const cedEmail = `student_${Date.now()}@ced.alliance.edu.in`;
    const regRes = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: cedEmail,
            password: 'AllianceSecure#2026',
            fullName: 'CED Student',
            phone: '+91 91122 33445',
            role: 'captain',
            department: 'Alliance College of Engineering and Design (ACED)',
            vehicle: {
                make: 'Yamaha',
                model: 'FZ-S V3',
                registrationNumber: `KA04ED${Math.floor(1000 + Math.random() * 9000)}`,
                color: 'Racing Blue',
                helmetProvided: true,
            },
        },
    });
    node_assert_1.default.strictEqual(regRes.status, 201);
    const regData = (await regRes.json());
    node_assert_1.default.ok(regData.token);
    node_assert_1.default.strictEqual(regData.user.role, 'captain');
    node_assert_1.default.strictEqual(regData.user.isVerified, false);
    // Now test login with same @ced.alliance.edu.in email
    const loginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email: cedEmail,
            password: 'AllianceSecure#2026',
            requestedRole: 'captain',
        },
    });
    node_assert_1.default.strictEqual(loginRes.status, 200);
    const loginData = (await loginRes.json());
    node_assert_1.default.ok(loginData.token);
    node_assert_1.default.strictEqual(loginData.user.role, 'captain');
    node_assert_1.default.strictEqual(loginData.user.isVerified, false);
    node_assert_1.default.ok(loginData.user.vehicle);
});
(0, node_test_1.default)('9. Authentication Error Codes: Granular error responses', async () => {
    // A. Missing credentials
    const res1 = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: '', password: '' },
    });
    node_assert_1.default.strictEqual(res1.status, 400);
    const data1 = (await res1.json());
    node_assert_1.default.strictEqual(data1.code, 'MISSING_FIELDS');
    // B. Invalid domain
    const res2 = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'student@gmail.com', password: 'Password123' },
    });
    node_assert_1.default.strictEqual(res2.status, 400);
    const data2 = (await res2.json());
    node_assert_1.default.strictEqual(data2.code, 'INVALID_EMAIL_DOMAIN');
    // C. Account not found
    const res3 = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'nonexistent@alliance.edu.in', password: 'Password123' },
    });
    node_assert_1.default.strictEqual(res3.status, 404);
    const data3 = (await res3.json());
    node_assert_1.default.strictEqual(data3.code, 'ACCOUNT_NOT_FOUND');
    // D. Invalid password for existing user
    const res4 = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: { email: 'vishvanthbtech24@ced.alliance.edu.in', password: 'IncorrectPassword#999' },
    });
    node_assert_1.default.strictEqual(res4.status, 401);
    const data4 = (await res4.json());
    node_assert_1.default.strictEqual(data4.code, 'INVALID_CREDENTIALS');
    // E. Non-admin attempting admin access
    const res5 = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email: 'vishvanthbtech24@ced.alliance.edu.in',
            password: 'Life@789',
            requestedRole: 'admin',
        },
    });
    node_assert_1.default.strictEqual(res5.status, 403);
    const data5 = (await res5.json());
    node_assert_1.default.strictEqual(data5.code, 'ROLE_UNAUTHORIZED');
});
(0, node_test_1.default)('10. Captain Test Account: vishvanthbtech24@ced.alliance.edu.in', async () => {
    const res = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email: 'vishvanthbtech24@ced.alliance.edu.in',
            password: 'Life@789',
            requestedRole: 'captain',
        },
    });
    node_assert_1.default.strictEqual(res.status, 200);
    const data = (await res.json());
    node_assert_1.default.ok(data.token);
    node_assert_1.default.strictEqual(data.user.email, 'vishvanthbtech24@ced.alliance.edu.in');
    node_assert_1.default.strictEqual(data.user.role, 'captain');
    node_assert_1.default.strictEqual(data.user.isVerified, false);
    node_assert_1.default.ok(data.user.vehicle);
    node_assert_1.default.strictEqual(data.user.vehicle.make, 'Royal Enfield');
});
(0, node_test_1.default)('11. Admin Authentication & Metrics Overview', async () => {
    const loginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email: 'admin@alliance.edu.in',
            password: 'Life@789',
            requestedRole: 'admin',
        },
    });
    node_assert_1.default.strictEqual(loginRes.status, 200);
    const loginData = (await loginRes.json());
    const adminToken = loginData.token;
    node_assert_1.default.ok(adminToken);
    node_assert_1.default.strictEqual(loginData.user.role, 'admin');
    const statsRes = await makeRequest('/api/admin/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    node_assert_1.default.strictEqual(statsRes.status, 200);
    const statsData = (await statsRes.json());
    node_assert_1.default.ok(statsData.stats);
    node_assert_1.default.ok(typeof statsData.stats.totalStudents === 'number');
    node_assert_1.default.ok(typeof statsData.stats.totalCaptains === 'number');
    node_assert_1.default.ok(typeof statsData.stats.totalRides === 'number');
    node_assert_1.default.ok(typeof statsData.stats.totalCo2SavedKg === 'number');
});
(0, node_test_1.default)('12. Admin Verifications: Unified object shape and verification_type handling', async () => {
    // Login as admin
    const loginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email: 'admin@alliance.edu.in',
            password: 'Life@789',
            requestedRole: 'admin',
        },
    });
    const adminToken = (await loginRes.json()).token;
    const verifRes = await makeRequest('/api/admin/verifications', {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    node_assert_1.default.strictEqual(verifRes.status, 200);
    const verifData = (await verifRes.json());
    node_assert_1.default.ok(Array.isArray(verifData.verifications));
    node_assert_1.default.ok(verifData.verifications.length > 0);
    // Validate consistent object shape
    for (const item of verifData.verifications) {
        node_assert_1.default.ok(item.id, 'Every verification item must have an id');
        node_assert_1.default.ok(item.user_id, 'Every verification item must have a user_id');
        node_assert_1.default.ok(item.status, 'Every verification item must have a status');
        node_assert_1.default.ok(item.full_name, 'Every verification item must have full_name');
        node_assert_1.default.ok(item.email, 'Every verification item must have email');
        // verification_type must either be a valid string or null for legacy records
        if (item.verification_type !== null) {
            node_assert_1.default.ok(['student_id', 'vehicle_rc', 'driving_license'].includes(item.verification_type), `Unexpected verification_type: ${item.verification_type}`);
        }
    }
    // Ensure both student_id (or legacy) and vehicle_rc types exist in verification list
    const vehicleItems = verifData.verifications.filter((v) => v.verification_type === 'vehicle_rc');
    node_assert_1.default.ok(vehicleItems.length > 0, 'Verification list should include motorcycle RC items');
    node_assert_1.default.ok(vehicleItems[0].vehicle_make, 'Vehicle RC item must include vehicle_make');
    node_assert_1.default.ok(vehicleItems[0].registration_number, 'Vehicle RC item must include registration_number');
});
(0, node_test_1.default)('13. Admin Verification Approval and Rejection Lifecycle', async () => {
    const loginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email: 'admin@alliance.edu.in',
            password: 'Life@789',
            requestedRole: 'admin',
        },
    });
    const adminToken = (await loginRes.json()).token;
    // Register a new student needing verification
    const testEmail = `verif_test_${Date.now()}@alliance.edu.in`;
    const regRes = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: testEmail,
            password: 'Password123',
            fullName: 'Verif Applicant',
            phone: '+91 95555 44444',
            role: 'rider',
            regNumber: 'AL-VERIF-01',
        },
    });
    const regData = (await regRes.json());
    const newUserId = regData.user.id;
    // Fetch admin verifications to locate new record
    const verifRes = await makeRequest('/api/admin/verifications', {
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifData = (await verifRes.json());
    const targetItem = verifData.verifications.find((v) => v.user_id === newUserId);
    node_assert_1.default.ok(targetItem, 'New applicant verification record must appear in admin list');
    node_assert_1.default.strictEqual(targetItem.verification_type, 'student_id');
    node_assert_1.default.strictEqual(targetItem.status, 'pending');
    // Test Approve
    const approveRes = await makeRequest(`/api/admin/verifications/${targetItem.id}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
    });
    node_assert_1.default.strictEqual(approveRes.status, 200);
    // Test Reject
    const rejectRes = await makeRequest(`/api/admin/verifications/${targetItem.id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { rejectionReason: 'ID card blur test' },
    });
    node_assert_1.default.strictEqual(rejectRes.status, 200);
    const rejectData = (await rejectRes.json());
    node_assert_1.default.strictEqual(rejectData.status, 'rejected');
});
(0, node_test_1.default)('14. Dynamic Geospatial Routing: Distance and duration update dynamically when destination changes', async () => {
    // Origin: Alliance Main Gate
    const origin = { lat: 12.8256, lng: 77.7123 };
    // Destination A: Electronic City Metro (approx 7.9 km)
    const destA = { lat: 12.8452, lng: 77.6602 };
    const resA = await makeRequest('/api/geo/route', {
        method: 'POST',
        body: { origin, destination: destA },
    });
    node_assert_1.default.strictEqual(resA.status, 200);
    const dataA = (await resA.json());
    node_assert_1.default.ok(dataA.distanceKm > 7.0 && dataA.distanceKm < 9.0, 'ECity distance should be ~7.9 km');
    node_assert_1.default.ok(dataA.durationMinutes > 10, 'ECity duration should be > 10 mins');
    node_assert_1.default.ok(dataA.distanceMeters > 7000, 'distanceMeters must be provided');
    node_assert_1.default.ok(dataA.durationSeconds > 600, 'durationSeconds must be provided');
    node_assert_1.default.ok(Array.isArray(dataA.coordinates) && dataA.coordinates.length > 5, 'coordinates must be an array of points');
    node_assert_1.default.ok(Array.isArray(dataA.polyline) && dataA.polyline.length > 5, 'polyline must be an array of points');
    // Destination B: Chandapura Circle (significantly different destination, ~6.0 km)
    const destB = { lat: 12.7954, lng: 77.6989 };
    const resB = await makeRequest('/api/geo/route', {
        method: 'POST',
        body: { origin, destination: destB },
    });
    node_assert_1.default.strictEqual(resB.status, 200);
    const dataB = (await resB.json());
    node_assert_1.default.ok(dataB.distanceKm < 7.0, 'Chandapura route distance must be different from ECity (~6 km)');
    node_assert_1.default.notStrictEqual(dataB.distanceKm, dataA.distanceKm, 'Distance must change dynamically for different destinations');
    node_assert_1.default.notStrictEqual(dataB.durationMinutes, dataA.durationMinutes, 'Duration must change dynamically for different destinations');
});
(0, node_test_1.default)('15. Captain Publish Journey: Saves actual dynamic route metrics without hardcoded 7.9 km / 13 min fallback', async () => {
    const captainEmail = `dynamic_pub_${Date.now()}@alliance.edu.in`;
    const regRes = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: captainEmail,
            password: 'Password123',
            fullName: 'Dynamic Captain',
            phone: '+91 94444 33333',
            role: 'captain',
            university: 'Alliance University',
            department: 'ECE',
            vehicle: {
                make: 'Royal Enfield',
                model: 'Hunter 350',
                registrationNumber: `KA51EN${Math.floor(1000 + Math.random() * 9000)}`,
                color: 'Dapper Ash',
                helmetProvided: true,
            },
        },
    });
    const regData = (await regRes.json());
    const captainToken = regData.token;
    // Publish with Destination Chandapura (NOT Electronic City)
    const pubRes = await makeRequest('/api/rides', {
        method: 'POST',
        headers: { Authorization: `Bearer ${captainToken}` },
        body: {
            originName: 'Alliance University Main Entrance Gate',
            originLat: 12.8256,
            originLng: 77.7123,
            destinationName: 'Chandapura Circle Flyover Junction',
            destinationLat: 12.7954,
            destinationLng: 77.6989,
            departureDate: 'Tomorrow',
            departureTime: '8:45 AM',
            availableSeats: 1,
            totalSeats: 1,
            contributionAmount: 25,
            note: 'Dynamic route test',
        },
    });
    node_assert_1.default.strictEqual(pubRes.status, 201);
    const pubData = (await pubRes.json());
    node_assert_1.default.ok(pubData.rideId);
    // Verify returned distance is for Chandapura (~6 km), NOT hardcoded 7.9 km!
    node_assert_1.default.strictEqual(pubData.distanceKm, 6);
    node_assert_1.default.strictEqual(pubData.durationMinutes, 9);
    // Fetch the created ride directly and verify stored values
    const getRes = await makeRequest(`/api/rides/${pubData.rideId}`);
    node_assert_1.default.strictEqual(getRes.status, 200);
    const ride = (await getRes.json());
    node_assert_1.default.strictEqual(ride.distanceKm, 6);
    node_assert_1.default.strictEqual(ride.durationMinutes, 9);
    node_assert_1.default.strictEqual(ride.destinationLocation, 'Chandapura Circle Flyover Junction');
    node_assert_1.default.ok(ride.routePolyline.length > 5);
});
(0, node_test_1.default)('16. Direct Student Chat: Rider and Captain communication on accepted booking', async () => {
    // Register Captain
    const captainRes = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: `chat_capt_${Date.now()}@alliance.edu.in`,
            password: 'Password123',
            fullName: 'Chat Captain',
            phone: '+91 91111 22222',
            role: 'captain',
            vehicle: {
                make: 'TVS',
                model: 'Apache RTR 160',
                registrationNumber: `KA51CH${Math.floor(1000 + Math.random() * 9000)}`,
                color: 'Black',
            },
        },
    });
    const captainToken = (await captainRes.json()).token;
    // Register Rider
    const riderRes = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email: `chat_rider_${Date.now()}@alliance.edu.in`,
            password: 'Password123',
            fullName: 'Chat Rider',
            phone: '+91 93333 44444',
            role: 'rider',
        },
    });
    const riderToken = (await riderRes.json()).token;
    // Captain publishes ride
    const pubRes = await makeRequest('/api/rides', {
        method: 'POST',
        headers: { Authorization: `Bearer ${captainToken}` },
        body: {
            originName: 'Alliance University Main Gate',
            originLat: 12.7298,
            originLng: 77.7088,
            destinationName: 'Electronic City Metro',
            destinationLat: 12.8452,
            destinationLng: 77.6602,
            departureDate: 'Today',
            departureTime: '6:00 PM',
            availableSeats: 1,
            totalSeats: 1,
            contributionAmount: 30,
        },
    });
    const rideId = (await pubRes.json()).rideId;
    // Rider books seat
    const bookRes = await makeRequest('/api/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: { rideId },
    });
    const bookingId = (await bookRes.json()).bookingId;
    // Captain accepts booking
    await makeRequest(`/api/bookings/${bookingId}/accept`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${captainToken}` },
    });
    // Rider sends a message
    const sendRes = await makeRequest(`/api/chat/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${riderToken}` },
        body: { message: 'Hi Captain, I am waiting near Gate 1.' },
    });
    node_assert_1.default.strictEqual(sendRes.status, 201);
    const sendData = (await sendRes.json());
    node_assert_1.default.strictEqual(sendData.chatMessage.message, 'Hi Captain, I am waiting near Gate 1.');
    node_assert_1.default.strictEqual(sendData.chatMessage.isMe, true);
    // Captain fetches messages
    const getCaptRes = await makeRequest(`/api/chat/${bookingId}`, {
        headers: { Authorization: `Bearer ${captainToken}` },
    });
    node_assert_1.default.strictEqual(getCaptRes.status, 200);
    const captChatData = (await getCaptRes.json());
    node_assert_1.default.strictEqual(captChatData.count, 1);
    node_assert_1.default.strictEqual(captChatData.messages[0].senderName, 'Chat Rider');
    node_assert_1.default.strictEqual(captChatData.messages[0].isMe, false);
    // Captain replies
    const replyRes = await makeRequest(`/api/chat/${bookingId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${captainToken}` },
        body: { message: 'Got it, bringing an extra helmet!' },
    });
    node_assert_1.default.strictEqual(replyRes.status, 201);
    // Rider fetches messages
    const getRiderRes = await makeRequest(`/api/chat/${bookingId}`, {
        headers: { Authorization: `Bearer ${riderToken}` },
    });
    node_assert_1.default.strictEqual(getRiderRes.status, 200);
    const riderChatData = (await getRiderRes.json());
    node_assert_1.default.strictEqual(riderChatData.count, 2);
    node_assert_1.default.strictEqual(riderChatData.messages[1].senderName, 'Chat Captain');
    node_assert_1.default.strictEqual(riderChatData.messages[1].isMe, false);
});
(0, node_test_1.default)('17. Password Reset: Forgot password code generation and password update', async () => {
    const email = `reset_user_${Date.now()}@alliance.edu.in`;
    await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email,
            password: 'OriginalPassword#1',
            fullName: 'Reset Student',
            phone: '+91 97777 88888',
            role: 'rider',
        },
    });
    // Request reset code
    const forgotRes = await makeRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: { email },
    });
    node_assert_1.default.strictEqual(forgotRes.status, 200);
    const forgotData = (await forgotRes.json());
    node_assert_1.default.ok(forgotData.resetToken, 'Reset code must be generated');
    node_assert_1.default.strictEqual(forgotData.resetToken.length, 6, 'Reset token must be a 6-digit code');
    // Submit reset password with token
    const resetRes = await makeRequest('/api/auth/reset-password', {
        method: 'POST',
        body: {
            email,
            token: forgotData.resetToken,
            newPassword: 'UpdatedSecurePassword#2',
        },
    });
    node_assert_1.default.strictEqual(resetRes.status, 200);
    // Test login with old password (should fail)
    const failLoginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email,
            password: 'OriginalPassword#1',
        },
    });
    node_assert_1.default.strictEqual(failLoginRes.status, 401);
    // Test login with new password (should succeed)
    const successLoginRes = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: {
            email,
            password: 'UpdatedSecurePassword#2',
        },
    });
    node_assert_1.default.strictEqual(successLoginRes.status, 200);
});
(0, node_test_1.default)('18. Profile Management: Student updates details and Captain vehicle re-verification on plate change', async () => {
    const email = `profile_user_${Date.now()}@alliance.edu.in`;
    const regRes = await makeRequest('/api/auth/register', {
        method: 'POST',
        body: {
            email,
            password: 'Password123',
            fullName: 'Original Name',
            phone: '+91 91234 56789',
            role: 'captain',
            vehicle: {
                make: 'Yamaha',
                model: 'FZ',
                registrationNumber: 'KA-51-AB-1234',
                color: 'Blue',
            },
        },
    });
    const token = (await regRes.json()).token;
    // 1. Update Student Profile
    const profileRes = await makeRequest('/api/auth/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: {
            fullName: 'Updated Name',
            phone: '+91 99999 00000',
            emergencyContact: '+91 98888 11111',
            upiId: 'updated@okhdfcbank',
        },
    });
    node_assert_1.default.strictEqual(profileRes.status, 200);
    const profileData = (await profileRes.json());
    node_assert_1.default.strictEqual(profileData.user.fullName, 'Updated Name');
    node_assert_1.default.strictEqual(profileData.user.phone, '+91 99999 00000');
    node_assert_1.default.strictEqual(profileData.user.emergencyContact, '+91 98888 11111');
    node_assert_1.default.strictEqual(profileData.user.upiId, 'updated@okhdfcbank');
    // 2. Change vehicle plate number -> triggers is_verified reset
    const vehicleRes = await makeRequest('/api/auth/vehicle', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
            make: 'Yamaha',
            model: 'FZ',
            registrationNumber: 'KA-51-ZZ-9999', // Changed plate!
            color: 'Matte Black',
            helmetProvided: true,
        },
    });
    node_assert_1.default.strictEqual(vehicleRes.status, 200);
    const vehicleData = (await vehicleRes.json());
    node_assert_1.default.strictEqual(vehicleData.vehicle.registration_number, 'KA-51-ZZ-9999');
    node_assert_1.default.strictEqual(vehicleData.vehicle.is_verified, 0, 'Changing plate must reset is_verified to 0 for security review');
});
