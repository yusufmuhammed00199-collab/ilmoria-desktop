'use strict';
/**
 * The app's settings on this computer (a small JSON file in the user's app
 * data folder): the school's address, notification choices, muted chats and
 * where the window was.
 */
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULT_SERVER = 'https://app.ilmoria.com';

const DEFAULT_PREFS = {
  notify: 'all',
  sound: true,
  openAtLogin: false,
  closeToTray: true,
  showOnCall: true,
  muted: [],
};

const DEFAULTS = {
  server: DEFAULT_SERVER,
  prefs: DEFAULT_PREFS,
  bounds: null,
  maximized: false,
  trayHintShown: false,
  notifiedVersion: '',
  lang: 'en',
};

let cache = null;
const file = () => path.join(app.getPath('userData'), 'settings.json');

function read() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    cache = { ...DEFAULTS, ...raw, prefs: cleanPrefs({ ...DEFAULT_PREFS, ...(raw.prefs || {}) }) };
  } catch {
    cache = { ...DEFAULTS, prefs: { ...DEFAULT_PREFS } };
  }
  if (!validServer(cache.server)) cache.server = DEFAULT_SERVER;
  if (cache.lang !== 'ar') cache.lang = 'en';
  return cache;
}

function write() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    const tmp = `${file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
    fs.renameSync(tmp, file());
  } catch {
    /* settings are a convenience: keep going without them */
  }
}

function get() {
  return read();
}

function set(patch) {
  read();
  cache = { ...cache, ...patch };
  write();
  return cache;
}

const LEVELS = ['all', 'direct', 'none'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cleanPrefs(p) {
  return {
    notify: LEVELS.includes(p.notify) ? p.notify : 'all',
    sound: p.sound !== false,
    openAtLogin: p.openAtLogin === true,
    closeToTray: p.closeToTray !== false,
    showOnCall: p.showOnCall !== false,
    muted: Array.isArray(p.muted) ? [...new Set(p.muted.filter((id) => typeof id === 'string' && UUID.test(id)))].slice(0, 500) : [],
  };
}

function setPrefs(patch) {
  const current = read().prefs;
  const next = cleanPrefs({ ...current, ...(patch && typeof patch === 'object' ? patch : {}) });
  set({ prefs: next });
  return next;
}

/** An https address (or http on this computer, for testing) with nothing after the host */
function validServer(s) {
  try {
    const u = new URL(s);
    if (u.username || u.password) return false;
    if (u.protocol === 'https:') return true;
    return u.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(u.hostname);
  } catch {
    return false;
  }
}

module.exports = { get, set, setPrefs, cleanPrefs, validServer, DEFAULT_SERVER, DEFAULT_PREFS };
