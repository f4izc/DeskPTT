// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
// DeskPTT — process principal Electron
// Gère : réglages persistants, port COM (PTT par RTS/DTR), raccourci global,
// logique PTT (maintenir / bascule), minuterie TOT.

const { app, BrowserWindow, ipcMain, Menu, screen, shell } = require('electron');
const pkg = require('./package.json');
const path = require('path');
const fs = require('fs');

// Le son doit démarrer sans clic préalable dans la fenêtre.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let SerialPort = null;
try {
  ({ SerialPort } = require('serialport'));
} catch (e) {
  console.error('serialport indisponible :', e.message);
}

let uIOhook = null;
let UiohookKey = null;
try {
  ({ uIOhook, UiohookKey } = require('uiohook-napi'));
} catch (e) {
  console.error('uiohook-napi indisponible :', e.message);
}

// ---------------------------------------------------------------- Réglages

const DEFAULTS = {
  headsetIn: null,   // { id, label }
  headsetOut: null,
  rigIn: null,
  rigOut: null,
  serialPath: null,
  pttLine: 'rts',    // 'rts' | 'dtr'
  mode: 'hold',      // 'hold' | 'toggle'
  totSeconds: 180,   // 0 = désactivé
  tailMs: 150,       // maintien de la ligne PTT après coupure audio
  hotkey: null,      // { kind: 'key'|'mouse', code, label }
  rxVolume: 1,
  txGainDb: -26,     // atténuation vers l'entrée micro du poste
  muteRxDuringTx: true,
  rxNotch: true,     // coupe-bande 1/2/3/4 kHz contre le bruit de trame USB
  view: 'advanced',  // 'advanced' | 'compact'
  lang: 'en',        // 'en' | 'fr'
  noiseSuppression: false,
  // 'ptt' : DeskPTT passe le poste en émission par RTS/DTR du port COM.
  // 'vox' : DeskPTT ne commande jamais l'émission (port COM fermé) ; le bouton
  //         ouvre ou coupe le son envoyé au poste, dont le VOX déclenche l'émission.
  txMode: 'ptt',
};

const isVox = () => settings.txMode === 'vox';

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');
let settings = { ...DEFAULTS };

// L'application s'appelait « PC Radio » : on reprend ses réglages au premier
// lancement de DeskPTT (le dossier de l'ancien nom n'est pas modifié).
function migrateLegacySettings() {
  const legacy = path.join(app.getPath('appData'), 'PC Radio', 'settings.json');
  if (fs.existsSync(settingsFile()) || !fs.existsSync(legacy)) return;
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.copyFileSync(legacy, settingsFile());
  } catch (e) {
    console.error('Reprise des réglages PC Radio impossible :', e.message);
  }
}

function loadSettings() {
  migrateLegacySettings();
  try {
    const saved = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    // Ancien réglage linéaire (txVolume) → dB
    if (saved.txGainDb === undefined && typeof saved.txVolume === 'number' && saved.txVolume > 0) {
      saved.txGainDb = Math.max(-50, Math.min(6, Math.round(40 * Math.log10(saved.txVolume)) / 2));
    }
    delete saved.txVolume;
    settings = { ...DEFAULTS, ...saved };
  } catch {
    settings = { ...DEFAULTS };
  }
}

let saveTimer = null;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
      fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2));
    } catch (e) {
      console.error('Sauvegarde des réglages impossible :', e.message);
    }
  }, 300);
}

// ---------------------------------------------------------------- Fenêtre

let win = null;
function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 780,
    minWidth: 380,
    minHeight: 300,
    show: false, // affichée une fois la hauteur ajustée au contenu (fitHeight)
    backgroundColor: '#0f1418',
    title: 'DeskPTT',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // le son et le PTT doivent tourner fenêtre réduite
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Sécurité : si l'interface plante ou se recharge, on coupe l'émission.
  win.webContents.on('render-process-gone', () => forcePttOff('interface fermée'));
  win.webContents.on('did-start-navigation', () => forcePttOff('rechargement'));
  win.on('closed', () => { win = null; });
  // Filet de sécurité : la fenêtre s'affiche même si l'ajustement n'arrive pas.
  setTimeout(() => { if (win && !win.isVisible()) { win.center(); win.show(); } }, 5000);
}

