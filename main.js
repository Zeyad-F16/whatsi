/**
 * main.js
 * العملية الرئيسية (Main Process) لتطبيق Whatsi.
 * مسؤولة عن:
 * - إدارة نوافذ التطبيق
 * - استقبال الرسائل من الـ webviews عبر IPC
 * - حفظها في SQLite
 * - التواصل مع Gemini API لتوليد التقارير
 */

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

// تحميل متغيرات البيئة من .env
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ===== إعدادات محرك Chromium لمنع رسائل الكاش غير المؤثرة في التيرمينال =====
app.commandLine.appendSwitch('log-level', '3'); // إخفاء رسائل Chromium C++ الداخلية
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache'); // منع تضارب كاش الرسوميات
app.commandLine.appendSwitch('ignore-certificate-errors');

// قاعدة البيانات وGemini - يتم استيرادهم بعد جهوزية التطبيق
let db;
let gemini;


let mainWindow;

// تخزين معلومات الحسابات النشطة وربطها بـ webContents IDs
const webviewInfoMap = new Map(); // webContentsId -> { accountId, accountName }

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

// ===== تهيئة قاعدة البيانات =====
// قائمة انتظار للرسائل الواردة قبل جهوزية DB
const messageQueue = [];
const audioQueue   = [];

function initDatabase() {
  try {
    db = require('./database');
    console.log('[Main] Database initialized successfully.');
    db.cleanupOldMessages();
    cleanupOldAudioFiles();

    // تفريغ قائمة الانتظار
    if (messageQueue.length > 0) {
      console.log(`[Main] Flushing ${messageQueue.length} queued messages...`);
      messageQueue.forEach(data => {
        try { db.saveMessage(data); } catch(e) {}
      });
      messageQueue.length = 0;
    }
    if (audioQueue.length > 0) {
      console.log(`[Main] Flushing ${audioQueue.length} queued audio messages...`);
      audioQueue.forEach(data => processAudio(data));
      audioQueue.length = 0;
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('message-count-updated', db.getTodayStats());
    }
  } catch (err) {
    console.error('[Main] Failed to initialize database:', err);
  }
}

// ===== استقبال الرسائل من الـ Webviews (عبر IPC) =====

/**
 * يستقبل رسالة واتساب ملتقطة من الـ preload script ويحفظها في SQLite.
 */
ipcMain.on('new-message-captured', (event, messageData) => {
  if (!db) {
    messageQueue.push(messageData);
    console.log(`[Main] DB not ready — queued message (${messageQueue.length} in queue)`);
    return;
  }

  console.log(`[Main] ← new-message-captured from: ${messageData.accountName} | customer: ${messageData.customerName} | sender: ${messageData.sender} | text: "${(messageData.text||'').substring(0,60)}"`);
  
  try {
    const savedId = db.saveMessage(messageData);
    
    if (savedId) {
      console.log(`[Main] Message saved [${messageData.accountName}] ${messageData.sender}: "${messageData.text.substring(0, 50)}..."`);
      
      // إخطار الواجهة بالرسالة الجديدة (لتحديث العداد)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('message-count-updated', db.getTodayStats());
      }
    }
  } catch (err) {
    console.error('[Main] Error saving message:', err);
  }
});

/**
 * نبضة حياة من الـ preload script.
 */
ipcMain.on('preload-heartbeat', (event, data) => {
  // يمكن استخدامه لمراقبة حالة الـ webviews
  // console.log(`[Main] Heartbeat from ${data.accountId}`);
});

// ===== استقبال الرسائل الصوتية من الـ Webviews =====

// مجلد حفظ ملفات الصوت
const AUDIO_DIR = path.join(app.getPath('userData'), 'audio_messages');

/**
 * حذف الملفات الصوتية الأقدم من 15 يوماً لتوفير مساحة القرص.
 */
