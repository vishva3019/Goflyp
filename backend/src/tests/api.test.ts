process.env.NODE_ENV = 'test';
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../server';

let server: http.Server;
let port: number;
let baseUrl: string;

function makeRequest(path: string, options: any = {}) {
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

test.before(async () => {
  process.env.NODE_ENV = 'test';

  // Seed test accounts in isolated test database
  const { db } = await import('../db/database');
  const bcrypt = await import('bcryptjs');
  const crypto = await import('node:crypto');

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

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      port = address.port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  server.close();
  try {
    const fs = require('node:fs');
    if (fs.existsSync('./data/goflyp_test.db')) {
      fs.unlinkSync('./data/goflyp_test.db');
    }
  } catch (e) {
    // Ignore cleanup error
  }
});

test('1. System Health Check', async () => {
  const res = await makeRequest('/api/health');
  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as any;
  assert.strictEqual(data.status, 'ONLINE');
  assert.strictEqual(data.university, 'Alliance University');
});

test('2. Authentication: Reject non-Alliance university email', async () => {
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

  assert.strictEqual(res.status, 400);
  const data = (await res.json()) as any;
  assert.match(data.error, /alliance\.edu\.in/);
});

test('3. Authentication: Register Captain with Vehicle', async () => {
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

  assert.strictEqual(res.status, 201);
  const data = (await res.json()) as any;
  assert.ok(data.token);
  assert.strictEqual(data.user.role, 'captain');
});

test('4. Authentication: Register Rider', async () => {
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

  assert.strictEqual(res.status, 201);
  const data = (await res.json()) as any;
  assert.ok(data.token);
  assert.strictEqual(data.user.role, 'rider');
});

test('5. Geospatial: Search Campus Locations', async () => {
  const res = await makeRequest('/api/geo/search?q=Alliance');
  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as any;
  assert.ok(Array.isArray(data.places));
  assert.ok(data.places.length > 0);
  assert.ok(data.places[0].lat !== undefined);
});

test('6. Geospatial: Calculate Real Road Route', async () => {
  const res = await makeRequest('/api/geo/route', {
    method: 'POST',
    body: {
      origin: { lat: 12.8256, lng: 77.7123 },
      destination: { lat: 12.8452, lng: 77.6602 },
    },
  });

  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as any;
  assert.ok(data.distanceKm > 0);
  assert.ok(data.durationMinutes > 0);
  assert.ok(Array.isArray(data.polyline));
  assert.ok(data.polyline.length > 2);
});

test('7. End-to-end Lifecycle: Captain publishes ride, Rider books, Captain starts and completes, Rider pays', async () => {
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
  const cData = (await cReg.json()) as any;
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
  const rData = (await rReg.json()) as any;
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

  assert.strictEqual(pubRes.status, 201);
  const pubData = (await pubRes.json()) as any;
  const rideId = pubData.rideId;
  assert.ok(rideId);
  assert.ok(pubData.distanceKm > 0);

  // Step D: Prevent Self-booking / Role check
  const selfRes = await makeRequest('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${captainToken}` },
    body: { rideId },
  });
  assert.ok(selfRes.status === 400 || selfRes.status === 403);

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

  assert.strictEqual(bookRes.status, 201);
  const bookData = (await bookRes.json()) as any;
  const bookingId = bookData.bookingId;
  assert.ok(bookingId);

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
  const r2Data = (await r2Reg.json()) as any;
  const overbookRes = await makeRequest('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${r2Data.token}` },
    body: { rideId },
  });
  assert.strictEqual(overbookRes.status, 409); // Full capacity reached

  // Step G: Captain accepts booking
  const acceptRes = await makeRequest(`/api/bookings/${bookingId}/accept`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  assert.strictEqual(acceptRes.status, 200);

  // Step H: Captain starts trip
  const startRes = await makeRequest(`/api/trips/${rideId}/start`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  assert.strictEqual(startRes.status, 200);

  // Step I: Captain completes trip
  const completeRes = await makeRequest(`/api/trips/${rideId}/complete`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  assert.strictEqual(completeRes.status, 200);

  // Step J: Rider reports direct peer UPI payment
  const payRes = await makeRequest(`/api/payments/${bookingId}/report`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${riderToken}` },
    body: {
      paymentMethod: 'upi',
      upiReference: 'UPI425619882190',
    },
  });
  assert.strictEqual(payRes.status, 200);

  // Step K: Captain confirms receipt
  const confirmRes = await makeRequest(`/api/payments/${bookingId}/confirm`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  assert.strictEqual(confirmRes.status, 200);
});

test('8. Subdomain Authentication: Register and Login with @ced.alliance.edu.in', async () => {
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

  assert.strictEqual(regRes.status, 201);
  const regData = (await regRes.json()) as any;
  assert.ok(regData.token);
  assert.strictEqual(regData.user.role, 'captain');
  assert.strictEqual(regData.user.isVerified, false);

  // Now test login with same @ced.alliance.edu.in email
  const loginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: cedEmail,
      password: 'AllianceSecure#2026',
      requestedRole: 'captain',
    },
  });

  assert.strictEqual(loginRes.status, 200);
  const loginData = (await loginRes.json()) as any;
  assert.ok(loginData.token);
  assert.strictEqual(loginData.user.role, 'captain');
  assert.strictEqual(loginData.user.isVerified, false);
  assert.ok(loginData.user.vehicle);
});

test('9. Authentication Error Codes: Granular error responses', async () => {
  // A. Missing credentials
  const res1 = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: '', password: '' },
  });
  assert.strictEqual(res1.status, 400);
  const data1 = (await res1.json()) as any;
  assert.strictEqual(data1.code, 'MISSING_FIELDS');

  // B. Invalid domain
  const res2 = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'student@gmail.com', password: 'Password123' },
  });
  assert.strictEqual(res2.status, 400);
  const data2 = (await res2.json()) as any;
  assert.strictEqual(data2.code, 'INVALID_EMAIL_DOMAIN');

  // C. Account not found
  const res3 = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'nonexistent@alliance.edu.in', password: 'Password123' },
  });
  assert.strictEqual(res3.status, 404);
  const data3 = (await res3.json()) as any;
  assert.strictEqual(data3.code, 'ACCOUNT_NOT_FOUND');

  // D. Invalid password for existing user
  const res4 = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: { email: 'vishvanthbtech24@ced.alliance.edu.in', password: 'IncorrectPassword#999' },
  });
  assert.strictEqual(res4.status, 401);
  const data4 = (await res4.json()) as any;
  assert.strictEqual(data4.code, 'INVALID_CREDENTIALS');

  // E. Non-admin attempting admin access
  const res5 = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'vishvanthbtech24@ced.alliance.edu.in',
      password: 'Life@789',
      requestedRole: 'admin',
    },
  });
  assert.strictEqual(res5.status, 403);
  const data5 = (await res5.json()) as any;
  assert.strictEqual(data5.code, 'ROLE_UNAUTHORIZED');
});

test('10. Captain Test Account: vishvanthbtech24@ced.alliance.edu.in', async () => {
  const res = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'vishvanthbtech24@ced.alliance.edu.in',
      password: 'Life@789',
      requestedRole: 'captain',
    },
  });

  assert.strictEqual(res.status, 200);
  const data = (await res.json()) as any;
  assert.ok(data.token);
  assert.strictEqual(data.user.email, 'vishvanthbtech24@ced.alliance.edu.in');
  assert.strictEqual(data.user.role, 'captain');
  assert.strictEqual(data.user.isVerified, false);
  assert.ok(data.user.vehicle);
  assert.strictEqual(data.user.vehicle.make, 'Royal Enfield');
});

test('11. Admin Authentication & Metrics Overview', async () => {
  const loginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@alliance.edu.in',
      password: 'Life@789',
      requestedRole: 'admin',
    },
  });
  assert.strictEqual(loginRes.status, 200);
  const loginData = (await loginRes.json()) as any;
  const adminToken = loginData.token;
  assert.ok(adminToken);
  assert.strictEqual(loginData.user.role, 'admin');

  const statsRes = await makeRequest('/api/admin/stats', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(statsRes.status, 200);
  const statsData = (await statsRes.json()) as any;
  assert.ok(statsData.stats);
  assert.ok(typeof statsData.stats.totalStudents === 'number');
  assert.ok(typeof statsData.stats.totalCaptains === 'number');
  assert.ok(typeof statsData.stats.totalRides === 'number');
  assert.ok(typeof statsData.stats.totalCo2SavedKg === 'number');
});

test('12. Admin Verifications: Unified object shape and verification_type handling', async () => {
  // Login as admin
  const loginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@alliance.edu.in',
      password: 'Life@789',
      requestedRole: 'admin',
    },
  });
  const adminToken = ((await loginRes.json()) as any).token;

  const verifRes = await makeRequest('/api/admin/verifications', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(verifRes.status, 200);
  const verifData = (await verifRes.json()) as any;
  assert.ok(Array.isArray(verifData.verifications));
  assert.ok(verifData.verifications.length > 0);

  // Validate consistent object shape
  for (const item of verifData.verifications) {
    assert.ok(item.id, 'Every verification item must have an id');
    assert.ok(item.user_id, 'Every verification item must have a user_id');
    assert.ok(item.status, 'Every verification item must have a status');
    assert.ok(item.full_name, 'Every verification item must have full_name');
    assert.ok(item.email, 'Every verification item must have email');

    // verification_type must either be a valid string or null for legacy records
    if (item.verification_type !== null) {
      assert.ok(
        ['student_id', 'vehicle_rc', 'driving_license'].includes(item.verification_type),
        `Unexpected verification_type: ${item.verification_type}`
      );
    }
  }

  // Ensure both student_id (or legacy) and vehicle_rc types exist in verification list
  const vehicleItems = verifData.verifications.filter((v: any) => v.verification_type === 'vehicle_rc');
  assert.ok(vehicleItems.length > 0, 'Verification list should include motorcycle RC items');
  assert.ok(vehicleItems[0].vehicle_make, 'Vehicle RC item must include vehicle_make');
  assert.ok(vehicleItems[0].registration_number, 'Vehicle RC item must include registration_number');
});

test('13. Admin Verification Approval and Rejection Lifecycle', async () => {
  const loginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'admin@alliance.edu.in',
      password: 'Life@789',
      requestedRole: 'admin',
    },
  });
  const adminToken = ((await loginRes.json()) as any).token;

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
  const regData = (await regRes.json()) as any;
  const newUserId = regData.user.id;

  // Fetch admin verifications to locate new record
  const verifRes = await makeRequest('/api/admin/verifications', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const verifData = (await verifRes.json()) as any;
  const targetItem = verifData.verifications.find((v: any) => v.user_id === newUserId);
  assert.ok(targetItem, 'New applicant verification record must appear in admin list');
  assert.strictEqual(targetItem.verification_type, 'student_id');
  assert.strictEqual(targetItem.status, 'pending');

  // Test Approve
  const approveRes = await makeRequest(`/api/admin/verifications/${targetItem.id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(approveRes.status, 200);

  // Test Reject
  const rejectRes = await makeRequest(`/api/admin/verifications/${targetItem.id}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { rejectionReason: 'ID card blur test' },
  });
  assert.strictEqual(rejectRes.status, 200);
  const rejectData = (await rejectRes.json()) as any;
  assert.strictEqual(rejectData.status, 'rejected');
});

test('14. Dynamic Geospatial Routing: Distance and duration update dynamically when destination changes', async () => {
  // Origin: Alliance Main Gate
  const origin = { lat: 12.8256, lng: 77.7123 };

  // Destination A: Electronic City Metro (approx 7.9 km)
  const destA = { lat: 12.8452, lng: 77.6602 };
  const resA = await makeRequest('/api/geo/route', {
    method: 'POST',
    body: { origin, destination: destA },
  });
  assert.strictEqual(resA.status, 200);
  const dataA = (await resA.json()) as any;
  assert.ok(dataA.distanceKm > 7.0 && dataA.distanceKm < 9.0, 'ECity distance should be ~7.9 km');
  assert.ok(dataA.durationMinutes > 10, 'ECity duration should be > 10 mins');
  assert.ok(dataA.distanceMeters > 7000, 'distanceMeters must be provided');
  assert.ok(dataA.durationSeconds > 600, 'durationSeconds must be provided');
  assert.ok(Array.isArray(dataA.coordinates) && dataA.coordinates.length > 5, 'coordinates must be an array of points');
  assert.ok(Array.isArray(dataA.polyline) && dataA.polyline.length > 5, 'polyline must be an array of points');

  // Destination B: Chandapura Circle (significantly different destination, ~6.0 km)
  const destB = { lat: 12.7954, lng: 77.6989 };
  const resB = await makeRequest('/api/geo/route', {
    method: 'POST',
    body: { origin, destination: destB },
  });
  assert.strictEqual(resB.status, 200);
  const dataB = (await resB.json()) as any;
  assert.ok(dataB.distanceKm < 7.0, 'Chandapura route distance must be different from ECity (~6 km)');
  assert.notStrictEqual(dataB.distanceKm, dataA.distanceKm, 'Distance must change dynamically for different destinations');
  assert.notStrictEqual(dataB.durationMinutes, dataA.durationMinutes, 'Duration must change dynamically for different destinations');
});

test('15. Captain Publish Journey: Saves actual dynamic route metrics without hardcoded 7.9 km / 13 min fallback', async () => {
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
  const regData = (await regRes.json()) as any;
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

  assert.strictEqual(pubRes.status, 201);
  const pubData = (await pubRes.json()) as any;
  assert.ok(pubData.rideId);
  // Verify returned distance is for Chandapura (~6 km), NOT hardcoded 7.9 km!
  assert.strictEqual(pubData.distanceKm, 6);
  assert.strictEqual(pubData.durationMinutes, 9);

  // Fetch the created ride directly and verify stored values
  const getRes = await makeRequest(`/api/rides/${pubData.rideId}`);
  assert.strictEqual(getRes.status, 200);
  const ride = (await getRes.json()) as any;
  assert.strictEqual(ride.distanceKm, 6);
  assert.strictEqual(ride.durationMinutes, 9);
  assert.strictEqual(ride.destinationLocation, 'Chandapura Circle Flyover Junction');
  assert.ok(ride.routePolyline.length > 5);
});

test('16. Direct Student Chat: Rider and Captain communication on accepted booking', async () => {
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
  const captainToken = ((await captainRes.json()) as any).token;

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
  const riderToken = ((await riderRes.json()) as any).token;

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
  const rideId = ((await pubRes.json()) as any).rideId;

  // Rider books seat
  const bookRes = await makeRequest('/api/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${riderToken}` },
    body: { rideId },
  });
  const bookingId = ((await bookRes.json()) as any).bookingId;

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
  assert.strictEqual(sendRes.status, 201);
  const sendData = (await sendRes.json()) as any;
  assert.strictEqual(sendData.chatMessage.message, 'Hi Captain, I am waiting near Gate 1.');
  assert.strictEqual(sendData.chatMessage.isMe, true);

  // Captain fetches messages
  const getCaptRes = await makeRequest(`/api/chat/${bookingId}`, {
    headers: { Authorization: `Bearer ${captainToken}` },
  });
  assert.strictEqual(getCaptRes.status, 200);
  const captChatData = (await getCaptRes.json()) as any;
  assert.strictEqual(captChatData.count, 1);
  assert.strictEqual(captChatData.messages[0].senderName, 'Chat Rider');
  assert.strictEqual(captChatData.messages[0].isMe, false);

  // Captain replies
  const replyRes = await makeRequest(`/api/chat/${bookingId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${captainToken}` },
    body: { message: 'Got it, bringing an extra helmet!' },
  });
  assert.strictEqual(replyRes.status, 201);

  // Rider fetches messages
  const getRiderRes = await makeRequest(`/api/chat/${bookingId}`, {
    headers: { Authorization: `Bearer ${riderToken}` },
  });
  assert.strictEqual(getRiderRes.status, 200);
  const riderChatData = (await getRiderRes.json()) as any;
  assert.strictEqual(riderChatData.count, 2);
  assert.strictEqual(riderChatData.messages[1].senderName, 'Chat Captain');
  assert.strictEqual(riderChatData.messages[1].isMe, false);
});

