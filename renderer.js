const addBtn = document.getElementById('add-account-btn');
const tabList = document.getElementById('tab-list');
const webviewContainer = document.getElementById('webview-container');
const welcomeScreen = document.getElementById('welcome-screen');

// Modal Elements
const modal = document.getElementById('name-modal');
const modalTitle = document.getElementById('modal-title');
const nameInput = document.getElementById('account-name-input');
const cancelBtn = document.getElementById('cancel-name-btn');
const saveBtn = document.getElementById('save-name-btn');

// State
let accounts = JSON.parse(localStorage.getItem('whatsi_accounts')) || [];
let editingAccountId = null;

function init() {
  if (accounts.length > 0) {
    accounts.forEach(acc => {
      createTab(acc.id, acc.name);
      createWebview(acc.id);
    });
    // Switch to the first account by default
    switchToAccount(accounts[0].id);
  }
}

// Show modal when clicking Add Account
addBtn.addEventListener('click', () => {
  editingAccountId = null;
  modalTitle.innerText = 'إضافة حساب جديد';
  saveBtn.innerText = 'حفظ وإضافة';
  nameInput.value = '';
  modal.classList.remove('hidden');
  nameInput.focus();
});

// Hide modal on Cancel
cancelBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// Save account on Save
saveBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    alert('يجب إدخال اسم للحساب!');
    return;
  }
  
  if (editingAccountId) {
    // Edit existing
    const acc = accounts.find(a => a.id === editingAccountId);
    if (acc) {
      acc.name = name;
      document.getElementById(`tab-name-${editingAccountId}`).innerText = name;
    }
  } else {
    // Add new
    const accountId = `account-${Date.now()}`;
    const newAccount = { id: accountId, name: name };
    accounts.push(newAccount);
    createTab(accountId, name);
    createWebview(accountId);
    switchToAccount(accountId);
  }
  
  localStorage.setItem('whatsi_accounts', JSON.stringify(accounts));
  modal.classList.add('hidden');
});

// Allow hitting Enter to save
nameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') saveBtn.click();
});

function createTab(id, name) {
  const li = document.createElement('li');
  li.className = 'tab-item';
  li.id = `tab-${id}`;
  
  li.innerHTML = `
    <div class="tab-icon">💬</div>
    <span id="tab-name-${id}" class="tab-name-text">${name}</span>
    <div class="tab-actions">
      <button class="tab-action-btn edit" title="تعديل" onclick="editAccount(event, '${id}')">✏️</button>
      <button class="tab-action-btn delete" title="حذف" onclick="deleteAccount(event, '${id}')">🗑️</button>
    </div>
  `;
  
  li.addEventListener('click', () => switchToAccount(id));
  tabList.appendChild(li);
}

// Global functions for inline onclick handlers
window.editAccount = (event, id) => {
  event.stopPropagation(); // Prevent tab switch
  const acc = accounts.find(a => a.id === id);
  if (!acc) return;
  
  editingAccountId = id;
  modalTitle.innerText = 'تعديل اسم الحساب';
  saveBtn.innerText = 'حفظ التعديلات';
  nameInput.value = acc.name;
  modal.classList.remove('hidden');
  nameInput.focus();
};

window.deleteAccount = (event, id) => {
  event.stopPropagation(); // Prevent tab switch
  if (!confirm('هل أنت متأكد أنك تريد حذف هذا الحساب؟')) return;
  
  // Remove from state and storage
  accounts = accounts.filter(a => a.id !== id);
  localStorage.setItem('whatsi_accounts', JSON.stringify(accounts));
  
  // Remove DOM elements
  const tab = document.getElementById(`tab-${id}`);
  const webview = document.getElementById(`webview-${id}`);
  if (tab) tab.remove();
  if (webview) webview.remove();
  
  // Switch to another tab or welcome screen if none
  if (accounts.length > 0) {
    switchToAccount(accounts[0].id);
  } else {
    welcomeScreen.classList.remove('hidden');
  }
};

function createWebview(id) {
  const webview = document.createElement('webview');
  webview.id = `webview-${id}`;
  webview.setAttribute('partition', `persist:${id}`);
  webview.setAttribute('src', 'https://web.whatsapp.com');
  webview.setAttribute('useragent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  webviewContainer.appendChild(webview);
}

function switchToAccount(id) {
  welcomeScreen.classList.add('hidden');
  
  // Deactivate all
  document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('webview').forEach(el => el.classList.remove('active'));
  
  // Activate target
  const tab = document.getElementById(`tab-${id}`);
  const view = document.getElementById(`webview-${id}`);
  
  if (tab) tab.classList.add('active');
  if (view) view.classList.add('active');
}

// Run initialization on load
init();
