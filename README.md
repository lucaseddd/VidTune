# VidTune

**VidTune — Speed, Volume & PiP** is a lightweight browser extension under development. Version 0.4.0 adds native video volume control. Picture in Picture is planned for a later milestone.

## Speed controls

- Adjust in 0.1× steps by default, choose a preset, enter a custom value, or reset to 1×.
- Supported range: 0.1× to 16×. The selected speed is saved locally.
- On pages containing a video, press **A** to slow down, **D** to speed up, or **Q** to reset to 1×. Holding a speed key uses normal keyboard repeat. These keys also work while the popup has focus. Shortcuts are ignored while typing in editable fields and when modifier keys are held.
- Open **Settings** from the gear in the popup to change the speed step, preset buttons and shortcut letters. The custom number input's spinner follows the chosen step; typed values retain 0.01× precision.
- Settings also lets you remember a speed for the current site. Site speeds apply on new visits and follow dynamically added videos.
- Optional skip backward and forward controls live only in Settings. They start disabled with no keys assigned, and their jump length can be set from 1 to 60 seconds. They seek only inside the video's available range.
- A small speed indicator appears at the video's upper-left corner while player controls are visible and briefly after a speed change. It ignores pointer input. YouTube's control visibility is followed directly; other players use pointer activity and a short idle timeout.
- The active video is chosen by playback state and visible size. When a site replaces a video without navigating, VidTune applies the saved speed to the replacement.
- **Detect videos when opening the popup** is in Settings. Speed controls remain available when automatic scanning is off.

## Volume control

- Drag the popup slider from 0% to 100%. It uses the video's native volume control, without amplification or audio processing.
- The slider gives more room to quiet levels: position 1 is 0.01%, position 10 is 1%, and position 50 is 25%. The displayed percentage is the actual volume.
- Volume is saved locally and applied to new videos, including videos replaced by a site without navigation. Adjusting the slider above 0% also unmutes a muted video.

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

VidTune stores settings locally in browser storage. It makes no network requests and has no analytics. A small content script runs on web pages to hear configured single-letter shortcuts and check whether a saved site speed or volume should be applied; these keys cannot be registered through the browser commands API. This requires access to web pages through the manifest's `<all_urls>` content-script match. The video controller is injected only when the popup or a shortcut is used, or when a saved site speed or volume needs to be applied. `activeTab` and `scripting` load the controller; `storage` saves preferences. The background script runs only for extension events. At 1× and 100% volume without a site profile, the controller has no document-wide video mutation observer or video lifecycle listeners; YouTube's player class observer may remain active for the indicator.

Browser internal pages and some restricted pages do not allow scanning. The popup reports this without interrupting browsing. The controller checks the active document; cross-origin frames are not included in v0.4.0. Exact frame stepping is deferred because the generic web video API does not provide a reliable cross-browser next-frame seek operation.
