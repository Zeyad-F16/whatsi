/**
 * server.js
 * خادم الويب المستقل (Web Dashboard Server) لتطبيق Whatsi Z-ray.
 * يتيح لعدة مديرين ومسؤولين فتح لوحة التحكم والتقارير عبر المتصفح بشكل مستقل
 * مع نظام صلاحيات وأدوار متقدم:
 * 1. عضو مجلس إدارة (BOARD_MEMBER): وصول شامل للمستخدمين وكافة التقارير وخطوط المبيعات
 * 2. مدير مبيعات ومراقب جودة (SALES_MANAGER_QC): مخصص لحسابات محددة أو الكل حسب الإذن
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة من .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

const reportService = require('./report-service');
const authService = require('./auth-service');
const db = require('./database');

const app = express();
const PORT = Number(process.env.DASHBOARD_PORT || process.env.PORT || 3050);
const HOST = process.env.DASHBOARD_HOST || process.env.HOST || '0.0.0.0';

// دعم الـ Reverse Proxy (مثل Nginx عند تشغيل النطاق whatsi.khatwa-study.com)
app.set('trust proxy', true);

// معالجة JSON والطلبات
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// حماية وترويسات الـ CORS
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

// ===== AUTHENTICATION MIDDLEWARES =====

async function authenticateRequest(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (req.query && req.query.token) {
      token = String(req.query.token).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول أولاً للوصول إلى لوحة التحكم',
        code: 'UNAUTHORIZED'
      });
    }

    const user = await authService.getUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: 'خطأ في التحقق من المستخدم: ' + err.message });
  }
}

function requireBoardMember(req, res, next) {
  if (!req.user || !req.user.isBoardMember) {
    return res.status(403).json({
      success: false,
      error: 'هذا الإجراء مخصص فقط لأعضاء مجلس الإدارة',
      code: 'FORBIDDEN'
    });
  }
  next();
}

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

// ===== 2. AUTH & USER MANAGEMENT ROUTES =====

// 2.1. تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// 2.2. التحقق من المستخدم الحالي (من التوكن)
app.get('/api/auth/me', authenticateRequest, (req, res) => {
  res.json({ success: true, user: req.user });
});

// 2.3. تسجيل الخروج
app.post('/api/auth/logout', authenticateRequest, async (req, res) => {
  try {
    await authService.logout(req.token);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.4. جلب جميع المستخدمين (خاص بمجلس الإدارة فقط)
app.get('/api/users', authenticateRequest, requireBoardMember, async (req, res) => {
  try {
    const users = await authService.listUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.5. إضافة مستخدم جديد (خاص بمجلس الإدارة فقط)
app.post('/api/users', authenticateRequest, requireBoardMember, async (req, res) => {
  try {
    const { username, password, name, role, allAccounts, allowedAccounts } = req.body;
    const user = await authService.createUser({
      username,
      password,
      name,
      role,
      allAccounts,
      allowedAccounts
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2.6. تعديل مستخدم (خاص بمجلس الإدارة فقط)
app.put('/api/users/:id', authenticateRequest, requireBoardMember, async (req, res) => {
  try {
    const { password, name, role, allAccounts, allowedAccounts } = req.body;
    const user = await authService.updateUser(req.params.id, {
      password,
      name,
      role,
      allAccounts,
      allowedAccounts
    });
    res.json({ success: true, user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2.7. حذف مستخدم (خاص بمجلس الإدارة فقط)
app.delete('/api/users/:id', authenticateRequest, requireBoardMember, async (req, res) => {
  try {
    const result = await authService.deleteUser(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ===== 3. DASHBOARD & DATA ROUTES =====

// 3.1. جلب الحسابات المسجلة ومواعيد عمل كل موظف (مفلترة حسب صلاحيات المستخدم)
app.get('/api/accounts', authenticateRequest, async (req, res) => {
  try {
    const allAccounts = await reportService.loadAccounts();
    const accounts = authService.filterAccountsForUser(req.user, allAccounts);
    res.json({
      success: true,
      accounts,
      allAvailableAccounts: req.user.isBoardMember ? allAccounts : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.2. حفظ الحسابات ومواعيد العمل المخصصة (مجلس الإدارة فقط)
app.post('/api/accounts', authenticateRequest, requireBoardMember, async (req, res) => {
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

// 3.3. جلب الإعدادات (الأرقام المستبعدة - مجلس الإدارة فقط)
app.get('/api/settings', authenticateRequest, requireBoardMember, (req, res) => {
  try {
    const settings = reportService.loadSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.4. حفظ الإعدادات (الأرقام المستبعدة - مجلس الإدارة فقط)
app.post('/api/settings', authenticateRequest, requireBoardMember, (req, res) => {
  try {
    const settings = req.body;
    const result = reportService.saveSettings(settings);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.5. جلب إحصائيات المبيعات الحية (مفلترة تلقائياً بحسابات المستخدم)
app.get('/api/stats', authenticateRequest, async (req, res) => {
  try {
    const { accountId, date, period } = req.query;
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    const stats = await reportService.getTodayStats(date || null, accountId || null, period || 'today', allowedAccounts);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.6. جلب التقييم الشهري التاريخي
app.get('/api/monthly-scores', authenticateRequest, async (req, res) => {
  try {
    const { month, accountId } = req.query;
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    if (allowedAccounts && allowedAccounts.length === 0) {
      return res.json({ success: true, scores: [] });
    }
    if (accountId && allowedAccounts && !allowedAccounts.includes(String(accountId))) {
      return res.json({ success: true, scores: [] });
    }
    const cairoMonth = month || db.getLocalDateString().slice(0, 7);
    let scores = await reportService.getMonthlySalesScores(cairoMonth, accountId || null);
    if (allowedAccounts && !accountId) {
      scores = (scores || []).filter(s =>
        allowedAccounts.includes(String(s.accountId || s.account_id)) || allowedAccounts.includes(String(s.accountName || s.account_name))
      );
    }
    res.json({ success: true, scores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.7. توليد واستخراج التقرير الشامل بواسطة Gemini
app.post('/api/generate-report', authenticateRequest, async (req, res) => {
  try {
    let { accountId, period, allowEmpty } = req.body;
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    if (allowedAccounts && Array.isArray(allowedAccounts)) {
      if (allowedAccounts.length === 0) {
        return res.status(403).json({ success: false, error: 'لم يتم تعيين أي خطوط مبيعات لحسابك بعد من قِبل مجلس الإدارة' });
      }
      if (accountId) {
        if (!allowedAccounts.includes(String(accountId))) {
          return res.status(403).json({ success: false, error: 'غير مصرح لك باستخراج تقارير لهذا الحساب' });
        }
      } else if (allowedAccounts.length === 1) {
        accountId = allowedAccounts[0];
      }
    }

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

// 3.8. عرض الرسائل المسجلة في قاعدة البيانات (معاينة)
app.get('/api/messages-preview', authenticateRequest, async (req, res) => {
  try {
    const { accountId, period } = req.query;
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    const messages = await reportService.getTodayMessagesPreview(accountId || null, period || 'today', allowedAccounts);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.9. فحص اتصال Gemini API
app.get('/api/test-gemini', authenticateRequest, async (req, res) => {
  try {
    const result = await reportService.testGeminiConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.10. جلب قائمة محادثات واتساب الحية (Live WhatsApp Chats)
app.get('/api/chats', authenticateRequest, async (req, res) => {
  try {
    const { accountId, search, limit, offset } = req.query;
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    const chats = await reportService.getChatsList({
      accountId,
      search,
      limit,
      offset,
      allowedAccountIds: allowedAccounts
    });
    res.json({ success: true, chats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.11. جلب عدادات المحادثات غير المقروءة الشاملة
app.get('/api/unread-counts', authenticateRequest, async (req, res) => {
  try {
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    const data = await reportService.getUnreadCounts(allowedAccounts);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.12. جلب رسائل وصوتيات محادثة معينة
app.get('/api/chat-messages', authenticateRequest, async (req, res) => {
  try {
    const { chatId, accountId, limit, beforeTimestamp, beforeId } = req.query;
    if (!chatId) return res.status(400).json({ success: false, error: 'chatId مطلوب' });
    const allowedAccounts = req.user.isBoardMember || req.user.allAccounts ? null : req.user.allowedAccounts;
    const result = await reportService.getChatMessages({
      chatId,
      accountId,
      limit,
      beforeTimestamp,
      beforeId,
      allowedAccountIds: allowedAccounts
    });
    const messages = Array.isArray(result) ? result : (result?.messages || []);
    const hasMore = Boolean(result.hasMore);
    res.json({ success: true, messages, hasMore });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.13. جلب بريف الطالب وملف العميل الدائم
app.get('/api/customer-brief', authenticateRequest, async (req, res) => {
  try {
    const { chatId } = req.query;
    if (!chatId) return res.status(400).json({ success: false, error: 'chatId مطلوب' });
    const profile = await reportService.getCustomerBrief(chatId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.14. توليد أو تحديث بريف الطالب عبر الذكاء الاصطناعي
app.post('/api/customer-brief', authenticateRequest, async (req, res) => {
  try {
    const { chatId, accountId, force } = req.body;
    if (!chatId) return res.status(400).json({ success: false, error: 'chatId مطلوب' });
    const result = await reportService.generateOrUpdateCustomerBrief({ chatId, accountId, force: Boolean(force) });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.15. تشغيل التحديث اليومي الشامل لملخصات العملاء (مجلس الإدارة فقط)
app.post('/api/daily-briefs-sync', authenticateRequest, requireBoardMember, async (req, res) => {
  try {
    const { date } = req.body;
    const result = await reportService.runDailyBriefsUpdate(date);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.16. قناة البث اللحظي للرسائل الجديدة عبر Server-Sent Events (SSE)
const sseClients = new Set();

app.get('/api/live-stream', async (req, res) => {
  const token = req.query.token || (req.headers.authorization ? req.headers.authorization.slice(7) : null);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized SSE connection' });
  }
  const user = await authService.getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired SSE token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // إيقاف الـ buffering في Nginx
  res.flushHeaders();

  res.user = user;
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
        for (const client of sseClients) {
          try {
            let clientItems = items;
            if (!client.user?.isBoardMember && !client.user?.allAccounts) {
              const allowed = new Set(client.user?.allowedAccounts || []);
              clientItems = items.filter(ev => allowed.has(String(ev.accountId)) || allowed.has(String(ev.accountName)));
            }
            if (clientItems.length > 0) {
              client.write(`data: ${JSON.stringify({ type: 'new_events', events: clientItems })}\n\n`);
            }
          } catch (e) {
            sseClients.delete(client);
          }
        }
      }

      // التحقق من تحديثات قراءة السيلز للمحادثات (Seen Events)
      const seenUpdates = await reportService.getRecentSalesSeenUpdates(lastKnownSeenTime);
      if (seenUpdates && seenUpdates.length > 0) {
        lastKnownSeenTime = seenUpdates[seenUpdates.length - 1].seenAt;
        for (const client of sseClients) {
          try {
            let clientUpdates = seenUpdates;
            if (!client.user?.isBoardMember && !client.user?.allAccounts) {
              const allowed = new Set(client.user?.allowedAccounts || []);
              clientUpdates = seenUpdates.filter(u => allowed.has(String(u.accountId)));
            }
            if (clientUpdates.length > 0) {
              client.write(`data: ${JSON.stringify({ type: 'batch_unread_updated', updates: clientUpdates })}\n\n`);
            }
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

// تشغيل التحديث التلقائي اليومي لملخصات الطلاب في نهاية كل يوم
let lastBriefRunDate = '';
function scheduleDailyBriefsRunner() {
  setInterval(async () => {
    try {
      const nowCairo = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
      const hours = nowCairo.getHours();
      const minutes = nowCairo.getMinutes();
      const todayStr = `${nowCairo.getFullYear()}-${String(nowCairo.getMonth() + 1).padStart(2, '0')}-${String(nowCairo.getDate()).padStart(2, '0')}`;

      if (hours === 23 && minutes >= 50 && lastBriefRunDate !== todayStr) {
        lastBriefRunDate = todayStr;
        console.log(`[Scheduler] تشغيل التحديث التلقائي اليومي لبريفات الطلاب: ${todayStr}`);
        await reportService.runDailyBriefsUpdate(todayStr);
      }
    } catch (e) {
      console.error('[Scheduler] خطأ في مجدول بريفات الطلاب:', e.message);
    }
  }, 10 * 60 * 1000);
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
    console.log(`   Auth & Role System: Active (Board Member & Sales Manager QC)`);
    console.log(`   Realtime SSE Stream: /api/live-stream active`);
    console.log(`====================================================`);
  });
}).catch(err => {
  console.error('❌ Failed to initialize database / report service:', err);
  process.exit(1);
});
