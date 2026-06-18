const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'whatsi.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this example
      webviewTag: true // CRITICAL: This enables the <webview> tag
    }
  });

  // Load the UI
  mainWindow.loadFile('index.html');
  
  // mainWindow.webContents.openDevTools();
}

// Ignore certificate errors if any
app.commandLine.appendSwitch('ignore-certificate-errors');

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
