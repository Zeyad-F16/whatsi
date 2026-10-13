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
const HOST = process.env.DASHBOARD_HOST || process.env.HOST || '0.0.0.0';

// دعم الـ Reverse Proxy (مثل Nginx عند تشغيل النطاق whatsi.khatwa-study.com)
app.set('trust proxy', true);

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

// 11. جلب قائمة محادثات واتساب الحية (Live WhatsApp Chats)
app.get('/api/chats', async (req, res) => {
  try {
    const { accountId, search, limit, offset } = req.query;
    const chats = await reportService.getChatsList({ accountId, search, limit, offset });
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.1. جلب عدادات المحادثات غير المقروءة الشاملة لكل الحسابات بدقة تامة
app.get('/api/unread-counts', async (req, res) => {
  try {
    const data = await reportService.getUnreadCounts();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. جلب رسائل وصوتيات محادثة معينة مرتبة زمنياً (مع دعم زر تحميل الرسائل الأقدم)
app.get('/api/chat-messages', async (req, res) => {
  try {
    const { chatId, accountId, limit, beforeTimestamp, beforeId } = req.query;
    if (!chatId) return res.status(400).json({ success: false, error: 'chatId مطلوب' });
    const result = await reportService.getChatMessages({ chatId, accountId, limit, beforeTimestamp, beforeId });
    const messages = Array.isArray(result) ? result : (result?.messages || []);
    const hasMore = Boolean(result.hasMore);
    res.json({ success: true, messages, hasMore });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.1. جلب بريف الطالب وملف العميل الدائم (Customer Profile Dossier)
app.get('/api/customer-brief', async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ success: false, error: 'chatId مطلوب' });
    const profile = await reportService.getCustomerBrief(chatId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.2. توليد أو تحديث بريف الطالب عبر الذكاء الاصطناعي عند الطلب
app.post('/api/customer-brief', async (req, res) => {
  try {
    const { chatId, accountId, force } = req.body;
    if (!chatId) return res.status(400).json({ success: false, error: 'chatId مطلوب' });
    const result = await reportService.generateOrUpdateCustomerBrief({ chatId, accountId, force: Boolean(force) });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12.3. تشغيل التحديث اليومي الشامل لملخصات العملاء
app.post('/api/daily-briefs-sync', async (req, res) => {
  try {
    const { date } = req.body;
    const result = await reportService.runDailyBriefsUpdate(date);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. قناة البث اللحظي للرسائل الجديدة عبر Server-Sent Events (SSE)
const sseClients = new Set();

app.get('/api/live-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // إيقاف الـ buffering في Nginx
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// خدمة بث التحديثات اللحظية
let lastKnownMsgId = 0;
let lastKnownAudioId = 0;
let lastKnownSeenTime = new Date().toISOString();

async function startRealtimeLiveTracker() {
  try {
    const initial = await reportService.getLatestMessageIds();
    lastKnownMsgId = initial.lastMsgId;
    lastKnownAudioId = initial.lastAudioId;
  } catch (e) {
    console.error('[LiveStream] Tracker init error:', e.message);
  }

  setInterval(async () => {
    if (sseClients.size === 0) return;
    try {
      const { items, maxMsgId, maxAudioId } = await reportService.getNewMessagesSince(lastKnownMsgId, lastKnownAudioId);
      lastKnownMsgId = maxMsgId;
      lastKnownAudioId = maxAudioId;

      if (items.length > 0) {
        const payload = `data: ${JSON.stringify({ type: 'new_events', events: items })}\n\n`;
        for (const client of sseClients) {
          try {
            client.write(payload);
          } catch (e) {
            sseClients.delete(client);
          }
        }
      }

      // التحقق من تحديثات قراءة السيلز للمحادثات (Seen Events)
      const seenUpdates = await reportService.getRecentSalesSeenUpdates(lastKnownSeenTime);
      if (seenUpdates && seenUpdates.length > 0) {
        lastKnownSeenTime = seenUpdates[seenUpdates.length - 1].seenAt;
        const payload = `data: ${JSON.stringify({ type: 'batch_unread_updated', updates: seenUpdates })}\n\n`;
        for (const client of sseClients) {
          try {
            client.write(payload);
          } catch (e) {
            sseClients.delete(client);
          }
        }
      }
    } catch (err) {
      // quiet poll handler
    }
  }, 1500);
}

// تشغيل التحديث التلقائي اليومي لملخصات الطلاب في نهاية كل يوم (بتوقيت القاهرة)
let lastBriefRunDate = '';
function scheduleDailyBriefsRunner() {
  setInterval(async () => {
    try {
      const nowCairo = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
      const hours = nowCairo.getHours();
      const minutes = nowCairo.getMinutes();
      const todayStr = `${nowCairo.getFullYear()}-${String(nowCairo.getMonth() + 1).padStart(2, '0')}-${String(nowCairo.getDate()).padStart(2, '0')}`;

      // يتم التشغيل تلقائياً في نهاية اليوم بين 23:50 و 23:59
      if (hours === 23 && minutes >= 50 && lastBriefRunDate !== todayStr) {
        lastBriefRunDate = todayStr;
        console.log(`[Scheduler] تشغيل التحديث التلقائي اليومي لبريفات الطلاب: ${todayStr}`);
        await reportService.runDailyBriefsUpdate(todayStr);
      }
    } catch (e) {
      console.error('[Scheduler] خطأ في مجدول بريفات الطلاب:', e.message);
    }
  }, 10 * 60 * 1000); // كل 10 دقائق
}

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
  startRealtimeLiveTracker();
  scheduleDailyBriefsRunner();
  app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`🚀 [Whatsi Dashboard] Web Server running at:`);
    console.log(`   http://${HOST === '0.0.0.0' ? '127.0.0.1' : HOST}:${PORT}`);
    console.log(`   Retention Days: ${reportService.DATA_RETENTION_DAYS} days`);
    console.log(`   Realtime SSE Stream: /api/live-stream active`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database / report service:', err);
  process.exit(1);
});
