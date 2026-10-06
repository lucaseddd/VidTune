# Project state

- Current version: 0.2.3
- Current branch: main
- Last stable checkpoint: `v0.2.3` tag, pushed to private `origin` at `https://github.com/lucaseddd/VidTune.git`
- Architecture: native MV3 popup; `src/browser.js` browser API adapter with extension-tab fallback, `src/settings.js` local persistence, `src/speed.js` speed math, `src/shortcuts.js` passive key listener, `src/content.js` on-demand video controller and speed indicator, `src/background.js` shortcut relay, `src/popup.js` UI and focused-popup shortcuts. Build outputs are `dist/` for Firefox and `dist-chromium/` for Chromium.
- Build: `npm ci`, `npm run build`; package: `npm run package`.
- Validation: `npm run lint`, `npm test`, `npm run lint:firefox`, `npm run test:firefox` after build.
- Firefox: `npm run firefox` launches a development window and temporarily loads `dist/`. Alternatively use `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `E:\VidTune\dist\manifest.json`. Installation is temporary until Firefox restarts.
- Decisions: no runtime dependencies. The `<all_urls>` content-script match is required for plain A/D/Q keys to work directly on web pages; the listener scans only on those keydowns. Firefox uses a background event page; Chromium uses a service worker. The video controller is injected on popup/shortcut use and monitors dynamic videos only while speed differs from 1×.
- Known issues: cross-origin frames and restricted pages cannot be controlled. Generic player control visibility is estimated from pointer activity; a fullscreen video element cannot contain the indicator. Live-site automation was rejected by automatic approval review and requires explicit user authorization.
- Exact next task: let the user test v0.2.3 shortcuts, spinner and speed indicator in Firefox. Start Phase 3 only after the user explicitly authorizes it.
