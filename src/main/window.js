'use strict';
/**
 * The main window (the school's Ilmoria, every page of it) and the windows it
 * opens: the school's files and pages opened "in a new tab" get a plain
 * window of their own, signed in like the app; other sites open in the
 * browser. Closing the main window keeps the app running in the tray (or the
 * Dock) so messages and calls still arrive.
 */
const { app, BrowserWindow, Menu, clipboard, screen, shell } = require('electron');
const store = require('../store');
const { state, actions } = require('./state');
const { APP_NAME, PARTITION, START_PATH, isMac, isWin, isServer, safePath, origin, page, preload, appIcon, debounce, L } = require('./util');
const { showNote, setSignedIn } = require('./notify');

function visibleBounds(b) {
  if (!b || typeof b.width !== 'number') return { width: 1280, height: 840 };
  const fits = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return b.x + 80 < a.x + a.width && b.x + b.width - 80 > a.x && b.y >= a.y - 10 && b.y + 40 < a.y + a.height;
  });
  const size = { width: Math.max(480, Math.min(b.width, 4000)), height: Math.max(560, Math.min(b.height, 3000)) };
  return fits ? { ...size, x: b.x, y: b.y } : size;
}

/** Opens a link the way the app should: the school's files and pages in a window of the app, the rest in the browser */
function openOutside(url) {
  if (isServer(url)) return openViewer(url);
  if (/^(https?:|mailto:|tel:)/i.test(url)) void shell.openExternal(url);
}

/** A plain window of the app (no bridge to the app: notifications stay with the main window) */
const viewerOptions = () => ({
  width: 1060,
  height: 780,
  minWidth: 420,
  minHeight: 360,
  title: APP_NAME,
  autoHideMenuBar: true,
  backgroundColor: '#ffffff',
  icon: appIcon(),
  webPreferences: { partition: PARTITION, preload: preload('none.js'), sandbox: true, contextIsolation: true, nodeIntegration: false, plugins: true, spellcheck: true },
});

function guardViewer(child) {
  const wc = child.webContents;
  wc.on('will-navigate', (e, to) => {
    if (!isServer(to) && !to.startsWith('blob:')) {
      e.preventDefault();
      openOutside(to);
    }
  });
  wc.setWindowOpenHandler(({ url }) => {
    openOutside(url);
    return { action: 'deny' };
  });
  wc.on('context-menu', (_e, params) => contextMenu(params, child));
  // A file the window can't show downloads instead: close the window it would have shown in
  let shown = false;
  wc.once('dom-ready', () => {
    shown = true;
  });
  const ses = wc.session;
  const onDownload = (_e, _item, from) => {
    if (from === wc && !shown) setTimeout(() => !child.isDestroyed() && child.close(), 300);
  };
  ses.on('will-download', onDownload);
  child.on('closed', () => ses.removeListener('will-download', onDownload));
}

function openViewer(url) {
  const child = new BrowserWindow(viewerOptions());
  guardViewer(child);
  void child.loadURL(url);
  return child;
}

