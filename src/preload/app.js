'use strict';
/**
 * The bridge the Ilmoria page uses inside the app (window.ilmoriaDesktop):
 * notifications, the unread badge, the app's settings, links to the browser.
 * It is only handed to pages from the school's own address.
 */
const { contextBridge, ipcRenderer } = require('electron');

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : '';
};
const server = arg('ilmoria-server');
const version = arg('ilmoria-version');

if (server && location.origin === server) {
  const listen = (channel, cb) => {
    const handler = (_e, value) => {
      try {
        cb(value);
      } catch {
        /* the page's own problem */
      }
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  };

  // Whether the window is on screen and in front (the main process says so as it changes)
  let front = { focused: true, visible: true };
  ipcRenderer.on('window-state', (_e, state) => {
    if (state && typeof state === 'object') front = { focused: !!state.focused, visible: !!state.visible };
  });

  contextBridge.exposeInMainWorld('ilmoriaDesktop', {
    version,
    inFront: () => front.focused && front.visible,
    platform: process.platform,
    server,
    setBadge: (count) => ipcRenderer.send('badge', Number(count) || 0),
    notify: (n) =>
      ipcRenderer.send('notify', {
        id: String(n?.id ?? ''),
        title: String(n?.title ?? ''),
        body: String(n?.body ?? ''),
        path: typeof n?.path === 'string' ? n.path : '',
        kind: ['message', 'mention', 'call'].includes(n?.kind) ? n.kind : 'message',
        silent: !!n?.silent,
      }),
    clearNotification: (id) => ipcRenderer.send('notify-clear', String(id ?? '')),
    attention: (kind) => ipcRenderer.send('attention', kind === 'call' ? 'call' : 'message'),
    onNavigate: (cb) => listen('navigate', cb),
    getPrefs: () => ipcRenderer.invoke('prefs:get'),
    setPrefs: (p) => ipcRenderer.invoke('prefs:set', p),
    openExternal: (url) => ipcRenderer.send('open-external', String(url ?? '')),
    changeSchool: () => ipcRenderer.send('change-school'),
    signedIn: (on) => ipcRenderer.send('signed-in', !!on),
    checkForUpdates: () => ipcRenderer.invoke('update:check'),
    onUpdate: (cb) => listen('update', cb),
    installUpdate: () => ipcRenderer.send('update:install'),
    // The page has drawn its first screen: the opening animation can end and the app appear
    appReady: () => ipcRenderer.send('app-ready'),
  });

  // The tray's and the menu's "Settings…"
  ipcRenderer.on('open-settings', () => window.dispatchEvent(new CustomEvent('ilm:desktop-settings')));

  // The app's own menus and messages follow the page's language (English or Arabic)
  let lastLang = '';
  const sendLang = () => {
    const lang = document.documentElement?.lang === 'ar' ? 'ar' : 'en';
    if (lang === lastLang) return;
    lastLang = lang;
    ipcRenderer.send('language', lang);
  };
  window.addEventListener('DOMContentLoaded', () => {
    sendLang();
    new MutationObserver(sendLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  });
}
