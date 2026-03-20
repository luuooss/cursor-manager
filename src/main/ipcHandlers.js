const { ipcMain, dialog, BrowserWindow } = require('electron');
const path = require('path');
const packService = require('./services/packService');
const registryService = require('./services/registryService');
const { PACKS_DIRECTORY } = require('./constants');

function registerIpcHandlers() {
  ipcMain.handle('get-packs', () => packService.getPacks());
  
  ipcMain.handle('get-pack-cursors', (event, packId) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return packService.getPackCursors(packId, win);
  });
  
  ipcMain.handle('get-variant-cursors', (event, { packId, variantId }) => 
    packService.getVariantCursors(packId, variantId)
  );

  ipcMain.handle('install-pack', (event, packData) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return packService.installPack(packData, win);
  });

  ipcMain.handle('install-local-pack', (event, filePath) => packService.installLocalPack(filePath));

  ipcMain.handle('delete-pack', (event, packId) => packService.deletePack(packId));

  ipcMain.handle('apply-pack', async (event, { packId, variantId = null }) => {
    try {
      await registryService.applyPackToWindowsRegistry(path.join(PACKS_DIRECTORY, packId), variantId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('select-cursor-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ 
      filters: [{ name: 'Cursors', extensions: ['cur', 'ani'] }], 
      properties: ['openFile'] 
    });
    return (!canceled && filePaths.length > 0) ? filePaths[0] : null;
  });

  ipcMain.handle('apply-custom', async (event, selection) => {
    try {
      await registryService.applyCustom(selection);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('reset-cursor', async () => {
    try {
      await registryService.resetCursor();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('close-window', () => {
    BrowserWindow.getFocusedWindow()?.close();
  });

  ipcMain.handle('minimize-window', () => {
    BrowserWindow.getFocusedWindow()?.minimize();
  });
}

module.exports = {
  registerIpcHandlers
};
