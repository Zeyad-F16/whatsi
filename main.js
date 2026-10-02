/**
 * main.js
 * العملية الرئيسية (Main Process) لتطبيق whatsi Z-ray.
 * مسؤولة عن:
 * - إدارة نوافذ التطبيق
 * - استقبال الرسائل من الـ webviews عبر IPC
 * - حفظها في PostgreSQL
 * - التواصل مع Gemini API لتوليد التقارير
 */

const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { Queue, Worker } = require('bullmq');
const { formatCairoTime, formatCairoDateTime } = require('./timezone');

// تحميل متغيرات البيئة من .env
require('dotenv').config({ path: path.join(__dirname, '.env') });
const appStartTime = Math.floor(Date.now() / 1000);
const audioTimestampCutoff = appStartTime - 300;

// ===== إعدادات محرك Chromium لمنع رسائل الكاش غير المؤثرة في التيرمينال =====
app.commandLine.appendSwitch('log-level', '3'); // إخفاء رسائل Chromium C++ الداخلية
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache'); // منع تضارب كاش الرسوميات
app.commandLine.appendSwitch('ignore-certificate-errors');

// قاعدة البيانات وGemini - يتم استيرادهم بعد جهوزية التطبيق
let db;
let gemini;
let audioQueue;
let audioWorker;
let publishingAudioJobs = false;
let outboxTimer;
let retentionTimer;


let mainWindow;

function getGemini() {
  if (!gemini) {
    gemini = require('./gemini');
    if (db) gemini.setUsageRecorder(db.recordGeminiUsage);
  }
  return gemini;
}

// تخزين معلومات الحسابات النشطة وربطها بـ webContents IDs
const webviewInfoMap = new Map(); // webContentsId -> { accountId, accountName }
const captureHeartbeatState = new Map(); // accountId -> last preload capture-health snapshot

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'whatsi.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true, // ضروري لتفعيل <webview>
    },
    backgroundColor: '#111b21',
    show: false, // نخفيها حتى تتحمل بالكامل
  });

  mainWindow.loadFile('index.html');

  // نظهر النافذة بعد التحميل للحصول على تجربة أفضل
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // mainWindow.webContents.openDevTools();
}

// PostgreSQL is the source of truth; a transactional outbox feeds durable BullMQ jobs.
function redisConnectionOptions() {
  const raw = process.env.REDIS_URL;
  if (!raw) throw new Error('REDIS_URL غير مضبوط في ملف .env');
  const url = new URL(raw);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL يجب أن يبدأ بـ redis:// أو rediss://');
  const options = { host: url.hostname, port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.slice(1) || 0), maxRetriesPerRequest: null,
    enableReadyCheck: true, connectTimeout: 10000,
    retryStrategy: attempts => Math.min(attempts * 500, 5000) };
  if (url.protocol === 'rediss:') options.tls = {};
  return options;
}

async function publishPendingAudioJobs() {
  if (publishingAudioJobs || !db || !audioQueue) return;
  publishingAudioJobs = true;
  try {
    for (const job of await db.publishedAudioJobs()) {
      const activeJob = await audioQueue.getJob(job.job_id);
      if (!activeJob) await db.markAudioJobForRetry(job.audio_id);
      else if (await activeJob.getState() === 'completed') await db.completeAudioJob(job.audio_id);
    }
    for (const job of await db.pendingAudioJobs()) {
      const existing = await audioQueue.getJob(job.job_id);
      if (existing) {
        if (await existing.getState() === 'failed') await existing.retry('failed', { resetAttemptsMade: true });
      } else {
        await audioQueue.add('download-transcribe-audio', job.payload, {
          jobId: job.job_id, attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true, removeOnFail: 1000
        });
      }
      await db.markAudioJobPublished(job.job_id);
    }
  } catch (err) { console.error('[Queue] Could not publish pending audio jobs:', err.message); }
  finally { publishingAudioJobs = false; }
}

