# DeskPTT — Development notes

## Architecture

```
main.js            Electron main process
                   - settings (JSON in %APPDATA%\DeskPTT, migration from the old "PC Radio" name)
                   - COM port (serialport): PTT on RTS or DTR, lowered on open/close/crash
                   - CM108 GPIO (node-hid): PTT on GPIO 1–4 of a CM108-type sound card, path "hid:<path>"
                   - PTT state machine: hold / toggle, T-CALL, TOT timer, PTT tail
                   - global hotkey (uiohook-napi) + keys forwarded by the window (see pitfalls)
                   - window sizing: fit the window height to the content (no scrollbar)
preload.js         contextBridge API "window.radio" (the renderer has no Node access)
renderer/
  index.html       UI markup; static texts carry data-i18n keys
  i18n.js          EN/FR strings, t(), applyStaticText(), tMsg() for main-process messages
  app.js           device lists, Web Audio routing, meters, PTT/T-CALL buttons, views, About
  style.css        dark theme, Advanced / Compact views
tools/
  gen-third-party.js   writes THIRD_PARTY_NOTICES.md from the production dependency tree
  diag-usb-noise/      standalone Electron script: measures the dominant tones on the interface input
.github/workflows/build.yml   CI build on every push, GitHub release on tags v*
```

### Audio graph (renderer/app.js)

- **RX**: `getUserMedia(interface input)` → notch 1/2/3/4 kHz (Q 8) → low-pass 3.4 kHz → volume →
  mute (closed during TX, reopened after `tailMs + 400 ms`) → `AudioContext({ sinkId: headset })`.
  The notches/low-pass switch to all-pass / 20 kHz when the USB whistle filter is off.
- **TX**: `getUserMedia(PC mic)` → mic gain (0 during T-CALL) ┐
  `OscillatorNode 1750 Hz` → tone gain (0.35 during T-CALL) ┴→ level (dB) → PTT gate → `AudioContext({ sinkId: interface })`.
  The meter shows the mic level *before* attenuation.
- Each chain uses its own `AudioContext` so that each can target a different output device.
- Processing is disabled on purpose (`echoCancellation`, `autoGainControl` off; `noiseSuppression` optional).

### PTT

All presses go through `pttPress/pttRelease` (idempotent) or `tcallPress/tcallRelease` in `main.js`.
`setPtt(on)` raises the line immediately; on release the audio gate closes at once and the line drops
after `tailMs`. Any crash, reload, window close or COM port loss forces PTT off.

**CM108 GPIO**: `listPorts()` appends the HID devices of known sound chips (C-Media VID `0d8c`, SSS `0c76`,
AIOC `1209:7388`; other USB codecs such as the IC-7300's are left out) with a `hid:` path. `writeLine()`
then writes the output report `[0x00 report id, 0x00, data, direction, 0x00]`, bit = pin − 1 (same order as
Direwolf/Hamlib; verified on a Digirig Lite, GPIO 3). The pin is written low on open, close, port or line
change, renderer crash/reload and `uncaughtException`; device loss is detected by the HID read loop
(`error` event). Residual risk: if the main process is killed, the chip keeps the pin latched.

## Pitfalls already solved (keep these in mind)

1. **Windows raises RTS/DTR when a COM port is opened** → the radio would key up. `openPort` lowers both
   right after opening.
2. **The global hook receives nothing while the DeskPTT window has the focus** (Windows + uiohook in
   Electron). The renderer therefore listens to `keydown/keyup/mousedown/mouseup` and forwards them
   (`window-input` IPC, DOM `code` → uiohook keycode mapping). Because a press can arrive from both
   sources, press/release are idempotent and a just-captured key is "swallowed" until released (3 s max).
   When testing with injected keys (`keybd_event`), pass the **scan code**, otherwise Chromium reports an
   empty `KeyboardEvent.code`.
3. **1 kHz whistle on the interface input**: USB full-speed frame noise picked up by the USB audio codec
   (measured: 1000 Hz + harmonics, about −54 dBFS). Handled by the RX filters.
4. **The interface output drives the radio's microphone input**: the TX level is in dB, −26 dB by default.
5. **Windows may make the interface the default audio device**: device auto-detection never picks a
   Digirig-like or virtual device (VB-Cable…) for the headset side.
6. **Node.js 26 + Electron 33 install script**: `extract-zip` fails silently, leaving
   `node_modules/electron/dist` empty. Use Node 22 LTS (as the CI does), or unzip
   `%LOCALAPPDATA%\electron\Cache\…\electron-vX-win32-x64.zip` into `node_modules\electron\dist` and
   create `node_modules\electron\path.txt` containing `electron.exe`.
7. **electron-builder on Windows**: `npmRebuild: false` (the native modules are N-API prebuilds, no
   compiler needed). The executable is edited (icon, version info) with rcedit from the winCodeSign
   archive; it is not code-signed. Extracting that archive needs symlink privileges (fine on GitHub
   runners). Locally, without Developer Mode or admin rights, extract it once by hand, skipping the
   macOS part:
   `node_modules\7zip-bin\win\x64\7za.exe x -y -snld "-x!darwin" %LOCALAPPDATA%\electron-builder\Cache\winCodeSign\<n>.7z -o%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0`
   - **Icons**: the source is `build/icon.svg` (copied to `renderer/icon.svg` for the header).
     After changing it, run `node_modules\electron\dist\electron.exe tools\gen-icons` to regenerate
     `build/icon.ico` (16–256 px) and `build/icon.png` (window icon), and commit them.
8. **npm 11+** blocks install scripts unless allowed: see `allowScripts` in `package.json`.

## Testing without keying the radio

- Set the COM port to *None* in the app (or `serialPath: null` in settings.json) — audio still flows, PTT
  only gates the audio. This also applies to CM108 sound cards: selecting one writes its pin low, but
  never press PTT in an automated test while it is selected.
- `--remote-debugging-port=9333` lets you drive the UI through the Chrome DevTools Protocol
  (`Runtime.evaluate`, `Page.captureScreenshot`).
- `tools/diag-usb-noise`: `node_modules\electron\dist\electron.exe tools\diag-usb-noise` logs, every
  0.5 s for 20 s, the RMS level and the three strongest tones of the interface input (`result.txt`).
  Environment: `DIAG_DEVICE=<regex>` for another input (e.g. `realtek`), `DIAG_SECONDS`, `DIAG_MINHZ`
  (ignore peaks below), `DIAG_FILTER=1` (through the RX filters).
- A TX whistle that ignores the *Level to radio* slider is added after DeskPTT (driver, sound card, ground):
  a constant whistle on TX was once traced to the PC headset's mic driver (fixed by its vendor software).

## Releasing

1. Bump `version` in `package.json` and add an entry to `CHANGELOG.md`.
2. `npm run notices` if dependencies changed, commit.
3. `git tag vX.Y.Z && git push --tags` → the *Build* workflow builds the installer and publishes a GitHub
   release with `DeskPTT-Setup-X.Y.Z.exe` and its `.sha256`.

## Ideas / not done yet

See [`BACKLOG.md`](../BACKLOG.md) (planned features, ideas, and what is deliberately out of scope).
