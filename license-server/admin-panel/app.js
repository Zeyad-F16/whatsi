/* ════════════════════════════════════════════════════
   Whatsi Admin Panel — App Logic
   ════════════════════════════════════════════════════ */

const API = '';   // Same origin — served by Express

let token = localStorage.getItem('whatsi_admin_token') || null;
let allClients = [];
let currentCodeClientId = null;
let pendingDeleteId = null;
let editingClientId = null;

/* ── On Load ─────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    showApp();
  } else {
    showLogin();
  }
  // Set today's date as default for start_date
  document.getElementById('f-start').value = new Date().toISOString().split('T')[0];
});

/* ── AUTH ────────────────────────────────────────── */
function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}
function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigate('dashboard');
}
function logout() {
  token = null;
  localStorage.removeItem('whatsi_admin_token');
  showLogin();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'جارٍ الدخول...';
  errEl.classList.add('hidden');

  try {
    const res = await apiFetch('/api/admin/login', 'POST', {
      username: document.getElementById('login-username').value,
      password: document.getElementById('login-password').value,
    }, false);
    token = res.token;
    localStorage.setItem('whatsi_admin_token', token);
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'خطأ في تسجيل الدخول';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'تسجيل الدخول';
  }
});

/* ── NAVIGATION ──────────────────────────────────── */
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  const titles = { dashboard: 'لوحة التحكم', clients: 'العملاء', logs: 'سجل الأنشطة' };
  document.getElementById('page-title').textContent = titles[page];

  const addBtn = document.getElementById('add-client-btn');
  addBtn.style.display = page === 'clients' ? 'inline-flex' : 'none';

  if (page === 'dashboard') loadDashboard();
  if (page === 'clients')   loadClients();
  if (page === 'logs')      loadAllLogs();

  return false;
}

/* ── API HELPER ──────────────────────────────────── */
async function apiFetch(url, method = 'GET', body = null, auth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) { logout(); return; }
    throw new Error(data.message || 'حدث خطأ ما');
  }
  return data;
}

/* ── DASHBOARD ───────────────────────────────────── */
async function loadDashboard() {
  try {
    const { data } = await apiFetch('/api/admin/stats');
    document.getElementById('stat-total').textContent   = data.total;
    document.getElementById('stat-active').textContent  = data.active;
    document.getElementById('stat-expired').textContent = data.expired;
    document.getElementById('stat-soon').textContent    = data.expiring_soon;
    document.getElementById('stat-revenue').textContent = `${Number(data.total_revenue).toLocaleString()} ج`;

    const logsEl = document.getElementById('recent-logs-list');
    if (!data.recent_logs.length) {
      logsEl.innerHTML = '<div class="empty-state">لا توجد أنشطة بعد</div>';
    } else {
      logsEl.innerHTML = data.recent_logs.map(renderLog).join('');
    }
  } catch (e) { showToast(e.message, 'error'); }
}

/* ── CLIENTS ─────────────────────────────────────── */
async function loadClients() {
  try {
    const { data } = await apiFetch('/api/admin/clients');
    allClients = data;
    renderClientsTable(allClients);
  } catch (e) { showToast(e.message, 'error'); }
}

