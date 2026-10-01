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

module.exports = { EGYPT_TIME_ZONE, formatCairoTime, formatCairoDateTime, getCairoDateString, getCairoDateRange };
