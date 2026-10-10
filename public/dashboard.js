/**
 * dashboard.js
 * كود العميل للوحة التحكم المستقلة (Web Dashboard).
 * يتصل بالسيرفر عبر REST API دون الحاجة لأي مكتبات Electron.
 */

// ===== State =====
let accounts = [];
let currentPeriod = 'today';
let reportData = null;
let latestEvidenceGate = null;
let editingAccountId = null;

const dayNamesArabic = {
  6: 'السبت',
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة'
};

// ===== Elements =====
const reportAccountSelect = document.getElementById('report-account');
const reportSubtitleText = document.getElementById('report-subtitle-text');
const reportEmpty = document.getElementById('report-empty');
const reportLoading = document.getElementById('report-loading');
const reportOutput = document.getElementById('report-output');
const reportError = document.getElementById('report-error');
const loadingProgress = document.getElementById('loading-progress');
const reportText = document.getElementById('report-text');

// ===== Initialization =====
async function init() {
  await loadAccounts();
  await refreshLiveData();
  await loadMonthlyScores();
}

// ===== Account Management =====
async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (data.success && Array.isArray(data.accounts)) {
      accounts = data.accounts;
      renderAccountSelect();
    }
  } catch (err) {
    console.error('Failed to load accounts:', err);
  }
}

function renderAccountSelect() {
  const currentVal = reportAccountSelect.value;
  reportAccountSelect.innerHTML = '<option value="">كل الحسابات</option>';
  for (const acc of accounts) {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = acc.name;
    reportAccountSelect.appendChild(opt);
  }
  if (currentVal && accounts.some(a => a.id === currentVal)) {
    reportAccountSelect.value = currentVal;
  }
}

reportAccountSelect.addEventListener('change', () => {
  refreshLiveData();
  loadMonthlyScores();
});

// ===== Live Stats & KPI Refresh =====
async function refreshLiveData() {
  const accountId = reportAccountSelect.value || '';
  try {
    const res = await fetch(`/api/stats?period=${currentPeriod}&accountId=${accountId}`);
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('stat-chats').textContent = s.chats || 0;
      document.getElementById('stat-messages').textContent = s.total_messages || 0;
      document.getElementById('stat-sales-messages').textContent = s.sales_messages || 0;
      document.getElementById('stat-customer-messages').textContent = s.customer_messages || 0;
      document.getElementById('stat-leads').textContent = s.leadCount || 0;
      document.getElementById('stat-followups').textContent = s.followupCount || 0;
    }
  } catch (err) {
    console.error('Failed to refresh stats:', err);
  }
}

// ===== Period Switching =====
window.setPeriodAndGenerate = function(period) {
  currentPeriod = period;
  const buttons = document.querySelectorAll('.period-btn');
  buttons.forEach(btn => {
    const active = (period === 'today' && btn.id === 'report-today-btn') ||
                   (period === 'yesterday' && btn.id === 'report-yesterday-btn') ||
                   (period === 'last48h' && btn.id === 'report-last48-btn') ||
                   (period === 'last7days' && btn.id === 'report-last7days-btn');
    btn.classList.toggle('active', active);
  });
  refreshLiveData();
  generateReport(period);
};

