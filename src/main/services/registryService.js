const { exec: execRaw } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const { CURSOR_REGISTRY_KEYS } = require('../constants');
const { broadcastSystemCursorUpdate } = require('./automationService');

const exec = util.promisify(execRaw);

async function applyPackToWindowsRegistry(packDir, variantId = null) {
  let highestCursorCount = 0;
  let targetSubFolder = packDir;
  let installationInfPath = null;

  if (variantId) {
    targetSubFolder = path.join(packDir, variantId);
    const entries = await fs.readdir(targetSubFolder, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.toLowerCase().endsWith('.inf')) {
        installationInfPath = path.join(targetSubFolder, entry.name);
      }
    }
  } else {
    async function scanDeep(dir) {
      let localCount = 0;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) await scanDeep(fullPath);
        else if (entry.name.toLowerCase().endsWith('.cur') || entry.name.toLowerCase().endsWith('.ani')) localCount++;
        else if (entry.name.toLowerCase().endsWith('.inf')) installationInfPath = fullPath;
      }
      if (localCount > highestCursorCount) {
        highestCursorCount = localCount;
        targetSubFolder = dir;
      }
    }
    await scanDeep(packDir);
  }

  const cursorFiles = (await fs.readdir(targetSubFolder)).filter(f => f.toLowerCase().endsWith('.cur') || f.toLowerCase().endsWith('.ani'));

  const commonDir = path.join(packDir, 'Common');
  let commonFiles = [];
  try {
    if (await fs.access(commonDir).then(() => true).catch(() => false)) {
      commonFiles = (await fs.readdir(commonDir)).filter(f => f.toLowerCase().endsWith('.cur') || f.toLowerCase().endsWith('.ani'));
    }
  } catch (e) { }

  const mappedValues = {};

  const KEYWORD_MAP = {
    Arrow: ['arrow', 'normal', 'pointer', 'standard'],
    Help: ['help', 'ques'],
    AppStarting: ['appstarting', 'working', 'background', 'process'],
    Wait: ['wait', 'busy', 'load'],
    Crosshair: ['cross', 'prec'],
    IBeam: ['ibeam', 'text', 'beam'],
    NWPen: ['nwpen', 'pen', 'handwrite'],
    No: ['unavail', 'ban', ' no.', ' no ', '-no-', '_no_', 'stop', 'disabled'],
    SizeNS: ['sizens', 'vert', 'ns', 'vertical', 'n-s', 'vertres'],
    SizeWE: ['sizewe', 'horz', 'hori', 'horires', 'we', 'horizontal', 'w-e', 'horires'],
    SizeNWSE: ['sizenwse', 'dgn1', 'diag1', 'diares1', 'nwse', 'diagonal1', 'diag_1', 'diares1'],
    SizeNESW: ['sizenesw', 'dgn2', 'diag2', 'diares2', 'nesw', 'diagonal2', 'diag_2', 'diares2'],
    SizeAll: ['sizeall', 'move', 'all'],
    UpArrow: ['uparrow', 'up', 'alt'],
    Hand: ['link', 'hand', 'select', 'pointing'],
    Person: ['person', 'people', 'human'],
    Pin: ['pin', 'location', 'place', 'map']
  };

  if (installationInfPath) {
    try {
      const infContent = await fs.readFile(installationInfPath, 'utf8');
      const INF_IDENTIFIERS = {
        'pointer': 'Arrow', 'arrow': 'Arrow', 'normal': 'Arrow',
        'help': 'Help', 'ques': 'Help',
        'work': 'AppStarting', 'background': 'AppStarting',
        'busy': 'Wait', 'wait': 'Wait',
        'cross': 'Crosshair', 'precision': 'Crosshair',
        'text': 'IBeam', 'beam': 'IBeam',
        'handw': 'NWPen', 'pen': 'NWPen', 'handwrite': 'NWPen',
        'unavail': 'No', 'no': 'No', 'stop': 'No',
        'vert': 'SizeNS', 'ns': 'SizeNS', 'up': 'SizeNS', 'down': 'SizeNS',
        'horz': 'SizeWE', 'we': 'SizeWE', 'left': 'SizeWE', 'right': 'SizeWE',
        'dgn1': 'SizeNWSE', 'nwse': 'SizeNWSE',
        'dgn2': 'SizeNESW', 'nesw': 'SizeNESW',
        'move': 'SizeAll', 'sizeall': 'SizeAll',
        'pointing': 'Hand', 'alternate': 'UpArrow', 'alt': 'UpArrow',
        'link': 'Hand', 'hand': 'Hand', 'person': 'Person', 'pin': 'Pin', 'location': 'Pin'
      };
      const pattern = /([a-zA-Z0-9_]+)\s*=\s*"?([^"\r\n]+\.(?:cur|ani))"?/gi;
      let match;
      while ((match = pattern.exec(infContent)) !== null) {
        const id = match[1].toLowerCase();
        if (INF_IDENTIFIERS[id]) {
          const file = cursorFiles.find(f => f.toLowerCase() === match[2].trim().toLowerCase())
            || commonFiles.find(f => f.toLowerCase() === match[2].trim().toLowerCase());
          if (file) {
            const isFromCommon = commonFiles.includes(file) && !cursorFiles.includes(file);
            mappedValues[INF_IDENTIFIERS[id]] = path.join(isFromCommon ? commonDir : targetSubFolder, file);
          }
        }
      }
    } catch (e) { }
  }

  for (const [regKey, keywords] of Object.entries(KEYWORD_MAP)) {
    if (!mappedValues[regKey]) {
      let candidate = cursorFiles.find(f => f.toLowerCase().startsWith(regKey.toLowerCase() + '.'));
      if (!candidate) {
        for (const word of keywords) {
          candidate = cursorFiles.find(f => {
            const name = f.toLowerCase();
            const regex = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, 'i');
            return regex.test(name);
          });
          if (candidate) break;
        }
      }
      if (candidate) {
        mappedValues[regKey] = path.join(targetSubFolder, candidate);
      } else if (commonFiles.length > 0) {
        for (const word of keywords) {
          candidate = commonFiles.find(f => {
            const name = f.toLowerCase();
            const regex = new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, 'i');
            return regex.test(name);
          });
          if (candidate) {
            mappedValues[regKey] = path.join(commonDir, candidate);
            break;
          }
        }
      }
    }
  }

  await exec(`reg add "HKCU\\Control Panel\\Cursors" /ve /t REG_SZ /d "Custom" /f`);
  for (const key of CURSOR_REGISTRY_KEYS) {
    if (mappedValues[key]) {
      await exec(`reg add "HKCU\\Control Panel\\Cursors" /v "${key}" /t REG_SZ /d "${mappedValues[key]}" /f`);
    } else {
      try {
        await exec(`reg delete "HKCU\\Control Panel\\Cursors" /v "${key}" /f`);
      } catch (e) { }
    }
  }
  await broadcastSystemCursorUpdate();
}

async function applyCustom(selection) {
  await exec(`reg add "HKCU\\Control Panel\\Cursors" /ve /t REG_SZ /d "Custom" /f`);
  for (const [key, p] of Object.entries(selection)) {
    if (p) {
      await exec(`reg add "HKCU\\Control Panel\\Cursors" /v "${key}" /t REG_SZ /d "${p}" /f`);
    }
  }
  await broadcastSystemCursorUpdate();
}

async function resetCursor() {
  await exec(`reg add "HKCU\\Control Panel\\Cursors" /ve /t REG_SZ /d "Windows Default" /f`);
  for (const k of CURSOR_REGISTRY_KEYS) {
    try {
      await exec(`reg delete "HKCU\\Control Panel\\Cursors" /v "${k}" /f`);
    } catch (e) { }
  }
  await broadcastSystemCursorUpdate();
}

module.exports = {
  applyPackToWindowsRegistry,
  applyCustom,
  resetCursor
};
