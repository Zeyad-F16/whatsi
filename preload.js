/**
 * preload.js — whatsi Z-ray Message Interceptor
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
const crypto = require('crypto');
const { formatCairoTime } = require('./timezone');
const DATA_RETENTION_MS = 48 * 60 * 60 * 1000;

function isWithinDataRetention(timestampSeconds) {
  const milliseconds = Number(timestampSeconds) * 1000;
  return Number.isFinite(milliseconds) && milliseconds >= Date.now() - DATA_RETENTION_MS;
}

// ─── معلومات الحساب ──────────────────────────────────────────────────────────
let accountId   = null;
let accountName = null;
let audioTimestampCutoffSeconds = Math.floor(Date.now() / 1000) - 300;
let captureHookStatus = 'waiting-account-info';
let dispatchedMessageCount = 0;
let dispatchedAudioCount = 0;
let lastDispatchedAt = null;

function setCaptureHookStatus(status) {
  if (captureHookStatus === status) return;
  captureHookStatus = status;
  console.log(`[Whatsi] Capture hook status: ${status}`);
  sendCaptureHeartbeat();
}

function sendCaptureHeartbeat() {
  if (!accountId) return;
  ipcRenderer.send('preload-heartbeat', {
    accountId,
    accountName,
    collectionHooked,
    captureHookStatus,
    dispatchedMessageCount,
    dispatchedAudioCount,
    lastDispatchedAt,
    wsIntercepted: !!window.__whatsiWsIntercepted,
    timestamp: new Date().toISOString(),
  });
}

ipcRenderer.on('set-account-info', (_e, info) => {
  accountId   = info.accountId;
  accountName = info.accountName;
  if (Number.isFinite(info.audioTimestampCutoff)) audioTimestampCutoffSeconds = info.audioTimestampCutoff;
  console.log(`[Whatsi] Account set: ${accountName} (${accountId})`);
  sendCaptureHeartbeat();
});

window.__whatsiSetAccount = (id, name, cutoffSeconds) => {
  accountId   = id;
  accountName = name;
  if (Number.isFinite(cutoffSeconds)) audioTimestampCutoffSeconds = cutoffSeconds;
  console.log(`[Whatsi] Account set (js): ${accountName}`);
  sendCaptureHeartbeat();
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
  if (!chatId || !/@(?:c\.us|s\.whatsapp\.net)$/i.test(chatId)) return '';
  const digits = chatId.split('@')[0].replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  const formatted = formatPhoneNumber(digits);
  // لا نعرض رقمًا محليًا بلا كود دولة على أنه رقم دولي موثوق.
  return formatted.startsWith('+') ? formatted : '';
}

function serializeWhatsAppId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value._serialized === 'string') return value._serialized;
  if (value.user && value.server) return `${value.user}@${value.server}`;
  return '';
}

function serializeMessageId(model) {
  const key = safeModelValue(model, 'id');
  const serialized = serializeWhatsAppId(key);
  if (serialized) return serialized;

  // Some WhatsApp builds expose the MessageKey fields without _serialized.
  if (key && typeof key === 'object' && key.id != null && typeof key.fromMe === 'boolean') {
    const remote = serializeWhatsAppId(key.remote);
    if (remote) return `${key.fromMe}_${remote}_${key.id}`;
  }

  return '';
}

function fallbackMessageId({ chatId, timestampSeconds, sender, kind, content = '' }) {
  const stableParts = [accountId || 'account-default', chatId || '', timestampSeconds, sender, kind, content];
  return `fallback:${crypto.createHash('sha256').update(stableParts.join('\u0000')).digest('hex')}`;
}

function getPhoneFromPhoneField(value) {
  const serialized = serializeWhatsAppId(value);
  const direct = getCustomerWhatsAppNumber(serialized);
  if (direct) return direct;

  // Some WA builds expose contact.phoneNumber as a bare formatted number.
  if (typeof value !== 'string' || !/^[+\d\s().-]+$/.test(value.trim())) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return '';
  const formatted = formatPhoneNumber(digits);
  return formatted.startsWith('+') ? formatted : '';
}

function safeModelValue(model, key) {
  try { return model?.get?.(key) ?? model?.[key] ?? null; }
  catch (_) { return model?.[key] ?? null; }
}

const lidPhoneCache = new Map();
const pendingLidLookups = new Map();
const recentLidLookupAttempts = new Map();
let lidLookupQueue = Promise.resolve();

function queryLidOnWhatsApp(wid) {
  const lookup = lidLookupQueue.then(async () => {
    // Keep remote fallback lookups serialized to avoid bursts against WhatsApp.
    await new Promise(resolve => setTimeout(resolve, 250));
    const query = window.require?.('WAWebQueryExistsJob');
    if (typeof query?.queryWidExists !== 'function') return null;
    return query.queryWidExists(wid);
  });
  lidLookupQueue = lookup.catch(() => null);
  return lookup;
}

async function resolveLidPhoneNumber(lid, allowRemoteLookup = true) {
  if (!/@lid$/i.test(lid || '')) return '';
  if (lidPhoneCache.has(lid)) return lidPhoneCache.get(lid);
  if (pendingLidLookups.has(lid)) return pendingLidLookups.get(lid);

  const lookup = (async () => {
    try {
      const widFactory = window.require?.('WAWebWidFactory');
      const apiContact = window.require?.('WAWebApiContact');
      if (typeof widFactory?.createWid !== 'function' || typeof apiContact?.getPhoneNumber !== 'function') return '';

      const wid = widFactory.createWid(lid);
      let phone = getPhoneFromPhoneField(apiContact.getPhoneNumber(wid));
      if (phone) {
        lidPhoneCache.set(lid, phone);
        return phone;
      }

      if (!allowRemoteLookup) return '';
      const lastAttempt = recentLidLookupAttempts.get(lid) || 0;
      if (Date.now() - lastAttempt < 15 * 60 * 1000) return '';
      recentLidLookupAttempts.set(lid, Date.now());

      await queryLidOnWhatsApp(wid);
      phone = getPhoneFromPhoneField(apiContact.getPhoneNumber(wid));
      if (phone) lidPhoneCache.set(lid, phone);
      return phone;
    } catch (error) {
      console.warn('[Whatsi] Could not resolve a WhatsApp LID to a phone number:', error.message);
      return '';
    }
  })();

  pendingLidLookups.set(lid, lookup);
  try { return await lookup; }
  finally { pendingLidLookups.delete(lid); }
}

function isNonCustomerChat(chatId) {
  return typeof chatId === 'string' && /(?:@g\.us|@broadcast|@newsletter)$/i.test(chatId);
}

async function getCustomerPhoneNumber(chatId, chat, allowRemoteLookup = true) {
  const direct = getCustomerWhatsAppNumber(chatId);
  if (direct) return direct;

  const contact = safeModelValue(chat, 'contact') || chat?.contact;
  const phoneCandidates = [
    safeModelValue(contact, 'phoneNumber'), contact?.phoneNumber,
    safeModelValue(chat, 'phoneNumber'), chat?.phoneNumber
  ];
  for (const candidate of phoneCandidates) {
    const phone = getPhoneFromPhoneField(candidate);
    if (phone) return phone;
  }

  const contactId = safeModelValue(contact, 'id') || contact?.id;
  const contactSerialized = serializeWhatsAppId(contactId);
  const contactPhone = getCustomerWhatsAppNumber(contactSerialized);
  if (contactPhone) return contactPhone;

  const lid = /@lid$/i.test(chatId || '') ? chatId : contactSerialized;
  const resolved = await resolveLidPhoneNumber(lid, allowRemoteLookup);
  if (resolved) return resolved;

  // A visible contact name may itself be a phone number; accept it only when
  // the whole value is numeric/formatted phone text, never extract from names.
  return getPhoneFromPhoneField(safeModelValue(chat, 'name') || chat?.name);
}

function saveResolvedPhone(account, chatId, phone) {
  if (!phone || !chatId || !account) return;
  ipcRenderer.send('customer-phone-resolved', { accountId: account.id, chatId, customerPhone: phone });
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
    displayTime:  msg.displayTime || formatCairoTime(),
  });
  dispatchedMessageCount++;
  lastDispatchedAt = new Date().toISOString();
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
let hookedMsgCollection = null;
let msgCollectionAddHandler = null;
let msgCollectionResetHandler = null;
let msgCollectionSyncHandler = null;
let messageRecoveryTimer = null;
let messageRecoveryRunning = false;
let messageRecoveryRequested = false;

async function recoverRecentMessages(collection = hookedMsgCollection) {
  if (!collection || messageRecoveryRunning) {
    if (collection) messageRecoveryRequested = true;
    return;
  }
  messageRecoveryRunning = true;
  try {
    do {
      messageRecoveryRequested = false;
      const rawModels = collection.getModelsArray?.() || collection.models || [];
      const models = Array.isArray(rawModels) ? rawModels : Object.values(rawModels);
      const cutoffSeconds = Math.floor((Date.now() - DATA_RETENTION_MS) / 1000);
      const recent = models.filter(model => {
        const timestamp = Number(safeModelValue(model, 't'));
        return Number.isFinite(timestamp) && timestamp >= cutoffSeconds;
      });
      for (let index = 0; index < recent.length; index += 20) {
        await Promise.all(recent.slice(index, index + 20)
          .map(model => onMsgModel(model, { allowRemoteLookup: false, startupBackfill: true })));
      }
      console.log(`[Whatsi] Recovered ${recent.length} in-memory messages from the last 48 hours.`);
    } while (messageRecoveryRequested && collection === hookedMsgCollection);
  } catch (error) {
    console.error('[Whatsi] Recent-message recovery failed:', error?.message || error);
  } finally {
    messageRecoveryRunning = false;
    if (messageRecoveryRequested && hookedMsgCollection) scheduleRecentMessageRecovery();
  }
}

function scheduleRecentMessageRecovery() {
  if (messageRecoveryTimer) clearTimeout(messageRecoveryTimer);
  messageRecoveryTimer = setTimeout(() => {
    messageRecoveryTimer = null;
    void recoverRecentMessages();
  }, 1000);
}

function tryHookCollection() {
  if (!accountId) { setCaptureHookStatus('waiting-account-info'); return false; }
  if (typeof window.require !== 'function') { setCaptureHookStatus('node-require-unavailable'); return false; }

  // نتأكد أن واتساب ويب اكتمل تحميله قبل استدعاء WAWebCollections
  // علامة الجهوزية: وجود #app مع data-testid="startup-skeleton" مختفٍ
  const app = document.getElementById('app');
  if (!app) { setCaptureHookStatus('waiting-whatsapp-dom'); return false; }
  // لو لا يزال في شاشة التحميل، ننتظر
  if (app.querySelector('[data-testid="startup-skeleton"]')) { setCaptureHookStatus('whatsapp-loading'); return false; }
  // لو لا يزال QR code screen فقط، نكمل (المستخدم لم يسجّل دخول بعد)

  let collections;
  try {
    collections = window.require('WAWebCollections');
  } catch (e) {
    // المكتبة لم تُحمَّل بعد أو لديها unresolved dependencies — ننتظر
    setCaptureHookStatus('wa-collections-module-unavailable');
    return false;
  }

  // نتأكد أن الـ Msg collection موجود ومكتمل
  const MsgCollection = collections?.Msg || collections?.default?.Msg;
  if (!MsgCollection || typeof MsgCollection.on !== 'function') { setCaptureHookStatus('message-collection-unavailable'); return false; }

  // تأكد إضافي: الـ collection يحتوي على models (واتساب محمّل بالكامل)
  const models = MsgCollection.getModelsArray?.() || MsgCollection.models;
  if (!models) { setCaptureHookStatus('message-models-not-ready'); return false; }

  if (collectionHooked && hookedMsgCollection === MsgCollection) {
    setCaptureHookStatus('hooked');
    return true;
  }
  if (hookedMsgCollection) {
    try {
      if (msgCollectionAddHandler) hookedMsgCollection.off?.('add', msgCollectionAddHandler);
      if (msgCollectionResetHandler) hookedMsgCollection.off?.('reset', msgCollectionResetHandler);
      if (msgCollectionSyncHandler) hookedMsgCollection.off?.('sync', msgCollectionSyncHandler);
    } catch (_) {}
  }

  msgCollectionAddHandler = model => { void onMsgModel(model); };
  msgCollectionResetHandler = scheduleRecentMessageRecovery;
  msgCollectionSyncHandler = scheduleRecentMessageRecovery;
  MsgCollection.on('add', msgCollectionAddHandler);
  MsgCollection.on('reset', msgCollectionResetHandler);
  MsgCollection.on('sync', msgCollectionSyncHandler);
  hookedMsgCollection = MsgCollection;
  collectionHooked = true;
  setCaptureHookStatus('hooked');

  // استعد من الحالة الحالية، وأعد الفحص بعد كل مزامنة أو إعادة بناء للمجموعة.
  void recoverRecentMessages(MsgCollection);

  console.log('[Whatsi] ✅ WAWebCollections.Msg hooked — all chats monitored in background.');
  return true;
}

// ─── Set لمنع تكرار الصوتيات ────────────────────────────────────────────────
const sentAudio = new Set();

/**
 * معالجة رسالة صوتية — نجلب الـ blob من URL المؤقت ونرسله للـ Main Process.
 */
