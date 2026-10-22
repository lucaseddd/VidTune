# VidTune presentation assets

English presentation images, 1280 × 800 pixels:

- `01-playback-speed.png`: speed presets and keyboard controls.
- `02-volume-boost.png`: volume boost and independent volume for the current tab.
- `03-smart-organize.png`: the ten-tool Smart Organize layout.

The `screenshots/` folder contains unedited captures of the running extension, including the two-tool layout and Settings. Screenshots use a controlled local HTML5 media fixture. The 1280 × 800 images pair these real captures with direct feature explanations for the public Firefox listing.

The original scalable icon is `../icons/icon.svg`, with PNG sizes from 16 to 256 pixels. Recreate these assets with `node scripts/presentation.js` after `npm ci` on a machine with Microsoft Edge installed. Generation uses an invisible test browser.

Upload the three presentation images to the public Firefox listing in numbered order. A video is optional; the images already explain the core controls directly.
