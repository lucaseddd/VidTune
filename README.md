# VidTune

**VidTune — Speed, Volume & PiP** is a lightweight browser extension under development. Version 0.2.1 adds video speed control to the existing popup and detection foundation. Volume and Picture in Picture are planned for later milestones.

## Speed controls

- Adjust in 0.25× steps, choose a preset, enter a custom value, or reset to 1×.
- Supported range: 0.1× to 16×. The selected speed is saved locally.
- Shortcuts: **Ctrl+Shift+Up** increase, **Ctrl+Shift+Down** decrease, **Ctrl+Shift+0** reset. Browser shortcut conflicts can be changed through the browser's extension shortcut settings.
- The active video is chosen by playback state and visible size. When a site replaces a video without navigating, VidTune applies the saved speed to the replacement.
- **Detect videos** controls automatic scanning when the popup opens. Speed controls remain available when automatic scanning is off.

## Development

Requires Node.js 20 or later. Run `npm ci` once to install the development tools. The extension itself has no runtime dependencies.

```text
npm run build
npm run lint
npm run lint:firefox
npm test
npm run test:firefox
npm run package
npm run firefox
```

`npm run firefox` opens a temporary Firefox development window with the extension loaded. Alternatively, load `dist/manifest.json` through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. In Chromium, use **Load unpacked** and select `dist-chromium/`. `npm run test:firefox` opens and closes its own Firefox test window. Its copy of the extension grants access only to a local test page; that permission is absent from the distributed build.

The temporary Firefox installation is removed when Firefox restarts. Rebuild and reload after source changes.

## Privacy and permissions

VidTune stores settings locally in browser storage. It makes no network requests and has no analytics. `activeTab` grants access to the page only after the user opens the popup or invokes a shortcut. `scripting` loads the video controller in that tab. `storage` saves preferences. There are no blanket host permissions or persistent content scripts. The background script runs only for extension events. When the saved speed is 1×, the page controller has no mutation observer or video event listeners.

Browser internal pages and some restricted pages do not allow scanning. The popup reports this without interrupting browsing. The controller checks the active document; cross-origin frames are not included in v0.2.0.