async function onAudioModel(model, options = {}) {
  try {
    // dedup — نبني fingerprint من id أو من chatId + timestamp
    const rawId = serializeMessageId(model);
    const tSec  = model.get?.('t') ?? model.t ?? Math.floor(Date.now() / 1000);
    if (!isWithinDataRetention(tSec)) return;
    const allowTranscription = !options.startupBackfill && Number(tSec) >= audioTimestampCutoffSeconds;
    const chatId = model.id?.remote?._serialized
                ?? model.get?.('id')?.remote?._serialized ?? '';
    if (isNonCustomerChat(chatId)) return;
    const isOut = model.id?.fromMe === true
               || model.get?.('id')?.fromMe === true
               || model.fromMe === true;
    const sender = isOut ? 'sales' : 'customer';
    const durationSec = model.get?.('duration') ?? model.duration ?? null;
    const encFilehash = model.get?.('encFilehash') ?? model.encFilehash ?? '';
    const mimetype = model.get?.('mimetype') ?? model.mimetype ?? '';
    const fileLength = model.get?.('size') ?? model.size ?? 0;
    const messageId = rawId || fallbackMessageId({
      chatId, timestampSeconds: tSec, sender, kind: 'audio',
      content: [encFilehash, durationSec, mimetype, fileLength].join('|')
    });
    const chat = model.get?.('chat')
              ?? window.require?.('WAWebCollections')?.Chat?.get?.(chatId);
    const fingerprint = messageId;
    if (sentAudio.has(fingerprint)) return;
    sentAudio.add(fingerprint);
    if (sentAudio.size > 2000) sentAudio.clear();

    const customerPhone = await getCustomerPhoneNumber(chatId, chat, allowTranscription && options.allowRemoteLookup !== false);
    if (customerPhone) saveResolvedPhone({ id: accountId || 'account-default' }, chatId, customerPhone);
    if (options.resolveOnly) return;

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

    const tDate = new Date(tSec * 1000);

    // مدة الصوت بالثواني (إذا متوفرة)
    // ─── جلب بيانات الميديا من الـ model ──────────────────────────────────────
    // لا نستخدم downloadMedia() (مكسورة منذ يوليو 2026 بسبب LID)
    // بدلاً من ذلك نأخذ mediaKey + directPath ونُرسلهما للـ Main Process
    // الذي يتولى التنزيل وفك التشفير مباشرة من سيرفر واتساب

    const mediaKey     = model.get?.('mediaKey')        ?? model.mediaKey        ?? null;
    const directPath   = model.get?.('directPath')       ?? model.directPath      ?? null;
    const audioEncFilehash = encFilehash || null;
    const audioMimetype = mimetype || 'audio/ogg; codecs=opus';

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
      messageId,
      chatId,
      accountId:    accountId   || 'account-default',
      accountName:  accountName || 'سيلز',
      customerName: formatPhoneNumber(customerName),
      customerPhone,
      sender:       isOut ? 'sales' : 'customer',
      // بيانات فك التشفير (بدلاً من buffer مباشر)
      mediaKey:     allowTranscription ? mediaKey : null,
      directPath:   allowTranscription ? directPath : null,
      mediaUrl:     allowTranscription ? mediaUrl : null,
      encFilehash:  allowTranscription ? audioEncFilehash : null,
      fileLength:   allowTranscription ? fileLength : 0,
      mimetype: audioMimetype,
      // buffer فارغ دائماً الآن (التنزيل يتم في Main Process)
      buffer:       null,
      durationSec,
      timestamp:    tDate.toISOString(),
      displayTime:  formatCairoTime(tDate),
    });
    dispatchedAudioCount++;
    lastDispatchedAt = new Date().toISOString();

    console.log(`[Whatsi] 🎤 Audio ${isOut ? 'OUT→' : 'IN←'} | ${customerName} | ${durationSec ? durationSec + 'ث' : '?ث'}`);

  } catch (e) {
    console.error('[Whatsi] onAudioModel error:', e.message);
  }
}

