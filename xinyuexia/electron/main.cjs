const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DEV_URL = process.env.XINYUEXIA_URL || 'http://127.0.0.1:18328/#/dashboard';
const DIST_ENTRY = path.join(__dirname, '..', 'dist', 'index.html');
const APP_NAME = '新月下写作';
const USER_DATA_NAME = process.env.XINYUEXIA_LOAD_DIST === '1' || app.isPackaged
  ? 'xinyuexia-desktop'
  : 'xinyuexia-desktop-dev';

let mainWindow = null;

app.setName(APP_NAME);
app.setPath('userData', path.join(app.getPath('appData'), USER_DATA_NAME));
app.setPath('sessionData', path.join(app.getPath('appData'), `${USER_DATA_NAME}-session`));

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

function resolveStartUrl() {
  if (process.env.XINYUEXIA_LOAD_DIST === '1' || app.isPackaged) {
    return `${pathToFileURL(DIST_ENTRY).href}#/dashboard`;
  }
  return DEV_URL;
}

function focusMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow();
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1100,
    minHeight: 680,
    title: APP_NAME,
    backgroundColor: '#f9fafb',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    focusMainWindow();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(resolveStartUrl()).catch(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.loadURL('data:text/html;charset=utf-8,<html><body style="font-family:Segoe UI;padding:24px;"><h2>启动失败</h2><p>请确认开发服务器或 dist 文件已准备好。</p></body></html>');
    mainWindow.show();
    mainWindow.focus();
  });

  return mainWindow;
}

app.on('second-instance', () => {
  focusMainWindow();
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      return;
    }
    focusMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
