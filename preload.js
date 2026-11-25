// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
const { contextBridge, ipcRenderer } = require('electron');

const on = (channel) => (cb) => {
  const handler = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

contextBridge.exposeInMainWorld('radio', {
  getState: () => ipcRenderer.invoke('get-state'),
  saveSettings: (patch) => ipcRenderer.invoke('save-settings', patch),
  listPorts: () => ipcRenderer.invoke('list-ports'),
  openPort: (path) => ipcRenderer.invoke('open-port', path),
  pttPress: () => ipcRenderer.send('ptt-press'),
  pttRelease: () => ipcRenderer.send('ptt-release'),
  pttOff: () => ipcRenderer.send('ptt-off'),
  tcallPress: () => ipcRenderer.send('tcall-press'),
  tcallRelease: () => ipcRenderer.send('tcall-release'),
  setView: (view) => ipcRenderer.invoke('set-view', view),
  fitHeight: (height) => ipcRenderer.invoke('fit-height', height),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  captureHotkey: () => ipcRenderer.invoke('capture-hotkey'),
  windowInput: (ev) => ipcRenderer.send('window-input', ev),
  cancelCapture: () => ipcRenderer.invoke('cancel-capture'),
  clearHotkey: () => ipcRenderer.invoke('clear-hotkey'),
  onPtt: on('ptt-state'),
  onTot: on('tot-expired'),
  onSerialStatus: on('serial-status'),
  onHotkey: on('hotkey-changed'),
});