async function initializeServices() {
  db = require('./database');
  db.setAudioTimestampCutoff(audioTimestampCutoff);
  await db.initialize();
  getGemini();
  const connection = redisConnectionOptions();
  audioQueue = new Queue('whatsi-audio', { connection });
  await audioQueue.waitUntilReady();
  await purgeExpiredData();
  const staleAudioJobIds = await db.discardAudioJobsBefore(new Date(audioTimestampCutoff * 1000));
  for (const jobId of staleAudioJobIds) {
    try {
      const job = await audioQueue.getJob(jobId);
      if (job && await job.getState() !== 'active') await job.remove();
    } catch (err) {
      console.warn('[Retention] Could not remove pre-start audio job:', err.message);
    }
  }
  audioWorker = new Worker('whatsi-audio', processAudioJob, {
    connection, concurrency: Math.max(1, Math.min(4, Number(process.env.AUDIO_CONCURRENCY || 2)))
  });
  audioWorker.on('failed', (job, err) => {
    console.error(`[Queue] Audio job ${job?.id} failed:`, err.message);
    if (job && job.attemptsMade >= Number(job.opts.attempts || 1)) {
      db.markAudioJobForRetry(job.data.audioId).then(publishPendingAudioJobs).catch(dbErr => console.error('[Queue] Could not reschedule failed audio:', dbErr.message));
    }
  });
  audioWorker.on('error', err => console.error('[Queue] Worker connection error:', err.message));
  await audioWorker.waitUntilReady();
  await publishPendingAudioJobs();
  outboxTimer = setInterval(publishPendingAudioJobs, 2000);
  retentionTimer = setInterval(() => {
    purgeExpiredData().catch(err => console.error('[Retention] Automatic cleanup failed:', err.message));
  }, 10 * 60 * 1000);
  console.log('[Main] PostgreSQL and BullMQ/Redis are ready.');
}

// ===== استقبال الرسائل من الـ Webviews (عبر IPC) =====

/**
 * يستقبل رسالة واتساب ملتقطة من الـ preload script ويحفظها في PostgreSQL.
 */
ipcMain.on('new-message-captured', async (event, messageData) => {
  if (!db) return;

  console.log(`[Main] ← new-message-captured from: ${messageData.accountName} | customer: ${messageData.customerName} | sender: ${messageData.sender} | text: "${(messageData.text||'').substring(0,60)}"`);
  
  try {
    const savedId = await db.saveMessage(messageData);
    
    if (savedId) {
      console.log(`[Main] Message saved [${messageData.accountName}] ${messageData.sender}: "${messageData.text.substring(0, 50)}..."`);
      
      // إخطار الواجهة بالرسالة الجديدة (لتحديث العداد)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('message-count-updated');
      }
    } else {
      console.log(`[Main] Message ignored as duplicate or outside retention [${messageData.accountName}] ${messageData.sender} at ${messageData.timestamp}.`);
    }
  } catch (err) {
    console.error('[Main] Error saving message:', err);
  }
});

// A resolved WhatsApp LID→phone mapping also repairs prior records for that chat.
ipcMain.on('customer-phone-resolved', async (_event, data = {}) => {
  if (!db || typeof data.accountId !== 'string' || typeof data.chatId !== 'string' || typeof data.customerPhone !== 'string') return;
  try {
    const updated = await db.updateCustomerPhoneForChat(data.accountId, data.chatId, data.customerPhone);
    if (updated && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('message-count-updated');
    }
  } catch (err) {
    console.warn('[Main] Could not update resolved customer phone:', err.message);
  }
});

/**
 * نبضة حياة من الـ preload script.
 */
