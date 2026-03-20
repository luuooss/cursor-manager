const { app } = require('electron');
const path = require('path');

const APPDATA_PATH = app.getPath('appData');
const PACKS_DIRECTORY = path.join(APPDATA_PATH, 'CursorManager', 'packs');
const REMOTE_LIST_URL = 'https://raw.githubusercontent.com/luuooss/cursor-manager/refs/heads/main/list.json';

const CURSOR_REGISTRY_KEYS = [
  "Arrow", "Help", "AppStarting", "Wait", "Crosshair", "IBeam", "NWPen", "No",
  "SizeNS", "SizeWE", "SizeNWSE", "SizeNESW", "SizeAll", "UpArrow", "Hand",
  "Person", "Pin"
];

module.exports = {
  PACKS_DIRECTORY,
  REMOTE_LIST_URL,
  CURSOR_REGISTRY_KEYS
};
