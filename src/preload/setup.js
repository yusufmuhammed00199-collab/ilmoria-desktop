'use strict';
// The school-address window's bridge.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setup', {
  current: () => ipcRenderer.invoke('setup:current'),
  save: (address) => ipcRenderer.invoke('setup:save', String(address ?? '')),
});
