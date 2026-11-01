'use strict';
/** The tray icon (Windows) or menu-bar icon (macOS): open, notification choices, sound, start with the computer, quit. */
const { app, Menu, Tray, shell } = require('electron');
const store = require('../store');
const { state, actions } = require('./state');
const { APP_NAME, isMac, L } = require('./util');
const { trayImage } = require('./notify');

function createTray() {
  try {
    state.tray = new Tray(trayImage(false));
  } catch {
    state.tray = null;
    return;
  }
  state.tray.setToolTip(APP_NAME);
  if (!isMac) state.tray.on('click', () => actions.showWindow());
  rebuildTray();
}

function setPrefs(patch) {
  store.setPrefs(patch);
  applyLoginItem();
  rebuildTray();
}

function rebuildTray() {
  const { tray, update, signedIn } = state;
  if (!tray) return;
  const prefs = store.get().prefs;
  const level = (value, label) => ({ label, type: 'radio', checked: prefs.notify === value, click: () => setPrefs({ notify: value }) });
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: L('open'), click: () => actions.showWindow() },
      ...(update?.ready
        ? [{ label: L('restartToUpdate', { v: update.version }), click: () => actions.installUpdate() }]
        : update?.url
          ? [{ label: L('downloadVersion', { v: update.version }), click: () => void shell.openExternal(update.url) }]
          : []),
      { type: 'separator' },
      { label: L('notifications'), submenu: [level('all', L('notifyAll')), level('direct', L('notifyDirect')), level('none', L('notifyNone'))] },
      { label: L('sound'), type: 'checkbox', checked: prefs.sound, click: (item) => setPrefs({ sound: item.checked }) },
      ...(app.isPackaged && !process.windowsStore ? [{ label: L('openAtLogin'), type: 'checkbox', checked: prefs.openAtLogin, click: (item) => setPrefs({ openAtLogin: item.checked }) }] : []),
      { label: L('settings'), enabled: signedIn, click: () => actions.openSettings() },
      { type: 'separator' },
      { label: L('quit'), click: () => actions.quit() },
    ]),
  );
}

/** Starting with the computer (hidden in the tray when it does) */
function applyLoginItem() {
  // (The Store's copy starts with Windows from Windows' own Startup apps settings)
  if (!app.isPackaged || process.windowsStore) return;
  const on = store.get().prefs.openAtLogin;
  try {
    if (isMac) app.setLoginItemSettings({ openAtLogin: on, openAsHidden: true });
    else app.setLoginItemSettings({ openAtLogin: on, args: ['--hidden'] });
  } catch {
    /* not allowed here */
  }
}

module.exports = { createTray, rebuildTray, applyLoginItem };
