/** PostgreSQL data access for whatsi Z-ray — powered by Prisma Client. */
const { PrismaClient, Prisma } = require('@prisma/client');
const crypto = require('crypto');
const { formatCairoTime, getCairoDateString, getCairoDateRange } = require('./timezone');

let prisma;
const DATA_RETENTION_DAYS = Math.max(1, Number(process.env.DATA_RETENTION_DAYS || 36500));
const DATA_RETENTION_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const RETENTION_INTERVAL = `${DATA_RETENTION_DAYS} days`;
const RETENTION_SQL_INTERVAL = Prisma.raw(`INTERVAL '${DATA_RETENTION_DAYS} days'`);
const RETENTION_PLUS_1_SQL = Prisma.raw(`INTERVAL '${DATA_RETENTION_DAYS + 1} days'`);
let audioTimestampCutoff = new Date(Date.now() - 5 * 60 * 1000);

function setAudioTimestampCutoff(timestampSeconds) {
  const timestamp = Number(timestampSeconds) * 1000;
  if (Number.isFinite(timestamp)) audioTimestampCutoff = new Date(timestamp);
}

function isWithinRetention(timestamp) {
  if (DATA_RETENTION_DAYS >= 36500) return true;
  const time = timestamp instanceof Date ? timestamp.getTime() : Date.parse(timestamp);
  return Number.isFinite(time) && time >= Date.now() - DATA_RETENTION_MS;
}

function getPrisma() {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL غير مضبوط في ملف .env');
    prisma = new PrismaClient({
      datasources: { db: { url: connectionString } },
      log: []
    });
  }
  return prisma;
}

/** للتوافق مع الكود القديم في report-service الذي يستدعي db.getPool() مباشرةً */
function getPool() {
  // إرجاع كائن وهمي يحاكي pool.query عبر Prisma.$queryRaw
  const p = getPrisma();
  return {
    query: async (sql, values = []) => {
      const tagged = buildTaggedQuery(sql, values);
      const rows = await p.$queryRaw(tagged);
      return { rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
    }
  };
}

/** تحويل استعلام pg نمط $1,$2 إلى Prisma.sql tagged template */
function buildTaggedQuery(sql, values = []) {
  if (!values || values.length === 0) {
    return Prisma.sql([sql]);
  }
  // تقسيم SQL على placeholder وبناء tagged template ديناميكياً
  const parts = sql.split(/\$\d+/);
  const fragments = [Prisma.sql([parts[0]])];
  for (let i = 0; i < values.length; i++) {
    fragments.push(Prisma.sql`${values[i]}`);
    if (parts[i + 1] !== undefined) fragments.push(Prisma.sql([parts[i + 1]]));
  }
  return Prisma.join(fragments, '');
}

async function initialize() {
  const p = getPrisma();
  await p.$queryRaw(Prisma.sql`SELECT 1`);

  // التحقق من وجود الجداول الأساسية المنشأة بواسطة Prisma migrate
  const tableCheck = await p.$queryRaw(Prisma.sql`
    SELECT
      to_regclass('public.messages')::text AS messages,
      to_regclass('public.audio_messages')::text AS audio_messages,
      to_regclass('public.audio_job_outbox')::text AS audio_job_outbox,
      to_regclass('public.daily_report_revisions')::text AS report_revisions,
      to_regclass('public.daily_report_cache')::text AS report_cache,
      to_regclass('public.gemini_usage')::text AS gemini_usage,
      to_regclass('public.customer_contact_history')::text AS contact_history,
      to_regclass('public.sales_daily_scores')::text AS sales_daily_scores,
      to_regclass('public.users')::text AS users
  `);
  const tc = tableCheck[0];
  if (!tc.messages || !tc.audio_messages || !tc.audio_job_outbox ||
      !tc.report_revisions || !tc.report_cache || !tc.gemini_usage ||
      !tc.contact_history || !tc.sales_daily_scores || !tc.users) {
    throw new Error('مخطط PostgreSQL غير مطبق. نفّذ الأمر npm run db:migrate قبل تشغيل التطبيق.');
  }

  // إنشاء الجداول الإضافية غير المُدارة بـ Prisma migrate
  await p.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS sales_chat_seen (
      account_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      unread_count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (account_id, chat_id)
    )
  `);
  await p.$executeRaw(Prisma.sql`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      chat_id TEXT NOT NULL PRIMARY KEY,
      customer_phone TEXT,
      customer_name TEXT,
      first_account_name TEXT,
      last_account_name TEXT,
      first_contact_at TIMESTAMPTZ DEFAULT NOW(),
      last_contact_at TIMESTAMPTZ DEFAULT NOW(),
      brief TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await p.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone ON customer_profiles (customer_phone)`);
  await p.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_customer_profiles_updated_at ON customer_profiles (updated_at)`);

  // Indexes لتسريع استعلامات حساب الـ unread_count الفعلي
  await p.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_sender_time ON messages (chat_id, sender, timestamp DESC)`);
  await p.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_audio_chat_sender_time ON audio_messages (chat_id, sender, timestamp DESC)`);
  await p.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_sales_chat_seen_chat ON sales_chat_seen (chat_id, seen_at DESC)`);

  await backfillCustomerContactHistory();
  console.log('[Database] PostgreSQL connected via Prisma; schema is ready.');
}

const ALL_ACCOUNTS_KEY = '__all__';
const REPORT_PROMPT_VERSION = 'daily-report-v14-followup-evidence';

function normalizeReportPeriod(period) {
  return ['last48h', 'last7days'].includes(period) ? period : 'today';
}

function reportRevisionKey(accountId, period) {
  return `${accountId || ALL_ACCOUNTS_KEY}::${normalizeReportPeriod(period)}`;
}

/** تحديث أرقام إصدارات تقارير اليوم داخل transaction */
async function bumpDailyReportRevision(tx, accountId, date) {
  const revisions = new Set([
    [reportRevisionKey(accountId, 'today'), date],
    [reportRevisionKey(null, 'today'), date],
    [reportRevisionKey(accountId, 'last48h'), getLocalDateString()],
    [reportRevisionKey(null, 'last48h'), getLocalDateString()],
    [reportRevisionKey(accountId, 'last7days'), getLocalDateString()],
    [reportRevisionKey(null, 'last7days'), getLocalDateString()]
  ].map(([key, revisionDate]) => `${key}\u0000${revisionDate}`));

  for (const revision of revisions) {
    const [key, revisionDate] = revision.split('\u0000');
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO daily_report_revisions (account_key, report_date, version, updated_at)
      VALUES (${key}, ${revisionDate}, 1, NOW())
      ON CONFLICT (account_key, report_date)
      DO UPDATE SET version = daily_report_revisions.version + 1, updated_at = NOW()
    `);
  }
}

