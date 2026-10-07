# VidTune

**VidTune — Speed & Volume** is a lightweight browser extension under development. Version 0.5.8 validates Chrome and Edge compatibility and protects playback when a media server cannot restore the current position.

## Speed controls

- Adjust in 0.1× steps by default, choose a preset, enter a custom value, or reset to 1×.
- Supported range: 0.1× to 16×. The selected speed is saved locally.
- On pages containing a video, press **A** to slow down, **D** to speed up, or **Q** to reset to 1×. Holding a speed key uses normal keyboard repeat. These keys also work while the popup has focus. Shortcuts are ignored while typing in editable fields and when modifier keys are held.
- Open **Settings** from the gear in the popup to change the speed step, preset buttons and shortcut letters. The custom number input's spinner follows the chosen step; typed values retain 0.01× precision.
- Settings also lets you remember a speed for the current site. Site speeds apply on new visits and follow dynamically added videos.
- Optional skip backward and forward controls live only in Settings. They start disabled with no keys assigned, and their jump length can be set from 1 to 60 seconds. They seek only inside the video's available range.
- A small speed indicator appears at the video's upper-left corner while player controls are visible and briefly after a speed change. It ignores pointer input. YouTube's control visibility is followed directly; other players use pointer activity and a short idle timeout.
- Videos inside open shadow roots, including nested web components, are detected for popup controls and shortcuts. Lifecycle monitoring follows replacements inside those components. Closed shadow roots are not supported.
- If a player resets the selected non-default speed, VidTune reapplies it, with at most five corrections per second to avoid an endless conflict.
- The active video is chosen by visible size and playback state; hidden zero-size videos do not displace visible players. When a site replaces a video without navigating, VidTune applies the saved speed to the replacement.
- **Detect videos when opening the popup** is in Settings. Speed controls remain available when automatic scanning is off.

## Volume control

Videos inside accessible web iframes are supported, including cross-origin players. Reload existing pages after updating to v0.5.8. The popup prefers visible players, then playback state and size. Keyboard shortcuts work while the video frame has focus.

- The slider starts at 100% in the center. Move left toward 0%, or right for up to 300% boost. The 0%–100% half keeps fine control near silence: position 1 is 0.01%, position 10 is 1%, and position 50 is 25%.
- Up to 100%, VidTune uses the video's native volume control. Above 100%, it creates a Web Audio gain path with peak compression for the selected video. Compression begins near full scale (−1 dB), so normal audio retains the requested amplification instead of being heavily reduced. Above 100%, the percentage is a progressive boost scale: 150% applies 4× gain, 200% applies 8×, 250% applies 16×, and 300% applies up to 32× (+30 dB). Gain transitions are smoothed over 30 ms. Peak compression can reduce the maximum on loud sources; perceived loudness depends on the source and output device. That path is created only after boost is requested and the video starts playing.
- **Only this tab** in the popup saves a separate volume for the current tab. You can turn it on in several tabs and choose a different volume in each one. Tabs without it continue to use the global saved volume and their slider remains available. A tab’s separate volume survives a page reload and expires when the tab closes. Turning the option off returns that tab to the current global setting.
- Volume is saved locally and applied to new videos, including videos replaced by a site without navigation. Adjusting the slider above 0% also unmutes a muted video. A boosted video can be returned to native volume by moving the slider to 100% or lower.
- When cross-origin media was loaded without CORS, VidTune checks whether its server permits audio processing. If it does, the video reconnects with CORS enabled, restoring its position, playback state and speed. This can briefly interrupt playback. A failed reconnection restores the original loading mode. Protected media, servers that reject the compatibility check, and streams whose current position is not seekable keep native audio. Non-seekable playback is not reloaded to enable boost, preventing an unexpected restart.
- Some cross-origin media cannot safely be routed through Web Audio. VidTune keeps native playback at 100% and shows **Boost unavailable for this video** on those videos. A video paused before boost shows **Play video to enable boost**.

## Development

Requires Node.js 20 or later. Run `npm ci` once to install the development tools. The extension itself has no runtime dependencies.

```text
npm run build
npm run lint
npm run lint:firefox
npm test
npm run test:firefox
npm run test:chrome
npm run test:edge
npm run package
npm run firefox
```

`npm run firefox` opens a temporary Firefox development window with VidTune and uBlock Origin loaded. Pass a URL after `--` to open a test page. The launcher and integration tests reuse the uBlock package already installed in a Windows Firefox profile; on other systems, set `UBLOCK_XPI` to its path. They stop if that package is unavailable. Alternatively, load `dist/manifest.json` through `about:debugging` → **This Firefox** → **Load Temporary Add-on**. In Chromium, use **Load unpacked** and select `dist-chromium/`. `npm run test:firefox` runs headlessly. `npm run test:edge` uses installed Microsoft Edge; `npm run test:chrome` uses official stable Chrome for Testing (downloaded and cached by Selenium if necessary). Both run headlessly with local fixtures. `npm run test:chromium` remains an alias for the Edge test. The manual launcher reuses an existing test window when available.

Verified for v0.5.8 on Chrome for Testing 155.0.8059.39 and Edge 154.0.4258.62: popup controls and shortcuts, 0.1× spinner steps, page shortcuts and typing protection, speed reset recovery, native volume, rendered 8×/32× audio gain, independent tab volumes with reload/close cleanup, shadow player replacement, cross-origin iframes, CORS recovery (including rejected HEAD), and native playback fallback when CORS or seeking is unavailable. Firefox integration also passed. These controlled fixtures do not guarantee compatibility with every public site, DRM player or browser policy. The popup is tested as an extension page; browser-toolbar popup placement is not automated.

The temporary Firefox installation is removed when Firefox restarts. Rebuild and reload after source changes.

## Privacy and permissions

VidTune stores global settings locally and per-tab volumes in session storage. It has no analytics or remote service. When boost is requested for cross-origin media, it may send a CORS HEAD compatibility check to the current media server and reconnect the video in CORS mode. If HEAD fails, it tries a GET requesting one byte and cancels the response body immediately, including when the server ignores the range. The check omits credentials; no browsing or media data is sent to VidTune servers. A small content script runs on web pages to hear configured single-letter shortcuts and check whether a saved site speed or volume should be applied; these keys cannot be registered through the browser commands API. This requires access to web pages through the manifest's `<all_urls>` content-script match. A passive bootstrap and shortcut listener load in each web frame. The controller initializes only when used or when a saved preference is applied. `activeTab` and `scripting` provide fallback injection on existing tabs; `storage` saves preferences. `webNavigation` enumerates frames on demand so each command can target the main video. It also resolves the page URL when Chromium omits it from a tab query. Frame URLs are not stored or transmitted, and no navigation event listeners are registered. The background script runs only for extension events. At 1× and 100% volume without a site profile, the controller has no document-wide video mutation observer or video lifecycle listeners; YouTube's player class observer may remain active for the indicator. No new permissions were needed for boost.

Browser internal pages and some restricted pages do not allow scanning. The popup reports this without interrupting browsing. The controller detects videos in accessible web frames, including cross-origin players. Restricted frames and blank/srcdoc frames are not supported. A Web Audio path created for a boosted video remains attached to that media element while the page is open, even after returning to native volume. Exact frame stepping is deferred because the generic web video API does not provide a reliable cross-browser next-frame seek operation.
