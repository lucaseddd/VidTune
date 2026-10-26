# VidTune Privacy Policy

Last updated: 26 October 2026

VidTune is a browser extension that controls video speed, audio level, mono audio, Picture in Picture, and optional seeking.

## Information and storage

VidTune does not collect, sell, or transmit browsing history, video titles, media content, or account information to the developer. Settings are stored locally by the browser. Independent volume values for open tabs use temporary browser session storage and are removed when a tab closes.

The extension reads page and frame information when needed to find and control video players, apply saved site preferences, and route commands to the correct frame. It does not store or transmit visited page URLs. A small content script listens for the configured keyboard shortcuts on pages where it can run.

## Audio boost compatibility

When volume boost or mono audio is requested for cross-origin media, VidTune may make an unauthenticated CORS compatibility request to the media host so the browser can process that video's audio. Depending on the host, this may be a `HEAD` request or a one-byte `GET` request whose response body is cancelled. The request is sent to the host serving the media, without credentials. Audio is processed locally by the browser and is not uploaded to VidTune or its developer.

## Permissions

- `activeTab` and `scripting` let VidTune find and control videos on the active page, including pages already open when the extension is used.
- `storage` saves user preferences locally.
- `webNavigation` lets VidTune identify accessible frames on demand when a control is used.
- Page access is required for video detection, configured shortcuts, site-specific settings, and players inside frames.

## Changes and contact

This policy may be updated when VidTune's behavior changes. The current version is published in the [VidTune GitHub repository](https://github.com/lucaseddd/VidTune/blob/feature/modular-popup/PRIVACY.md). Contact the developer through the repository's Issues page with privacy questions.

