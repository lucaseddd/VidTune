# VidTune

**A lightweight video speed controller and volume booster for Firefox, Chrome, and Edge.**

VidTune adds quick controls for video speed, louder audio, mono sound, and Picture in Picture. Choose a compact layout that fits the way you watch.

[Get VidTune for Firefox](https://addons.mozilla.org/pt-BR/firefox/addon/vidtune/) · [Privacy policy](PRIVACY.md)

## Main controls

- **Video speed:** slow down or speed up from 0.1× to 16×. Use presets, enter a custom speed, or press **A** / **D**. Press **Q** to reset.
- **Volume boost:** adjust from mute to 300%. Keep a separate volume for each tab when you want.
- **Mono audio:** send a blended left-and-right mix to both sides.
- **Picture in Picture:** pop the video into a small floating window when the browser and player allow it.
- **Site preferences:** remember speed and volume for a website.

## Make the popup yours

The default layout has **5 tools** with **Smart Organize** on. Pick 2, 5, or 10 tools, choose what each slot does, and switch Smart Organize on or off at any time.

Smart Organize groups related controls so speed, volume, and video actions are easy to find.

## Preview

<a href="presentation/screenshots/default-smart-organize.png"><img src="presentation/screenshots/default-smart-organize.png" alt="VidTune popup with five tools and Smart Organize enabled" width="420"></a>

More screenshots: [speed controls](presentation/01-playback-speed.png) · [volume boost](presentation/02-volume-boost.png) · [Smart Organize layouts](presentation/03-smart-organize.png)

## Compatibility

VidTune supports Firefox, Chrome, and Microsoft Edge. Results can vary on protected videos, restricted browser pages, and players that block audio processing. If a video cannot be safely boosted, its native sound continues.

## Install

- **Firefox:** [install VidTune from Firefox Add-ons](https://addons.mozilla.org/pt-BR/firefox/addon/vidtune/).
- **Chrome and Edge:** build the Chromium version with the steps below, then load the unpacked extension from `dist-chromium/`.

## Build

Requires Node.js 20 or later.

```sh
npm ci
npm run build
```

Run checks with `npm test` and `npm run lint`. See the scripts in `package.json` for browser-specific checks and packaging.

## Privacy

Settings stay in your browser. VidTune does not use analytics. Read the [privacy policy](PRIVACY.md) for details about permissions and audio processing.