test('17. Password Reset: Forgot password code generation and password update', async () => {
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
  assert.strictEqual(forgotRes.status, 200);
  const forgotData = (await forgotRes.json()) as any;
  assert.ok(forgotData.resetToken, 'Reset code must be generated');
  assert.strictEqual(forgotData.resetToken.length, 6, 'Reset token must be a 6-digit code');

  // Submit reset password with token
  const resetRes = await makeRequest('/api/auth/reset-password', {
    method: 'POST',
    body: {
      email,
      token: forgotData.resetToken,
      newPassword: 'UpdatedSecurePassword#2',
    },
  });
  assert.strictEqual(resetRes.status, 200);

  // Test login with old password (should fail)
  const failLoginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password: 'OriginalPassword#1',
    },
  });
  assert.strictEqual(failLoginRes.status, 401);

  // Test login with new password (should succeed)
  const successLoginRes = await makeRequest('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password: 'UpdatedSecurePassword#2',
    },
  });
  assert.strictEqual(successLoginRes.status, 200);
});

test('18. Profile Management: Student updates details and Captain vehicle re-verification on plate change', async () => {
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
  const token = ((await regRes.json()) as any).token;

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
  assert.strictEqual(profileRes.status, 200);
  const profileData = (await profileRes.json()) as any;
  assert.strictEqual(profileData.user.fullName, 'Updated Name');
  assert.strictEqual(profileData.user.phone, '+91 99999 00000');
  assert.strictEqual(profileData.user.emergencyContact, '+91 98888 11111');
  assert.strictEqual(profileData.user.upiId, 'updated@okhdfcbank');

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
  assert.strictEqual(vehicleRes.status, 200);
  const vehicleData = (await vehicleRes.json()) as any;
  assert.strictEqual(vehicleData.vehicle.registration_number, 'KA-51-ZZ-9999');
  assert.strictEqual(vehicleData.vehicle.is_verified, 0, 'Changing plate must reset is_verified to 0 for security review');
});




