import express from "express";
import type { Request, Response } from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { Server } from "socket.io";
import http from "http";
import twilio from "twilio";

const { VoiceResponse } = twilio.twiml;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
let io: Server;

// Helper to calculate distance between two points in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function checkTractorServices() {
  if (!db || !io) return;
  console.log('Checking tractor service dates...');
  const today = new Date();
  const thresholdDays = 7;
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + thresholdDays);

  try {
    const tractors = db.prepare("SELECT id, owner_id, model, next_service FROM tractors WHERE next_service IS NOT NULL").all();

    tractors.forEach((t: any) => {
      const serviceDate = new Date(t.next_service);
      // Check if service is within the next 7 days
      if (serviceDate >= today && serviceDate <= thresholdDate) {
        const message = `Service Reminder: Your tractor (${t.model}) is due for service on ${t.next_service}.`;
        
        // Check if a similar notification was sent in the last 7 days to avoid spam
        const existingNotif = db.prepare("SELECT id FROM notifications WHERE user_id = ? AND message LIKE ? AND created_at > datetime('now', '-7 days')")
          .get(t.owner_id, `%${t.model}%service%`);

        if (!existingNotif) {
          db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)")
            .run(t.owner_id, message, 'service_reminder');
          
          io.to(`user_${t.owner_id}`).emit('notification', {
            id: Date.now(),
            user_id: t.owner_id,
            message: message,
            type: 'service_reminder',
            created_at: new Date().toISOString()
          });
          console.log(`Sent service reminder for tractor ${t.id} to user ${t.owner_id}`);
        }
      }
    });
  } catch (err) {
    console.error('Error checking tractor services:', err);
  }
}

