import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, normalizeSettings, updateSettings } from '../src/settings.js';
import { summarizeVideos } from '../src/detection.js';
import { adjustSpeed, formatSpeed, normalizeSpeed } from '../src/speed.js';

test('settings default and reject invalid stored values', () => {
  assert.deepEqual(normalizeSettings(undefined), { ...DEFAULT_SETTINGS, presets: [...DEFAULT_SETTINGS.presets], shortcuts: { ...DEFAULT_SETTINGS.shortcuts } });
  assert.equal(normalizeSettings({ autoDetect: false, speed: 1.5 }).speed, 1.5);
  const invalid = normalizeSettings({ autoDetect: 'false', speed: 'bad', speedStep: 0, seekSeconds: 500 });
  assert.equal(invalid.autoDetect, true);
  assert.equal(invalid.speed, 1);
  assert.equal(invalid.speedStep, 0.1);
  assert.equal(invalid.seekSeconds, 10);
  const custom = normalizeSettings({ shortcuts: { decrease: 'KeyZ', increase: 'KeyX', reset: 'KeyQ', seekBackward: 'KeyB', seekForward: 'KeyF' }, presets: [0.5, 1, 1.25], siteSpeeds: { 'example.com': 1.75 } });
  assert.equal(custom.shortcuts.decrease, 'KeyZ');
  assert.deepEqual(custom.presets, [0.5, 1, 1.25]);
  assert.deepEqual(custom.siteSpeeds, { 'example.com': 1.75 });
});

test('changing auto detection preserves the saved playback speed', async () => {
  let settings = { autoDetect: true, speed: 2 };
  globalThis.browser = { storage: { local: {
    async get() { return { settings }; },
    async set(data) { settings = data.settings; }
  } } };
  try {
    const updated = await updateSettings({ autoDetect: false });
    assert.equal(updated.autoDetect, false);
    assert.equal(updated.speed, 2);
    assert.equal(updated.seekEnabled, false);
  }
  finally { delete globalThis.browser; }
});

test('video summary handles zero, one and multiple videos', () => {
  assert.equal(summarizeVideos([]), 'No videos found');
  assert.equal(summarizeVideos([{}]), '1 video found');
  assert.equal(summarizeVideos([{}, {}]), '2 videos found');
  assert.equal(summarizeVideos(3), '3 videos found');
});

test('speed values clamp, step and format at boundaries', () => {
  assert.equal(normalizeSpeed(null), 1);
  assert.equal(normalizeSpeed(0.01), 0.1);
  assert.equal(normalizeSpeed(100), 16);
  assert.equal(adjustSpeed(1.5, 1), 1.6);
  assert.equal(adjustSpeed(0.1, -1), 0.1);
  assert.equal(formatSpeed(1.5), '1.5×');
});
