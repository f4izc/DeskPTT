// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Stephane Tauziede (F4IZC)
// DeskPTT — translations (English by default, French available).
// Static text: elements carrying data-i18n (textContent), data-i18n-title (title)
// or data-i18n-aria (aria-label). Dynamic text: t('key', { param }).

const STRINGS = {
  en: {
    'view.group': 'View',
    'view.advanced': 'Advanced',
    'view.compact': 'Compact',
    'about.button': 'About',

    'rx.title': 'Receive',
    'rx.sub': 'radio → computer',
    'rx.src': 'Radio audio (interface → PC)',
    'rx.srcHint': 'In Windows: the interface “Microphone” (often USB PnP Sound Device)',
    'rx.out': 'Computer speaker or headset',
    'rx.volume': 'Volume',
    'rx.mute': 'Mute listening while transmitting',
    'rx.notch': 'USB whistle filter (1 kHz and harmonics, 3.4 kHz low-pass)',

    'tx.title': 'Transmit',
    'tx.sub': 'computer → radio',
    'tx.mic': 'Computer microphone',
    'tx.out': 'To the radio (PC → interface)',
    'tx.outHint': 'In Windows: the interface “Speakers” (often USB PnP Sound Device)',
    'tx.level': 'Level to radio',
    'tx.micLevel': 'Microphone level',
    'tx.ns': 'Microphone noise reduction',

    'ptt.rx': 'Receive',
    'ptt.tx': 'TRANSMIT {t}',
    'ptt.tone': '1750 Hz TONE {t}',
    'ptt.tot': ' · cut in {s} s',
    'tcall.title': 'Hold: transmit + 1750 Hz tone',
    'hint.hold': 'Hold the button down to transmit.',
    'hint.toggle': 'Click once to transmit, once more to return to receive.',
    'hint.key': ' Hotkey: {key}.',

    'set.title': 'PTT settings',
    'set.port': 'Interface COM port',
    'set.refresh': 'Refresh list',
    'set.line': 'Control line',
    'set.rtsDefault': 'RTS (most interfaces)',
    'set.mode': 'Mode',
    'mode.hold': 'Hold to talk',
    'mode.toggle': 'Toggle (press = on/off)',
    'set.tot': 'Timeout, TOT (s, 0 = none)',
    'set.tail': 'PTT tail (ms)',
    'set.hotkey': 'Global hotkey',
    'set.assign': 'Assign…',
    'set.clear': 'Clear',
    'set.note': 'The hotkey works even when another application has the focus. It accepts a keyboard key or a mouse button (wheel click, side buttons).',

    'dev.none': '— None —',
    'dev.unplugged': '{label} (unplugged)',
    'dev.default': '{name} (default)',
    'dev.interface': 'Interface',
    'port.none': '— None (no PTT control) —',
    'port.absent': '{port} (absent)',
    'port.multi': 'Several Silicon Labs ports detected ({list}): choose the one of your interface (the same as in VARA).',
    'chip.port': 'COM port: {port} ({line})',
    'chip.portOff': 'COM port: not connected',
    'chip.key': 'Hotkey: {key}',
    'chip.keyNA': 'Global hotkey unavailable',
    'key.none': 'None',
    'key.noneLower': 'none',
    'key.capture': 'Press a key… (Esc = cancel)',
    'mouse.3': 'Middle click',
    'mouse.n': 'Mouse button {n}',

    'sum.ptt': 'PTT {line} · {mode} · hotkey {key} · TOT {tot}',
    'sum.hold': 'hold',
    'sum.toggle': 'toggle',
    'sum.off': 'off',

    'err.rxOpen': 'Receive: cannot open the selected devices ({msg}).',
    'err.txOpen': 'Transmit: cannot open the selected devices ({msg}).',
    'err.micDenied': 'Microphone access denied: {msg}',
    'err.serialModule': 'The serial module could not be loaded: PTT control is unavailable.',
    'err.pttRefused': 'PTT command rejected: {msg}',
    'err.portBusy': '{port} is already in use by another application (VARA?). Close it and try again.',
    'err.portOpen': 'Cannot open {port}: {msg}',
    'err.portGone': '{port} was disconnected.',
    'err.listPorts': 'Cannot list the ports: {msg}',
    'err.generic': '{msg}',
    'tot.expired': 'Transmission cut automatically after {s} s (TOT).',

    'about.title': 'About DeskPTT',
    'about.version': 'Version {v}',
    'about.tagline': 'Your FM rig, from your desk.',
    'about.compat': "Works with USB audio interfaces for radio that key PTT through a COM port (RTS/DTR), or with the radio's VOX.",
    'about.desc': "DeskPTT turns your Windows PC into a desk microphone and speaker for your VHF/UHF FM transceiver. Plug in your interface, pick your audio devices, and you're on the air — no extra hand mic needed.",
    'about.ham': 'Built by a ham, for hams.',
    'about.license': 'Free software, licensed under the Apache License 2.0.',
    'about.source': 'Source code',
    'about.notices': 'Third-party licenses',
    'about.author': 'F4IZC — vibe-coded with Claude',
    'about.disclaimerTitle': 'Disclaimer',
    'about.disclaimer': 'Experimental software for licensed radio amateurs, provided “as is”, without any warranty. You alone are responsible for how you use it: your station, your transmissions, compliance with your licence and local regulations, and any damage, interference or malfunction that may result. By using it, you accept that the author bears no liability whatsoever.',
    'about.lang': 'Language',
    'about.close': 'Close',
    'about.settings': 'Settings',
    'about.txMode': 'Transmit control',
    'txMode.ptt': 'PTT via the COM port',
    'txMode.vox': 'Radio VOX',
    'about.voxHint': "Radio VOX: for interfaces that cannot key the radio. DeskPTT then never keys the transmitter: the VOX / MUTE button opens or mutes the audio sent to the radio, and the radio's own VOX (to be enabled on the radio) starts transmitting.",

    'vox.on': 'VOX',
    'vox.off': 'MUTE',
    'vox.muted': 'Audio to radio muted',
    'vox.open': 'AUDIO OPEN {t}',
    'hint.voxHold': 'Hold the button down to send audio to the radio.',
    'hint.voxToggle': 'Click once to send audio to the radio, once more to mute it.',
    'chip.vox': 'Radio VOX mode',
    'sum.vox': 'VOX · {mode} · hotkey {key} · TOT {tot}',
    'set.titleVox': 'VOX settings',
  },

  fr: {
    'view.group': 'Vue',
    'view.advanced': 'Avancée',
    'view.compact': 'Compacte',
    'about.button': 'À propos',

    'rx.title': 'Réception',
    'rx.sub': 'poste → ordinateur',
    'rx.src': 'Son du poste (interface → PC)',
    'rx.srcHint': 'Dans Windows : le « Microphone » de l\'interface (souvent USB PnP Sound Device)',
    'rx.out': "Haut-parleur ou casque de l'ordinateur",
    'rx.volume': 'Volume',
    'rx.mute': "Couper l'écoute pendant l'émission",
    'rx.notch': 'Filtre anti-sifflement USB (1 kHz et harmoniques, passe-bas 3,4 kHz)',

    'tx.title': 'Émission',
    'tx.sub': 'ordinateur → poste',
    'tx.mic': "Microphone de l'ordinateur",
    'tx.out': 'Vers le poste (PC → interface)',
    'tx.outHint': 'Dans Windows : les « Haut-parleurs » de l\'interface (souvent USB PnP Sound Device)',
    'tx.level': 'Niveau vers le poste',
    'tx.micLevel': 'Niveau du micro',
    'tx.ns': 'Réduction de bruit du micro',

    'ptt.rx': 'Réception',
    'ptt.tx': 'ÉMISSION {t}',
    'ptt.tone': 'TONALITÉ 1750 Hz {t}',
    'ptt.tot': ' · coupure dans {s} s',
    'tcall.title': 'Maintenir : émission + tonalité 1750 Hz',
    'hint.hold': 'Maintenez le bouton enfoncé pour émettre.',
    'hint.toggle': 'Cliquez une fois pour émettre, encore une fois pour revenir en réception.',
    'hint.key': ' Raccourci : {key}.',

    'set.title': 'Réglages PTT',
    'set.port': "Port COM de l'interface",
    'set.refresh': 'Rafraîchir la liste',
    'set.line': 'Ligne de commande',
    'set.rtsDefault': 'RTS (la plupart des interfaces)',
    'set.mode': 'Mode',
    'mode.hold': 'Maintenir pour émettre',
    'mode.toggle': 'Bascule (appui = marche/arrêt)',
    'set.tot': 'Coupure auto. TOT (s, 0 = aucune)',
    'set.tail': 'Traîne PTT (ms)',
    'set.hotkey': 'Raccourci global',
    'set.assign': 'Assigner…',
    'set.clear': 'Effacer',
    'set.note': 'Le raccourci marche même quand une autre application a le focus. Il accepte une touche du clavier ou un bouton de souris (molette, boutons latéraux).',

    'dev.none': '— Aucun —',
    'dev.unplugged': '{label} (débranché)',
    'dev.default': '{name} (défaut)',
    'dev.interface': 'Interface',
    'port.none': '— Aucun (pas de commande PTT) —',
    'port.absent': '{port} (absent)',
    'port.multi': 'Plusieurs ports Silicon Labs détectés ({list}) : choisissez celui de votre interface (le même que dans VARA).',
    'chip.port': 'Port COM : {port} ({line})',
    'chip.portOff': 'Port COM : non connecté',
    'chip.key': 'Raccourci : {key}',
    'chip.keyNA': 'Raccourci global indisponible',
    'key.none': 'Aucun',
    'key.noneLower': 'aucun',
    'key.capture': 'Appuyez sur une touche… (Échap = annuler)',
    'mouse.3': 'Clic molette',
    'mouse.n': 'Bouton souris {n}',

    'sum.ptt': 'PTT {line} · {mode} · raccourci {key} · TOT {tot}',
    'sum.hold': 'maintenir',
    'sum.toggle': 'bascule',
    'sum.off': 'off',

    'err.rxOpen': "Réception : impossible d'ouvrir les périphériques choisis ({msg}).",
    'err.txOpen': "Émission : impossible d'ouvrir les périphériques choisis ({msg}).",
    'err.micDenied': 'Accès au micro refusé : {msg}',
    'err.serialModule': "Le module série n'a pas pu être chargé : la commande PTT est indisponible.",
    'err.pttRefused': 'Commande PTT refusée : {msg}',
    'err.portBusy': '{port} est déjà utilisé par une autre application (VARA ?). Fermez-la puis réessayez.',
    'err.portOpen': 'Ouverture de {port} impossible : {msg}',
    'err.portGone': '{port} a été déconnecté.',
    'err.listPorts': 'Liste des ports impossible : {msg}',
    'err.generic': '{msg}',
    'tot.expired': 'Émission coupée automatiquement après {s} s (TOT).',

    'about.title': 'À propos de DeskPTT',
    'about.version': 'Version {v}',
    'about.tagline': 'Votre poste FM, depuis votre bureau.',
    'about.compat': 'Compatible avec les interfaces audio USB pour radio qui commandent le PTT par un port COM (RTS/DTR), ou avec le VOX du poste.',
    'about.desc': "DeskPTT transforme votre PC Windows en micro et haut-parleur de bureau pour votre émetteur-récepteur FM VHF/UHF. Branchez votre interface, choisissez vos périphériques audio, et vous êtes en l'air — sans micro à main supplémentaire.",
    'about.ham': 'Conçu par un radioamateur, pour les radioamateurs.',
    'about.license': 'Logiciel libre, sous licence Apache 2.0.',
    'about.source': 'Code source',
    'about.notices': 'Licences tierces',
    'about.author': 'F4IZC — vibecodé avec Claude',
    'about.disclaimerTitle': 'Avertissement',
    'about.disclaimer': "Logiciel expérimental destiné aux radioamateurs licenciés, fourni « tel quel », sans aucune garantie. Vous êtes seul responsable de son utilisation : votre station, vos émissions, le respect de votre licence et de la réglementation, ainsi que tout dommage, brouillage ou dysfonctionnement qui pourrait en résulter. En l'utilisant, vous acceptez que l'auteur n'engage aucune responsabilité.",
    'about.lang': 'Langue',
    'about.close': 'Fermer',
    'about.settings': 'Réglages',
    'about.txMode': "Commande d'émission",
    'txMode.ptt': 'PTT par le port COM',
    'txMode.vox': 'VOX du poste',
    'about.voxHint': "VOX du poste : pour les interfaces qui ne peuvent pas commander le PTT. DeskPTT ne passe alors jamais le poste en émission : le bouton VOX / MUTE ouvre ou coupe le son envoyé au poste, et c'est le VOX du poste (à activer sur le poste) qui déclenche l'émission.",

    'vox.on': 'VOX',
    'vox.off': 'MUTE',
    'vox.muted': 'Son vers le poste coupé',
    'vox.open': 'SON OUVERT {t}',
    'hint.voxHold': 'Maintenez le bouton enfoncé pour envoyer le son au poste.',
    'hint.voxToggle': 'Cliquez une fois pour envoyer le son au poste, encore une fois pour le couper.',
    'chip.vox': 'Mode VOX du poste',
    'sum.vox': 'VOX · {mode} · raccourci {key} · TOT {tot}',
    'set.titleVox': 'Réglages VOX',
  },
};

const LANGS = { en: 'English', fr: 'Français' };
let currentLang = 'en';

function setLang(lang) {
  currentLang = STRINGS[lang] ? lang : 'en';
  document.documentElement.lang = currentLang;
}

function t(key, params) {
  let s = (STRINGS[currentLang] && STRINGS[currentLang][key]) ?? STRINGS.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

function applyStaticText(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}

// Error / status objects sent by the main process: { key, args } or a plain string.
function tMsg(m) {
  if (!m) return '';
  if (typeof m === 'string') return m;
  return t(m.key, m.args);
}
