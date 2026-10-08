const EGYPT_TIME_ZONE = 'Africa/Cairo';

const cairoDatePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: EGYPT_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit'
});
const cairoDateTimePartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: EGYPT_TIME_ZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});

function formatCairoTime(date = new Date()) {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: EGYPT_TIME_ZONE,
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function formatCairoDateTime(date = new Date()) {
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: EGYPT_TIME_ZONE,
    dateStyle: 'short', timeStyle: 'short'
  }).format(date);
}

function getCairoDateString(date = new Date()) {
  const parts = Object.fromEntries(cairoDatePartsFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function cairoMidnightUtc(year, month, day) {
  const targetLocalAsUtc = Date.UTC(year, month - 1, day);
  const targetDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const offsets = new Set();

  // Sample both sides of midnight so ambiguous or skipped midnight during a
  // Cairo DST transition still resolves to the first instant of that date.
  for (let hours = -36; hours <= 36; hours += 6) {
    const sample = targetLocalAsUtc + hours * 60 * 60 * 1000;
    const parts = Object.fromEntries(cairoDateTimePartsFormatter.formatToParts(new Date(sample)).map(part => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second)
    );
    offsets.add(representedAsUtc - sample);
  }

  const candidates = [...offsets].map(offset => targetLocalAsUtc - offset).filter(instant => {
    const parts = Object.fromEntries(cairoDateTimePartsFormatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}` === targetDate;
  });
  if (!candidates.length) throw new Error('تعذر تحديد بداية اليوم بتوقيت القاهرة');
  return new Date(Math.min(...candidates));
}

function getCairoDateRange(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!match) throw new Error('تاريخ غير صالح');
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = cairoMidnightUtc(year, month, day);
  if (getCairoDateString(start) !== date) throw new Error('تاريخ غير صالح');
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const end = cairoMidnightUtc(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
  return [start.toISOString(), end.toISOString()];
}

function getCairoDayOfWeek(date) {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: EGYPT_TIME_ZONE,
    weekday: 'short'
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(dayName);
}

/**
 * حساب ثواني الانتظار الفعلية فقط خلال ساعات وأيام عمل الموظف بتوقيت القاهرة.
 * @param {number} startMs - توقيت بداية الانتظار بالمللي ثانية
 * @param {number} endMs   - توقيت الرد أو الوقت الحالي بالمللي ثانية
 * @param {object} schedule - جدول عمل الموظف: { enabled, start: "HH:MM", end: "HH:MM", workDays: [0..6] }
 */
function calculateBusinessSeconds(startMs, endMs, schedule) {
  if (!startMs || !endMs || endMs <= startMs) return 0;
  if (!schedule || schedule.enabled === false) {
    return Math.max(0, Math.round((endMs - startMs) / 1000));
  }

  const workDays = Array.isArray(schedule.workDays) && schedule.workDays.length > 0
    ? schedule.workDays.map(Number)
    : [0, 1, 2, 3, 4, 6]; // افتراضي: السبت إلى الخميس (الجمعة إجازة)

  const [startHour = 9, startMin = 0] = String(schedule.start || '09:00').split(':').map(Number);
  const [endHour = 18, endMin = 0] = String(schedule.end || '18:00').split(':').map(Number);

  const startDateStr = getCairoDateString(new Date(startMs));
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const endDateStr = getCairoDateString(new Date(endMs));
  const [ey, em, ed] = endDateStr.split('-').map(Number);

  let curUtc = new Date(Date.UTC(sy, sm - 1, sd));
  const endUtc = new Date(Date.UTC(ey, em - 1, ed));
  let totalBusinessSeconds = 0;

  while (curUtc <= endUtc) {
    const year = curUtc.getUTCFullYear();
    const month = curUtc.getUTCMonth() + 1;
    const day = curUtc.getUTCDate();
    const midnight = cairoMidnightUtc(year, month, day);
    const noon = new Date(midnight.getTime() + 12 * 3600 * 1000);
    const dayIndex = getCairoDayOfWeek(noon);

    if (workDays.includes(dayIndex)) {
      if (startHour < endHour || (startHour === endHour && startMin < endMin)) {
        const shiftStartMs = midnight.getTime() + (startHour * 60 + startMin) * 60 * 1000;
        const shiftEndMs = midnight.getTime() + (endHour * 60 + endMin) * 60 * 1000;
        const overlapStart = Math.max(startMs, shiftStartMs);
        const overlapEnd = Math.min(endMs, shiftEndMs);
        if (overlapEnd > overlapStart) totalBusinessSeconds += (overlapEnd - overlapStart) / 1000;
      } else {
        // دوام ممتد عبر منتصف الليل
        const shiftStartMs = midnight.getTime() + (startHour * 60 + startMin) * 60 * 1000;
        const shiftEndMs = midnight.getTime() + 24 * 3600 * 1000;
        const overlapStart1 = Math.max(startMs, shiftStartMs);
        const overlapEnd1 = Math.min(endMs, shiftEndMs);
        if (overlapEnd1 > overlapStart1) totalBusinessSeconds += (overlapEnd1 - overlapStart1) / 1000;

        const morningEndMs = midnight.getTime() + (endHour * 60 + endMin) * 60 * 1000;
        const overlapStart2 = Math.max(startMs, midnight.getTime());
        const overlapEnd2 = Math.min(endMs, morningEndMs);
        if (overlapEnd2 > overlapStart2) totalBusinessSeconds += (overlapEnd2 - overlapStart2) / 1000;
      }
    }
    curUtc.setUTCDate(curUtc.getUTCDate() + 1);
  }

  return Math.max(0, Math.round(totalBusinessSeconds));
}

/**
 * فحص ما إذا كانت رسالة العميل الأخيرة مجرد تحية/شكر ختامي لا تتطلب رداً.
 */
function isConcludingCustomerMessage(text) {
  if (!text) return false;
  const clean = String(text).trim().toLowerCase()
    .replace(/[.,!؟?~_—–\-+=/\\^%$#@*()\[\]{}|:;"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length === 0) return true;

  const closingPhrases = [
    'شكرا', 'شكرا جزيلا', 'شكرا ليك', 'شكرا جدا', 'الف شكر', 'ألف شكر', 'تسلم', 'تسلملي',
    'ربنا يخليك', 'جزاك الله خيرا', 'الله يخليك', 'يسلمو', 'مشكور', 'يعطيك العافية', 'الله يعافيك',
    'تمام شكرا', 'تمام يا فندم', 'تمام شكرا جزيلا', 'تمام تسلم', 'تمام الف شكر',
    'اوك شكرا', 'اوكي شكرا', 'ماشي شكرا', 'حبيبي شكرا', 'تمام كدة', 'تمام كده', 'كده تمام', 'كدة تمام',
    'ok', 'okay', 'thanks', 'thank you', 'thx', 'ty'
  ];

  if (closingPhrases.includes(clean)) return true;

  if (clean.length <= 25 && /^(?:شكرا|تسلم|الف شكر|ألف شكر|جزاك الله|تمام شكرا|يسلمو|مشكور|thanks|thank you)\b/.test(clean)) {
    return true;
  }

  return false;
}

module.exports = {
  EGYPT_TIME_ZONE,
  formatCairoTime,
  formatCairoDateTime,
  getCairoDateString,
  getCairoDateRange,
  getCairoDayOfWeek,
  cairoMidnightUtc,
  calculateBusinessSeconds,
  isConcludingCustomerMessage
};
