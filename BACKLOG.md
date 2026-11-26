# Backlog

Future features and ideas for DeskPTT, roughly by priority. Move an item to `CHANGELOG.md` once shipped.
Safety rule for every item: anything that can key the transmitter must fail to "PTT off".

## Planned

### macOS version
Electron build for macOS (Apple Silicon + Intel): signing/notarization, Accessibility permission for the
global hotkey, serial port naming (`/dev/cu.*`), device labels, a `.dmg` built by GitHub Actions on `macos-latest`.

## Ideas

- Windows on ARM64 build (prebuilds exist for both native modules; add `--arm64`, test).
- Linux port (no global hook under Wayland, device naming).
- Code signing for the Windows installer (avoid the SmartScreen warning).
- French screenshots for the French website (today they show the English UI).
- CM108 GPIO: pins 5–8 (CM119), and matching the HID device to the selected sound card automatically.

## Not planned

- CAT control: DeskPTT stays audio + PTT; frequency, mode and memories stay on the rig.
- CTCSS / tone squelch: handled by the radio.
