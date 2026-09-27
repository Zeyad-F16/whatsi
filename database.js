/**
 * database.js
 * طبقة قاعدة البيانات المحلية باستخدام SQLite.
 * مسؤولة عن حفظ واسترجاع رسائل واتساب.
 */

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

// مسار قاعدة البيانات في مجلد بيانات التطبيق
const DB_PATH = path.join(app.getPath('userData'), 'whatsi_messages.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  const d = getDb();
  
  // جدول الرسائل النصية
  d.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      account_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      sender TEXT NOT NULL CHECK(sender IN ('sales', 'customer')),
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      display_time TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_account_date 
    ON messages(account_id, timestamp);
    
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
    ON messages(timestamp);

    CREATE TABLE IF NOT EXISTS audio_messages (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id   TEXT NOT NULL,
      account_name TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      sender       TEXT NOT NULL CHECK(sender IN ('sales', 'customer')),
      file_path    TEXT NOT NULL,
      duration_sec INTEGER,
      transcript   TEXT,
      tone_analysis TEXT,
      timestamp    TEXT NOT NULL,
      display_time TEXT,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audio_account_date
    ON audio_messages(account_id, timestamp);
  `);
  
  console.log(`[Database] SQLite initialized at: ${DB_PATH}`);
}

/**
 * حفظ رسالة جديدة في قاعدة البيانات.
 */
function saveMessage(data) {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO messages (account_id, account_name, customer_name, sender, text, timestamp, display_time)
    VALUES (@accountId, @accountName, @customerName, @sender, @text, @timestamp, @displayTime)
  `);
  
  try {
    const result = stmt.run({
      accountId: data.accountId || 'unknown',
      accountName: data.accountName || 'Unknown Account',
      customerName: data.customerName || 'Unknown Customer',
      sender: data.sender || 'unknown',
      text: data.text || '',
      timestamp: data.timestamp || new Date().toISOString(),
      displayTime: data.displayTime || new Date().toLocaleTimeString('ar-EG')
    });
    return result.lastInsertRowid;
  } catch (err) {
    console.error('[Database] Error saving message:', err);
    return null;
  }
}

/**
 * حفظ رسالة صوتية في قاعدة البيانات.
 */
function saveAudioMessage(data) {
  const d = getDb();
  try {
    const result = d.prepare(`
      INSERT INTO audio_messages
        (account_id, account_name, customer_name, sender, file_path, duration_sec, transcript, tone_analysis, timestamp, display_time)
      VALUES
        (@accountId, @accountName, @customerName, @sender, @filePath, @durationSec, @transcript, @toneAnalysis, @timestamp, @displayTime)
    `).run({
      accountId:    data.accountId    || 'unknown',
      accountName:  data.accountName  || 'Unknown',
      customerName: data.customerName || 'Unknown',
      sender:       data.sender       || 'customer',
      filePath:     data.filePath     || '',
      durationSec:  data.durationSec  || null,
      transcript:   data.transcript   || null,
      toneAnalysis: data.toneAnalysis || null,
      timestamp:    data.timestamp    || new Date().toISOString(),
      displayTime:  data.displayTime  || '',
    });
    return result.lastInsertRowid;
  } catch (err) {
    console.error('[Database] Error saving audio message:', err);
    return null;
  }
}

/**
 * تحديث transcript وتحليل النبرة لرسالة صوتية.
 */
function updateAudioTranscript(id, transcript, toneAnalysis) {
  const d = getDb();
  d.prepare(`
    UPDATE audio_messages SET transcript = ?, tone_analysis = ? WHERE id = ?
  `).run(transcript || '', toneAnalysis || '', id);
}

/**
 * جلب الرسائل الصوتية لتاريخ معين.
 */
function getAudioMessages(accountId = null, date = null) {
  const d = getDb();
  const targetDate = date || getLocalDateString();
  let query = `
    SELECT * FROM audio_messages
    WHERE DATE(datetime(timestamp, 'localtime')) = ?
  `;
  const params = [targetDate];
  if (accountId) { query += ' AND account_id = ?'; params.push(accountId); }
  query += ' ORDER BY timestamp ASC';
  return d.prepare(query).all(...params);
}

