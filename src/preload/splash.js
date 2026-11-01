'use strict';
// The opening animation's window: told when to fly away.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splash', {
  onLeave: (cb) => ipcRenderer.once('splash:leave', () => cb()),
});
