/**
 * dashboard.js
 * لوحة التحكم والتقارير والتدقيق الذكي (AI Dashboard Server)
 * تطبيق Whatsi Z-ray Enterprise
 * 
 * الميزات:
 * 1. لوحة إحصائيات لحظية وشاملة لأداء المبيعات
 * 2. تقارير تفاعلية بواسطة Gemini AI مع قياس سرعة الرد وكفاية العينة
 * 3. تحليل التسجيلات الصوتية واكتشاف التجاوزات
 * 4. سجل تاريخي لتقييم السيلز الشهري وتصدير Excel
 * 5. إدارة مواعيد وساعات عمل الموظفين والأرقام المستبعدة
 * 6. نظام مستخدمين وصلاحيات (أعضاء مجلس الإدارة ومراقبو الجودة)
 * 7. مزامنة لحظية فورية عبر Server-Sent Events (SSE)
 */

// ===== Global State =====
let accounts = [];
let allSystemAccounts = [];
let currentPeriod = 'today';
let reportData = null;
let latestEvidenceGate = null;
let editingAccountId = null;
let sseConnection = null;
let currentUser = null;
let systemUsersList = [];

const dayNamesArabic = {
  6: 'السبت',
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة'
};

// ===== FETCH INTERCEPTOR (Attaches Bearer Token to all /api/ calls) =====
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const token = localStorage.getItem('whatsi_auth_token');
    options = options || {};
    options.headers = options.headers || {};
    if (token) {
      if (options.headers instanceof Headers) {
        options.headers.set('Authorization', `Bearer ${token}`);
      } else {
        options.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const res = await originalFetch(url, options);
    if (res.status === 401 && !url.includes('/api/auth/login')) {
      localStorage.removeItem('whatsi_auth_token');
      currentUser = null;
      showLoginModal();
    }
    return res;
  }
  return originalFetch(url, options);
};

// ===== AUTHENTICATION & PROFILE LOGIC =====
function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.classList.remove('hidden');
    const userField = document.getElementById('login-username');
    if (userField) setTimeout(() => userField.focus(), 100);
  }
  const headerPill = document.getElementById('user-header-pill');
  if (headerPill) headerPill.style.display = 'none';
  if (sseConnection) {
    sseConnection.close();
    sseConnection = null;
  }
}

function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) modal.classList.add('hidden');
}

function renderUserProfileHeader() {
  const headerPill = document.getElementById('user-header-pill');
  if (!headerPill || !currentUser) return;

  headerPill.style.display = 'flex';
  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-role-badge');
  const avatarEl = document.getElementById('user-avatar-initials');
  const usersBtn = document.getElementById('header-btn-users');

  if (nameEl) nameEl.textContent = currentUser.name || currentUser.username;
  if (roleEl) {
    roleEl.textContent = currentUser.roleLabel || (currentUser.isBoardMember ? 'عضو مجلس إدارة' : 'مدير مبيعات ومراقب جودة');
    roleEl.className = 'role-badge ' + (currentUser.isBoardMember ? 'role-badge-board' : 'role-badge-sales');
  }
  if (avatarEl) {
    const letter = (currentUser.name || currentUser.username || 'U').charAt(0).toUpperCase();
    avatarEl.textContent = letter;
  }

  if (usersBtn) {
    usersBtn.style.display = currentUser.isBoardMember ? 'inline-flex' : 'none';
  }

  // إخفاء أزرار الإعدادات ومواعيد العمل لمن ليسوا في مجلس الإدارة
  const settingsButtons = document.querySelectorAll('.toolbar-btn[onclick*="Settings"], .toolbar-btn[onclick*="Schedules"]');
  settingsButtons.forEach(btn => {
    btn.style.display = currentUser.isBoardMember ? '' : 'none';
  });
}

window.togglePasswordVisibility = function(fieldId) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
};

