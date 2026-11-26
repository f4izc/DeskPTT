# Changelog

## Unreleased

- Fix: restarting the transmit audio twice in a row (e.g. device change) could leave an orphaned copy of
  the microphone stream sending to the radio (doubled voice / echo). An overtaken start now closes what
  it opened.

## 1.2.0 — 2026-11-26

- **PTT through the GPIO pin of CM108-type sound cards** (CM108/CM119, SSS1621/1623, AIOC), for
  interfaces without a COM port: pick the sound card in *PTT port* (`CM108 GPIO — …`), then the pin in
  *Control line* (GPIO 1–4, **GPIO 3** by default). Tested with a Digirig Lite. The pin is released on
  open, close, port change, crash/reload and when the card is unplugged.
- The *Control line* list only shows the lines of the selected port type (RTS/DTR or GPIO).
- Changing the PTT port now drops PTT first.
- **Safety**: choosing *None* as PTT port is now remembered. Before, a single CP210x COM port (possibly
  another radio's CAT port) was selected again automatically at the next start. Automatic selection now
  only happens on a fresh install, before any choice.
- *Mute listening while transmitting* now closes the interface input entirely during TX (no USB audio
  stream in from the interface while the radio transmits); listening comes back with a short fade-in.
- Diagnostic tool: `DIAG_SECONDS` and `DIAG_MINHZ` options.

## 1.1.2 — 2026-11-26

- About window: author shown as "Steph F4IZC / N4IZC" (README and website credits updated too).

## 1.1.1 — 2026-11-26

- Generic wording in the app: "interface" instead of the Digirig brand (device labels, COM port, RTS,
  compact summary, About). Ports with a Silicon Labs CP210x chip are still marked with a ★.
- Website available in French: https://deskptt.f4izc.com/fr/ (screenshots refreshed).
- GitHub Actions updated to versions running on Node 24.

## 1.1.0 — 2026-11-25

- **Radio VOX mode** for interfaces that cannot key the radio: *About → Settings → Transmit control*.
  DeskPTT then never opens the COM port; the PTT button becomes **VOX / MUTE** and opens or mutes the audio
  sent to the radio, whose own VOX keys the transmitter. Follows the hold/toggle mode, TOT applies, and it
  always starts muted. COM port, control line and PTT tail are hidden in this mode.
- New *Settings* area in the About window (language, transmit control).

## 1.0.1 — 2026-11-25

- New DeskPTT icon: application, installer, shortcuts, taskbar, and in front of the name in the window header.
- Direct, permanent download link to the latest installer (`DeskPTT-Setup.exe`).
- README: supported platforms (Windows 10/11, macOS planned) and scope (audio + PTT, no CAT) up front.

## 1.0.0 — 2026-11-25

First public release.

- Receive: interface input → PC speakers/headset, volume, USB whistle filter (1–4 kHz notches + 3.4 kHz low-pass).
- Transmit: PC microphone → interface, level in dB, optional noise reduction.
- PTT on the COM port (RTS or DTR), hold or toggle mode, time-out timer, PTT tail.
- Global hotkey: keyboard key or mouse button, works whether or not DeskPTT has the focus.
- T-CALL: 1750 Hz tone call for repeater access.
- Advanced and Compact views; window height fitted to the content.
- English (default) and French interface; About window with license and disclaimer.