// ---------------------------------------------------------------- Port COM

let port = null;
let portStatus = { open: false, path: null, error: null };

function setPortStatus(s) {
  portStatus = { ...portStatus, ...s };
  send('serial-status', portStatus);
}

function writeLine(on) {
  return new Promise((resolve) => {
    if (isVox() || !port || !port.isOpen) return resolve(false);
    const signals = settings.pttLine === 'dtr'
      ? { dtr: on, rts: false }
      : { rts: on, dtr: false };
    port.set(signals, (err) => {
      if (err) {
        setPortStatus({ error: { key: 'err.pttRefused', args: { msg: err.message } } });
        return resolve(false);
      }
      resolve(true);
    });
  });
}

async function closePort() {
  if (!port) return;
  const p = port;
  port = null;
  await new Promise((resolve) => {
    if (!p.isOpen) return resolve();
    p.set({ rts: false, dtr: false }, () => p.close(() => resolve()));
  });
  setPortStatus({ open: false, path: null });
}

async function openPort(portPath) {
  await closePort();
  settings.serialPath = portPath || null;
  saveSettings();
  if (!portPath) return setPortStatus({ open: false, path: null, error: null });
  // Mode VOX : le port est mémorisé mais jamais ouvert (aucune ligne PTT pilotée).
  if (isVox()) return setPortStatus({ open: false, path: null, error: null });
  if (!SerialPort) return setPortStatus({ error: { key: 'err.serialModule' } });

  const p = new SerialPort({ path: portPath, baudRate: 9600, autoOpen: false });
  p.open((err) => {
    if (err) {
      const busy = /access denied|accès refusé|busy|EBUSY|ouvert/i.test(err.message);
      setPortStatus({
        open: false,
        path: null,
        // Messages traduits par l'interface (renderer/i18n.js).
        error: busy
          ? { key: 'err.portBusy', args: { port: portPath } }
          : { key: 'err.portOpen', args: { port: portPath, msg: err.message } },
      });
      return;
    }
    port = p;
    // Windows lève RTS/DTR à l'ouverture : on les retombe tout de suite
    // pour ne pas passer le poste en émission.
    p.set({ rts: false, dtr: false }, () => {
      setPortStatus({ open: true, path: portPath, error: null });
      if (pttOn) writeLine(true);
    });
  });
  p.on('close', () => {
    if (port === p) {
      port = null;
      forcePttOff('port COM déconnecté');
      setPortStatus({ open: false, path: null, error: { key: 'err.portGone', args: { port: portPath } } });
    }
  });
  p.on('error', (e) => setPortStatus({ error: { key: 'err.generic', args: { msg: e.message } } }));
}

async function listPorts() {
  if (!SerialPort) return [];
  try {
    const ports = await SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      label: p.friendlyName || [p.path, p.manufacturer].filter(Boolean).join(' — '),
      // Puce Silicon Labs CP210x (VID 10C4), courante sur les interfaces radio
      likelyInterface: /^10c4$/i.test(p.vendorId || '') || /silicon lab|cp210/i.test(`${p.manufacturer} ${p.friendlyName}`),
    }));
  } catch (e) {
    setPortStatus({ error: { key: 'err.listPorts', args: { msg: e.message } } });
    return [];
  }
}

// ---------------------------------------------------------------- Logique PTT

let pttOn = false;
let pttSince = 0;
let totTimer = null;
let tailTimer = null;

