# Backlog

Future features and ideas for DeskPTT, roughly by priority. Move an item to `CHANGELOG.md` once shipped.
Safety rule for every item: anything that can key the transmitter must fail to "PTT off".

## Planned

### PTT through the CM108 GPIO (HID)
Many CM108/CM119-based interfaces (AllStar-style, DMK URI, home-made boards) have no USB-serial chip:
PTT is wired to a GPIO pin of the sound chip itself, usually **GPIO3**, driven through a USB HID output report.
Today DeskPTT keys only through a COM port line (RTS/DTR); these users must fall back to the radio's VOX.

- New "PTT method" choice in *PTT settings*: COM port (RTS/DTR) or CM108 GPIO (pin 1–8, default 3).
- Find the HID device that belongs to the selected sound card (C-Media VID `0d8c`), list several if needed.
- Write the output report `[0x00, 0x00, mask, data, 0x00]` (bit = pin − 1). Candidate library: `node-hid`
  (check license and N-API prebuilds for Electron, then `npm run notices`).
- **Fail-safe**: unlike a COM port, the GPIO stays latched if the app dies. Write "PTT off" at start-up,
  on exit, on renderer crash/reload and on device loss; keep the TOT; document the residual risk.
- Update the website FAQ ("Which radios work?"), README and French guide when shipped.

### macOS version
Electron build for macOS (Apple Silicon + Intel): signing/notarization, Accessibility permission for the
global hotkey, serial port naming (`/dev/cu.*`), device labels, a `.dmg` built by GitHub Actions on `macos-latest`.

## Ideas

- Windows on ARM64 build (prebuilds exist for both native modules; add `--arm64`, test).
- Linux port (no global hook under Wayland, device naming).
- Code signing for the Windows installer (avoid the SmartScreen warning).
- French version of the website.
- Update the GitHub Actions to versions running on Node 24 (Node 20 deprecation warning).

## Not planned

- CAT control: DeskPTT stays audio + PTT; frequency, mode and memories stay on the rig.
- CTCSS / tone squelch: handled by the radio.
