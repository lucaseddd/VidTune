import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from '../src/settings.js';
import { inspectPageVideos, summarizeVideos } from '../src/detection.js';

test('settings default and reject invalid stored values', () => {
  assert.deepEqual(normalizeSettings(undefined), { autoDetect: true });
  assert.deepEqual(normalizeSettings({ autoDetect: false }), { autoDetect: false });
  assert.deepEqual(normalizeSettings({ autoDetect: 'false' }), { autoDetect: true });
});

test('video summary handles zero, one and multiple videos', () => {
  assert.equal(summarizeVideos([]), 'No videos found');
  assert.equal(summarizeVideos([{}]), '1 video found');
  assert.equal(summarizeVideos([{}, {}]), '2 videos found');
});

test('page scan reports playback and visibility without mutating videos', () => {
  const video = { paused: false, ended: false, getBoundingClientRect: () => ({ width: 640, height: 360 }) };
  globalThis.document = { querySelectorAll: () => [video] };
  try { assert.deepEqual(inspectPageVideos(), [{ playing: true, visible: true }]); }
  finally { delete globalThis.document; }
});