window.submitLoginForm = async function(e) {
  if (e) e.preventDefault();
  const usernameInput = document.getElementById('login-username');
  const passwordInput = document.getElementById('login-password');
  const errorMsg = document.getElementById('login-error-msg');
  const submitBtn = document.getElementById('login-submit-btn');
  const btnText = document.getElementById('login-btn-text');
  const btnSpinner = document.getElementById('login-btn-spinner');

  if (errorMsg) errorMsg.style.display = 'none';

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    if (errorMsg) {
      errorMsg.textContent = 'يرجى إدخال اسم المستخدم وكلمة السر';
      errorMsg.style.display = 'block';
    }
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.style.display = 'none';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      localStorage.setItem('whatsi_auth_token', data.token);
      currentUser = data.user;
      hideLoginModal();
      renderUserProfileHeader();
      if (passwordInput) passwordInput.value = '';
      showToast(`مرحباً بك يا ${currentUser.name || currentUser.username} 👋`, 'success');
      await init();
    } else {
      if (errorMsg) {
        errorMsg.textContent = data.error || 'اسم المستخدم أو كلمة السر غير صحيحة';
        errorMsg.style.display = 'block';
      }
    }
  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = 'تعذر الاتصال بالخادم: ' + err.message;
      errorMsg.style.display = 'block';
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.style.display = 'inline-block';
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
};

window.handleLogout = async function() {
  if (!confirm('هل تريد بالتأكيد تسجيل الخروج من منظومة Whatsi Z-ray؟')) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem('whatsi_auth_token');
  currentUser = null;
  showLoginModal();
};

async function checkAuthAndInit() {
  const token = localStorage.getItem('whatsi_auth_token');
  if (!token) {
    showLoginModal();
    return;
  }

  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      hideLoginModal();
      renderUserProfileHeader();
      await init();
    } else {
      localStorage.removeItem('whatsi_auth_token');
      showLoginModal();
    }
  } catch (err) {
    console.warn('Auth check error:', err.message);
    showLoginModal();
  }
}

// ===== USERS MANAGEMENT (BOARD MEMBER ONLY) =====
window.openUsersModal = async function() {
  const modal = document.getElementById('users-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  await loadUsersList();
};

window.closeUsersModal = function() {
  const modal = document.getElementById('users-modal');
  if (modal) modal.classList.add('hidden');
};

async function loadUsersList() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#8696a0;">جاري تحميل المستخدمين...</td></tr>';

  try {
    const res = await fetch('/api/users');
    const data = await res.json();
    if (data.success && Array.isArray(data.users)) {
      systemUsersList = data.users;
      renderUsersTable(data.users);
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#ff6b6b;">خطأ: ${data.error || 'تعذر جلب المستخدمين'}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#ff6b6b;">خطأ في الاتصال: ${err.message}</td></tr>`;
  }
}

function renderUsersTable(usersList) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  if (!usersList.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#8696a0;">لا يوجد مستخدمين مسجلين بعد.</td></tr>';
    return;
  }

  tbody.innerHTML = usersList.map(u => {
    const isBoard = u.role === 'BOARD_MEMBER';
    const roleBadge = `<span class="role-badge ${isBoard ? 'role-badge-board' : 'role-badge-sales'}">${escapeHtml(u.roleLabel || u.role)}</span>`;

    let scopeLabel = '—';
    if (isBoard) {
      scopeLabel = '<span style="color:#00d26a; font-weight:600;">كامل الحسابات والتقارير (مجلس إدارة)</span>';
    } else if (u.allAccounts) {
      scopeLabel = '<span style="color:#53bdeb;">جميع الحسابات</span>';
    } else if (Array.isArray(u.allowedAccounts) && u.allowedAccounts.length > 0) {
      const names = u.allowedAccounts.map(accId => {
        const found = allSystemAccounts.find(a => a.id === accId || a.name === accId);
        return found ? found.name : accId;
      });
      scopeLabel = `<span style="font-size:0.8rem; color:#d1d7db;">${escapeHtml(names.join('، '))}</span>`;
    } else {
      scopeLabel = '<span style="color:#ff6b6b; font-size:0.8rem;">لا يوجد حسابات محددة</span>';
    }

    const isCurrent = currentUser && currentUser.id === u.id;
    const actionsHtml = `
      <button class="table-btn" onclick="openEditUserModal('${u.id}')">✏️ تعديل</button>
      ${!isCurrent ? `<button class="table-btn delete-btn" onclick="deleteUserItem('${u.id}', '${escapeAttr(u.username)}')">🗑️ حذف</button>` : '<span style="font-size:0.75rem; color:#8696a0; margin-right:6px;">(حسابك الحالي)</span>'}
    `;

    return `
      <tr>
        <td>
          <div style="font-weight:700; color:#e9edef;">${escapeHtml(u.name || u.username)}</div>
          <div style="font-size:0.76rem; color:#8696a0;">@${escapeHtml(u.username)}</div>
        </td>
        <td>${roleBadge}</td>
        <td>${scopeLabel}</td>
        <td style="font-size:0.78rem; color:#8696a0;">${escapeHtml((u.createdAt || '').slice(0, 10))}</td>
        <td>${actionsHtml}</td>
      </tr>
    `;
  }).join('');
}