ipcMain.on('preload-heartbeat', (event, data) => {
  if (!data || !data.accountId) return;

  const key = String(data.accountId);
  const snapshot = {
    accountName: data.accountName || webviewInfoMap.get(event.sender.id)?.accountName || key,
    status: data.captureHookStatus || 'unknown',
    collectionHooked: Boolean(data.collectionHooked),
    wsIntercepted: Boolean(data.wsIntercepted),
    dispatchedMessageCount: Number(data.dispatchedMessageCount) || 0,
    dispatchedAudioCount: Number(data.dispatchedAudioCount) || 0,
    lastDispatchedAt: data.lastDispatchedAt || 'never',
  };
  const previous = captureHeartbeatState.get(key);
  if (!previous || Object.keys(snapshot).some(field => snapshot[field] !== previous[field])) {
    console.log(
      `[Capture Health] account=${snapshot.accountName} (${key}) status=${snapshot.status}` +
      ` hooked=${snapshot.collectionHooked} ws=${snapshot.wsIntercepted}` +
      ` text_sent=${snapshot.dispatchedMessageCount} audio_sent=${snapshot.dispatchedAudioCount}` +
      ` last_sent=${snapshot.lastDispatchedAt}`
    );
    captureHeartbeatState.set(key, snapshot);
  }
});

// ===== استقبال الرسائل الصوتية من الـ Webviews =====

// مجلد حفظ ملفات الصوت
const AUDIO_DIR = path.join(app.getPath('userData'), 'audio_messages');
const DATA_RETENTION_MS = 48 * 60 * 60 * 1000;

function deleteAudioFiles(audioFiles = []) {
  const audioDirectory = path.resolve(AUDIO_DIR);
  for (const audioFile of audioFiles) {
    const fullPath = path.resolve(audioFile);
    const relativePath = path.relative(audioDirectory, fullPath);
    if (!relativePath || relativePath.startsWith(`..${path.sep}`) || relativePath === '..' || path.isAbsolute(relativePath)) continue;
    try { fs.unlinkSync(fullPath); } catch (fileErr) {
      if (fileErr.code !== 'ENOENT') console.warn('[Retention] Could not delete audio file:', fileErr.message);
    }
  }
}

async function purgeExpiredData() {
  const result = await db.purgeExpiredData();
  deleteAudioFiles(result.audioFiles);
  if (audioQueue) {
    for (const audioId of result.audioIds) {
      try {
        const job = await audioQueue.getJob('audio-' + audioId);
        if (job && await job.getState() !== 'active') await job.remove();
      } catch (err) {
        console.warn('[Retention] Could not remove expired audio job:', err.message);
      }
    }
  }
  if (result.messages || result.audio) {
    console.log(`[Retention] Deleted expired data: ${result.messages} text and ${result.audio} audio messages.`);
  }
  return result;
}

/**
 * ينشئ مجلد الصوت عند الحاجة.
 */
function ensureAudioDir() {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    console.log('[Main] Created audio directory:', AUDIO_DIR);
  }
}

/**
 * يستقبل ملف صوت (ArrayBuffer) من preload، يحفظه OGG، ثم يُطلق تحليل Gemini.
 */
ipcMain.on('new-audio-captured', async (_event, data) => {
  if (!db) return;
  try {
    const result = await db.captureAudio(data);
    await publishPendingAudioJobs();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('message-count-updated');
    }
    if (result.inserted) console.log('[Main] Audio metadata saved:', result.id);
  } catch (err) {
    console.error('[Main] Error capturing audio:', err.message);
  }
});