function renderClientsTable(clients) {
  const tbody = document.getElementById('clients-tbody');
  if (!clients.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-state">لا يوجد عملاء بعد. أضف أول عميل!</td></tr>';
    return;
  }
  tbody.innerHTML = clients.map((c, i) => {
    const statusBadge = !c.is_active
      ? `<span class="badge badge-disabled">⛔ معطل</span>`
      : c.is_expired
        ? `<span class="badge badge-expired">⛔ منتهي</span>`
        : `<span class="badge badge-active">✅ نشط</span>`;
    const planBadge = c.plan_type === 'yearly'
      ? `<span class="badge badge-yearly">🌟 سنوي</span>`
      : `<span class="badge badge-monthly">📅 شهري</span>`;
    const daysLeft = c.is_expired ? '' : ` <small style="color:var(--text-dim)">(${c.days_remaining} يوم)</small>`;

    return `<tr>
      <td style="color:var(--text-dim)">${i + 1}</td>
      <td><strong>${escHtml(c.name)}</strong></td>
      <td>${c.phone ? `<a href="tel:${escHtml(c.phone)}" style="color:var(--info)">${escHtml(c.phone)}</a>` : '<span style="color:var(--text-dim)">—</span>'}</td>
      <td>${planBadge}</td>
      <td>${Number(c.amount_paid).toLocaleString()} ج</td>
      <td>
        <button class="icon-btn" title="عرض الكود" onclick="showCode(${c.id})">🔑 كود التفعيل</button>
      </td>
      <td>${c.expiry_date}${daysLeft}</td>
      <td>${statusBadge}</td>
      <td>
        <div class="action-btns">
          <button class="icon-btn" title="تعديل" onclick="openEditModal(${c.id})">✏️</button>
          <button class="icon-btn del" title="حذف" onclick="confirmDelete(${c.id})">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function filterClients() {
  const q = document.getElementById('client-search').value.trim().toLowerCase();
  if (!q) { renderClientsTable(allClients); return; }
  renderClientsTable(allClients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.phone && c.phone.toLowerCase().includes(q))
  ));
}

/* ── ADD / EDIT CLIENT MODAL ─────────────────────── */
function openAddModal() {
  editingClientId = null;
  document.getElementById('modal-title').textContent = 'إضافة عميل جديد';
  document.getElementById('save-btn').textContent = 'إضافة';
  document.getElementById('f-name').value    = '';
  document.getElementById('f-phone').value   = '';
  document.getElementById('f-plan').value    = 'monthly';
  document.getElementById('f-amount').value  = '';
  document.getElementById('f-start').value   = new Date().toISOString().split('T')[0];
  document.getElementById('f-notes').value   = '';
  document.getElementById('f-expiry-group').style.display = 'none';
  document.getElementById('f-active-group').style.display = 'none';
  document.getElementById('client-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  editingClientId = id;
  document.getElementById('modal-title').textContent = 'تعديل بيانات العميل';
  document.getElementById('save-btn').textContent = 'حفظ التعديلات';
  document.getElementById('f-name').value   = c.name;
  document.getElementById('f-phone').value  = c.phone || '';
  document.getElementById('f-plan').value   = c.plan_type;
  document.getElementById('f-amount').value = c.amount_paid;
  document.getElementById('f-start').value  = c.start_date;
  document.getElementById('f-expiry').value = c.expiry_date;
  document.getElementById('f-active').value = c.is_active ? '1' : '0';
  document.getElementById('f-notes').value  = c.notes || '';
  document.getElementById('f-expiry-group').style.display = 'flex';
  document.getElementById('f-active-group').style.display = 'flex';
  document.getElementById('client-modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('client-modal').classList.add('hidden');
}

async function saveClient(e) {
  e.preventDefault();
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = 'جارٍ الحفظ...';

  const payload = {
    name:       document.getElementById('f-name').value.trim(),
    phone:      document.getElementById('f-phone').value.trim() || null,
    plan_type:  document.getElementById('f-plan').value,
    amount_paid:parseFloat(document.getElementById('f-amount').value) || 0,
    start_date: document.getElementById('f-start').value,
    notes:      document.getElementById('f-notes').value.trim() || null,
  };

  if (editingClientId) {
    payload.expiry_date = document.getElementById('f-expiry').value || undefined;
    payload.is_active   = document.getElementById('f-active').value === '1';
  }

  try {
    if (editingClientId) {
      await apiFetch(`/api/admin/clients/${editingClientId}`, 'PUT', payload);
      showToast('تم تحديث بيانات العميل ✅', 'success');
    } else {
      await apiFetch('/api/admin/clients', 'POST', payload);
      showToast('تم إضافة العميل بنجاح ✅', 'success');
    }
    closeModal();
    loadClients();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = prevText;
  }
}

/* ── ACTIVATION CODE MODAL ───────────────────────── */
function showCode(id) {
  const c = allClients.find(x => x.id === id);
  if (!c) return;
  currentCodeClientId = id;
  document.getElementById('code-value').textContent = c.activation_code;
  const statusEl = document.getElementById('code-status');
  if (c.code_used) {
    statusEl.innerHTML = `<span style="color:var(--warning)">⚠️ هذا الكود تم استخدامه مسبقاً</span><br>
      <span style="color:var(--text-dim); font-size:.78rem">معرف الجهاز: ${c.machine_id || '—'}</span>`;
  } else {
    statusEl.innerHTML = `<span style="color:var(--accent)">✅ الكود لم يُستخدم بعد</span>`;
  }
  document.getElementById('code-modal').classList.remove('hidden');
}
function closeCodeModal() {
  document.getElementById('code-modal').classList.add('hidden');
}
function copyCode() {
  const code = document.getElementById('code-value').textContent;
  navigator.clipboard.writeText(code).then(() => showToast('تم نسخ الكود 📋', 'success'));
}
async function regenerateCode() {
  if (!currentCodeClientId) return;
  if (!confirm('سيتم إلغاء الكود القديم وإنشاء كود جديد. العميل سيحتاج لتفعيل جديد. هل أنت متأكد؟')) return;
  try {
    const res = await apiFetch(`/api/admin/clients/${currentCodeClientId}/regenerate-code`, 'POST');
    document.getElementById('code-value').textContent = res.activation_code;
    document.getElementById('code-status').innerHTML = `<span style="color:var(--accent)">✅ كود جديد تم إنشاؤه</span>`;
    showToast('تم إنشاء كود جديد ✅', 'success');
    loadClients();
  } catch (err) { showToast(err.message, 'error'); }
}

/* ── DELETE CONFIRM ──────────────────────────────── */
function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById('confirm-modal').classList.remove('hidden');
}
function closeConfirm() {
  pendingDeleteId = null;
  document.getElementById('confirm-modal').classList.add('hidden');
}
document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  try {
    await apiFetch(`/api/admin/clients/${pendingDeleteId}`, 'DELETE');
    showToast('تم حذف العميل ✅', 'success');
    closeConfirm();
    loadClients();
  } catch (err) { showToast(err.message, 'error'); }
});

/* ── ALL LOGS ─────────────────────────────────────── */
async function loadAllLogs() {
  const el = document.getElementById('all-logs-list');
  el.innerHTML = '<div class="empty-state">جارٍ التحميل...</div>';
  try {
    const { data } = await apiFetch('/api/admin/stats');
    // We'll use recent_logs from stats but fetch more from all clients
    if (!data.recent_logs.length) {
      el.innerHTML = '<div class="empty-state">لا توجد أنشطة بعد</div>';
    } else {
      el.innerHTML = data.recent_logs.map(renderLog).join('');
    }
  } catch (e) { el.innerHTML = `<div class="empty-state">${e.message}</div>`; }
}

/* ── LOG RENDERER ────────────────────────────────── */
function renderLog(log) {
  const actionMap = {
    ACTIVATED:                  { label: 'تم التفعيل',           dot: 'ok' },
    ACTIVATE_FAILED_INVALID_CODE:{ label: 'كود خاطئ',            dot: 'error' },
    ACTIVATE_FAILED_CODE_USED:  { label: 'كود مستخدم مسبقاً',    dot: 'warn' },
    VERIFY_OK:                  { label: 'تحقق ناجح',             dot: 'ok' },
    VERIFY_EXPIRED:             { label: 'اشتراك منتهي',          dot: 'error' },
    CODE_REGENERATED:           { label: 'تجديد كود التفعيل',     dot: 'info' },
  };
  const info = actionMap[log.action] || { label: log.action, dot: 'info' };
  const clientPart = log.client_name ? `<b>${escHtml(log.client_name)}</b> — ` : '';
  const ipPart = log.ip_address ? `IP: ${escHtml(log.ip_address)}` : '';

  return `<div class="log-item">
    <div class="log-dot ${info.dot}"></div>
    <div class="log-body">
      <div class="log-action">${info.label}</div>
      <div class="log-meta">${clientPart}${ipPart}</div>
    </div>
    <div class="log-time">${formatDate(log.created_at)}</div>
  </div>`;
}

/* ── UTILS ───────────────────────────────────────── */
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// Close modals on overlay click
document.getElementById('client-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('code-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeCodeModal();
});
document.getElementById('confirm-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeConfirm();
});
