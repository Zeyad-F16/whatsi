require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: '*', // Tighten this in production if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

// Rate limiting for license API (protect from brute force)
const licenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'طلبات كثيرة جداً، يرجى الانتظار' }
});

// Rate limiting for admin login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'محاولات دخول كثيرة، يرجى الانتظار 15 دقيقة' }
});

// ── Serve Admin Panel (static files) ─────────────────
app.use('/admin', express.static(path.join(__dirname, 'admin-panel')));

// ── API Routes ────────────────────────────────────────
const licenseRoutes = require('./routes/license');
const adminRoutes   = require('./routes/admin');

app.use('/api/license', licenseLimiter, licenseRoutes);
app.use('/api/admin/login', loginLimiter);
app.use('/api/admin', adminRoutes);

// ── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'المسار غير موجود' });
});

// ── Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'خطأ في الخادم' });
});

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Whatsi License Server running on port ${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 License API: http://localhost:${PORT}/api/license`);
});
