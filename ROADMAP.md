# Roadmap

## Current checkpoint

- Version: 0.5.0
- Phase: 5 — Advanced Audio / Volume Boost
- Status: v0.5.0 checkpoint complete; waiting for user testing before Phase 6

## Completed

- Manifest V3 with Firefox and Chromium compatible core
- Native popup with active-page video count and manual rescan
- Local settings storage with validation
- On-demand video controller; a passive key listener is loaded on web pages for A/D/Q shortcuts
- Dependency-free extension runtime; native build/test scripts and Mozilla `web-ext` as a development dependency
- Permission and privacy documentation
- Speed control from 0.1× to 16× with 0.1× steps, presets, custom entry, reset and saved preference
- A/D speed keys with normal keyboard repeat and Q reset; editable fields and modifiers are excluded
- A/D/Q also work while the popup has focus; the custom input spinner steps by 0.1×
- An unobtrusive speed indicator follows video position, appears on speed changes and follows player control activity
- Main-video selection by playback state and visible size; dynamic replacement handling
- Separate Firefox and Chromium manifests from one shared codebase
- A dedicated Settings page, opened from a small popup gear, holds speed step, presets, shortcuts, site speed and optional skip controls
- Configurable single-letter speed/reset shortcuts and a configurable 0.01×–2× step
- Optional backward/forward skip shortcuts with a 1–60-second jump, disabled and unassigned by default
- Automatic site speed profiles that persist and follow dynamically added videos
- Native 0%–100% volume control in the popup, with a squared slider curve for fine control near silence
- Actual volume percentage shown down to 0.01%; saved volume follows newly loaded and dynamically replaced videos
- Centered volume slider: 0%–100% on the left and 100%–300% on the right, with native volume below 100% and on-demand Web Audio gain plus compression above it
- Boost preference follows video replacement and reload; unsupported cross-origin media stays audible at native 100% with clear feedback

## Decisions

- Use native JavaScript modules and browser APIs; avoid a bundler and UI framework at this stage.
- Unmodified A/D/Q keys require a page listener because the browser commands API requires a modifier. The `<all_urls>` content-script match grants page access for that listener; it sends no page data and checks for a video only on a relevant keydown.
- The content controller is injected on user action. At 1× it keeps no document-wide video observer or media listeners; at other speeds it watches relevant DOM additions and media lifecycle events.
- The speed indicator uses pointer events and one-shot hide timers. For YouTube, a class observer follows control visibility; other players use a short idle timeout.
- A Firefox MV3 background event page and Chromium service worker share the shortcut handler.
- The popup keeps only quick controls. Advanced controls use the browser's native extension options page; video detection moved there as well.
- Seeking clamps to the media's seekable range. No extra popup buttons or permissions were added for it.
- The 0%–100% half uses `HTMLMediaElement.volume`; boost creates a Web Audio source, gain and compressor only when requested on a playing video. Slider previews are throttled and saved on release. No additional permission is needed.
- Cross-origin media without CORS is left on the native audio path before creating a source node, because routing it through Web Audio could silence it. Firefox autoplay restrictions defer boost until playback starts.
- A saved volume below 100% triggers the existing preference initializer on new pages. At the default 100%, it does not add a page observer.

## Known limits

- The active document is scanned; cross-origin frames and restricted browser pages are not accessible.
- At most one main video is controlled at a time. Cross-origin video frames remain out of scope.
- The key listener currently operates in the top-level document; cross-origin video frames remain out of scope.
- Exact control visibility varies across players; the generic indicator uses pointer activity as a proxy. Fullscreen mode where the video element itself enters the top layer cannot contain a separate indicator.
- Exact frame stepping is deferred: the generic `currentTime` seek is not frame-accurate, and `seekToNextFrame()` is deprecated and nonstandard.
- Volume changes apply to the selected main video in the active document. Some embedded, cross-origin players remain inaccessible.
- Once an element is routed into Web Audio, its graph remains connected while that page is open, including at native volume; the browser cannot reliably undo the source association. Compression reduces clipping risk but cannot repair audio already distorted by its source.
- Live-site automation for YouTube, Vimeo, Twitch and Reddit was rejected by automatic approval review because it would widen test host access. This needs explicit user authorization before automation can run.
- `npm audit --omit=dev` found no runtime vulnerabilities. Three high-severity advisories remain in the Mozilla `web-ext` development dependency chain; they are not included in the browser packages.

## Test results

- Build and local lint passed; all 14 automated tests passed, including the centered slider mapping, paused-video handling and safe fallback for unavailable boost.
- Mozilla `web-ext lint` passed with no errors or warnings. Both browser packages were generated.
- Firefox WebDriver installed the extension temporarily and verified 0.01%, 25%, 100%, 200% and 300%, boost on video replacement and reload, Settings, shortcuts and seek.
- A Firefox development window loaded the v0.5.0 build with the popup open for manual testing. At 1× and 100% volume without a site profile, the controller has no video mutation observer or video lifecycle listeners.
- The v0.5.0 code and tag were pushed to the private `origin` repository.

## Next milestone

Phase 6 — Picture in Picture, only after explicit user approval following the v0.5.0 checkpoint.
