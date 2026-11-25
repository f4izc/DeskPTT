// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
// DeskPTT — interface et routage audio
//   Réception : entrée Digirig  → sortie casque
//   Émission  : micro casque    → sortie Digirig (ouverte seulement en PTT)

const api = window.radio;
const $ = (id) => document.getElementById(id);

let settings = {};
let pttOn = false;
let pttSince = 0;
let totSeconds = 0;

const rx = { ctx: null, stream: null, gain: null, mute: null, analyser: null };
const tx = { ctx: null, stream: null, gain: null, gate: null, analyser: null };

const DIGIRIG_RE = /usb (pnp )?(audio|sound)|digirig|c-media|cm10\d|cm11\d/i;
const VIRTUAL_RE = /cable|virtual|voicemeeter|vb-audio|stereo mix|mixage/i;

// ---------------------------------------------------------------- Bandeau

function banner(msg) {
  const b = $('banner');
  const changed = b.hidden !== !msg || b.textContent !== (msg || '');
  b.textContent = msg || '';
  b.hidden = !msg;
  // La fenêtre s'ajuste à l'apparition / disparition du bandeau (une fois affichée).
  if (changed && windowFitted) fitWindow();
}

// ---------------------------------------------------------------- Périphériques audio

const deviceSelects = ['rigIn', 'headsetOut', 'headsetIn', 'rigOut'];

function pickSaved(list, saved) {
  if (!saved) return null;
  return list.find((d) => d.deviceId === saved.id) || list.find((d) => d.label === saved.label) || null;
}

function guessDefault(key, list) {
  const isRig = key.startsWith('rig');
  const real = list.filter((d) => d.deviceId !== 'default' && d.deviceId !== 'communications');
  if (isRig) return real.find((d) => DIGIRIG_RE.test(d.label)) || null;
  // Casque : jamais le Digirig, même s'il est le périphérique par défaut de Windows.
  const ok = (d) => !DIGIRIG_RE.test(d.label) && !VIRTUAL_RE.test(d.label);
  const def = list.find((d) => d.deviceId === 'default');
  if (def && ok(def)) return def;
  return real.find(ok) || null;
}

async function refreshDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  let changed = false;

  for (const key of deviceSelects) {
    const sel = $(key);
    const list = devices.filter((d) => d.kind === sel.dataset.kind);
    const saved = settings[key];
    const found = pickSaved(list, saved);

    sel.innerHTML = '';
    sel.append(new Option(t('dev.none'), ''));
    for (const d of list) {
      const label = d.label || `${d.kind} ${d.deviceId.slice(0, 6)}`;
      sel.append(new Option(label, d.deviceId));
    }

    if (saved && !found) {
      // Périphérique mémorisé débranché : on garde le choix, il reviendra au rebranchement.
      sel.append(new Option(t('dev.unplugged', { label: saved.label }), saved.id));
      sel.value = saved.id;
      continue;
    }
    const current = found || guessDefault(key, list);
    sel.value = current ? current.deviceId : '';

    const val = current ? { id: current.deviceId, label: current.label } : null;
    if (JSON.stringify(val) !== JSON.stringify(settings[key] || null)) {
      settings[key] = val;
      changed = true;
    }
  }
  if (changed) await api.saveSettings(pick(settings, deviceSelects));
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

const sinkOf = (id) => (!id || id === 'default' ? '' : id);

async function openMic(deviceId, processing) {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: !!processing,
      channelCount: 1,
    },
  });
}

async function makeContext(sinkId) {
  const ctx = new AudioContext({ latencyHint: 'interactive', sinkId: sinkOf(sinkId) });
  if (ctx.state !== 'running') await ctx.resume().catch(() => {});
  return ctx;
}

function teardown(chain) {
  if (chain.stream) chain.stream.getTracks().forEach((tr) => tr.stop());
  if (chain.ctx) chain.ctx.close().catch(() => {});
  for (const k of Object.keys(chain)) chain[k] = null;
}

