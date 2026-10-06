# Project state

- Current version: 0.1.0
- Current branch: main
- Last stable commit: `c6ef9c1` (`v0.1.0`), pushed to private `origin` at `https://github.com/lucaseddd/VidTune.git`
- Architecture: native MV3 popup; `src/browser.js` browser API adapter, `src/settings.js` local persistence, `src/detection.js` active-tab scan, `src/popup.js` UI.
- Build: `npm ci`, `npm run build`; package: `npm run package`.
- Validation: `npm run lint`, `npm test`, `npm run lint:firefox` after build.
- Firefox: `npm run firefox` launches a development window and temporarily loads `dist/`. Alternatively use `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `E:\VidTune\dist\manifest.json`. Installation is temporary until Firefox restarts.
- Decisions: no dependencies, no host permissions, no persistent content script, no background worker. Scan only when the popup opens or the user selects **Scan again**.
- Known issues: cross-origin frames and restricted pages cannot be scanned. Firefox popup UI verification remains manual because computer control was stopped by URL policy enforcement.
- Exact next task: wait for the user's manual Firefox test and feedback. Start Phase 2 only after the user explicitly authorizes it.