function setPtt(on, reason) {
  if (on === pttOn) return;
  pttOn = on;
  clearTimeout(totTimer);

  if (on) {
    clearTimeout(tailTimer);
    pttSince = Date.now();
    writeLine(true);
    if (settings.totSeconds > 0) {
      totTimer = setTimeout(() => {
        setPtt(false, 'tot');
        send('tot-expired', settings.totSeconds);
      }, settings.totSeconds * 1000);
    }
  } else {
    tcallOwnsPtt = false;
    // L'audio est coupé immédiatement ; la ligne PTT retombe après la traîne
    // pour laisser passer les derniers échantillons.
    clearTimeout(tailTimer);
    tailTimer = setTimeout(() => { if (!pttOn) writeLine(false); }, Math.max(0, settings.tailMs));
  }
  send('ptt-state', { on, since: pttSince, totSeconds: settings.totSeconds, reason: reason || null });
}

function forcePttOff(reason) {
  if (pttOn) setPtt(false, reason);
  else writeLine(false);
}

// Une "pression" vient du bouton de l'interface ou du raccourci global.
let pressHeld = false;
function pttPress(source) {
  if (pressHeld) return; // répétition automatique du clavier
  pressHeld = true;
  if (settings.mode === 'toggle') setPtt(!pttOn, source);
  else setPtt(true, source);
}
function pttRelease(source) {
  if (!pressHeld) return;
  pressHeld = false;
  if (settings.mode === 'hold') setPtt(false, source);
}

// T-CALL : toujours momentané (émission + tonalité tant que le bouton est
// maintenu). Si le PTT était déjà actif, il n'est pas coupé au relâchement.
let tcallOwnsPtt = false;
function tcallPress() {
  if (pttOn) return;
  setPtt(true, 'tcall');
  tcallOwnsPtt = true;
}
function tcallRelease() {
  if (tcallOwnsPtt) setPtt(false, 'tcall');
}

// ---------------------------------------------------------------- Vues

const ADVANCED_SIZE = { width: 900, minWidth: 380, minHeight: 300 };
const COMPACT_WIDTH = 460;
let advancedWidth = ADVANCED_SIZE.width;

// Étape 1 : la vue fixe la largeur. Étape 2 (fitHeight) : l'interface mesure la
// hauteur de son contenu à cette largeur et la fenêtre s'y ajuste, sans dépasser
// l'écran, pour éviter la barre de défilement.
function applyView(view) {
  if (!win) return;
  const contentH = win.getContentSize()[1];
  if (view === 'compact') {
    // On mémorise la largeur de la vue avancée pour la retrouver au retour.
    if (settings.view !== 'compact') advancedWidth = win.getSize()[0];
    win.setMinimumSize(340, 200);
    win.setContentSize(COMPACT_WIDTH, contentH);
  } else {
    win.setMinimumSize(ADVANCED_SIZE.minWidth, ADVANCED_SIZE.minHeight);
    if (settings.view === 'compact') win.setSize(advancedWidth, win.getSize()[1]);
  }
  settings.view = view;
  saveSettings();
}

function fitHeight(contentHeight) {
  if (!win || !(contentHeight > 0)) return;
  const bounds = win.getBounds();
  const [contentW, contentH] = win.getContentSize();
  const frame = bounds.height - contentH; // barre de titre et bordures
  const area = screen.getDisplayMatching(bounds).workArea;
  const target = Math.min(Math.ceil(contentHeight), area.height - frame);
  win.setContentSize(contentW, target);
  if (!win.isVisible()) { win.center(); win.show(); return; } // premier affichage
  // Si la fenêtre dépasse en bas de l'écran, on la remonte.
  const b = win.getBounds();
  const bottom = area.y + area.height;
  if (b.y + b.height > bottom) win.setPosition(b.x, Math.max(area.y, bottom - b.height));
}

// ---------------------------------------------------------------- Raccourci global

