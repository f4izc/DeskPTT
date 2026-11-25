// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
//
// Génère build/icon.png (512 px) et build/icon.ico (16 à 256 px, entrées PNG)
// à partir de build/icon.svg, en rasterisant le SVG avec Chromium (Electron).
// Usage (depuis la racine du dépôt) :
//   node_modules\electron\dist\electron.exe tools\gen-icons

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const svg = fs.readFileSync(path.join(root, 'build', 'icon.svg'), 'utf8');
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

app.disableHardwareAcceleration();

// Rendu unique en 1024 px, puis réduction de qualité pour chaque taille.
const MASTER = 1024;
let master;
async function renderMaster() {
  const w = new BrowserWindow({
    show: false, width: MASTER, height: MASTER, useContentSize: true, frame: false,
    webPreferences: { offscreen: true },
  });
  w.webContents.setZoomFactor(1);
  await w.loadFile(path.join(root, 'build', 'icon.svg'));
  await new Promise((r) => setTimeout(r, 500));
  const img = await w.webContents.capturePage({ x: 0, y: 0, width: MASTER, height: MASTER });
  w.destroy();
  return img;
}
async function render(size) {
  if (!master) master = await renderMaster();
  return master.resize({ width: size, height: size, quality: 'best' }).toPNG();
}

// ICO : en-tête 6 octets + 16 octets par entrée, puis les PNG bruts.
function buildIco(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

app.whenReady().then(async () => {
  try {
    const pngs = [];
    for (const size of ICO_SIZES) pngs.push({ size, data: await render(size) });
    fs.writeFileSync(path.join(root, 'build', 'icon.ico'), buildIco(pngs));
    fs.writeFileSync(path.join(root, 'build', 'icon.png'), await render(512));
    console.log('build/icon.ico (' + ICO_SIZES.join(', ') + ' px) and build/icon.png (512 px) written');
  } catch (e) {
    console.error(e); process.exitCode = 1;
  }
  app.quit();
});
