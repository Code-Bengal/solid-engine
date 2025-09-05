import Database from 'better-sqlite3';
import path from 'path';

// Database path
const dbPath = path.join(process.cwd(), 'hotel.db');

// Create database connection
const db = Database(dbPath);

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
const createRoom = db.prepare(`
  INSERT INTO rooms (name, description, price_per_night, capacity, amenities, image_url)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const getAllRooms = db.prepare(`
  SELECT * FROM rooms ORDER BY created_at DESC
`);

// Seed data for rooms
const roomsData = [
  {
    name: 'Standard Room',
    description: 'Comfortable room with all basic amenities including WiFi, TV, and air conditioning.',
    price_per_night: 100,
    capacity: 2,
    amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Room Service']),
    image_url: '/room-standard.jpg'
  },
  {
    name: 'Deluxe Room',
    description: 'Spacious room with premium amenities, city view, and additional comforts.',
    price_per_night: 150,
    capacity: 2,
    amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Room Service', 'City View', 'Balcony']),
    image_url: '/room-deluxe.jpg'
  },
  {
    name: 'Suite',
    description: 'Luxurious suite with separate living area, stunning views, and top-tier amenities.',
    price_per_night: 250,
    capacity: 4,
    amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Room Service', 'City View', 'Balcony', 'Kitchen', 'Jacuzzi']),
    image_url: '/room-suite.jpg'
  }
];

// Seed the database
export function seedDatabase() {
  try {
    // Check if rooms already exist
    const existingRooms = getAllRooms.all();
    if (existingRooms.length > 0) {
      console.log('Database already seeded');
      return;
    }

    // Insert rooms
    for (const room of roomsData) {
      createRoom.run(
        room.name,
        room.description,
        room.price_per_night,
        room.capacity,
        room.amenities,
        room.image_url
      );
    }

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    db.close();
  }
}

// Run seed if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  seedDatabase();
}
