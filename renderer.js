/**
 * renderer.js
 * عملية العرض (Renderer Process) لتطبيق Whatsi.
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
const reportDateInput = document.getElementById('report-date');

// ===== State =====
let accounts = [];
let editingAccountId = null;
let currentView = 'whatsapp';
let reportData = null;

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
  // تعيين تاريخ اليوم كقيمة افتراضية لفلتر التقرير
  const localToday = new Date();
  reportDateInput.value = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
  
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

  // تحديث الإحصائيات
  refreshStats();
  
  // تحديث الإحصائيات كل 30 ثانية
  setInterval(refreshStats, 30000);
  
  // الاستماع لتحديثات عداد الرسائل من الـ Main Process
  ipcRenderer.on('message-count-updated', () => {
    // إعادة القراءة بالفلاتر الحالية بدل استبدالها بإحصائيات غير مفلترة من Main.
    refreshStats();
  });
}

// ===== View Switching =====
window.switchView = function(view) {
  currentView = view;
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById(`view-${view}`).classList.add('active');
  document.getElementById(`nav-${view}`).classList.add('active');

  if (view === 'report') {
    refreshStats();
  }
};

// ===== Stats =====
async function refreshStats() {
  try {
    const accountId = reportAccountSelect.value || null;
    const date      = reportDateInput.value      || null;
    const stats = await ipcRenderer.invoke('get-today-stats', { accountId, date });
    updateStatsDisplay(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// تحديث الأرقام عند تغيير الحساب أو التاريخ
reportAccountSelect.addEventListener('change', refreshStats);
reportDateInput.addEventListener('change', refreshStats);

function updateStatsDisplay(stats) {
  if (!stats) return;
  
  const chats = stats.chats || 0;
  const messages = stats.total_messages || 0;
  const accounts_count = stats.accounts || 0;

  // Sidebar stats
  document.getElementById('stat-chats').textContent = chats;
  document.getElementById('stat-messages').textContent = messages;

  // Report cards
  document.getElementById('card-chats').textContent = chats;
  document.getElementById('card-messages').textContent = messages;
}

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
window.generateReport = async function() {
  const generateBtn = document.getElementById('generate-report-btn');
  const btnText = document.getElementById('generate-btn-text');
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

  generateBtn.disabled = true;
  btnText.textContent = 'جاري التحليل...';

  // مراحل التحميل
  const loadingMessages = [
    'يقرأ كل الشاتات المسجلة اليوم...',
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
    const date = reportDateInput.value || null;

    const result = await ipcRenderer.invoke('generate-daily-report', { accountId, date });

    clearInterval(loadingInterval);
    reportLoading.classList.add('hidden');

    if (result.success) {
      reportData = result;
      displayReport(result);
      reportOutput.classList.remove('hidden');
    } else {
      showReportError(result.error || 'حدث خطأ غير متوقع');
    }
  } catch (err) {
    clearInterval(loadingInterval);
    reportLoading.classList.add('hidden');
    showReportError('فشل الاتصال بـ Gemini API: ' + err.message);
  } finally {
    generateBtn.disabled = false;
    btnText.textContent = 'استخراج تقرير اليوم';
  }
};

function displayReport(result) {
  const reportText = document.getElementById('report-text');

  // تحويل Markdown إلى HTML بسيط لعرض أفضل
  const formattedReport = formatMarkdown(result.report);
  const customerNumbers = result.customerNumbers || [];
  const contactsHtml = customerNumbers.length
    ? `<section class="customer-phone-directory" dir="rtl"><strong>أرقام واتساب الملتقطة من واتساب</strong><div class="customer-phone-list">${customerNumbers.map(contact => {
        const name = escapeHtml(contact.customer_name || 'عميل');
        const account = escapeHtml(contact.account_name || '');
        const { display: phone, copy: copyValue } = normalizeReportPhone(contact.customer_phone);
        return `<div class="customer-phone-row"><span>${name}${account ? ` — ${account}` : ''}</span><bdi dir="ltr" class="phone-number">${escapeHtml(phone)}</bdi><button type="button" class="copy-canonical-phone" data-phone="${escapeHtml(copyValue)}">نسخ الرقم</button></div>`;
      }).join('')}</div></section>`
    : '';
  reportText.innerHTML = contactsHtml + formattedReport;
  reportText.onclick = async event => {
    const button = event.target.closest('.copy-canonical-phone');
    if (!button) return;
    const phone = button.dataset.phone;
    try {
      await navigator.clipboard.writeText(phone);
      showToast('تم نسخ الرقم الملتقط من واتساب. يمكنك لصقه في واتساب.', 'success');
    } catch (error) {
      showToast('تعذر النسخ تلقائيًا. حدّد الرقم وانسخه يدويًا.', 'error');
    }
  };
}

/**
 * تحويل Markdown بسيط إلى HTML للعرض داخل التطبيق.
 */
function formatMarkdown(text) {
  if (!text) return '';

  return text
    // العناوين
    .replace(/^### (.+)$/gm, '<h3 class="report-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="report-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="report-h1">$1</h1>')
    // النص العريض
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // النص المائل
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // القوائم
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="numbered"><span class="num">$1.</span> $2</li>')
    // الأسطر الفاصلة
    .replace(/^---+$/gm, '<hr class="report-divider">')
    // الأسطر الفارغة
    .replace(/\n\n/g, '</p><p class="report-para">')
    // التفاف كل شيء في فقرات
    .replace(/^(?!<[h|l|p|h])/gm, '')
    // تنظيف القوائم
    .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul class="report-list">${match}</ul>`)
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
  
  navigator.clipboard.writeText(reportData.report).then(() => {
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
  showToast('جاري الاتصال بـ Gemini 3.8 Flash...', 'info');
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
 * مسح رسائل اليوم
 */
window.clearTodayData = async function() {
  const date = reportDateInput.value || null;
  const accountId = reportAccountSelect.value || null;
  const accountName = accountId ? accounts.find(account => account.id === accountId)?.name : 'كل الحسابات';
  const label = date || 'اليوم';
  if (!confirm(`سيتم حذف الرسائل النصية والصوتية المسجلة بتاريخ ${label} للحساب: ${accountName || 'المحدد'}، بما فيها ملفات الصوت. هل تريد المتابعة؟`)) return;
  try {
    const res = await ipcRenderer.invoke('clear-today-messages', { date, accountId });
    if (res.success) {
      await refreshStats();
      showToast(`تم حذف ${res.deleted} رسالة (${res.messages} نصية و${res.audio} صوتية)`, 'info');
      // إرجاع واجهة التقرير للحالة الأولية
      document.getElementById('report-output').classList.add('hidden');
      document.getElementById('report-error').classList.add('hidden');
      document.getElementById('report-empty').classList.remove('hidden');
    }
  } catch (err) {
    showToast(`تعذر حذف البيانات: ${err.message}`, 'error');
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
    const messages = await ipcRenderer.invoke('get-today-messages-preview', { accountId });

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

