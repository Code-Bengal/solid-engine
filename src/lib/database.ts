import Database from 'better-sqlite3';
import path from 'path';

// Database path
const dbPath = path.join(process.cwd(), 'hotel.db');

// Create database connection
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price_per_night REAL NOT NULL,
    capacity INTEGER NOT NULL,
    amenities TEXT, -- JSON string
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (room_id) REFERENCES rooms (id)
  );
`);

// Prepared statements
export const statements = {
  // Users
  createUser: db.prepare(`
    INSERT INTO users (email, name, password, role)
    VALUES (?, ?, ?, ?)
  `),

  getUserByEmail: db.prepare(`
    SELECT id, email, name, password, role, created_at
    FROM users WHERE email = ?
  `),

  getUserById: db.prepare(`
    SELECT id, email, name, role, created_at
    FROM users WHERE id = ?
  `),

  // Rooms
  createRoom: db.prepare(`
    INSERT INTO rooms (name, description, price_per_night, capacity, amenities, image_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getAllRooms: db.prepare(`
    SELECT * FROM rooms ORDER BY created_at DESC
  `),

  getRoomById: db.prepare(`
    SELECT * FROM rooms WHERE id = ?
  `),

  updateRoom: db.prepare(`
    UPDATE rooms
    SET name = ?, description = ?, price_per_night = ?, capacity = ?, amenities = ?, image_url = ?
    WHERE id = ?
  `),

  deleteRoom: db.prepare(`
    DELETE FROM rooms WHERE id = ?
  `),

  // Bookings
  createBooking: db.prepare(`
    INSERT INTO bookings (user_id, room_id, check_in_date, check_out_date, total_price, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getBookingsByUser: db.prepare(`
    SELECT b.*, r.name as room_name, r.image_url
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `),

  getAllBookings: db.prepare(`
    SELECT b.*, r.name as room_name, r.image_url, u.name as user_name, u.email
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    JOIN users u ON b.user_id = u.id
    ORDER BY b.created_at DESC
  `),

  updateBookingStatus: db.prepare(`
    UPDATE bookings SET status = ? WHERE id = ?
  `),

  checkRoomAvailability: db.prepare(`
    SELECT COUNT(*) as count FROM bookings
    WHERE room_id = ?
    AND status != 'cancelled'
    AND (
      (check_in_date <= ? AND check_out_date > ?) OR
      (check_in_date < ? AND check_out_date >= ?) OR
      (check_in_date >= ? AND check_out_date <= ?)
    )
  `),
};

export default db;
