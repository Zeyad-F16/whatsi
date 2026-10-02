/**
 * renderer.js
 * عملية العرض (Renderer Process) لتطبيق whatsi Z-ray.
 * مسؤولة عن:
 * - إدارة الحسابات والتبويبات
 * - إنشاء الـ webviews وتسجيلها مع الـ Main Process
 * - عرض التقارير المستلمة من Gemini
 */

const { ipcRenderer } = require('electron');
const path = require('path');

// ===== DOM References =====
const addBtn = document.getElementById('add-account-btn');
const tabList = document.getElementById('tab-list');
const webviewContainer = document.getElementById('webview-container');
const welcomeScreen = document.getElementById('welcome-screen');
const modal = document.getElementById('name-modal');
const modalTitle = document.getElementById('modal-title');
const nameInput = document.getElementById('account-name-input');
const saveBtn = document.getElementById('save-name-btn');
const reportAccountSelect = document.getElementById('report-account');

// ===== State =====
let accounts = [];
let editingAccountId = null;
let currentView = 'whatsapp';
let reportData = null;
let reportPeriod = 'today';

function normalizeReportPhone(value) {
  const western = String(value || '').replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
  let digits = western.replace(/\D/g, '');
  if (!digits) return { display: String(value || ''), copy: '' };
  if (/^01[0125]\d{8}$/.test(digits)) digits = `20${digits.slice(1)}`;
  if (digits.startsWith('00')) digits = digits.slice(2);
  const isInternational = western.trim().startsWith('+') || digits.length >= 11;
  const copy = isInternational ? `+${digits}` : digits;
  let display = copy;
  if (digits.startsWith('20') && digits.length === 12) {
    const local = digits.slice(2);
    display = `+20 ${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
  } else if (digits.startsWith('966') && digits.length === 12) {
    const local = digits.slice(3);
    display = `+966 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  } else if (digits.startsWith('971') && digits.length === 12) {
    const local = digits.slice(3);
    display = `+971 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}`;
  }
  return { display, copy };
}

// ===== حفظ الحسابات عبر IPC =====
async function persistAccounts() {
  await ipcRenderer.invoke('save-accounts', accounts);
}

// ===== Initialization =====
async function init() {
  // تحميل الحسابات المحفوظة من الملف الدائم
  accounts = await ipcRenderer.invoke('load-accounts');

  if (accounts.length > 0) {
    accounts.forEach(acc => {
      createTab(acc.id, acc.name);
      createWebview(acc.id, acc.name);
      addAccountToReportFilter(acc.id, acc.name);
    });
    switchToAccount(accounts[0].id);
  }

  await loadMonthlyScores();
}

// ===== View Switching =====
window.switchView = function(view) {
  currentView = view;
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById(`view-${view}`).classList.add('active');
  document.getElementById(`nav-${view}`).classList.add('active');

  if (view === 'report') {
    loadMonthlyScores();
  }
};

reportAccountSelect.addEventListener('change', loadMonthlyScores);

// ===== Account Management =====
addBtn.addEventListener('click', () => {
  editingAccountId = null;
  modalTitle.innerText = 'إضافة حساب جديد';
  saveBtn.innerText = 'حفظ وإضافة';
  nameInput.value = '';
  modal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 100);
});

window.closeModal = function() {
  modal.classList.add('hidden');
};

saveBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.classList.add('shake');
    setTimeout(() => nameInput.classList.remove('shake'), 500);
    return;
  }

  if (editingAccountId) {
    // تعديل حساب موجود
    const acc = accounts.find(a => a.id === editingAccountId);
    if (acc) {
      acc.name = name;
      const tabNameEl = document.getElementById(`tab-name-${editingAccountId}`);
      if (tabNameEl) tabNameEl.innerText = name;
      
      // تحديث قائمة الفلتر
      const optionEl = document.getElementById(`filter-option-${editingAccountId}`);
      if (optionEl) optionEl.textContent = name;
    }
  } else {
    // إضافة حساب جديد
    const accountId = `account-${Date.now()}`;
    const newAccount = { id: accountId, name };
    accounts.push(newAccount);
    createTab(accountId, name);
    createWebview(accountId, name);
    addAccountToReportFilter(accountId, name);
    switchToAccount(accountId);
  }

  persistAccounts();
  modal.classList.add('hidden');
});

nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

// ===== Tab Creation =====
function createTab(id, name) {
  const li = document.createElement('li');
  li.className = 'tab-item';
  li.id = `tab-${id}`;

  // اختصار الاسم للأيقونة
  const initial = name.charAt(0).toUpperCase();

  li.innerHTML = `
    <div class="tab-avatar">${initial}</div>
    <span id="tab-name-${id}" class="tab-name-text">${name}</span>
    <div class="tab-actions">
      <button class="tab-action-btn edit" title="تعديل" onclick="editAccount(event, '${id}')">✏️</button>
      <button class="tab-action-btn delete" title="حذف" onclick="deleteAccount(event, '${id}')">🗑️</button>
    </div>
  `;

  li.addEventListener('click', () => {
    switchToAccount(id);
    if (currentView !== 'whatsapp') switchView('whatsapp');
  });
  tabList.appendChild(li);
}

// ===== Webview Creation =====
function createWebview(id, name) {
  const webview = document.createElement('webview');
  webview.id = `webview-${id}`;
  const partitionName = `persist:${id}`;
  webview.setAttribute('partition', partitionName);
  webview.setAttribute('src', 'https://web.whatsapp.com');
  webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  webview.setAttribute('preload', `file://${path.join(__dirname, 'preload.js')}`);
  webview.setAttribute('webpreferences', 'contextIsolation=false, nodeIntegration=false');
  webview.setAttribute('allowpopups', '');

  // إعداد صلاحيات الـ session الخاص بهذا الحساب في Main Process
  ipcRenderer.send('setup-whatsapp-session', { partition: partitionName });

  // دالة مساعدة لإرسال معلومات الحساب
  const sendAccountInfo = () => {
    const wcId = webview.getWebContentsId();
    // 1. إرسال للـ Main Process (يمرره للـ preload عبر IPC)
    ipcRenderer.send('register-webview', {
      webContentsId: wcId,
      accountId: id,
      accountName: name
    });
    // 2. إرسال مباشر للـ preload عبر executeJavaScript (أكثر موثوقية)
    webview.executeJavaScript(`
      if (window.__whatsiSetAccount) {
        window.__whatsiSetAccount('${id.replace(/'/g, "\\'") }', '${name.replace(/'/g, "\\'") }');
      } else {
        window.__whatsiAccountId   = '${id.replace(/'/g, "\\'") }';
        window.__whatsiAccountName = '${name.replace(/'/g, "\\'") }';
      }
    `).catch(() => {});
  };

  // بعد جهوزية الـ DOM
  webview.addEventListener('dom-ready', () => {
    console.log(`[Renderer] Webview dom-ready for ${name}`);
    sendAccountInfo();

    // تحقق: هل الـ preload يعمل؟
    webview.executeJavaScript('typeof window.__whatsiSetAccount')
      .then(t => console.log(`[Renderer] preload check — __whatsiSetAccount type: ${t}`))
      .catch(e => console.error('[Renderer] executeJavaScript failed:', e));
  });

  // بعد اكتمال تحميل الصفحة (للتأكد)
  webview.addEventListener('did-finish-load', () => {
    sendAccountInfo();
  });

  webview.addEventListener('did-fail-load', (e) => {
    if (e.errorCode !== -3) {
      console.error(`[Renderer] Webview failed to load for ${name}:`, e.errorDescription);
    }
  });

  webviewContainer.appendChild(webview);
}

// ===== Account Actions =====
window.editAccount = (event, id) => {
  event.stopPropagation();
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;

  editingAccountId = id;
  modalTitle.innerText = 'تعديل اسم الحساب';
  saveBtn.innerText = 'حفظ التعديلات';
  nameInput.value = acc.name;
  modal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 100);
};

window.deleteAccount = (event, id) => {
  event.stopPropagation();
  if (!confirm('هل أنت متأكد أنك تريد حذف هذا الحساب؟\n(الرسائل المحفوظة في قاعدة البيانات لن تُحذف)')) return;

  accounts = accounts.filter(a => a.id !== id);
  persistAccounts();

  const tab = document.getElementById(`tab-${id}`);
  const webview = document.getElementById(`webview-${id}`);
  const filterOption = document.getElementById(`filter-option-${id}`);

  if (tab) tab.remove();
  if (webview) webview.remove();
  if (filterOption) filterOption.remove();

  if (accounts.length > 0) {
    switchToAccount(accounts[0].id);
  } else {
    welcomeScreen.classList.remove('hidden');
  }
};

