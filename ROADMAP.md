# Roadmap

## Current checkpoint

- Version: 0.1.0
- Phase: 1 — Project Foundation
- Status: v0.1.0 checkpoint complete; waiting for user testing before Phase 2

## Completed

- Manifest V3 with Firefox and Chromium compatible core
- Native popup with active-page video count and manual rescan
- Local settings storage with validation
- On-demand injection, so idle pages have no VidTune scripts, timers or observers
- Dependency-free extension runtime; native build/test scripts and Mozilla `web-ext` as a development dependency
- Permission and privacy documentation

## Decisions

- Use native JavaScript modules and browser APIs; avoid a bundler and UI framework at this stage.
- `activeTab` and `scripting` avoid blanket host access. A scan occurs on popup open or manual request.
- Dynamic/SPA pages can be rescanned manually or by reopening the popup. Event-driven ongoing detection is reserved for the speed-control phase.

## Known limits

- The active document is scanned; cross-origin frames and restricted browser pages are not accessible.
- Playback controls are intentionally outside Phase 1.

## Test results

- Build and local lint passed; all 3 automated tests passed.
- Mozilla `web-ext lint` passed with 0 errors, 0 warnings and 0 notices. Packaged ZIP verified.
- `web-ext run` reported successful temporary installation in a Firefox development window, opening the MDN video documentation. Popup interactions could not be inspected because Windows browser automation was stopped by URL policy enforcement.
- The user created `lucaseddd/VidTune` as a private GitHub repository. Commit `c6ef9c1` and tag `v0.1.0` were pushed to `origin`.

## Next milestone

Phase 2 — Speed Control, only after explicit user approval following the v0.1.0 checkpoint.
