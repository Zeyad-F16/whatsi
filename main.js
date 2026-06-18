const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');

// ── Config ────────────────────────────────────────────
// IMPORTANT: Replace with your actual VPS URL after deployment
const LICENSE_SERVER_URL = 'http://localhost:3001';
const LICENSE_FILE = path.join(app.getPath('userData'), 'license.json');

// ── Machine ID ────────────────────────────────────────
function getMachineId() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    os.networkInterfaces()
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 32);
}

// ── License Storage ────────────────────────────────────
function saveLicense(data) {
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2));
}
function loadLicense() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      return JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

// ── Windows storage ────────────────────────────────────
let mainWindow, activationWindow, expiredWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'whatsi.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    }
  });
  mainWindow.loadFile('index.html');
}

function createActivationWindow() {
  activationWindow = new BrowserWindow({
    width: 520,
    height: 560,
    resizable: false,
    icon: path.join(__dirname, 'whatsi.png'),
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  activationWindow.loadFile('activation.html');
  activationWindow.setMenuBarVisibility(false);
}

function createExpiredWindow() {
  expiredWindow = new BrowserWindow({
    width: 520,
    height: 480,
    resizable: false,
    icon: path.join(__dirname, 'whatsi.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  expiredWindow.loadFile('expired.html');
  expiredWindow.setMenuBarVisibility(false);
}

// ── License Check ──────────────────────────────────────
async function checkLicense() {
  const machineId = getMachineId();
  const license = loadLicense();

  // If no local license, show activation screen
  if (!license || !license.activated) {
    return { status: 'needs_activation', machineId };
  }

  // Verify with server
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${LICENSE_SERVER_URL}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await response.json();

    if (!response.ok) {
      if (data.expired) return { status: 'expired', data };
      if (data.needs_activation) return { status: 'needs_activation', machineId };
      return { status: 'error', message: data.message };
    }

    // Update local license data
    saveLicense({ activated: true, machineId, ...data.license });
    return { status: 'ok', data };

  } catch (err) {
    // If server unreachable but we have a valid local cached license, allow offline use
    // but only if expiry_date hasn't passed
    if (license && license.expiry_date) {
      const today = new Date().toISOString().split('T')[0];
      if (today <= license.expiry_date) {
        return { status: 'ok_offline', data: license };
      } else {
        return { status: 'expired', data: license };
      }
    }
    return { status: 'server_unreachable', message: err.message };
  }
}

// ── IPC: Activate License ──────────────────────────────
ipcMain.handle('activate-license', async (event, code) => {
  const machineId = getMachineId();
  try {
    const response = await fetch(`${LICENSE_SERVER_URL}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activation_code: code.trim().toUpperCase(), machine_id: machineId }),
    });
    const data = await response.json();
    if (data.success) {
      saveLicense({ activated: true, machineId, ...data.license });
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (err) {
    return { success: false, message: 'تعذر الاتصال بالخادم. تأكد من الاتصال بالإنترنت.' };
  }
});

// ── IPC: Activation Success → open main window ────────
ipcMain.on('activation-success', () => {
  if (activationWindow) activationWindow.close();
  createMainWindow();
});

// ── App Ready ──────────────────────────────────────────
app.commandLine.appendSwitch('ignore-certificate-errors');

app.whenReady().then(async () => {
  const result = await checkLicense();

  if (result.status === 'ok' || result.status === 'ok_offline') {
    createMainWindow();
  } else if (result.status === 'expired') {
    createExpiredWindow();
  } else if (result.status === 'needs_activation') {
    createActivationWindow();
  } else {
    // Server error or other — show activation just in case
    createActivationWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Handle quit request from expired screen
ipcMain.on('quit-app', () => {
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
