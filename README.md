# DeskPTT — Your FM rig, from your desk.

[![Build](https://github.com/f4izc/DeskPTT/actions/workflows/build.yml/badge.svg)](https://github.com/f4izc/DeskPTT/actions/workflows/build.yml)
[![Latest release](https://img.shields.io/github/v/release/f4izc/DeskPTT)](https://github.com/f4izc/DeskPTT/releases/latest)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

*Works with Digirig and similar USB audio interfaces.*

DeskPTT turns your Windows PC into a desk microphone and speaker for your VHF/UHF FM transceiver.
Plug in your interface, pick your audio devices, and you're on the air — no extra hand mic needed.

- **Receive**: route the radio audio to your speakers or headset, with volume control and a filter against USB whistle.
- **Transmit**: use your PC microphone with noise reduction and adjustable level to the radio.
- **PTT your way**: an on-screen button or a global hotkey (keyboard key or mouse side button) that works
  even when another app has focus. PTT is keyed through the interface's COM port (RTS/DTR).
- **Repeater-friendly**: a 1750 Hz tone call button, a time-out timer (TOT) and an adjustable PTT tail.
- **Simple or detailed**: switch between the Compact and Advanced views.

Built by a ham, for hams. — Stephane Tauziede, F4IZC

> 🇫🇷 Guide d'utilisation en français : [docs/GUIDE.fr.md](docs/GUIDE.fr.md)

---

## Download

Get the Windows installer (`DeskPTT-Setup-x.y.z.exe`) from the
[latest release](https://github.com/f4izc/DeskPTT/releases/latest).

- **Platform**: Windows 10 and 11, 64-bit (x64). macOS, Linux and Windows on ARM are not built yet.
- The installer is **not code-signed**, so Windows SmartScreen may say "Windows protected your PC".
  Click *More info → Run anyway*. You can check the file against the SHA-256 checksum published with each release.
- Every release is built from this repository's source code by GitHub Actions; the build log is public.

## Quick start

Windows names the interface from the PC's point of view: the Digirig **"Microphone"** carries the sound
**coming out of** the radio, and its **"Speakers"** carry the sound **going into** the radio.

1. **Receive**: *Radio audio* = `Microphone (USB PnP Sound Device)`; *Computer speaker or headset* = where you want to listen.
2. **Transmit**: *Computer microphone* = your mic; *To the radio* = `Speakers (USB PnP Sound Device)`.
3. **COM port**: the interface's serial port (marked ★ Digirig for Silicon Labs CP210x chips).
   Close other software that uses it (VARA, etc.): a COM port can only be open in one application at a time.
4. **Global hotkey**: *Assign…*, then press a key or a mouse side button (Esc cancels).
5. **Level to radio** (dB): the interface output drives the radio's *microphone* input, so it needs strong
   attenuation (−26 dB by default). Adjust by ear or with a second receiver.

| Setting | What it does |
|---|---|
| Mode | *Hold to talk* or *Toggle* (one press on, one press off) |
| TOT | Cuts transmission after N seconds (0 = never) |
| PTT tail | Delay between cutting the audio and releasing PTT, so the end of your words is not clipped |
| Mute listening while transmitting | Avoids hearing the radio's own audio in your headset during TX |
| USB whistle filter | Notch filters at 1, 2, 3, 4 kHz + 3.4 kHz low-pass against USB frame noise (on by default) |
| T-CALL | Hold to transmit a 1750 Hz tone (repeater access); follows the *Level to radio* setting |

PTT is released automatically when the TOT expires, when the app closes or crashes, when the COM port is
unplugged, or when the PTT mode changes. RTS and DTR are lowered as soon as the port opens.

Settings are stored in `%APPDATA%\DeskPTT\settings.json`. The interface is in English by default; French
is available from the **i** (About) button.

**Windows tips**: don't make the interface your *default* Windows audio device (system sounds would go on
the air during TX), and set *Sound settings → Communications* to *Do nothing* so Windows doesn't duck
your audio.

## Build from source

Requirements: Windows 10/11 x64, [Node.js](https://nodejs.org/) 22 LTS, Git.

```powershell
git clone https://github.com/f4izc/DeskPTT.git
cd DeskPTT
npm ci
npm start           # run the app
npm run notices     # regenerate THIRD_PARTY_NOTICES.md
npm run dist        # build dist\DeskPTT-Setup-x.y.z.exe
```

Releases are produced by [GitHub Actions](.github/workflows/build.yml): push a tag `vX.Y.Z` (matching
`version` in `package.json`) and the workflow builds the installer and attaches it, with its SHA-256
checksum, to a GitHub release. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the architecture and
the known pitfalls.

## Contributing

Issues and pull requests are welcome. By contributing, you agree that your contributions are licensed
under the Apache License 2.0, like the rest of the project.

## License

DeskPTT is free software, licensed under the [Apache License 2.0](LICENSE).
Copyright 2026 Stephane Tauziede (F4IZC). See [NOTICE](NOTICE).

The binary also contains third-party software under its own licenses, listed with their full texts in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Notably, the global hotkey relies on **libuiohook**,
licensed under the **LGPL-3.0-or-later**: its source code is available upstream (links below), and the
compiled module can be replaced in the installation folder.

## Disclaimer

Experimental software for licensed radio amateurs, provided "as is", without any warranty. You alone are
responsible for how you use it: your station, your transmissions, compliance with your licence and local
regulations, and any damage, interference or malfunction that may result. By using it, you accept that the
author bears no liability whatsoever.

## Credits and sources

DeskPTT stands on the shoulders of these free and open-source projects and resources:

**Runtime (shipped in the installer)**

| Project | Role in DeskPTT | License |
|---|---|---|
| [Electron](https://www.electronjs.org/) — [source](https://github.com/electron/electron) | Desktop application framework | MIT |
| [Chromium](https://www.chromium.org/) (embedded in Electron) | Web Audio API, `getUserMedia`, `AudioContext.setSinkId` for audio routing | BSD-3-Clause and others |
| [Node.js](https://nodejs.org/) (embedded in Electron) | JavaScript runtime of the main process | MIT |
| [Node SerialPort](https://serialport.io/) — [source](https://github.com/serialport/node-serialport) | COM port access, RTS/DTR control for PTT | MIT |
| [uiohook-napi](https://github.com/SnosMe/uiohook-napi) | Global keyboard / mouse hotkey | MIT |
| [libuiohook](https://github.com/kwhat/libuiohook) (inside uiohook-napi) | Native system-wide input hook | LGPL-3.0-or-later |
| Small helper packages (`debug`, `ms`, `node-gyp-build`, `node-addon-api`…) | Dependencies of the above | MIT |

**Build and distribution tools**

| Project | Role | License |
|---|---|---|
| [electron-builder](https://www.electron.build/) — [source](https://github.com/electron-userland/electron-builder) | Packaging | MIT |
| [NSIS](https://nsis.sourceforge.io/) | Windows installer | zlib/libpng |
| [GitHub Actions](https://github.com/features/actions) and the [`actions/checkout`](https://github.com/actions/checkout), [`actions/setup-node`](https://github.com/actions/setup-node), [`actions/upload-artifact`](https://github.com/actions/upload-artifact) actions | Free CI builds and releases | MIT (actions) |
| [GitHub CLI](https://cli.github.com/) — [source](https://github.com/cli/cli) | Publishing releases | MIT |

**Hardware, standards and documentation**

- [Digirig](https://digirig.net/) — the USB audio + serial interface this app was designed and tested with
  (C-Media style USB audio codec, Silicon Labs CP210x USB-to-UART bridge whose RTS line keys the radio).
- Tested with an Icom ID-5200 VHF/UHF transceiver.
- 1750 Hz tone-burst repeater access, as commonly used on IARU Region 1 FM repeaters.
- [MDN Web Docs](https://developer.mozilla.org/) — Web Audio API (`BiquadFilterNode`, `AnalyserNode`, `OscillatorNode`)
  and Media Capture references.
- The 1 kHz USB "whistle" diagnosis is based on the USB full-speed frame rate (one frame per millisecond,
  [USB 2.0 specification](https://www.usb.org/document-library/usb-20-specification)).

**Development**

- Developed by Stephane Tauziede (F4IZC), vibe-coded with [Claude](https://www.anthropic.com/claude) (Anthropic) in Claude Code.

Digirig, Icom, VARA and Windows are trademarks of their respective owners. DeskPTT is an independent project
and is not affiliated with or endorsed by them.
