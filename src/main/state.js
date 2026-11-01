'use strict';
/**
 * What the app's parts share while it runs: the main window, the tray, the
 * unread count, whether someone is signed in, the update on offer, and the
 * actions one part asks of another (filled in by index.js).
 */
const state = {
  win: null,
  tray: null,
  quitting: false,
  unread: 0,
  signedIn: false,
  pendingPath: null,
  update: null,
};

const actions = {
  showWindow: () => {},
  openSettings: () => {},
  openSetup: () => {},
  quit: () => {},
  rebuildTray: () => {},
  buildMenu: () => {},
  checkUpdate: async () => null,
  createMainWindow: () => {},
};

module.exports = { state, actions };
