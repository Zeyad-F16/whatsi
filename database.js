/** PostgreSQL data access for whatsi Z-ray. */
const { Pool } = require('pg');
const crypto = require('crypto');
const { formatCairoTime, getCairoDateString, getCairoDateRange } = require('./timezone');

let pool;
const DATA_RETENTION_DAYS = Math.max(1, Number(process.env.DATA_RETENTION_DAYS || 7));
const DATA_RETENTION_MS = DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const RETENTION_SQL = `timestamp >= NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'`;
let audioTimestampCutoff = new Date(Date.now() - 5 * 60 * 1000);

function setAudioTimestampCutoff(timestampSeconds) {
  const timestamp = Number(timestampSeconds) * 1000;
  if (Number.isFinite(timestamp)) audioTimestampCutoff = new Date(timestamp);
}

function isWithinRetention(timestamp) {
  const time = timestamp instanceof Date ? timestamp.getTime() : Date.parse(timestamp);
  return Number.isFinite(time) && time >= Date.now() - DATA_RETENTION_MS;
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL غير مضبوط في ملف .env');
    pool = new Pool({
      connectionString,
      max: Number(process.env.PG_POOL_SIZE || 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      application_name: 'whatsi-desktop'
    });
    pool.on('error', err => console.error('[Database] Unexpected PostgreSQL error:', err));
  }
  return pool;
}

async function initialize() {
  const p = getPool();
  await p.query('SELECT 1');
  const { rows } = await p.query("SELECT to_regclass('public.messages') AS messages, to_regclass('public.audio_messages') AS audio_messages, to_regclass('public.audio_job_outbox') AS audio_job_outbox, to_regclass('public.daily_report_revisions') AS report_revisions, to_regclass('public.daily_report_cache') AS report_cache, to_regclass('public.gemini_usage') AS gemini_usage, to_regclass('public.customer_contact_history') AS contact_history, to_regclass('public.sales_daily_scores') AS sales_daily_scores");
  if (!rows[0].messages || !rows[0].audio_messages || !rows[0].audio_job_outbox || !rows[0].report_revisions || !rows[0].report_cache || !rows[0].gemini_usage || !rows[0].contact_history || !rows[0].sales_daily_scores) {
    throw new Error('مخطط PostgreSQL غير مطبق. نفّذ الأمر npm run db:migrate قبل تشغيل التطبيق.');
  }
  await p.query(`
    CREATE TABLE IF NOT EXISTS sales_chat_seen (
      account_id TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      unread_count INT NOT NULL DEFAULT 0,
      PRIMARY KEY (account_id, chat_id)
    );
  `);
  await backfillCustomerContactHistory();
  console.log('[Database] PostgreSQL connected; Prisma migration schema is ready.');
}

const ALL_ACCOUNTS_KEY = '__all__';
const REPORT_PROMPT_VERSION = 'daily-report-v14-followup-evidence';

function normalizeReportPeriod(period) {
  return ['last48h', 'last7days'].includes(period) ? period : 'today';
}

function reportRevisionKey(accountId, period) {
  return `${accountId || ALL_ACCOUNTS_KEY}::${normalizeReportPeriod(period)}`;
}

async function bumpDailyReportRevision(client, accountId, date) {
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
    await client.query(
      'INSERT INTO daily_report_revisions (account_key,report_date,version,updated_at) VALUES ($1,$2,1,NOW()) ' +
      'ON CONFLICT (account_key,report_date) DO UPDATE SET version=daily_report_revisions.version+1,updated_at=NOW()',
      [key, revisionDate]);
  }
}

async function getDailyReportRevision(accountId, date, period = 'today') {
  const key = reportRevisionKey(accountId, period);
  const globalKey = reportRevisionKey(null, period);
  const result = await getPool().query(
    'SELECT COALESCE((SELECT version FROM daily_report_revisions WHERE account_key=$1 AND report_date=$2),0) AS scoped, ' +
    'COALESCE((SELECT version FROM daily_report_revisions WHERE account_key=$3 AND report_date=$2),0) AS global',
    [key, date, globalKey]);
  return `${result.rows[0].scoped}:${result.rows[0].global}`;
}

