# VidTune

**VidTune — Speed, Volume & PiP** is a lightweight browser extension under development. Version 0.1.0 provides the project foundation: a popup that scans the active page for HTML5 videos and a saved preference for automatic scanning. Playback controls are planned for later milestones.

## Development

Requires Node.js 20 or later. Run `npm ci` once to install the Mozilla development tool. The extension itself has no runtime dependencies.

```text
npm run build
npm run lint
npm run lint:firefox
npm test
npm run package
npm run firefox
```

`npm run firefox` opens a temporary Firefox development window with the extension loaded. Alternatively, load `dist/manifest.json` through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. In Chromium, use **Load unpacked** and select `dist/`.

The temporary Firefox installation is removed when Firefox restarts. Rebuild and reload after source changes.

## Privacy and permissions

VidTune stores settings locally in browser storage. It makes no network requests and has no analytics. `activeTab` grants access to the page only after the user opens the popup. `scripting` scans that tab for video elements. `storage` saves the preference. There are no blanket host permissions or persistent content scripts.

Browser internal pages and some restricted pages do not allow scanning. The popup reports this without interrupting browsing. The scan checks the active document; cross-origin frames are not included in v0.1.0.