// ===== Switch To Account =====
let activeAccountId = null;

function switchToAccount(id) {
  activeAccountId = id;
  welcomeScreen.classList.add('hidden');

  document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('webview').forEach(el => el.classList.remove('active'));

  const tab = document.getElementById(`tab-${id}`);
  const view = document.getElementById(`webview-${id}`);

  if (tab) tab.classList.add('active');
  if (view) view.classList.add('active');
}

// ===== Report Filter =====
function addAccountToReportFilter(id, name) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = name;
  option.id = `filter-option-${id}`;
  reportAccountSelect.appendChild(option);
}

// ===== Gemini Report Generation =====
window.generateReport = async function(requestedPeriod = null) {
  if (requestedPeriod === 'today' || requestedPeriod === 'last48h') reportPeriod = requestedPeriod;
  const periodButtons = [...document.querySelectorAll('.period-btn')];
  periodButtons.forEach(button => {
    button.disabled = true;
    button.classList.toggle('active', button.id === (reportPeriod === 'today' ? 'report-today-btn' : 'report-last48-btn'));
  });
  const reportEmpty = document.getElementById('report-empty');
  const reportLoading = document.getElementById('report-loading');
  const reportOutput = document.getElementById('report-output');
  const reportError = document.getElementById('report-error');
  const loadingProgress = document.getElementById('loading-progress');

  // إخفاء كل الحالات وإظهار التحميل
  reportEmpty.classList.add('hidden');
  reportOutput.classList.add('hidden');
  reportError.classList.add('hidden');
  reportLoading.classList.remove('hidden');

  // مراحل التحميل
  const loadingMessages = [
    reportPeriod === 'today' ? 'يقرأ محادثات اليوم منذ منتصف الليل...' : 'يجمع المحادثات من آخر 48 ساعة...',
    'يحلل أسلوب التواصل والمبيعات...',
    'يكتشف الفرص الضائعة...',
    'يرتب التوصيات حسب الأولوية...',
    'يكتب التقرير النهائي...'
  ];
  let msgIdx = 0;
  const loadingInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    if (loadingProgress) loadingProgress.textContent = loadingMessages[msgIdx];
  }, 3000);

  try {
    const accountId = reportAccountSelect.value || null;
    const result = await ipcRenderer.invoke('generate-daily-report', { accountId, period: reportPeriod });

    clearInterval(loadingInterval);
    reportLoading.classList.add('hidden');

    if (result.success) {
      reportData = result;
      displayReport(result);
      renderMonthlyScores(result.monthlyScores || []);
      reportOutput.classList.remove('hidden');
      if (result.cached) showToast('تم فتح التقرير المحفوظ دون طلب تحليل جديد', 'success');
    } else {
      showReportError(result.error || 'حدث خطأ غير متوقع');
    }
  } catch (err) {
    clearInterval(loadingInterval);
    reportLoading.classList.add('hidden');
    showReportError('فشل الاتصال بـ Gemini API: ' + err.message);
  } finally {
    periodButtons.forEach(button => { button.disabled = false; });
  }
};