function createMainWindow() {
  const saved = store.get();
  const win = new BrowserWindow({
    ...visibleBounds(saved.bounds),
    minWidth: 480,
    minHeight: 560,
    show: false,
    title: APP_NAME,
    backgroundColor: '#F2F5F8',
    icon: appIcon(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preload('app.js'),
      partition: PARTITION,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      additionalArguments: [`--ilmoria-server=${origin()}`, `--ilmoria-version=${app.getVersion()}`],
    },
  });
  state.win = win;
  if (saved.maximized) win.maximize();
  win.on('page-title-updated', (e) => {
    e.preventDefault();
    win.setTitle(state.unread ? `${APP_NAME} (${state.unread})` : APP_NAME);
  });

  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    // The school's pages and files "in a new tab", and pictures or PDFs the page made: a window of the app
    if (isServer(url) || url.startsWith(`blob:${origin()}`)) {
      return { action: 'allow', overrideBrowserWindowOptions: viewerOptions() };
    }
    openOutside(url);
    return { action: 'deny' };
  });
  wc.on('did-create-window', (child) => guardViewer(child));
  wc.on('will-navigate', (e, url) => {
    if (url.startsWith('file:')) return;
    if (!isServer(url)) {
      e.preventDefault();
      openOutside(url);
    } else if (new URL(url).pathname.startsWith('/files/')) {
      e.preventDefault();
      openViewer(url);
    }
  });
  wc.on('will-redirect', (e, url) => {
    if (!isServer(url) && !url.startsWith('file:')) {
      e.preventDefault();
      openOutside(url);
    }
  });
  wc.on('did-fail-load', (_e, code, _desc, url, isMainFrame) => {
    // -3: replaced by another load. Anything else on the main page: the offline page, which tries again
    if (!isMainFrame || code === -3 || !isServer(url)) return;
    void win.loadFile(page('offline.html'), { query: { to: url, lang: store.get().lang } });
  });
  wc.on('render-process-gone', (_e, details) => {
    if (details.reason !== 'clean-exit') setTimeout(() => loadApp(), 1500);
  });
  wc.on('did-finish-load', () => {
    sendState();
    const p = safePath(state.pendingPath);
    if (p && isServer(wc.getURL())) {
      state.pendingPath = null;
      setTimeout(() => wc.send('navigate', p), 1200);
    }
  });
  // Signed out: no badge, no count in the tray
  const watchSignOut = (_e, url) => {
    if (isServer(url) && /^\/(login|s\/|account\/login)/.test(new URL(url).pathname)) setSignedIn(false);
  };
  wc.on('did-navigate-in-page', watchSignOut);
  wc.on('did-navigate', watchSignOut);
  wc.on('context-menu', (_e, params) => contextMenu(params, win));
  wc.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F5') wc.reload();
  });

  // The page knows whether it is in front (new things then show on the page, not as notifications)
  const sendState = () => {
    if (!win.isDestroyed()) wc.send('window-state', { focused: win.isFocused(), visible: win.isVisible() && !win.isMinimized() });
  };
  for (const ev of ['focus', 'blur', 'show', 'hide', 'minimize', 'restore']) win.on(ev, sendState);
  win.on('focus', () => {
    if (!isMac) win.flashFrame(false);
  });

  const saveBounds = debounce(() => {
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
    store.set({ maximized: win.isMaximized(), ...(win.isMaximized() ? {} : { bounds: win.getBounds() }) });
  }, 600);
  win.on('resize', saveBounds);
  win.on('move', saveBounds);
  win.on('session-end', () => {
    state.quitting = true;
  });
  win.on('close', (e) => {
    if (state.quitting) return;
    if (!store.get().prefs.closeToTray) {
      state.quitting = true;
      app.quit();
      return;
    }
    e.preventDefault();
    if (win.isFullScreen()) {
      win.once('leave-full-screen', () => win.hide());
      win.setFullScreen(false);
    } else {
      win.hide();
    }
    if (isWin && !store.get().trayHintShown) {
      store.set({ trayHintShown: true });
      showNote({ id: 'tray-hint', title: L('stillRunning'), body: L('stillRunningBody'), onClick: () => actions.showWindow() });
    }
  });

  loadApp();
  return win;
}

function loadApp(pathname = START_PATH) {
  const { win } = state;
  if (!win || win.isDestroyed()) return;
  void win.loadURL(`${origin()}${pathname}`);
}

function showWindow() {
  const { win } = state;
  if (!win || win.isDestroyed()) {
    createMainWindow().once('ready-to-show', () => state.win?.show());
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

/** Right-click: spelling, links, pictures, and cut/copy/paste */
function contextMenu(params, target) {
  if (!target || target.isDestroyed()) return;
  const wc = target.webContents;
  const items = [];
  if (params.misspelledWord) {
    for (const s of params.dictionarySuggestions.slice(0, 5)) items.push({ label: s, click: () => wc.replaceMisspelling(s) });
    if (!params.dictionarySuggestions.length) items.push({ label: L('noSuggestions'), enabled: false });
    items.push({ label: L('addToDictionary'), click: () => wc.session.addWordToSpellCheckerDictionary(params.misspelledWord) });
    items.push({ type: 'separator' });
  }
  if (params.linkURL && /^(https?:|mailto:)/i.test(params.linkURL)) {
    items.push({ label: L('openLink'), click: () => openOutside(params.linkURL) });
    items.push({ label: L('copyLink'), click: () => clipboard.writeText(params.linkURL) });
    items.push({ type: 'separator' });
  }
  if (params.mediaType === 'image' && params.srcURL) {
    items.push({ label: L('copyImage'), click: () => wc.copyImageAt(params.x, params.y) });
    items.push({ label: L('saveImage'), click: () => wc.downloadURL(params.srcURL) });
    items.push({ type: 'separator' });
  }
  if (params.isEditable) {
    items.push({ role: 'undo', enabled: params.editFlags.canUndo }, { role: 'redo', enabled: params.editFlags.canRedo }, { type: 'separator' });
    items.push({ role: 'cut', enabled: params.editFlags.canCut }, { role: 'copy', enabled: params.editFlags.canCopy }, { role: 'paste', enabled: params.editFlags.canPaste }, { role: 'selectAll' });
  } else if (params.selectionText && params.selectionText.trim()) {
    items.push({ role: 'copy' });
  }
  while (items.length && items[items.length - 1].type === 'separator') items.pop();
  if (items.length) Menu.buildFromTemplate(items).popup({ window: target });
}

module.exports = { createMainWindow, loadApp, showWindow, openOutside, openViewer };