async function getCachedDailyReport(accountId, date, sourceVersion, period = 'today', allowSourceChanges = false, allowPromptChanges = false) {
  const isRolling = ['last48h', 'last7days'].includes(normalizeReportPeriod(period));
  const validity = isRolling
    ? " AND NULLIF(payload->>'cacheValidUntil','') IS NOT NULL AND (payload->>'cacheValidUntil')::timestamptz > NOW()"
    : '';
  const params = [reportRevisionKey(accountId, period), date];
  let filters = '';
  if (!allowSourceChanges) { params.push(sourceVersion); filters += ` AND source_version=$${params.length}`; }
  if (!allowPromptChanges) { params.push(REPORT_PROMPT_VERSION); filters += ` AND prompt_version=$${params.length}`; }
  const result = await getPool().query(
    `SELECT payload,source_version,prompt_version FROM daily_report_cache WHERE account_key=$1 AND report_date=$2${filters} AND generated_at >= NOW()-INTERVAL '${DATA_RETENTION_DAYS} days'${validity}`,
    params);
  return result.rows[0] ? { ...result.rows[0].payload, _cacheSourceVersion: result.rows[0].source_version,
    _cachePromptVersion: result.rows[0].prompt_version } : null;
}

async function storeDailyReportCache(accountId, date, sourceVersion, payload, period = 'today') {
  const key = reportRevisionKey(accountId, period);
  const globalKey = reportRevisionKey(null, period);
  await getPool().query(
    'WITH args AS (SELECT $1::text AS account_key,$2::varchar(10) AS report_date,$3::varchar(80) AS source_version,' +
    '$4::varchar(80) AS prompt_version,$5::jsonb AS payload,$6::text AS scoped_key,$7::text AS global_key) ' +
    'INSERT INTO daily_report_cache (account_key,report_date,source_version,prompt_version,payload,generated_at) ' +
    'SELECT args.account_key,args.report_date,args.source_version,args.prompt_version,args.payload,NOW() FROM args ' +
    'WHERE args.source_version = COALESCE((SELECT version FROM daily_report_revisions WHERE account_key=args.scoped_key AND report_date=args.report_date),0)::text ' +
    '|| \':\' || COALESCE((SELECT version FROM daily_report_revisions WHERE account_key=args.global_key AND report_date=args.report_date),0)::text ' +
    'ON CONFLICT (account_key,report_date) DO UPDATE SET source_version=EXCLUDED.source_version,prompt_version=EXCLUDED.prompt_version,payload=EXCLUDED.payload,generated_at=EXCLUDED.generated_at',
    [key, date, sourceVersion, REPORT_PROMPT_VERSION, JSON.stringify(payload), key, globalKey]);
}

async function recordGeminiUsage(usage) {
  await getPool().query(
    'INSERT INTO gemini_usage (call_type,account_id,model,status,input_tokens,input_text_tokens,input_audio_tokens,cached_input_tokens,output_tokens,thinking_tokens,estimated_cost_usd,error_code) ' +
    'VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
    [usage.callType, usage.accountId || null, usage.model, usage.status, usage.inputTokens, usage.inputTextTokens,
      usage.inputAudioTokens, usage.cachedInputTokens, usage.outputTokens, usage.thinkingTokens,
      usage.estimatedCostUsd, usage.errorCode || null]);
}