function displayReport(result) {
  const reportText = document.getElementById('report-text');

  const formattedReport = formatMarkdown(result.report);
  const countSummary = `<div class="lead-followup-counts" dir="rtl"><span>ليدات جديدة: <b>${Number(result.leadCount) || 0}</b></span><span>فولو أب: <b>${Number(result.followupCount) || 0}</b></span></div>`;
  const stats = result.currentStats || {};
  const periodLabel = stats.period === 'last48h' ? 'آخر 48 ساعة' : 'اليوم';
  const summaryStats = `<section class="report-current-stats" dir="rtl"><h3>الإحصائيات الحالية — ${periodLabel}</h3><div class="report-current-stats-grid"><span>المحادثات <b>${Number(stats.chats) || 0}</b></span><span>الرسائل <b>${Number(stats.total_messages) || 0}</b></span><span>رسائل السيلز <b>${Number(stats.sales_messages) || 0}</b></span><span>رسائل العملاء <b>${Number(stats.customer_messages) || 0}</b></span></div></section>`;
  const updateNote = result.incrementalUpdate
    ? '<p class="report-update-note" dir="rtl">تم إلحاق تحليل الرسائل الجديدة بنهاية التقرير. أوقات الرسائل المعروضة أدناه محسوبة من سجلات قاعدة البيانات الحالية؛ أما متن التحليل المحفوظ فيحتفظ بتوقيته وقت إنشائه. الدرجة داخل المتن هي الدرجة الأصلية، بينما يعرض جدول التطور الشهري أحدث درجة بعد تحليل الرسائل الجديدة.</p>'
    : '';
  reportText.innerHTML = countSummary + summaryStats + updateNote + formattedReport;
  const messageTimesSection = renderMessageTimes(result.currentStats?.messageTimesByAccount || {});
  if (messageTimesSection) {
    const reportHeading = reportText.querySelector('.report-h1');
    if (reportHeading) reportText.insertBefore(messageTimesSection, reportHeading);
    else reportText.appendChild(messageTimesSection);
  }
  const audioSection = renderAudioEvidence(result.audioEvidence || []);
  if (audioSection) reportText.appendChild(audioSection);
  addPhoneCopyControls(reportText);
  reportText.onclick = async event => {
    const button = event.target.closest('.copy-phone-inline');
    if (!button) return;
    const phone = button.dataset.phone;
    try {
      await navigator.clipboard.writeText(phone);
      showToast('تم نسخ رقم الطالب.', 'success');
    } catch (error) {
      showToast('تعذر النسخ تلقائيًا. حدّد الرقم وانسخه يدويًا.', 'error');
    }
  };
}

function renderMessageTimes(accountsById) {
  const accounts = Object.values(accountsById || {});
  if (!accounts.length) return null;

  const section = document.createElement('section');
  section.className = 'report-message-times';
  section.dir = 'rtl';
  const heading = document.createElement('h2');
  heading.textContent = 'أوقات الرسائل المسجلة حالياً';
  const note = document.createElement('p');
  note.className = 'message-times-note';
  note.textContent = 'الأوقات محسوبة من الرسائل النصية والصوتية المحفوظة في قاعدة البيانات.';
  section.append(heading, note);

  for (const account of accounts) {
    const card = document.createElement('article');
    card.className = 'message-times-card';
    const accountHeading = document.createElement('h3');
    accountHeading.textContent = account.accountName || 'الحساب';
    card.appendChild(accountHeading);

    const table = document.createElement('table');
    table.className = 'message-times-table';
    const body = document.createElement('tbody');
    const rows = [
      ['أول رسالة في الفترة', account.first],
      ['آخر رسالة مسجلة', account.last],
      ['آخر رسالة من السيلز', account.lastSales],
      ['آخر رسالة من العميل', account.lastCustomer]
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('tr');
      if (label === 'آخر رسالة من السيلز') row.className = 'message-times-sales';
      const labelCell = document.createElement('th');
      labelCell.scope = 'row';
      labelCell.textContent = label;
      const valueCell = document.createElement('td');
      valueCell.textContent = value ? `${value.time} · ${value.kind}` : 'لا توجد رسالة';
      row.append(labelCell, valueCell);
      body.appendChild(row);
    }
    table.appendChild(body);
    card.appendChild(table);
    section.appendChild(card);
  }
  return section;
}

function formatMessageTimesText(accountsById = {}) {
  const accounts = Object.values(accountsById);
  if (!accounts.length) return '';
  const rows = accounts.map(account => {
    const value = item => item ? `${item.time} (${item.kind})` : 'لا توجد رسالة';
    return [
      `الحساب: ${account.accountName || 'غير معروف'}`,
      `أول رسالة في الفترة: ${value(account.first)}`,
      `آخر رسالة مسجلة: ${value(account.last)}`,
      `آخر رسالة من السيلز: ${value(account.lastSales)}`,
      `آخر رسالة من العميل: ${value(account.lastCustomer)}`
    ].join('\n');
  });
  return `\n\nأوقات الرسائل المسجلة حالياً\n${rows.join('\n\n')}`;
}