async function startRx() {
  teardown(rx);
  const inId = settings.rigIn && settings.rigIn.id;
  const outId = settings.headsetOut && settings.headsetOut.id;
  if (!inId || !outId) return;
  try {
    rx.stream = await openMic(inId, false);
    rx.ctx = await makeContext(outId);
    const src = rx.ctx.createMediaStreamSource(rx.stream);
    rx.analyser = rx.ctx.createAnalyser();
    rx.analyser.fftSize = 1024;
    rx.gain = rx.ctx.createGain();
    rx.gain.gain.value = settings.rxVolume;
    rx.mute = rx.ctx.createGain();
    rx.mute.gain.value = pttOn && settings.muteRxDuringTx ? 0 : 1;
    // Filtres coupe-bande contre le sifflement USB : bruit à 1 kHz (une trame
    // USB par milliseconde) et ses harmoniques, capté par la puce son du Digirig.
    let node = src;
    rx.notches = [];
    for (const f of [1000, 2000, 3000, 4000]) {
      const n = rx.ctx.createBiquadFilter();
      n.type = 'notch';
      n.frequency.value = f;
      n.Q.value = 8;
      rx.notches.push(n);
      node = node.connect(n);
    }
    // Harmoniques plus hautes (5 kHz, 14 kHz…) : le son radio ne dépasse pas ~3 kHz.
    const lp = rx.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3400;
    lp.Q.value = 0.707;
    rx.lowpass = lp;
    node = node.connect(lp);
    wireRxFilter();
    node.connect(rx.analyser);
    node.connect(rx.gain).connect(rx.mute).connect(rx.ctx.destination);
  } catch (e) {
    teardown(rx);
    banner(t('err.rxOpen', { msg: e.message }));
  }
}

async function startTx() {
  teardown(tx);
  const inId = settings.headsetIn && settings.headsetIn.id;
  const outId = settings.rigOut && settings.rigOut.id;
  if (!inId || !outId) return;
  try {
    tx.stream = await openMic(inId, settings.noiseSuppression);
    tx.ctx = await makeContext(outId);
    const src = tx.ctx.createMediaStreamSource(tx.stream);
    tx.analyser = tx.ctx.createAnalyser();
    tx.analyser.fftSize = 1024;
    tx.gain = tx.ctx.createGain();
    tx.gain.gain.value = dbToGain(settings.txGainDb);
    tx.gate = tx.ctx.createGain();
    tx.gate.gain.value = pttOn ? 1 : 0;
    // Le vumètre montre le niveau du micro (avant atténuation) : il sert à
    // vérifier que le micro capte bien ; le réglage en dB dose ce qui part au poste.
    src.connect(tx.analyser);
    // Le micro passe par tx.mic (coupé pendant le T-CALL pour une tonalité propre).
    tx.mic = tx.ctx.createGain();
    tx.mic.gain.value = toneOn ? 0 : 1;
    src.connect(tx.mic).connect(tx.gain);
    // Tonalité 1750 Hz, toujours active mais muette hors T-CALL. Elle passe par
    // le même réglage de niveau que la voix, puis par la porte PTT.
    tx.osc = tx.ctx.createOscillator();
    tx.osc.type = 'sine';
    tx.osc.frequency.value = TONE_HZ;
    tx.tone = tx.ctx.createGain();
    tx.tone.gain.value = toneOn ? TONE_LEVEL : 0;
    tx.osc.connect(tx.tone).connect(tx.gain);
    tx.osc.start();
    tx.gain.connect(tx.gate).connect(tx.ctx.destination);
  } catch (e) {
    teardown(tx);
    banner(t('err.txOpen', { msg: e.message }));
  }
}

function ramp(node, ctx, value) {
  if (!node || !ctx) return;
  node.gain.cancelScheduledValues(ctx.currentTime);
  node.gain.setTargetAtTime(value, ctx.currentTime, 0.004);
}

const dbToGain = (db) => Math.pow(10, db / 20);

// ---------------------------------------------------------------- T-CALL

const TONE_HZ = 1750;
const TONE_LEVEL = 0.35; // ≈ −9 dBFS avant le réglage « Niveau vers le poste »
let toneOn = false;

function setTone(on) {
  toneOn = on;
  ramp(tx.tone, tx.ctx, on ? TONE_LEVEL : 0);
  ramp(tx.mic, tx.ctx, on ? 0 : 1);
  $('tcall').classList.toggle('on', on);
  $('tcall').setAttribute('aria-pressed', String(on));
}

function bindTcallButton() {
  const b = $('tcall');
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    b.setPointerCapture(e.pointerId);
    setTone(true);
    api.tcallPress();
  });
  const up = () => {
    if (!toneOn) return;
    setTone(false);
    api.tcallRelease();
  };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  b.addEventListener('keydown', (e) => e.preventDefault());
}

