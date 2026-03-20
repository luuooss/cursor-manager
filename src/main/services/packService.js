const fs = require('fs').promises;
const path = require('path');
const { PACKS_DIRECTORY, REMOTE_LIST_URL } = require('../constants');
const { fetchRemoteList, downloadRemoteFile } = require('../utils/networkUtils');
const { extractPreviewFrames } = require('./automationService');
const extract = require('extract-zip');
const { pathToFileURL } = require('url');

async function getPacks() {
  const packsMap = new Map();
  try {
    const folders = await fs.readdir(PACKS_DIRECTORY, { withFileTypes: true });
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const metaPath = path.join(PACKS_DIRECTORY, folder.name, 'metadata.json');
        try {
          const content = await fs.readFile(metaPath, 'utf8');
          packsMap.set(folder.name, { ...JSON.parse(content), id: folder.name, isInstalled: true });
        } catch (e) { }
      }
    }
  } catch (e) { }

  const remoteData = await fetchRemoteList(REMOTE_LIST_URL);
  const remotePacks = (remoteData.packs || []).map(p => ({ ...p, url: p.downloadUrl }));

  for (const pack of remotePacks) {
    if (!packsMap.has(pack.id)) {
      const exists = await fs.access(path.join(PACKS_DIRECTORY, pack.id)).then(() => true).catch(() => false);
      packsMap.set(pack.id, { ...pack, isInstalled: exists });
    }
  }

  return Promise.all(Array.from(packsMap.values()).map(async pack => {
    let preview = pack.preview || 'https://via.placeholder.com/150/1a1a1f/ffffff?text=?';
    if (pack.isInstalled) {
      const packPath = path.join(PACKS_DIRECTORY, pack.id);
      try {
        const pngs = [];
        async function collectPngs(dir) {
          const items = await fs.readdir(dir, { withFileTypes: true });
          for (const item of items) {
            if (item.isDirectory()) await collectPngs(path.join(dir, item.name));
            else if (item.name.toLowerCase().endsWith('.png')) pngs.push(path.join(dir, item.name));
          }
        }
        await collectPngs(packPath);
        const found = pngs.find(f => f.toLowerCase().includes('normal') || f.toLowerCase().includes('arrow')) || pngs[0];
        if (found) preview = pathToFileURL(found).toString().replace(/^file:/, 'asset:');
      } catch (e) { }
    }
    return { ...pack, preview };
  }));
}

async function getPackCursors(packId, senderWindow = null) {
  const packDir = path.join(PACKS_DIRECTORY, packId);
  if (!await fs.access(packDir).then(() => true).catch(() => false)) return { cursors: [], variants: [] };

  try {
    const pngs = [];
    async function collectPngs(dir) {
      const items = await fs.readdir(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) await collectPngs(path.join(dir, item.name));
        else if (item.name.toLowerCase().endsWith('.png')) pngs.push(path.join(dir, item.name));
      }
    }
    await collectPngs(packDir);
    if (pngs.length === 0) {
      await extractPreviewFrames(packDir, senderWindow);
    }
  } catch (e) { }

  const variants = [];
  const entries = await fs.readdir(packDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPath = path.join(packDir, entry.name);
      const files = await fs.readdir(subPath);
      if (files.some(f => f.toLowerCase().endsWith('.cur') || f.toLowerCase().endsWith('.ani'))) {
        variants.push({ id: entry.name, name: entry.name });
      }
    }
  }

  async function getCursorsAsync(dir) {
    const cursorMap = new Map();
    async function findFrames(targetDir) {
      const items = await fs.readdir(targetDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) await findFrames(path.join(targetDir, item.name));
        else if (item.name.toLowerCase().endsWith('.png')) {
          const match = item.name.match(/(.+)\.(\d+)\.png$/i);
          if (match) {
            if (!cursorMap.has(match[1])) cursorMap.set(match[1], []);
            cursorMap.get(match[1])[parseInt(match[2])] = pathToFileURL(path.join(targetDir, item.name)).toString().replace(/^file:/, 'asset:');
          }
        }
      }
    }
    await findFrames(dir);
    return Array.from(cursorMap.entries()).map(([name, frames]) => ({ name, frames: frames.filter(f => f) }));
  }

  const cursors = await getCursorsAsync(packDir);
  return { cursors, variants };
}

async function getVariantCursors(packId, variantId) {
  const variantPath = path.join(PACKS_DIRECTORY, packId, variantId);
  const cursorMap = new Map();
  async function findFrames(dir) {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) await findFrames(path.join(dir, item.name));
      else if (item.name.toLowerCase().endsWith('.png')) {
        const match = item.name.match(/(.+)\.(\d+)\.png$/i);
        if (match) {
          if (!cursorMap.has(match[1])) cursorMap.set(match[1], []);
          cursorMap.get(match[1])[parseInt(match[2])] = pathToFileURL(path.join(dir, item.name)).toString().replace(/^file:/, 'asset:');
        }
      }
    }
  }
  await findFrames(variantPath);
  return Array.from(cursorMap.entries()).map(([name, frames]) => ({ name, frames: frames.filter(f => f) }));
}

async function installPack(packData, senderWindow = null) {
  const dest = path.join(PACKS_DIRECTORY, packData.id);
  const zip = path.join(PACKS_DIRECTORY, `${packData.id}.zip`);
  try {
    if (!await fs.access(dest).then(() => true).catch(() => false)) {
      await downloadRemoteFile(packData.url, zip);
      await extract(zip, { dir: dest });
      await fs.writeFile(path.join(dest, 'metadata.json'), JSON.stringify(packData));
      await fs.unlink(zip);
      await extractPreviewFrames(dest, senderWindow);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function installLocalPack(filePath) {
  try {
    const name = path.basename(filePath, '.zip');
    let id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let dest = path.join(PACKS_DIRECTORY, id);
    let count = 1;
    while (await fs.access(dest).then(() => true).catch(() => false)) {
      dest = path.join(PACKS_DIRECTORY, `${id}-${count++}`);
    }
    await extract(filePath, { dir: dest });
    if (require('fs').existsSync(filePath)) {
      require('fs').unlinkSync(filePath);
    }
    await fs.writeFile(path.join(dest, 'metadata.json'), JSON.stringify({ id: path.basename(dest), name, isLocal: true }));
    await extractPreviewFrames(dest);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function deletePack(packId) {
  try {
    await fs.rm(path.join(PACKS_DIRECTORY, packId), { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getPacks,
  getPackCursors,
  getVariantCursors,
  installPack,
  installLocalPack,
  deletePack
};
