'use strict';
/**
 * The opening animation: a small frameless window with the Ilmoria emblem
 * assembling in 3D while the school's site loads behind it. It stays at
 * least long enough to play, then flies away as the main window appears.
 */
const { BrowserWindow, app } = require('electron');
const store = require('../store');
const { isMac, page, preload, origin } = require('./util');

const MIN_MS = 2800;
const MAX_WAIT_MS = 15_000;
let splash = null;
let shownAt = 0;

function openSplash() {
  splash = new BrowserWindow({
    width: 760,
    height: 480,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    center: true,
    show: false,
    hasShadow: isMac,
    backgroundColor: '#00000000',
    title: 'Ilmoria',
    webPreferences: { preload: preload('splash.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  splash.once('ready-to-show', () => {
    if (!splash) return;
    splash.show();
    shownAt = Date.now();
  });
  splash.on('closed', () => {
    splash = null;
  });
  let host = '';
  try {
    host = new URL(origin()).host;
  } catch {
    /* none */
  }
  void splash.loadFile(page('splash.html'), { query: { lang: store.get().lang, host, v: app.getVersion() } });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Shows the main window once it is ready (or after a while regardless), with the splash flying off over it */
function revealWhenReady(win) {
  let revealed = false;
  const reveal = async () => {
    if (revealed || win.isDestroyed()) return;
    revealed = true;
    if (!splash) {
      win.show();
      return;
    }
    const left = MIN_MS - (Date.now() - (shownAt || Date.now()));
    if (left > 0) await sleep(left);
    if (splash && !splash.isDestroyed()) splash.webContents.send('splash:leave');
    await sleep(260);
    if (!win.isDestroyed()) win.show();
    await sleep(320);
    if (splash && !splash.isDestroyed()) splash.destroy();
  };
  win.once('ready-to-show', () => void reveal());
  setTimeout(() => void reveal(), MAX_WAIT_MS);
}

module.exports = { openSplash, revealWhenReady };
