'use strict';
/**
 * Native notifications, the unread count (Dock badge on macOS, a number over
 * the taskbar button on Windows, the tray tooltip and the window title) and
 * asking for attention when someone calls.
 */
const { app, Notification, nativeImage } = require('electron');
const store = require('../store');
const { state, actions } = require('./state');
const { APP_NAME, isMac, isWin, asset, clip, L } = require('./util');

const notes = new Map();

function showNote({ id, title, body, silent, urgent, onClick }) {
  if (!Notification.isSupported()) return;
  const key = String(id || Date.now());
  notes.get(key)?.close();
  const note = new Notification({
    title: clip(title, 120) || APP_NAME,
    body: clip(body, 300),
    silent: !!silent,
    icon: isMac ? undefined : asset('icon.png'),
    urgency: urgent ? 'critical' : 'normal',
    timeoutType: urgent ? 'never' : 'default',
  });
  note.on('click', () => {
    actions.showWindow();
    onClick?.();
  });
  note.on('close', () => {
    if (notes.get(key) === note) notes.delete(key);
  });
  notes.set(key, note);
  note.show();
}

function clearNote(id) {
  const key = String(id);
  const note = notes.get(key);
  if (!note) return;
  note.close();
  notes.delete(key);
}

const overlays = new Map();
function overlayIcon(n) {
  const key = n > 9 ? '9plus' : String(n);
  if (!overlays.has(key)) overlays.set(key, nativeImage.createFromPath(asset('badges', `overlay-${key}.png`)));
  return overlays.get(key);
}

function trayImage(dot) {
  if (isMac) {
    const img = nativeImage.createFromPath(asset('tray', 'trayTemplate.png'));
    img.setTemplateImage(true);
    return img;
  }
  // Windows picks the right size from the .ico for the screen's scaling (16 to 64 pixels)
  if (isWin) return nativeImage.createFromPath(asset('tray', dot ? 'tray-unread.ico' : 'tray.ico'));
  return nativeImage.createFromPath(asset('tray', dot ? 'tray-unread.png' : 'tray.png'));
}

function setUnread(n) {
  state.unread = state.signedIn ? Math.max(0, Math.min(99999, Math.floor(Number(n) || 0))) : 0;
  const { unread, win, tray } = state;
  const label = unread > 99 ? '99+' : String(unread);
  if (isMac) app.dock?.setBadge(unread ? label : '');
  else if (isWin && win && !win.isDestroyed()) win.setOverlayIcon(unread ? overlayIcon(unread) : null, unread ? L('unread', { n: unread }) : '');
  else app.setBadgeCount(unread);
  if (win && !win.isDestroyed()) win.setTitle(unread ? `${APP_NAME} (${unread})` : APP_NAME);
  if (tray) {
    tray.setToolTip(unread ? `${APP_NAME}: ${L('unread', { n: unread })}` : APP_NAME);
    if (!isMac) tray.setImage(trayImage(unread > 0));
  }
}

function setSignedIn(on) {
  if (state.signedIn === on) return;
  state.signedIn = on;
  if (!on) setUnread(0);
  actions.rebuildTray();
}

/** A call: bring the window up (if the person wants that) and flash or bounce; a message: a gentle flash */
function attention(kind) {
  const { win } = state;
  if (!win || win.isDestroyed()) return;
  if (kind === 'call') {
    if (store.get().prefs.showOnCall && (!win.isVisible() || win.isMinimized())) {
      if (win.isMinimized()) win.restore();
      win.showInactive();
    }
    if (isMac) app.dock?.bounce('critical');
    else win.flashFrame(true);
  } else if (!win.isFocused()) {
    if (isMac) app.dock?.bounce('informational');
    else if (win.isVisible()) win.flashFrame(true);
  }
}

module.exports = { showNote, clearNote, setUnread, setSignedIn, attention, trayImage };