window.openAddUserModal = function() {
  document.getElementById('user-edit-modal-title').textContent = 'إضافة مستخدم جديد';
  document.getElementById('user-edit-id').value = '';
  document.getElementById('user-edit-username').value = '';
  document.getElementById('user-edit-username').disabled = false;
  document.getElementById('user-edit-name').value = '';
  document.getElementById('user-edit-password').value = '';
  document.getElementById('user-edit-password').required = true;
  document.getElementById('user-password-hint').textContent = 'كلمة السر مطلوبة لإنشاء الحساب (4 أحرف فأكثر).';
  document.getElementById('user-edit-role').value = 'SALES_MANAGER_QC';
  document.getElementById('scope-all').checked = true;
  document.getElementById('scope-specific').checked = false;
  document.getElementById('user-edit-error').style.display = 'none';

  handleUserRoleChange();
  renderAccountsChecklist([]);
  document.getElementById('user-edit-modal').classList.remove('hidden');
};

window.openEditUserModal = function(userId) {
  const user = systemUsersList.find(u => u.id === userId);
  if (!user) return;

  document.getElementById('user-edit-modal-title').textContent = `تعديل المستخدم: ${user.name || user.username}`;
  document.getElementById('user-edit-id').value = user.id;
  document.getElementById('user-edit-username').value = user.username;
  document.getElementById('user-edit-username').disabled = true;
  document.getElementById('user-edit-name').value = user.name || '';
  document.getElementById('user-edit-password').value = '';
  document.getElementById('user-edit-password').required = false;
  document.getElementById('user-password-hint').textContent = 'اترك كلمة السر فارغة إذا كنت لا ترغب في تغييرها.';
  document.getElementById('user-edit-role').value = user.role || 'SALES_MANAGER_QC';

  if (user.allAccounts || user.role === 'BOARD_MEMBER') {
    document.getElementById('scope-all').checked = true;
    document.getElementById('scope-specific').checked = false;
  } else {
    document.getElementById('scope-all').checked = false;
    document.getElementById('scope-specific').checked = true;
  }

  document.getElementById('user-edit-error').style.display = 'none';

  handleUserRoleChange();
  renderAccountsChecklist(user.allowedAccounts || []);
  document.getElementById('user-edit-modal').classList.remove('hidden');
};

window.closeUserEditModal = function() {
  const modal = document.getElementById('user-edit-modal');
  if (modal) modal.classList.add('hidden');
};

window.handleUserRoleChange = function() {
  const role = document.getElementById('user-edit-role').value;
  const configBox = document.getElementById('sales-manager-config-box');
  if (configBox) {
    configBox.style.display = role === 'BOARD_MEMBER' ? 'none' : 'block';
  }
  toggleScopeInputs();
};

window.toggleScopeInputs = function() {
  const isSpecific = document.getElementById('scope-specific').checked;
  const selector = document.getElementById('specific-accounts-selector');
  if (selector) {
    selector.style.display = isSpecific ? 'block' : 'none';
  }
};

function renderAccountsChecklist(selectedIds = []) {
  const container = document.getElementById('accounts-checklist-grid');
  if (!container) return;

  if (!allSystemAccounts.length) {
    container.innerHTML = '<div style="color:#8696a0; font-size:0.8rem; padding:8px;">لا توجد خطوط مبيعات مسجلة في النظام.</div>';
    return;
  }

  container.innerHTML = allSystemAccounts.map(acc => {
    const isChecked = selectedIds.includes(acc.id) || selectedIds.includes(acc.name);
    return `
      <label class="account-check-chip">
        <input type="checkbox" name="user-allowed-account" value="${escapeAttr(acc.id)}" ${isChecked ? 'checked' : ''} />
        <span>${escapeHtml(acc.name)}</span>
      </label>
    `;
  }).join('');
}