async function getDailyReportRevision(accountId, date, period = 'today') {
  const key = reportRevisionKey(accountId, period);
  const globalKey = reportRevisionKey(null, period);
  const p = getPrisma();
  const result = await p.$queryRaw(Prisma.sql`
    SELECT
      COALESCE((SELECT version FROM daily_report_revisions WHERE account_key = ${key} AND report_date = ${date}), 0) AS scoped,
      COALESCE((SELECT version FROM daily_report_revisions WHERE account_key = ${globalKey} AND report_date = ${date}), 0) AS global
  `);
  return `${result[0].scoped}:${result[0].global}`;
}

async function getCachedDailyReport(accountId, date, sourceVersion, period = 'today', allowSourceChanges = false, allowPromptChanges = false) {
  const p = getPrisma();
  const isRolling = ['last48h', 'last7days'].includes(normalizeReportPeriod(period));
  const key = reportRevisionKey(accountId, period);

  const sourceFilter = !allowSourceChanges ? Prisma.sql`AND source_version = ${sourceVersion}` : Prisma.sql``;
  const promptFilter = !allowPromptChanges ? Prisma.sql`AND prompt_version = ${REPORT_PROMPT_VERSION}` : Prisma.sql``;
  const rollingFilter = isRolling
    ? Prisma.sql`AND NULLIF(payload->>'cacheValidUntil','') IS NOT NULL AND (payload->>'cacheValidUntil')::timestamptz > NOW()`
    : Prisma.sql``;
  const retentionFilter = DATA_RETENTION_DAYS >= 36500
    ? Prisma.sql``
    : Prisma.sql`AND generated_at >= NOW() - ${RETENTION_SQL_INTERVAL}`;

  const [row] = await p.$queryRaw(Prisma.sql`
    SELECT payload, source_version, prompt_version FROM daily_report_cache
    WHERE account_key = ${key} AND report_date = ${date}
      ${sourceFilter}
      ${promptFilter}
      ${retentionFilter}
      ${rollingFilter}
  `);

  if (!row) return null;
  return { ...row.payload, _cacheSourceVersion: row.source_version, _cachePromptVersion: row.prompt_version };
}

async function storeDailyReportCache(accountId, date, sourceVersion, payload, period = 'today') {
  const p = getPrisma();
  const key = reportRevisionKey(accountId, period);
  const globalKey = reportRevisionKey(null, period);
  // حفظ الـ cache فقط إذا لم يتغيّر الإصدار منذ بدء التوليد
  await p.$executeRaw(Prisma.sql`
    WITH args AS (
      SELECT
        ${key}::text AS account_key,
        ${date}::varchar(10) AS report_date,
        ${sourceVersion}::varchar(80) AS source_version,
        ${REPORT_PROMPT_VERSION}::varchar(80) AS prompt_version,
        ${JSON.stringify(payload)}::jsonb AS payload,
        ${key}::text AS scoped_key,
        ${globalKey}::text AS global_key
    )
    INSERT INTO daily_report_cache (account_key, report_date, source_version, prompt_version, payload, generated_at)
    SELECT args.account_key, args.report_date, args.source_version, args.prompt_version, args.payload, NOW() FROM args
    WHERE args.source_version =
      COALESCE((SELECT version FROM daily_report_revisions WHERE account_key = args.scoped_key AND report_date = args.report_date), 0)::text
      || ':' ||
      COALESCE((SELECT version FROM daily_report_revisions WHERE account_key = args.global_key AND report_date = args.report_date), 0)::text
    ON CONFLICT (account_key, report_date)
    DO UPDATE SET
      source_version = EXCLUDED.source_version,
      prompt_version = EXCLUDED.prompt_version,
      payload = EXCLUDED.payload,
      generated_at = EXCLUDED.generated_at
  `);
}

async function recordGeminiUsage(usage) {
  await getPrisma().geminiUsage.create({
    data: {
      callType: usage.callType,
      accountId: usage.accountId || null,
      model: usage.model,
      status: usage.status,
      inputTokens: usage.inputTokens ?? null,
      inputTextTokens: usage.inputTextTokens ?? null,
      inputAudioTokens: usage.inputAudioTokens ?? null,
      cachedInputTokens: usage.cachedInputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      thinkingTokens: usage.thinkingTokens ?? null,
      estimatedCostUsd: usage.estimatedCostUsd ?? null,
      errorCode: usage.errorCode || null
    }
  });
}

async function close() {
  if (prisma) { const p = prisma; prisma = null; await p.$disconnect(); }
}

function getReportRange(period = 'today', date = null) {
  if (period === 'last7days') {
    const end = new Date();
    return [new Date(end.getTime() - DATA_RETENTION_MS).toISOString(), end.toISOString()];
  }
  if (normalizeReportPeriod(period) === 'last48h') {
    const end = new Date();
    return [new Date(end.getTime() - 48 * 60 * 60 * 1000).toISOString(), end.toISOString()];
  }
  let reportDate = date || getLocalDateString();
  if (period === 'yesterday' && !date) {
    const [year, month, day] = reportDate.split('-').map(Number);
    reportDate = new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  }
  const [start, end] = getCairoDateRange(reportDate);
  return [start, new Date(Math.min(Date.parse(end), Date.now())).toISOString()];
}

function getLocalDateString(d = new Date()) { return getCairoDateString(d); }

// ─── دوال SQL مساعدة للاستعلامات الخام ───────────────────────────────────────
function customerKeySql(alias) {
  const digits = `regexp_replace(COALESCE(${alias}.customer_phone,''), '[^0-9]', '', 'g')`;
  return `NULLIF(CASE WHEN ${digits} ~ '^0020[1][0125][0-9]{8}$' THEN substring(${digits} from 3) ` +
    `WHEN ${digits} ~ '^01[0125][0-9]{8}$' THEN '20' || substring(${digits} from 2) ` +
    `WHEN ${digits} ~ '^1[0125][0-9]{8}$' THEN '20' || ${digits} ` +
    `ELSE ${digits} END, '')`;
}

function chatKeySql(alias) {
  return `NULLIF(regexp_replace(BTRIM(COALESCE(${alias}.chat_id,'')), '@(c\\.us|s\\.whatsapp\\.net|lid)$', '', 'i'), '')`;
}

function isDirectChatSql(alias) {
  return `(${alias}.chat_id IS NULL OR (${alias}.chat_id NOT LIKE '%@g.us' AND ${alias}.chat_id NOT LIKE '%@broadcast' AND ${alias}.chat_id NOT LIKE '%@newsletter'))`;
}

function retentionSql(alias = null) {
  if (DATA_RETENTION_DAYS >= 36500) return '1=1';
  const col = alias ? `${alias}.timestamp` : 'timestamp';
  return `${col} >= NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'`;
}