function cleanupOldAudioFiles() {
  try {
    if (!fs.existsSync(AUDIO_DIR)) return;
    const cutoff = Date.now() - (15 * 24 * 60 * 60 * 1000); // 15 يوم
    const files  = fs.readdirSync(AUDIO_DIR);
    let deleted  = 0;
    for (const file of files) {
      if (!file.endsWith('.ogg')) continue;
      const filePath = path.join(AUDIO_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      } catch (_) {}
    }
    if (deleted > 0) console.log(`[Main] Cleaned up ${deleted} old audio files.`);
  } catch (err) {
    console.error('[Main] Audio cleanup error:', err.message);
  }
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
ipcMain.on('new-audio-captured', async (event, data) => {
  if (!db) {
    audioQueue.push(data);
    console.log(`[Main] DB not ready — queued audio (${audioQueue.length} in queue)`);
    return;
  }
  processAudio(data);
});

// ─── Queue لتحليل الصوت بتوازٍ محدود للحفاظ على السرعة وحدود API ─────────────
const transcriptionQueue = [];
let transcriptionRunning = 0;
const MAX_PARALLEL_TRANSCRIPTIONS = 2;

function enqueueTranscription(filePath, sender, accountName, customerName, audioId) {
  transcriptionQueue.push({ filePath, sender, accountName, customerName, audioId });
  processTranscriptionQueue();
}

function processTranscriptionQueue() {
  while (transcriptionRunning < MAX_PARALLEL_TRANSCRIPTIONS && transcriptionQueue.length > 0) {
    const item = transcriptionQueue.shift();
    transcriptionRunning++;
    (async () => {
      try {
        if (!gemini) gemini = require('./gemini');
        const result = await gemini.transcribeAudio(
          item.filePath, item.sender, item.accountName, item.customerName
        );
        if (result.success && item.audioId) {
          db.updateAudioTranscript(item.audioId, result.transcript, result.toneAnalysis);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('message-count-updated', db.getTodayStats());
          }
          console.log(`[Main] ✅ Audio transcribed (${transcriptionQueue.length} remaining)`);
        }
      } catch (err) {
        console.error('[Main] Transcription error:', err.message);
      } finally {
        transcriptionRunning--;
        processTranscriptionQueue();
      }
    })();
  }
}

async function processAudio(data) {
  try {
    if (data.messageId && db.hasAudioMessage(data.messageId, data.accountId)) return;
    ensureAudioDir();

    let filePath = null;

    // ─── تنزيل وفك تشفير الملف الصوتي من سيرفر واتساب ──────────────────────
    if (data.mediaKey && (data.directPath || data.mediaUrl)) {
      try {
        const decrypted = await downloadAndDecryptAudio(data);
        if (decrypted && decrypted.length > 100) {
          const fileName = `audio_${Date.now()}_${data.sender}.ogg`;
          filePath = path.join(AUDIO_DIR, fileName);
          fs.writeFileSync(filePath, decrypted);
          console.log(`[Main] Audio decrypted & saved: ${fileName} (${decrypted.length} bytes)`);
        }
      } catch (decryptErr) {
        console.warn(`[Main] Audio decryption failed: ${decryptErr.message}`);
      }
    }

    // ─── تنزيل من buffer مباشر (fallback قديم) ───────────────────────────────
    if (!filePath && data.buffer && Array.isArray(data.buffer) && data.buffer.length > 100) {
      const fileName = `audio_${Date.now()}_${data.sender}.ogg`;
      filePath = path.join(AUDIO_DIR, fileName);
      fs.writeFileSync(filePath, Buffer.from(data.buffer));
      console.log(`[Main] Audio saved from buffer: ${path.basename(filePath)}`);
    }

    if (!filePath) {
      console.log(`[Main] Audio metadata only | ${data.accountName} → ${data.customerName} | ${data.durationSec || '?'}s`);
    }

    // حفظ السجل في DB
    const audioId = db.saveAudioMessage({
      messageId:    data.messageId,
      accountId:    data.accountId,
      accountName:  data.accountName,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      chatId:        data.chatId,
      sender:       data.sender,
      filePath:     filePath || '',
      durationSec:  data.durationSec || null,
      timestamp:    data.timestamp   || new Date().toISOString(),
      displayTime:  data.displayTime || '',
    });

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('message-count-updated', db.getTodayStats());
    }

    // تحليل الصوت عبر queue (لتجنب Quota exceeded)
    if (filePath && audioId) {
      enqueueTranscription(filePath, data.sender, data.accountName, data.customerName, audioId);
    }

  } catch (err) {
    console.error('[Main] Error processing audio:', err.message);
  }
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
      wc.send('set-account-info', { accountId, accountName });
      console.log(`[Main] Account info sent to webview: ${accountName} (${accountId})`);
    }
  } catch (err) {
    console.error('[Main] Error sending account info to webview:', err);
  }
});

// ===== IPC Handlers للواجهة الرسومية =====

/**
 * جلب إحصائيات اليوم.
 */
ipcMain.handle('get-today-stats', async (event, { accountId, date } = {}) => {
  if (!db) return { accounts: 0, chats: 0, total_messages: 0 };
  return db.getTodayStats(date || null, accountId || null);
});

/**
 * توليد تقرير يومي شامل عبر Gemini.
 */