window.toggleAllUserAccounts = function(check) {
  document.querySelectorAll('input[name="user-allowed-account"]').forEach(cb => {
    cb.checked = check;
  });
};

window.submitUserEditForm = async function(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('user-edit-id').value;
  const username = document.getElementById('user-edit-username').value.trim();
  const name = document.getElementById('user-edit-name').value.trim();
  const password = document.getElementById('user-edit-password').value;
  const role = document.getElementById('user-edit-role').value;
  const isAllAccounts = document.getElementById('scope-all').checked;
  const errorEl = document.getElementById('user-edit-error');
  const saveBtn = document.getElementById('save-user-btn');

  if (errorEl) errorEl.style.display = 'none';

  let allowedAccounts = [];
  if (role !== 'BOARD_MEMBER' && !isAllAccounts) {
    document.querySelectorAll('input[name="user-allowed-account"]:checked').forEach(cb => {
      allowedAccounts.push(cb.value);
    });
    if (allowedAccounts.length === 0) {
      if (errorEl) {
        errorEl.textContent = 'يرجى اختيار خط مبيعات واحد على الأقل، أو تحديد خيار "السماح برؤية كل شيء"';
        errorEl.style.display = 'block';
      }
      return;
    }
  }

  const payload = {
    username,
    name,
    role,
    allAccounts: role === 'BOARD_MEMBER' ? true : isAllAccounts,
    allowedAccounts: role === 'BOARD_MEMBER' ? [] : allowedAccounts
  };

  if (password) {
    if (password.length < 4) {
      if (errorEl) {
        errorEl.textContent = 'كلمة السر يجب ألا تقل عن 4 أحرف';
        errorEl.style.display = 'block';
      }
      return;
    }
    payload.password = password;
  } else if (!id) {
    if (errorEl) {
      errorEl.textContent = 'كلمة السر مطلوبة عند إنشاء مستخدم جديد';
      errorEl.style.display = 'block';
    }
    return;
  }

  if (saveBtn) saveBtn.disabled = true;

  try {
    const isEdit = Boolean(id);
    const url = isEdit ? `/api/users/${id}` : '/api/users';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      showToast(isEdit ? 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' : 'تم إضافة المستخدم الجديد بنجاح', 'success');
      closeUserEditModal();
      await loadUsersList();
    } else {
      if (errorEl) {
        errorEl.textContent = data.error || 'تعذر حفظ بيانات المستخدم';
        errorEl.style.display = 'block';
      }
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = 'خطأ في الاتصال: ' + err.message;
      errorEl.style.display = 'block';
    }
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
};

window.deleteUserItem = async function(userId, username) {
  if (!confirm(`هل أنت متأكد من حذف المستخدم (@${username}) نهائياً؟`)) return;
  try {
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast(`تم حذف المستخدم (@${username}) بنجاح`, 'success');
      await loadUsersList();
    } else {
      alert(`⚠️ تعذر حذف المستخدم: ${data.error || 'خطأ غير معروف'}`);
    }
  } catch (err) {
    alert(`⚠️ خطأ في الاتصال: ${err.message}`);
  }
};

// ===== Elements =====
const reportAccountSelect = document.getElementById('report-account');

// ===== Initialization =====
async function init() {
  await loadAccounts();
  await refreshLiveData();
  await loadMonthlyScores();
  connectSSE();
  startPeriodicSync();
}

// ===== Accounts Management =====
async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (data.success && Array.isArray(data.accounts)) {
      accounts = data.accounts;
      if (Array.isArray(data.allAvailableAccounts)) {
        allSystemAccounts = data.allAvailableAccounts;
      } else {
        allSystemAccounts = data.accounts;
      }
      populateAccountDropdowns();
    }
  } catch (err) {
    console.error('Failed to load accounts:', err);
  }
}

function populateAccountDropdowns() {
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
}

// ===== AI Dashboard & Report Logic =====
if (reportAccountSelect) {
  reportAccountSelect.addEventListener('change', () => {
    refreshLiveData();
    loadMonthlyScores();
  });
}

