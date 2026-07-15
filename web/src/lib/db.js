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
  CREATE TABLE IF NOT EXISTS clients (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
