const express = require('express');
const router = express.Router();
const db = require('../database');

// ─────────────────────────────────────────────
// POST /api/license/activate
// Called by the desktop app on first launch
// ─────────────────────────────────────────────
router.post('/activate', (req, res) => {
  const { activation_code, machine_id } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!activation_code || !machine_id) {
    return res.status(400).json({ success: false, message: 'كود التفعيل ومعرف الجهاز مطلوبان' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE activation_code = ?').get(activation_code);

  if (!client) {
    db.prepare(`INSERT INTO license_logs (action, machine_id, ip_address, details) VALUES (?, ?, ?, ?)`)
      .run('ACTIVATE_FAILED_INVALID_CODE', machine_id, ip, `Code: ${activation_code}`);
    return res.status(404).json({ success: false, message: 'كود التفعيل غير صحيح' });
  }

  if (client.code_used) {
    db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address, details) VALUES (?, ?, ?, ?, ?)`)
      .run(client.id, 'ACTIVATE_FAILED_CODE_USED', machine_id, ip, 'Code already used');
    return res.status(409).json({ success: false, message: 'كود التفعيل مستخدم مسبقاً' });
  }

  if (!client.is_active) {
    return res.status(403).json({ success: false, message: 'هذا الحساب معطل. يرجى التواصل مع الدعم' });
  }

  const now = new Date().toISOString().split('T')[0];
  if (now > client.expiry_date) {
    return res.status(403).json({ success: false, message: 'انتهت صلاحية هذا الترخيص. يرجى التجديد' });
  }

  // Mark code as used and bind machine_id
  db.prepare('UPDATE clients SET code_used = 1, machine_id = ? WHERE id = ?')
    .run(machine_id, client.id);

  db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address, details) VALUES (?, ?, ?, ?, ?)`)
    .run(client.id, 'ACTIVATED', machine_id, ip, `Client: ${client.name}`);

  return res.json({
    success: true,
    message: 'تم تفعيل التطبيق بنجاح',
    license: {
      client_name: client.name,
      plan_type: client.plan_type,
      expiry_date: client.expiry_date,
    }
  });
});

// ─────────────────────────────────────────────
// POST /api/license/verify
// Called by the desktop app on every launch
// ─────────────────────────────────────────────
router.post('/verify', (req, res) => {
  const { machine_id } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  if (!machine_id) {
    return res.status(400).json({ success: false, message: 'معرف الجهاز مطلوب' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE machine_id = ?').get(machine_id);

  if (!client) {
    return res.status(404).json({ success: false, message: 'هذا الجهاز غير مسجل. يرجى التفعيل أولاً', needs_activation: true });
  }

  if (!client.is_active) {
    return res.status(403).json({ success: false, message: 'هذا الحساب معطل. يرجى التواصل مع الدعم' });
  }

  const now = new Date().toISOString().split('T')[0];
  if (now > client.expiry_date) {
    db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address) VALUES (?, ?, ?, ?)`)
      .run(client.id, 'VERIFY_EXPIRED', machine_id, ip);
    return res.status(403).json({
      success: false,
      expired: true,
      message: 'انتهت صلاحية اشتراكك. يرجى التجديد للاستمرار',
      expiry_date: client.expiry_date,
      client_name: client.name
    });
  }

  // Calculate days remaining
  const expiryMs = new Date(client.expiry_date).getTime();
  const nowMs = new Date(now).getTime();
  const daysRemaining = Math.ceil((expiryMs - nowMs) / (1000 * 60 * 60 * 24));

  db.prepare(`INSERT INTO license_logs (client_id, action, machine_id, ip_address) VALUES (?, ?, ?, ?)`)
    .run(client.id, 'VERIFY_OK', machine_id, ip);

  return res.json({
    success: true,
    message: 'الترخيص صالح',
    license: {
      client_name: client.name,
      plan_type: client.plan_type,
      expiry_date: client.expiry_date,
      days_remaining: daysRemaining
    }
  });
});

module.exports = router;