// Active ou neutralise les filtres anti-sifflement (un notch à Q ~0 = transparent
// n'existe pas, on passe donc le type en 'allpass', qui ne modifie pas le niveau).
function wireRxFilter() {
  if (!rx.notches) return;
  for (const n of rx.notches) n.type = settings.rxNotch ? 'notch' : 'allpass';
  if (rx.lowpass) rx.lowpass.frequency.value = settings.rxNotch ? 3400 : 20000;
}

// Après l'émission, l'écoute ne revient qu'une fois le PTT retombé (traîne)
// plus une marge : le poste et le Digirig produisent des transitoires au
// passage émission → réception, qu'on ne veut pas entendre dans le casque.
const RX_RETURN_MARGIN_MS = 400;

function applyPttAudio() {
  ramp(tx.gate, tx.ctx, pttOn ? 1 : 0);
  if (!rx.mute || !rx.ctx) return;
  if (!settings.muteRxDuringTx) return ramp(rx.mute, rx.ctx, 1);
  if (pttOn) return ramp(rx.mute, rx.ctx, 0);
  const delay = (Math.max(0, settings.tailMs) + RX_RETURN_MARGIN_MS) / 1000;
  rx.mute.gain.cancelScheduledValues(rx.ctx.currentTime);
  rx.mute.gain.setValueAtTime(0, rx.ctx.currentTime);
  rx.mute.gain.setTargetAtTime(1, rx.ctx.currentTime + delay, 0.03);
}

// ---------------------------------------------------------------- Vumètres

const buf = new Float32Array(1024);
function level(analyser) {
  if (!analyser) return 0;
  analyser.getFloatTimeDomainData(buf);
  let peak = 0;
  for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const db = 20 * Math.log10(peak || 1e-6); // -60 dB → 0 %, 0 dB → 100 %
  return Math.max(0, Math.min(1, (db + 60) / 60));
}

function drawMeter(el, v) {
  el.style.width = (v * 100).toFixed(1) + '%';
  el.classList.toggle('hot', v > 0.85 && v <= 0.97);
  el.classList.toggle('clip', v > 0.97);
}

function tick() {
  const rxl = level(rx.analyser);
  const txl = level(tx.analyser);
  drawMeter($('rxMeter'), rxl);
  drawMeter($('txMeter'), txl);
  drawMeter($('rxMeterC'), rxl);
  drawMeter($('txMeterC'), txl);
  if (pttOn) {
    const s = Math.floor((Date.now() - pttSince) / 1000);
    const left = totSeconds > 0 ? t('ptt.tot', { s: Math.max(0, totSeconds - s) }) : '';
    $('pttSub').textContent = t(toneOn ? 'ptt.tone' : 'ptt.tx', { t: fmt(s) }) + left;
  }
  requestAnimationFrame(tick);
}
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ---------------------------------------------------------------- Vues

// Nom court d'un périphérique pour le résumé : « Microphone (2- USB PnP Sound
// Device) (0d8c:013c) » → « Digirig », « Haut-parleurs (Realtek(R) Audio) » → « Realtek(R) Audio ».
function shortName(dev) {
  if (!dev) return '—';
  if (DIGIRIG_RE.test(dev.label)) return 'Digirig';
  let s = dev.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '');
  const isDefault = /^(default|par défaut|communications?)\s*-\s*/i.test(s);
  s = s.replace(/^(default|par défaut|communications?)\s*-\s*/i, '');
  const m = s.match(/^[^(]*\((.*)\)\s*$/);
  if (m) s = m[1];
  s = s.replace(/^\d+-\s*/, '');
  return isDefault ? t('dev.default', { name: s }) : s;
}

// Display name of the hotkey (mouse buttons are translated).
function hotkeyName(h) {
  if (!h) return null;
  if (h.kind === 'mouse') return h.code === 3 ? t('mouse.3') : t('mouse.n', { n: h.code });
  return h.label;
}

function renderSummary() {
  $('sumRx').textContent = `${shortName(settings.rigIn)} → ${shortName(settings.headsetOut)}`;
  $('sumTx').textContent = `${shortName(settings.headsetIn)} → ${shortName(settings.rigOut)} · ${settings.txGainDb} dB`;
  $('sumPtt').textContent = t('sum.ptt', {
    line: settings.pttLine.toUpperCase(),
    mode: t(settings.mode === 'toggle' ? 'sum.toggle' : 'sum.hold'),
    key: hotkeyName(settings.hotkey) || t('key.noneLower'),
    tot: settings.totSeconds > 0 ? `${settings.totSeconds} s` : t('sum.off'),
  });
}

