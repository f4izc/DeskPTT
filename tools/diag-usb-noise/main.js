// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
//
// Diagnostic: listens to the interface input (USB PnP Sound Device) for 20 s and
// logs, every 0.5 s, the RMS level and the three strongest tones to result.txt.
// Usage (from the repository root):
//   node_modules\electron\dist\electron.exe tools\diag-usb-noise
//   set DIAG_FILTER=1 first to measure through DeskPTT's RX filters.
//   set DIAG_DEVICE=<regex> to measure another input (e.g. "realtek" for the PC microphone),
//   DIAG_SECONDS=<n> to change the duration, DIAG_MINHZ=<hz> to ignore peaks below that frequency.

const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const out = path.join(__dirname, 'result.txt');
fs.writeFileSync(out, '');
ipcMain.on('log', (_e, line) => { fs.appendFileSync(out, line + '\n'); console.log(line); });
ipcMain.on('done', () => app.quit());

app.whenReady().then(() => {
  const w = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
  const html = path.join(__dirname, 'index.html');
  const device = JSON.stringify(process.env.DIAG_DEVICE || '');
  const seconds = Number(process.env.DIAG_SECONDS) || 20;
  const minHz = Number(process.env.DIAG_MINHZ) || 0;
  fs.writeFileSync(html, `<script>const FILTER = ${process.env.DIAG_FILTER ? 'true' : 'false'}; const DEVICE = ${device}; const SECONDS = ${seconds}; const MIN_HZ = ${minHz}; (${renderer.toString()})()</script>`);
  w.loadFile(html);
});

function renderer() {
  const { ipcRenderer } = require('electron');
  const log = (s) => ipcRenderer.send('log', s);
  (async () => {
    try {
      const pre = await navigator.mediaDevices.getUserMedia({ audio: true });
      pre.getTracks().forEach((t) => t.stop());
      const devs = await navigator.mediaDevices.enumerateDevices();
      const dev = devs.find((d) => d.kind === 'audioinput' && !['default', 'communications'].includes(d.deviceId)
        && (DEVICE ? new RegExp(DEVICE, 'i') : /usb (pnp )?(audio|sound)|digirig|c-media/i).test(d.label));
      if (!dev) { log('Interface input not found'); return ipcRenderer.send('done'); }
      log('Input: ' + dev.label + (FILTER ? ' (through RX filters)' : ''));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: dev.deviceId }, echoCancellation: false, autoGainControl: false, noiseSuppression: false } });
      const ctx = new AudioContext();
      let node = ctx.createMediaStreamSource(stream);
      if (FILTER) {
        for (const f of [1000, 2000, 3000, 4000]) {
          const n = ctx.createBiquadFilter(); n.type = 'notch'; n.frequency.value = f; n.Q.value = 8; node = node.connect(n);
        }
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3400; node = node.connect(lp);
      }
      const an = ctx.createAnalyser(); an.fftSize = 8192; node.connect(an);
      const freq = new Float32Array(an.frequencyBinCount);
      const time = new Float32Array(an.fftSize);
      const hz = (i) => Math.round(i * ctx.sampleRate / an.fftSize);
      const t0 = performance.now();
      const iv = setInterval(() => {
        an.getFloatFrequencyData(freq); an.getFloatTimeDomainData(time);
        let rms = 0; for (const v of time) rms += v * v; rms = Math.sqrt(rms / time.length);
        const peaks = [];
        const first = Math.max(3, Math.ceil(MIN_HZ * an.fftSize / ctx.sampleRate));
        for (let i = first; i < freq.length - 1; i++) if (freq[i] > freq[i - 1] && freq[i] >= freq[i + 1]) peaks.push([freq[i], i]);
        peaks.sort((a, b) => b[0] - a[0]);
        const t = ((performance.now() - t0) / 1000).toFixed(1);
        log(`${t}s  RMS ${(20 * Math.log10(rms || 1e-9)).toFixed(1)} dBFS  peaks: ` + peaks.slice(0, 3).map(([db, i]) => `${hz(i)} Hz ${db.toFixed(0)} dB`).join(' | '));
        if (performance.now() - t0 > SECONDS * 1000) { clearInterval(iv); ipcRenderer.send('done'); }
      }, 500);
    } catch (e) { log('Error: ' + e.message); ipcRenderer.send('done'); }
  })();
}
