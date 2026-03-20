const https = require('https');
const fsSync = require('fs');
const fs = require('fs').promises;

async function fetchRemoteList(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRemoteList(res.headers.location).then(resolve);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ packs: [] });
        }
      });
    }).on('error', () => resolve({ packs: [] }));
  });
}

function downloadRemoteFile(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return resolve(downloadRemoteFile(response.headers.location, destination));
      }
      if (response.statusCode !== 200) return reject(new Error('Fetch failed: ' + response.statusCode));
      const fileStream = fsSync.createWriteStream(destination);
      response.pipe(fileStream);
      fileStream.on('finish', () => fileStream.close(resolve));
    }).on('error', (err) => {
      fs.unlink(destination).catch(() => { }).finally(() => reject(err));
    });
  });
}

module.exports = {
  fetchRemoteList,
  downloadRemoteFile
};