function renderAudioEvidence(items) {
  if (!items.length) return null;
  const section = document.createElement('section');
  section.className = 'report-audio-evidence';
  section.dir = 'rtl';
  const title = document.createElement('h2');
  title.textContent = 'التقرير الشامل للتسجيلات الصوتية';
  const sourceNote = document.createElement('p');
  sourceNote.className = 'audio-evidence-source';
  sourceNote.textContent = 'يعرض هذا القسم كل تسجيل محفوظ في الفترة، مع التفريغ والنبرة وتصنيف الإساءة. التمييز يعتمد على التفريغ الصوتي، ويظل السياق مهمًا للمراجعة.';
  const abusiveCount = items.filter(item => item.abusive).length;
  const transcribedCount = items.filter(item => item.transcript).length;
  const salesCount = items.filter(item => item.sender === 'sales').length;
  const customerCount = items.length - salesCount;
  const untranscribedCount = items.length - transcribedCount;
  const unclassifiedCount = items.filter(item => item.abuseLabel === 'غير مصنّف' || item.abuseLabel === 'غير محسوم').length;
  const summary = document.createElement('div');
  summary.className = 'audio-evidence-summary';
  summary.innerHTML = `<span>إجمالي التسجيلات <b>${items.length}</b></span><span>مفرّغ منها <b>${transcribedCount}</b></span><span>بلا تفريغ <b>${untranscribedCount}</b></span><span>تسجيلات السيلز <b>${salesCount}</b></span><span>تسجيلات العملاء <b>${customerCount}</b></span><span class="audio-summary-abusive">مسيئة وتحتاج مراجعة <b>${abusiveCount}</b></span><span>غير محسومة التصنيف <b>${unclassifiedCount}</b></span>`;
  section.append(title, sourceNote, summary);

  for (const item of [...items].sort((a, b) => Number(b.abusive) - Number(a.abusive))) {
    const card = document.createElement('article');
    card.className = `audio-evidence-card${item.abusive ? ' audio-evidence-card--abusive' : ''}`;
    const heading = document.createElement('h3');
    const sender = item.sender === 'sales'
      ? `السيلز: ${item.accountName || 'غير معروف'}`
      : `العميل: ${item.customerName || 'غير معروف'}`;
    heading.textContent = `رسالة صوتية — ${item.time || item.timestamp || 'وقت غير متاح'} — ${sender}`;
    card.appendChild(heading);

    const classification = document.createElement('p');
    classification.className = `audio-evidence-classification${item.abusive ? ' audio-evidence-classification--abusive' : ''}`;
    classification.textContent = `تصنيف المحتوى: ${item.abuseLabel || 'غير مصنّف'}`;
    card.appendChild(classification);
    if (item.abuseReason) {
      const reason = document.createElement('p');
      reason.className = 'audio-evidence-reason';
      reason.textContent = item.abuseReason;
      card.appendChild(reason);
    }

    const identifiers = [];
    if (item.customerPhone) identifiers.push(`رقم واتساب: ${item.customerPhone}`);
    else if (item.chatId) identifiers.push(`معرّف المحادثة: ${item.chatId}`);
    if (Number(item.durationSec) > 0) identifiers.push(`المدة: ${Number(item.durationSec)} ثانية`);
    if (identifiers.length) {
      const meta = document.createElement('p');
      meta.className = 'audio-evidence-meta';
      meta.textContent = identifiers.join(' · ');
      card.appendChild(meta);
    }

    const transcriptLabel = document.createElement('strong');
    transcriptLabel.textContent = 'التفريغ الصوتي';
    const transcript = document.createElement('pre');
    transcript.className = 'audio-transcript-raw';
    transcript.dir = 'auto';
    transcript.textContent = item.transcript === '' ? 'لا يوجد تفريغ محفوظ في قاعدة البيانات.' : item.transcript;
    const tone = document.createElement('p');
    tone.className = 'audio-evidence-tone';
    tone.textContent = `نبرة الصوت: ${item.tone === '' ? 'غير متاحة' : item.tone}`;
    card.append(transcriptLabel, transcript, tone);
    section.appendChild(card);
  }
  return section;
}

