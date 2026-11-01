'use strict';
/**
 * The opening animation, full screen: the Ilmoria emblem assembles in 3D while the school's site
 * loads out of sight. One thing at a time: the animation plays to its end and fades away, and
 * only then is the app there, already loaded (it waits behind the animation until the page says
 * it's ready, or a moment after it has loaded).
 */
const { BrowserWindow, app, screen } = require('electron');
const store = require('../store');
const { isMac, page, preload, origin } = require('./util');

const MIN_MS = 3000;
const MAX_WAIT_MS = 15_000;
let splash = null;
let shownAt = 0;

/** The screen the app will open on */
function targetDisplay() {
  const b = store.get().bounds;
  try {
    return b ? screen.getDisplayMatching(b) : screen.getPrimaryDisplay();
  } catch {
    return screen.getPrimaryDisplay();
  }
}

function openSplash() {
  const { bounds } = targetDisplay();
  splash = new BrowserWindow({
    ...bounds,
    frame: false,
    resizable: false,
    movable: false,
    maximizable: false,
    minimizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    show: false,
    backgroundColor: '#0f1b33',
    title: 'Ilmoria',
    webPreferences: { preload: preload('splash.js'), sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  splash.once('ready-to-show', () => {
    if (!splash) return;
    // Full screen once its first frame is drawn (set earlier, some systems show the window blank and white)
    // Windows and Linux: true full screen, over the taskbar; macOS: simple full screen (no Space animation)
    if (isMac) splash.setSimpleFullScreen(true);
    else splash.setFullScreen(true);
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

/** Fades the splash window out (window opacity: Windows and macOS; elsewhere it just closes) */
async function fadeOut(w, ms = 420) {
  const steps = 14;
  for (let i = 1; i <= steps && !w.isDestroyed(); i++) {
    try {
      w.setOpacity(1 - i / steps);
    } catch {
      break;
    }
    await sleep(ms / steps);
  }
}

/**
 * Shows the app once the splash has finished. The page tells the app it's ready ('app-ready',
 * sent by the site through the bridge once it has drawn the sign-in page or the dashboard); a
 * site without that signal counts as ready shortly after it loads.
 */
function revealWhenReady(win) {
  let revealed = false;
  let pageReady = false;
  const reveal = async () => {
    if (revealed || win.isDestroyed()) return;
    revealed = true;
    if (!splash || splash.isDestroyed()) {
      win.show();
      return;
    }
    // Let the animation play to its end
    const left = MIN_MS - (Date.now() - (shownAt || Date.now()));
    if (left > 0) await sleep(left);
    // 1. The emblem flies away (the splash still covers the screen)
    if (splash && !splash.isDestroyed()) splash.webContents.send('splash:leave');
    await sleep(480);
    // 2. The app takes its place underneath, out of sight, without taking the focus yet
    if (!win.isDestroyed()) win.showInactive();
    await sleep(300);
    // 3. The splash fades away, and the app is there
    if (splash && !splash.isDestroyed()) {
      await fadeOut(splash);
      splash.destroy();
    }
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
    }
  };
  const ready = () => {
    if (pageReady) return;
    pageReady = true;
    void reveal();
  };
  win.webContents.ipc.on('app-ready', ready);
  // Sites from before the signal: a moment after the page has loaded
  win.webContents.once('did-finish-load', () => setTimeout(ready, 2500));
  setTimeout(() => void reveal(), MAX_WAIT_MS);
}

module.exports = { openSplash, revealWhenReady };
