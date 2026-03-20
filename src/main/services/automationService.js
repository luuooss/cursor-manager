const { exec: execRaw } = require('child_process');
const util = require('util');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const exec = util.promisify(execRaw);

async function broadcastSystemCursorUpdate() {
  const pshScript = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class CR { [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern bool SystemParametersInfo(uint a, uint b, string c, uint d); }'; [CR]::SystemParametersInfo(0x0057, 0, $null, 0x01 -bor 0x02)`;
  const encoded = Buffer.from(pshScript, 'utf16le').toString('base64');
  await exec(`powershell.exe -NoProfile -EncodedCommand ${encoded}`);
}
async function extractPreviewFrames(folderPath, senderWindow = null) {
  let totalFiles = 0;
  let doneFiles = 0;

  async function countFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) await countFiles(path.join(dir, e.name));
      else if (e.name.toLowerCase().endsWith('.cur') || e.name.toLowerCase().endsWith('.ani')) totalFiles++;
    }
  }
  await countFiles(folderPath);

  let watcher = null;
  if (senderWindow && totalFiles > 0) {
    senderWindow.webContents.send('install-progress', { done: 0, total: totalFiles, label: 'Generating previews...' });
    watcher = fsSync.watch(folderPath, { recursive: true }, (event, filename) => {
      if (filename && filename.endsWith('.0.png')) {
        doneFiles = Math.min(doneFiles + 1, totalFiles);
        if (!senderWindow.isDestroyed()) {
          senderWindow.webContents.send('install-progress', { done: doneFiles, total: totalFiles, label: 'Generating previews...' });
        }
      }
    });
  }

  const sanitizedPath = folderPath.replace(/'/g, "''");
  const pshScript = `
Add-Type -AssemblyName System.Drawing
$definition = @"
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
public class CursorExporter {
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern IntPtr LoadImage(IntPtr hinst, string lpszName, uint uType, int cxDesired, int cyDesired, uint fuLoad);
  [DllImport("user32.dll")] public static extern bool DrawIconEx(IntPtr hdc, int xLeft, int yTop, IntPtr hIcon, int cxWidth, int cyWidth, uint istepIfAniCur, IntPtr hbrFlickerFreeDraw, uint diFlags);
  public static void ProcessDirectory(string path) {
    foreach(string file in Directory.GetFiles(path, "*.*", SearchOption.AllDirectories)) {
      string ext = Path.GetExtension(file).ToLower();
      if(ext == ".ani" || ext == ".cur") {
        string outputPrefix = file + ".";
        if(File.Exists(outputPrefix + "0.png")) continue;
        IntPtr hImg = LoadImage(IntPtr.Zero, file, 2, 48, 48, 0x10);
        if(hImg != IntPtr.Zero) {
          byte[] lastBuffer = null;
          for(int i = 0; i < 64; i++) {
            using(Bitmap bmp = new Bitmap(48, 48)) {
              using(Graphics g = Graphics.FromImage(bmp)) {
                IntPtr hdc = g.GetHdc();
                DrawIconEx(hdc, 0, 0, hImg, 48, 48, (uint)i, IntPtr.Zero, 0x03);
                g.ReleaseHdc(hdc);
              }
              using(MemoryStream ms = new MemoryStream()) {
                bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                byte[] currentBuffer = ms.ToArray();
                if(lastBuffer != null && System.Collections.StructuralComparisons.StructuralEqualityComparer.Equals(lastBuffer, currentBuffer)) break;
                File.WriteAllBytes(outputPrefix + i + ".png", currentBuffer);
                lastBuffer = currentBuffer;
              }
            }
            if(ext == ".cur") break;
          }
        }
      }
    }
  }
}
"@
Add-Type -TypeDefinition $definition -ReferencedAssemblies System.Drawing
[CursorExporter]::ProcessDirectory('${sanitizedPath}')
`;
  const encoded = Buffer.from(pshScript, 'utf16le').toString('base64');
  try {
    await exec(`powershell.exe -NoProfile -EncodedCommand ${encoded}`);
  } catch (e) { }

  if (watcher) watcher.close();
  if (senderWindow && !senderWindow.isDestroyed()) {
    senderWindow.webContents.send('install-progress', { done: totalFiles, total: totalFiles, label: 'Done!' });
  }
}

module.exports = {
  broadcastSystemCursorUpdate,
  extractPreviewFrames
};