// ─── إدارة جهات الاتصال ──────────────────────────────────────────────────────
function contactHash(customerPhone, chatId) {
  const phone = normalizePhoneDigits(customerPhone);
  const chat = String(chatId || '').trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
  const identifier = phone ? `phone:${phone}` : chat ? `chat:${chat}` : '';
  return identifier ? crypto.createHash('sha256').update('whatsi-contact-v1:' + identifier).digest('hex') : null;
}

function normalizePhoneDigits(value) {
  let digits = String(value || '').replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  }).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (/^01[0125]\d{8}$/.test(digits)) return '20' + digits.slice(1);
  if (/^1[0125]\d{8}$/.test(digits)) return '20' + digits;
  return digits;
}

async function registerCustomerContact(tx, data, baseline = false) {
  const phoneHash = contactHash(data.customerPhone, null);
  const chatHash = contactHash(null, data.chatId);
  const hashes = [...new Set([phoneHash, chatHash].filter(Boolean))];
  if (!hashes.length) return null;
  const timestamp = data.timestamp || new Date().toISOString();
  const accountId = data.accountId || 'unknown';
  for (const hash of hashes) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO customer_contact_history (contact_hash, first_contact_at, first_account_id, baseline_contact, updated_at)
      VALUES (${hash}, ${new Date(timestamp)}, ${accountId}, ${baseline}, NOW())
      ON CONFLICT (contact_hash) DO UPDATE SET
        first_account_id = CASE
          WHEN EXCLUDED.first_contact_at < customer_contact_history.first_contact_at THEN EXCLUDED.first_account_id
          ELSE customer_contact_history.first_account_id
        END,
        first_contact_at = LEAST(customer_contact_history.first_contact_at, EXCLUDED.first_contact_at),
        baseline_contact = customer_contact_history.baseline_contact OR EXCLUDED.baseline_contact,
        updated_at = NOW()
    `);
  }
  return phoneHash || chatHash;
}

async function backfillCustomerContactHistory() {
  const p = getPrisma();
  const [existing] = await p.$queryRaw(Prisma.sql`SELECT EXISTS(SELECT 1 FROM customer_contact_history) AS ready`);
  if (existing.ready) return;

  const rows = await p.$queryRaw(Prisma.sql`
    SELECT account_id, customer_phone, chat_id, timestamp FROM messages WHERE ${Prisma.raw(retentionSql())}
    UNION ALL
    SELECT account_id, customer_phone, chat_id, timestamp FROM audio_messages WHERE ${Prisma.raw(retentionSql())}
    ORDER BY timestamp
  `);
  if (!rows.length) return;

  await p.$transaction(async tx => {
    for (const row of rows) await registerCustomerContact(tx, row, true);
  });
}

// ─── حفظ الرسائل ─────────────────────────────────────────────────────────────
async function saveMessage(data) {
  if (!isWithinRetention(data.timestamp || new Date())) return null;
  const p = getPrisma();

  const accountId = data.accountId || 'unknown';
  const accountName = data.accountName || 'Unknown Account';
  const customerName = data.customerName || 'Unknown Customer';
  const customerPhone = data.customerPhone || null;
  const chatId = data.chatId || null;
  const messageId = data.messageId || null;
  const sender = ['sales', 'customer'].includes(data.sender) ? data.sender : 'customer';
  const text = data.text || '';
  const timestamp = new Date(data.timestamp || new Date().toISOString());
  const displayTime = data.displayTime || formatCairoTime();

  return await p.$transaction(async tx => {
    // تعامل مع fallback message_id
    if (String(messageId || '').startsWith('fallback:')) {
      const [legacy] = await tx.$queryRaw(Prisma.sql`
        SELECT id FROM messages
        WHERE account_id = ${accountId} AND message_id IS NULL
          AND chat_id IS NOT DISTINCT FROM ${chatId}
          AND timestamp = ${timestamp}::timestamptz
          AND sender = ${sender} AND text = ${text}
        LIMIT 1
      `);
      if (legacy) return legacy.id;
    }

    const [inserted] = await tx.$queryRaw(Prisma.sql`
      INSERT INTO messages (account_id, account_name, customer_name, customer_phone, chat_id, message_id, sender, text, timestamp, display_time)
      VALUES (${accountId}, ${accountName}, ${customerName}, ${customerPhone}, ${chatId}, ${messageId}, ${sender}, ${text}, ${timestamp}, ${displayTime})
      ON CONFLICT (account_id, message_id) DO NOTHING
      RETURNING id
    `);

    if (inserted) {
      await registerCustomerContact(tx, { accountId, customerPhone, chatId, timestamp: timestamp.toISOString() });
      await bumpDailyReportRevision(tx, accountId, getLocalDateString(timestamp));
      if (sender === 'sales' && chatId) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO sales_chat_seen (account_id, chat_id, seen_at, unread_count)
          VALUES (${accountId}, ${chatId}, ${timestamp}, 0)
          ON CONFLICT (account_id, chat_id) DO UPDATE SET seen_at = EXCLUDED.seen_at, unread_count = 0
        `);
      }
      return inserted.id;
    }
    return null;
  });
}

async function updateCustomerPhoneForChat(accountId, chatId, customerPhone) {
  if (!accountId || !chatId || !customerPhone) return 0;
  const p = getPrisma();

  return await p.$transaction(async tx => {
    const retSQL = retentionSql();
    const messagesUpdated = await tx.$queryRaw(Prisma.sql`
      UPDATE messages SET customer_phone = ${customerPhone}
      WHERE account_id = ${accountId} AND chat_id = ${chatId}
        AND ${Prisma.raw(retSQL)}
        AND (customer_phone IS NULL OR customer_phone = '')
      RETURNING timestamp, chat_id
    `);
    const audioUpdated = await tx.$queryRaw(Prisma.sql`
      UPDATE audio_messages SET customer_phone = ${customerPhone}
      WHERE account_id = ${accountId} AND chat_id = ${chatId}
        AND ${Prisma.raw(retSQL)}
        AND (customer_phone IS NULL OR customer_phone = '')
      RETURNING timestamp, chat_id
    `);
    const updatedRows = [...messagesUpdated, ...audioUpdated];
    if (updatedRows.length) {
      const first = updatedRows.reduce((a, b) => new Date(a.timestamp) <= new Date(b.timestamp) ? a : b);
      await registerCustomerContact(tx, { accountId, customerPhone, chatId: first.chat_id, timestamp: first.timestamp });
    }
    const dates = new Set(updatedRows.map(row => getLocalDateString(new Date(row.timestamp))));
    for (const date of dates) await bumpDailyReportRevision(tx, accountId, date);
    return messagesUpdated.length + audioUpdated.length;
  });
}

