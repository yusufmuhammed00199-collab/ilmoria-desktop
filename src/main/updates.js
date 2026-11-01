'use strict';
/**
 * Updates: the school's server says which version is newest (/desktop/latest.json).
 * A newer one is offered with a notification, in the tray and in the app's settings.
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

/** manual: asked by the person (errors are reported, and no notification of its own) */
async function checkUpdate(manual) {
  const j = await fetchJson(`${origin()}/desktop/latest.json`, 10_000);
  if (!j || j.app !== MANIFEST_APP || typeof j.version !== 'string') {
    if (manual) throw new Error('unavailable');
    return null;
  }
  if (!newer(j.version, app.getVersion())) {
    state.update = null;
    actions.rebuildTray();
    return null;
  }
  const key = isWin ? 'windows' : isMac ? (process.arch === 'arm64' ? 'macArm' : 'macIntel') : 'linux';
  const given = j.downloads?.[key]?.url;
  const url = typeof given === 'string' && /^https:\/\//.test(given) ? given : `${origin()}/download`;
  state.update = { version: j.version, url };
  actions.rebuildTray();
  const { win } = state;
  if (win && !win.isDestroyed() && isServer(win.webContents.getURL())) win.webContents.send('update', state.update);
  if (!manual && store.get().notifiedVersion !== j.version) {
    store.set({ notifiedVersion: j.version });
    showNote({ id: 'update', title: L('updateReady', { v: j.version }), body: L('updateBody'), onClick: () => void shell.openExternal(url) });
  }
  return state.update;
}

module.exports = { checkUpdate, fetchJson, MANIFEST_APP };
