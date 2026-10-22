# VidTune presentation assets

English presentation images, 1280 × 800 pixels:

- `01-playback-speed.png`: speed presets and keyboard controls.
- `02-volume-boost.png`: volume boost and independent volume for the current tab.
- `03-smart-organize.png`: the ten-tool Smart Organize layout.

The `screenshots/` folder contains unedited captures of the running extension, including the two-tool layout and Settings. Screenshots use a controlled local HTML5 media fixture. The surrounding presentation artwork is separate from the extension UI.

The original scalable icon is `../icons/icon.svg`, with PNG sizes from 16 to 256 pixels. Recreate these assets with `node scripts/presentation.js` after `npm ci` on a machine with Microsoft Edge installed. Generation uses an invisible test browser.

Mozilla's unlisted developer page does not expose the public listing's image gallery. Keep these files for private sharing or a future public listing; do not switch distribution to listed just to upload screenshots. No video was requested for this release.
