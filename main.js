// main.js
const path = require('path');
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false,
    },
    show: false
  });

  win.loadFile('index.html');
  win.once('ready-to-show', () => win.show());
  // Optionally remove menu:
  win.removeMenu();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS keep app open until user quits explicitly
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