async function close() {
  if (pool) { const p = pool; pool = null; await p.end(); }
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

function customerKeySql(alias) {
  // Canonicalize Egyptian local/international forms so one person is not
  // counted twice because the UI supplied a different phone format.
  const digits = "regexp_replace(COALESCE(" + alias + ".customer_phone,''), '[^0-9]', '', 'g')";
  return "NULLIF(CASE WHEN " + digits + " ~ '^0020[1][0125][0-9]{8}$' THEN substring(" + digits + " from 3) " +
    "WHEN " + digits + " ~ '^01[0125][0-9]{8}$' THEN '20' || substring(" + digits + " from 2) " +
    "WHEN " + digits + " ~ '^1[0125][0-9]{8}$' THEN '20' || " + digits + " " +
    "ELSE " + digits + " END, '')";
}

function chatKeySql(alias) {
  return "NULLIF(regexp_replace(BTRIM(COALESCE(" + alias + ".chat_id,'')), '@(c\\.us|s\\.whatsapp\\.net|lid)$', '', 'i'), '')";
}

function isDirectChatSql(alias) {
  return "(" + alias + ".chat_id IS NULL OR (" + alias + ".chat_id NOT LIKE '%@g.us' AND " + alias + ".chat_id NOT LIKE '%@broadcast' AND " + alias + ".chat_id NOT LIKE '%@newsletter'))";
}

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

async function registerCustomerContact(client, data, baseline = false) {
  const phoneHash = contactHash(data.customerPhone, null);
  const chatHash = contactHash(null, data.chatId);
  const hashes = [...new Set([phoneHash, chatHash].filter(Boolean))];
  if (!hashes.length) return null;
  const timestamp = data.timestamp || new Date().toISOString();
  const accountId = data.accountId || 'unknown';
  for (const hash of hashes) {
    await client.query(
      'INSERT INTO customer_contact_history (contact_hash,first_contact_at,first_account_id,baseline_contact,updated_at) VALUES ($1,$2,$3,$4,NOW()) ' +
      'ON CONFLICT (contact_hash) DO UPDATE SET first_account_id=CASE WHEN EXCLUDED.first_contact_at < customer_contact_history.first_contact_at THEN EXCLUDED.first_account_id ELSE customer_contact_history.first_account_id END,' +
      'first_contact_at=LEAST(customer_contact_history.first_contact_at,EXCLUDED.first_contact_at),baseline_contact=customer_contact_history.baseline_contact OR EXCLUDED.baseline_contact,updated_at=NOW()',
      [hash, timestamp, accountId, baseline]);
  }
  return phoneHash || chatHash;
}

async function backfillCustomerContactHistory() {
  const exists = await getPool().query('SELECT EXISTS(SELECT 1 FROM customer_contact_history) AS ready');
  if (exists.rows[0].ready) return;
  const rows = await getPool().query(
    "SELECT account_id,customer_phone,chat_id,timestamp FROM messages WHERE " + RETENTION_SQL + " " +
    "UNION ALL SELECT account_id,customer_phone,chat_id,timestamp FROM audio_messages WHERE " + RETENTION_SQL + " ORDER BY timestamp");
  if (!rows.rowCount) return;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const row of rows.rows) await registerCustomerContact(client, row, true);
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function saveMessage(data) {
  if (!isWithinRetention(data.timestamp || new Date())) return null;
  const values = [data.accountId || 'unknown', data.accountName || 'Unknown Account', data.customerName || 'Unknown Customer',
    data.customerPhone || null, data.chatId || null, data.messageId || null,
    ['sales', 'customer'].includes(data.sender) ? data.sender : 'customer', data.text || '',
      data.timestamp || new Date().toISOString(), data.displayTime || formatCairoTime()];
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    if (String(values[5] || '').startsWith('fallback:')) {
      const legacy = await client.query(
        'SELECT id FROM messages WHERE account_id=$1 AND message_id IS NULL AND chat_id IS NOT DISTINCT FROM $2 ' +
        'AND timestamp=$3::timestamptz AND sender=$4 AND text=$5 LIMIT 1',
        [values[0], values[4], values[8], values[6], values[7]]);
      if (legacy.rows[0]) {
        await client.query('COMMIT');
        return legacy.rows[0].id;
      }
    }
    const result = await client.query(
      "INSERT INTO messages (account_id,account_name,customer_name,customer_phone,chat_id,message_id,sender,text,timestamp,display_time) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (account_id,message_id) DO NOTHING RETURNING id",
      values);
    if (result.rows[0]) {
      await registerCustomerContact(client, { accountId: values[0], customerPhone: values[3], chatId: values[4], timestamp: values[8] });
      await bumpDailyReportRevision(client, values[0], getLocalDateString(new Date(values[8])));
      if (values[6] === 'sales' && values[4]) {
        await client.query(
          "INSERT INTO sales_chat_seen (account_id, chat_id, seen_at, unread_count) VALUES ($1, $2, $3, 0) ON CONFLICT (account_id, chat_id) DO UPDATE SET seen_at=EXCLUDED.seen_at, unread_count=0",
          [values[0], values[4], values[8]]
        );
      }
    }
    await client.query('COMMIT');
    return result.rows[0] ? result.rows[0].id : null;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function updateCustomerPhoneForChat(accountId, chatId, customerPhone) {
  if (!accountId || !chatId || !customerPhone) return 0;
  const values = [customerPhone, accountId, chatId];
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const messages = await client.query(
      "UPDATE messages SET customer_phone=$1 WHERE account_id=$2 AND chat_id=$3 AND " + RETENTION_SQL + " AND (customer_phone IS NULL OR customer_phone='') RETURNING timestamp,chat_id",
      values);
    const audio = await client.query(
      "UPDATE audio_messages SET customer_phone=$1 WHERE account_id=$2 AND chat_id=$3 AND " + RETENTION_SQL + " AND (customer_phone IS NULL OR customer_phone='') RETURNING timestamp,chat_id",
      values);
    const updatedRows = [...messages.rows, ...audio.rows];
    if (updatedRows.length) {
      const first = updatedRows.reduce((a, b) => new Date(a.timestamp) <= new Date(b.timestamp) ? a : b);
      await registerCustomerContact(client, { accountId, customerPhone, chatId: first.chat_id, timestamp: first.timestamp });
    }
    const dates = new Set(updatedRows.map(row => getLocalDateString(new Date(row.timestamp))));
    for (const date of dates) await bumpDailyReportRevision(client, accountId, date);
    await client.query('COMMIT');
    return messages.rowCount + audio.rowCount;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

// Save audio metadata and a durable outbox event in one PostgreSQL transaction.
async function captureAudio(data) {
  if (!isWithinRetention(data.timestamp || new Date())) return { id: null, inserted: false, ignored: true };
  const allowTranscription = Date.parse(data.timestamp || new Date()) >= audioTimestampCutoff.getTime();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const values = [data.accountId || 'unknown', data.accountName || 'Unknown', data.customerName || 'Unknown',
      data.customerPhone || null, data.chatId || null, data.messageId || null,
      ['sales', 'customer'].includes(data.sender) ? data.sender : 'customer', data.durationSec || null,
      data.timestamp || new Date().toISOString(), data.displayTime || ''];
    if (String(values[5] || '').startsWith('fallback:')) {
      const legacy = await client.query(
        'SELECT id FROM audio_messages WHERE account_id=$1 AND message_id IS NULL AND chat_id IS NOT DISTINCT FROM $2 ' +
        'AND timestamp=$3::timestamptz AND sender=$4 AND duration_sec IS NOT DISTINCT FROM $5 LIMIT 1',
        [values[0], values[4], values[8], values[6], values[7]]);
      if (legacy.rows[0]) {
        await client.query('COMMIT');
        return { id: String(legacy.rows[0].id), inserted: false, recoveredLegacy: true };
      }
    }
    let inserted = await client.query(
      "INSERT INTO audio_messages (account_id,account_name,customer_name,customer_phone,chat_id,message_id,sender,duration_sec,timestamp,display_time) " +
      "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (account_id,message_id) DO NOTHING RETURNING id",
      values);
    let audioId = inserted.rows[0] && inserted.rows[0].id;
    if (!audioId && data.messageId) {
      const existing = await client.query('SELECT id FROM audio_messages WHERE account_id=$1 AND message_id=$2 LIMIT 1', [values[0], data.messageId]);
      audioId = existing.rows[0] && existing.rows[0].id;
    }
    if (!audioId) throw new Error('تعذر حفظ سجل الرسالة الصوتية');
    if (inserted.rows[0]) {
      await registerCustomerContact(client, { accountId: values[0], customerPhone: values[3], chatId: values[4], timestamp: values[8] });
      await bumpDailyReportRevision(client, values[0], getLocalDateString(new Date(values[8])));
    }
    if (allowTranscription && ((data.mediaKey && (data.directPath || data.mediaUrl)) || (data.buffer && data.buffer.length > 100))) {
      const jobId = 'audio-' + String(audioId);
      await client.query(
        'INSERT INTO audio_job_outbox (job_id,audio_id,payload) VALUES ($1,$2,$3::jsonb) ON CONFLICT (job_id) DO NOTHING',
        [jobId, audioId, JSON.stringify({
          audioId: String(audioId), mediaKey: data.mediaKey, directPath: data.directPath || null,
          mediaUrl: data.mediaUrl || null, encFilehash: data.encFilehash || null,
          fileLength: data.fileLength || 0, mimetype: data.mimetype || '', buffer: data.buffer || null,
          sender: values[6], accountId: values[0], accountName: values[1], customerName: values[2]
        })]);
    }
    await client.query('COMMIT');
    return { id: String(audioId), inserted: Boolean(inserted.rows[0]) };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

async function pendingAudioJobs(limit = 100) {
  const r = await getPool().query(
    "SELECT o.job_id, o.payload FROM audio_job_outbox o JOIN audio_messages a ON a.id=o.audio_id WHERE o.published_at IS NULL AND a.timestamp >= $1 AND a.timestamp >= NOW() - INTERVAL '" + DATA_RETENTION_DAYS + " days' ORDER BY o.created_at LIMIT $2", [audioTimestampCutoff, limit]);
  return r.rows;
}
async function publishedAudioJobs(limit = 100) {
  const r = await getPool().query("SELECT o.job_id,o.audio_id FROM audio_job_outbox o JOIN audio_messages a ON a.id=o.audio_id WHERE o.published_at IS NOT NULL AND o.payload <> '{}'::jsonb AND a.timestamp >= $1 AND a.timestamp >= NOW() - INTERVAL '" + DATA_RETENTION_DAYS + " days' ORDER BY o.created_at LIMIT $2", [audioTimestampCutoff, limit]);
  return r.rows;
}
async function markAudioJobPublished(jobId) {
  await getPool().query('UPDATE audio_job_outbox SET published_at=NOW() WHERE job_id=$1 AND published_at IS NULL', [jobId]);
}
async function completeAudioJob(audioId) {
  await getPool().query("UPDATE audio_job_outbox SET payload='{}'::jsonb WHERE audio_id=$1", [audioId]);
}
async function markAudioJobForRetry(audioId) {
  await getPool().query('UPDATE audio_job_outbox SET published_at=NULL WHERE audio_id=$1', [audioId]);
}
async function getAudioJobState(id) {
  const r = await getPool().query('SELECT file_path, transcript, timestamp FROM audio_messages WHERE id=$1 AND timestamp >= $2 AND ' + RETENTION_SQL, [id, audioTimestampCutoff]);
  return r.rows[0] || null;
}

async function discardAudioJobsBefore(cutoff = audioTimestampCutoff) {
  const { rows } = await getPool().query(
    "UPDATE audio_job_outbox o SET payload='{}'::jsonb, published_at=NOW() FROM audio_messages a " +
    "WHERE o.audio_id=a.id AND a.timestamp < $1 AND o.payload <> '{}'::jsonb RETURNING o.job_id",
    [cutoff]);
  return rows.map(row => row.job_id);
}

async function updateAudioFilePath(id, filePath) {
  await getPool().query('UPDATE audio_messages SET file_path=$1 WHERE id=$2 AND ' + RETENTION_SQL, [filePath || '', id]);
}
async function updateAudioTranscript(id, transcript, toneAnalysis) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query('UPDATE audio_messages SET transcript=$1, tone_analysis=$2 WHERE id=$3 AND ' + RETENTION_SQL + ' RETURNING account_id,timestamp', [transcript || '', toneAnalysis || '', id]);
    if (updated.rows[0]) await bumpDailyReportRevision(client, updated.rows[0].account_id, getLocalDateString(new Date(updated.rows[0].timestamp)));
    await client.query('COMMIT');
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
async function getAudioMessages(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const values = [start, end];
  let accountClause = '';
  if (accountId) { values.push(accountId); accountClause = ' AND account_id=$3'; }
  const r = await getPool().query('SELECT * FROM audio_messages WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + ' AND ' + isDirectChatSql('audio_messages') + accountClause + ' ORDER BY timestamp', values);
  return r.rows.map(row => ({ ...row, display_time: formatCairoTime(new Date(row.timestamp)) }));
}

async function getCustomerNumbers(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const values = [start, end];
  let accountClause = '';
  if (accountId) { values.push(accountId); accountClause = ' AND account_id=$3'; }
  const sql = "SELECT DISTINCT ON (regexp_replace(customer_phone, '[^0-9]', '', 'g')) account_name, customer_name, customer_phone FROM (" +
    'SELECT account_id,account_name,customer_name,customer_phone,chat_id,timestamp FROM messages UNION ALL ' +
    'SELECT account_id,account_name,customer_name,customer_phone,chat_id,timestamp FROM audio_messages) c ' +
    'WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + ' AND (chat_id IS NULL OR (chat_id NOT LIKE \'%@g.us\' AND chat_id NOT LIKE \'%@broadcast\' AND chat_id NOT LIKE \'%@newsletter\')) ' +
    "AND customer_phone IS NOT NULL AND customer_phone <> ''" + accountClause + " ORDER BY regexp_replace(customer_phone, '[^0-9]', '', 'g'), account_name, customer_name";
  return (await getPool().query(sql, values)).rows;
}

async function getLeadFollowupContacts(accountId = null, date = null, period = 'today') {
  const [start, end] = getReportRange(period, date);
  const values = [start, end];
  let accountClause = '';
  if (accountId) { values.push(accountId); accountClause = ' AND account_id=$3'; }
  const result = await getPool().query(
    'SELECT account_id,account_name,customer_name,customer_phone,chat_id,timestamp FROM (' +
    'SELECT account_id,account_name,customer_name,customer_phone,chat_id,timestamp FROM messages ' +
    'UNION ALL SELECT account_id,account_name,customer_name,customer_phone,chat_id,timestamp FROM audio_messages) c ' +
    'WHERE timestamp >= $1 AND timestamp < $2 AND ' + isDirectChatSql('c') + accountClause + ' ORDER BY timestamp', values);
  const contacts = new Map();
  const phoneByChat = new Map();
  for (const row of result.rows) {
    if (!row.customer_phone || !row.chat_id) continue;
    const chat = String(row.chat_id).trim().replace(/@(c\.us|s\.whatsapp\.net|lid)$/i, '');
    const phoneHash = contactHash(row.customer_phone, null);
    if (phoneHash) phoneByChat.set(`${row.account_id}\u0000${chat}`, phoneHash);
  }
  for (const row of result.rows) {
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
  const history = await getPool().query(
    'SELECT contact_hash,first_contact_at,baseline_contact FROM customer_contact_history WHERE contact_hash=ANY($1::varchar[])', [hashes]);
  const historyByHash = new Map(history.rows.map(row => [row.contact_hash, row]));
  const startTime = new Date(start).getTime();
  const leads = [];
  const followups = [];
  for (const contact of contacts.values()) {
    const matchingHistory = [...contact.identityHashes].map(hash => historyByHash.get(hash)).filter(Boolean);
    // A contact is new only if all known identity aliases (phone and WhatsApp
    // chat id) first appeared within this period, with no historical baseline.
    // This avoids calling a previously contacted student a lead after their
    // phone number becomes available for a chat that was first stored by LID.
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
  const values = [start, end];
  let accountClause = '';
  if (accountId) { values.push(accountId); accountClause = ' AND account_id=$3'; }
  const sql = 'SELECT id,account_id,account_name,customer_name,customer_phone,chat_id,message_id,sender,text,timestamp,display_time FROM messages ' +
    'WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + ' AND ' + isDirectChatSql('messages') + accountClause + ' ORDER BY account_id,customer_name,timestamp';
  const { rows } = await getPool().query(sql, values);
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
  const values = [start, end, start, end];
  let a1 = '', a2 = '';
  if (accountId) { values.push(accountId, accountId); a1 = ' AND account_id=$5'; a2 = ' AND account_id=$6'; }
  const cte = 'WITH raw_messages AS (' +
    'SELECT account_id,account_name,' + customerKeySql('messages') + ' AS phone_key,' + chatKeySql('messages') + ' AS raw_chat_key,sender FROM messages WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + a1 + ' AND ' + isDirectChatSql('messages') +
    ' UNION ALL SELECT account_id,account_name,' + customerKeySql('audio_messages') + ' AS phone_key,' + chatKeySql('audio_messages') + ' AS raw_chat_key,sender FROM audio_messages WHERE timestamp >= $3 AND timestamp < $4 AND ' + RETENTION_SQL + a2 + ' AND ' + isDirectChatSql('audio_messages') +
    '), day_messages AS (SELECT account_id,account_name,COALESCE(MAX(phone_key) OVER (PARTITION BY account_id,COALESCE(raw_chat_key,phone_key)),phone_key,raw_chat_key) AS chat_key,sender FROM raw_messages) ';
  const [totals, accounts] = await Promise.all([
    getPool().query(cte + 'SELECT COUNT(DISTINCT account_id) AS accounts,COUNT(DISTINCT (account_id,chat_key)) FILTER (WHERE chat_key IS NOT NULL) AS chats,COUNT(*) AS total_messages,' +
      "COUNT(*) FILTER (WHERE sender='sales') AS sales_messages,COUNT(*) FILTER (WHERE sender='customer') AS customer_messages FROM day_messages", values),
    getPool().query(cte + 'SELECT account_id,MIN(account_name) AS account_name,COUNT(DISTINCT chat_key) FILTER (WHERE chat_key IS NOT NULL) AS chats,COUNT(*) AS total_messages,' +
      "COUNT(*) FILTER (WHERE sender='sales') AS sales_messages,COUNT(*) FILTER (WHERE sender='customer') AS customer_messages FROM day_messages GROUP BY account_id ORDER BY account_name", values)
  ]);
  const stats = totals.rows[0];
  for (const key of Object.keys(stats)) stats[key] = Number(stats[key]);
  stats.perAccount = Object.fromEntries(accounts.rows.map(row => [row.account_id, {
    accountId: row.account_id, accountName: row.account_name, chats: Number(row.chats), totalMessages: Number(row.total_messages),
    salesMessages: Number(row.sales_messages), customerMessages: Number(row.customer_messages)
  }]));
  return stats;
}

async function saveSalesDailyScores(scores, { date, leadCounts = {}, followupCounts = {}, conversationCounts = {} }) {
  if (!Array.isArray(scores) || !scores.length) return 0;
  const client = await getPool().connect();
  let saved = 0;
  try {
    await client.query('BEGIN');
    for (const score of scores) {
      const overall = Number(score.overallScore);
      if (!score.accountId || !Number.isInteger(overall) || overall < 0 || overall > 100) continue;
      await client.query(
        'INSERT INTO sales_daily_scores (account_id,score_date,account_name,overall_score,improvement,lead_count,followup_count,conversation_count,generated_at) ' +
        'VALUES ($1,$2::date,$3,$4,$5,$6,$7,$8,NOW()) ON CONFLICT (account_id,score_date) DO UPDATE SET account_name=EXCLUDED.account_name,' +
        'overall_score=EXCLUDED.overall_score,improvement=EXCLUDED.improvement,lead_count=EXCLUDED.lead_count,followup_count=EXCLUDED.followup_count,' +
        'conversation_count=EXCLUDED.conversation_count,generated_at=NOW()',
        [score.accountId, date, String(score.accountName || ''), overall, String(score.improvement || '').slice(0, 1200),
          leadCounts[score.accountId] || 0, followupCounts[score.accountId] || 0, conversationCounts[score.accountId] || 0]);
      saved++;
    }
    await client.query('COMMIT');
    return saved;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function getMonthlySalesScores(month, accountId = null) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('شهر غير صالح');
  const [year, monthNumber] = month.split('-').map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  const values = [month + '-01', nextMonth];
  let accountClause = '';
  if (accountId) { values.push(accountId); accountClause = ' AND account_id=$3'; }
  const result = await getPool().query('SELECT account_id,score_date,account_name,overall_score,improvement,lead_count,followup_count,conversation_count,generated_at ' +
    'FROM sales_daily_scores WHERE score_date >= $1::date AND score_date < $2::date' + accountClause + ' ORDER BY score_date,account_name', values);
  return result.rows;
}

async function clearTodayMessages(date = null, accountId = null) {
  const [start, end] = getCairoDateRange(date);
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const values = [start, end];
    let clause = '';
    if (accountId) { values.push(accountId); clause = ' AND account_id=$3'; }
    const files = await client.query('SELECT file_path FROM audio_messages WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + clause, values);
    const messages = await client.query('DELETE FROM messages WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + clause, values);
    const audio = await client.query('DELETE FROM audio_messages WHERE timestamp >= $1 AND timestamp < $2 AND ' + RETENTION_SQL + clause, values);
    if (messages.rowCount || audio.rowCount) {
      if (accountId) await bumpDailyReportRevision(client, accountId, getLocalDateString(new Date(start)));
      else await bumpDailyReportRevision(client, null, getLocalDateString(new Date(start)));
    }
    await client.query('COMMIT');
    return { messages: messages.rowCount, audio: audio.rowCount, deleted: messages.rowCount + audio.rowCount, audioFiles: files.rows.map(r=>r.file_path).filter(Boolean) };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

// Delete expired messages transactionally; audio records cascade to their outbox rows.
async function purgeExpiredData() {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const files = await client.query(`SELECT id, file_path FROM audio_messages WHERE timestamp < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days'`);
    const messages = await client.query(`DELETE FROM messages WHERE timestamp < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days' RETURNING account_id,timestamp`);
    const audio = await client.query(`DELETE FROM audio_messages WHERE timestamp < NOW() - INTERVAL '${DATA_RETENTION_DAYS} days' RETURNING account_id,timestamp`);
    const touched = new Set([...messages.rows, ...audio.rows].map(row => `${row.account_id}\u0000${getLocalDateString(new Date(row.timestamp))}`));
    for (const item of touched) {
      const [accountId, date] = item.split('\u0000');
      await bumpDailyReportRevision(client, accountId, date);
    }
    await client.query(`DELETE FROM daily_report_cache WHERE generated_at < NOW()-INTERVAL '${DATA_RETENTION_DAYS} days' OR report_date <= to_char((NOW()-INTERVAL '${DATA_RETENTION_DAYS} days')::date, 'YYYY-MM-DD')`);
    await client.query(`DELETE FROM daily_report_revisions WHERE report_date < to_char((NOW()-INTERVAL '${DATA_RETENTION_DAYS + 1} days')::date, 'YYYY-MM-DD')`);
    await client.query("DELETE FROM gemini_usage WHERE occurred_at < NOW()-INTERVAL '30 days'");
    await client.query('COMMIT');
    return {
      messages: messages.rowCount,
      audio: audio.rowCount,
      audioIds: files.rows.map(row => String(row.id)),
      audioFiles: files.rows.map(row => row.file_path).filter(Boolean)
    };
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function recordSalesChatSeen(accountId, chatId, unreadCount = 0, seenAt = new Date().toISOString()) {
  if (!accountId || !chatId) return;
  const p = getPool();
  await p.query(`
    INSERT INTO sales_chat_seen (account_id, chat_id, seen_at, unread_count)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (account_id, chat_id)
    DO UPDATE SET seen_at = EXCLUDED.seen_at, unread_count = EXCLUDED.unread_count;
  `, [accountId, chatId, seenAt, unreadCount]);
}

module.exports = { initialize, close, setAudioTimestampCutoff, saveMessage, captureAudio, pendingAudioJobs, publishedAudioJobs, discardAudioJobsBefore, markAudioJobPublished,
  completeAudioJob, markAudioJobForRetry, getAudioJobState, updateAudioFilePath, updateAudioTranscript, getAudioMessages, getCustomerNumbers, getTodayMessages,
  formatMessagesForGemini, buildReportInputManifest, getTodayStats, clearTodayMessages, purgeExpiredData, getLocalDateString,
  getPool, formatPhoneNumber, updateCustomerPhoneForChat, getDailyReportRevision, getCachedDailyReport, storeDailyReportCache,
  recordGeminiUsage, REPORT_PROMPT_VERSION, getLeadFollowupContacts, saveSalesDailyScores, getMonthlySalesScores, DATA_RETENTION_DAYS, DATA_RETENTION_MS,
  recordSalesChatSeen };