async function setView(view) {
  document.body.classList.toggle('compact', view === 'compact');
  $('viewAdvanced').classList.toggle('active', view !== 'compact');
  $('viewCompact').classList.toggle('active', view === 'compact');
  settings.view = view;
  renderSummary();
  await api.setView(view);
  await fitWindow();
}

// La fenêtre a pris la largeur de la vue : on mesure la hauteur du contenu à
// cette largeur (des textes peuvent passer sur deux lignes) et la fenêtre s'y
// ajuste, dans la limite de l'écran. Pas de barre de défilement si ça tient.
let windowFitted = false;

async function fitWindow() {
  // Mesure sans barre de défilement (elle réduirait la largeur et fausserait la hauteur).
  document.documentElement.style.overflow = 'hidden';
  await new Promise((r) => setTimeout(r, 50));
  // Bas réel du contenu (en-tête, bandeau éventuel et marges compris).
  const h = document.querySelector('main').getBoundingClientRect().bottom + window.scrollY;
  await api.fitHeight(h);
  // Si l'écran est trop petit pour tout afficher, la barre de défilement revient.
  document.documentElement.style.overflow = '';
}

// ---------------------------------------------------------------- About

function bindAbout(version, homepage) {
  const dlg = $('about');
  $('aboutVersion').textContent = t('about.version', { v: version || '' });
  if (homepage) {
    $('aboutLinks').hidden = false;
    $('linkSource').addEventListener('click', (e) => { e.preventDefault(); api.openExternal(homepage); });
    $('linkNotices').addEventListener('click', (e) => { e.preventDefault(); api.openExternal(`${homepage}/blob/main/THIRD_PARTY_NOTICES.md`); });
  }
  const sel = $('langSelect');
  for (const [code, name] of Object.entries(LANGS)) sel.append(new Option(name, code));
  sel.value = currentLang;
  sel.addEventListener('change', async () => {
    await api.saveSettings({ lang: sel.value });
    // Reload so every label, list and message is rebuilt in the new language
    // (the main process drops PTT on reload, for safety).
    location.reload();
  });
  $('aboutBtn').addEventListener('click', () => dlg.showModal());
  $('aboutClose').addEventListener('click', () => dlg.close());
  // Click on the backdrop closes the dialog.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

// ---------------------------------------------------------------- PTT

function renderPtt() {
  const b = $('ptt');
  b.classList.toggle('on', pttOn);
  b.setAttribute('aria-pressed', String(pttOn));
  if (!pttOn) $('pttSub').textContent = t('ptt.rx');
}

function renderHint() {
  const key = hotkeyName(settings.hotkey);
  const how = t(settings.mode === 'toggle' ? 'hint.toggle' : 'hint.hold');
  $('pttHint').textContent = key ? how + t('hint.key', { key }) : how;
}

function bindPttButton() {
  const b = $('ptt');
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    b.setPointerCapture(e.pointerId);
    api.pttPress();
  });
  const up = () => api.pttRelease();
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('lostpointercapture', up);
  // Ne pas déclencher le PTT par Espace/Entrée quand le bouton a le focus.
  b.addEventListener('keydown', (e) => e.preventDefault());
}

// ---------------------------------------------------------------- Port COM

async function refreshPorts() {
  const ports = await api.listPorts();
  const sel = $('serialPath');
  sel.innerHTML = '';
  sel.append(new Option(t('port.none'), ''));
  for (const p of ports) sel.append(new Option(p.label + (p.likelyDigirig ? '  ★ Digirig' : ''), p.path));

  if (settings.serialPath && ports.some((p) => p.path === settings.serialPath)) {
    sel.value = settings.serialPath;
  } else if (!settings.serialPath) {
    // Sélection automatique seulement s'il n'y a qu'un seul candidat.
    const candidates = ports.filter((p) => p.likelyDigirig);
    const guess = candidates.length === 1 ? candidates[0] : null;
    sel.value = '';
    if (candidates.length > 1) {
      banner(t('port.multi', { list: candidates.map((p) => p.path).join(', ') }));
    }
    if (guess) {
      sel.value = guess.path;
      settings.serialPath = guess.path;
      api.openPort(guess.path);
    }
  } else {
    // Port mémorisé absent (Digirig débranché ?) : on le garde en mémoire.
    sel.append(new Option(t('port.absent', { port: settings.serialPath }), settings.serialPath));
    sel.value = settings.serialPath;
  }
}

