const { app } = require('electron');
const { registerAssetProtocol, createMainWindow } = require('./windowManager');
const { registerIpcHandlers } = require('./ipcHandlers');
const { ensureDir } = require('./utils/fsUtils');
const { PACKS_DIRECTORY } = require('./constants');

async function initializeApp() {
  await ensureDir(PACKS_DIRECTORY);
  
  registerAssetProtocol();
  createMainWindow();
  registerIpcHandlers();
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