// ===== Generate Report =====
window.generateReport = async function(periodParam) {
  const period = periodParam || currentPeriod;
  currentPeriod = period;

  const periodButtons = [...document.querySelectorAll('.period-btn')];
  periodButtons.forEach(b => b.disabled = true);

  reportEmpty.classList.add('hidden');
  reportOutput.classList.add('hidden');
  reportError.classList.add('hidden');
  reportLoading.classList.remove('hidden');

  const loadingMessages = [
    period === 'today' ? 'يقرأ محادثات اليوم منذ منتصف الليل...' :
    period === 'yesterday' ? 'يقرأ تقرير ورسائل أمس المحفوظة...' :
    period === 'last7days' ? 'يجمع ويفحص المحادثات خلال آخر 7 أيام...' :
    'يجمع المحادثات من آخر 48 ساعة...',
    'يحلل أسلوب ممثلي المبيعات وسرعة الرد...',
    'يكتشف الفرص الضائعة ونقاط التحسين...',
    'يرتب التوصيات حسب الأولوية...',
    'يكتب التقرير النهائي التفاعلي...'
  ];

  let msgIdx = 0;
  const loadingInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    if (loadingProgress) loadingProgress.textContent = loadingMessages[msgIdx];
  }, 3000);

  try {
    const accountId = reportAccountSelect.value || null;
    const res = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, period })
    });
    const result = await res.json();

    clearInterval(loadingInterval);
    reportLoading.classList.add('hidden');

    if (result.success) {
      reportData = result;
      latestEvidenceGate = {
        date: result.date,
        period: result.period,
        evidenceByAccount: result.currentStats?.evidenceByAccount || {}
      };
      displayReport(result);
      renderMonthlyScores(result.monthlyScores || []);
      reportOutput.classList.remove('hidden');
    } else {
      showReportError(result.error || 'تعذر استخراج التقرير');
    }
  } catch (err) {
    clearInterval(loadingInterval);
    reportLoading.classList.add('hidden');
    showReportError(err.message || 'حدث خطأ في الاتصال بالخادم');
  } finally {
    periodButtons.forEach(b => b.disabled = false);
  }
};

// ===== Display Report Output =====
function displayReport(result) {
  reportText.innerHTML = '';

  const subtitle = result.period === 'today'
    ? `تاريخ اليوم: ${result.date}`
    : result.period === 'yesterday'
      ? `تاريخ أمس: ${result.date}`
      : result.period === 'last7days'
        ? `آخر 7 أيام حتى الآن`
        : `آخر 48 ساعة حتى الآن`;
  if (reportSubtitleText) reportSubtitleText.textContent = subtitle;

  const stats = result.currentStats || {};

  // 1. قسم إحصائيات سرعة الرد المخصصة بمواعيد العمل
  const responseMetricsSection = renderResponseMetrics(stats.responseMetrics || {});
  if (responseMetricsSection) reportText.appendChild(responseMetricsSection);

  // 2. كفاية عينة التقييم
  const evidenceCoverageSection = renderEvidenceCoverage(stats.evidenceByAccount || {});
  if (evidenceCoverageSection) reportText.appendChild(evidenceCoverageSection);

  // 3. محتوى التقرير (Markdown)
  const reportContent = document.createElement('div');
  reportContent.className = 'report-markdown-body';
  reportContent.innerHTML = formatMarkdown(result.report || '');
  addPhoneCopyControls(reportContent);
  reportText.appendChild(reportContent);

  // 4. التسجيلات الصوتية
  if (Array.isArray(result.audioEvidence) && result.audioEvidence.length > 0) {
    const audioSection = renderAudioEvidence(result.audioEvidence);
    if (audioSection) reportText.appendChild(audioSection);
  }
}

