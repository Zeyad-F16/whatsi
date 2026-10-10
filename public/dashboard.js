/**
 * dashboard.js
 * كود العميل المتكامل لمنظومة Whatsi Z-ray:
 * 1. واجهة محادثات واتساب الحية (Live WhatsApp Web)
 * 2. واجهة تقارير وتدقيق المبيعات (AI Dashboard)
 * 3. قناة البث اللحظي (SSE - Server-Sent Events) لتحديث الرسائل ثانية بثانية
 */

// ===== Global State =====
let currentMainTab = 'whatsapp';
let accounts = [];
let chats = [];
let activeChatId = null;
let currentPeriod = 'today';
let reportData = null;
let latestEvidenceGate = null;
let editingAccountId = null;
let sseConnection = null;
let searchDebounceTimer = null;

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
const waFilterAccount = document.getElementById('wa-filter-account');
const waSearchInput = document.getElementById('wa-search-input');
const waChatListContainer = document.getElementById('wa-chat-list-container');
const waEmptyChatState = document.getElementById('wa-empty-chat-state');
const waActiveChatContent = document.getElementById('wa-active-chat-content');
const waChatMessagesScroll = document.getElementById('wa-chat-messages-scroll');

// ===== Initialization =====
async function init() {
  await loadAccounts();
  await loadChatsList();
  await refreshLiveData();
  await loadMonthlyScores();
  connectSSE();
}

// ===== 1. Tab Switching =====
window.switchMainTab = function(tabName) {
  currentMainTab = tabName;
  document.getElementById('tab-btn-whatsapp').classList.toggle('active', tabName === 'whatsapp');
  document.getElementById('tab-btn-dashboard').classList.toggle('active', tabName === 'dashboard');

  document.getElementById('view-whatsapp').classList.toggle('active', tabName === 'whatsapp');
  document.getElementById('view-dashboard').classList.toggle('active', tabName === 'dashboard');

  if (tabName === 'dashboard') {
    refreshLiveData();
    loadMonthlyScores();
  } else if (tabName === 'whatsapp') {
    loadChatsList();
  }
};

// ===== 2. Accounts Management =====
async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (data.success && Array.isArray(data.accounts)) {
      accounts = data.accounts;
      populateAccountDropdowns();
    }
  } catch (err) {
    console.error('Failed to load accounts:', err);
  }
}

function populateAccountDropdowns() {
  // 1. القائمة في لوحة التقارير
  if (reportAccountSelect) {
    const prevVal = reportAccountSelect.value;
    reportAccountSelect.innerHTML = '<option value="">كل الحسابات</option>';
    for (const acc of accounts) {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.name;
      reportAccountSelect.appendChild(opt);
    }
    if (prevVal) reportAccountSelect.value = prevVal;
  }

  // 2. القائمة في المحادثات الحية
  if (waFilterAccount) {
    const prevVal = waFilterAccount.value;
    waFilterAccount.innerHTML = '<option value="">جميع خطوط المبيعات (كل الحسابات)</option>';
    for (const acc of accounts) {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = acc.name;
      waFilterAccount.appendChild(opt);
    }
    if (prevVal) waFilterAccount.value = prevVal;
  }
}

window.filterChatsByAccount = function() {
  loadChatsList();
  if (activeChatId) {
    reloadCurrentChatMessages();
  }
};

window.handleChatSearch = function(e) {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    loadChatsList();
  }, 300);
};

