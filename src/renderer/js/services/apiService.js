export const apiService = {
  getPacks: () => window.api.getPacks(),
  getPackCursors: (id) => window.api.getPackCursors(id),
  getVariantCursors: (data) => window.api.getVariantCursors(data),
  installPack: (data) => window.api.installPack(data),
  installLocalPack: (path) => window.api.installLocalPack(path),
  deletePack: (id) => window.api.deletePack(id),
  applyPack: (data) => window.api.applyPack(data),
  resetCursor: () => window.api.resetCursor(),
  minimizeWindow: () => window.api.minimizeWindow(),
  closeWindow: () => window.api.closeWindow(),
  onInstallProgress: (callback) => window.api.onInstallProgress(callback)
};