async function processAudioJob(job) {
  const data = job.data;
  const existingRecord = await db.getAudioJobState(data.audioId);
  if (!existingRecord) return { deleted: true };
  if (Date.now() - new Date(existingRecord.timestamp).getTime() >= DATA_RETENTION_MS) return { expired: true };
  if (existingRecord.transcript !== null) {
    await db.completeAudioJob(data.audioId);
    return { alreadyTranscribed: true };
  }
  ensureAudioDir();
  let filePath = existingRecord.file_path && fs.existsSync(existingRecord.file_path) ? existingRecord.file_path : null;
  if (!filePath && data.mediaKey && (data.directPath || data.mediaUrl)) {
    const decrypted = await downloadAndDecryptAudio(data);
    if (!decrypted || decrypted.length <= 100) throw new Error('Downloaded audio is empty or invalid');
    filePath = path.join(AUDIO_DIR, 'audio_' + data.audioId + '.ogg');
    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, decrypted);
    fs.renameSync(tempPath, filePath);
    await db.updateAudioFilePath(data.audioId, filePath);
  } else if (!filePath && data.buffer && Array.isArray(data.buffer) && data.buffer.length > 100) {
    filePath = path.join(AUDIO_DIR, 'audio_' + data.audioId + '.ogg');
    fs.writeFileSync(filePath, Buffer.from(data.buffer));
    await db.updateAudioFilePath(data.audioId, filePath);
  }
  if (!filePath) {
    await db.completeAudioJob(data.audioId);
    return { metadataOnly: true };
  }
  // Re-check after download so an expired queued job cannot spend money on Gemini.
  if (!await db.getAudioJobState(data.audioId)) {
    deleteAudioFiles([filePath]);
    return { expired: true };
  }
  const result = await getGemini().transcribeAudio(filePath, data.sender, data.accountName, data.customerName, data.accountId);
  if (!result.success) throw new Error(result.error || 'Audio transcription failed');
  await db.updateAudioTranscript(data.audioId, result.transcript, result.toneAnalysis);
  await db.completeAudioJob(data.audioId);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('message-count-updated');
  }
  console.log('[Queue] Audio transcribed:', job.id);
  return { success: true };
}
/**
 * تنزيل وفك تشفير ملف صوتي من سيرفر واتساب
 * الخوارزمية: HKDF(SHA-256) → AES-256-CBC
 */
