'use strict';
/**
 * Ilmoria for Windows and macOS.
 *
 * The whole of the school's Ilmoria (app.ilmoria.com, or the school's own
 * address) in a window of its own, on the same server and the same accounts
 * as the website: whatever someone does in the app shows on the website and
 * the other way round. The app adds what a browser tab can't: notifications
 * that arrive with the window closed (it keeps running in the tray or the
 * Dock), the unread count on the taskbar or Dock, starting with the computer,
 * ilmoria:// links, screen sharing with a picker, downloads, spell check and
 * update checks. It opens with an animation while the site loads.
 *
 *   main/state.js    what the parts share       main/window.js   the windows
 *   main/session.js  permissions, screen picker, downloads
 *   main/notify.js   notifications, badge        main/tray.js     tray
 *   main/menu.js     app menu                    main/updates.js  updates
 *   main/setup.js    school address              main/splash.js   opening animation
 *   main/ipc.js      what the page may ask
 */
const { app, powerMonitor } = require('electron');
const path = require('path');
const store = require('../store');

// For testing: separate settings and sign-in, and another copy of Ilmoria
if (process.env.ILMORIA_USER_DATA) app.setPath('userData', process.env.ILMORIA_USER_DATA);
if (process.env.ILMORIA_SERVER && store.validServer(process.env.ILMORIA_SERVER)) store.set({ server: new URL(process.env.ILMORIA_SERVER).origin });

const { state, actions } = require('./state');
const { APP_NAME, APP_ID, START_PATH, isMac, isWin, isServer, safePath } = require('./util');

app.setName(APP_NAME);
if (isWin) app.setAppUserModelId(APP_ID);
// Keep checking for messages and calls while the window is hidden or covered
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-features', 'IntensiveWakeUpThrottling,CalculateNativeWinOcclusion');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  start();
}

function start() {
  const { setupSession } = require('./session');
  const { createMainWindow, showWindow } = require('./window');
  const { createTray, rebuildTray, applyLoginItem } = require('./tray');
  const { buildMenu } = require('./menu');
  const { checkUpdate, installUpdate } = require('./updates');
  const { openSetup } = require('./setup');
  const { openSplash, revealWhenReady } = require('./splash');
  require('./ipc');

  Object.assign(actions, {
    showWindow,
    createMainWindow,
    openSetup,
    buildMenu,
    rebuildTray,
    checkUpdate,
    installUpdate,
    openSettings: () => {
      showWindow();
      if (state.win && isServer(state.win.webContents.getURL())) state.win.webContents.send('open-settings');
    },
    quit: () => {
      state.quitting = true;
      app.quit();
    },
  });

  // ilmoria://open/<page>, ilmoria://chat/<id>: open that page of the app
  const openLink = (link) => {
    let target = START_PATH;
    try {
      const u = new URL(link);
      const parts = `${u.host}${u.pathname}`.split('/').filter(Boolean);
      if (parts[0] === 'chat' && /^[0-9a-f-]{36}$/i.test(parts[1] || '')) target = `/dashboard/connect/c/${parts[1]}`;
      else if (parts[0] === 'open') target = safePath(`/dashboard/${parts.slice(1).join('/')}`.replace(/\/$/, '')) || START_PATH;
    } catch {
      /* just open the app */
    }
    showWindow();
    const { win } = state;
    if (win && !win.webContents.isLoading() && isServer(win.webContents.getURL())) win.webContents.send('navigate', target);
    else state.pendingPath = target;
  };

  if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient('ilmoria', process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient('ilmoria');

  let earlyLink = process.argv.find((a) => a.startsWith('ilmoria://')) || null;
  app.on('open-url', (e, link) => {
    e.preventDefault();
    if (app.isReady()) openLink(link);
    else earlyLink = link;
  });
  app.on('second-instance', (_e, argv) => {
    const link = argv.find((a) => a.startsWith('ilmoria://'));
    if (link) openLink(link);
    else showWindow();
  });

  app.whenReady().then(() => {
    const hidden = process.argv.includes('--hidden') || (isMac && app.getLoginItemSettings().wasOpenedAsHidden);
    setupSession();
    buildMenu();
    if (!hidden && process.env.ILMORIA_NO_SPLASH !== '1') openSplash();
    const win = createMainWindow();
    if (!hidden) revealWhenReady(win);
    createTray();
    applyLoginItem();
    if (earlyLink) openLink(earlyLink);

    const quietCheck = () => checkUpdate(false).catch(() => undefined);
    setTimeout(quietCheck, 20_000);
    setInterval(quietCheck, 6 * 60 * 60_000);
    // Shutting the computer down must not wait on a window that only hides
    powerMonitor.on('shutdown', () => actions.quit());
  });

  app.on('activate', () => showWindow());
  app.on('before-quit', () => {
    state.quitting = true;
  });
  app.on('window-all-closed', () => {
    if (!isMac) app.quit();
  });

  // Every page the app opens: no <webview>, no pop-ups it didn't ask for
  app.on('web-contents-created', (_e, contents) => {
    contents.on('will-attach-webview', (ev) => ev.preventDefault());
    contents.setWindowOpenHandler(({ url }) => {
      if (/^(https?:|mailto:)/i.test(url)) void require('electron').shell.openExternal(url);
      return { action: 'deny' };
    });
  });
}
