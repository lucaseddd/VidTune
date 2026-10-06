import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/content.js', import.meta.url), 'utf8');

function fakeVideo({ playing = false, width = 640, height = 360 } = {}) {
  return {
    nodeType: 1, localName: 'video', isConnected: true,
    paused: !playing, ended: false, playbackRate: 1, volume: 1, muted: false, currentTime: 50, duration: 120,
    seekable: { length: 1, start: () => 0, end: () => 120 },
    getBoundingClientRect: () => ({ width, height })
  };
}

function fixture(initialSpeed, initialVideos, extraSettings = {}) {
  const page = { videos: initialVideos, listeners: new Map(), observer: null, settings: { speed: initialSpeed, autoDetect: true, ...extraSettings } };
  let onMessage;
  class Observer {
    constructor(callback) { this.callback = callback; page.observer = this; }
    observe() { this.active = true; }
    disconnect() { this.active = false; }
  }
  const document = {
    documentElement: {},
    querySelectorAll: () => page.videos,
    addEventListener(name, listener) { page.listeners.set(name, listener); },
    removeEventListener(name) { page.listeners.delete(name); }
  };
  const browser = {
    storage: { local: {
      async get() { return { settings: page.settings }; },
      async set({ settings }) { page.settings = settings; }
    } },
    runtime: { onMessage: { addListener(listener) { onMessage = listener; } } }
  };
  const context = { browser, document, MutationObserver: Observer, queueMicrotask, location: { hostname: 'example.com' } };
  runInNewContext(source, context);
  page.send = (message) => new Promise((resolve) => { assert.equal(onMessage(message, {}, resolve), true); });
  return page;
}

test('saved speed targets the playing video and follows a dynamic replacement', async () => {
  const largePaused = fakeVideo({ width: 1200, height: 700 });
  const smallPlaying = fakeVideo({ playing: true, width: 480, height: 270 });
  const page = fixture(1.5, [largePaused, smallPlaying]);
  const first = await page.send({ type: 'GET_STATE' });
  assert.equal(first.count, 2);
  assert.equal(smallPlaying.playbackRate, 1.5);
  assert.equal(largePaused.playbackRate, 1);
  assert.equal(page.observer.active, true);

  const replacement = fakeVideo({ playing: true });
  smallPlaying.isConnected = false;
  page.videos = [replacement];
  page.observer.callback([{ addedNodes: [replacement], removedNodes: [smallPlaying] }]);
  await new Promise(queueMicrotask);
  assert.equal(replacement.playbackRate, 1.5);
});

test('shortcut-style messages persist speed and reset idle monitoring', async () => {
  const video = fakeVideo({ playing: true });
  const page = fixture(1, [video]);
  assert.equal(page.observer, null);
  assert.equal(page.listeners.size, 0);
  assert.equal((await page.send({ type: 'INCREASE' })).speed, 1.1);
  assert.equal(page.settings.speed, 1.1);
  assert.equal(page.observer.active, true);
  assert.equal((await page.send({ type: 'RESET' })).speed, 1);
  assert.equal(page.settings.speed, 1);
  assert.equal(page.observer.active, false);
  assert.equal(page.listeners.size, 0);
});

test('repeated speed messages apply each 0.1× step in order', async () => {
  const video = fakeVideo({ playing: true });
  const page = fixture(1, [video]);
  const changes = await Promise.all([
    page.send({ type: 'INCREASE' }),
    page.send({ type: 'INCREASE' }),
    page.send({ type: 'INCREASE' })
  ]);
  assert.deepEqual(changes.map(({ speed }) => speed), [1.1, 1.2, 1.3]);
  assert.equal(video.playbackRate, 1.3);
  assert.equal(page.settings.speed, 1.3);
});

test('custom speed step, site profile and seek range are applied', async () => {
  const video = fakeVideo({ playing: true });
  const page = fixture(1, [video], { speedStep: 0.2, seekSeconds: 15, siteSpeeds: { 'example.com': 1.5 } });
  assert.equal((await page.send({ type: 'GET_STATE' })).speed, 1.5);
  assert.equal((await page.send({ type: 'INCREASE' })).speed, 1.7);
  assert.equal(page.settings.siteSpeeds['example.com'], 1.7);
  assert.equal(page.settings.speed, 1);
  await page.send({ type: 'SEEK_FORWARD' });
  assert.equal(video.currentTime, 65);
  await page.send({ type: 'SEEK_BACKWARD' });
  assert.equal(video.currentTime, 50);
  video.currentTime = 118;
  await page.send({ type: 'SEEK_FORWARD' });
  assert.equal(video.currentTime, 120);
});

test('a 1× site profile keeps dynamically added videos at 1×', async () => {
  const first = fakeVideo();
  const page = fixture(1.5, [first], { siteSpeeds: { 'example.com': 1 } });
  await page.send({ type: 'GET_STATE' });
  assert.equal(page.observer.active, true);
  const replacement = fakeVideo();
  replacement.playbackRate = 2;
  first.isConnected = false;
  page.videos = [replacement];
  page.observer.callback([{ addedNodes: [replacement], removedNodes: [first] }]);
  await new Promise(queueMicrotask);
  assert.equal(replacement.playbackRate, 1);
});

test('low saved volume follows video replacement and can be reset to 100%', async () => {
  const first = fakeVideo();
  const page = fixture(1, [first], { volume: 0.0004 });
  assert.equal((await page.send({ type: 'GET_STATE' })).volume, 0.0004);
  assert.equal(first.volume, 0.0004);
  assert.equal(page.observer.active, true);
  const replacement = fakeVideo();
  first.isConnected = false;
  page.videos = [replacement];
  page.observer.callback([{ addedNodes: [replacement], removedNodes: [first] }]);
  await new Promise(queueMicrotask);
  assert.equal(replacement.volume, 0.0004);
  await page.send({ type: 'SET_VOLUME', volume: 1 });
  assert.equal(replacement.volume, 1);
  assert.equal(page.settings.volume, 1);
  assert.equal(page.observer.active, false);
});

test('volume preview applies without saving and explicit adjustment unmutes', async () => {
  const video = fakeVideo();
  video.muted = true;
  const page = fixture(1, [video]);
  assert.equal((await page.send({ type: 'GET_STATE' })).volume, 0);
  await page.send({ type: 'PREVIEW_VOLUME', volume: 0.01 });
  assert.equal(video.volume, 0.01);
  assert.equal(video.muted, false);
  assert.equal(page.settings.volume, undefined);
  await page.send({ type: 'SET_VOLUME', volume: 0 });
  assert.equal(page.settings.volume, 0);
});
