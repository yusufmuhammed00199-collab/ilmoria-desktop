'use strict';
/** Small helpers the app's parts share. */
const path = require('path');
const store = require('../store');
const strings = require('../strings');

const APP_NAME = 'Ilmoria';
const APP_ID = 'com.ilmoria.desktop';
const PARTITION = 'persist:ilmoria';
const START_PATH = '/dashboard';
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

const asset = (...p) => path.join(__dirname, '..', '..', 'build', ...p);
const page = (name) => path.join(__dirname, '..', 'pages', name);
const preload = (name) => path.join(__dirname, '..', 'preload', name);
const appIcon = () => (isWin ? asset('icon.ico') : asset('icon.png'));

/** The school's address (an origin such as https://app.ilmoria.com) */
const origin = () => new URL(store.get().server).origin;

const isServer = (url) => {
  try {
    return new URL(url).origin === origin();
  } catch {
    return false;
  }
};

/** A page inside the app a notification or a link may open */
const safePath = (p) => (typeof p === 'string' && /^\/dashboard(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_%-]*)?$/.test(p) ? p : null);

const clip = (s, n) => {
  const v = String(s ?? '').replace(/\s+/g, ' ').trim();
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
};

function debounce(fn, ms) {
  let t = null;
  return () => {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

/** The app's own words in the language the page is in */
const L = (key, vars) => strings.t(store.get().lang, key, vars);

/** An IPC message from the school's own page (and not from a frame or another site) */
const fromServer = (e) => isServer(e.senderFrame?.url || '');

module.exports = { APP_NAME, APP_ID, PARTITION, START_PATH, isMac, isWin, asset, page, preload, appIcon, origin, isServer, safePath, clip, debounce, L, fromServer };
