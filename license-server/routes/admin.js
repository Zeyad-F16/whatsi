const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_me';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

// ── Middleware: Verify admin JWT ──────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'غير مصرح' });
  }
  try {
    const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'الجلسة منتهية أو غير صالحة' });
  }
}

// ── Generate a readable activation code ──────────────
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code; // Format: XXXX-XXXX-XXXX-XXXX
}

// ── Calculate expiry date from plan ─────────────────
function calcExpiry(startDate, planType) {
  const d = new Date(startDate);
  if (planType === 'yearly') {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }
  const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ success: true, token });
});

// ─────────────────────────────────────────────────────
// GET /api/admin/clients  - list all clients
// ─────────────────────────────────────────────────────
router.get('/clients', requireAuth, (req, res) => {
  const clients = db.prepare(`
    SELECT 
      id, name, phone, plan_type, amount_paid,
      activation_code, code_used, machine_id,
      start_date, expiry_date, is_active, notes, created_at,
      CASE WHEN date('now') > expiry_date THEN 1 ELSE 0 END AS is_expired,
      CAST((julianday(expiry_date) - julianday('now')) AS INTEGER) AS days_remaining
    FROM clients
    ORDER BY created_at DESC
  `).all();
  res.json({ success: true, data: clients });
});

// ─────────────────────────────────────────────────────
// GET /api/admin/clients/:id - get one client
// ─────────────────────────────────────────────────────
router.get('/clients/:id', requireAuth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: 'العميل غير موجود' });
  res.json({ success: true, data: client });
});

// ─────────────────────────────────────────────────────
// POST /api/admin/clients  - add new client
// ─────────────────────────────────────────────────────
router.post('/clients', requireAuth, (req, res) => {
  const { name, phone, plan_type, amount_paid, start_date, notes } = req.body;

  if (!name || !plan_type || !start_date) {
    return res.status(400).json({ success: false, message: 'الاسم ونوع الاشتراك وتاريخ البداية مطلوبة' });
  }
  if (!['monthly', 'yearly'].includes(plan_type)) {
    return res.status(400).json({ success: false, message: 'نوع الاشتراك يجب أن يكون monthly أو yearly' });
  }

  const activation_code = generateCode();
  const expiry_date = calcExpiry(start_date, plan_type);

  const result = db.prepare(`
    INSERT INTO clients (name, phone, plan_type, amount_paid, activation_code, start_date, expiry_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, phone || null, plan_type, amount_paid || 0, activation_code, start_date, expiry_date, notes || null);

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: client, message: 'تم إضافة العميل بنجاح' });
});

// ─────────────────────────────────────────────────────
// PUT /api/admin/clients/:id  - update client
// ─────────────────────────────────────────────────────
router.put('/clients/:id', requireAuth, (req, res) => {
  const { name, phone, plan_type, amount_paid, start_date, expiry_date, is_active, notes } = req.body;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

  const newName        = name        ?? client.name;
  const newPhone       = phone       ?? client.phone;
  const newPlanType    = plan_type   ?? client.plan_type;
  const newAmount      = amount_paid ?? client.amount_paid;
  const newStart       = start_date  ?? client.start_date;
  const newNotes       = notes       ?? client.notes;
  const newIsActive    = is_active   !== undefined ? (is_active ? 1 : 0) : client.is_active;
  // Recalculate expiry if plan or start changed, or use provided value
  const newExpiry = expiry_date
    ? expiry_date
    : (plan_type || start_date ? calcExpiry(newStart, newPlanType) : client.expiry_date);

  db.prepare(`
    UPDATE clients SET name=?, phone=?, plan_type=?, amount_paid=?, start_date=?, expiry_date=?, is_active=?, notes=?
    WHERE id=?
  `).run(newName, newPhone, newPlanType, newAmount, newStart, newExpiry, newIsActive, newNotes, req.params.id);

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated, message: 'تم تحديث بيانات العميل' });
});

// ─────────────────────────────────────────────────────
// DELETE /api/admin/clients/:id  - delete client
// ─────────────────────────────────────────────────────
router.delete('/clients/:id', requireAuth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

  db.prepare('DELETE FROM license_logs WHERE client_id = ?').run(req.params.id);
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'تم حذف العميل بنجاح' });
});

// ─────────────────────────────────────────────────────
// POST /api/admin/clients/:id/regenerate-code
// Generate a new activation code (resets machine binding)
// ─────────────────────────────────────────────────────
router.post('/clients/:id/regenerate-code', requireAuth, (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

  const newCode = generateCode();
  db.prepare('UPDATE clients SET activation_code=?, code_used=0, machine_id=NULL WHERE id=?')
    .run(newCode, req.params.id);

  db.prepare(`INSERT INTO license_logs (client_id, action, details) VALUES (?, ?, ?)`)
    .run(client.id, 'CODE_REGENERATED', `New code generated by admin`);

  res.json({ success: true, activation_code: newCode, message: 'تم إنشاء كود تفعيل جديد' });
});

// ─────────────────────────────────────────────────────
// GET /api/admin/stats  - dashboard stats
// ─────────────────────────────────────────────────────
router.get('/stats', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
  const active = db.prepare("SELECT COUNT(*) as count FROM clients WHERE is_active=1 AND date('now') <= expiry_date").get().count;
  const expired = db.prepare("SELECT COUNT(*) as count FROM clients WHERE date('now') > expiry_date").get().count;
  const expiringSoon = db.prepare("SELECT COUNT(*) as count FROM clients WHERE is_active=1 AND julianday(expiry_date) - julianday('now') BETWEEN 0 AND 7").get().count;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM clients').get().total;
  const recentLogs = db.prepare(`
    SELECT l.*, c.name as client_name 
    FROM license_logs l 
    LEFT JOIN clients c ON l.client_id = c.id 
    ORDER BY l.created_at DESC LIMIT 10
  `).all();

  res.json({
    success: true,
    data: { total, active, expired, expiring_soon: expiringSoon, total_revenue: totalRevenue, recent_logs: recentLogs }
  });
});

// ─────────────────────────────────────────────────────
// GET /api/admin/clients/:id/logs  - client activity logs
// ─────────────────────────────────────────────────────
router.get('/clients/:id/logs', requireAuth, (req, res) => {
  const logs = db.prepare('SELECT * FROM license_logs WHERE client_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
  res.json({ success: true, data: logs });
});

module.exports = router;