async function downloadAndDecryptAudio(data) {
  const https  = require('https');
  const crypto = require('crypto');

  // ─── 1. بناء URL التنزيل ──────────────────────────────────────────────────
  let downloadUrl = data.mediaUrl;

  if (!downloadUrl && data.directPath) {
    // directPath مثل: /v/t62.7118-24/filename.enc?ccb=...
    downloadUrl = `https://mmg.whatsapp.net${data.directPath}`;
  }

  if (!downloadUrl) throw new Error('No download URL available');

  console.log(`[Main] Downloading audio from: ${downloadUrl.slice(0, 80)}...`);

  // ─── 2. تنزيل الملف المشفر ───────────────────────────────────────────────
  const encBuffer = await new Promise((resolve, reject) => {
    const req = https.get(downloadUrl, {
      headers: {
        'User-Agent': 'WhatsApp/2.24.6.77 Mozilla/5.0',
        'Origin':  'https://web.whatsapp.com',
        'Referer': 'https://web.whatsapp.com/',
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from WhatsApp server`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
  });

  console.log(`[Main] Downloaded ${encBuffer.length} bytes (encrypted)`);

  // ─── 3. فك التشفير بـ HKDF + AES-256-CBC ────────────────────────────────
  // mediaKey هو base64
  const mediaKeyBytes = Buffer.from(data.mediaKey, 'base64');

  // HKDF لتوسيع الـ key لـ 112 بايت
  // info: "WhatsApp Audio Keys" للصوت و PTT
  const mediaKeyExpanded = hkdfExpand(mediaKeyBytes, 112, 'WhatsApp Audio Keys');

  const iv         = mediaKeyExpanded.slice(0,  16);
  const cipherKey  = mediaKeyExpanded.slice(16, 48);
  // macKey = mediaKeyExpanded.slice(48, 80) — للتحقق فقط

  // إزالة الـ 10 bytes الأخيرة (MAC / HMAC)
  const ciphertext = encBuffer.slice(0, encBuffer.length - 10);

  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  decipher.setAutoPadding(true);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  console.log(`[Main] Decrypted audio: ${decrypted.length} bytes`);

  return decrypted;
}

/**
 * HKDF Expand — توسيع المفتاح بـ SHA-256
 */
function hkdfExpand(inputKey, length, info) {
  const crypto = require('crypto');
  const salt   = Buffer.alloc(32, 0); // 32 bytes of zeros
  const infoBuffer = Buffer.from(info, 'utf-8');

  // Extract
  const prk = crypto.createHmac('sha256', salt).update(inputKey).digest();

  // Expand
  const result = Buffer.alloc(length);
  let prev     = Buffer.alloc(0);
  let offset   = 0;
  let counter  = 1;

  while (offset < length) {
    const hmac = crypto.createHmac('sha256', prk);
    hmac.update(prev);
    hmac.update(infoBuffer);
    hmac.update(Buffer.from([counter++]));
    prev = hmac.digest();
    const toCopy = Math.min(prev.length, length - offset);
    prev.copy(result, offset, 0, toCopy);
    offset += toCopy;
  }

  return result;
}

/**
 * الـ Renderer يطلب إرسال معلومات الحساب للـ webview.
 */
ipcMain.on('register-webview', (event, { webContentsId, accountId, accountName }) => {
  webviewInfoMap.set(webContentsId, { accountId, accountName });
  
  // إرسال معلومات الحساب للـ preload script داخل الـ webview
  try {
    const wc = require('electron').webContents.fromId(webContentsId);
    if (wc && !wc.isDestroyed()) {
      wc.send('set-account-info', { accountId, accountName, audioTimestampCutoff });
      console.log(`[Main] Account info sent to webview: ${accountName} (${accountId})`);
      wc.executeJavaScript('typeof window.__whatsiSetAccount')
        .then(type => console.log(`[Capture Health] preload-api account=${accountName} (${accountId}) type=${type}`))
        .catch(err => console.warn(`[Capture Health] preload-api check failed for ${accountName} (${accountId}): ${err.message}`));
    }
  } catch (err) {
    console.error('[Main] Error sending account info to webview:', err);
  }
});

// ===== IPC Handlers للواجهة الرسومية =====

/**
 * جلب إحصائيات اليوم.
 */
ipcMain.handle('get-today-stats', async (event, { accountId, date, period } = {}) => {
  if (!db) return { accounts: 0, chats: 0, total_messages: 0 };
  return await db.getTodayStats(date || null, accountId || null, period || 'today');
});

function buildAudioSummary(audioRows) {
  if (!audioRows.length) return null;
  const lines = audioRows.map((audio, index) => {
    const sender = audio.sender === 'sales' ? `💼 السيلز (${audio.account_name})` : `👤 العميل (${audio.customer_name})`;
    const formattedPhone = db.formatPhoneNumber(audio.customer_phone || '');
    const student = formattedPhone ? `رقم واتساب الطالب: ${formattedPhone}` : `رقم واتساب الطالب غير متاح؛ معرّف الشات: ${audio.chat_id || 'غير متاح'}`;
    const duration = audio.duration_sec ? ` مدة ${audio.duration_sec} ثانية` : '';
    const time = audio.display_time || formatCairoTime(new Date(audio.timestamp));
    if (audio.transcript) {
      const tone = audio.tone_analysis ? ` | نبرة الصوت: ${audio.tone_analysis}` : '';
      return `[${time}] 🎤 رسالة صوتية ${index + 1} — ${sender} | ${student}${duration}\nالتفريغ: "${audio.transcript}"${tone}`;
    }
    if (new Date(audio.timestamp).getTime() < audioTimestampCutoff * 1000) {
      return `[${time}] 🎤 رسالة صوتية ${index + 1} — ${sender} | ${student}${duration}\nℹ️ تم تجاوز تفريغها لأنها أقدم من حد بدء التطبيق لتجنب إعادة إرسالها إلى Gemini`;
    }
    return `[${time}] 🎤 رسالة صوتية ${index + 1} — ${sender} | ${student}${duration}\n⚠️ لم يتمكن النظام من جلب ملف الصوت لتفريغه`;
  });
  return `═══ الرسائل الصوتية المسجلة: ${audioRows.length} رسالة ═══\n${lines.join('\n\n')}`;
}

// Keep a verbatim, database-backed copy for the report UI. Gemini may discuss
// the audio, but must never be the source of the transcript/tone shown here.
function buildAudioEvidence(audioRows) {
  return audioRows.map(audio => ({
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
    tone: audio.tone_analysis == null ? '' : String(audio.tone_analysis)
  }));
}

function buildCurrentMessageTimes(messages, audioRows) {
  const byAccount = new Map();
  const events = [
    ...messages.map(row => ({ ...row, kind: 'نصية' })),
    ...audioRows.map(row => ({ ...row, kind: 'صوتية' }))
  ];
  for (const row of events) {
    const milliseconds = new Date(row.timestamp).getTime();
    if (!Number.isFinite(milliseconds)) continue;
    const accountId = row.account_id || 'unknown';
    if (!byAccount.has(accountId)) byAccount.set(accountId, { accountId, accountName: row.account_name || 'غير معروف', events: [] });
    const time = row.display_time || formatCairoTime(new Date(milliseconds));
    byAccount.get(accountId).events.push({ milliseconds, time, kind: row.kind, sender: row.sender });
  }
  return Object.fromEntries([...byAccount].map(([accountId, account]) => {
    account.events.sort((a, b) => a.milliseconds - b.milliseconds);
    const first = account.events[0] || null;
    const last = account.events.at(-1) || null;
    const lastSales = [...account.events].reverse().find(event => event.sender === 'sales') || null;
    const lastCustomer = [...account.events].reverse().find(event => event.sender === 'customer') || null;
    const summary = event => event ? { time: event.time, kind: event.kind } : null;
    return [accountId, { accountId, accountName: account.accountName, first: summary(first), last: summary(last),
      lastSales: summary(lastSales), lastCustomer: summary(lastCustomer) }];
  }));
}

/** Generate a report once, then send only new/changed message events to Gemini. */
ipcMain.handle('generate-daily-report', async (event, { accountId, period }) => {
  if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };
  period = period === 'last48h' ? 'last48h' : 'today';
  const selectedDate = db.getLocalDateString();
  const cutoffDate = db.getLocalDateString(new Date(Date.now() - DATA_RETENTION_MS));
  const cacheableDate = selectedDate > cutoffDate;
  const sourceVersion = await db.getDailyReportRevision(accountId || null, selectedDate, period);
  let cached = cacheableDate
    ? await db.getCachedDailyReport(accountId || null, selectedDate, sourceVersion, period, true, true)
    : null;

  const [messages, audioRows, dateStats, contacts] = await Promise.all([
    db.getTodayMessages(accountId || null, selectedDate, period),
    db.getAudioMessages(accountId || null, selectedDate, period),
    db.getTodayStats(selectedDate, accountId || null, period),
    db.getLeadFollowupContacts(accountId || null, selectedDate, period)
  ]);
  const manifest = db.buildReportInputManifest(messages, audioRows);
  // If a report from the previous format matches the exact same database
  // revision, adopt it without paying for a second full analysis. Otherwise
  // its coverage is unknown, so build a fresh report instead of guessing.
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
  }
  if (!cached && messages.length === 0 && audioRows.length === 0) {
    return { success: false, error: 'لا توجد رسائل محفوظة لهذه الفترة. تأكد من أن التطبيق كان يعمل والتقط الرسائل.' };
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
    messageTimesByAccount, period, calculatedAt: new Date().toISOString()
  };

  if (cached && !hasNewInputs) {
    return { ...cached, currentStats, leadCount: contacts.leadCount, followupCount: contacts.followupCount,
      monthlyScores: await db.getMonthlySalesScores(selectedDate.slice(0, 7), accountId || null),
      audioEvidence: buildAudioEvidence(audioRows), cached: true, noNewMessages: true };
  }

  getGemini();
  const fullText = cached ? null : await db.formatMessagesForGemini(accountId || null, selectedDate, period, messages, messages);
  const deltaText = cached
    ? await db.formatMessagesForGemini(accountId || null, selectedDate, period, newMessages, messages)
    : fullText;
  const textActivity = cached ? (dateStats.perAccount || {}) : (fullText.stats.perAccount || {});
  const reportDate = period === 'today'
    ? selectedDate.split('-').reverse().join('/')
    : `آخر 48 ساعة حتى ${formatCairoDateTime()}`;
  const reportStats = { ...dateStats, textActivityByAccount: textActivity,
    messageTimesByAccount, leadCount: contacts.leadCount, followupCount: contacts.followupCount, period };
  const audioSummary = buildAudioSummary(newAudioRows);

  let report;
  if (cached) {
    const delta = await gemini.analyzeDailyChatsDelta(
      deltaText.text || 'لا توجد رسائل نصية جديدة؛ يوجد تحديث صوتي موضح أدناه.',
      { ...reportStats, deltaChats: deltaText.stats.chats || newAudioRows.length },
      reportDate, audioSummary, cached.scores || [], accountId || null, period);
    if (!delta.success) return { success: false, error: delta.error, stats: currentStats };
    report = { ...cached, success: true, stats: reportStats,
      report: `${cached.report}\n\n---\n\n### ملحق تحديث — رسائل جديدة منذ آخر استخراج\n\n${delta.appendix}`,
      scores: delta.scores.length ? delta.scores : cached.scores, model: delta.model,
      incrementalUpdate: true, analyzedNewMessages: newMessages.length, analyzedNewAudio: newAudioRows.length };
  } else {
    report = await gemini.analyzeDailyChats(
      fullText.text || 'لا توجد رسائل نصية في هذه الفترة؛ توجد تسجيلات صوتية موضحة أدناه.',
      reportStats, reportDate, buildAudioSummary(audioRows), accountId || null, period);
  }

  if (report.success) {
    report.period = period;
    report.leadCount = contacts.leadCount;
    report.followupCount = contacts.followupCount;
    report.currentStats = currentStats;
    report.processedManifest = manifest;
    if (period === 'today' && Array.isArray(report.scores) && report.scores.length) {
      const leadCounts = {}, followupCounts = {};
      for (const contact of contacts.leads) leadCounts[contact.accountId] = (leadCounts[contact.accountId] || 0) + 1;
      for (const contact of contacts.followups) followupCounts[contact.accountId] = (followupCounts[contact.accountId] || 0) + 1;
      const conversationCounts = Object.fromEntries(Object.entries(dateStats.perAccount || {}).map(([id, row]) => [id, row.chats]));
      await db.saveSalesDailyScores(report.scores, { date: selectedDate, leadCounts, followupCounts, conversationCounts });
    }
    report.monthlyScores = await db.getMonthlySalesScores(selectedDate.slice(0, 7), accountId || null);
    if (period === 'last48h') {
      const timestamps = [...messages.map(row => row.timestamp), ...audioRows.map(row => row.timestamp)].map(value => new Date(value).getTime()).filter(Number.isFinite);
      if (timestamps.length) report.cacheValidUntil = new Date(timestamps.reduce((earliest, value) => Math.min(earliest, value), Infinity) + DATA_RETENTION_MS).toISOString();
    }
    if (cacheableDate) await db.storeDailyReportCache(accountId || null, selectedDate, sourceVersion, report, period);
  }
  if (report.success) report.audioEvidence = buildAudioEvidence(audioRows);
  return report;
});

ipcMain.handle('get-monthly-sales-scores', async (_event, { month, accountId } = {}) => {
  if (!db) return [];
  return db.getMonthlySalesScores(month || db.getLocalDateString().slice(0, 7), accountId || null);
});

/**
 * جلب الأرقام المميزة من DB (للتشخيص)
 */
ipcMain.handle('debug-customer-names', async () => {
  if (!db) return [];
  const result = await db.getPool().query("SELECT DISTINCT customer_name FROM messages WHERE timestamp >= NOW() - INTERVAL '48 hours' LIMIT 30");
  return result.rows;
});

/**
 * اختبار الاتصال بـ Gemini API.
 */
ipcMain.handle('test-gemini-connection', async () => {
  return await getGemini().testConnection();
});

/**
 * جلب رسائل اليوم لعرضها في الواجهة (للاطمئنان على التسجيل).
 */
ipcMain.handle('get-today-messages-preview', async (event, { accountId, period } = {}) => {
  if (!db) return [];
  const messages = await db.getTodayMessages(accountId, null, period || 'today');
  return messages.slice(-50); // آخر 50 رسالة فقط
});



/**
 * مسح رسائل اليوم
 */
ipcMain.handle('clear-today-messages', async (event, { date, accountId } = {}) => {
  if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };
  try {
    const result = await db.clearTodayMessages(date || null, accountId || null);
    deleteAudioFiles(result.audioFiles);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('message-count-updated');
    }
    const { audioFiles, ...counts } = result;
    return { success: true, ...counts };
  } catch (err) {
    return { success: false, error: err.message };
  }
});