function formatAudioEvidenceText(items = []) {
  if (!items.length) return '';
  const entries = items.map(item => {
    const sender = item.sender === 'sales' ? `السيلز (${item.accountName || 'غير معروف'})` : `العميل (${item.customerName || 'غير معروف'})`;
    const phone = item.customerPhone ? `رقم واتساب: ${item.customerPhone}` : `معرّف المحادثة: ${item.chatId || 'غير متاح'}`;
    const transcript = item.transcript === '' ? 'لا يوجد تفريغ محفوظ.' : item.transcript;
    const tone = item.tone === '' ? 'غير متاحة' : item.tone;
    return `الوقت: ${item.time || item.timestamp || 'غير متاح'}\n${sender} — ${phone}\nتصنيف المحتوى: ${item.abuseLabel || 'غير مصنّف'}\nالتفريغ الصوتي:\n${transcript}\nنبرة الصوت:\n${tone}${item.abuseReason ? `\nملاحظة التصنيف: ${item.abuseReason}` : ''}`;
  });
  return `\n\nالتقرير الشامل للتسجيلات الصوتية\nإجمالي التسجيلات: ${items.length}\nالمفرّغ منها: ${items.filter(item => item.transcript).length}\nبلا تفريغ: ${items.filter(item => !item.transcript).length}\nالتسجيلات المسيئة التي تحتاج مراجعة: ${items.filter(item => item.abusive).length}\nغير محسومة التصنيف: ${items.filter(item => item.abuseLabel === 'غير مصنّف' || item.abuseLabel === 'غير محسوم').length}\n\n${entries.join('\n\n')}`;
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
      const { copy } = normalizeReportPhone(match[0]);
      const digitCount = String(copy || '').replace(/\D/g, '').length;
      if (!copy || digitCount < 10 || digitCount > 15) continue;
      if (match.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      const wrapper = document.createElement('span');
      wrapper.className = 'report-phone-copy';
      const number = document.createElement('bdi');
      number.dir = 'ltr';
      number.textContent = match[0];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-phone-inline';
      button.dataset.phone = copy;
      button.title = 'نسخ رقم الطالب';
      button.setAttribute('aria-label', `نسخ رقم الطالب ${match[0]}`);
      button.textContent = 'نسخ';
      wrapper.append(number, button);
      fragment.appendChild(wrapper);
      cursor = match.index + match[0].length;
      changed = true;
    }
    if (changed) {
      if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode.replaceChild(fragment, node);
    }
  }
}

async function loadMonthlyScores() {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = document.getElementById('monthly-score-month');
  if (monthLabel) monthLabel.textContent = new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(now);
  try {
    const scores = await ipcRenderer.invoke('get-monthly-sales-scores', { month, accountId: reportAccountSelect.value || null });
    renderMonthlyScores(scores);
  } catch (error) {
    console.error('Could not load monthly sales score history:', error);
  }
}

function renderMonthlyScores(scores = []) {
  const body = document.getElementById('monthly-scores-body');
  if (!body) return;
  if (!scores.length) {
    body.innerHTML = '<tr><td colspan="7" class="scores-empty">لا توجد تقييمات محفوظة لهذا الشهر بعد. استخرج تقرير اليوم لحفظ تقييم.</td></tr>';
    return;
  }
  body.innerHTML = scores.map(row => {
    const rawDate = String(row.score_date).slice(0, 10);
    const dateLabel = rawDate.split('-').reverse().join('/');
    const score = Number(row.overall_score) || 0;
    const scoreClass = score >= 80 ? 'score-high' : score >= 60 ? 'score-medium' : 'score-low';
    return `<tr><td>${escapeHtml(dateLabel)}</td><td>${escapeHtml(row.account_name || '')}</td><td><span class="score-pill ${scoreClass}">${score}/100</span></td><td>${Number(row.lead_count) || 0}</td><td>${Number(row.followup_count) || 0}</td><td>${Number(row.conversation_count) || 0}</td><td class="score-improvement">${escapeHtml(row.improvement || '—')}</td></tr>`;
  }).join('');
}

/**
 * تحويل Markdown بسيط إلى HTML للعرض داخل التطبيق.
 */
