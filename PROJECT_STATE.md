# Project state

- Current version: 0.2.1
- Current branch: main
- Last stable checkpoint: `v0.2.1` tag, pushed to private `origin` at `https://github.com/lucaseddd/VidTune.git`
- Architecture: native MV3 popup; `src/browser.js` browser API adapter, `src/settings.js` local persistence, `src/speed.js` speed math, `src/content.js` on-demand video controller, `src/background.js` shortcuts, `src/popup.js` UI. Build outputs are `dist/` for Firefox and `dist-chromium/` for Chromium.
- Build: `npm ci`, `npm run build`; package: `npm run package`.
- Validation: `npm run lint`, `npm test`, `npm run lint:firefox`, `npm run test:firefox` after build.
- Firefox: `npm run firefox` launches a development window and temporarily loads `dist/`. Alternatively use `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `E:\VidTune\dist\manifest.json`. Installation is temporary until Firefox restarts.
- Decisions: no runtime dependencies or blanket host permissions. Firefox uses a background event page; Chromium uses a service worker. The content controller is injected on popup/shortcut use and monitors dynamic videos only while speed differs from 1×.
- Known issues: cross-origin frames and restricted pages cannot be controlled. WebDriver confirms shortcut registration; physical-key dispatch still needs manual testing. Live-site automation was rejected by automatic approval review and requires explicit user authorization.
- Exact next task: let the user test the v0.2.1 popup and keyboard shortcuts in Firefox. Start Phase 3 only after the user explicitly authorizes it.
