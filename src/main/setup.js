'use strict';
/** The school-address window: most schools use app.ilmoria.com; a school with its own address enters it here. */
const { BrowserWindow, ipcMain } = require('electron');
const store = require('../store');
const { state, actions } = require('./state');
const { page, preload, appIcon, origin, L } = require('./util');
const { setSignedIn } = require('./notify');
const { fetchJson, MANIFEST_APP } = require('./updates');

let setupWin = null;

function openSetup() {
  if (setupWin && !setupWin.isDestroyed()) return setupWin.focus();
  const parent = state.win && !state.win.isDestroyed() && state.win.isVisible() ? state.win : undefined;
  setupWin = new BrowserWindow({
    parent,
    modal: !!parent,
    width: 520,
    height: 440,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    title: L('schoolTitle'),
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    icon: appIcon(),
    webPreferences: { preload: preload('setup.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  setupWin.once('ready-to-show', () => setupWin?.show());
  setupWin.on('closed', () => {
    setupWin = null;
  });
  void setupWin.loadFile(page('setup.html'), { query: { lang: store.get().lang } });
}

ipcMain.handle('setup:current', (e) => (setupWin && e.sender === setupWin.webContents ? { server: origin(), fallback: store.DEFAULT_SERVER } : null));

ipcMain.handle('setup:save', async (e, input) => {
  if (!setupWin || e.sender !== setupWin.webContents) return { ok: false, error: 'closed' };
  let text = String(input || '').trim();
  if (!text) return { ok: false, error: 'empty' };
  if (!/^[a-z]+:\/\//i.test(text)) text = `https://${text}`;
  if (!store.validServer(text)) return { ok: false, error: 'invalid' };
  const next = new URL(text).origin;
  try {
    const res = await fetchJson(`${next}/desktop/latest.json`, 8000);
    if (!res || res.app !== MANIFEST_APP) return { ok: false, error: 'not-ilmoria' };
  } catch {
    return { ok: false, error: 'unreachable' };
  }
  store.set({ server: next });
  setSignedIn(false);
  // The bridge is handed to the new address only: a fresh main window
  const old = state.win;
  state.win = null;
  if (old && !old.isDestroyed()) {
    old.removeAllListeners('close');
    old.destroy();
  }
  actions.createMainWindow().once('ready-to-show', () => state.win?.show());
  setTimeout(() => setupWin && !setupWin.isDestroyed() && setupWin.close(), 50);
  return { ok: true };
});

module.exports = { openSetup };