// ─── رسائل صوتية ─────────────────────────────────────────────────────────────
async function captureAudio(data) {
  if (!isWithinRetention(data.timestamp || new Date())) return { id: null, inserted: false, ignored: true };
  const allowTranscription = Date.parse(data.timestamp || new Date()) >= audioTimestampCutoff.getTime();
  const p = getPrisma();

  return await p.$transaction(async tx => {
    const accountId = data.accountId || 'unknown';
    const accountName = data.accountName || 'Unknown';
    const customerName = data.customerName || 'Unknown';
    const customerPhone = data.customerPhone || null;
    const chatId = data.chatId || null;
    const messageId = data.messageId || null;
    const sender = ['sales', 'customer'].includes(data.sender) ? data.sender : 'customer';
    const durationSec = data.durationSec || null;
    const timestamp = new Date(data.timestamp || new Date().toISOString());
    const displayTime = data.displayTime || '';

    if (String(messageId || '').startsWith('fallback:')) {
      const [legacy] = await tx.$queryRaw(Prisma.sql`
        SELECT id FROM audio_messages
        WHERE account_id = ${accountId} AND message_id IS NULL
          AND chat_id IS NOT DISTINCT FROM ${chatId}
          AND timestamp = ${timestamp}::timestamptz
          AND sender = ${sender}
          AND duration_sec IS NOT DISTINCT FROM ${durationSec}
        LIMIT 1
      `);
      if (legacy) return { id: String(legacy.id), inserted: false, recoveredLegacy: true };
    }

    const [inserted] = await tx.$queryRaw(Prisma.sql`
      INSERT INTO audio_messages (account_id, account_name, customer_name, customer_phone, chat_id, message_id, sender, duration_sec, timestamp, display_time)
      VALUES (${accountId}, ${accountName}, ${customerName}, ${customerPhone}, ${chatId}, ${messageId}, ${sender}, ${durationSec}, ${timestamp}, ${displayTime})
      ON CONFLICT (account_id, message_id) DO NOTHING
      RETURNING id
    `);

    let audioId = inserted && inserted.id;
    if (!audioId && messageId) {
      const [existing] = await tx.$queryRaw(Prisma.sql`
        SELECT id FROM audio_messages WHERE account_id = ${accountId} AND message_id = ${messageId} LIMIT 1
      `);
      audioId = existing && existing.id;
    }
    if (!audioId) throw new Error('تعذر حفظ سجل الرسالة الصوتية');

    if (inserted) {
      await registerCustomerContact(tx, { accountId, customerPhone, chatId, timestamp: timestamp.toISOString() });
      await bumpDailyReportRevision(tx, accountId, getLocalDateString(timestamp));
    }

    if (allowTranscription && ((data.mediaKey && (data.directPath || data.mediaUrl)) || (data.buffer && data.buffer.length > 100))) {
      const jobId = 'audio-' + String(audioId);
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO audio_job_outbox (job_id, audio_id, payload)
        VALUES (${jobId}, ${audioId}, ${JSON.stringify({
          audioId: String(audioId), mediaKey: data.mediaKey, directPath: data.directPath || null,
          mediaUrl: data.mediaUrl || null, encFilehash: data.encFilehash || null,
          fileLength: data.fileLength || 0, mimetype: data.mimetype || '', buffer: data.buffer || null,
          sender, accountId, accountName, customerName
        })}::jsonb)
        ON CONFLICT (job_id) DO NOTHING
      `);
    }

    return { id: String(audioId), inserted: Boolean(inserted) };
  });
}

async function pendingAudioJobs(limit = 100) {
  const retentionClause = DATA_RETENTION_DAYS >= 36500
    ? Prisma.sql``
    : Prisma.sql`AND a.timestamp >= NOW() - ${RETENTION_SQL_INTERVAL}`;
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    SELECT o.job_id, o.payload
    FROM audio_job_outbox o
    JOIN audio_messages a ON a.id = o.audio_id
    WHERE o.published_at IS NULL
      AND a.timestamp >= ${audioTimestampCutoff}
      ${retentionClause}
    ORDER BY o.created_at
    LIMIT ${limit}
  `);
  return rows;
}

async function publishedAudioJobs(limit = 100) {
  const retentionClause = DATA_RETENTION_DAYS >= 36500
    ? Prisma.sql``
    : Prisma.sql`AND a.timestamp >= NOW() - ${RETENTION_SQL_INTERVAL}`;
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    SELECT o.job_id, o.audio_id
    FROM audio_job_outbox o
    JOIN audio_messages a ON a.id = o.audio_id
    WHERE o.published_at IS NOT NULL
      AND o.payload <> '{}'::jsonb
      AND a.timestamp >= ${audioTimestampCutoff}
      ${retentionClause}
    ORDER BY o.created_at
    LIMIT ${limit}
  `);
  return rows;
}

async function markAudioJobPublished(jobId) {
  await getPrisma().$executeRaw(Prisma.sql`
    UPDATE audio_job_outbox SET published_at = NOW()
    WHERE job_id = ${jobId} AND published_at IS NULL
  `);
}

async function completeAudioJob(audioId) {
  await getPrisma().$executeRaw(Prisma.sql`
    UPDATE audio_job_outbox SET payload = '{}'::jsonb WHERE audio_id = ${BigInt(audioId)}
  `);
}

async function markAudioJobForRetry(audioId) {
  await getPrisma().$executeRaw(Prisma.sql`
    UPDATE audio_job_outbox SET published_at = NULL WHERE audio_id = ${BigInt(audioId)}
  `);
}

async function getAudioJobState(id) {
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    SELECT file_path, transcript, timestamp FROM audio_messages
    WHERE id = ${BigInt(id)}
      AND timestamp >= ${audioTimestampCutoff}
      AND ${Prisma.raw(retentionSql())}
  `);
  return rows[0] || null;
}

async function discardAudioJobsBefore(cutoff = audioTimestampCutoff) {
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    UPDATE audio_job_outbox o
    SET payload = '{}'::jsonb, published_at = NOW()
    FROM audio_messages a
    WHERE o.audio_id = a.id AND a.timestamp < ${cutoff} AND o.payload <> '{}'::jsonb
    RETURNING o.job_id
  `);
  return rows.map(row => row.job_id);
}

async function updateAudioFilePath(id, filePath) {
  await getPrisma().$executeRaw(Prisma.sql`
    UPDATE audio_messages SET file_path = ${filePath || ''}
    WHERE id = ${BigInt(id)} AND ${Prisma.raw(retentionSql())}
  `);
}

async function updateAudioTranscript(id, transcript, toneAnalysis) {
  await getPrisma().$transaction(async tx => {
    const [updated] = await tx.$queryRaw(Prisma.sql`
      UPDATE audio_messages SET transcript = ${transcript || ''}, tone_analysis = ${toneAnalysis || ''}
      WHERE id = ${BigInt(id)} AND ${Prisma.raw(retentionSql())}
      RETURNING account_id, timestamp
    `);
    if (updated) await bumpDailyReportRevision(tx, updated.account_id, getLocalDateString(new Date(updated.timestamp)));
  });
}

async function getAudioMessages(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const p = getPrisma();
  const retSQL = retentionSql('audio_messages');
  let rows;
  if (accountId) {
    rows = await p.$queryRaw(Prisma.sql`
      SELECT * FROM audio_messages
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(retSQL)} AND ${Prisma.raw(isDirectChatSql('audio_messages'))}
        AND account_id = ${accountId}
      ORDER BY timestamp
    `);
  } else {
    rows = await p.$queryRaw(Prisma.sql`
      SELECT * FROM audio_messages
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(retSQL)} AND ${Prisma.raw(isDirectChatSql('audio_messages'))}
      ORDER BY timestamp
    `);
  }
  return rows.map(row => ({ ...row, display_time: formatCairoTime(new Date(row.timestamp)) }));
}

async function getCustomerNumbers(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const p = getPrisma();
  const retSQL = retentionSql();
  let rows;
  if (accountId) {
    rows = await p.$queryRaw(Prisma.sql`
      SELECT DISTINCT ON (regexp_replace(customer_phone, '[^0-9]', '', 'g'))
        account_name, customer_name, customer_phone
      FROM (
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM messages
        UNION ALL
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM audio_messages
      ) c
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(retSQL)}
        AND (chat_id IS NULL OR (chat_id NOT LIKE '%@g.us' AND chat_id NOT LIKE '%@broadcast' AND chat_id NOT LIKE '%@newsletter'))
        AND customer_phone IS NOT NULL AND customer_phone <> ''
        AND account_id = ${accountId}
      ORDER BY regexp_replace(customer_phone, '[^0-9]', '', 'g'), account_name, customer_name
    `);
  } else {
    rows = await p.$queryRaw(Prisma.sql`
      SELECT DISTINCT ON (regexp_replace(customer_phone, '[^0-9]', '', 'g'))
        account_name, customer_name, customer_phone
      FROM (
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM messages
        UNION ALL
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM audio_messages
      ) c
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(retSQL)}
        AND (chat_id IS NULL OR (chat_id NOT LIKE '%@g.us' AND chat_id NOT LIKE '%@broadcast' AND chat_id NOT LIKE '%@newsletter'))
        AND customer_phone IS NOT NULL AND customer_phone <> ''
      ORDER BY regexp_replace(customer_phone, '[^0-9]', '', 'g'), account_name, customer_name
    `);
  }
  return rows;
}

async function getLeadFollowupContacts(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const p = getPrisma();
  const isDirectSQL = isDirectChatSql('c');
  let result;
  if (accountId) {
    result = await p.$queryRaw(Prisma.sql`
      SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp
      FROM (
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM messages
        UNION ALL
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM audio_messages
      ) c
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(isDirectSQL)}
        AND account_id = ${accountId}
      ORDER BY timestamp
    `);
  } else {
    result = await p.$queryRaw(Prisma.sql`
      SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp
      FROM (
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM messages
        UNION ALL
        SELECT account_id, account_name, customer_name, customer_phone, chat_id, timestamp FROM audio_messages
      ) c
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(isDirectSQL)}
      ORDER BY timestamp
    `);
  }

  const contacts = new Map();
  const phoneByChat = new Map();
  for (const row of result) {
    if (!row.customer_phone || !row.chat_id) continue;
    const chat = String(row.chat_id).trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    const phoneHash = contactHash(row.customer_phone, null);
    if (phoneHash) phoneByChat.set(`${row.account_id}\u0000${chat}`, phoneHash);
  }
  for (const row of result) {
    const chat = String(row.chat_id || '').trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    const phoneHash = contactHash(row.customer_phone, null) || phoneByChat.get(`${row.account_id}\u0000${chat}`);
    const chatHash = contactHash(null, row.chat_id);
    const hash = phoneHash || chatHash;
    if (!hash) continue;
    const current = contacts.get(hash);
    if (!current) contacts.set(hash, { contactHash: hash, identityHashes: new Set(), accountId: row.account_id,
      customerName: row.customer_name, customerPhone: row.customer_phone, accountName: row.account_name,
      firstSeenInPeriod: row.timestamp });
    const contact = contacts.get(hash);
    if (phoneHash) contact.identityHashes.add(phoneHash);
    if (chatHash) contact.identityHashes.add(chatHash);
    if (!contact.customerPhone && row.customer_phone) contact.customerPhone = row.customer_phone;
  }
  const hashes = [...new Set([...contacts.values()].flatMap(contact => [...contact.identityHashes]))];
  if (!hashes.length) return { leads: [], followups: [], leadCount: 0, followupCount: 0 };
  const history = await p.$queryRaw(Prisma.sql`
    SELECT contact_hash, first_contact_at, baseline_contact
    FROM customer_contact_history
    WHERE contact_hash = ANY(${hashes}::varchar[])
  `);
  const historyByHash = new Map(history.map(row => [row.contact_hash, row]));
  const startTime = new Date(start).getTime();
  const leads = [];
  const followups = [];
  for (const contact of contacts.values()) {
    const matchingHistory = [...contact.identityHashes].map(hash => historyByHash.get(hash)).filter(Boolean);
    const isLead = matchingHistory.length > 0 && matchingHistory.every(record =>
      !record.baseline_contact && new Date(record.first_contact_at).getTime() >= startTime);
    const historicalBaseline = matchingHistory.some(record => Boolean(record.baseline_contact));
    const target = isLead ? leads : followups;
    target.push({ accountId: contact.accountId, customerName: contact.customerName, customerPhone: contact.customerPhone || '', accountName: contact.accountName,
      status: isLead ? 'lead' : 'followup', historicalBaseline });
  }
  return { leads, followups, leadCount: leads.length, followupCount: followups.length };
}

async function getTodayMessages(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const p = getPrisma();
  const retSQL = retentionSql('messages');
  const isDirectSQL = isDirectChatSql('messages');
  let rows;
  if (accountId) {
    rows = await p.$queryRaw(Prisma.sql`
      SELECT id, account_id, account_name, customer_name, customer_phone, chat_id, message_id, sender, text, timestamp, display_time
      FROM messages
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(retSQL)} AND ${Prisma.raw(isDirectSQL)}
        AND account_id = ${accountId}
      ORDER BY account_id, customer_name, timestamp
    `);
  } else {
    rows = await p.$queryRaw(Prisma.sql`
      SELECT id, account_id, account_name, customer_name, customer_phone, chat_id, message_id, sender, text, timestamp, display_time
      FROM messages
      WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)}
        AND ${Prisma.raw(retSQL)} AND ${Prisma.raw(isDirectSQL)}
      ORDER BY account_id, customer_name, timestamp
    `);
  }
  return rows.map(row => ({ ...row, display_time: formatCairoTime(new Date(row.timestamp)) }));
}

function formatPhoneNumber(raw) {
  if (!raw) return raw;
  if (/[a-zA-Z\u0600-\u06FF]/.test(raw)) return raw;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length < 7) return raw;
  if (/^01[0125]\d{8}$/.test(digits)) return '+20 ' + digits.slice(1,3) + ' ' + digits.slice(3,7) + ' ' + digits.slice(7);
  if (/^1[0125]\d{8}$/.test(digits)) return '+20 ' + digits.slice(0,2) + ' ' + digits.slice(2,6) + ' ' + digits.slice(6);
  const formats = [
    { code: '20', local: 10, fmt: d => '+20 ' + d.slice(0,2) + ' ' + d.slice(2,6) + ' ' + d.slice(6) },
    { code: '20', local: 9, fmt: d => '+20 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '966', local: 9, fmt: d => '+966 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '971', local: 9, fmt: d => '+971 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '965', local: 8, fmt: d => '+965 ' + d.slice(0,4) + ' ' + d.slice(4) },
    { code: '974', local: 8, fmt: d => '+974 ' + d.slice(0,4) + ' ' + d.slice(4) },
    { code: '973', local: 8, fmt: d => '+973 ' + d.slice(0,4) + ' ' + d.slice(4) },
    { code: '968', local: 8, fmt: d => '+968 ' + d.slice(0,4) + ' ' + d.slice(4) },
    { code: '962', local: 9, fmt: d => '+962 ' + d.slice(0,1) + ' ' + d.slice(1,5) + ' ' + d.slice(5) },
    { code: '961', local: 8, fmt: d => '+961 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '963', local: 9, fmt: d => '+963 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '967', local: 9, fmt: d => '+967 ' + d.slice(0,1) + ' ' + d.slice(1,4) + ' ' + d.slice(4) },
    { code: '218', local: 9, fmt: d => '+218 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '212', local: 9, fmt: d => '+212 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '216', local: 8, fmt: d => '+216 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '213', local: 9, fmt: d => '+213 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) },
    { code: '249', local: 9, fmt: d => '+249 ' + d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5) }
  ];
  for (const country of formats) {
    if (!digits.startsWith(country.code)) continue;
    let local = digits.slice(country.code.length);
    if (local.length === country.local + 1 && local.startsWith('0')) local = local.slice(1);
    if (local.length === country.local) return country.fmt(local);
  }
  if (digits.length >= 11) return '+' + digits;
  return raw;
}

async function formatMessagesForGemini(accountId = null, date = null, period = 'today', rowsOverride = null, identityRowsOverride = null) {
  const rows = rowsOverride || await getTodayMessages(accountId, date, period);
  const identityRows = identityRowsOverride || rows;
  if (!rows.length) return { text: null, stats: { accounts: 0, chats: 0, messages: 0, firstTimestamp: null } };
  const grouped = Object.create(null);
  const phoneByChat = new Map();
  for (const row of identityRows) {
    if (!row.customer_phone || !row.chat_id) continue;
    const chatId = String(row.chat_id).trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    const phoneKey = normalizePhoneDigits(row.customer_phone);
    if (phoneKey) phoneByChat.set(`${row.account_id}\u0000${chatId}`, phoneKey);
  }
  for (const row of rows) {
    const chatId = String(row.chat_id || '').trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    const resolvedPhone = row.customer_phone || phoneByChat.get(`${row.account_id}\u0000${chatId}`) || '';
    const customerDisplay = formatPhoneNumber(resolvedPhone || row.customer_name);
    const phoneKey = normalizePhoneDigits(resolvedPhone);
    const customerKey = phoneKey ? 'phone:' + phoneKey : chatId ? 'chat:' + chatId : customerDisplay;
    if (!grouped[row.account_id]) grouped[row.account_id] = { accountId: row.account_id, accountName: row.account_name, chats: Object.create(null), allMessages: [] };
    const account = grouped[row.account_id];
    if (!account.chats[customerKey]) account.chats[customerKey] = { name: customerDisplay, phone: resolvedPhone ? formatPhoneNumber(resolvedPhone) : '', chatId, messages: [] };
    else if (!account.chats[customerKey].phone && resolvedPhone) account.chats[customerKey].phone = formatPhoneNumber(resolvedPhone);
    const displayRow = { ...row, customer_name: customerDisplay };
    account.chats[customerKey].messages.push(displayRow);
    account.allMessages.push(displayRow);
  }
  let text = '';
  let totalChats = 0;
  const perAccountStats = {};
  for (const account of Object.values(grouped)) {
    const chats = Object.values(account.chats);
    const all = account.allMessages.slice().sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
    text += '\n' + '='.repeat(60) + '\n👤 ممثل المبيعات: ' + account.accountName + '\n👥 عدد العملاء المختلفين في الفترة: ' + chats.length + ' عميل\n';
    if (all.length) {
      text += '⏰ أول رسالة: ' + (all[0].display_time || all[0].timestamp) + (all[0].sender === 'sales' ? ' (صادرة للعميل: ' : ' (واردة من العميل: ') + all[0].customer_name + ')\n';
      text += '⏰ آخر رسالة: ' + (all[all.length-1].display_time || all[all.length-1].timestamp) + (all[all.length-1].sender === 'sales' ? ' (صادرة للعميل: ' : ' (واردة من العميل: ') + all[all.length-1].customer_name + ')\n';
      perAccountStats[account.accountId] = { accountId: account.accountId, accountName: account.accountName, customerCount: chats.length, firstMsg: all[0].display_time || all[0].timestamp,
        lastMsg: all[all.length-1].display_time || all[all.length-1].timestamp };
    }
    text += '='.repeat(60) + '\n\n';
    for (const chat of chats) {
      totalChats++;
      text += '--- محادثة الطالب: ' + chat.name + ' | رقم واتساب: ' + (chat.phone || 'غير متاح') +
        (chat.phone ? '' : ' | معرّف الشات البديل: ' + (chat.chatId || 'غير متاح')) + ' ---\n';
      for (const msg of chat.messages) {
        const sender = msg.sender === 'sales' ? '💼 ' + account.accountName + ' (السيلز)' : '👤 ' + chat.name + ' (العميل)';
        text += '[' + (msg.display_time || msg.timestamp) + '] ' + sender + ': ' + msg.text + '\n';
      }
      text += '\n';
    }
  }
  const firstTimestamp = rows.reduce((earliest, row) => !earliest || new Date(row.timestamp) < new Date(earliest) ? row.timestamp : earliest, null);
  return { text, stats: { accounts: Object.keys(grouped).length, chats: totalChats, messages: rows.length, firstTimestamp, perAccount: perAccountStats } };
}

function buildReportInputManifest(messages = [], audioRows = []) {
  const digest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const text = Object.create(null);
  for (const row of messages) text[String(row.id)] = digest([row.account_id,row.customer_name,row.customer_phone,row.chat_id,row.sender,row.text,row.timestamp]);
  const audio = Object.create(null);
  for (const row of audioRows) audio[String(row.id)] = digest([row.account_id,row.customer_name,row.customer_phone,row.chat_id,row.sender,row.transcript,row.tone_analysis,row.duration_sec,row.timestamp]);
  return { text, audio };
}

async function getTodayStats(date = null, accountId = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const p = getPrisma();
  const retSQL = retentionSql();
  const isDirectM = isDirectChatSql('messages');
  const isDirectA = isDirectChatSql('audio_messages');
  const ckM = customerKeySql('messages');
  const ckA = customerKeySql('audio_messages');
  const chatM = chatKeySql('messages');
  const chatA = chatKeySql('audio_messages');

  const startDt = new Date(start);
  const endDt = new Date(end);

  const accountFilterM = accountId ? Prisma.sql`AND account_id = ${accountId}` : Prisma.sql``;
  const accountFilterA = accountId ? Prisma.sql`AND account_id = ${accountId}` : Prisma.sql``;

  const cte = Prisma.sql`
    WITH raw_messages AS (
      SELECT account_id, account_name, ${Prisma.raw(ckM)} AS phone_key, ${Prisma.raw(chatM)} AS raw_chat_key, sender
      FROM messages
      WHERE timestamp >= ${startDt} AND timestamp < ${endDt} AND ${Prisma.raw(retSQL)} ${accountFilterM} AND ${Prisma.raw(isDirectM)}
      UNION ALL
      SELECT account_id, account_name, ${Prisma.raw(ckA)} AS phone_key, ${Prisma.raw(chatA)} AS raw_chat_key, sender
      FROM audio_messages
      WHERE timestamp >= ${startDt} AND timestamp < ${endDt} AND ${Prisma.raw(retSQL)} ${accountFilterA} AND ${Prisma.raw(isDirectA)}
    ),
    day_messages AS (
      SELECT account_id, account_name,
        COALESCE(MAX(phone_key) OVER (PARTITION BY account_id, COALESCE(raw_chat_key, phone_key)), phone_key, raw_chat_key) AS chat_key, sender
      FROM raw_messages
    )
  `;

  let totals, accounts;
  [totals, accounts] = await Promise.all([
    p.$queryRaw(Prisma.sql`
      ${cte}
      SELECT COUNT(DISTINCT account_id) AS accounts,
             COUNT(DISTINCT (account_id,chat_key)) FILTER (WHERE chat_key IS NOT NULL) AS chats,
             COUNT(*) AS total_messages,
             COUNT(*) FILTER (WHERE sender='sales') AS sales_messages,
             COUNT(*) FILTER (WHERE sender='customer') AS customer_messages
      FROM day_messages
    `),
    p.$queryRaw(Prisma.sql`
      ${cte}
      SELECT account_id,
             MIN(account_name) AS account_name,
             COUNT(DISTINCT chat_key) FILTER (WHERE chat_key IS NOT NULL) AS chats,
             COUNT(*) AS total_messages,
             COUNT(*) FILTER (WHERE sender='sales') AS sales_messages,
             COUNT(*) FILTER (WHERE sender='customer') AS customer_messages
      FROM day_messages
      GROUP BY account_id
      ORDER BY account_name
    `)
  ]);

  const stats = totals[0] || {};
  for (const key of Object.keys(stats)) stats[key] = Number(stats[key]);
  stats.perAccount = Object.fromEntries(accounts.map(row => [row.account_id, {
    accountId: row.account_id, accountName: row.account_name, chats: Number(row.chats), totalMessages: Number(row.total_messages),
    salesMessages: Number(row.sales_messages), customerMessages: Number(row.customer_messages)
  }]));
  return stats;
}

async function saveSalesDailyScores(scores, { date, leadCounts = {}, followupCounts = {}, conversationCounts = {} }) {
  if (!Array.isArray(scores) || !scores.length) return 0;
  const p = getPrisma();
  let saved = 0;
  await p.$transaction(async tx => {
    for (const score of scores) {
      const overall = Number(score.overallScore);
      if (!score.accountId || !Number.isInteger(overall) || overall < 0 || overall > 100) continue;
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO sales_daily_scores (account_id, score_date, account_name, overall_score, improvement, lead_count, followup_count, conversation_count, generated_at)
        VALUES (${score.accountId}, ${date}::date, ${String(score.accountName || '')}, ${overall}, ${String(score.improvement || '').slice(0, 1200)},
          ${leadCounts[score.accountId] || 0}, ${followupCounts[score.accountId] || 0}, ${conversationCounts[score.accountId] || 0}, NOW())
        ON CONFLICT (account_id, score_date) DO UPDATE SET
          account_name = EXCLUDED.account_name,
          overall_score = EXCLUDED.overall_score,
          improvement = EXCLUDED.improvement,
          lead_count = EXCLUDED.lead_count,
          followup_count = EXCLUDED.followup_count,
          conversation_count = EXCLUDED.conversation_count,
          generated_at = NOW()
      `);
      saved++;
    }
  });
  return saved;
}

