const Database = require('better-sqlite3');

try {
  const oldDb = new Database('../license-server/license.db', { readonly: true });
  const newDb = new Database('./data/license.db');

  const clients = oldDb.prepare('SELECT * FROM clients').all();
  const logs = oldDb.prepare('SELECT * FROM license_logs').all();
  const sessions = oldDb.prepare('SELECT * FROM admin_sessions').all();

  const insertClient = newDb.prepare(`
    INSERT OR IGNORE INTO clients (id, name, phone, plan_type, amount_paid, activation_code, code_used, machine_id, start_date, expiry_date, is_active, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertLog = newDb.prepare(`
    INSERT OR IGNORE INTO license_logs (id, client_id, action, machine_id, ip_address, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSession = newDb.prepare(`
    INSERT OR IGNORE INTO admin_sessions (id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `);

  newDb.transaction(() => {
    for (const c of clients) {
      insertClient.run(c.id, c.name, c.phone, c.plan_type, c.amount_paid, c.activation_code, c.code_used, c.machine_id, c.start_date, c.expiry_date, c.is_active, c.notes, c.created_at);
    }
    for (const l of logs) {
      insertLog.run(l.id, l.client_id, l.action, l.machine_id, l.ip_address, l.details, l.created_at);
    }
    for (const s of sessions) {
      insertSession.run(s.id, s.token_hash, s.created_at, s.expires_at);
    }
  })();

  console.log('Migration complete. Inserted', clients.length, 'clients and', logs.length, 'logs.');
} catch (err) {
  console.error('Migration failed:', err);
}
