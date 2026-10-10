/**
 * report-service.js
 * خدمة مركزية مشتركة ومستقلة لتوليد التقارير وحساب الإحصائيات وإدارة جداول الموظفين.
 * تعمل مع كل من:
 * 1. تطبيق Electron (main.js)
 * 2. سيرفر الويب المستقل (server.js - Express Dashboard)
 */

const path = require('path');
const fs = require('fs');
const db = require('./database');
const gemini = require('./gemini');
const {
  formatCairoTime,
  formatCairoDateTime,
  getCairoDateRange,
  calculateBusinessSeconds,
  isConcludingCustomerMessage
} = require('./timezone');

// متغيرات الاحتفاظ بالبيانات
const DATA_RETENTION_DAYS = Math.max(1, Number(process.env.DATA_RETENTION_DAYS || 7));
const DATA_RETENTION_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const audioTimestampCutoff = Math.floor((Date.now() - DATA_RETENTION_MS) / 1000);

let isInitialized = false;
let customDataDir = null;
const reportGenerationLocks = new Map();

function setUserDataPath(dir) {
  customDataDir = dir;
}

async function initialize() {
  if (isInitialized) return;
  await db.initialize();
  gemini.setUsageRecorder(db.recordGeminiUsage);
  isInitialized = true;
}

function resolveConfigPath(filename) {
  if (customDataDir && fs.existsSync(customDataDir)) {
    return path.join(customDataDir, filename);
  }
  const candidateDirs = [
    process.env.WHATSI_DATA_DIR,
    process.platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'whatsi-z-ray')
      : path.join(process.env.HOME || '/root', '.config', 'whatsi-z-ray'),
    path.join(__dirname, 'config'),
    __dirname
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    const candidateFile = path.join(dir, filename);
    if (fs.existsSync(candidateFile)) return candidateFile;
  }
  const targetDir = candidateDirs[0] || __dirname;
  try {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  } catch (e) {}
  return path.join(targetDir, filename);
}

function getSettingsFilePath() {
  return resolveConfigPath('settings.json');
}

function getAccountsFilePath() {
  return resolveConfigPath('accounts.json');
}

function loadSettings() {
  try {
    const p = getSettingsFilePath();
    if (!fs.existsSync(p)) return { excludedPhones: [] };
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    return { excludedPhones: [] };
  }
}

function saveSettings(settings) {
  try {
    const p = getSettingsFilePath();
    fs.writeFileSync(p, JSON.stringify(settings, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getExcludedPhonesNormalized() {
  const s = loadSettings();
  const list = Array.isArray(s.excludedPhones) ? s.excludedPhones : [];
  const set = new Set();
  for (const item of list) {
    const digits = String(item || '').replace(/\D/g, '');
    if (digits) {
      set.add(digits);
      if (/^01[0125]\d{8}$/.test(digits)) set.add('20' + digits.slice(1));
      if (/^1[0125]\d{8}$/.test(digits)) set.add('20' + digits);
      if (digits.startsWith('20') && digits.length === 12) set.add('0' + digits.slice(2));
    }
  }
  return set;
}

async function loadAccounts() {
  try {
    const p = getAccountsFilePath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}

  // إذا لم يكن الملف موجوداً، نستكشف الحسابات المسجلة من قاعدة البيانات
  try {
    const pool = db.getPool();
    if (pool) {
      const res = await pool.query(`
        SELECT DISTINCT account_id, account_name 
        FROM messages 
        WHERE account_id IS NOT NULL AND account_name IS NOT NULL
        ORDER BY account_name ASC
      `);
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.account_id,
          name: r.account_name,
          schedule: { enabled: true, start: '10:00', end: '19:00', workDays: [6, 0, 1, 2, 3, 4] }
        }));
      }
    }
  } catch (e) {}

  return [];
}