async function getMonthlySalesScores(month, accountId = null) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('شهر غير صالح');
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const p = getPrisma();
  if (accountId) {
    return await p.$queryRaw(Prisma.sql`
      SELECT account_id, score_date, account_name, overall_score, improvement, lead_count, followup_count, conversation_count, generated_at
      FROM sales_daily_scores
      WHERE score_date >= ${month + '-01'}::date AND score_date < ${nextMonth}::date AND account_id = ${accountId}
      ORDER BY score_date, account_name
    `);
  }
  return await p.$queryRaw(Prisma.sql`
    SELECT account_id, score_date, account_name, overall_score, improvement, lead_count, followup_count, conversation_count, generated_at
    FROM sales_daily_scores
    WHERE score_date >= ${month + '-01'}::date AND score_date < ${nextMonth}::date
    ORDER BY score_date, account_name
  `);
}

async function clearTodayMessages(date = null, accountId = null) {
  const [start, end] = getCairoDateRange(date);
  const p = getPrisma();
  const retSQL = retentionSql();

  return await p.$transaction(async tx => {
    let files, messages, audio;
    if (accountId) {
      files = await tx.$queryRaw(Prisma.sql`
        SELECT file_path FROM audio_messages WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)} AND ${Prisma.raw(retSQL)} AND account_id = ${accountId}
      `);
      messages = await tx.$queryRaw(Prisma.sql`
        DELETE FROM messages WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)} AND ${Prisma.raw(retSQL)} AND account_id = ${accountId} RETURNING id
      `);
      audio = await tx.$queryRaw(Prisma.sql`
        DELETE FROM audio_messages WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)} AND ${Prisma.raw(retSQL)} AND account_id = ${accountId} RETURNING id
      `);
    } else {
      files = await tx.$queryRaw(Prisma.sql`
        SELECT file_path FROM audio_messages WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)} AND ${Prisma.raw(retSQL)}
      `);
      messages = await tx.$queryRaw(Prisma.sql`
        DELETE FROM messages WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)} AND ${Prisma.raw(retSQL)} RETURNING id
      `);
      audio = await tx.$queryRaw(Prisma.sql`
        DELETE FROM audio_messages WHERE timestamp >= ${new Date(start)} AND timestamp < ${new Date(end)} AND ${Prisma.raw(retSQL)} RETURNING id
      `);
    }
    if (messages.length || audio.length) {
      await bumpDailyReportRevision(tx, accountId || null, getLocalDateString(new Date(start)));
    }
    return {
      messages: messages.length,
      audio: audio.length,
      deleted: messages.length + audio.length,
      audioFiles: files.map(r => r.file_path).filter(Boolean)
    };
  });
}

