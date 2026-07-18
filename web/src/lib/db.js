import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define the DB path inside the web/data directory for persistence
const dbPath = path.resolve(process.cwd(), 'data', 'license.db');

// Ensure the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize the database
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL,
    email             TEXT UNIQUE NOT NULL,
    phone             TEXT,
    password_hash     TEXT,
    is_verified       INTEGER NOT NULL DEFAULT 0,
    verification_code TEXT,
    google_id         TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    phone           TEXT,
    plan_type       TEXT NOT NULL CHECK(plan_type IN ('monthly', 'yearly')),
    amount_paid     REAL NOT NULL DEFAULT 0,
    activation_code TEXT UNIQUE NOT NULL,
    code_used       INTEGER NOT NULL DEFAULT 0,
    machine_id      TEXT,
    start_date      TEXT NOT NULL,
    expiry_date     TEXT NOT NULL,
    is_active       INTEGER NOT NULL DEFAULT 1,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  -- Handle migrating existing clients if they don't have user_id
  -- SQLite does not support ADD COLUMN IF NOT EXISTS easily without PRAGMA,
  -- but since better-sqlite3 throws if column exists on ALTER TABLE, we will handle it via JS below.

  CREATE TABLE IF NOT EXISTS admin_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS license_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    action     TEXT NOT NULL,
    machine_id TEXT,
    ip_address TEXT,
    details    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// Migration: add user_id to clients if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(clients)").all();
  const hasUserId = tableInfo.some(column => column.name === 'user_id');
  if (!hasUserId) {
    db.exec('ALTER TABLE clients ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL');
  }
} catch (err) {
  console.error("Migration error:", err);
}

// Migration: add phone to users if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasPhone = tableInfo.some(column => column.name === 'phone');
  if (!hasPhone) {
    db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
  }

  // Security Migrations: Account Lockout
  const hasFailedAttempts = tableInfo.some(column => column.name === 'failed_login_attempts');
  if (!hasFailedAttempts) {
    db.exec('ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0');
  }

  const hasLockedUntil = tableInfo.some(column => column.name === 'locked_until');
  if (!hasLockedUntil) {
    db.exec('ALTER TABLE users ADD COLUMN locked_until TEXT');
  }
} catch (err) {
  console.error("Migration error (users columns):", err);
}

// Seed admin if empty
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get().count;
if (adminCount === 0) {
  const initialUsername = process.env.ADMIN_USERNAME;
  const initialPassword = process.env.ADMIN_PASSWORD;

  if (!initialUsername || (!process.env.ADMIN_PASSWORD_HASH && !initialPassword)) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD must be defined in the .env file to initialize the database!");
  }

  const bcrypt = require('bcryptjs');
  const initialPasswordHash = process.env.ADMIN_PASSWORD_HASH 
    ? process.env.ADMIN_PASSWORD_HASH 
    : bcrypt.hashSync(initialPassword, 10);
  db.prepare('INSERT INTO admins (username, password_hash, role) VALUES (?, ?, ?)')
    .run(initialUsername, initialPasswordHash, 'super_admin');
}

export default db;