function renderSerial(s) {
  const chip = $('chipPort');
  if (s.open) {
    chip.textContent = t('chip.port', { port: s.path, line: settings.pttLine.toUpperCase() });
    chip.className = 'chip ok';
  } else {
    chip.textContent = t('chip.portOff');
    chip.className = 'chip bad';
  }
  banner(tMsg(s.error));
}

// ---------------------------------------------------------------- Raccourci

function renderHotkey(hookOk) {
  const label = $('hotkeyLabel');
  label.classList.remove('capturing');
  label.textContent = hotkeyName(settings.hotkey) || t('key.none');
  const chip = $('chipKey');
  chip.classList.remove('ok', 'bad');
  if (!hookOk) {
    chip.textContent = t('chip.keyNA');
    chip.classList.add('bad');
    $('assignKey').disabled = true;
  } else {
    chip.textContent = t('chip.key', { key: hotkeyName(settings.hotkey) || t('key.noneLower') });
    if (settings.hotkey) chip.classList.add('ok');
  }
  renderHint();
}

// Quand la fenêtre a le focus, le hook système de Windows ne reçoit pas les
// touches : la fenêtre les transmet elle-même (capture et PTT par raccourci).
const DOM_ALIASES = {
  ControlLeft: 'Ctrl', ControlRight: 'CtrlRight', ShiftLeft: 'Shift', ShiftRight: 'ShiftRight',
  AltLeft: 'Alt', AltRight: 'AltRight', MetaLeft: 'Meta', MetaRight: 'MetaRight',
};
const domKeyName = (code) => DOM_ALIASES[code] || code.replace(/^Key(?=[A-Z]$)/, '').replace(/^Digit(?=\d$)/, '');
const DOM_MOUSE = { 1: 3, 3: 4, 4: 5 }; // MouseEvent.button → numéro uiohook

function bindWindowInput() {
  const capturingNow = () => $('hotkeyLabel').classList.contains('capturing');
  const isHotkey = (e) => settings.hotkey && settings.hotkey.kind === 'key' && settings.hotkey.label === domKeyName(e.code);

  window.addEventListener('keydown', (e) => {
    // Pendant la capture, ou pour la touche PTT, la touche ne doit rien faire
    // d'autre dans la fenêtre (ex. Espace qui « cliquerait » un bouton).
    if (capturingNow() || isHotkey(e)) e.preventDefault();
    if (!e.repeat) api.windowInput({ type: 'key', code: e.code, down: true });
  }, true);
  window.addEventListener('keyup', (e) => {
    if (isHotkey(e)) e.preventDefault();
    api.windowInput({ type: 'key', code: e.code, down: false });
  }, true);
  window.addEventListener('mousedown', (e) => {
    if (!(e.button in DOM_MOUSE)) return;
    e.preventDefault(); // pas de défilement automatique au clic molette
    api.windowInput({ type: 'mouse', button: e.button, down: true });
  }, true);
  window.addEventListener('mouseup', (e) => {
    if (!(e.button in DOM_MOUSE)) return;
    api.windowInput({ type: 'mouse', button: e.button, down: false });
  }, true);
}

// ---------------------------------------------------------------- Réglages