// حذف البيانات المنتهية الصلاحية؛ سجلات الصوت تتتالى إلى صفوف outbox
async function purgeExpiredData() {
  if (DATA_RETENTION_DAYS >= 36500) {
    console.log('[Retention] Permanent retention active (Never Delete); skipping cleanup.');
    return { messages: 0, audio: 0, audioIds: [], audioFiles: [] };
  }
  const p = getPrisma();

  return await p.$transaction(async tx => {
    const files = await tx.$queryRaw(Prisma.sql`
      SELECT id, file_path FROM audio_messages WHERE timestamp < NOW() - ${RETENTION_SQL_INTERVAL}
    `);
    const messages = await tx.$queryRaw(Prisma.sql`
      DELETE FROM messages WHERE timestamp < NOW() - ${RETENTION_SQL_INTERVAL} RETURNING account_id, timestamp
    `);
    const audio = await tx.$queryRaw(Prisma.sql`
      DELETE FROM audio_messages WHERE timestamp < NOW() - ${RETENTION_SQL_INTERVAL} RETURNING account_id, timestamp
    `);
    const touched = new Set([...messages, ...audio].map(row => `${row.account_id}\u0000${getLocalDateString(new Date(row.timestamp))}`));
    for (const item of touched) {
      const [accountId, date] = item.split('\u0000');
      await bumpDailyReportRevision(tx, accountId, date);
    }
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM daily_report_cache
      WHERE generated_at < NOW() - ${RETENTION_SQL_INTERVAL}
        OR report_date <= to_char((NOW() - ${RETENTION_SQL_INTERVAL})::date, 'YYYY-MM-DD')
    `);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM daily_report_revisions WHERE report_date < to_char((NOW() - ${RETENTION_PLUS_1_SQL})::date, 'YYYY-MM-DD')
    `);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM gemini_usage WHERE occurred_at < NOW() - INTERVAL '30 days'
    `);
    return {
      messages: messages.length,
      audio: audio.length,
      audioIds: files.map(row => String(row.id)),
      audioFiles: files.map(row => row.file_path).filter(Boolean)
    };
  });
}

async function recordSalesChatSeen(accountId, chatId, unreadCount = 0, seenAt = new Date().toISOString()) {
  if (!accountId || !chatId) return;
  await getPrisma().$executeRaw(Prisma.sql`
    INSERT INTO sales_chat_seen (account_id, chat_id, seen_at, unread_count)
    VALUES (${accountId}, ${chatId}, ${new Date(seenAt)}, ${unreadCount})
    ON CONFLICT (account_id, chat_id)
    DO UPDATE SET seen_at = EXCLUDED.seen_at, unread_count = EXCLUDED.unread_count
  `);
}

async function getCustomerProfile(chatId) {
  if (!chatId) return null;
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    SELECT chat_id, customer_phone, customer_name, first_account_name, last_account_name,
           first_contact_at, last_contact_at, brief, status, updated_at
    FROM customer_profiles WHERE chat_id = ${chatId}
  `);
  return rows[0] || null;
}

