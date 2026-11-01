'use strict';
/** What the school's page may ask of the app (each message is checked to come from the school's own page). */
const { ipcMain, shell } = require('electron');
const store = require('../store');
const { state, actions } = require('./state');
const { fromServer, safePath } = require('./util');
const { showNote, clearNote, setUnread, setSignedIn, attention } = require('./notify');
const { applyLoginItem } = require('./tray');

ipcMain.on('notify', (e, n) => {
  if (!fromServer(e) || !n) return;
  const target = safePath(n.path);
  showNote({
    id: String(n.id).slice(0, 120),
    title: n.title,
    body: n.body,
    silent: n.silent,
    urgent: n.kind === 'call',
    onClick: () => target && state.win?.webContents.send('navigate', target),
  });
});

ipcMain.on('notify-clear', (e, id) => {
  if (fromServer(e)) clearNote(id);
});

ipcMain.on('badge', (e, n) => {
  if (fromServer(e)) setUnread(n);
});

ipcMain.on('attention', (e, kind) => {
  if (fromServer(e)) attention(kind === 'call' ? 'call' : 'message');
});

ipcMain.on('signed-in', (e, on) => {
  if (fromServer(e)) setSignedIn(!!on);
});

ipcMain.on('language', (e, lang) => {
  if (!fromServer(e)) return;
  const next = lang === 'ar' ? 'ar' : 'en';
  if (store.get().lang === next) return;
  store.set({ lang: next });
  actions.buildMenu();
  actions.rebuildTray();
  setUnread(state.unread);
});

ipcMain.handle('prefs:get', (e) => (fromServer(e) ? store.get().prefs : null));
ipcMain.handle('prefs:set', (e, patch) => {
  if (!fromServer(e)) return null;
  const before = store.get().prefs;
  const next = store.setPrefs(patch);
  if (before.openAtLogin !== next.openAtLogin) applyLoginItem();
  actions.rebuildTray();
  return next;
});

ipcMain.on('open-external', (e, url) => {
  if (!fromServer(e)) return;
  try {
    const u = new URL(url);
    if (['https:', 'http:', 'mailto:'].includes(u.protocol)) void shell.openExternal(u.toString());
  } catch {
    /* not a link */
  }
});

ipcMain.on('change-school', (e) => {
  if (fromServer(e)) actions.openSetup();
});

ipcMain.handle('update:check', async (e) => (fromServer(e) ? actions.checkUpdate(true) : null));
ipcMain.on('update:install', (e) => {
  if (fromServer(e)) actions.installUpdate();
});