let capturing = false;
let keyNames = {};
if (UiohookKey) {
  for (const [name, code] of Object.entries(UiohookKey)) {
    if (!(code in keyNames)) keyNames[code] = name;
  }
}
// Libellés de secours ; l'interface traduit elle-même les boutons de souris.
const MOUSE_NAMES = { 3: 'Middle click', 4: 'Mouse button 4', 5: 'Mouse button 5' };

function matchHotkey(kind, code) {
  const h = settings.hotkey;
  return h && h.kind === kind && h.code === code;
}

// Les événements arrivent de deux sources :
//  - le hook système (uiohook), quand une AUTRE application a le focus ;
//  - l'interface elle-même (keydown / mousedown DOM), quand la fenêtre DeskPTT
//    a le focus : dans ce cas le hook système ne reçoit rien sous Windows.
// Une même pression peut donc arriver deux fois : pttPress / pttRelease sont
// idempotents, et après une capture on ignore la touche jusqu'à son relâchement.
let swallow = null; // { kind, code, until } : touche qui vient d'être capturée

const isSwallowed = (kind, code) =>
  swallow && swallow.kind === kind && swallow.code === code && Date.now() < swallow.until;

function inputDown(kind, code) {
  if (kind === 'mouse' && code < 3) return; // clic gauche et droit réservés
  if (isSwallowed(kind, code)) return;
  if (capturing) {
    capturing = false;
    // Ignore la même touche (doublon, répétition) jusqu'à son relâchement, 3 s max.
    swallow = { kind, code, until: Date.now() + 3000 };
    if (kind === 'key' && UiohookKey && code === UiohookKey.Escape) return send('hotkey-changed', settings.hotkey);
    const label = kind === 'key'
      ? keyNames[code] || `Key ${code}`
      : MOUSE_NAMES[code] || `Mouse button ${code}`;
    settings.hotkey = { kind, code, label };
    saveSettings();
    return send('hotkey-changed', settings.hotkey);
  }
  if (matchHotkey(kind, code)) pttPress('hotkey');
}

function inputUp(kind, code) {
  if (isSwallowed(kind, code)) { swallow = null; return; }
  if (matchHotkey(kind, code)) pttRelease('hotkey');
}

// Code physique DOM (KeyboardEvent.code) → code uiohook. Les deux désignent la
// position physique de la touche, indépendamment de la disposition (AZERTY…).
const DOM_ALIASES = {
  ControlLeft: 'Ctrl', ControlRight: 'CtrlRight', ShiftLeft: 'Shift', ShiftRight: 'ShiftRight',
  AltLeft: 'Alt', AltRight: 'AltRight', MetaLeft: 'Meta', MetaRight: 'MetaRight',
};
function domCodeToKeycode(code) {
  if (!UiohookKey || typeof code !== 'string') return null;
  const name = DOM_ALIASES[code] || code.replace(/^Key(?=[A-Z]$)/, '').replace(/^Digit(?=\d$)/, '');
  return Object.prototype.hasOwnProperty.call(UiohookKey, name) ? UiohookKey[name] : null;
}
// Bouton souris DOM (MouseEvent.button) → numéro uiohook.
const DOM_MOUSE = { 1: 3, 3: 4, 4: 5 };

function startHook() {
  if (!uIOhook) return false;
  uIOhook.on('keydown', (e) => inputDown('key', e.keycode));
  uIOhook.on('keyup', (e) => inputUp('key', e.keycode));
  uIOhook.on('mousedown', (e) => inputDown('mouse', e.button));
  uIOhook.on('mouseup', (e) => inputUp('mouse', e.button));
  try {
    uIOhook.start();
    return true;
  } catch (e) {
    console.error('Démarrage du raccourci global impossible :', e.message);
    return false;
  }
}

// ---------------------------------------------------------------- IPC

let hookOk = false;

