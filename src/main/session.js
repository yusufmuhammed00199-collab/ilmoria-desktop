'use strict';
/**
 * The signed-in browsing session the app's windows share: which permissions
 * the school's pages get (camera and microphone for calls and exams,
 * notifications, full screen, the clipboard), screen sharing through a
 * picker, downloads to the Downloads folder, and the app's name in the user
 * agent (the server keeps demo sign-up to the website by it).
 */
const { app, BrowserWindow, desktopCapturer, ipcMain, session, shell, systemPreferences } = require('electron');
const fs = require('fs');
const path = require('path');
const store = require('../store');
const { state } = require('./state');
const { PARTITION, isMac, isWin, isServer, page, preload, appIcon, L } = require('./util');
const { showNote } = require('./notify');

const ALLOWED = new Set(['notifications', 'fullscreen', 'clipboard-sanitized-write', 'clipboard-read', 'speaker-selection', 'display-capture', 'window-management']);
let pickerOpen = false;

function setupSession() {
  const ses = session.fromPartition(PARTITION);
  ses.setUserAgent(`${ses.getUserAgent()} IlmoriaDesktop/${app.getVersion()}`);

  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = details?.requestingUrl || wc.getURL();
    if (!isServer(url)) return callback(false);
    if (permission === 'media') {
      if (!isMac) return callback(true);
      const types = details?.mediaTypes || [];
      (async () => {
        let ok = true;
        if (types.includes('audio')) ok = (await systemPreferences.askForMediaAccess('microphone')) && ok;
        if (types.includes('video')) ok = (await systemPreferences.askForMediaAccess('camera')) && ok;
        callback(ok);
      })().catch(() => callback(false));
      return;
    }
    callback(ALLOWED.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission, requestingOrigin) => isServer(requestingOrigin) && (permission === 'media' || ALLOWED.has(permission)));

  ses.setDisplayMediaRequestHandler((request, callback) => {
    if (!isServer(request.frame?.url || request.securityOrigin || '') || pickerOpen) return callback(null);
    pickSource()
      .then((source) => {
        if (!source) return callback(null);
        callback(isWin && request.audioRequested ? { video: source, audio: 'loopback' } : { video: source });
      })
      .catch(() => callback(null));
  });

  ses.on('will-download', (_e, item) => {
    item.setSavePath(uniquePath(app.getPath('downloads'), item.getFilename() || 'download'));
    item.once('done', (_ev, done) => {
      if (done !== 'completed') return;
      const saved = item.getSavePath();
      showNote({ id: `dl:${saved}`, title: L('downloaded'), body: path.basename(saved), onClick: () => shell.showItemInFolder(saved) });
    });
  });
  return ses;
}

function uniquePath(dir, name) {
  const clean = name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 180) || 'download';
  const ext = path.extname(clean);
  const base = clean.slice(0, clean.length - ext.length);
  let candidate = path.join(dir, clean);
  for (let i = 1; fs.existsSync(candidate) && i < 500; i++) candidate = path.join(dir, `${base} (${i})${ext}`);
  return candidate;
}

/** The screen-sharing picker: every screen and window, with a picture of each */
function pickSource() {
  return new Promise((resolve) => {
    pickerOpen = true;
    let settled = false;
    let sources = [];
    const parent = state.win && !state.win.isDestroyed() && state.win.isVisible() ? state.win : undefined;
    const picker = new BrowserWindow({
      parent,
      modal: !!parent,
      width: 760,
      height: 560,
      minWidth: 520,
      minHeight: 420,
      show: false,
      title: L('shareTitle'),
      backgroundColor: '#ffffff',
      autoHideMenuBar: true,
      minimizable: false,
      maximizable: false,
      icon: appIcon(),
      webPreferences: { preload: preload('picker.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    const finish = (source) => {
      if (settled) return;
      settled = true;
      pickerOpen = false;
      ipcMain.removeHandler('picker:sources');
      ipcMain.removeAllListeners('picker:choose');
      if (!picker.isDestroyed()) picker.close();
      resolve(source || null);
    };
    ipcMain.handle('picker:sources', async (e) => {
      if (e.sender !== picker.webContents) return [];
      sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 200 }, fetchWindowIcons: true });
      return sources.map((s) => ({
        id: s.id,
        name: s.name,
        kind: s.id.startsWith('screen:') ? 'screen' : 'window',
        thumb: s.thumbnail && !s.thumbnail.isEmpty() ? s.thumbnail.toDataURL() : '',
        icon: s.appIcon && !s.appIcon.isEmpty() ? s.appIcon.toDataURL() : '',
      }));
    });
    ipcMain.on('picker:choose', (e, id) => {
      if (e.sender === picker.webContents) finish(sources.find((s) => s.id === id) || null);
    });
    picker.on('closed', () => finish(null));
    picker.once('ready-to-show', () => picker.show());
    void picker.loadFile(page('picker.html'), { query: { mac: isMac ? '1' : '0', lang: store.get().lang } });
  });
}

module.exports = { setupSession };