ipcMain.handle('generate-daily-report', async (event, { accountId, date }) => {
  if (!db) {
    return { success: false, error: 'قاعدة البيانات غير متاحة' };
  }

  const { text: formattedChats, stats } = db.formatMessagesForGemini(accountId, date);
  const audioRows = db.getAudioMessages(accountId, date);
  
  if (!formattedChats && audioRows.length === 0) {
    return { 
      success: false, 
      error: 'لا توجد رسائل محفوظة لليوم المحدد. تأكد من أن التطبيق كان مشغلاً وتم التقاط الرسائل.' 
    };
  }

  if (!gemini) gemini = require('./gemini');

  // ─── بناء ملخص الرسائل الصوتية ─────────────────────────────────────────
  let audioSummary = null;
  try {
    if (audioRows.length > 0) {
      const lines = audioRows.map((a, i) => {
        const senderLabel = a.sender === 'sales'
          ? `💼 السيلز (${a.account_name})`
          : `👤 العميل (${a.customer_name})`;
        const dur = a.duration_sec ? ` مدة ${a.duration_sec} ثانية` : '';
        const time = a.display_time || a.timestamp;

        if (a.transcript) {
          const tone = a.tone_analysis ? ` | نبرة الصوت: ${a.tone_analysis}` : '';
          return `[${time}] 🎤 رسالة صوتية ${i+1} — ${senderLabel}${dur}\nالتفريغ: "${a.transcript}"${tone}`;
        } else {
          // لا يوجد تفريغ — نذكر المعلومات المتاحة
          return `[${time}] 🎤 رسالة صوتية ${i+1} — ${senderLabel}${dur}\n⚠️ لم يتمكن النظام من جلب ملف الصوت لتفريغه — خذ في الاعتبار وجود هذه الرسالة الصوتية عند التقييم`;
        }
      });
      audioSummary = `═══ الرسائل الصوتية المُسجَّلة: ${audioRows.length} رسالة ═══\n` + lines.join('\n\n');
      console.log(`[Main] Audio summary built: ${audioRows.length} messages`);
    }
  } catch (e) {
    console.warn('[Main] Could not load audio messages:', e.message);
  }

  const reportDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date.split('-').reverse().join('-')
    : new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

  // Keep report totals scoped to the same selected account and date as its messages.
  const dateStats = db.getTodayStats(date || null, accountId || null);
  const report = await gemini.analyzeDailyChats(formattedChats || 'لا توجد رسائل نصية في هذا اليوم؛ توجد تسجيلات صوتية موضحة أدناه.', dateStats, reportDate, audioSummary);
  if (report.success) {
    report.customerNumbers = db.getCustomerNumbers(accountId || null, date || null);
  }
  return report;
});

/**
 * جلب الأرقام المميزة من DB (للتشخيص)
 */
ipcMain.handle('debug-customer-names', async () => {
  if (!db) return [];
  const d = db.getDb ? db.getDb() : require('better-sqlite3')(db.DB_PATH);
  return d.prepare('SELECT DISTINCT customer_name FROM messages LIMIT 30').all();
});

/**
 * اختبار الاتصال بـ Gemini API.
 */
ipcMain.handle('test-gemini-connection', async () => {
  if (!gemini) {
    gemini = require('./gemini');
  }
  return await gemini.testConnection();
});

/**
 * جلب رسائل اليوم لعرضها في الواجهة (للاطمئنان على التسجيل).
 */
ipcMain.handle('get-today-messages-preview', async (event, { accountId } = {}) => {
  if (!db) return [];
  const messages = db.getTodayMessages(accountId);
  return messages.slice(-50); // آخر 50 رسالة فقط
});



/**
 * مسح رسائل اليوم
 */
ipcMain.handle('clear-today-messages', async (event, { date, accountId } = {}) => {
  if (!db) return { success: false, error: 'قاعدة البيانات غير متاحة' };
  try {
    const result = db.clearTodayMessages(date || null, accountId || null);
    const audioDirectory = path.resolve(AUDIO_DIR);
    for (const audioFile of result.audioFiles) {
      const fullPath = path.resolve(audioFile);
      const relativePath = path.relative(audioDirectory, fullPath);
      if (relativePath && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath)) {
        try { fs.unlinkSync(fullPath); } catch (fileErr) {
          if (fileErr.code !== 'ENOENT') console.warn('[Main] Could not delete audio file:', fileErr.message);
        }
      }
    }
    const stats = db.getTodayStats(date || null, accountId || null);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('message-count-updated', stats);
    }
    const { audioFiles, ...counts } = result;
    return { success: true, ...counts, stats };
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

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  console.log('[Main] App closing. Database saved.');
});