async function loadChatsList() {
  const accountId = waFilterAccount ? waFilterAccount.value : '';
  const search = waSearchInput ? waSearchInput.value.trim() : '';

  try {
    const res = await fetch(`/api/chats?accountId=${encodeURIComponent(accountId)}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.chats)) {
      chats = data.chats;
      renderChatsList(chats);
    }
  } catch (err) {
    console.error('Failed to load chats:', err);
    if (waChatListContainer) {
      waChatListContainer.innerHTML = `<div style="padding:20px; color:#ff4d4f; text-align:center;">خطأ في جلب المحادثات: ${err.message}</div>`;
    }
  }
}

function renderChatsList(items) {
  if (!waChatListContainer) return;
  if (!items.length) {
    waChatListContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: #8696a0;">لا توجد محادثات مسجلة تطابق البحث.</div>';
    return;
  }

  waChatListContainer.innerHTML = items.map(chat => {
    const initial = (chat.customerName || 'ع').charAt(0).toUpperCase();
    const isActive = chat.chatId === activeChatId;
    const isSales = chat.lastSender === 'sales';
    const senderIcon = isSales ? '✓ ' : '';
    const prefix = chat.lastType === 'audio' ? '🎤 ' : '';

    return `
      <div class="wa-chat-item ${isActive ? 'active' : ''}" id="wa-chat-card-${escapeAttr(chat.chatId)}" onclick="openChat('${escapeAttr(chat.chatId)}')">
        <div class="wa-chat-avatar">${initial}</div>
        <div class="wa-chat-info">
          <div class="wa-chat-top-line">
            <span class="wa-chat-name">${escapeHtml(chat.customerName)}</span>
            <span class="wa-chat-time">${escapeHtml(chat.displayTime || '')}</span>
          </div>
          <div class="wa-chat-bottom-line">
            <span class="wa-chat-snippet" id="wa-chat-snippet-${escapeAttr(chat.chatId)}">
              ${senderIcon}${prefix}${escapeHtml(chat.lastMessage || 'بدون رسالة')}
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== 4. Active Conversation Details =====
window.openChat = async function(chatId) {
  activeChatId = chatId;

  // تحديث تحديد القائمة الجانبية
  document.querySelectorAll('.wa-chat-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.getElementById(`wa-chat-card-${chatId}`);
  if (activeEl) activeEl.classList.add('active');

  const chat = chats.find(c => c.chatId === chatId);
  if (chat) {
    document.getElementById('wa-active-name').textContent = chat.customerName;
    document.getElementById('wa-active-meta').textContent = `${chat.customerPhone || 'بدون رقم'} · الخط: ${chat.accountName || 'غير محدد'}`;
    document.getElementById('wa-active-avatar').textContent = (chat.customerName || 'ع').charAt(0).toUpperCase();
  }

  waEmptyChatState.style.display = 'none';
  waActiveChatContent.style.display = 'flex';

  await reloadCurrentChatMessages();
};

window.reloadCurrentChatMessages = async function() {
  if (!activeChatId || !waChatMessagesScroll) return;

  waChatMessagesScroll.innerHTML = '<div style="padding: 20px; text-align: center; color: #8696a0;">جاري تحميل الرسائل والتسجيلات...</div>';

  try {
    const accountId = waFilterAccount ? waFilterAccount.value : '';
    const url = `/api/chat-messages?chatId=${encodeURIComponent(activeChatId)}${accountId ? `&accountId=${encodeURIComponent(accountId)}` : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      renderChatMessages(data.messages);
      scrollToBottom();
    }
  } catch (err) {
    waChatMessagesScroll.innerHTML = `<div style="padding: 20px; color: red;">خطأ: ${err.message}</div>`;
  }
};

function renderChatMessages(messages) {
  if (!waChatMessagesScroll) return;
  if (!messages.length) {
    waChatMessagesScroll.innerHTML = '<div style="padding: 30px; text-align: center; color: #8696a0;">لا توجد رسائل مسجلة لهذا العميل تحت الفلتر المختار.</div>';
    return;
  }

  // فحص ما إذا كانت المحادثة تحتوي على رسائل من عدة موظفي مبيعات
  const salesAccounts = new Set();
  messages.forEach(m => {
    if (m.sender === 'sales' && m.accountName) salesAccounts.add(m.accountName);
  });

  let noticeHtml = '';
  if (salesAccounts.size > 1) {
    const accNames = Array.from(salesAccounts).join(' و ');
    noticeHtml = `
      <div style="background: rgba(0, 168, 132, 0.12); border: 1px solid rgba(0, 168, 132, 0.35); border-radius: 8px; padding: 10px 16px; margin: 12px auto; max-width: 85%; text-align: center; font-size: 0.83rem; color: #00a884; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span>ℹ️</span>
        <span>محادثة مشتركة: هذا العميل تواصل مع أكثر من موظف مبيعات (<strong>${escapeHtml(accNames)}</strong>).</span>
      </div>
    `;
  }

  waChatMessagesScroll.innerHTML = noticeHtml + messages.map(msg => renderSingleMessageBubble(msg)).join('');
}

function renderSingleMessageBubble(msg) {
  const isSales = msg.sender === 'sales';
  const roleLabel = isSales ? `👔 ${msg.accountName || 'السيلز'}` : `👤 ${msg.customerName || 'العميل'}`;

  let contentHtml = '';
  if (msg.type === 'audio') {
    const duration = msg.durationSec ? ` · ${msg.durationSec} ثانية` : '';
    const tone = msg.toneAnalysis ? `<span class="wa-audio-tone-badge">نبرة الصوت: ${escapeHtml(msg.toneAnalysis)}</span>` : '';
    contentHtml = `
      <div class="wa-audio-card">
        <div class="wa-audio-header">
          <span>🎤 تسجيل صوتي${duration}</span>
          ${tone}
        </div>
        <div class="wa-audio-transcript">
          <strong>التفريغ:</strong> "${escapeHtml(msg.transcript || 'لم يتم التفريغ أو جارٍ المعالجة...')}"
        </div>
      </div>
    `;
  } else {
    contentHtml = `<p class="wa-msg-text">${escapeHtml(msg.text || '')}</p>`;
  }

  return `
    <div class="wa-msg-bubble ${isSales ? 'sales' : 'customer'}" id="wa-msg-${escapeAttr(msg.id)}">
      <span class="wa-msg-sender-tag">${escapeHtml(roleLabel)}</span>
      ${contentHtml}
      <div class="wa-msg-footer">
        <span>${escapeHtml(msg.displayTime || '')}</span>
        ${isSales ? '<span>✓✓</span>' : ''}
      </div>
    </div>
  `;
}

function appendIncomingMessage(msg) {
  if (!waChatMessagesScroll) return;
  const bubbleHtml = renderSingleMessageBubble(msg);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = bubbleHtml;
  const bubble = tempDiv.firstElementChild;
  if (bubble) {
    waChatMessagesScroll.appendChild(bubble);
    scrollToBottom();
  }
}

function scrollToBottom() {
  if (waChatMessagesScroll) {
    waChatMessagesScroll.scrollTop = waChatMessagesScroll.scrollHeight;
  }
}

// ===== 5. Server-Sent Events (SSE) Realtime Stream =====
function connectSSE() {
  const statusLabel = document.getElementById('sse-status-label');

  if (sseConnection) {
    sseConnection.close();
  }

  sseConnection = new EventSource('/api/live-stream');

  sseConnection.onopen = () => {
    if (statusLabel) statusLabel.textContent = 'مزامنة لحظية متصلة (Live Sync)';
  };

  sseConnection.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'new_events' && Array.isArray(data.events)) {
        handleIncomingLiveEvents(data.events);
      }
    } catch (e) {
      console.error('SSE JSON error:', e);
    }
  };

  sseConnection.onerror = () => {
    if (statusLabel) statusLabel.textContent = 'إعادة الاتصال بالبث...';
    // EventSource handles reconnection automatically
  };
}

function handleIncomingLiveEvents(events) {
  let activeChatReceived = false;
  const currentAcc = waFilterAccount ? waFilterAccount.value : '';

  for (const event of events) {
    const matchesAccount = !currentAcc || event.accountId === currentAcc || event.accountName === currentAcc;

    // 1. إذا كانت الرسالة تخص الشات المفتوح حالياً وتطابق الفلتر المختار
    if (activeChatId && event.chatId === activeChatId && matchesAccount) {
      appendIncomingMessage(event);
      activeChatReceived = true;
    }

    // 2. تحديث قائمة الشاتات في الـ Sidebar إذا كانت تطابق الفلتر المختار
    if (matchesAccount) {
      updateChatSidebarOnEvent(event);
    }
  }

  // 3. تحديث كروت الإحصائيات الحية
  refreshLiveData();
}

function updateChatSidebarOnEvent(event) {
  const snippet = document.getElementById(`wa-chat-snippet-${event.chatId}`);
  if (snippet) {
    const isSales = event.sender === 'sales';
    const prefix = event.type === 'audio' ? '🎤 ' : '';
    snippet.innerHTML = `${isSales ? '✓ ' : ''}${prefix}${escapeHtml(event.text || event.transcript || 'تسجيل صوتي')}`;
    
    // رفع الشات لأعلى القائمة
    const card = document.getElementById(`wa-chat-card-${event.chatId}`);
    if (card && card.parentElement) {
      card.parentElement.prepend(card);
    }
  } else {
    // محادثة جديدة لم تكن بالقائمة، نعيد جلب القائمة
    loadChatsList();
  }
}

// ===== 6. AI Dashboard & Report Logic =====
reportAccountSelect.addEventListener('change', () => {
  refreshLiveData();
  loadMonthlyScores();
});

async function refreshLiveData() {
  const accountId = reportAccountSelect ? reportAccountSelect.value : '';
  try {
    const res = await fetch(`/api/stats?period=${currentPeriod}&accountId=${encodeURIComponent(accountId)}`);
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

window.generateReport = async function(periodParam) {
  const period = periodParam || currentPeriod;
  currentPeriod = period;

  const reportEmpty = document.getElementById('report-empty');
  const reportLoading = document.getElementById('report-loading');
  const reportOutput = document.getElementById('report-output');
  const reportError = document.getElementById('report-error');
  const loadingProgress = document.getElementById('loading-progress');

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

function displayReport(result) {
  const reportText = document.getElementById('report-text');
  reportText.innerHTML = '';

  const subtitle = result.period === 'today'
    ? `تاريخ اليوم: ${result.date}`
    : result.period === 'yesterday'
      ? `تاريخ أمس: ${result.date}`
      : result.period === 'last7days'
        ? `آخر 7 أيام حتى الآن`
        : `آخر 48 ساعة حتى الآن`;
  const subEl = document.getElementById('report-subtitle-text');
  if (subEl) subEl.textContent = subtitle;

  const stats = result.currentStats || {};

  // 1. سرعة الرد المخصصة
  const responseMetricsSection = renderResponseMetrics(stats.responseMetrics || {});
  if (responseMetricsSection) reportText.appendChild(responseMetricsSection);

  // 2. كفاية العينة
  const evidenceCoverageSection = renderEvidenceCoverage(stats.evidenceByAccount || {});
  if (evidenceCoverageSection) reportText.appendChild(evidenceCoverageSection);

  // 3. التقرير الأساسي
  const reportContent = document.createElement('div');
  reportContent.className = 'report-markdown-body';
  reportContent.innerHTML = formatMarkdown(result.report || '');
  reportText.appendChild(reportContent);

  // 4. التسجيلات الصوتية
  if (Array.isArray(result.audioEvidence) && result.audioEvidence.length > 0) {
    const audioSection = renderAudioEvidence(result.audioEvidence);
    if (audioSection) reportText.appendChild(audioSection);
  }
}

function renderResponseMetrics(metrics) {
  const accountsList = Object.values(metrics.perAccount || {});
  if (!accountsList.length) return null;
  if (metrics.total && accountsList.length > 1) accountsList.unshift(metrics.total);

  const section = document.createElement('section');
  section.className = 'report-response-metrics';
  section.dir = 'rtl';

  section.innerHTML = `
    <h3 style="margin-top:0;">إحصائيات سرعة ومتابعة الرد (محسوبة بدقة بناءً على مواعيد عمل كل موظف)</h3>
    <p class="response-metrics-note">تُحسب مدة الرد وأوقات الانتظار حصرياً خلال ساعات العمل وأيام الدوام المحددة لكل موظف. لا يُحسب وقت الليل أو أيام الإجازة كتأخير.</p>
    <table class="response-metrics-table">
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
    </table>
  `;
  return section;
}

function renderEvidenceCoverage(evidenceByAccount) {
  const accountsList = Object.values(evidenceByAccount || {});
  if (!accountsList.length) return null;

  const section = document.createElement('section');
  section.className = 'report-evidence-coverage';
  section.dir = 'rtl';
  section.innerHTML = `
    <h3>كفاية عينة التقييم السلوكي</h3>
    <p class="evidence-coverage-note">التقييمات الرقمية تُعتمد فقط عند توفر 3 محادثات و10 رسائل سيلز و5 رسائل عملاء على الأقل لضمان الدقة وتفادي الأحكام المتسرعة.</p>
    ${accountsList.map(acc => `
      <article class="evidence-coverage-card${acc.status === 'insufficient' ? ' evidence-coverage-card--insufficient' : ''}">
        <strong>${escapeHtml(acc.accountName || 'الحساب')} — ${acc.status === 'sufficient' ? 'عينة كافية للتقييم' : 'دليل غير كافٍ لدرجة يومية موثوقة'}</strong>
        <p>${acc.chats} محادثة · ${acc.salesMessages} رسالة سيلز · ${acc.customerMessages} رسالة عميل · ${acc.shortChats} محادثة قصيرة</p>
        <p style="font-size:0.8rem; color:var(--text-dim);">${escapeHtml(acc.note || '')}</p>
      </article>
    `).join('')}
  `;
  return section;
}

function renderAudioEvidence(items) {
  if (!items.length) return null;
  const section = document.createElement('section');
  section.className = 'report-audio-evidence';
  section.dir = 'rtl';
  section.innerHTML = `
    <h3>التقرير الشامل للتسجيلات الصوتية (${items.length} تسجيل)</h3>
    ${items.map(item => `
      <article class="audio-evidence-card${item.abusive ? ' audio-evidence-card--abusive' : ''}">
        <h4>🎤 رسالة صوتية — ${escapeHtml(item.time || item.timestamp || '')} — ${escapeHtml(item.sender === 'sales' ? item.accountName : item.customerName)}</h4>
        <p class="audio-evidence-classification${item.abusive ? ' audio-evidence-classification--abusive' : ''}">تصنيف المحتوى: ${escapeHtml(item.abuseLabel || 'غير مصنّف')}</p>
        ${item.abuseReason ? `<p class="audio-evidence-reason">${escapeHtml(item.abuseReason)}</p>` : ''}
        <p class="audio-evidence-meta">${item.customerPhone ? `واتساب: ${escapeHtml(item.customerPhone)}` : ''} ${item.durationSec ? `· المدة: ${item.durationSec} ثانية` : ''}</p>
        <strong>التفريغ الصوتي:</strong>
        <pre class="audio-transcript-raw" dir="auto">${escapeHtml(item.transcript || 'لا يوجد تفريغ متاح.')}</pre>
        ${item.tone ? `<p class="audio-evidence-tone">نبرة الصوت: ${escapeHtml(item.tone)}</p>` : ''}
      </article>
    `).join('')}
  `;
  return section;
}

async function loadMonthlyScores() {
  const accountId = reportAccountSelect ? reportAccountSelect.value : '';
  try {
    const res = await fetch(`/api/monthly-scores?accountId=${encodeURIComponent(accountId)}`);
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
      .filter(acc => acc.status === 'insufficient').map(acc => acc.accountId));
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

function formatDuration(seconds, isLowerBound = false) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '—';
  const prefix = isLowerBound ? '≥ ' : '';
  const total = Math.round(Number(seconds));
  if (total < 60) return `${prefix}${total} ثانية`;
  const minutes = Math.floor(total / 60);
  const remainingSeconds = total % 60;
  if (minutes < 60) return `${prefix}${minutes} دقيقة · ${remainingSeconds} ث`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${prefix}${hours} س · ${remainingMinutes} د`;
  const days = Math.floor(hours / 24);
  return `${prefix}${days} يوم`;
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showReportError(msg) {
  const el = document.getElementById('report-error');
  if (el) {
    el.classList.remove('hidden');
    document.getElementById('error-message').textContent = msg;
  }
}

// ===== Actions =====
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

  let csvContent = '\uFEFF';
  csvContent += 'الحساب,إجمالي الرسائل,رسائل السيلز,رسائل العملاء,المحادثات,التقييم,أهم فرصة تطوير\n';

  for (const score of scores) {
    const accStats = (stats.perAccount && stats.perAccount[score.accountId]) || {};
    const totalMsgs = accStats.totalMessages || 0;
    const salesMsgs = accStats.salesMessages || 0;
    const custMsgs = accStats.customerMessages || 0;
    const chatsCount = accStats.chats || 0;
    const overall = score.overallScore ?? '—';
    const improvement = (score.improvement || '—').replace(/[\r\n",]+/g, ' ');
    csvContent += `"${score.accountName || ''}",${totalMsgs},${salesMsgs},${custMsgs},${chatsCount},"${overall}","${improvement}"\n`;
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

// ===== Modals =====
window.openWorkSchedulesModal = function() {
  const modalEl = document.getElementById('schedules-modal');
  const container = document.getElementById('schedules-accounts-list');
  if (!modalEl || !container) return;

  container.innerHTML = '';
  if (!accounts || accounts.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding: 20px;">لا توجد حسابات مبيعات مسجلة حالياً.</p>';
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

window.openAddAccountModal = function() {
  closeWorkSchedulesModal();
  editingAccountId = null;
  document.getElementById('modal-title').textContent = 'إضافة ممثل مبيعات / خط جديد';
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
    showToast('يرجى كتابة اسم الموظف / الخط', 'error');
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
      populateAccountDropdowns();
    } else {
      showToast('فشل حفظ الحسابات: ' + (data.error || ''), 'error');
    }
  } catch (err) {
    showToast('خطأ في الاتصال: ' + err.message, 'error');
  }
};

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

window.openMessagesPreview = async function() {
  const modal = document.getElementById('messages-modal');
  const container = document.getElementById('messages-list-container');
  const countLabel = document.getElementById('messages-count-label');

  container.innerHTML = '<div style="padding:30px; text-align:center;">جاري جلب الرسائل...</div>';
  modal.classList.remove('hidden');

  try {
    const accountId = reportAccountSelect.value || '';
    const res = await fetch(`/api/messages-preview?period=${currentPeriod}&accountId=${encodeURIComponent(accountId)}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.messages)) {
      if (countLabel) countLabel.textContent = `${data.messages.length} رسالة`;
      container.innerHTML = data.messages.map(msg => `
        <div style="padding:10px 14px; border-bottom:1px solid #1f2d33; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <span style="font-weight:700; color:${msg.sender === 'sales' ? '#53bdeb' : '#00d26a'};">${msg.sender === 'sales' ? '👔 سيلز' : '👤 عميل'}</span>
            <span style="margin-right:8px; color:#8696a0; font-size:0.8rem;">${escapeHtml(msg.customer_name || msg.customer_phone || '')}</span>
            <p style="margin:4px 0 0 0; font-size:0.9rem; color:#e9edef;">${escapeHtml(msg.text || '')}</p>
          </div>
          <span style="font-size:0.75rem; color:#8696a0;">${escapeHtml(msg.display_time || '')}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = '<div style="padding:20px;">لا توجد رسائل.</div>';
    }
  } catch (err) {
    container.innerHTML = `<div style="color:red; padding:20px;">خطأ: ${err.message}</div>`;
  }
};

window.closeMessagesModal = function() {
  document.getElementById('messages-modal').classList.add('hidden');
};

window.testGeminiConnection = async function() {
  showToast('جاري فحص اتصال Gemini AI...', 'info');
  try {
    const res = await fetch('/api/test-gemini');
    const data = await res.json();
    if (data.success) {
      showToast(`✅ الاتصال ناجح: ${data.message || 'النموذج جاهز'}`, 'success');
    } else {
      showToast(`❌ فشل الاتصال: ${data.error || 'خطأ'}`, 'error');
    }
  } catch (err) {
    showToast(`❌ خطأ: ${err.message}`, 'error');
  }
};

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
