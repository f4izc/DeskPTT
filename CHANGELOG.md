# Changelog

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
