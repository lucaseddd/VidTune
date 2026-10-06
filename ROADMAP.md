# Roadmap

## Current checkpoint

- Version: 0.2.1
- Phase: 2 — Speed Control
- Status: v0.2.1 shortcut correction complete; waiting for user testing before Phase 3

## Completed

- Manifest V3 with Firefox and Chromium compatible core
- Native popup with active-page video count and manual rescan
- Local settings storage with validation
- On-demand injection, so idle pages have no VidTune scripts, timers or observers
- Dependency-free extension runtime; native build/test scripts and Mozilla `web-ext` as a development dependency
- Permission and privacy documentation
- Speed control from 0.1× to 16× with 0.25× steps, presets, custom entry, reset and saved preference
- Three browser shortcuts for increase, decrease and reset
- Firefox menu conflict corrected by using Ctrl+Shift+Up, Ctrl+Shift+Down and Ctrl+Shift+0
- Main-video selection by playback state and visible size; dynamic replacement handling
- Separate Firefox and Chromium manifests from one shared codebase

## Decisions

- Use native JavaScript modules and browser APIs; avoid a bundler and UI framework at this stage.
- `activeTab` and `scripting` avoid blanket host access. A scan occurs on popup open or manual request.
- The content controller is injected on user action. At 1× it keeps no observer or media listeners; at other speeds it watches relevant DOM additions and media lifecycle events.
- A Firefox MV3 background event page and Chromium service worker share the shortcut handler.

## Known limits

- The active document is scanned; cross-origin frames and restricted browser pages are not accessible.
- At most one main video is controlled at a time. Cross-origin video frames remain out of scope.
- The actual browser-keyboard dispatch was not proven by WebDriver; shortcuts were registered and the handler path was tested separately. Manual shortcut testing is needed.
- Live-site automation for YouTube, Vimeo, Twitch and Reddit was rejected by automatic approval review because it would widen test host access. This needs explicit user authorization before automation can run.
- `npm audit --omit=dev` found no runtime vulnerabilities. Three high-severity advisories remain in the Mozilla `web-ext` development dependency chain; they are not included in the browser packages.

## Test results

- Build and local lint passed; all 6 automated tests passed, covering speed math, settings, video selection, dynamic replacement and observer teardown.
- Mozilla `web-ext lint` passed with no errors or warnings. Both browser packages were generated.
- Firefox WebDriver installed the extension temporarily and verified popup rendering, registered shortcut definitions, 0.1× and 16×, dynamic video replacement, local persistence and reset on an HTML5 video test page.
- A Firefox development window loaded the v0.2.1 build for manual testing. At 1×, the controller has no mutation observer or video lifecycle listeners.
- The v0.2.1 code and tag were pushed to the private `origin` repository.

## Next milestone

Phase 3 — Advanced Speed & Shortcuts, only after explicit user approval following the v0.2.1 checkpoint.
