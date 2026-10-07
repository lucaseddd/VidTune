# Project state

- Current version: 0.5.0
- Current branch: main
- Last stable checkpoint: `v0.5.0` tag, pushed to private `origin` at `https://github.com/lucaseddd/VidTune.git`
- Architecture: native MV3 popup and separate `options.html` page; `src/browser.js` browser API adapter, `src/settings.js` validated local preferences, `src/shortcuts.js` configurable page key listener and saved-preference trigger, `src/content.js` on-demand video controller, native volume, lazy Web Audio boost, seek handler and speed indicator, `src/popup.js` compact controls, `src/volume.js` slider mapping, `src/options.js` advanced settings. Build outputs are `dist/` for Firefox and `dist-chromium/` for Chromium.
- Build: `npm ci`, `npm run build`; package: `npm run package`.
- Validation: `npm run lint`, `npm test`, `npm run lint:firefox`, `npm run test:firefox` after build.
- Firefox: `npm run firefox` launches a development window and temporarily loads `dist/`. Alternatively use `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `E:\VidTune\dist\manifest.json`. Installation is temporary until Firefox restarts.
- Decisions: no runtime dependencies or new permissions. The `<all_urls>` content-script match remains necessary for unmodified letters and saved preferences. Volume uses native media volume to 100% and lazy Web Audio gain plus compression above it, capped at 300%. The left slider half retains the squared precision curve; the right half is linear. Optional seek starts disabled and without default keys; its controls are in Settings, not the popup. Firefox uses a background event page; Chromium uses a service worker.
- Known issues: cross-origin frames and restricted pages cannot be controlled. Boost on cross-origin media without CORS safely falls back to native 100%. A media element routed into Web Audio keeps its graph while the page remains open. Generic player control visibility is estimated from pointer activity; a fullscreen video element cannot contain the indicator. Exact frame stepping is deferred because the available API is deprecated and nonstandard. Live-site automation was rejected by automatic approval review and requires explicit user authorization.
- Exact next task: let the user test v0.5.0 centered slider and 300% boost in Firefox, especially on their usual video sites. Start Phase 6 only after the user explicitly authorizes it.