// ===== حفظ الحسابات في ملف دائم =====

function getAccountsFilePath() {
  return path.join(app.getPath('userData'), 'accounts.json');
}

ipcMain.handle('load-accounts', async () => {
  try {
    const filePath = getAccountsFilePath();
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Main] Error loading accounts:', err);
    return [];
  }
});

ipcMain.handle('save-accounts', async (event, accounts) => {
  try {
    const filePath = getAccountsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(accounts, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error('[Main] Error saving accounts:', err);
    return { success: false, error: err.message };
  }
});

// ===== App Lifecycle =====



// فتح DevTools للـ webview (للـ debugging)
ipcMain.on('open-webview-devtools', (event, { webContentsId }) => {
  try {
    const wc = require('electron').webContents.fromId(webContentsId);
    if (wc && !wc.isDestroyed()) {
      wc.openDevTools({ mode: 'detach' });
      console.log('[Main] Opened DevTools for webview:', webContentsId);
    }
  } catch (err) {
    console.error('[Main] Error opening DevTools:', err);
  }
});

// ===== دالة ضبط صلاحيات session واتساب =====
// تُستدعى من Main Process لكل session خاص بحساب
function setupWhatsAppSession(partitionName) {
  const sess = session.fromPartition(partitionName);

  // السماح بجميع طلبات الصلاحيات
  sess.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true); // اسمح بكل شيء داخل واتساب
  });
}

// استقبال طلب إعداد session من الـ renderer عند إنشاء كل webview
ipcMain.on('setup-whatsapp-session', (event, { partition }) => {
  try {
    setupWhatsAppSession(partition);
  } catch (err) {
    console.error('[Main] Error setting up session:', err);
  }
});

app.whenReady().then(async () => {
  try {
    await initializeServices();
    createWindow();
  } catch (err) {
    console.error('[Main] Startup failed:', err);
    dialog.showErrorBox('تعذر تشغيل whatsi Z-ray', 'تأكد من إعداد PostgreSQL وRedis في ملف .env وأن الخدمتين تعملان.\n\n' + err.message);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let shuttingDown = false;
app.on('before-quit', event => {
  if (shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  if (outboxTimer) clearInterval(outboxTimer);
  if (retentionTimer) clearInterval(retentionTimer);
  Promise.allSettled([
    audioWorker?.close(), audioQueue?.close(), db?.close()
  ]).finally(() => app.quit());
});
