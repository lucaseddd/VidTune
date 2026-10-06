# Project state

- Current version: 0.3.0
- Current branch: main
- Last stable checkpoint: `v0.3.0` tag, pushed to private `origin` at `https://github.com/lucaseddd/VidTune.git`
- Architecture: native MV3 popup and separate `options.html` page; `src/browser.js` browser API adapter, `src/settings.js` validated local preferences, `src/shortcuts.js` configurable page key listener and site-profile trigger, `src/content.js` on-demand video controller, seek handler and indicator, `src/background.js` shortcut relay, `src/popup.js` compact controls, `src/options.js` advanced settings. Build outputs are `dist/` for Firefox and `dist-chromium/` for Chromium.
- Build: `npm ci`, `npm run build`; package: `npm run package`.
- Validation: `npm run lint`, `npm test`, `npm run lint:firefox`, `npm run test:firefox` after build.
- Firefox: `npm run firefox` launches a development window and temporarily loads `dist/`. Alternatively use `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `E:\VidTune\dist\manifest.json`. Installation is temporary until Firefox restarts.
- Decisions: no runtime dependencies or new permissions. The `<all_urls>` content-script match remains necessary for unmodified letters and saved site speeds. Optional seek starts disabled and without default keys; its controls are in Settings, not the popup. Firefox uses a background event page; Chromium uses a service worker.
- Known issues: cross-origin frames and restricted pages cannot be controlled. Generic player control visibility is estimated from pointer activity; a fullscreen video element cannot contain the indicator. Exact frame stepping is deferred because the available API is deprecated and nonstandard. Live-site automation was rejected by automatic approval review and requires explicit user authorization.
- Exact next task: let the user test v0.3.0 Settings, optional seek and site speed in Firefox. Start Phase 4 only after the user explicitly authorizes it.
