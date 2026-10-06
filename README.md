# VidTune

**VidTune — Speed, Volume & PiP** is a lightweight browser extension under development. Version 0.2.3 provides video speed control, detection, direct keyboard shortcuts and a video speed indicator. Volume and Picture in Picture are planned for later milestones.

## Speed controls

- Adjust in 0.1× steps, choose a preset, enter a custom value, or reset to 1×.
- Supported range: 0.1× to 16×. The selected speed is saved locally.
- On pages containing a video, press **A** to slow down, **D** to speed up, or **Q** to reset to 1×. Each A/D keydown changes speed by 0.1×; holding a key uses normal keyboard repeat. Shortcuts are ignored while typing in editable fields and when modifier keys are held.
- The same keys work while the popup has focus. The custom number input's spinner changes by 0.1×; typed values retain 0.01× precision.
- A small speed indicator appears at the video's upper-left corner while player controls are visible and briefly after a speed change. It ignores pointer input. YouTube's control visibility is followed directly; other players use pointer activity and a short idle timeout.
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

`npm run firefox` opens a temporary Firefox development window with the extension loaded. Alternatively, load `dist/manifest.json` through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. In Chromium, use **Load unpacked** and select `dist-chromium/`. `npm run test:firefox` opens and closes its own Firefox test window.

The temporary Firefox installation is removed when Firefox restarts. Rebuild and reload after source changes.

## Privacy and permissions

VidTune stores settings locally in browser storage. It makes no network requests and has no analytics. A small content script runs on web pages to hear unmodified A/D/Q keys; these keys cannot be registered through the browser commands API. This requires access to web pages through the manifest's `<all_urls>` content-script match. The script does no scanning until one of those keys is pressed. `activeTab` and `scripting` load the video controller when the popup is opened; `storage` saves preferences. The background script runs only for extension events. At 1×, the controller has no document-wide video mutation observer or video lifecycle listeners; YouTube's player class observer may remain active for the indicator.

Browser internal pages and some restricted pages do not allow scanning. The popup reports this without interrupting browsing. The controller checks the active document; cross-origin frames are not included in v0.2.3.
