/**
 * server.js
 * خادم الويب المستقل (Web Dashboard Server) لتطبيق Whatsi Z-ray.
 * يتيح لعدة مديرين ومسؤولين فتح لوحة التحكم والتقارير عبر المتصفح بشكل مستقل
 * دون الحاجة لفتح VNC وبدون أي تداخل بين الجلسات.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة من .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const reportService = require('./report-service');
const db = require('./database');

const app = express();
const PORT = Number(process.env.DASHBOARD_PORT || process.env.PORT || 3050);
const HOST = process.env.DASHBOARD_HOST || '0.0.0.0';

// معالجة JSON والطلبات
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// حماية بسيطة وترويسات الـ CORS
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// خدمة ملفات الواجهة من مجلد public
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// ===== API ROUTES =====

// 1. فحص صحة الخادم
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Whatsi Z-ray Web Dashboard',
    retentionDays: reportService.DATA_RETENTION_DAYS,
    time: new Date().toISOString()
  });
});

// 2. جلب الحسابات المسجلة ومواعيد عمل كل موظف
app.get('/api/accounts', async (req, res) => {
  try {
    const accounts = await reportService.loadAccounts();
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. حفظ الحسابات ومواعيد العمل المخصصة
app.post('/api/accounts', async (req, res) => {
  try {
    const { accounts } = req.body;
    if (!Array.isArray(accounts)) {
      return res.status(400).json({ success: false, error: 'قائمة الحسابات غير صالحة' });
    }
    const result = await reportService.saveAccounts(accounts);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. جلب الإعدادات (الأرقام المستبعدة)
app.get('/api/settings', (req, res) => {
  try {
    const settings = reportService.loadSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. حفظ الإعدادات (الأرقام المستبعدة)
app.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    const result = reportService.saveSettings(settings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. جلب إحصائيات المبيعات الحية
app.get('/api/stats', async (req, res) => {
  try {
    const { accountId, date, period } = req.query;
    const stats = await reportService.getTodayStats(date || null, accountId || null, period || 'today');
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. جلب التقييم الشهري التاريخي
app.get('/api/monthly-scores', async (req, res) => {
  try {
    const { month, accountId } = req.query;
    const cairoMonth = month || db.getLocalDateString().slice(0, 7);
    const scores = await reportService.getMonthlySalesScores(cairoMonth, accountId || null);
    res.json({ success: true, scores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. توليد واستخراج التقرير الشامل بواسطة Gemini
app.post('/api/generate-report', async (req, res) => {
  try {
    const { accountId, period, allowEmpty } = req.body;
    const report = await reportService.generateDailyReport({
      accountId: accountId || null,
      period: period || 'today',
      allowEmpty: Boolean(allowEmpty)
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. عرض الرسائل المسجلة في قاعدة البيانات (معاينة)
app.get('/api/messages-preview', async (req, res) => {
  try {
    const { accountId, period } = req.query;
    const messages = await reportService.getTodayMessagesPreview(accountId || null, period || 'today');
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. فحص اتصال Gemini API
app.get('/api/test-gemini', async (req, res) => {
  try {
    const result = await reportService.testGeminiConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback للصفحة الرئيسية
app.use((req, res) => {
  const indexHtml = path.join(publicDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send('Whatsi Z-ray Web Dashboard is initializing...');
  }
});

// بدء تشغيل الخادم
reportService.initialize().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`🚀 [Whatsi Dashboard] Web Server running at:`);
    console.log(`   http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
    console.log(`   Retention Days: ${reportService.DATA_RETENTION_DAYS} days`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database / report service:', err);
  process.exit(1);
});