async function saveCustomerProfile({ chatId, customerPhone, customerName, firstAccountName, lastAccountName, brief, status = 'active' }) {
  if (!chatId) return null;
  const rows = await getPrisma().$queryRaw(Prisma.sql`
    INSERT INTO customer_profiles (
      chat_id, customer_phone, customer_name, first_account_name, last_account_name,
      first_contact_at, last_contact_at, brief, status, updated_at
    )
    VALUES (${chatId}, ${customerPhone || null}, ${customerName || null}, ${firstAccountName || null}, ${lastAccountName || null}, NOW(), NOW(), ${brief || ''}, ${status}, NOW())
    ON CONFLICT (chat_id) DO UPDATE SET
      customer_phone = COALESCE(EXCLUDED.customer_phone, customer_profiles.customer_phone),
      customer_name = COALESCE(EXCLUDED.customer_name, customer_profiles.customer_name),
      last_account_name = COALESCE(EXCLUDED.last_account_name, customer_profiles.last_account_name),
      last_contact_at = NOW(),
      brief = EXCLUDED.brief,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *
  `);
  return rows[0] || null;
}

async function getActiveChatsForDate(dateStr) {
  const p = getPrisma();
  const { start, end } = getCairoDateRange(dateStr);
  return await p.$queryRaw(Prisma.sql`
    SELECT DISTINCT chat_id, customer_name, customer_phone, account_name
    FROM (
      SELECT chat_id, customer_name, customer_phone, account_name, timestamp
      FROM messages WHERE timestamp >= ${new Date(start)} AND timestamp <= ${new Date(end)} AND chat_id IS NOT NULL
      UNION ALL
      SELECT chat_id, customer_name, customer_phone, account_name, timestamp
      FROM audio_messages WHERE timestamp >= ${new Date(start)} AND timestamp <= ${new Date(end)} AND chat_id IS NOT NULL
    ) active_today
  `);
}

module.exports = {
  initialize, close, setAudioTimestampCutoff, saveMessage, captureAudio,
  pendingAudioJobs, publishedAudioJobs, discardAudioJobsBefore, markAudioJobPublished,
  completeAudioJob, markAudioJobForRetry, getAudioJobState, updateAudioFilePath, updateAudioTranscript,
  getAudioMessages, getCustomerNumbers, getTodayMessages,
  formatMessagesForGemini, buildReportInputManifest, getTodayStats, clearTodayMessages, purgeExpiredData,
  getLocalDateString, getPool, formatPhoneNumber, updateCustomerPhoneForChat,
  getDailyReportRevision, getCachedDailyReport, storeDailyReportCache,
  recordGeminiUsage, REPORT_PROMPT_VERSION, getLeadFollowupContacts, saveSalesDailyScores, getMonthlySalesScores,
  DATA_RETENTION_DAYS, DATA_RETENTION_MS,
  recordSalesChatSeen, getCustomerProfile, saveCustomerProfile, getActiveChatsForDate,
  // Prisma instance مباشر للاستخدام الداخلي إن احتجت
  getPrisma
};
