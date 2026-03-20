const fs = require('fs').promises;

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(path) {
  if (!(await exists(path))) {
    await fs.mkdir(path, { recursive: true });
  }
}

module.exports = {
  exists,
  ensureDir
};