function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


/**
 * جلب رسائل اليوم مجمعة حسب الحساب والعميل.
 * @param {string|null} accountId - اختياري: فلترة حسب حساب محدد
 * @param {string|null} date - اختياري: تاريخ محدد بصيغة YYYY-MM-DD (default: اليوم)
 */
function getTodayMessages(accountId = null, date = null) {
  const d = getDb();
  const targetDate = date || getLocalDateString();
  
  let query = `
    SELECT 
      account_id,
      account_name,
      customer_name,
      sender,
      text,
      timestamp,
      display_time
    FROM messages
    WHERE DATE(datetime(timestamp, 'localtime')) = ?
  `;
  
  const params = [targetDate];
  
  if (accountId) {
    query += ' AND account_id = ?';
    params.push(accountId);
  }
  
  query += ' ORDER BY account_id, customer_name, timestamp ASC';
  
  const rows = d.prepare(query).all(...params);
  return rows;
}


/**
 * تنسيق رقم الهاتف بفورمات دولي — مثال: "201034450569" → "+20 10 3445 0569"
 */
function formatPhoneNumber(raw) {
  if (!raw) return raw;

  // إذا كان الاسم يحتوي على حروف (اسم حقيقي) لا نلمسه
  if (/[a-zA-Z\u0600-\u06FF]/.test(raw)) return raw;

  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return raw;

  const countryFormats = [
    { code: '20',  local: 10, fmt: (d) => `+20 ${d.slice(0,2)} ${d.slice(2,6)} ${d.slice(6)}` },
    { code: '20',  local: 9,  fmt: (d) => `+20 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },       // مصر
    { code: '966', local: 9,  fmt: (d) => `+966 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // السعودية
    { code: '971', local: 9,  fmt: (d) => `+971 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // الإمارات
    { code: '965', local: 8,  fmt: (d) => `+965 ${d.slice(0,4)} ${d.slice(4)}` },                      // الكويت
    { code: '974', local: 8,  fmt: (d) => `+974 ${d.slice(0,4)} ${d.slice(4)}` },                      // قطر
    { code: '973', local: 8,  fmt: (d) => `+973 ${d.slice(0,4)} ${d.slice(4)}` },                      // البحرين
    { code: '968', local: 8,  fmt: (d) => `+968 ${d.slice(0,4)} ${d.slice(4)}` },                      // عُمان
    { code: '962', local: 9,  fmt: (d) => `+962 ${d.slice(0,1)} ${d.slice(1,5)} ${d.slice(5)}` },      // الأردن
    { code: '961', local: 8,  fmt: (d) => `+961 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // لبنان
    { code: '963', local: 9,  fmt: (d) => `+963 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // سوريا
    { code: '967', local: 9,  fmt: (d) => `+967 ${d.slice(0,1)} ${d.slice(1,4)} ${d.slice(4)}` },      // اليمن
    { code: '218', local: 9,  fmt: (d) => `+218 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // ليبيا
    { code: '212', local: 9,  fmt: (d) => `+212 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // المغرب
    { code: '216', local: 8,  fmt: (d) => `+216 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // تونس
    { code: '213', local: 9,  fmt: (d) => `+213 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // الجزائر
    { code: '249', local: 9,  fmt: (d) => `+249 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },      // السودان
  ];

  for (const country of countryFormats) {
    if (digits.startsWith(country.code)) {
      const local = digits.slice(country.code.length);
      if (local.length === country.local) {
        return country.fmt(local);
      }
    }
  }

  // fallback: +كود البلد + تقسيم الباقي
  if (digits.length >= 10) {
    const cc  = digits.slice(0, digits.length - 10);
    const num = digits.slice(-10);
    return `+${cc} ${num.slice(0,3)} ${num.slice(3,6)} ${num.slice(6)}`.trim();
  }

  return `+${digits}`;
}

/**
 * تجميع الرسائل في هيكل منظم حسب الحساب والعميل.
 */
function formatMessagesForGemini(accountId = null, date = null) {
  const rows = getTodayMessages(accountId, date);
  
  if (rows.length === 0) {
    return { text: null, stats: { accounts: 0, chats: 0, messages: 0 } };
  }

  // تجميع حسب الحساب ثم العميل
  const grouped = {};
  
  for (const row of rows) {
    // تنسيق اسم العميل إذا كان رقم هاتف
    const customerDisplay = formatPhoneNumber(row.customer_name);

    if (!grouped[row.account_id]) {
      grouped[row.account_id] = {
        accountName: row.account_name,
        chats: {},
        allMessages: []
      };
    }
    if (!grouped[row.account_id].chats[customerDisplay]) {
      grouped[row.account_id].chats[customerDisplay] = [];
    }
    // نستخدم نسخة مُعدَّلة من الـ row بالاسم المنسَّق
    const displayRow = { ...row, customer_name: customerDisplay };
    grouped[row.account_id].chats[customerDisplay].push(displayRow);
    grouped[row.account_id].allMessages.push(displayRow);
  }

  // ─── حساب إحصائيات سرعة الرد لكل سيلز ───────────────────────────────────
  function calcResponseStats(accData) {
    const responseTimes = []; // بالثواني

    for (const messages of Object.values(accData.chats)) {
      // نرتب الرسائل حسب timestamp
      const sorted = [...messages].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        // نحسب الوقت بين رسالة عميل ورد السيلز التالي
        if (prev.sender === 'customer' && curr.sender === 'sales') {
          const diffSec = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000;
          if (diffSec > 0 && diffSec < 3600) { // نتجاهل فجوات أكثر من ساعة
            responseTimes.push({ sec: diffSec, time: curr.display_time || curr.timestamp });
          }
        }
      }
    }

    if (responseTimes.length === 0) {
      return { avg: null, fastest: null, slowest: null };
    }

    const avg = responseTimes.reduce((s, r) => s + r.sec, 0) / responseTimes.length;
    const fastest = responseTimes.reduce((a, b) => a.sec < b.sec ? a : b);
    const slowest = responseTimes.reduce((a, b) => a.sec > b.sec ? a : b);

    return {
      avg:     Math.round(avg),
      fastest: { sec: Math.round(fastest.sec), at: fastest.time },
      slowest: { sec: Math.round(slowest.sec), at: slowest.time },
      count:   responseTimes.length
    };
  }

  function fmtDuration(sec) {
    if (sec === null) return 'غير متاح';
    if (sec < 60)  return `${sec} ث`;
    if (sec < 3600) return `${Math.floor(sec / 60)} د ${sec % 60} ث`;
    return `${Math.floor(sec / 3600)} س ${Math.floor((sec % 3600) / 60)} د`;
  }

  // تحويل إلى نص منظم
  let formattedText = '';
  let totalChats = 0;
  const perAccountStats = {};

  for (const [accId, accData] of Object.entries(grouped)) {
    const customerCount = Object.keys(accData.chats).length;

    formattedText += `\n${'='.repeat(60)}\n`;
    formattedText += `👤 ممثل المبيعات: ${accData.accountName}\n`;
    formattedText += `👥 عدد العملاء المختلفين اليوم: ${customerCount} عميل\n`;

    // ─── إحصائيات الوقت لهذا السيلز ───
    const allSorted = [...accData.allMessages].sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    const firstMsg = allSorted[0];
    const lastMsg  = allSorted[allSorted.length - 1];
    const resp     = calcResponseStats(accData);

    formattedText += `⏰ أول رسالة: ${firstMsg.display_time || firstMsg.timestamp}`;
    if (firstMsg.sender === 'sales') formattedText += ` (صادرة للعميل: ${firstMsg.customer_name})`;
    else formattedText += ` (واردة من العميل: ${firstMsg.customer_name})`;
    formattedText += `\n`;

    formattedText += `⏰ آخر رسالة: ${lastMsg.display_time || lastMsg.timestamp}`;
    if (lastMsg.sender === 'sales') formattedText += ` (صادرة للعميل: ${lastMsg.customer_name})`;
    else formattedText += ` (واردة من العميل: ${lastMsg.customer_name})`;
    formattedText += `\n`;

    if (resp.avg !== null) {
      formattedText += `⚡ متوسط سرعة الرد: ${fmtDuration(resp.avg)} (من ${resp.count} رد)\n`;
      formattedText += `🏆 أسرع رد: ${fmtDuration(resp.fastest.sec)} (عند ${resp.fastest.at})\n`;
      formattedText += `🐢 أبطأ رد: ${fmtDuration(resp.slowest.sec)} (عند ${resp.slowest.at})\n`;
    }

    formattedText += `${'='.repeat(60)}\n\n`;

    // حفظ للـ stats
    perAccountStats[accData.accountName] = {
      customerCount,
      firstMsg: firstMsg.display_time || firstMsg.timestamp,
      lastMsg:  lastMsg.display_time  || lastMsg.timestamp,
      responseStats: resp
    };

    for (const [customerName, messages] of Object.entries(accData.chats)) {
      totalChats++;
      formattedText += `--- محادثة مع العميل: ${customerName} ---\n`;
      
      for (const msg of messages) {
        const senderLabel = msg.sender === 'sales'
          ? `💼 ${accData.accountName} (السيلز)`
          : `👤 ${customerName} (العميل)`;
        formattedText += `[${msg.display_time || msg.timestamp}] ${senderLabel}: ${msg.text}\n`;
      }
      formattedText += '\n';
    }
  }

  return {
    text: formattedText,
    stats: {
      accounts: Object.keys(grouped).length,
      chats: totalChats,
      messages: rows.length,
      perAccount: perAccountStats
    }
  };
}

/**
 * إحصائيات سريعة — مع دعم تاريخ محدد.
 */
function getTodayStats(date = null, accountId = null) {
  const d = getDb();
  const targetDate = date || getLocalDateString();

  let query = `
    SELECT 
      COUNT(DISTINCT account_id) as accounts,
      COUNT(DISTINCT account_id || '|' || customer_name) as chats,
      COUNT(*) as total_messages,
      COUNT(CASE WHEN sender = 'sales' THEN 1 END) as sales_messages,
      COUNT(CASE WHEN sender = 'customer' THEN 1 END) as customer_messages
    FROM messages
    WHERE DATE(datetime(timestamp, 'localtime')) = ?
  `;
  const params = [targetDate];

  if (accountId) {
    query += ' AND account_id = ?';
    params.push(accountId);
  }

  const stats = d.prepare(query).get(...params);
  return stats || { accounts: 0, chats: 0, total_messages: 0, sales_messages: 0, customer_messages: 0 };
}

/**
 * حذف رسائل قديمة (أكثر من 30 يوم).
 */
function cleanupOldMessages() {
  const d = getDb();
  const result = d.prepare(`
    DELETE FROM messages 
    WHERE timestamp < datetime('now', '-30 days')
  `).run();
  
  console.log(`[Database] Cleaned up ${result.changes} old messages.`);
  return result.changes;
}

/**
 * مسح رسائل اليوم (لإعادة التعيين والتجربة).
 */
function clearTodayMessages(date = null) {
  const d = getDb();
  const targetDate = date || getLocalDateString();
  const result = d.prepare(`
    DELETE FROM messages 
    WHERE DATE(datetime(timestamp, 'localtime')) = ?
  `).run(targetDate);
  return result.changes;
}

module.exports = {
  saveMessage,
  saveAudioMessage,
  updateAudioTranscript,
  getAudioMessages,
  getTodayMessages,
  formatMessagesForGemini,
  getTodayStats,
  cleanupOldMessages,
  clearTodayMessages,
  getLocalDateString,
  getDb,
  DB_PATH
};

