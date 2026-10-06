# Project state

- Current version: 0.1.0
- Current branch: main
- Last stable commit: v0.1.0 checkpoint (see `git rev-parse v0.1.0` after tagging)
- Architecture: native MV3 popup; `src/browser.js` browser API adapter, `src/settings.js` local persistence, `src/detection.js` active-tab scan, `src/popup.js` UI.
- Build: `npm ci`, `npm run build`; package: `npm run package`.
- Validation: `npm run lint`, `npm test`, `npm run lint:firefox` after build.
- Firefox: `npm run firefox` launches a development window and temporarily loads `dist/`. Alternatively use `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `E:\VidTune\dist\manifest.json`. Installation is temporary until Firefox restarts.
- Decisions: no dependencies, no host permissions, no persistent content script, no background worker. Scan only when the popup opens or the user selects **Scan again**.
- Known issues: cross-origin frames and restricted pages cannot be scanned. Firefox popup UI verification remains manual because computer control was stopped by URL policy enforcement.
- Exact next task: finish the v0.1.0 checkpoint by pushing `main` and tag `v0.1.0` to the private repository, then stop for user testing. Do not start Phase 2 until the user explicitly says to continue.
