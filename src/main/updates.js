'use strict';
/**
 * Updates.
 *
 * Almost everything in Ilmoria is the site the window opens, so new features arrive on their
 * own: the page offers its new version with the update button. This file is about the window
 * itself (the app), which changes rarely:
 *  - Windows: a newer app downloads quietly in the background (GitHub releases) and installs
 *    with one click on "Restart and update", or by itself the next time the app quits.
 *  - macOS: installing in the background needs an Apple-signed app; until then a newer app is
 *    offered as a download (the school's server says which is newest: /desktop/latest.json).
 *  - Microsoft Store: the Store keeps its copy up to date.
 */
const { app, net, shell } = require('electron');
const store = require('../store');
const { state, actions } = require('./state');
const { isMac, isWin, isServer, origin, L } = require('./util');
const { showNote } = require('./notify');

const MANIFEST_APP = 'ilmoria-desktop';

async function fetchJson(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await net.fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const newer = (a, b) => {
  const pa = String(a).split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

function tell(update) {
  state.update = update;
  actions.rebuildTray();
  const { win } = state;
  if (win && !win.isDestroyed() && isServer(win.webContents.getURL())) win.webContents.send('update', update);
}

/* ------------------------------------------------------------------ Windows: in the background */

let updater = null;
let downloading = null;

function windowsUpdater() {
  if (!isWin || process.windowsStore || !app.isPackaged) return null;
  if (updater) return updater;
  try {
    ({ autoUpdater: updater } = require('electron-updater'));
  } catch {
    return null;
  }
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.allowPrerelease = false;
  updater.logger = null;
  updater.on('update-available', (info) => {
    downloading = info.version;
  });
  updater.on('update-not-available', () => {
    downloading = null;
  });
  updater.on('update-downloaded', (info) => {
    downloading = null;
    tell({ version: info.version, ready: true });
    if (store.get().notifiedVersion !== info.version) {
      store.set({ notifiedVersion: info.version });
      showNote({ id: 'update', title: L('updateReady', { v: info.version }), body: L('updateRestart'), onClick: () => installUpdate() });
    }
  });
  updater.on('error', () => {
    downloading = null;
  });
  return updater;
}

/** Restart into the downloaded update (installs quietly, then opens Ilmoria again) */
function installUpdate() {
  const u = windowsUpdater();
  if (!u || !state.update?.ready) return false;
  state.quitting = true;
  setImmediate(() => u.quitAndInstall(true, true));
  return true;
}

/* ------------------------------------------------------------------ the check */

/** manual: asked by the person (errors are reported, and no notification of its own) */
async function checkUpdate(manual) {
  // The Microsoft Store keeps its copy up to date itself
  if (process.windowsStore) return null;

  const u = windowsUpdater();
  if (u) {
    if (state.update?.ready) return state.update;
    try {
      const r = await u.checkForUpdates();
      const v = r?.updateInfo?.version;
      if (v && newer(v, app.getVersion())) return state.update?.ready ? state.update : { version: v, ready: false, downloading: true };
      tell(null);
      return null;
    } catch (e) {
      if (manual) throw e;
      return null;
    }
  }

  const j = await fetchJson(`${origin()}/desktop/latest.json`, 10_000);
  if (!j || j.app !== MANIFEST_APP || typeof j.version !== 'string') {
    if (manual) throw new Error('unavailable');
    return null;
  }
  if (!newer(j.version, app.getVersion())) {
    tell(null);
    return null;
  }
  const key = isWin ? 'windows' : isMac ? (process.arch === 'arm64' ? 'macArm' : 'macIntel') : 'linux';
  const given = j.downloads?.[key]?.url;
  const url = typeof given === 'string' && /^https:\/\//.test(given) ? given : `${origin()}/download`;
  tell({ version: j.version, url });
  if (!manual && store.get().notifiedVersion !== j.version) {
    store.set({ notifiedVersion: j.version });
    showNote({ id: 'update', title: L('updateReady', { v: j.version }), body: L('updateBody'), onClick: () => void shell.openExternal(url) });
  }
  return state.update;
}

module.exports = { checkUpdate, installUpdate, fetchJson, MANIFEST_APP, downloadingVersion: () => downloading };