// ===== Response Metrics Table =====
function renderResponseMetrics(metrics) {
  const accountsList = Object.values(metrics.perAccount || {});
  if (!accountsList.length) return null;
  if (metrics.total && accountsList.length > 1) accountsList.unshift(metrics.total);

  const section = document.createElement('section');
  section.className = 'report-response-metrics';
  section.dir = 'rtl';

  const heading = document.createElement('h3');
  heading.style.marginTop = '0';
  heading.textContent = 'إحصائيات سرعة ومتابعة الرد (محسوبة بدقة بناءً على مواعيد عمل كل موظف)';

  const note = document.createElement('p');
  note.className = 'response-metrics-note';
  note.textContent = 'تُحسب مدة الرد وأوقات الانتظار حصرياً خلال ساعات العمل وأيام الدوام المحددة لكل موظف. لا يُحسب وقت الليل أو أيام الإجازة كتأخير.';

  section.append(heading, note);

  const table = document.createElement('table');
  table.className = 'response-metrics-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>الحساب</th>
        <th>أول رد: متوسط · وسيط · عدد</th>
        <th>الردود المتكررة: متوسط · وسيط · عدد</th>
        <th>محادثات تنتظر رد السيلز</th>
        <th>أقدم انتظار</th>
      </tr>
    </thead>
    <tbody>
      ${accountsList.map(acc => `
        <tr>
          <td><b>${escapeHtml(acc.accountName || 'غير معروف')}</b></td>
          <td>${formatDuration(acc.firstReply?.averageSeconds)} · ${formatDuration(acc.firstReply?.medianSeconds)} · ${acc.firstReply?.count || 0} رد</td>
          <td>${formatDuration(acc.repeatedReplies?.averageSeconds)} · ${formatDuration(acc.repeatedReplies?.medianSeconds)} · ${acc.repeatedReplies?.count || 0} رد</td>
          <td>${acc.pendingSalesReplyCount || 0}</td>
          <td>${formatDuration(acc.oldestPendingSeconds, acc.oldestPendingIsLowerBound)}</td>
        </tr>
      `).join('')}
    </tbody>
  `;

  section.appendChild(table);
  return section;
}

// ===== Evidence Coverage Cards =====
function renderEvidenceCoverage(evidenceByAccount) {
  const accountsList = Object.values(evidenceByAccount || {});
  if (!accountsList.length) return null;

  const section = document.createElement('section');
  section.className = 'report-evidence-coverage';
  section.dir = 'rtl';

  const heading = document.createElement('h3');
  heading.textContent = 'كفاية عينة التقييم السلوكي';
  const note = document.createElement('p');
  note.className = 'evidence-coverage-note';
  note.textContent = 'التقييمات الرقمية تُعتمد فقط عند توفر 3 محادثات و10 رسائل سيلز و5 رسائل عملاء على الأقل لضمان الدقة وتفادي الأحكام المتسرعة.';

  section.append(heading, note);

  for (const account of accountsList) {
    const card = document.createElement('article');
    card.className = `evidence-coverage-card${account.status === 'insufficient' ? ' evidence-coverage-card--insufficient' : ''}`;
    card.innerHTML = `
      <strong>${escapeHtml(account.accountName || 'الحساب')} — ${account.status === 'sufficient' ? 'عينة كافية للتقييم' : 'دليل غير كافٍ لدرجة يومية موثوقة'}</strong>
      <p>${account.chats} محادثة · ${account.salesMessages} رسالة سيلز · ${account.customerMessages} رسالة عميل · ${account.shortChats} محادثة قصيرة</p>
      <p style="font-size:0.8rem; color:var(--text-dim);">${escapeHtml(account.note || '')}</p>
    `;
    section.appendChild(card);
  }
  return section;
}

// ===== Audio Evidence Cards =====
function renderAudioEvidence(items) {
  if (!items.length) return null;
  const section = document.createElement('section');
  section.className = 'report-audio-evidence';
  section.dir = 'rtl';

  const title = document.createElement('h3');
  title.textContent = `التقرير الشامل للتسجيلات الصوتية (${items.length} تسجيل)`;
  section.appendChild(title);

  for (const item of [...items].sort((a, b) => Number(b.abusive) - Number(a.abusive))) {
    const card = document.createElement('article');
    card.className = `audio-evidence-card${item.abusive ? ' audio-evidence-card--abusive' : ''}`;
    const sender = item.sender === 'sales' ? `السيلز: ${item.accountName || 'غير معروف'}` : `العميل: ${item.customerName || 'غير معروف'}`;
    card.innerHTML = `
      <h4>🎤 رسالة صوتية — ${escapeHtml(item.time || item.timestamp || '')} — ${escapeHtml(sender)}</h4>
      <p class="audio-evidence-classification${item.abusive ? ' audio-evidence-classification--abusive' : ''}">تصنيف المحتوى: ${escapeHtml(item.abuseLabel || 'غير مصنّف')}</p>
      ${item.abuseReason ? `<p class="audio-evidence-reason">${escapeHtml(item.abuseReason)}</p>` : ''}
      <p class="audio-evidence-meta">${item.customerPhone ? `واتساب: ${escapeHtml(item.customerPhone)}` : ''} ${item.durationSec ? `· المدة: ${item.durationSec} ثانية` : ''}</p>
      <strong>التفريغ الصوتي:</strong>
      <pre class="audio-transcript-raw" dir="auto">${escapeHtml(item.transcript || 'لا يوجد تفريغ متاح.')}</pre>
      ${item.tone ? `<p class="audio-evidence-tone">نبرة الصوت: ${escapeHtml(item.tone)}</p>` : ''}
    `;
    section.appendChild(card);
  }
  return section;
}

// ===== Monthly Scores =====
async function loadMonthlyScores() {
  const accountId = reportAccountSelect.value || '';
  try {
    const res = await fetch(`/api/monthly-scores?accountId=${accountId}`);
    const data = await res.json();
    if (data.success) {
      renderMonthlyScores(data.scores || []);
    }
  } catch (err) {
    console.error('Failed to load monthly scores:', err);
  }
}

function renderMonthlyScores(scores = []) {
  const body = document.getElementById('monthly-scores-body');
  if (!body) return;

  if (latestEvidenceGate && !['last48h', 'last7days'].includes(latestEvidenceGate.period)) {
    const insufficientAccountIds = new Set(Object.values(latestEvidenceGate.evidenceByAccount)
      .filter(account => account.status === 'insufficient').map(account => account.accountId));
    scores = scores.filter(row => !(insufficientAccountIds.has(row.account_id) && String(row.score_date).slice(0, 10) === latestEvidenceGate.date));
  }

  if (!scores.length) {
    body.innerHTML = '<tr><td colspan="7" class="scores-empty">لا توجد تقييمات محفوظة لهذا الشهر بعد. استخرج تقرير اليوم لحفظ تقييم.</td></tr>';
    return;
  }

  body.innerHTML = scores.map(row => {
    const rawDate = String(row.score_date).slice(0, 10);
    const dateLabel = rawDate.split('-').reverse().join('/');
    const score = Number(row.overall_score) || 0;
    const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
    return `
      <tr>
        <td>${escapeHtml(dateLabel)}</td>
        <td><b>${escapeHtml(row.account_name || '')}</b></td>
        <td><span class="score-pill ${scoreClass}">${score}/100</span></td>
        <td>${Number(row.lead_count) || 0}</td>
        <td>${Number(row.followup_count) || 0}</td>
        <td>${Number(row.conversation_count) || 0}</td>
        <td class="score-improvement">${escapeHtml(row.improvement || '—')}</td>
      </tr>
    `;
  }).join('');
}

// ===== Markdown Formatter =====
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.+)$/gm, '<h3 class="report-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="report-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="report-h1">$1</h1>')
    .replace(/\*\*خطأ كتابي مثبت\*\*/g, '<strong class="report-error-flag">خطأ كتابي مثبت</strong>')
    .replace(/\*\*فرصة لتحسين الأسلوب\*\*/g, '<strong class="report-improvement-flag">فرصة لتحسين الأسلوب</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> ?(.+)$/gm, '<blockquote class="report-quote">$1</blockquote>')
    .replace(/^[*-] (.+)$/gm, '<li class="report-bullet">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="numbered"><span class="num">$1.</span> $2</li>')
    .replace(/^---+$/gm, '<hr class="report-divider">')
    .replace(/\n\n/g, '</p><p class="report-para">')
    .replace(/(?:<li class="numbered">.*<\/li>\n?)+/g, match => `<ol class="report-ordered-list">${match}</ol>`)
    .replace(/(?:<li class="report-bullet">.*<\/li>\n?)+/g, match => `<ul class="report-list">${match}</ul>`);
}

function addPhoneCopyControls(container) {
  const phonePattern = /(?<![\p{L}\p{N}])(?:\+\s?[0-9٠-٩۰-۹](?:[\s().-]*[0-9٠-٩۰-۹]){7,14}|01[0125](?:[\s().-]*[0-9٠-٩۰-۹]){8})(?![\p{L}\p{N}])/gu;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.closest('button, a, code, pre, script, style, .report-phone-copy')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  for (const node of textNodes) {
    const text = node.nodeValue;
    phonePattern.lastIndex = 0;
    let match;
    let cursor = 0;
    const fragment = document.createDocumentFragment();
    let changed = false;
    while ((match = phonePattern.exec(text))) {
      const raw = match[0];
      const digits = raw.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) continue;
      if (match.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      const wrapper = document.createElement('span');
      wrapper.className = 'report-phone-copy';
      const number = document.createElement('bdi');
      number.dir = 'ltr';
      number.textContent = raw;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-phone-inline';
      button.textContent = 'نسخ';
      button.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(raw);
        button.textContent = '✓';
        setTimeout(() => button.textContent = 'نسخ', 1500);
      };
      wrapper.append(number, button);
      fragment.appendChild(wrapper);
      cursor = match.index + raw.length;
      changed = true;
    }
    if (changed) {
      if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(fragment, node);
    }
  }
}

// ===== Duration Formatter =====
function formatDuration(seconds, isLowerBound = false) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '—';
  const prefix = isLowerBound ? '≥ ' : '';
  const total = Math.round(Number(seconds));
  if (total < 60) return `${prefix}${total} ثانية`;
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  if (minutes < 60) {
    return remainingSeconds ? `${prefix}${minutes} دقيقة · ${remainingSeconds} ث` : `${prefix}${minutes} دقيقة`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes ? `${prefix}${hours} س · ${remainingMinutes} د` : `${prefix}${hours} ساعة`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${prefix}${days} يوم · ${remainingHours} س` : `${prefix}${days} يوم`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showReportError(msg) {
  reportError.classList.remove('hidden');
  document.getElementById('error-message').textContent = msg;
}

// ===== Actions: Copy / Print / Export =====
window.copyReport = function() {
  if (!reportData || !reportData.report) return;
  navigator.clipboard.writeText(reportData.report).then(() => {
    showToast('تم نسخ التقرير إلى الحافظة بنجاح', 'success');
  });
};

window.printReport = function() {
  if (!reportData) {
    showToast('يرجى استخراج التقرير أولاً للطباعة', 'error');
    return;
  }
  window.print();
};

window.exportCsvLeads = function() {
  if (!reportData) {
    showToast('يرجى استخراج التقرير أولاً للتصدير', 'error');
    return;
  }
  const date = reportData.date || new Date().toISOString().slice(0, 10);
  const scores = reportData.scores || [];
  const stats = reportData.currentStats || {};

  let csvContent = '\uFEFF'; // BOM UTF-8 for Excel Arabic support
  csvContent += 'الحساب,إجمالي الرسائل,رسائل السيلز,رسائل العملاء,المحادثات,التقييم,أهم فرصة تطوير\n';

  for (const score of scores) {
    const accStats = (stats.perAccount && stats.perAccount[score.accountId]) || {};
    const totalMsgs = accStats.totalMessages || 0;
    const salesMsgs = accStats.salesMessages || 0;
    const custMsgs = accStats.customerMessages || 0;
    const chats = accStats.chats || 0;
    const overall = score.overallScore ?? '—';
    const improvement = (score.improvement || '—').replace(/[\r\n",]+/g, ' ');
    csvContent += `"${score.accountName || ''}",${totalMsgs},${salesMsgs},${custMsgs},${chats},"${overall}","${improvement}"\n`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `whatsi_sales_report_${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('تم تصدير ملف Excel بنجاح', 'success');
};

// ===== Schedules Overview Modal =====
window.openWorkSchedulesModal = function() {
  const modalEl = document.getElementById('schedules-modal');
  const container = document.getElementById('schedules-accounts-list');
  if (!modalEl || !container) return;

  container.innerHTML = '';
  if (!accounts || accounts.length === 0) {
    container.innerHTML = '<p class="modal-intro" style="text-align:center; padding: 20px;">لا توجد حسابات مبيعات مسجلة حالياً.</p>';
  } else {
    for (const acc of accounts) {
      const schedule = acc.schedule || { enabled: true, start: '10:00', end: '19:00', workDays: [6, 0, 1, 2, 3, 4] };
      const card = document.createElement('div');
      card.className = 'schedule-account-card';
      const initial = (acc.name || '').charAt(0).toUpperCase() || 'ح';

      const daysText = Array.isArray(schedule.workDays) && schedule.workDays.length > 0
        ? schedule.workDays.map(d => dayNamesArabic[d] || d).join('، ')
        : 'طوال الأسبوع';

      const hoursText = schedule.enabled !== false
        ? `من ${schedule.start || '10:00'} إلى ${schedule.end || '19:00'}`
        : 'غير محدد (متاح دائماً)';

      card.innerHTML = `
        <div class="schedule-card-info">
          <div class="schedule-card-avatar">${initial}</div>
          <div class="schedule-card-details">
            <span class="schedule-card-name">${escapeHtml(acc.name || 'موظف')}</span>
            <span class="schedule-card-hours">⏰ ${hoursText}</span>
            <span class="schedule-card-days">📅 أيام العمل: ${daysText}</span>
          </div>
        </div>
        <button class="schedule-card-btn" onclick="closeWorkSchedulesModal(); openEditAccountModal('${acc.id}')">✏️ تعديل المواعيد</button>
      `;
      container.appendChild(card);
    }
  }

  modalEl.classList.remove('hidden');
};

window.closeWorkSchedulesModal = function() {
  const modalEl = document.getElementById('schedules-modal');
  if (modalEl) modalEl.classList.add('hidden');
};

// ===== Add / Edit Account Modal =====
window.openAddAccountModal = function() {
  closeWorkSchedulesModal();
  editingAccountId = null;
  document.getElementById('modal-title').textContent = 'إضافة ممثل مبيعات جديد';
  document.getElementById('account-name-input').value = '';
  setScheduleToModal(null);
  document.getElementById('name-modal').classList.remove('hidden');
};

window.openEditAccountModal = function(id) {
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  editingAccountId = id;
  document.getElementById('modal-title').textContent = `تعديل مواعيد: ${acc.name}`;
  document.getElementById('account-name-input').value = acc.name;
  setScheduleToModal(acc.schedule);
  document.getElementById('name-modal').classList.remove('hidden');
};

window.closeModal = function() {
  document.getElementById('name-modal').classList.add('hidden');
};

window.toggleScheduleInputs = function() {
  const enabled = document.getElementById('account-schedule-enabled').checked;
  const area = document.getElementById('schedule-inputs-area');
  if (area) area.classList.toggle('disabled', !enabled);
};

function setScheduleToModal(schedule = null) {
  const s = schedule || { enabled: true, start: '10:00', end: '19:00', workDays: [6, 0, 1, 2, 3, 4] };
  document.getElementById('account-schedule-enabled').checked = s.enabled !== false;
  document.getElementById('account-work-start').value = s.start || '10:00';
  document.getElementById('account-work-end').value = s.end || '19:00';
  const workDays = Array.isArray(s.workDays) ? s.workDays.map(Number) : [6, 0, 1, 2, 3, 4];
  document.querySelectorAll('input[name="work-day-check"]').forEach(cb => {
    cb.checked = workDays.includes(Number(cb.value));
  });
  window.toggleScheduleInputs();
}

function getScheduleFromModal() {
  const enabled = document.getElementById('account-schedule-enabled').checked;
  const start = document.getElementById('account-work-start').value || '10:00';
  const end = document.getElementById('account-work-end').value || '19:00';
  const checks = document.querySelectorAll('input[name="work-day-check"]:checked');
  const workDays = Array.from(checks).map(cb => Number(cb.value));
  return { enabled, start, end, workDays };
}

window.saveAccountFromModal = async function() {
  const name = document.getElementById('account-name-input').value.trim();
  if (!name) {
    showToast('يرجى كتابة اسم الموظف', 'error');
    return;
  }

  const schedule = getScheduleFromModal();

  if (editingAccountId) {
    const acc = accounts.find(a => a.id === editingAccountId);
    if (acc) {
      acc.name = name;
      acc.schedule = schedule;
    }
  } else {
    accounts.push({
      id: `acc-${Date.now()}`,
      name,
      schedule
    });
  }

  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts })
    });
    const data = await res.json();
    if (data.success) {
      showToast('تم حفظ التعديلات بنجاح', 'success');
      closeModal();
      renderAccountSelect();
    } else {
      showToast('فشل حفظ الحسابات: ' + (data.error || ''), 'error');
    }
  } catch (err) {
    showToast('خطأ في الاتصال بالخادم: ' + err.message, 'error');
  }
};

// ===== Settings Modal (Excluded Phone Numbers) =====
window.openSettingsModal = async function() {
  const modal = document.getElementById('settings-modal');
  const textarea = document.getElementById('excluded-phones-input');
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    const phones = (data.success && data.settings && Array.isArray(data.settings.excludedPhones))
      ? data.settings.excludedPhones
      : [];
    textarea.value = phones.join('\n');
  } catch (err) {
    textarea.value = '';
  }
  modal.classList.remove('hidden');
};

window.closeSettingsModal = function() {
  document.getElementById('settings-modal').classList.add('hidden');
};

window.saveInternalSettings = async function() {
  const textarea = document.getElementById('excluded-phones-input');
  const raw = textarea.value.split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excludedPhones: raw })
    });
    const data = await res.json();
    if (data.success) {
      showToast('تم حفظ أرقام الفريق المستبعدة بنجاح', 'success');
      closeSettingsModal();
    } else {
      showToast('فشل حفظ الإعدادات: ' + (data.error || ''), 'error');
    }
  } catch (err) {
    showToast('خطأ: ' + err.message, 'error');
  }
};

// ===== Messages Preview Modal =====
window.openMessagesPreview = async function() {
  const modal = document.getElementById('messages-modal');
  const container = document.getElementById('messages-list-container');
  const countLabel = document.getElementById('messages-count-label');

  container.innerHTML = '<div class="preview-loading" style="padding:30px; text-align:center;">جاري جلب الرسائل من قاعدة البيانات...</div>';
  modal.classList.remove('hidden');

  try {
    const accountId = reportAccountSelect.value || '';
    const res = await fetch(`/api/messages-preview?period=${currentPeriod}&accountId=${accountId}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      renderMessagesList(data.messages);
      if (countLabel) countLabel.textContent = `${data.messages.length} رسالة`;
    } else {
      container.innerHTML = '<div class="preview-empty" style="padding:20px;">لا توجد رسائل مسجلة.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div class="preview-empty" style="color:red; padding:20px;">خطأ: ${err.message}</div>`;
  }
};

function renderMessagesList(messages) {
  const container = document.getElementById('messages-list-container');
  if (!messages || messages.length === 0) {
    container.innerHTML = '<div class="preview-empty" style="padding:20px; text-align:center;">لا توجد رسائل مسجلة في هذه الفترة.</div>';
    return;
  }
  container.innerHTML = messages.map(msg => `
    <div class="msg-preview-item" style="padding:10px 14px; border-bottom:1px solid #1f2d33; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <span style="font-weight:700; color:${msg.sender === 'sales' ? '#53bdeb' : '#00d26a'};">${msg.sender === 'sales' ? '👔 سيلز' : '👤 عميل'}</span>
        <span style="margin-right:8px; color:#8696a0; font-size:0.8rem;">${escapeHtml(msg.customer_name || msg.customer_phone || '')}</span>
        <p style="margin:4px 0 0 0; font-size:0.9rem; color:#e9edef;">${escapeHtml(msg.text || '')}</p>
      </div>
      <span style="font-size:0.75rem; color:#8696a0; white-space:nowrap;">${escapeHtml(msg.display_time || String(msg.timestamp || '').slice(11, 19))}</span>
    </div>
  `).join('');
}

window.closeMessagesModal = function() {
  document.getElementById('messages-modal').classList.add('hidden');
};

// ===== Test Gemini Connection =====
window.testGeminiConnection = async function() {
  showToast('جاري اختبار الاتصال بمحرك Gemini AI...', 'info');
  try {
    const res = await fetch('/api/test-gemini');
    const data = await res.json();
    if (data.success) {
      showToast(`✅ الاتصال ناجح: ${data.message || 'النموذج جاهز للتحليل'}`, 'success');
    } else {
      showToast(`❌ فشل الاتصال: ${data.error || 'خطأ غير معروف'}`, 'error');
    }
  } catch (err) {
    showToast(`❌ خطأ في الاتصال: ${err.message}`, 'error');
  }
};

// ===== Toast Notifications =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== Run =====
init();