async function saveAccounts(accounts) {
  try {
    const p = getAccountsFilePath();
    fs.writeFileSync(p, JSON.stringify(accounts, null, 2), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getAccountScheduleMapSync() {
  try {
    const p = getAccountsFilePath();
    if (fs.existsSync(p)) {
      const accounts = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const map = new Map();
      for (const acc of accounts) {
        if (acc && acc.id) {
          map.set(acc.id, acc.schedule || { enabled: true, start: '10:00', end: '19:00', workDays: [6, 0, 1, 2, 3, 4] });
        }
      }
      return map;
    }
  } catch (e) {}
  return new Map();
}

function shiftDateByDays(dateString, days) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function getAudioClassification(transcript = '', toneValue = '') {
  const tone = String(toneValue || '');
  const toneWithoutClassification = tone.replace(/(?:\r?\n)?تصنيف المحتوى\s*[:：]\s*(?:مسيء|غير مسيء|غير محسوم)/ig, '').trim();
  const transcriptText = String(transcript || '');

  const targetedViolencePattern = /(?:(?:أنا\s+)?(?:عايز|عاوزه|عاوز|أريد|اريد|نفسي)\s+(?:أن\s+)?(?:أموت|اموت|أقتل|اقتل|هقتل|سأقتل|أذبح|اذبح)\s+(?:ال)?(?:طلبة|طلاب|ناس|شخص|العميل|السيلز|الموظف|المدرس|المدرسين|الناس|فلان)|(?:هقتل|هأقتل|سأقتل|سوف\s+أقتل|أذبح|اذبح)\s+(?:ال)?(?:طلبة|طلاب|ناس|شخص|العميل|السيلز|الموظف|المدرس|المدرسين|الناس|فلان))/iu;
  if (targetedViolencePattern.test(transcriptText)) {
    return { label: 'محتوى عنيف موجّه — يحتاج مراجعة', abusive: true, tone: toneWithoutClassification, reason: 'يتضمن التفريغ عبارة مباشرة عن قتل/إيذاء أشخاص؛ هذا تنبيه آلي لمراجعة التسجيل والسياق، وليس حكمًا على جدية التهديد.' };
  }

  const insultPattern = /(?:يا\s+(?:غبي|حمار|كلب|حيوان|حقير|وسخ|قذر|زبالة|متخلف|أحمق|كذاب)|(?:ابن|بنت)\s+الكلب|يلعن(?:ك|كم)?|شرموط|كس(?:م|ختك|اختك)|fuck\s+you|you\s+are\s+(?:an?\s+)?(?:idiot|stupid|bitch|bastard))/iu;
  if (insultPattern.test(transcriptText)) {
    return { label: 'مسيء — يحتاج مراجعة', abusive: true, tone: toneWithoutClassification, reason: 'رصد النظام لفظًا مهينًا واضحًا في التفريغ؛ راجع التسجيل والسياق.' };
  }

  const stored = tone.match(/تصنيف المحتوى\s*[:：]\s*(مسيء|غير مسيء|غير محسوم)/i);
  if (stored) {
    const label = stored[1] === 'مسيء' ? 'مسيء' : stored[1] === 'غير مسيء' ? 'غير مسيء' : 'غير محسوم';
    return { label, abusive: label === 'مسيء', tone: toneWithoutClassification, reason: '' };
  }
  return { label: 'غير مصنّف', abusive: false, tone: toneWithoutClassification, reason: 'هذا التسجيل لم يُصنّف وقت تفريغه.' };
}

function buildAudioEvidence(audioRows) {
  return audioRows.map(audio => {
    const classification = getAudioClassification(audio.transcript, audio.tone_analysis);
    return ({
      id: String(audio.id),
      time: audio.display_time || audio.timestamp || '',
      timestamp: audio.timestamp || '',
      sender: audio.sender || '',
      accountName: audio.account_name || '',
      customerName: audio.customer_name || '',
      customerPhone: db.formatPhoneNumber(audio.customer_phone || '') || '',
      chatId: audio.chat_id || '',
      durationSec: audio.duration_sec,
      transcript: audio.transcript == null ? '' : String(audio.transcript),
      tone: classification.tone,
      abuseLabel: classification.label,
      abusive: classification.abusive,
      abuseReason: classification.reason
    });
  });
}

function buildAudioSummary(audioRows) {
  if (!audioRows || audioRows.length === 0) return 'لا توجد تسجيلات صوتية مسجلة في هذه الفترة.';
  const lines = audioRows.map((audio, index) => {
    const time = formatCairoTime(audio.timestamp);
    const sender = audio.sender === 'sales' ? `السيلز (${audio.account_name || 'غير معروف'})` : 'العميل';
    const student = audio.customer_name ? `العميل: ${audio.customer_name}` : `الهاتف: ${db.formatPhoneNumber(audio.customer_phone)}`;
    const duration = audio.duration_sec ? ` [المدة: ${audio.duration_sec} ثانية]` : '';
    if (audio.transcript) {
      const evidence = getAudioClassification(audio.transcript, audio.tone_analysis);
      const tone = evidence.tone ? ` | نبرة الصوت: ${evidence.tone}` : '';
      return `[${time}] 🎤 رسالة صوتية ${index + 1} — ${sender} | ${student}${duration}\nتصنيف المحتوى: ${evidence.label}${evidence.reason ? ` (${evidence.reason})` : ''}\nالتفريغ: "${audio.transcript}"${tone}`;
    }
    if (new Date(audio.timestamp).getTime() < audioTimestampCutoff * 1000) {
      return `[${time}] 🎤 رسالة صوتية ${index + 1} — ${sender} | ${student}${duration}\nℹ️ تم تجاوز تفريغها لأنها أقدم من حد بدء التطبيق`;
    }
    return `[${time}] 🎤 رسالة صوتية ${index + 1} — ${sender} | ${student}${duration}\n⚠️ لم يتمكن النظام من جلب ملف الصوت لتفريغه`;
  });
  return `═══ الرسائل الصوتية المسجلة: ${audioRows.length} رسالة ═══\n${lines.join('\n\n')}`;
}

function removeDuplicateActivitySection(text) {
  if (!text) return text;
  return text.replace(/\n\s*#{1,6}\s*(?:نشاط الحسابات اليومي|ملخص النشاط اليومي)[\s\S]*?(?=\n#{1,6}\s|\n---|\Z)/g, '\n').trim();
}

function hasUsefulReportAppendix(appendix) {
  if (!appendix) return false;
  const stripped = String(appendix).trim();
  if (!stripped) return false;
  const boilerplatePatterns = [
    /^(?:لا\s+توجد\s+رسائل\s+جديدة|لا\s+يوجد\s+تحديث\s+جديد|لم\s+تطرأ\s+تغييرات|لا\s+توجد\s+إضافات)/i,
    /^(?:التقرير\s+الحالي\s+شامل|لا\s+جديد\s+يستدعي\s+التحديث)/i
  ];
  return !boilerplatePatterns.some(pat => pat.test(stripped));
}

function buildCurrentMessageTimes(messages, audioRows) {
  const accountStats = new Map();
  const summary = values => {
    if (!values || values.length === 0) return { count: 0, first: null, last: null };
    return { count: values.length, first: formatCairoTime(values[0]), last: formatCairoTime(values[values.length - 1]) };
  };
  for (const row of [...messages, ...audioRows]) {
    const id = row.account_id || 'unknown';
    const name = row.account_name || 'غير معروف';
    if (!accountStats.has(id)) {
      accountStats.set(id, { accountId: id, accountName: name, first: [], last: [], lastSales: [], lastCustomer: [] });
    }
    const acc = accountStats.get(id);
    const ts = row.timestamp;
    acc.first.push(ts);
    acc.last.push(ts);
    if (row.sender === 'sales') acc.lastSales.push(ts);
    if (row.sender === 'customer') acc.lastCustomer.push(ts);
  }
  return Object.fromEntries([...accountStats.entries()].map(([accountId, account]) => {
    account.first.sort();
    account.last.sort();
    account.lastSales.sort();
    account.lastCustomer.sort();
    return [accountId, {
      accountId,
      accountName: account.accountName,
      first: summary(account.first),
      last: summary(account.last),
      lastSales: summary(account.lastSales),
      lastCustomer: summary(account.lastCustomer)
    }];
  }));
}

function buildResponseMetrics(messages, audioRows, { periodStart, periodEnd, now = Date.now(), observationHours = 48, schedules = new Map() }) {
  const events = [
    ...messages.map(row => ({ ...row, source: 'text' })),
    ...audioRows.map(row => ({ ...row, source: 'audio' }))
  ].map(row => ({ ...row, milliseconds: new Date(row.timestamp).getTime() }))
    .filter(row => Number.isFinite(row.milliseconds) && ['sales', 'customer'].includes(row.sender));

  const chatKey = row => {
    const chatId = String(row.chat_id || '').trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    return `${row.account_id || 'unknown'}\u0000${chatId || row.customer_phone || row.customer_name || 'unknown'}`;
  };

  const conversations = new Map();
  for (const event of events) {
    const key = chatKey(event);
    if (!conversations.has(key)) conversations.set(key, { accountId: event.account_id || 'unknown', accountName: event.account_name || 'غير معروف', events: [] });
    conversations.get(key).events.push(event);
  }

  const stats = new Map();
  const ensure = (accountId, accountName) => {
    if (!stats.has(accountId)) stats.set(accountId, { accountId, accountName, firstReplies: [], repeatReplies: [], pending: [] });
    return stats.get(accountId);
  };

  const isInPeriod = timestamp => timestamp >= periodStart && timestamp < periodEnd;
  for (const conversation of conversations.values()) {
    const account = ensure(conversation.accountId, conversation.accountName);
    const accountSchedule = schedules.get(conversation.accountId) || { enabled: false };
    conversation.events.sort((a, b) => a.milliseconds - b.milliseconds);
    let waitingSince = null;
    let pendingStartIsLowerBound = false;
    let answeredTurnsInPeriod = 0;

    for (const event of conversation.events) {
      if (event.sender === 'customer') {
        if (waitingSince === null) {
          waitingSince = event.milliseconds;
          pendingStartIsLowerBound = conversation.events[0] === event;
        }
      } else if (waitingSince !== null) {
        const seconds = calculateBusinessSeconds(waitingSince, event.milliseconds, accountSchedule);
        if (isInPeriod(waitingSince) && event.milliseconds <= periodEnd) {
          const entry = { seconds, accountId: conversation.accountId };
          (answeredTurnsInPeriod++ === 0 ? account.firstReplies : account.repeatReplies).push(entry);
        }
        waitingSince = null;
        pendingStartIsLowerBound = false;
      }
    }

    if (waitingSince !== null && conversation.events.at(-1)?.sender === 'customer') {
      const lastMsg = conversation.events.at(-1);
      if (!isConcludingCustomerMessage(lastMsg.text)) {
        const waitSeconds = calculateBusinessSeconds(waitingSince, now, accountSchedule);
        account.pending.push({ seconds: waitSeconds, lowerBound: pendingStartIsLowerBound });
      }
    }
  }

  const summarize = values => {
    const seconds = values.map(item => item.seconds).filter(value => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
    const median = seconds.length === 0 ? null : seconds.length % 2
      ? seconds[Math.floor(seconds.length / 2)]
      : Math.round((seconds[seconds.length / 2 - 1] + seconds[seconds.length / 2]) / 2);
    return {
      count: seconds.length,
      averageSeconds: seconds.length ? Math.round(seconds.reduce((sum, value) => sum + value, 0) / seconds.length) : null,
      medianSeconds: median,
      maximumSeconds: seconds.length ? seconds.at(-1) : null
    };
  };

  const serialize = account => {
    const oldest = account.pending.reduce((result, item) => !result || item.seconds > result.seconds ? item : result, null);
    return {
      accountId: account.accountId,
      accountName: account.accountName,
      firstReply: summarize(account.firstReplies),
      repeatedReplies: summarize(account.repeatReplies),
      pendingSalesReplyCount: account.pending.length,
      oldestPendingSeconds: oldest?.seconds ?? null,
      oldestPendingIsLowerBound: Boolean(oldest?.lowerBound)
    };
  };

  const perAccount = Object.fromEntries([...stats].map(([id, account]) => [id, serialize(account)]));
  const all = { accountId: '__all__', accountName: 'الإجمالي', firstReplies: [], repeatReplies: [], pending: [] };
  for (const account of stats.values()) {
    all.firstReplies.push(...account.firstReplies);
    all.repeatReplies.push(...account.repeatReplies);
    all.pending.push(...account.pending);
  }

  return { observationHours, perAccount, total: serialize(all) };
}

function buildEvidenceByAccount(dateStats, messages, audioRows) {
  const chatsByAccount = new Map();
  for (const row of [...messages, ...audioRows]) {
    if (!['sales', 'customer'].includes(row.sender)) continue;
    const id = row.account_id || 'unknown';
    const chatId = String(row.chat_id || '').trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    const key = chatId || row.customer_phone || row.customer_name || 'unknown';
    if (!chatsByAccount.has(id)) chatsByAccount.set(id, new Map());
    if (!chatsByAccount.get(id).has(key)) chatsByAccount.get(id).set(key, { sales: 0, customer: 0 });
    const chat = chatsByAccount.get(id).get(key);
    if (row.sender === 'sales') chat.sales += 1;
    if (row.sender === 'customer') chat.customer += 1;
  }

  const perAccount = {};
  for (const [id, row] of Object.entries(dateStats.perAccount || {})) {
    const accountChats = chatsByAccount.get(id) || new Map();
    const shortChats = [...accountChats.values()].filter(c => (c.sales + c.customer) < 3 || c.sales === 0 || c.customer === 0).length;
    const sufficient = row.chats >= 3 && row.salesMessages >= 10 && row.customerMessages >= 5;
    perAccount[id] = {
      accountId: id,
      accountName: row.accountName,
      status: sufficient ? 'sufficient' : 'insufficient',
      chats: row.chats,
      salesMessages: row.salesMessages,
      customerMessages: row.customerMessages,
      shortChats,
      minimum: { chats: 3, salesMessages: 10, customerMessages: 5 },
      note: sufficient
        ? `${shortChats} محادثة قصيرة أو أحادية الطرف؛ التقييم العام يستند إلى عينة الحساب كاملة.`
        : `دليل غير كافٍ لدرجة يومية موثوقة: يلزم 3 محادثات و10 رسائل سيلز و5 رسائل عملاء على الأقل. المتاح: ${row.chats} محادثة، ${row.salesMessages} رسالة سيلز، ${row.customerMessages} رسالة عميل.`
    };
  }
  return perAccount;
}

function applyEvidenceGate(reportText, scores, evidenceByAccount) {
  const normalized = (scores || []).map(score => {
    const evidence = evidenceByAccount[score.accountId];
    if (!evidence || evidence.status === 'insufficient') {
      return { ...score, overallScore: 0, evidenceStatus: 'insufficient', evidenceNote: evidence?.note || 'دليل غير كافٍ' };
    }
    return { ...score, evidenceStatus: 'sufficient', evidenceNote: evidence.note };
  });
  const insufficientNames = Object.values(evidenceByAccount).filter(row => row.status === 'insufficient').map(row => row.accountName);
  let text = reportText;
  for (const name of insufficientNames) {
    const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const namePattern = new RegExp(`(^#{1,6}[^\\n]*${escaped}[^\\n]*\\n[\\s\\S]{0,500}?)(?:الدرجة الإجمالية|الدرجة الكلية|الدرجة)\\s*[:：]?\\s*\\d+\\s*\\/?\\s*100`, 'm');
    text = text.replace(namePattern, `$1**التقييم: دليل غير كافٍ**`);
  }
  return { report: text, scores: normalized };
}

function reportStatsForEmpty(dateStats, contacts) {
  return { ...dateStats, leadCount: contacts.leadCount, followupCount: contacts.followupCount };
}

async function generateDailyReportInternal({ accountId, period, allowEmpty = false } = {}) {
  await initialize();
  period = ['today', 'yesterday', 'last48h', 'last7days'].includes(period) ? period : 'today';
  const cairoToday = db.getLocalDateString();
  const selectedDate = period === 'yesterday' ? shiftDateByDays(cairoToday, -1) : cairoToday;
  const reportDate = period === 'today'
    ? selectedDate.split('-').reverse().join('/')
    : period === 'yesterday'
      ? `أمس (${selectedDate.split('-').reverse().join('/')})`
      : period === 'last7days'
        ? `آخر 7 أيام حتى ${formatCairoDateTime()}`
        : `آخر 48 ساعة حتى ${formatCairoDateTime()}`;

  const cutoffDate = db.getLocalDateString(new Date(Date.now() - DATA_RETENTION_MS));
  const cacheableDate = selectedDate > cutoffDate;
  const sourceVersion = await db.getDailyReportRevision(accountId || null, selectedDate, period);
  let cached = cacheableDate
    ? await db.getCachedDailyReport(accountId || null, selectedDate, sourceVersion, period, true, true)
    : null;

  const metricsPeriod = ['last7days', 'last48h'].includes(period) ? period : 'last48h';
  const [messages, audioRows, dateStats, contacts, recentMessages, recentAudioRows] = await Promise.all([
    db.getTodayMessages(accountId || null, selectedDate, period),
    db.getAudioMessages(accountId || null, selectedDate, period),
    db.getTodayStats(selectedDate, accountId || null, period),
    db.getLeadFollowupContacts(accountId || null, selectedDate, period),
    db.getTodayMessages(accountId || null, null, metricsPeriod),
    db.getAudioMessages(accountId || null, null, metricsPeriod)
  ]);

  const now = Date.now();
  const [periodStartIso, periodEndIso] = period === 'last7days'
    ? [new Date(now - DATA_RETENTION_MS).toISOString(), new Date(now).toISOString()]
    : period === 'last48h'
      ? [new Date(now - 48 * 60 * 60 * 1000).toISOString(), new Date(now).toISOString()]
      : getCairoDateRange(selectedDate);
  const periodStart = Date.parse(periodStartIso);
  const periodEnd = Math.min(Date.parse(periodEndIso), now);
  const observationHours = period === 'last7days' ? (DATA_RETENTION_DAYS * 24) : period === 'last48h' ? 48 : 24;
  const schedules = getAccountScheduleMapSync();
  const excludedPhones = getExcludedPhonesNormalized();

  const isExcluded = row => {
    if (!excludedPhones.size) return false;
    const pDigits = String(row.customer_phone || '').replace(/\D/g, '');
    if (pDigits && excludedPhones.has(pDigits)) return true;
    const cDigits = String(row.chat_id || '').split('@')[0].replace(/\D/g, '');
    if (cDigits && excludedPhones.has(cDigits)) return true;
    return false;
  };

  const validMessages = messages.filter(m => !isExcluded(m));
  const validAudioRows = audioRows.filter(a => !isExcluded(a));
  const validRecentMessages = recentMessages.filter(m => !isExcluded(m));
  const validRecentAudioRows = recentAudioRows.filter(a => !isExcluded(a));

  const responseMetrics = buildResponseMetrics(validRecentMessages, validRecentAudioRows, {
    periodStart, periodEnd, now, observationHours, schedules
  });
  const evidenceByAccount = buildEvidenceByAccount(dateStats, validMessages, validAudioRows);
  const manifest = db.buildReportInputManifest(validMessages, validAudioRows);

  if (cached && !cached.processedManifest) {
    if (cached._cacheSourceVersion === sourceVersion) {
      cached.processedManifest = manifest;
      delete cached._cacheSourceVersion;
      delete cached._cachePromptVersion;
      if (cacheableDate) await db.storeDailyReportCache(accountId || null, selectedDate, sourceVersion, cached, period);
    } else {
      cached = null;
    }
  }
  if (cached) {
    delete cached._cacheSourceVersion;
    delete cached._cachePromptVersion;
    cached.report = removeDuplicateActivitySection(cached.report);
  }
  if (cached?.noActivity && (messages.length > 0 || audioRows.length > 0)) cached = null;
  if (!cached && messages.length === 0 && audioRows.length === 0 && !allowEmpty) {
    return { success: false, error: 'لا توجد رسائل محفوظة لهذه الفترة. تأكد من أن التطبيق يعمل ويلتقط الرسائل.' };
  }

  const oldManifest = cached && cached.processedManifest || { text: {}, audio: {} };
  const oldTextManifest = oldManifest.text || {};
  const oldAudioManifest = oldManifest.audio || {};
  const newMessages = messages.filter(row => oldTextManifest[String(row.id)] !== manifest.text[String(row.id)]);
  const newAudioRows = audioRows.filter(row => oldAudioManifest[String(row.id)] !== manifest.audio[String(row.id)]);
  const hasNewInputs = newMessages.length > 0 || newAudioRows.length > 0;
  const messageTimesByAccount = buildCurrentMessageTimes(messages, audioRows);
  const currentStats = {
    accounts: dateStats.accounts, chats: dateStats.chats, total_messages: dateStats.total_messages,
    sales_messages: dateStats.sales_messages, customer_messages: dateStats.customer_messages,
    leadCount: contacts.leadCount, followupCount: contacts.followupCount, perAccount: dateStats.perAccount,
    messageTimesByAccount, responseMetrics, evidenceByAccount, period, calculatedAt: new Date().toISOString()
  };

  if (!cached && messages.length === 0 && audioRows.length === 0 && allowEmpty) {
    const report = {
      success: true, period, date: selectedDate, stats: reportStatsForEmpty(dateStats, contacts),
      currentStats, leadCount: contacts.leadCount, followupCount: contacts.followupCount,
      report: `# تقرير أداء المبيعات — ${reportDate}\n\nلا توجد رسائل أو تسجيلات محفوظة لهذا الحساب خلال هذه الفترة؛ لذلك لا تتوفر أدلة لتقييم الأداء.`,
      scores: [], monthlyScores: await db.getMonthlySalesScores(selectedDate.slice(0, 7), accountId || null),
      audioEvidence: [], processedManifest: manifest, cached: false, noActivity: true
    };
    if (cacheableDate) await db.storeDailyReportCache(accountId || null, selectedDate, sourceVersion, report, period);
    return report;
  }

  if (cached && !hasNewInputs) {
    const gated = applyEvidenceGate(cached.report, cached.scores, evidenceByAccount);
    return {
      ...cached, report: gated.report, scores: gated.scores, date: selectedDate, period,
      currentStats, leadCount: contacts.leadCount, followupCount: contacts.followupCount,
      monthlyScores: await db.getMonthlySalesScores(selectedDate.slice(0, 7), accountId || null),
      audioEvidence: buildAudioEvidence(audioRows), cached: true, noNewMessages: true
    };
  }

  const fullText = cached ? null : await db.formatMessagesForGemini(accountId || null, selectedDate, period, messages, messages);
  const deltaText = cached
    ? await db.formatMessagesForGemini(accountId || null, selectedDate, period, newMessages, messages)
    : fullText;
  const textActivity = cached ? (dateStats.perAccount || {}) : (fullText.stats.perAccount || {});
  const reportStats = {
    ...dateStats, textActivityByAccount: textActivity,
    messageTimesByAccount, responseMetrics, evidenceByAccount,
    leadCount: contacts.leadCount, followupCount: contacts.followupCount, period
  };
  const audioSummary = buildAudioSummary(newAudioRows);

  let report;
  if (cached) {
    const delta = await gemini.analyzeDailyChatsDelta(
      deltaText.text || 'لا توجد رسائل نصية جديدة؛ يوجد تحديث صوتي موضح أدناه.',
      { ...reportStats, deltaChats: deltaText.stats.chats || newAudioRows.length },
      reportDate, audioSummary, cached.scores || [], accountId || null, period
    );
    if (!delta.success) return { success: false, error: delta.error, stats: currentStats };
    const deltaAppendix = hasUsefulReportAppendix(delta.appendix)
      ? `\n\n---\n\n### ملحق تحديث — رسائل جديدة منذ آخر استخراج\n\n${delta.appendix.trim()}`
      : '';
    report = {
      ...cached, success: true, stats: reportStats,
      report: `${cached.report}${deltaAppendix}`,
      scores: delta.scores.length ? delta.scores : cached.scores, model: delta.model,
      incrementalUpdate: true, analyzedNewMessages: newMessages.length, analyzedNewAudio: newAudioRows.length
    };
  } else {
    report = await gemini.analyzeDailyChats(
      fullText.text || 'لا توجد رسائل نصية في هذه الفترة؛ توجد تسجيلات صوتية موضحة أدناه.',
      reportStats, reportDate, buildAudioSummary(audioRows), accountId || null, period
    );
  }

  if (report.success) {
    report.report = removeDuplicateActivitySection(report.report);
    const gated = applyEvidenceGate(report.report, report.scores, evidenceByAccount);
    report.report = gated.report;
    report.scores = gated.scores;
    report.period = period;
    report.date = selectedDate;
    report.leadCount = contacts.leadCount;
    report.followupCount = contacts.followupCount;
    report.currentStats = currentStats;
    report.processedManifest = manifest;

    if (!['last48h', 'last7days'].includes(period) && Array.isArray(report.scores) && report.scores.length) {
      const leadCounts = {}, followupCounts = {};
      for (const contact of contacts.leads) leadCounts[contact.accountId] = (leadCounts[contact.accountId] || 0) + 1;
      for (const contact of contacts.followups) followupCounts[contact.accountId] = (followupCounts[contact.accountId] || 0) + 1;
      const conversationCounts = Object.fromEntries(Object.entries(dateStats.perAccount || {}).map(([id, row]) => [id, row.chats]));
      const reliableScores = report.scores.filter(score => score.evidenceStatus !== 'insufficient');
      await db.saveSalesDailyScores(reliableScores, { date: selectedDate, leadCounts, followupCounts, conversationCounts });
    }
    report.monthlyScores = await db.getMonthlySalesScores(selectedDate.slice(0, 7), accountId || null);
    if (['last48h', 'last7days'].includes(period)) {
      const timestamps = [...messages.map(row => row.timestamp), ...audioRows.map(row => row.timestamp)].map(value => new Date(value).getTime()).filter(Number.isFinite);
      if (timestamps.length) report.cacheValidUntil = new Date(timestamps.reduce((earliest, value) => Math.min(earliest, value), Infinity) + DATA_RETENTION_MS).toISOString();
    }
    if (cacheableDate) await db.storeDailyReportCache(accountId || null, selectedDate, sourceVersion, report, period);
  }
  if (report.success) report.audioEvidence = buildAudioEvidence(audioRows);
  return report;
}

async function generateDailyReport(request = {}) {
  await initialize();
  const period = ['today', 'yesterday', 'last48h', 'last7days'].includes(request.period) ? request.period : 'today';
  const today = db.getLocalDateString();
  const reportDate = period === 'yesterday' ? shiftDateByDays(today, -1) : today;
  const lockKey = `${request.accountId || '__all__'}::${period}::${reportDate}`;
  if (reportGenerationLocks.has(lockKey)) return reportGenerationLocks.get(lockKey);
  const pending = generateDailyReportInternal({ ...request, period });
  reportGenerationLocks.set(lockKey, pending);
  try {
    return await pending;
  } finally {
    if (reportGenerationLocks.get(lockKey) === pending) reportGenerationLocks.delete(lockKey);
  }
}

async function getMonthlySalesScores(month, accountId) {
  await initialize();
  return await db.getMonthlySalesScores(month, accountId);
}

async function getTodayStats(date, accountId, period) {
  await initialize();
  return await db.getTodayStats(date, accountId, period);
}

async function getTodayMessagesPreview(accountId, period) {
  await initialize();
  const messages = await db.getTodayMessages(accountId, null, period || 'today');
  return messages.slice(-100);
}

async function getChatsList({ accountId = null, search = '', limit = 100, offset = 0 } = {}) {
  await initialize();
  const pool = db.getPool();
  const excludedPhones = getExcludedPhonesNormalized();

  let filterSql = `WHERE timestamp >= NOW() - INTERVAL '${DATA_RETENTION_DAYS} days' AND chat_id IS NOT NULL`;
  const params = [];

  if (accountId) {
    params.push(accountId);
    const pIdx = params.length;
    filterSql += ` AND (account_id = $${pIdx} OR account_name = $${pIdx})`;
  }

  let searchSql = '';
  if (search && String(search).trim()) {
    params.push(`%${String(search).trim()}%`);
    const pIdx = params.length;
    searchSql = ` AND (customer_name ILIKE $${pIdx} OR customer_phone ILIKE $${pIdx} OR text ILIKE $${pIdx} OR chat_id ILIKE $${pIdx})`;
  }

  const query = `
    WITH combined AS (
      SELECT id, chat_id, customer_name, customer_phone, account_id, account_name, text, sender, timestamp, 'text' AS msg_type
      FROM messages
      ${filterSql} ${searchSql}
      UNION ALL
      SELECT id, chat_id, customer_name, customer_phone, account_id, account_name, COALESCE(transcript, '🎤 تسجيل صوتي') AS text, sender, timestamp, 'audio' AS msg_type
      FROM audio_messages
      ${filterSql} ${searchSql}
    ),
    ranked AS (
      SELECT 
        chat_id, customer_name, customer_phone, account_id, account_name, text, sender, timestamp, msg_type,
        ROW_NUMBER() OVER (PARTITION BY chat_id ORDER BY timestamp DESC) AS rn,
        COUNT(*) OVER (PARTITION BY chat_id) AS total_count
      FROM combined
    )
    SELECT 
      chat_id, customer_name, customer_phone, account_id, account_name, 
      text AS last_message, sender AS last_sender, timestamp AS last_time, 
      msg_type AS last_type, total_count AS message_count
    FROM ranked
    WHERE rn = 1
    ORDER BY last_time DESC
    LIMIT ${Number(limit) || 100} OFFSET ${Number(offset) || 0};
  `;

  const res = await pool.query(query, params);
  return res.rows.filter(r => {
    if (!excludedPhones.size) return true;
    const pDigits = String(r.customer_phone || '').replace(/\D/g, '');
    if (pDigits && excludedPhones.has(pDigits)) return false;
    const cDigits = String(r.chat_id || '').split('@')[0].replace(/\D/g, '');
    if (cDigits && excludedPhones.has(cDigits)) return false;
    return true;
  }).map(row => ({
    chatId: row.chat_id,
    customerName: row.customer_name || 'عميل غير مسجل',
    customerPhone: row.customer_phone ? db.formatPhoneNumber(row.customer_phone) : '',
    accountId: row.account_id,
    accountName: row.account_name || 'خط غير محدد',
    lastMessage: row.last_message || '',
    lastSender: row.last_sender || 'customer',
    lastType: row.last_type || 'text',
    lastTime: row.last_time,
    displayTime: formatCairoTime(row.last_time),
    messageCount: Number(row.message_count) || 0
  }));
}

async function getChatMessages({ chatId, accountId = null, limit = 200 } = {}) {
  await initialize();
  if (!chatId) return [];
  const pool = db.getPool();

  const params = [chatId];
  let accFilter = '';
  if (accountId) {
    params.push(accountId);
    const pIdx = params.length;
    accFilter = ` AND (account_id = $${pIdx} OR account_name = $${pIdx})`;
  }

  const query = `
    SELECT 
      id, account_id, account_name, customer_name, customer_phone, chat_id, 
      sender, text, NULL AS transcript, NULL AS tone_analysis, NULL AS duration_sec, 
      'text' AS type, timestamp, display_time
    FROM messages
    WHERE chat_id = $1 ${accFilter} AND timestamp >= NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'
    UNION ALL
    SELECT 
      id, account_id, account_name, customer_name, customer_phone, chat_id, 
      sender, NULL AS text, transcript, tone_analysis, duration_sec, 
      'audio' AS type, timestamp, display_time
    FROM audio_messages
    WHERE chat_id = $1 ${accFilter} AND timestamp >= NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'
    ORDER BY timestamp ASC
    LIMIT ${Number(limit) || 200};
  `;

  const res = await pool.query(query, params);
  return res.rows.map(row => ({
    id: String(row.id),
    type: row.type,
    sender: row.sender,
    text: row.text || '',
    transcript: row.transcript || '',
    toneAnalysis: row.tone_analysis || '',
    durationSec: Number(row.duration_sec) || 0,
    timestamp: row.timestamp,
    displayTime: formatCairoTime(row.timestamp),
    accountName: row.account_name || '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone ? db.formatPhoneNumber(row.customer_phone) : ''
  }));
}

async function getLatestMessageIds() {
  await initialize();
  const pool = db.getPool();
  const resMsg = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM messages');
  const resAudio = await pool.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM audio_messages');
  return {
    lastMsgId: Number(resMsg.rows[0].max_id) || 0,
    lastAudioId: Number(resAudio.rows[0].max_id) || 0
  };
}

async function getNewMessagesSince(lastMsgId = 0, lastAudioId = 0) {
  await initialize();
  const pool = db.getPool();

  const [msgsRes, audioRes] = await Promise.all([
    pool.query(`
      SELECT id, account_id, account_name, customer_name, customer_phone, chat_id, sender, text, timestamp, display_time, 'text' AS type
      FROM messages
      WHERE id > $1
      ORDER BY id ASC
      LIMIT 50
    `, [lastMsgId]),
    pool.query(`
      SELECT id, account_id, account_name, customer_name, customer_phone, chat_id, sender, transcript, tone_analysis, duration_sec, timestamp, display_time, 'audio' AS type
      FROM audio_messages
      WHERE id > $1
      ORDER BY id ASC
      LIMIT 50
    `, [lastAudioId])
  ]);

  const newItems = [
    ...msgsRes.rows.map(r => ({
      id: Number(r.id),
      chatId: r.chat_id,
      accountId: r.account_id,
      accountName: r.account_name,
      customerName: r.customer_name,
      customerPhone: r.customer_phone ? db.formatPhoneNumber(r.customer_phone) : '',
      sender: r.sender,
      text: r.text || '',
      type: 'text',
      timestamp: r.timestamp,
      displayTime: formatCairoTime(r.timestamp)
    })),
    ...audioRes.rows.map(r => ({
      id: Number(r.id),
      chatId: r.chat_id,
      accountId: r.account_id,
      accountName: r.account_name,
      customerName: r.customer_name,
      customerPhone: r.customer_phone ? db.formatPhoneNumber(r.customer_phone) : '',
      sender: r.sender,
      transcript: r.transcript || '',
      toneAnalysis: r.tone_analysis || '',
      durationSec: Number(r.duration_sec) || 0,
      type: 'audio',
      timestamp: r.timestamp,
      displayTime: formatCairoTime(r.timestamp)
    }))
  ];

  newItems.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const newMaxMsgId = msgsRes.rows.length ? Math.max(...msgsRes.rows.map(r => Number(r.id))) : lastMsgId;
  const newMaxAudioId = audioRes.rows.length ? Math.max(...audioRes.rows.map(r => Number(r.id))) : lastAudioId;

  return {
    items: newItems,
    maxMsgId: newMaxMsgId,
    maxAudioId: newMaxAudioId
  };
}

async function testGeminiConnection() {
  await initialize();
  return await gemini.testConnection();
}

module.exports = {
  initialize,
  setUserDataPath,
  loadAccounts,
  saveAccounts,
  loadSettings,
  saveSettings,
  getExcludedPhonesNormalized,
  getAccountScheduleMapSync,
  generateDailyReport,
  getMonthlySalesScores,
  getTodayStats,
  getTodayMessagesPreview,
  testGeminiConnection,
  buildResponseMetrics,
  shiftDateByDays,
  getChatsList,
  getChatMessages,
  getLatestMessageIds,
  getNewMessagesSince,
  DATA_RETENTION_DAYS
};