function registerIpc() {
  // Liens de la fenêtre À propos : uniquement vers le dépôt du projet.
  ipcMain.handle('open-external', (_e, url) => {
    const home = pkg.homepage;
    if (home && typeof url === 'string' && (url === home || url.startsWith(home + '/'))) shell.openExternal(url);
  });

  ipcMain.handle('get-state', () => ({
    version: app.getVersion(),
    homepage: pkg.homepage || null,
    settings,
    hookOk,
    serialOk: !!SerialPort,
    portStatus,
    ptt: { on: pttOn, since: pttSince, totSeconds: settings.totSeconds },
  }));

  ipcMain.handle('save-settings', (_e, patch) => {
    const allowed = Object.keys(DEFAULTS).filter((k) => k !== 'hotkey' && k !== 'serialPath');
    const prevTxMode = settings.txMode;
    for (const k of allowed) if (k in patch) settings[k] = patch[k];
    if ('txMode' in patch) settings.txMode = patch.txMode === 'vox' ? 'vox' : 'ptt';
    if (settings.txMode !== prevTxMode) {
      // Changement PTT ↔ VOX : on repart toujours de « pas d'émission » (MUTE).
      pressHeld = false;
      setPtt(false, 'mode');
      if (isVox()) closePort().then(() => setPortStatus({ error: null }));
      else openPort(settings.serialPath);
    }
    if (patch.pttLine && port && port.isOpen) {
      // Changement de ligne : on retombe tout, puis on réapplique l'état.
      port.set({ rts: false, dtr: false }, () => writeLine(pttOn));
    }
    if ('mode' in patch) { pressHeld = false; setPtt(false, 'mode'); }
    saveSettings();
    return settings;
  });

  ipcMain.handle('list-ports', () => listPorts());
  ipcMain.handle('open-port', (_e, p) => openPort(p));

  ipcMain.on('ptt-press', () => pttPress('button'));
  ipcMain.on('ptt-release', () => pttRelease('button'));
  ipcMain.on('ptt-off', () => { pressHeld = false; setPtt(false, 'button'); });
  ipcMain.on('tcall-press', () => tcallPress());
  ipcMain.on('tcall-release', () => tcallRelease());
  ipcMain.handle('set-view', (_e, view) => applyView(view === 'compact' ? 'compact' : 'advanced'));
  ipcMain.handle('fit-height', (_e, h) => {
    fitHeight(h);
  });

  // Touches et boutons reçus par la fenêtre quand elle a le focus.
  ipcMain.on('window-input', (_e, ev) => {
    if (!ev) return;
    if (ev.type === 'key') {
      const code = domCodeToKeycode(ev.code);
      if (code == null) return;
      (ev.down ? inputDown : inputUp)('key', code);
    } else if (ev.type === 'mouse') {
      const code = DOM_MOUSE[ev.button];
      if (code == null) return;
      (ev.down ? inputDown : inputUp)('mouse', code);
    }
  });

  // La capture marche aussi sans hook système (fenêtre au premier plan).
  ipcMain.handle('capture-hotkey', () => { capturing = !!UiohookKey; swallow = null; return capturing; });
  ipcMain.handle('cancel-capture', () => { capturing = false; });
  ipcMain.handle('clear-hotkey', () => {
    settings.hotkey = null;
    saveSettings();
    return null;
  });
}

// ---------------------------------------------------------------- Cycle de vie

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  app.whenReady().then(() => {
    loadSettings();
    registerIpc();
    hookOk = startHook();
    createWindow();
    if (settings.serialPath) openPort(settings.serialPath);
  });

  let quitting = false;
  app.on('before-quit', (e) => {
    if (quitting) return;
    e.preventDefault();
    quitting = true;
    clearTimeout(totTimer);
    clearTimeout(tailTimer);
    pttOn = false;
    try { if (uIOhook) uIOhook.stop(); } catch {}
    clearTimeout(saveTimer);
    try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch {}
    closePort().finally(() => app.exit(0));
  });

  app.on('window-all-closed', () => app.quit());
}
