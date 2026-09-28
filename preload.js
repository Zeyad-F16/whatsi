/**
 * preload.js — Whatsi Message Interceptor
 *
 * الاستراتيجية:
 * ─────────────
 * 1. نعترض WebSocket مباشرة من preload context (بدون script injection)
 *    لأن contextIsolation=false يجعل window مشتركاً بين preload والصفحة.
 *    نستبدل window.WebSocket قبل أن تستخدمه واتساب ويب.
 *
 * 2. بعد تحميل واتساب، نستخدم window.require('WAWebCollections').Msg
 *    للاستماع لأحداث الرسائل الجديدة من كل الشاتات في الخلفية.
 */

const { ipcRenderer } = require('electron');

// ─── معلومات الحساب ──────────────────────────────────────────────────────────
let accountId   = null;
let accountName = null;

ipcRenderer.on('set-account-info', (_e, info) => {
  accountId   = info.accountId;
  accountName = info.accountName;
  console.log(`[Whatsi] Account set: ${accountName} (${accountId})`);
});

window.__whatsiSetAccount = (id, name) => {
  accountId   = id;
  accountName = name;
  console.log(`[Whatsi] Account set (js): ${accountName}`);
};

// ─── تنسيق رقم الهاتف بفورمات دولي ─────────────────────────────────────────
// مثال: "201034450569" → "+20 10 3445 0569"
// مثال: "966512345678" → "+966 51 234 5678"
function formatPhoneNumber(raw) {
  if (!raw) return 'عميل';

  // إزالة أي شيء غير أرقام
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7) return raw;

  // رقم مصري محلي: 01012345678 أو 1012345678 → الصيغة الدولية +20.
  if (/^01[0125]\d{8}$/.test(digits)) {
    const local = digits.slice(1);
    return `+20 ${local.slice(0,2)} ${local.slice(2,6)} ${local.slice(6)}`;
  }
  if (/^1[0125]\d{8}$/.test(digits)) {
    return `+20 ${digits.slice(0,2)} ${digits.slice(2,6)} ${digits.slice(6)}`;
  }

  // أكواد الدول الشائعة مع طريقة تقسيم الأرقام
  const countryFormats = [
    // مصر: +20 + 10 أرقام
    { code: '20',  local: 10, fmt: (d) => `+20 ${d.slice(0,2)} ${d.slice(2,6)} ${d.slice(6)}` },
    { code: '20',  local: 9,  fmt: (d) => `+20 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
    // السعودية: +966 + 9 أرقام
    { code: '966', local: 9,  fmt: (d) => `+966 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
    // الإمارات: +971 + 9 أرقام
    { code: '971', local: 9,  fmt: (d) => `+971 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
    // الكويت: +965 + 8 أرقام
    { code: '965', local: 8,  fmt: (d) => `+965 ${d.slice(0,4)} ${d.slice(4)}` },
    // قطر: +974 + 8 أرقام
    { code: '974', local: 8,  fmt: (d) => `+974 ${d.slice(0,4)} ${d.slice(4)}` },
    // البحرين: +973 + 8 أرقام
    { code: '973', local: 8,  fmt: (d) => `+973 ${d.slice(0,4)} ${d.slice(4)}` },
    // عُمان: +968 + 8 أرقام
    { code: '968', local: 8,  fmt: (d) => `+968 ${d.slice(0,4)} ${d.slice(4)}` },
    // الأردن: +962 + 9 أرقام
    { code: '962', local: 9,  fmt: (d) => `+962 ${d.slice(0,1)} ${d.slice(1,5)} ${d.slice(5)}` },
    // لبنان: +961 + 7-8 أرقام
    { code: '961', local: 8,  fmt: (d) => `+961 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
    // المغرب: +212 + 9 أرقام
    { code: '212', local: 9,  fmt: (d) => `+212 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
    // تونس: +216 + 8 أرقام
    { code: '216', local: 8,  fmt: (d) => `+216 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
    // الجزائر: +213 + 9 أرقام
    { code: '213', local: 9,  fmt: (d) => `+213 ${d.slice(0,2)} ${d.slice(2,5)} ${d.slice(5)}` },
  ];

  for (const country of countryFormats) {
    if (digits.startsWith(country.code)) {
      let localPart = digits.slice(country.code.length);
      // بعض المصادر تضع صفر الاتصال المحلي بعد كود الدولة.
      if (localPart.length === country.local + 1 && localPart.startsWith('0')) {
        localPart = localPart.slice(1);
      }
      if (localPart.length === country.local) {
        return country.fmt(localPart);
      }
    }
  }

  // للأرقام الدولية غير المدرجة، احتفظ بكل الأرقام ولا تخترع كود دولة.
  if (digits.length >= 11) return `+${digits}`;
  return raw;
}

// نأخذ رقم الاتصال فقط من معرف واتساب الهاتفي؛ معرفات LID ليست أرقامًا قابلة للاتصال.
function getCustomerWhatsAppNumber(chatId) {
  if (!chatId || !/@(?:c\.us|s\.whatsapp\.net)$/.test(chatId)) return '';
  const digits = chatId.split('@')[0].replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  const formatted = formatPhoneNumber(digits);
  // لا نعرض رقمًا محليًا بلا كود دولة على أنه رقم دولي موثوق.
  return formatted.startsWith('+') ? formatted : '';
}

function isNonCustomerChat(chatId) {
  return typeof chatId === 'string' && /(?:@g\.us|@broadcast|@newsletter)$/i.test(chatId);
}

function getCustomerPhoneNumber(chatId, chat) {
  const direct = getCustomerWhatsAppNumber(chatId);
  if (direct) return direct;
  const contactId = chat?.contact?.id?._serialized
    ?? chat?.contact?.get?.('id')?._serialized
    ?? chat?.contact?.get?.('id')
    ?? '';
  const serialized = typeof contactId === 'string'
    ? contactId
    : contactId?._serialized || (contactId?.user && contactId?.server
      ? `${contactId.user}@${contactId.server}`
      : '');
  return getCustomerWhatsAppNumber(serialized);
}
const sent = new Set();
function dedup(id) {
  if (sent.has(id)) return false;
  sent.add(id);
  if (sent.size > 20000) sent.clear();
  return true;
}

// ─── إرسال رسالة للـ Main Process ────────────────────────────────────────────
function dispatch(msg) {
  if (!msg.text || msg.text.trim().length === 0) return;
  ipcRenderer.send('new-message-captured', {
    messageId:    msg.messageId || null,
    chatId:       msg.chatId || null,
    accountId:    accountId   || 'account-default',
    accountName:  accountName || 'سيلز',
    customerName: msg.customerName || 'عميل',
    customerPhone: msg.customerPhone || '',
    sender:       msg.isOut ? 'sales' : 'customer',
    text:         msg.text.trim(),
    timestamp:    msg.timestamp || new Date().toISOString(),
    displayTime:  msg.displayTime || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
  });
  console.log(`[Whatsi] ✉ ${msg.isOut ? 'OUT→' : 'IN←'} "${msg.text.slice(0, 60)}" | ${msg.customerName}`);
}

// ─── اعتراض URL.createObjectURL لالتقاط blob URLs الصوتية ──────────────────
// واتساب ويب ينشئ blob URL لكل رسالة صوتية عند تشغيلها أو معالجتها
;(function interceptObjectURL() {
  const _createObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function(obj) {
    const url = _createObjectURL(obj);
    // نتحقق إذا كان blob صوتي
    if (obj instanceof Blob && obj.type && obj.type.includes('audio')) {
      window.__whatsiLastAudioUrl = url;
      window.__whatsiLastAudioBlob = obj;
      console.log('[Whatsi] Intercepted audio blob URL:', url, 'type:', obj.type, 'size:', obj.size);
    }
    return url;
  };
})();
// contextIsolation=false → window مشترك → نستبدل WebSocket قبل استخدامه
;(function interceptWebSocket() {
  if (window.__whatsiWsIntercepted) return;

  const OrigWS = window.WebSocket;
  if (!OrigWS) {
    // WebSocket لم يتعرّف بعد — نعيد المحاولة
    setTimeout(interceptWebSocket, 100);
    return;
  }

  function WhatsiWebSocket(url, protocols) {
    const ws = protocols
      ? new OrigWS(url, protocols)
      : new OrigWS(url);

    // نراقب كل frame وارد
    ws.addEventListener('message', () => {
      // WebSocket نشط → نحاول hook الـ Collection إن لم يحدث بعد
      if (!collectionHooked) tryHookCollection();
    });

    return ws;
  }

  // نُبقي على كل خصائص WebSocket
  WhatsiWebSocket.prototype             = OrigWS.prototype;
  WhatsiWebSocket.CONNECTING            = OrigWS.CONNECTING;
  WhatsiWebSocket.OPEN                  = OrigWS.OPEN;
  WhatsiWebSocket.CLOSING               = OrigWS.CLOSING;
  WhatsiWebSocket.CLOSED                = OrigWS.CLOSED;
  Object.defineProperty(WhatsiWebSocket, 'name', { value: 'WebSocket' });

  window.WebSocket = WhatsiWebSocket;
  window.__whatsiWsIntercepted = true;
  console.log('[Whatsi] WebSocket intercepted ✓');
})();

// ─── الطبقة 2: WAWebCollections.Msg ──────────────────────────────────────────
let collectionHooked = false;

function tryHookCollection() {
  if (collectionHooked) return true;
  if (typeof window.require !== 'function') return false;

  // نتأكد أن واتساب ويب اكتمل تحميله قبل استدعاء WAWebCollections
  // علامة الجهوزية: وجود #app مع data-testid="startup-skeleton" مختفٍ
  const app = document.getElementById('app');
  if (!app) return false;
  // لو لا يزال في شاشة التحميل، ننتظر
  if (app.querySelector('[data-testid="startup-skeleton"]')) return false;
  // لو لا يزال QR code screen فقط، نكمل (المستخدم لم يسجّل دخول بعد)

  let collections;
  try {
    collections = window.require('WAWebCollections');
  } catch (e) {
    // المكتبة لم تُحمَّل بعد أو لديها unresolved dependencies — ننتظر
    return false;
  }

  // نتأكد أن الـ Msg collection موجود ومكتمل
  const MsgCollection = collections?.Msg || collections?.default?.Msg;
  if (!MsgCollection || typeof MsgCollection.on !== 'function') return false;

  // تأكد إضافي: الـ collection يحتوي على models (واتساب محمّل بالكامل)
  const models = MsgCollection.getModelsArray?.() || MsgCollection.models;
  if (!models) return false; // لم يكتمل التهيئة بعد

  MsgCollection.on('add', onMsgModel);

  // قراءة الرسائل الحالية في الذاكرة (آخر 50)
  try {
    const existing = MsgCollection.getModelsArray?.() || MsgCollection.models || [];
    const recent = existing.slice(-50);
    recent.forEach(onMsgModel);
    console.log(`[Whatsi] Read ${recent.length} existing messages from memory.`);
  } catch (_) {}

  collectionHooked = true;
  console.log('[Whatsi] ✅ WAWebCollections.Msg hooked — all chats monitored in background.');
  return true;
}

// ─── Set لمنع تكرار الصوتيات ────────────────────────────────────────────────
const sentAudio = new Set();

/**
 * معالجة رسالة صوتية — نجلب الـ blob من URL المؤقت ونرسله للـ Main Process.
 */
async function onAudioModel(model) {
  try {
    // dedup — نبني fingerprint من id أو من chatId + timestamp
    const rawId = model.id?._serialized ?? model.get?.('id')?._serialized ?? '';
    const tSec  = model.get?.('t') ?? model.t ?? Math.floor(Date.now() / 1000);
    const chatId = model.id?.remote?._serialized
                ?? model.get?.('id')?.remote?._serialized ?? '';
    if (isNonCustomerChat(chatId)) return;
    const chat = model.get?.('chat')
              ?? window.require?.('WAWebCollections')?.Chat?.get?.(chatId);
    // fingerprint مضمون حتى لو rawId فارغ
    const fingerprint = rawId || `${chatId}|${tSec}`;
    if (sentAudio.has(fingerprint)) return;
    sentAudio.add(fingerprint);
    if (sentAudio.size > 2000) sentAudio.clear();

    // اسم العميل
    let customerName = 'عميل';
    try {
      const nameFromChat    = chat?.get?.('name') ?? chat?.name;
      const nameFromContact = chat?.contact?.get?.('name') ?? chat?.contact?.name
                           ?? chat?.contact?.get?.('pushname') ?? chat?.contact?.pushname;
      const rawPhone = chatId.split('@')[0];
      customerName = nameFromChat ?? nameFromContact
                  ?? (rawPhone ? formatPhoneNumber(rawPhone) : 'عميل');
    } catch (_) {}

    const isOut = model.id?.fromMe === true
               || model.get?.('id')?.fromMe === true
               || model.fromMe === true;

    const tDate = new Date(tSec * 1000);

    // مدة الصوت بالثواني (إذا متوفرة)
    const durationSec = model.get?.('duration') ?? model.duration ?? null;

    // ─── جلب بيانات الميديا من الـ model ──────────────────────────────────────
    // لا نستخدم downloadMedia() (مكسورة منذ يوليو 2026 بسبب LID)
    // بدلاً من ذلك نأخذ mediaKey + directPath ونُرسلهما للـ Main Process
    // الذي يتولى التنزيل وفك التشفير مباشرة من سيرفر واتساب

    const mediaKey     = model.get?.('mediaKey')        ?? model.mediaKey        ?? null;
    const directPath   = model.get?.('directPath')       ?? model.directPath      ?? null;
    const encFilehash  = model.get?.('encFilehash')      ?? model.encFilehash     ?? null;
    const fileLength   = model.get?.('size')             ?? model.size            ?? 0;
    const mimetype     = model.get?.('mimetype')         ?? model.mimetype        ?? 'audio/ogg; codecs=opus';

    // URL بديل في حالة وجوده
    const mediaUrl = model.get?.('clientUrl') ?? model.clientUrl
                  ?? model.get?.('deprecatedMms3Url') ?? model.deprecatedMms3Url
                  ?? null;

    if (mediaKey && (directPath || mediaUrl)) {
      console.log(`[Whatsi] 🎤 Audio keys available — sending to Main for decryption`);
    } else {
      console.warn(`[Whatsi] 🎤 Audio missing mediaKey or URL — metadata only`);
    }

    ipcRenderer.send('new-audio-captured', {
      messageId:    rawId || null,
      chatId,
      accountId:    accountId   || 'account-default',
      accountName:  accountName || 'سيلز',
      customerName: formatPhoneNumber(customerName),
      customerPhone: getCustomerPhoneNumber(chatId, chat),
      sender:       isOut ? 'sales' : 'customer',
      // بيانات فك التشفير (بدلاً من buffer مباشر)
      mediaKey,
      directPath,
      mediaUrl,
      encFilehash,
      fileLength,
      mimetype,
      // buffer فارغ دائماً الآن (التنزيل يتم في Main Process)
      buffer:       null,
      durationSec,
      timestamp:    tDate.toISOString(),
      displayTime:  tDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    });

    console.log(`[Whatsi] 🎤 Audio ${isOut ? 'OUT→' : 'IN←'} | ${customerName} | ${durationSec ? durationSec + 'ث' : '?ث'}`);

  } catch (e) {
    console.error('[Whatsi] onAudioModel error:', e.message);
  }
}

function onMsgModel(model) {
  try {
    if (!model) return;

    const type = model.get?.('type') ?? model.type ?? '';

    // ─── رسائل صوتية (ptt = push-to-talk, audio) ───────────────────────────
    if (type === 'ptt' || type === 'audio') {
      onAudioModel(model);
      return;
    }

    // ─── رسائل نصية ─────────────────────────────────────────────────────────
    const allowedTypes = ['chat', 'text', 'extended_text', 'buttons_response',
                          'list_response', 'template_button_reply', ''];
    if (type && !allowedTypes.includes(type)) return;

    const body = model.get?.('body') ?? model.body ?? model.get?.('caption') ?? '';
    if (!body || String(body).trim().length === 0) return;

    // dedup
    const rawId = model.id?._serialized ?? model.get?.('id')?._serialized ?? '';
    if (rawId && !dedup(rawId)) return;

    const isOut = model.id?.fromMe === true
               || model.get?.('id')?.fromMe === true
               || model.fromMe === true;

    // اسم العميل
    let customerName = 'عميل';
    let customerPhone = '';
    let chatId = '';
    try {
      chatId = model.id?.remote?._serialized
                  ?? model.get?.('id')?.remote?._serialized
                  ?? '';
      if (isNonCustomerChat(chatId)) return;

      const chat = model.get?.('chat')
                ?? window.require?.('WAWebCollections')?.Chat?.get?.(chatId);
      customerPhone = getCustomerPhoneNumber(chatId, chat);

      const nameFromChat    = chat?.get?.('name')    ?? chat?.name;
      const nameFromContact = chat?.contact?.get?.('name')     ?? chat?.contact?.name
                           ?? chat?.contact?.get?.('pushname') ?? chat?.contact?.pushname;
      const rawPhone        = chatId.split('@')[0];

      customerName = nameFromChat
                  ?? nameFromContact
                  ?? (rawPhone ? formatPhoneNumber(rawPhone) : 'عميل');
    } catch (_) {}

    // وقت الرسالة
    const tSec = model.get?.('t') ?? model.t ?? Math.floor(Date.now() / 1000);
    const tDate = new Date(tSec * 1000);

    dispatch({
      messageId: rawId || null,
      chatId,
      customerName: formatPhoneNumber(customerName),
      customerPhone,
      isOut,
      text:        String(body).trim(),
      timestamp:   tDate.toISOString(),
      displayTime: tDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    });
  } catch (_) {}
}

// ─── محاولة دورية لـ hook الـ Collection ─────────────────────────────────────
// نبدأ بمحاولات بطيئة (3 ثواني) حتى يكتمل تحميل واتساب
// ثم نتسارع (1.5 ثانية) بعد ظهور الـ app
const hookTimer = setInterval(() => {
  // لو واتساب لم يُحمَّل بعد نبطّئ المحاولة
  const appReady = !!document.getElementById('app') &&
                   !document.querySelector('[data-testid="startup-skeleton"]');
  if (!appReady) return; // ننتظر دورة أخرى

  if (tryHookCollection()) clearInterval(hookTimer);
}, 2000);
setTimeout(() => clearInterval(hookTimer), 300000);

// ─── نبضة حياة ───────────────────────────────────────────────────────────────
setInterval(() => {
  if (accountId) {
    ipcRenderer.send('preload-heartbeat', {
      accountId,
      collectionHooked,
      wsIntercepted: !!window.__whatsiWsIntercepted,
      timestamp: new Date().toISOString(),
    });
  }
}, 30000);

console.log('[Whatsi Preload] Loaded ✓');
