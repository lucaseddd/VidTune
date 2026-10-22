# Roadmap

## Current checkpoint

- Version: 0.8.1 on `feature/modular-popup`
- Phase: separate modular popup version
- Status: 2/5/10 slot selection, mono audio and Smart Organize implemented; automated browser checks passed, manual user testing pending

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
- Compact fixed-width popup without a scan card or scrollbars; a small PiP icon sits next to Settings
- Picture in Picture toggle and optional shortcut. Firefox uses a temporary in-video button to provide the required page click
- Site profiles for speed and volume, site disable, and a management list to edit/remove saved profiles
- Top-level site preferences apply to accessible embedded video frames; tab-only volume overrides a site profile
- Boost preference follows video replacement and reload; unsupported cross-origin media stays audible at native 100% with clear feedback

## Decisions

- v0.5.1 adds on-demand frame enumeration with `webNavigation` and passive scripts in all web frames. Commands target one frame only; probes do not initialize video observers or audio processing.
- `match_about_blank` is intentionally omitted: Firefox first-load storage requests stalled with that flag in the integration test. HTTP(S) player frames work without it.

- Use native JavaScript modules and browser APIs; avoid a bundler and UI framework at this stage.
- Unmodified A/D/Q keys require a page listener because the browser commands API requires a modifier. The `<all_urls>` content-script match grants page access for that listener; it sends no page data and checks for a video only on a relevant keydown.
- The content controller is injected on user action. At 1× it keeps no document-wide video observer or media listeners; at other speeds it watches relevant DOM additions and media lifecycle events.
- The speed indicator uses pointer events and one-shot hide timers. For YouTube, a class observer follows control visibility; other players use a short idle timeout.
- A Firefox MV3 background event page and Chromium service worker share the shortcut handler.
- The popup keeps only quick controls. Advanced controls use the browser's native extension options page; video detection moved there as well.
- Seeking clamps to the media's seekable range. No extra popup buttons or permissions were added for it.
- The 0%–100% half uses `HTMLMediaElement.volume`; boost creates a Web Audio source, gain and compressor only when requested on a playing video. Slider previews are throttled and saved on release. No additional permission is needed.
- Cross-origin media without CORS is checked with a credential-free HEAD request. Servers permitting CORS can be reloaded with anonymous CORS while preserving playback position and state. Failed reloads restore the original mode. Denied checks and protected media stay on native audio before creating a source node. Firefox autoplay restrictions defer boost until playback starts.
- A saved volume below 100% triggers the existing preference initializer on new pages. At the default 100%, it does not add a page observer.

## Known limits

- Accessible web frames are scanned on demand. Restricted browser pages and blank/srcdoc frames are not supported.
- At most one main video is controlled at a time, selected across frames by playback state and size.
- Shortcuts operate in the focused video frame. Existing pages should be reloaded after this extension update.
- Exact control visibility varies across players; the generic indicator uses pointer activity as a proxy. Fullscreen mode where the video element itself enters the top layer cannot contain a separate indicator.
- Exact frame stepping is deferred: the generic `currentTime` seek is not frame-accurate, and `seekToNextFrame()` is deprecated and nonstandard.
- Volume changes apply to the selected main video frame; boost remains subject to the media source CORS restrictions. Site speed profiles currently use each video frame's hostname.
- Once an element is routed into Web Audio, its graph remains connected while that page is open, including at native volume; the browser cannot reliably undo the source association. Compression reduces clipping risk but cannot repair audio already distorted by its source.
- Live-site automation for YouTube, Vimeo, Twitch and Reddit was rejected by automatic approval review because it would widen test host access. This needs explicit user authorization before automation can run.
- `npm audit --omit=dev` found no runtime vulnerabilities. Three high-severity advisories remain in the Mozilla `web-ext` development dependency chain; they are not included in the browser packages.

## v0.5.7 test results

- Open shadow-root and nested component players: discovery, shortcuts, lifecycle events and dynamic replacements. Visible players take precedence over hidden zero-size media across frames.
- Event-driven recovery when a player resets non-default playback speed, with a bounded retry budget.
- CORS GET range probe when HEAD is unsupported; the response body is cancelled immediately. No CORS restrictions are bypassed and no permissions were added.
- Chromium popup-page tab discovery now resolves missing URLs through the existing webNavigation permission.
- Firefox integration covers nested shadow roots, replacement, speed resets, HEAD rejection, audio fallback and independent tabs. Chromium package validated in headless Edge for popup, speed, native volume, boost, tab scope, shadow DOM and shortcuts. Google Chrome itself is not installed or tested.

