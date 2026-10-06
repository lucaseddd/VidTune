# Roadmap

## Current checkpoint

- Version: 0.3.0
- Phase: 3 — Advanced Speed & Shortcuts
- Status: v0.3.0 checkpoint complete; waiting for user testing before Phase 4

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

## Decisions

- Use native JavaScript modules and browser APIs; avoid a bundler and UI framework at this stage.
- Unmodified A/D/Q keys require a page listener because the browser commands API requires a modifier. The `<all_urls>` content-script match grants page access for that listener; it sends no page data and checks for a video only on a relevant keydown.
- The content controller is injected on user action. At 1× it keeps no document-wide video observer or media listeners; at other speeds it watches relevant DOM additions and media lifecycle events.
- The speed indicator uses pointer events and one-shot hide timers. For YouTube, a class observer follows control visibility; other players use a short idle timeout.
- A Firefox MV3 background event page and Chromium service worker share the shortcut handler.
- The popup keeps only quick controls. Advanced controls use the browser's native extension options page; video detection moved there as well.
- Seeking clamps to the media's seekable range. No extra popup buttons or permissions were added for it.

## Known limits

- The active document is scanned; cross-origin frames and restricted browser pages are not accessible.
- At most one main video is controlled at a time. Cross-origin video frames remain out of scope.
- The key listener currently operates in the top-level document; cross-origin video frames remain out of scope.
- Exact control visibility varies across players; the generic indicator uses pointer activity as a proxy. Fullscreen mode where the video element itself enters the top layer cannot contain a separate indicator.
- Exact frame stepping is deferred: the generic `currentTime` seek is not frame-accurate, and `seekToNextFrame()` is deprecated and nonstandard.
- Live-site automation for YouTube, Vimeo, Twitch and Reddit was rejected by automatic approval review because it would widen test host access. This needs explicit user authorization before automation can run.
- `npm audit --omit=dev` found no runtime vulnerabilities. Three high-severity advisories remain in the Mozilla `web-ext` development dependency chain; they are not included in the browser packages.

## Test results

- Build and local lint passed; all 9 automated tests passed, covering speed math, repeated changes, settings migration, site profiles, seek boundaries, video selection and dynamic replacement.
- Mozilla `web-ext lint` passed with no errors or warnings. Both browser packages were generated.
- Firefox WebDriver installed the extension temporarily and verified Settings opening, configurable keys and speed step, optional seek on local media, site speed after reload, popup controls, indicator and persistence.
- A Firefox development window loaded the v0.3.0 build for manual testing. At 1× without a site profile, the controller has no video mutation observer or video lifecycle listeners.
- The v0.3.0 code and tag were pushed to the private `origin` repository.

## Next milestone

Phase 4 — Volume Control, only after explicit user approval following the v0.3.0 checkpoint.