function renderMarkdownTables(text) {
  const lines = String(text || '').split('\n');
  const rendered = [];
  const isPipeRow = line => /^\s*\|.*\|\s*$/.test(line);
  const cellsFrom = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  const isSeparator = line => isPipeRow(line) && cellsFrom(line).every(cell => /^:?-{3,}:?$/.test(cell));
  for (let index = 0; index < lines.length;) {
    if (!isPipeRow(lines[index]) || index + 1 >= lines.length || !isSeparator(lines[index + 1])) {
      rendered.push(lines[index++]);
      continue;
    }
    const headers = cellsFrom(lines[index]);
    index += 2;
    const rows = [];
    while (index < lines.length && isPipeRow(lines[index]) && !isSeparator(lines[index])) {
      rows.push(cellsFrom(lines[index]));
      index++;
    }
    const normalizeRow = cells => headers.map((_, cellIndex) => escapeHtml(cells[cellIndex] || '—'));
    const head = headers.map(cell => `<th scope="col">${escapeHtml(cell)}</th>`).join('');
    const body = rows.map(cells => `<tr>${normalizeRow(cells).map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
    rendered.push(`<div class="report-table-wrap" dir="rtl"><table class="report-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`);
  }
  return rendered.join('\n');
}

function formatMarkdown(text) {
  if (!text) return '';

  return renderMarkdownTables(text)
    // العناوين
    .replace(/^### (.+)$/gm, '<h3 class="report-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="report-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="report-h1">$1</h1>')
    .replace(/\*\*خطأ كتابي مثبت\*\*/g, '<strong class="report-error-flag">خطأ كتابي مثبت</strong>')
    .replace(/\*\*فرصة لتحسين الأسلوب\*\*/g, '<strong class="report-improvement-flag">فرصة لتحسين الأسلوب</strong>')
    // النص العريض
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // النص المائل
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // اقتباسات الأدلة من المحادثات
    .replace(/^> ?(.+)$/gm, '<blockquote class="report-quote">$1</blockquote>')
    // القوائم
    .replace(/^[*-] (.+)$/gm, '<li class="report-bullet">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="numbered"><span class="num">$1.</span> $2</li>')
    // الأسطر الفاصلة
    .replace(/^---+$/gm, '<hr class="report-divider">')
    // الأسطر الفارغة
    .replace(/\n\n/g, '</p><p class="report-para">')
    // تنظيف القوائم
    .replace(/(?:<li class="numbered">.*<\/li>\n?)+/g, match => `<ol class="report-ordered-list">${match}</ol>`)
    .replace(/(?:<li class="report-bullet">.*<\/li>\n?)+/g, match => `<ul class="report-list">${match}</ul>`)
    // اعزل الأرقام بعد إكمال تحويل Markdown كي لا يتأثر اتجاهها بسياق العربية.
    .replace(/\+\s*\d[\d\s().-]*\d/g, phone => {
      const digitCount = (phone.match(/\d/g) || []).length;
      if (digitCount < 8) return phone;
      const exactPhone = phone.trim();
      return `<bdi dir="ltr" class="phone-number">${exactPhone}</bdi>`;
    });
}

function showReportError(message) {
  const reportError = document.getElementById('report-error');
  const errorMessage = document.getElementById('error-message');
  const errorTitle = document.getElementById('error-title');
  const errorIcon = document.getElementById('error-icon');
  const errorActions = document.getElementById('error-actions-container');

  reportError.classList.remove('hidden');

  let cleanMessage = String(message || '');

  if (cleanMessage.includes('503') || cleanMessage.includes('high demand') || cleanMessage.includes('UNAVAILABLE')) {
    cleanMessage = 'تشهد خوادم الذكاء الاصطناعي ضغطاً استثنائياً مؤقتاً في هذه اللحظة (High Traffic). جميع الرسائل محفوظة بأمان، يرجى الضغط على زر "إعادة المحاولة" الآن وسيقوم النظام بتجاوزه تلقائياً.';
    if (errorTitle) errorTitle.textContent = 'ضغط مؤقت على سيرفرات الذكاء الاصطناعي';
    if (errorIcon) errorIcon.textContent = '⏳';
    if (errorActions) errorActions.classList.remove('hidden');
  } else if (cleanMessage.includes('لا توجد رسائل')) {
    if (errorTitle) errorTitle.textContent = 'لا توجد محادثات مسجلة بعد';
    if (errorIcon) errorIcon.textContent = '💡';
    if (errorActions) errorActions.classList.remove('hidden');
  } else {
    if (errorTitle) errorTitle.textContent = 'تنبيه أثناء استخراج التقرير';
    if (errorIcon) errorIcon.textContent = '⚠️';
  }

  errorMessage.textContent = cleanMessage;
}


window.copyReport = function() {
  if (!reportData) return;
  
  navigator.clipboard.writeText(reportData.report + formatMessageTimesText(reportData.currentStats?.messageTimesByAccount || {}) + formatAudioEvidenceText(reportData.audioEvidence || [])).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = '✅ تم النسخ!';
    showToast('تم نسخ التقرير إلى الحافظة بنجاح', 'success');
    setTimeout(() => btn.textContent = '📋 نسخ التقرير', 2000);
  });
};

