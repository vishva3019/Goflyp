import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DATABASE_PATH || './data/goflyp.db';
const resolvedDbPath = path.resolve(process.cwd(), dbPath);
const dbDir = path.dirname(resolvedDbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(resolvedDbPath);

// Enable foreign keys and WAL mode for high concurrency
db.exec('PRAGMA foreign_keys = ON;');

export function initDatabase() {
  db.exec(`
    -- 1. Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('captain', 'rider', 'both', 'admin')),
      university TEXT NOT NULL DEFAULT 'Alliance University',
      department TEXT NOT NULL,
      reg_number TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      rating REAL NOT NULL DEFAULT 5.0,
      total_ratings INTEGER NOT NULL DEFAULT 0,
      trips_completed INTEGER NOT NULL DEFAULT 0,
      co2_saved_kg REAL NOT NULL DEFAULT 0.0,
      upi_id TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

    -- 2. Student Verifications Table
    CREATE TABLE IF NOT EXISTS student_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      verification_type TEXT,
      university_email TEXT NOT NULL,
      reg_number TEXT NOT NULL,
      id_card_image_url TEXT,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      reviewed_at TEXT,
      reviewer_id TEXT,
      remarks TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(reviewer_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_verifications_user ON student_verifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_status ON student_verifications(status);

    -- 3. Vehicles Table (Captains only)
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      registration_number TEXT UNIQUE NOT NULL,
      color TEXT NOT NULL,
      helmet_provided INTEGER NOT NULL DEFAULT 1,
      rc_document_url TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);

    -- 4. Campus Settings Table
    CREATE TABLE IF NOT EXISTS campus_settings (
      id TEXT PRIMARY KEY,
      campus_name TEXT NOT NULL,
      center_lat REAL NOT NULL,
      center_lng REAL NOT NULL,
      allowed_email_domain TEXT NOT NULL,
      main_entrance_name TEXT NOT NULL,
      approved_pickup_points_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 5. Rides Table
    CREATE TABLE IF NOT EXISTS rides (
      id TEXT PRIMARY KEY,
      captain_id TEXT NOT NULL,
      origin_name TEXT NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      destination_name TEXT NOT NULL,
      destination_lat REAL NOT NULL,
      destination_lng REAL NOT NULL,
      departure_time TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      available_seats INTEGER NOT NULL CHECK(available_seats >= 0),
      total_seats INTEGER NOT NULL CHECK(total_seats >= 1),
      contribution_amount INTEGER NOT NULL CHECK(contribution_amount >= 0),
      max_detour_km REAL NOT NULL DEFAULT 2.0,
      route_polyline TEXT,
      distance_km REAL NOT NULL DEFAULT 0.0,
      duration_minutes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL CHECK(status IN ('published', 'started', 'completed', 'cancelled')) DEFAULT 'published',
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(captain_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rides_captain ON rides(captain_id);
    CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
    CREATE INDEX IF NOT EXISTS idx_rides_departure ON rides(departure_date, departure_time);

    -- 6. Ride Waypoints Table
    CREATE TABLE IF NOT EXISTS ride_waypoints (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      sequence_order INTEGER NOT NULL,
      eta TEXT,
      FOREIGN KEY(ride_id) REFERENCES rides(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_waypoints_ride ON ride_waypoints(ride_id);

    -- 7. Bookings Table (Atomic seat reservation)
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      ride_id TEXT NOT NULL,
      rider_id TEXT NOT NULL,
      pickup_name TEXT NOT NULL,
      pickup_lat REAL,
      pickup_lng REAL,
      dropoff_name TEXT NOT NULL,
      dropoff_lat REAL,
      dropoff_lng REAL,
      seats_requested INTEGER NOT NULL DEFAULT 1 CHECK(seats_requested >= 1),
      status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')) DEFAULT 'pending',
      contribution_amount INTEGER NOT NULL,
      booked_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(ride_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY(rider_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_ride ON bookings(ride_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_rider ON bookings(rider_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

    -- 8. Payments Table (Direct Peer UPI / Cash)
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('upi', 'cash')),
      status TEXT NOT NULL CHECK(status IN ('pending', 'reported', 'confirmed', 'disputed')) DEFAULT 'pending',
      upi_reference TEXT,
      reported_at TEXT,
      confirmed_at TEXT,
      dispute_reason TEXT,
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

    -- 9. Ratings Table
    CREATE TABLE IF NOT EXISTS ratings (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
      review TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY(from_user_id) REFERENCES users(id),
      FOREIGN KEY(to_user_id) REFERENCES users(id)
    );

    -- 10. Live Trip Telemetry Table
    CREATE TABLE IF NOT EXISTS trip_telemetry (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      speed REAL,
      heading REAL,
      event_type TEXT NOT NULL DEFAULT 'location_ping',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(trip_id) REFERENCES rides(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_trip ON trip_telemetry(trip_id, created_at);

    -- 11. Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      action_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

    -- 12. Incident Reports / SOS Table
    CREATE TABLE IF NOT EXISTS incident_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ride_id TEXT,
      lat REAL,
      lng REAL,
      message TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'investigating', 'resolved')) DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(ride_id) REFERENCES rides(id)
    );

    -- 13. Admin Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(actor_id) REFERENCES users(id)
    );

    -- 14. Chat Messages Table (Accepted booking direct student chat)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_booking ON chat_messages(booking_id, created_at);

    -- 15. Password Resets Table
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token);
  `);

  // Safe schema migration for existing databases: ensure is_active column exists on users
  try {
    db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;');
  } catch (e) {
    // Column already exists
  }

  // Safe schema migration: ensure emergency_contact column exists on users
  try {
    db.exec('ALTER TABLE users ADD COLUMN emergency_contact TEXT;');
  } catch (e) {
    // Column already exists
  }

  // Safe schema migration for existing databases: ensure verification_type column exists on student_verifications
  try {
    db.exec('ALTER TABLE student_verifications ADD COLUMN verification_type TEXT;');
  } catch (e) {
    // Column already exists
  }

  // Initialize / Synchronize Alliance University Canonical Campus Config
  const existingConfig = db.prepare('SELECT id, center_lat, center_lng FROM campus_settings LIMIT 1').get() as any;
  const emailDomain = process.env.ALLIANCE_EMAIL_DOMAIN || 'alliance.edu.in';
  const campusId = 'alliance_central_campus';
  const campusName = process.env.ALLIANCE_CAMPUS_NAME || 'Alliance University Central Campus';
  const centerLat = parseFloat(process.env.ALLIANCE_CAMPUS_LAT || '12.7298');
  const centerLng = parseFloat(process.env.ALLIANCE_CAMPUS_LNG || '77.7088');
  const mainEntrance = 'Alliance University Main Entrance Gate (Anekal Main Road)';
  const pickupPoints = JSON.stringify([
    { id: 'gate_1', name: 'Alliance University Main Entrance Gate', lat: 12.7298, lng: 77.7088 },
    { id: 'gate_2', name: 'Central Library Plaza & Quadrangle', lat: 12.7295, lng: 77.7082 },
    { id: 'gate_3', name: 'Hostel Block B & Cafeteria', lat: 12.7305, lng: 77.7075 },
    { id: 'gate_4', name: 'Alliance School of Business Gate', lat: 12.7290, lng: 77.7085 },
    { id: 'gate_5', name: 'Chikkahagade Cross Bus Stop', lat: 12.7285, lng: 77.7095 },
  ]);

  if (!existingConfig) {
    db.prepare(`
      INSERT INTO campus_settings (
        id, campus_name, center_lat, center_lng, allowed_email_domain, main_entrance_name, approved_pickup_points_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(campusId, campusName, centerLat, centerLng, emailDomain, mainEntrance, pickupPoints);
  } else {
    // Update existing campus settings to canonical coordinates and allowed domain
    db.prepare(`
      UPDATE campus_settings 
      SET campus_name = ?, center_lat = ?, center_lng = ?, allowed_email_domain = ?, main_entrance_name = ?, approved_pickup_points_json = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(campusName, centerLat, centerLng, emailDomain, mainEntrance, pickupPoints, existingConfig.id);
  }
}
