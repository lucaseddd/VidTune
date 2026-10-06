import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings, updateSettings } from '../src/settings.js';
import { summarizeVideos } from '../src/detection.js';
import { adjustSpeed, formatSpeed, normalizeSpeed } from '../src/speed.js';

test('settings default and reject invalid stored values', () => {
  assert.deepEqual(normalizeSettings(undefined), { autoDetect: true, speed: 1 });
  assert.deepEqual(normalizeSettings({ autoDetect: false, speed: 1.5 }), { autoDetect: false, speed: 1.5 });
  assert.deepEqual(normalizeSettings({ autoDetect: 'false', speed: 'bad' }), { autoDetect: true, speed: 1 });
});

test('changing auto detection preserves the saved playback speed', async () => {
  let settings = { autoDetect: true, speed: 2 };
  globalThis.browser = { storage: { local: {
    async get() { return { settings }; },
    async set(data) { settings = data.settings; }
  } } };
  try { assert.deepEqual(await updateSettings({ autoDetect: false }), { autoDetect: false, speed: 2 }); }
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