function bindSettings(hookOk) {
  for (const key of deviceSelects) {
    $(key).addEventListener('change', async (e) => {
      const opt = e.target.selectedOptions[0];
      settings[key] = e.target.value ? { id: e.target.value, label: opt.textContent } : null;
      await api.saveSettings({ [key]: settings[key] });
      if (key === 'rigIn' || key === 'headsetOut') startRx(); else startTx();
    });
  }

  const vol = (key, chainName) => {
    const input = $(key);
    const out = $(key + 'Out');
    input.value = settings[key];
    out.textContent = Math.round(settings[key] * 100) + '%';
    input.addEventListener('input', () => {
      settings[key] = Number(input.value);
      out.textContent = Math.round(settings[key] * 100) + '%';
      const chain = chainName === 'rx' ? rx : tx;
      if (chain.gain) chain.gain.gain.setTargetAtTime(settings[key], chain.ctx.currentTime, 0.01);
    });
    input.addEventListener('change', () => api.saveSettings({ [key]: settings[key] }));
  };
  vol('rxVolume', 'rx');

  // Niveau d'émission en dB : la sortie du Digirig attaque l'entrée micro du
  // poste, il faut donc une forte atténuation et un réglage fin.
  const txIn = $('txGainDb');
  const txOut = $('txGainDbOut');
  const showDb = (v) => { txOut.textContent = (v > 0 ? '+' : '') + v.toFixed(1) + ' dB'; };
  txIn.value = settings.txGainDb;
  showDb(settings.txGainDb);
  txIn.addEventListener('input', () => {
    settings.txGainDb = Number(txIn.value);
    showDb(settings.txGainDb);
    if (tx.gain) tx.gain.gain.setTargetAtTime(dbToGain(settings.txGainDb), tx.ctx.currentTime, 0.01);
  });
  txIn.addEventListener('change', () => api.saveSettings({ txGainDb: settings.txGainDb }));

  const check = (key, after) => {
    $(key).checked = !!settings[key];
    $(key).addEventListener('change', async (e) => {
      settings[key] = e.target.checked;
      await api.saveSettings({ [key]: settings[key] });
      if (after) after();
    });
  };
  check('muteRxDuringTx', applyPttAudio);
  check('rxNotch', wireRxFilter);
  check('noiseSuppression', startTx);

  const select = (key, after) => {
    $(key).value = settings[key];
    $(key).addEventListener('change', async (e) => {
      settings[key] = e.target.value;
      await api.saveSettings({ [key]: settings[key] });
      if (after) after();
    });
  };
  select('pttLine', () => api.getState().then((s) => renderSerial(s.portStatus)));
  select('mode', renderHint);

  const number = (key, min, max) => {
    $(key).value = settings[key];
    $(key).addEventListener('change', async (e) => {
      const v = Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0)));
      e.target.value = v;
      settings[key] = v;
      await api.saveSettings({ [key]: v });
    });
  };
  number('totSeconds', 0, 3600);
  number('tailMs', 0, 1000);

  $('serialPath').addEventListener('change', (e) => {
    settings.serialPath = e.target.value || null;
    api.openPort(settings.serialPath);
  });
  $('refreshPorts').addEventListener('click', refreshPorts);

  $('assignKey').addEventListener('click', async () => {
    if (!(await api.captureHotkey())) return;
    const label = $('hotkeyLabel');
    label.textContent = t('key.capture');
    label.classList.add('capturing');
  });
  $('clearKey').addEventListener('click', async () => {
    await api.cancelCapture();
    settings.hotkey = await api.clearHotkey();
    renderHotkey(hookOk);
  });
}

// ---------------------------------------------------------------- Démarrage

async function init() {
  const state = await api.getState();
  settings = state.settings;
  setLang(settings.lang);
  applyStaticText();
  bindAbout(state.version, state.homepage);

  // Une première demande d'accès au micro est nécessaire pour obtenir les noms des périphériques.
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach((tr) => tr.stop());
  } catch (e) {
    banner(t('err.micDenied', { msg: e.message }));
  }

  await refreshDevices();
  bindSettings(state.hookOk);
  bindPttButton();
  bindTcallButton();
  bindWindowInput();
  $('viewAdvanced').addEventListener('click', () => setView('advanced'));
  $('viewCompact').addEventListener('click', () => setView('compact'));
  document.addEventListener('change', renderSummary);
  renderHotkey(state.hookOk);
  renderSerial(state.portStatus);
  if (!state.serialOk) banner(t('err.serialModule'));
  await refreshPorts();

  pttOn = state.ptt.on;
  pttSince = state.ptt.since;
  totSeconds = state.ptt.totSeconds;
  renderPtt();

  api.onPtt((p) => {
    pttOn = p.on;
    pttSince = p.since;
    totSeconds = p.totSeconds;
    applyPttAudio();
    renderPtt();
  });
  api.onTot((s) => banner(t('tot.expired', { s })));
  api.onSerialStatus(renderSerial);
  api.onHotkey((h) => { settings.hotkey = h; renderHotkey(state.hookOk); renderSummary(); });

  let devTimer = null;
  navigator.mediaDevices.addEventListener('devicechange', () => {
    clearTimeout(devTimer);
    devTimer = setTimeout(async () => {
      await refreshDevices();
      await Promise.all([startRx(), startTx()]);
      refreshPorts();
    }, 500);
  });

  await Promise.all([startRx(), startTx()]);
  requestAnimationFrame(tick);
  await setView(settings.view === 'compact' ? 'compact' : 'advanced');
  windowFitted = true;
}

init();