## v0.5.6 test results

- Each tab can now save a separate volume in session storage. Several tabs can be scoped at once, and the global volume remains available to unscoped tabs. Turning off one tab’s scope returns only that tab to the global preference. An existing v0.5.5 single-tab scope is migrated on the first change.
- Firefox integration verified two simultaneous tab volumes, independent slider changes, global changes, reload retention and disabling one scope without affecting the other.

## v0.5.5 test results

- The upper boost scale is doubled at its marked points: 150%=4×, 200%=8×, 250%=16×, 300%=32×. The transition starts smoothly from 100%=1×. The peak limiter still constrains loud source material.
- The popup now offers **Only this tab**. Enabling it stores the selected tab and volume in session storage, caps the global saved boost at 100% during the scope, and restores the prior global value when disabled. Tab reloads retain the selected scope; closing the tab clears it.
- Headless Firefox measured 8.00× and 32.00× RMS gain on a quiet tone. Integration tests verified that a second tab returns to 100%, scoped slider changes stay local and survive reload, and disabling the scope restores the previous global setting.

## v0.5.4 test results

- User requested 300% to be an extreme reserve. The boost scale now uses exponential gain: 150%=2×, 200%=4×, 250%=8×, 300%=16×. Native 0–100% mapping and the centered slider are retained. Gain changes are smoothed, and returning to native volume cancels pending gain automation.
- Headless Firefox measured 4.00× and 16.00× RMS gain on a quiet test tone using the production gain expression and compressor settings. The existing integration suite passed.

## v0.5.3 test results

- The previous −12 dB compressor threshold reduced much of the requested boost. The new −1 dB threshold, hard knee and 20:1 ratio limit near-full-scale peaks while retaining ordinary gain.
- Firefox OfflineAudioContext measured 2.00× and 3.00× RMS gain for a 0.2-amplitude test tone using the production compressor settings. Existing Firefox integration tests, including CORS recovery and rollback, passed.

## v0.5.2 test results

- All 15 unit tests and source lint passed. Firefox integration passed with uBlock Origin installed: CORS recovery to 300%, denied-CORS native fallback without reload, rollback after a failed CORS media load, position and playback preservation, iframe boost and the existing controls.
- The prepared live-site session expired before the new build could be applied. Its media server previously returned a successful CORS HEAD response, matching the recovery path now covered by integration tests. Live-site boost remains unverified.
- Firefox development and test launchers now require uBlock Origin alongside VidTune.
- Mozilla extension lint completed without errors or warnings; Firefox and Chromium v0.5.2 packages generated. The reopened Firefox session has uBlock Origin 1.75.0 and VidTune 0.5.2 verified active.

## Earlier test results

- Firefox verified speed, native volume, 300% boost and configured keys inside a cross-origin HTTP iframe. The supplied RedeCanais page exposed one video in eight frames on the first visit; 1.5× speed and 50% native volume applied. Playback remained buffering, and a second visit did not expose a video, so live-site boost is unverified.

- Build and local lint passed; all 15 automated tests passed, including the centered slider mapping, paused-video handling and safe fallback for unavailable boost.
- Mozilla `web-ext lint` passed with no errors or warnings. Both browser packages were generated.
- Firefox WebDriver installed the extension temporarily and verified 0.01%, 25%, 100%, 200% and 300%, boost on video replacement and reload, Settings, shortcuts and seek.
- A Firefox development window loaded the v0.5.1 build with the popup open for manual testing. At 1× and 100% volume without a site profile, the controller has no video mutation observer or video lifecycle listeners.
- The v0.5.1 code and tag were pushed to the private `origin` repository.

## Next milestone

The modular 0.8.1 version lives on `feature/modular-popup` for user testing. Keep the previous line of development on `main`. Mozilla signing still needs account sign-in; do not submit this branch as a public listing.

## v0.7.0 test results

- Chrome for Testing 155 and Edge 154: PiP opened and closed from the popup and configurable shortcut. Site profiles applied to the main page and cross-origin iframe; the saved-sites list edited and removed entries. Disabling a site removed the active speed/volume effects and disabled popup controls.
- Firefox: popup PiP request correctly falls back to a temporary button on the video; clicking it opened PiP, and the popup icon closed it. Existing Firefox integration remained green.
- Popup layout checked at 360px width and below the Firefox/Chromium 600px popup height limit. Mozilla extension validation had zero errors and warnings.