async function startServer() {
  console.log('Initializing database...');
  db = new Database("tfs.db");
  db.pragma('foreign_keys = ON');

  // Initialize Database
  try {
    console.log('Creating tables...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        phone TEXT,
        role TEXT, -- 'farmer', 'provider'
        language TEXT DEFAULT 'en',
        latitude REAL,
        longitude REAL,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email)
      );

      CREATE TABLE IF NOT EXISTS login_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS tractors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER,
        model TEXT,
        status TEXT DEFAULT 'available',
        location TEXT,
        latitude REAL,
        longitude REAL,
        image_url TEXT,
        description TEXT,
        price_per_acre REAL DEFAULT 1000,
        price_per_hour REAL DEFAULT 500,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        farmer_id INTEGER,
        provider_id INTEGER,
        tractor_id INTEGER,
        acres REAL,
        date TEXT,
        location TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'cancelled'
        service_type TEXT DEFAULT 'Plowing',
        voice_note_url TEXT,
        rating INTEGER,
        feedback TEXT,
        farmer_phone TEXT,
        farmer_address TEXT,
        FOREIGN KEY(farmer_id) REFERENCES users(id),
        FOREIGN KEY(provider_id) REFERENCES users(id),
        FOREIGN KEY(tractor_id) REFERENCES tractors(id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT,
        type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_read INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT, -- 'emergency', 'urgent', 'help'
        message TEXT,
        latitude REAL,
        longitude REAL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // Migration for existing tables
    console.log('Running migrations...');
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const columns = tableInfo.map((c: any) => c.name);
    
    if (!columns.includes('username')) {
      console.log('Adding username column...');
      db.exec("ALTER TABLE users ADD COLUMN username TEXT;");
      db.exec("UPDATE users SET username = LOWER(REPLACE(name, ' ', '')) || id;");
    }
    
    if (!columns.includes('latitude')) {
      console.log('Adding latitude column...');
      db.exec("ALTER TABLE users ADD COLUMN latitude REAL;");
    }
    
    if (!columns.includes('longitude')) {
      console.log('Adding longitude column...');
      db.exec("ALTER TABLE users ADD COLUMN longitude REAL;");
    }

    if (!columns.includes('address')) {
      db.exec("ALTER TABLE users ADD COLUMN address TEXT;");
    }
    if (!columns.includes('bio')) {
      db.exec("ALTER TABLE users ADD COLUMN bio TEXT;");
    }
    if (!columns.includes('experience')) {
      db.exec("ALTER TABLE users ADD COLUMN experience TEXT;");
    }
    if (!columns.includes('rating')) {
      db.exec("ALTER TABLE users ADD COLUMN rating REAL DEFAULT 5.0;");
    }
    if (!columns.includes('avatar_url')) {
      db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT;");
    }

    const tractorTableInfo = db.prepare("PRAGMA table_info(tractors)").all();
    const tractorColumns = tractorTableInfo.map((c: any) => c.name);
    if (!tractorColumns.includes('image_url')) {
      db.exec("ALTER TABLE tractors ADD COLUMN image_url TEXT;");
    }
    if (!tractorColumns.includes('description')) {
      db.exec("ALTER TABLE tractors ADD COLUMN description TEXT;");
    }
    if (!tractorColumns.includes('price_per_acre')) {
      db.exec("ALTER TABLE tractors ADD COLUMN price_per_acre REAL DEFAULT 1000;");
    }
    if (!tractorColumns.includes('price_per_hour')) {
      db.exec("ALTER TABLE tractors ADD COLUMN price_per_hour REAL DEFAULT 500;");
    }
    if (!tractorColumns.includes('hp')) {
      db.exec("ALTER TABLE tractors ADD COLUMN hp INTEGER DEFAULT 45;");
    }
    if (!tractorColumns.includes('year')) {
      db.exec("ALTER TABLE tractors ADD COLUMN year INTEGER DEFAULT 2022;");
    }
    if (!tractorColumns.includes('fuel_type')) {
      db.exec("ALTER TABLE tractors ADD COLUMN fuel_type TEXT DEFAULT 'Diesel';");
    }
    if (!tractorColumns.includes('last_service')) {
      db.exec("ALTER TABLE tractors ADD COLUMN last_service TEXT;");
    }
    if (!tractorColumns.includes('next_service')) {
      db.exec("ALTER TABLE tractors ADD COLUMN next_service TEXT;");
    }
    if (!tractorColumns.includes('ai_health_score')) {
      db.exec("ALTER TABLE tractors ADD COLUMN ai_health_score INTEGER DEFAULT 95;");
    }
    if (!tractorColumns.includes('ai_maintenance_tip')) {
      db.exec("ALTER TABLE tractors ADD COLUMN ai_maintenance_tip TEXT;");
    }
    if (!tractorColumns.includes('maintenance_history')) {
      db.exec("ALTER TABLE tractors ADD COLUMN maintenance_history TEXT;");
      db.prepare("UPDATE tractors SET maintenance_history = ? WHERE id = 1").run(JSON.stringify([
        { date: '2025-12-10', type: 'Oil Change', cost: 1500, notes: 'Engine oil and filter replaced.' },
        { date: '2026-01-15', type: 'Tire Rotation', cost: 800, notes: 'All tires checked and rotated.' }
      ]));
    }

    console.log('Creating other tables...');
    const bookingColumns = db.prepare("PRAGMA table_info(bookings)").all().map((c: any) => c.name);
    if (!bookingColumns.includes('rating')) {
      db.exec("ALTER TABLE bookings ADD COLUMN rating INTEGER;");
    }
    if (!bookingColumns.includes('feedback')) {
      db.exec("ALTER TABLE bookings ADD COLUMN feedback TEXT;");
    }
    if (!bookingColumns.includes('farmer_phone')) {
      db.exec("ALTER TABLE bookings ADD COLUMN farmer_phone TEXT;");
    }
    if (!bookingColumns.includes('farmer_address')) {
      db.exec("ALTER TABLE bookings ADD COLUMN farmer_address TEXT;");
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }

  console.log('Starting server initialization...');
  const app = express();
  const server = http.createServer(app);
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(express.json());

  // Socket.io connection handling
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    socket.on("update_location", (data) => {
      const { userId, latitude, longitude } = data;
      db.prepare("UPDATE users SET latitude = ?, longitude = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?")
        .run(latitude, longitude, userId);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Check for tractor services due soon
  checkTractorServices();
  setInterval(checkTractorServices, 24 * 60 * 60 * 1000); // Run daily

  // API Routes
  console.log('Setting up API routes...');
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // User Management
  app.get("/api/users/check-email", (req, res) => {
    const { email } = req.query;
    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    res.json({ exists: !!user });
  });

  app.get("/api/users/check-username", (req, res) => {
    const { username } = req.query;
    const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    res.json({ exists: !!user });
  });

  app.post("/api/users/register", async (req, res) => {
    const { email, password, name, username, role, language, phone, latitude, longitude } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const info = db.prepare("INSERT INTO users (email, password, name, username, role, language, phone, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(email, hashedPassword, name, username, role, language || 'en', phone || '', latitude || null, longitude || null);
      const user = db.prepare("SELECT id, name, username, email, phone, role, language, latitude, longitude, avatar_url FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        if (e.message.includes('username')) {
          res.status(400).json({ error: "Username already taken." });
        } else {
          res.status(400).json({ error: "This email is already registered. Please login instead." });
        }
      } else {
        console.error('Registration error:', e);
        res.status(500).json({ error: "Registration failed" });
      }
    }
  });

  app.post("/api/users/login", async (req, res) => {
    const { email, password, role, phone } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = ?").get(email, role);
    
    if (user && await bcrypt.compare(password, user.password)) {
      // Update phone if provided during login
      if (phone) {
        db.prepare("UPDATE users SET phone = ? WHERE id = ?").run(phone, user.id);
        user.phone = phone;
      }
      
      const { password: _, ...userWithoutPassword } = user;
      
      // Log login information
      try {
        db.prepare("INSERT INTO login_logs (user_id, ip_address) VALUES (?, ?)").run(user.id, req.ip);
      } catch (e) {
        console.error("Failed to log login", e);
      }

      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid email or password." });
    }
  });

  app.post("/api/users/reset-password", async (req, res) => {
    const { email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare("UPDATE users SET password = ? WHERE email = ?").run(hashedPassword, email);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/users/search", (req, res) => {
    const { username } = req.query;
    const user = db.prepare("SELECT id, name, username, email, phone, role, language, last_active, avatar_url FROM users WHERE username = ?").get(username);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.patch("/api/users/:id", (req, res) => {
    const { name, email, phone, language, username, address, bio, experience, avatar_url } = req.body;
    try {
      db.prepare("UPDATE users SET name = ?, email = ?, phone = ?, language = ?, username = ?, address = ?, bio = ?, experience = ?, avatar_url = ? WHERE id = ?")
        .run(name, email, phone, language, username, address || null, bio || null, experience || null, avatar_url || null, req.params.id);
      const user = db.prepare("SELECT id, name, username, email, phone, role, language, address, bio, experience, rating, avatar_url FROM users WHERE id = ?").get(req.params.id);
      res.json(user);
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: "Username or email already taken." });
      } else {
        res.status(500).json({ error: "Update failed" });
      }
    }
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT id, name, username, email, phone, role, language, latitude, longitude, address, bio, experience, rating, avatar_url FROM users WHERE id = ?").get(req.params.id);
    res.json(user);
  });

  // Alerts
  app.post("/api/alerts", (req, res) => {
    const { user_id, type, message, latitude, longitude } = req.body;
    const sanitizedUserId = parseInt(user_id) || null;
    try {
      const info = db.prepare("INSERT INTO alerts (user_id, type, message, latitude, longitude) VALUES (?, ?, ?, ?, ?)").run(sanitizedUserId, type, message, latitude, longitude);
      
      // Notify nearby users via socket
      io.emit("new_alert", {
        id: info.lastInsertRowid,
        user_id: sanitizedUserId,
        type,
        message,
        latitude,
        longitude,
        created_at: new Date().toISOString()
      });

      res.json({ success: true, id: info.lastInsertRowid });
    } catch (e) {
      console.error('Alert error:', e);
      res.status(500).json({ error: "Failed to send alert" });
    }
  });

  // Bookings
  app.post("/api/bookings", (req, res) => {
    const { farmer_id, acres, date, location, latitude, longitude, service_type, tractor_id, farmer_phone, farmer_address } = req.body;
    const sanitizedFarmerId = parseInt(farmer_id) || null;
    const sanitizedTractorId = parseInt(tractor_id) || null;
    
    const info = db.prepare(`
      INSERT INTO bookings (farmer_id, acres, date, location, latitude, longitude, service_type, tractor_id, farmer_phone, farmer_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sanitizedFarmerId, acres, date, location, latitude || null, longitude || null, service_type || 'Plowing', sanitizedTractorId, farmer_phone || null, farmer_address || null);
    
    const bookingId = info.lastInsertRowid;

    if (sanitizedTractorId) {
      // Notify specific tractor owner
      const tractor = db.prepare("SELECT owner_id, model FROM tractors WHERE id = ?").get(sanitizedTractorId);
      if (tractor) {
        const message = `Direct booking request for ${tractor.model}: ${acres} acres at ${location}`;
        db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'new_booking')")
          .run(tractor.owner_id, message);
        
        io.to(`user_${tractor.owner_id}`).emit("notification", {
          id: Date.now(),
          message,
          type: 'new_booking',
          bookingId
        });
      }
    } else {
      // Find nearby providers (within 50km for demo)
      if (latitude && longitude) {
      const providers = db.prepare("SELECT id, name, latitude, longitude FROM users WHERE role = 'provider'").all();
      providers.forEach(provider => {
        if (provider.latitude && provider.longitude) {
          const dist = getDistance(latitude, longitude, provider.latitude, provider.longitude);
          if (dist <= 50) {
            const message = `New nearby booking request: ${acres} acres at ${location} (${Math.round(dist)}km away)`;
            db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'new_booking')")
              .run(provider.id, message);
            
            // Real-time notification via Socket.io
            io.to(`user_${provider.id}`).emit("notification", {
              id: Date.now(),
              message,
              type: 'new_booking',
              bookingId
            });
          }
        }
      });
    } else {
      // Fallback: notify all providers if no location
      const providers = db.prepare("SELECT id FROM users WHERE role = 'provider'").all();
      providers.forEach(provider => {
        const message = `New booking request: ${acres} acres at ${location}`;
        db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'new_booking')")
          .run(provider.id, message);
        io.to(`user_${provider.id}`).emit("notification", {
          id: Date.now(),
          message,
          type: 'new_booking',
          bookingId
        });
      });
    }
  }

    res.json({ id: bookingId });
  });

  app.patch("/api/bookings/:id/cancel", (req, res) => {
    const { userId } = req.body;
    try {
      const booking = db.prepare(`
        SELECT b.*, u.name as farmer_name 
        FROM bookings b 
        JOIN users u ON b.farmer_id = u.id 
        WHERE b.id = ?
      `).get(req.params.id);

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      if (booking.farmer_id !== userId) {
        return res.status(403).json({ error: "Unauthorized to cancel this booking" });
      }

      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);

      // Notify provider
      if (booking.provider_id) {
        const msg = `Farmer ${booking.farmer_name} has cancelled their booking for ${booking.acres} acres on ${booking.date}.`;
        db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)")
          .run(booking.provider_id, msg, 'booking_cancelled');
        
        io.to(`user_${booking.provider_id}`).emit('notification', {
          id: Date.now(),
          user_id: booking.provider_id,
          message: msg,
          type: 'booking_cancelled',
          created_at: new Date().toISOString()
        });
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to cancel booking" });
    }
  });

  app.get("/api/bookings", (req, res) => {
    const { role, userId } = req.query;
    let bookings;
    if (role === 'provider') {
      // Providers see all pending bookings or their own accepted ones
      bookings = db.prepare(`
        SELECT b.*, u.name as farmer_name, 
               COALESCE(b.farmer_phone, u.phone) as farmer_phone, 
               COALESCE(b.farmer_address, u.address) as farmer_address,
               u.username as farmer_username 
        FROM bookings b 
        LEFT JOIN users u ON b.farmer_id = u.id
        WHERE b.status = 'pending' OR b.provider_id = ?
        ORDER BY b.id DESC
      `).all(userId);
    } else {
      bookings = db.prepare(`
        SELECT b.*, u.name as provider_name, u.phone as provider_phone, u.username as provider_username
        FROM bookings b
        LEFT JOIN users u ON b.provider_id = u.id
        WHERE b.farmer_id = ? 
        ORDER BY b.id DESC
      `).all(userId);
    }
    res.json(bookings);
  });

  app.patch("/api/bookings/:id", (req, res) => {
    const { status, provider_id, tractor_id, acres, date, location, service_type, rating, feedback } = req.body;
    const sanitizedProviderId = parseInt(provider_id) || null;
    const sanitizedTractorId = parseInt(tractor_id) || null;
    
    if (status) {
      if (status === 'accepted') {
        db.prepare("UPDATE bookings SET status = ?, provider_id = ?, tractor_id = ? WHERE id = ?")
          .run(status, sanitizedProviderId, sanitizedTractorId, req.params.id);
        
        // Notify all providers to refresh their lists
        io.emit("booking_accepted", { bookingId: req.params.id });
      } else {
        db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, req.params.id);
      }
      
      // Notify farmer
      const booking = db.prepare("SELECT farmer_id, service_type, status FROM bookings WHERE id = ?").get(req.params.id);
      if (booking && booking.farmer_id) {
        const message = `Your ${booking.service_type} booking status is now: ${booking.status}`;
        db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'booking_update')")
          .run(booking.farmer_id, message);
        
        io.to(`user_${booking.farmer_id}`).emit("notification", {
          id: Date.now(),
          message,
          type: 'booking_update',
          bookingId: req.params.id
        });
      }
    } else if (rating !== undefined) {
      // Handle rating update
      db.prepare("UPDATE bookings SET rating = ?, feedback = ? WHERE id = ?").run(rating, feedback || null, req.params.id);
      
      // Update provider's overall rating
      const booking = db.prepare("SELECT provider_id FROM bookings WHERE id = ?").get(req.params.id);
      if (booking && booking.provider_id) {
        const avgRating = db.prepare("SELECT AVG(rating) as avg FROM bookings WHERE provider_id = ? AND rating IS NOT NULL").get(booking.provider_id).avg;
        db.prepare("UPDATE users SET rating = ? WHERE id = ?").run(avgRating, booking.provider_id);
      }
    } else {
      // Update other details
      db.prepare(`
        UPDATE bookings 
        SET acres = ?, date = ?, location = ?, service_type = ? 
        WHERE id = ? AND status = 'pending'
      `).run(acres, date, location, service_type, req.params.id);
    }
    
    res.json({ success: true });
  });

  // Tractors
  // Tractors Search
  app.get("/api/tractors/search", (req, res) => {
    const { latitude, longitude, service_type } = req.query;
    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    
    const tractors = db.prepare(`
      SELECT t.*, u.name as owner_name, u.phone as owner_phone, u.rating as owner_rating
      FROM tractors t
      JOIN users u ON t.owner_id = u.id
      WHERE t.status = 'available'
    `).all();
    
    let filteredTractors = tractors;
    
    if (!isNaN(lat) && !isNaN(lng)) {
      filteredTractors = tractors.map((t: any) => {
        if (t.latitude && t.longitude) {
          const dist = getDistance(lat, lng, t.latitude, t.longitude);
          return { ...t, distance: Math.round(dist * 10) / 10 };
        }
        return { ...t, distance: null };
      });
    }
    
    const parsedTractors = filteredTractors.map((t: any) => ({
      ...t,
      maintenance_history: t.maintenance_history ? JSON.parse(t.maintenance_history) : []
    }));
    
    res.json(parsedTractors);
  });

  app.get("/api/tractors", (req, res) => {
    const { providerId } = req.query;
    const tractors = db.prepare("SELECT * FROM tractors WHERE owner_id = ?").all(providerId);
    
    const parsedTractors = tractors.map((t: any) => ({
      ...t,
      maintenance_history: t.maintenance_history ? JSON.parse(t.maintenance_history) : []
    }));
    
    res.json(parsedTractors);
  });

  app.post("/api/tractors", (req, res) => {
    const { 
      owner_id, model, location, latitude, longitude, image_url, description, 
      price_per_acre, price_per_hour, hp, year, fuel_type, last_service, next_service,
      ai_health_score, ai_maintenance_tip, maintenance_history
    } = req.body;
    const sanitizedOwnerId = parseInt(owner_id) || null;
    const info = db.prepare(`
      INSERT INTO tractors (
        owner_id, model, location, latitude, longitude, image_url, description, 
        price_per_acre, price_per_hour, hp, year, fuel_type, last_service, next_service,
        ai_health_score, ai_maintenance_tip, maintenance_history
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sanitizedOwnerId, model, location, latitude || null, longitude || null, image_url || null, description || null, 
      price_per_acre || 0, price_per_hour || 0, hp || 45, year || 2022, fuel_type || 'Diesel', 
      last_service || null, next_service || null, ai_health_score || 95, ai_maintenance_tip || null,
      maintenance_history ? JSON.stringify(maintenance_history) : null
    );
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/tractors/:id", (req, res) => {
    const { 
      model, status, location, image_url, description, price_per_acre, price_per_hour,
      hp, year, fuel_type, last_service, next_service, ai_health_score, ai_maintenance_tip,
      maintenance_history
    } = req.body;
    try {
      const oldTractor = db.prepare("SELECT status, owner_id, model FROM tractors WHERE id = ?").get(req.params.id);
      
      db.prepare(`
        UPDATE tractors 
        SET model = ?, status = ?, location = ?, image_url = ?, description = ?, 
            price_per_acre = ?, price_per_hour = ?, hp = ?, year = ?, fuel_type = ?,
            last_service = ?, next_service = ?, ai_health_score = ?, ai_maintenance_tip = ?,
            maintenance_history = ?
        WHERE id = ?
      `).run(
        model, status, location, image_url || null, description || null, 
        price_per_acre || 0, price_per_hour || 0, hp || 45, year || 2022, fuel_type || 'Diesel',
        last_service || null, next_service || null, ai_health_score || 95, ai_maintenance_tip || null,
        maintenance_history ? JSON.stringify(maintenance_history) : null,
        req.params.id
      );

      if (oldTractor && oldTractor.status !== status) {
        // Notify owner
        io.to(`user_${oldTractor.owner_id}`).emit('tractor_status_update', {
          tractorId: req.params.id,
          model: oldTractor.model,
          newStatus: status
        });

        // Notify farmers with pending bookings for this tractor
        const pendingFarmers = db.prepare(`
          SELECT farmer_id FROM bookings 
          WHERE tractor_id = ? AND status = 'pending'
        `).all(req.params.id);

        pendingFarmers.forEach((f: any) => {
          io.to(`user_${f.farmer_id}`).emit('tractor_status_update', {
            tractorId: req.params.id,
            model: oldTractor.model,
            newStatus: status,
            message: `The tractor for your pending booking (${oldTractor.model}) is now ${status}.`
          });
          
          // Also create a notification in DB
          db.prepare("INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)")
            .run(f.farmer_id, `The tractor for your pending booking (${oldTractor.model}) is now ${status}.`, 'tractor_update');
        });
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to update tractor" });
    }
  });

  app.get("/api/tractors/:id/bookings", (req, res) => {
    const bookings = db.prepare(`
      SELECT b.*, f.name as farmer_name, f.username as farmer_username
      FROM bookings b
      JOIN users f ON b.farmer_id = f.id
      WHERE b.tractor_id = ?
      ORDER BY b.date DESC
    `).all(req.params.id);
    res.json(bookings);
  });

  // Notifications
  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20").all(req.params.userId);
    res.json(notifications);
  });

  app.patch("/api/notifications/:id/read", (req, res) => {
    db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Twilio IVR Webhook - Welcome & Language Selection
  app.post("/api/ivr/webhook", (req, res) => {
    const twiml = new VoiceResponse();
    const gather = twiml.gather({
      numDigits: 1,
      action: "/api/ivr/main-menu",
      method: "POST",
      timeout: 5,
    });
    
    const farmerCount = 1240;
    const providerCount = 86;
    const availableInRadius = db.prepare("SELECT COUNT(*) as count FROM tractors WHERE status = 'available'").get().count;

    gather.say(`Welcome to TRACTO FARM SERVICES. We have ${farmerCount} farmers and ${providerCount} service providers in our network. Currently, ${availableInRadius} vehicles are available within a 20 kilometer radius. For English, press 1. Hindi ke liye 2 dabaye. Telugu kosam 3 nokkandi. Für Deutsch drücken Sie die 4. Para español, presione 5.`);
    
    twiml.say("We didn't receive any input. Goodbye.");
    res.type("text/xml");
    res.send(twiml.toString());
  });

  // Main Menu
  app.post("/api/ivr/main-menu", (req, res) => {
    const twiml = new VoiceResponse();
    const digit = req.body.Digits;
    const lang = digit === '2' ? 'hi-IN' : digit === '3' ? 'te-IN' : digit === '4' ? 'de-DE' : digit === '5' ? 'es-ES' : 'en-IN';
    
    const gather = twiml.gather({
      numDigits: 1,
      action: `/api/ivr/process-menu?lang=${lang}`,
      method: "POST",
      timeout: 5,
    });

    if (lang === 'hi-IN') {
      gather.say("Booking ke liye 1 dabaye. Booking status confirm karne ke liye 2 dabaye. Sahayata ke liye 3 dabaye.");
    } else if (lang === 'te-IN') {
      gather.say("Booking kosam 1 nokkandi. Booking status confirm cheyadaniki 2 nokkandi. Sahayam kosam 3 nokkandi.");
    } else if (lang === 'de-DE') {
      gather.say("Drücken Sie 1 für Buchungen. Drücken Sie 2 für den Status. Drücken Sie 3 für Support.");
    } else if (lang === 'es-ES') {
      gather.say("Presione 1 para reservas. Presione 2 para el estado. Presione 3 para soporte.");
    } else {
      gather.say("To book a service, press 1. To confirm or check booking status, press 2. For support, press 3.");
    }

    twiml.say("Goodbye.");
    res.type("text/xml");
    res.send(twiml.toString());
  });

  // Process Menu Selection
  app.post("/api/ivr/process-menu", (req, res) => {
    const twiml = new VoiceResponse();
    const digit = req.body.Digits;
    const lang = req.query.lang as string || 'en-IN';

    if (digit === '1') {
      // List Machinery
      const tractors = db.prepare("SELECT model, price_per_acre FROM tractors WHERE status = 'available' LIMIT 3").all();
      if (tractors.length > 0) {
        let msg = lang === 'hi-IN' ? "Hamare paas ye tractors uplabdha hain: " : 
                  lang === 'te-IN' ? "Maku ee tractor lu unnayi: " : 
                  lang === 'de-DE' ? "Wir haben folgende Traktoren verfügbar: " :
                  lang === 'es-ES' ? "Tenemos los siguientes tractores disponibles: " :
                  "We have the following tractors available: ";
        
        tractors.forEach((t: any) => {
          msg += `${t.model}, ${t.price_per_acre} ${lang === 'de-DE' ? 'Euro' : lang === 'es-ES' ? 'Euros' : 'rupees'} per acre. `;
        });
        twiml.say(msg);
      } else {
        twiml.say(lang === 'hi-IN' ? "Abhi koi tractor uplabdha nahi hai." : 
                  lang === 'te-IN' ? "Ippudu tractor lu emi levu." : 
                  lang === 'de-DE' ? "Derzeit sind keine Traktoren verfügbar." :
                  lang === 'es-ES' ? "No hay tractores disponibles en este momento." :
                  "No tractors are currently available.");
      }
      twiml.redirect(`/api/ivr/main-menu?Digits=${lang === 'hi-IN' ? '2' : lang === 'te-IN' ? '3' : lang === 'de-DE' ? '4' : lang === 'es-ES' ? '5' : '1'}`);
    } else if (digit === '2') {
      // Booking Flow
      const gather = twiml.gather({
        numDigits: 2,
        action: `/api/ivr/book-acres?lang=${lang}`,
        method: "POST",
        timeout: 10,
      });
      
      gather.say(lang === 'hi-IN' ? "Kitne acres ke liye booking karni hai? Keypad par acres darj karein." : 
                lang === 'te-IN' ? "Enni acres booking cheyali? Keypad meeda acres nokkandi." : 
                lang === 'de-DE' ? "Wie viele Hektar möchten Sie buchen? Bitte geben Sie die Anzahl auf Ihrer Tastatur ein." :
                lang === 'es-ES' ? "¿Cuántos acres desea reservar? Ingrese el número en su teclado." :
                "How many acres do you want to book? Please enter the number of acres on your keypad.");
    } else {
      twiml.say(lang === 'hi-IN' ? "Hamara pratinidhi jald hi aapse sampark karega." : 
                lang === 'te-IN' ? "Ma pratinidhi mimalni twaralo kalustaru." : 
                lang === 'de-DE' ? "Unser Vertreter wird Sie in Kürze kontaktieren." :
                lang === 'es-ES' ? "Nuestro representante se pondrá en contacto con usted en breve." :
                "Our representative will contact you shortly.");
      twiml.hangup();
    }

    res.type("text/xml");
    res.send(twiml.toString());
  });

  // Handle Acres Input & Create Booking
  app.post("/api/ivr/book-acres", (req, res) => {
    const twiml = new VoiceResponse();
    const acres = req.body.Digits;
    const lang = req.query.lang as string || 'en-IN';
    const fromNumber = req.body.From;

    if (acres) {
      // Find user by phone
      const user = db.prepare("SELECT id FROM users WHERE phone = ?").get(fromNumber);
      const farmerId = user ? user.id : null;

      if (!farmerId) {
        twiml.say(lang === 'hi-IN' ? "Maaf kijiye, hum aapka account nahi dhoondh paaye. Kripya app par register karein." :
                  lang === 'te-IN' ? "Kshaminchandi, memu mee khatanu kanugonalekapoyamu. Dayachesi app lo register avvandi." :
                  "Sorry, we couldn't find your account. Please register on the app first.");
        twiml.hangup();
        return res.type("text/xml").send(twiml.toString());
      }

      db.prepare("INSERT INTO bookings (farmer_id, acres, date, location, service_type, status) VALUES (?, ?, ?, ?, ?, ?)")
        .run(farmerId, acres, new Date().toISOString().split('T')[0], "Voice Booking", "Plowing", "pending");

      twiml.say(lang === 'hi-IN' ? `Dhanyawad. Aapki ${acres} acres ki booking pending hai. Hum jald hi sampark karenge.` : 
                lang === 'te-IN' ? `Dhunyavadalu. Mee ${acres} acres booking pending lo undi. Memu twaralo kalustamu.` : 
                lang === 'de-DE' ? `Vielen Dank. Ihre Buchung für ${acres} Hektar steht noch aus. Wir werden uns in Kürze bei Ihnen melden.` :
                lang === 'es-ES' ? `Gracias. Su reserva de ${acres} acres está pendiente. Nos pondremos en contacto pronto.` :
                `Thank you. Your booking for ${acres} acres is now pending. We will contact you soon.`);
    } else {
      twiml.say("Invalid input.");
    }
    
    twiml.hangup();
    res.type("text/xml");
    res.send(twiml.toString());
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log('Vite middleware initialized.');
  } else {
    console.log('Serving static files from dist...');
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server startup failed:', err);
  process.exit(1);
});