async function onMsgModel(model, options = {}) {
  try {
    if (!model) return;

    const type = model.get?.('type') ?? model.type ?? '';

    // ─── رسائل صوتية (ptt = push-to-talk, audio) ───────────────────────────
    if (type === 'ptt' || type === 'audio') {
      await onAudioModel(model, options);
      return;
    }

    // ─── رسائل نصية ─────────────────────────────────────────────────────────
    const allowedTypes = ['chat', 'text', 'extended_text', 'buttons_response',
                          'list_response', 'template_button_reply', ''];
    if (type && !allowedTypes.includes(type)) return;

    const body = model.get?.('body') ?? model.body ?? model.get?.('caption') ?? '';
    if (!body || String(body).trim().length === 0) return;

    const tSec = model.get?.('t') ?? model.t ?? Math.floor(Date.now() / 1000);
    if (!isWithinDataRetention(tSec)) return;
    const allowRemoteLookup = Number(tSec) >= audioTimestampCutoffSeconds && options.allowRemoteLookup !== false;

    const rawId = serializeMessageId(model);

    const isOut = model.id?.fromMe === true
               || model.get?.('id')?.fromMe === true
               || model.fromMe === true;

    // اسم العميل
    let customerName = 'عميل';
    let customerPhone = '';
    let chatId = '';
    let messageId = rawId;
    try {
      chatId = model.id?.remote?._serialized
                  ?? model.get?.('id')?.remote?._serialized
                  ?? '';
      if (isNonCustomerChat(chatId)) return;

      messageId = messageId || fallbackMessageId({
        chatId, timestampSeconds: tSec, sender: isOut ? 'sales' : 'customer',
        kind: 'text', content: String(body).trim()
      });
      if (!dedup(messageId)) return;

      const chat = model.get?.('chat')
                ?? window.require?.('WAWebCollections')?.Chat?.get?.(chatId);
      customerPhone = await getCustomerPhoneNumber(chatId, chat, allowRemoteLookup);
      if (customerPhone) saveResolvedPhone({ id: accountId || 'account-default' }, chatId, customerPhone);
      if (options.resolveOnly) return;

      const nameFromChat    = chat?.get?.('name')    ?? chat?.name;
      const nameFromContact = chat?.contact?.get?.('name')     ?? chat?.contact?.name
                           ?? chat?.contact?.get?.('pushname') ?? chat?.contact?.pushname;
      const rawPhone        = chatId.split('@')[0];

      customerName = nameFromChat
                  ?? nameFromContact
                  ?? (rawPhone ? formatPhoneNumber(rawPhone) : 'عميل');
    } catch (_) {}

    // وقت الرسالة
    const tDate = new Date(tSec * 1000);

    dispatch({
      messageId,
      chatId,
      customerName: formatPhoneNumber(customerName),
      customerPhone,
      isOut,
      text:        String(body).trim(),
      timestamp:   tDate.toISOString(),
      displayTime: formatCairoTime(tDate),
    });
  } catch (error) {
    console.error('[Whatsi] Message capture failed:', error?.message || error);
  }
}

// ─── محاولة دورية لـ hook الـ Collection ─────────────────────────────────────
// نبدأ بمحاولات بطيئة (3 ثواني) حتى يكتمل تحميل واتساب
// ثم نتسارع (1.5 ثانية) بعد ظهور الـ app
const hookTimer = setInterval(() => {
  // tryHookCollection يحدد لنا بدقة ما الذي لم يجهز بعد، كما يحاول الربط عند جاهزية واتساب.
  tryHookCollection();
}, 2000);

// ─── نبضة حياة ───────────────────────────────────────────────────────────────
setInterval(() => {
  sendCaptureHeartbeat();
}, 30000);

console.log('[Whatsi Preload] Loaded ✓');