window.refreshLiveData = async function() {
  const accountId = reportAccountSelect ? reportAccountSelect.value : '';
  try {
    const res = await fetch(`/api/stats?period=${currentPeriod}&accountId=${encodeURIComponent(accountId)}`);
    const data = await res.json();
    if (data.success && data.stats) {
      const s = data.stats;
      const elChats = document.getElementById('stat-chats');
      const elMsgs = document.getElementById('stat-messages');
      const elSales = document.getElementById('stat-sales-messages');
      const elCust = document.getElementById('stat-customer-messages');
      const elLeads = document.getElementById('stat-leads');
      const elFollow = document.getElementById('stat-followups');

      if (elChats) elChats.textContent = s.chats || 0;
      if (elMsgs) elMsgs.textContent = s.total_messages || 0;
      if (elSales) elSales.textContent = s.sales_messages || 0;
      if (elCust) elCust.textContent = s.customer_messages || 0;
      if (elLeads) elLeads.textContent = s.leadCount || 0;
      if (elFollow) elFollow.textContent = s.followupCount || 0;
    }
  } catch (err) {
    console.error('Failed to refresh stats:', err);
  }
};

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

  if (reportEmpty) reportEmpty.classList.add('hidden');
  if (reportOutput) reportOutput.classList.add('hidden');
  if (reportError) reportError.classList.add('hidden');
  if (reportLoading) reportLoading.classList.remove('hidden');

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
    const accountId = reportAccountSelect ? reportAccountSelect.value || null : null;
    const res = await fetch('/api/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, period })
    });
    const result = await res.json();

    clearInterval(loadingInterval);
    if (reportLoading) reportLoading.classList.add('hidden');

    if (result.success) {
      reportData = result;
      latestEvidenceGate = {
        date: result.date,
        period: result.period,
        evidenceByAccount: result.currentStats?.evidenceByAccount || {}
      };
      displayReport(result);
      renderMonthlyScores(result.monthlyScores || []);
      if (reportOutput) reportOutput.classList.remove('hidden');
    } else {
      showReportError(result.error || 'تعذر استخراج التقرير');
    }
  } catch (err) {
    clearInterval(loadingInterval);
    if (reportLoading) reportLoading.classList.add('hidden');
    showReportError(err.message || 'حدث خطأ في الاتصال بالخادم');
  } finally {
    periodButtons.forEach(b => b.disabled = false);
  }
};

function displayReport(result) {
  const reportText = document.getElementById('report-text');
  if (!reportText) return;
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
    const msgEl = document.getElementById('error-message');
    if (msgEl) msgEl.textContent = msg;
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

// ===== Server-Sent Events (SSE) Realtime Stream =====
let sseWasConnected = false;

function connectSSE() {
  const statusLabel = document.getElementById('sse-status-label');

  if (sseConnection) {
    sseConnection.close();
  }

  const token = localStorage.getItem('whatsi_auth_token') || '';
  if (!token) return;

  sseConnection = new EventSource(`/api/live-stream?token=${encodeURIComponent(token)}`);

  sseConnection.onopen = () => {
    if (statusLabel) statusLabel.textContent = 'مزامنة لحظية متصلة (Live Sync)';
    if (sseWasConnected) {
      console.log('[SSE] Reconnected – resyncing stats...');
      refreshLiveData();
      loadMonthlyScores();
    }
    sseWasConnected = true;
  };

  sseConnection.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'new_events') {
        refreshLiveData();
      }
    } catch (e) {
      console.error('SSE JSON error:', e);
    }
  };

  sseConnection.onerror = () => {
    if (statusLabel) statusLabel.textContent = 'إعادة الاتصال بالبث...';
  };
}

// ===== Periodic Sync Fallback =====
function startPeriodicSync() {
  setInterval(async () => {
    try {
      if (!sseConnection || sseConnection.readyState === EventSource.CLOSED) {
        console.log('[PeriodicSync] SSE is closed, refreshing stats...');
        await refreshLiveData();
      }
    } catch (e) {
      console.warn('[PeriodicSync] error:', e);
    }
  }, 90_000);
}

// ===== Entry Point =====
checkAuthAndInit();
