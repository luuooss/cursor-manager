const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getPacks: () => ipcRenderer.invoke('get-packs'),
  installPack: (packData) => ipcRenderer.invoke('install-pack', packData),
  installLocalPack: (filePath) => ipcRenderer.invoke('install-local-pack', filePath),
  deletePack: (packId) => ipcRenderer.invoke('delete-pack', packId),
  applyPack: (data) => ipcRenderer.invoke('apply-pack', data),
  getPackCursors: (packId) => ipcRenderer.invoke('get-pack-cursors', packId),
  getVariantCursors: (data) => ipcRenderer.invoke('get-variant-cursors', data),
  selectCursorFile: () => ipcRenderer.invoke('select-cursor-file'),
  applyCustom: (selection) => ipcRenderer.invoke('apply-custom', selection),
  resetCursor: () => ipcRenderer.invoke('reset-cursor'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  onInstallProgress: (cb) => ipcRenderer.on('install-progress', (_e, data) => cb(data))
});
