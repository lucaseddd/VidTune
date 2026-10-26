# VidTune - Speed, Volume & PiP

**A video speed controller and volume booster for Firefox, Opera, Chrome, and Microsoft Edge.** VidTune gives you quick control over playback speed, louder audio, mono sound, and Picture-in-Picture, with a compact popup you can customize.

[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/vidtune/) · [Opera Add-ons](https://addons.opera.com/en/extensions/details/vidtune-speed-volume-pip/) · [Opera developer page](https://addons.opera.com/developer/package/308049/) · [Privacy policy](PRIVACY.md)

> The Opera listing is awaiting moderation. Its public download page will work after Opera approves the extension.

## Install VidTune

**Recommended — fastest:** Install VidTune directly from your browser's extension store. This is the simplest option and keeps updates automatic.

- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/vidtune/)
- [Opera Add-ons](https://addons.opera.com/en/extensions/details/vidtune-speed-volume-pip/) (available after review)
- Chrome and Microsoft Edge: coming soon.

For the latest downloadable files, open the release directly:

- [VidTune 0.8.4 — latest release](https://github.com/lucaseddd/VidTune-Speed-Volume-PiP/releases/tag/v0.8.4)
- [VidTune 0.8.3](https://github.com/lucaseddd/VidTune-Speed-Volume-PiP/releases/tag/v0.8.3)
- [VidTune 0.8.2](https://github.com/lucaseddd/VidTune-Speed-Volume-PiP/releases/tag/v0.8.2)

The latest release includes a **Firefox XPI installer** and a **source ZIP**. Install the XPI in Firefox; use the source archive to inspect or build the project. For Chromium browsers, install from their extension store when available; the Chromium ZIP is a store/build package, not a signed CRX installer.

## Main features

- **Video speed:** Set playback from 0.1× to 16× with presets, a custom value, or the **A** and **D** keys. Press **Q** to return to 1×.
- **Volume boost:** Raise video volume up to 300%, mute it, or use a separate level for each tab.
- **Mono audio:** Blend left and right audio channels and play the same mix through both sides.
- **Picture-in-Picture:** Move a video to a floating window when the browser and player support it.
- **Site preferences:** Remember a speed or volume level for a website.
- **Custom layouts:** Choose 2, 5, or 10 controls. Smart Organize groups related tools for easier scanning.

## Preview

<table width="100%" cellspacing="0" cellpadding="2">
  <tr>
    <td width="50%" align="center">
      <a href="presentation/screenshots/default-smart-organize.png"><img src="presentation/screenshots/default-smart-organize.png" alt="VidTune popup with five controls and Smart Organize enabled" width="250" height="403"></a><br>
      <sub><b>Everyday controls</b><br>5 tools with Smart Organize</sub>
    </td>
    <td width="50%" align="center">
      <a href="presentation/screenshots/layout-10-tools.png"><img src="presentation/screenshots/layout-10-tools.png" alt="VidTune popup with ten customizable controls" width="250" height="403"></a><br>
      <sub><b>Full control</b><br>10 tools in one compact layout</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" align="center">
      <a href="presentation/screenshots/settings-speed-shortcuts.png"><img src="presentation/screenshots/settings-speed-shortcuts.png" alt="VidTune speed and keyboard shortcut settings" width="390"></a><br>
      <sub><b>Speed and shortcuts</b><br>Set speed steps, presets, and keys</sub>
    </td>
    <td width="50%" align="center">
      <a href="presentation/screenshots/settings-site-controls.png"><img src="presentation/screenshots/settings-site-controls.png" alt="VidTune website-specific speed and volume settings" width="390"></a><br>
      <sub><b>Site controls</b><br>Save speed and volume by website</sub>
    </td>
  </tr>
</table>

More screenshots: [speed controls](presentation/01-playback-speed.png) · [volume boost](presentation/02-volume-boost.png) · [Smart Organize](presentation/03-smart-organize.png)

## Compatibility

VidTune supports Firefox, Opera, Chrome, and Microsoft Edge. Some protected videos, restricted browser pages, or players that block audio processing may limit speed or volume controls.

## Build from source

Requires Node.js 20 or later.

~~~sh
npm ci
npm run build
npm run package
~~~

The package command creates the Firefox XPI, the Chromium store/build ZIP, and a source ZIP in the release folder.

## Privacy

Settings stay in your browser. VidTune does not use analytics. See the [privacy policy](PRIVACY.md) for details about permissions and audio processing.