/**
 * فحص الاتصال بـ Gemini API
 */
window.testGeminiConnection = async function() {
  showToast('جاري الاتصال بـ Gemini 3.1 Flash-Lite...', 'info');
  try {
    const res = await ipcRenderer.invoke('test-gemini-connection');
    if (res.success) {
      showToast(`✅ الاتصال ناجح: ${res.message}`, 'success');
    } else {
      showToast(`❌ فشل الاتصال: ${res.error}`, 'error');
    }
  } catch (err) {
    showToast(`❌ خطأ: ${err.message}`, 'error');
  }
};

/**
 * عرض سجل الرسائل الملتقطة
 */
window.openMessagesPreview = async function() {
  const modal = document.getElementById('messages-modal');
  const container = document.getElementById('messages-list-container');
  const countLabel = document.getElementById('messages-count-label');

  container.innerHTML = '<div class="preview-loading">جاري جلب الرسائل...</div>';
  modal.classList.remove('hidden');

  try {
    const accountId = reportAccountSelect.value || null;
    const messages = await ipcRenderer.invoke('get-today-messages-preview', { accountId, period: reportPeriod });

    if (!messages || messages.length === 0) {
      container.innerHTML = `
        <div class="preview-empty">
          <div class="empty-icon">📭</div>
          <p>لا توجد رسائل مسجلة في قاعدة البيانات لليوم حتى الآن.</p>
          <button class="cta-secondary-btn" onclick="closeMessagesModal(); switchView('whatsapp');" style="margin-top:12px;">
            💬 الذهاب لواتساب ومسح الـ QR Code
          </button>
        </div>
      `;
      countLabel.textContent = '0 رسالة';
      return;
    }

    countLabel.textContent = `${messages.length} رسالة حديثة`;

    let html = '<div class="preview-messages-list">';
    messages.forEach(m => {
      const isSales = m.sender === 'sales';
      const customerLabel = String(m.customer_name || 'عميل');
      const isPhoneNumber = /^[+\d\s().-]+$/.test(customerLabel) &&
        (customerLabel.match(/\d/g) || []).length >= 7;
      const safeCustomerLabel = escapeHtml(customerLabel);
      const renderedCustomerLabel = isPhoneNumber
        ? `<bdi dir="ltr" class="phone-number">${safeCustomerLabel}</bdi>`
        : safeCustomerLabel;
      html += `
        <div class="preview-msg-item ${isSales ? 'sales' : 'customer'}">
          <div class="msg-header">
            <span class="msg-sender">${isSales ? '💼 ' + escapeHtml(m.account_name || '') : '👤 ' + renderedCustomerLabel}</span>
            <span class="msg-time">${m.display_time || ''}</span>
          </div>
          <div class="msg-body">${escapeHtml(m.text)}</div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<div class="preview-error">خطأ في الجلب: ${err.message}</div>`;
  }
};

window.closeMessagesModal = function() {
  document.getElementById('messages-modal').classList.add('hidden');
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Floating Toast Notifications =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== Debug: فتح DevTools الـ webview =====
window.openWebviewDevTools = function() {
  const wv = activeAccountId ? document.getElementById(`webview-${activeAccountId}`) : document.querySelector('webview.active');
  if (!wv) { showToast('لا يوجد webview نشط', 'error'); return; }
  try {
    const wcId = wv.getWebContentsId();
    ipcRenderer.send('open-webview-devtools', { webContentsId: wcId });
    showToast('تم فتح DevTools للـ webview', 'info');
  } catch(e) {
    // Fallback: openDevTools مباشرة على الـ webview
    wv.openDevTools();
  }
};

// Ctrl+Shift+W يفتح DevTools الـ webview للـ debugging
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'W') {
    window.openWebviewDevTools();
  }
});

// ===== Run =====
init();

