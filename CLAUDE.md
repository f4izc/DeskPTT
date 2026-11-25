# CLAUDE.md — context for AI-assisted development

DeskPTT is an Electron app (Windows x64) that routes audio between a PC and a VHF/UHF FM transceiver
through a Digirig-like USB interface, and keys PTT on the interface's COM port (RTS/DTR).
Author: Stephane Tauziede (F4IZC). License: Apache-2.0 (keep SPDX headers on new source files).

Read `docs/DEVELOPMENT.md` first: architecture, audio graph, and the pitfalls already solved.
Future work lives in `BACKLOG.md`: add new ideas there, and move items to `CHANGELOG.md` when shipped.

## Conventions

- UI texts: English by default, French available. Every user-visible string goes through
  `renderer/i18n.js` (`data-i18n` attributes or `t()`); main-process messages are sent as `{ key, args }`.
- Code comments are mostly in French; the owner speaks French.
- The renderer has no Node access: add new capabilities as IPC handlers in `main.js` + `preload.js`.
- Safety first: anything that can key the transmitter must fail to "PTT off" (crash, reload, port loss).
- No scrollbar: the window height is fitted to the content (`fitWindow` / `fit-height`); re-check both
  views (Advanced, Compact) after layout changes.

## Commands

```powershell
npm ci            # install (use Node 22 LTS)
npm start         # run
npm run notices   # regenerate THIRD_PARTY_NOTICES.md (after dependency changes)
npm run dist      # build dist\DeskPTT-Setup-<version>.exe
```

## Testing

Never key the real radio during automated tests: set `serialPath` to null first, and restore the user's
settings afterwards. Drive the UI with `--remote-debugging-port` + CDP; inject keys with scan codes.
