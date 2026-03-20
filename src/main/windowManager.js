const { BrowserWindow, protocol, Menu } = require('electron');
const path = require('path');
const fs = require('fs').promises;

function registerAssetProtocol() {
  protocol.handle('asset', async (request) => {
    try {
      const url = new URL(request.url);
      let p = decodeURIComponent(url.pathname);
      if (url.hostname && url.hostname.length === 1) {
        p = url.hostname + ':' + p;
      }
      const realPath = p.replace(/^\//, '');
      const data = await fs.readFile(realPath);
      return new Response(data);
    } catch (err) {
      console.error('[ASSET] Error:', err);
      return new Response(null, { status: 404 });
    }
  });
}

function createMainWindow() {
  Menu.setApplicationMenu(null);

  const window = new BrowserWindow({
    width: 530, 
    height: 565, 
    frame: false, 
    transparent: true,
    icon: path.join(__dirname, '../../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, 
      contextIsolation: true, 
      devTools: false
    },
    autoHideMenuBar: true
  });

  window.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.key.toLowerCase() === 'r') || (input.key === 'F5')) {
      event.preventDefault();
    }
  });

  window.loadFile(path.join(__dirname, '../renderer/index.html'));

  return window;
}

module.exports = {
  registerAssetProtocol,
  createMainWindow
};
