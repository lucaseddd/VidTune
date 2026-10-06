import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/content.js', import.meta.url), 'utf8');

function fakeVideo({ playing = false, width = 640, height = 360 } = {}) {
  return {
    nodeType: 1, localName: 'video', isConnected: true,
    paused: !playing, ended: false, playbackRate: 1,
    getBoundingClientRect: () => ({ width, height })
  };
}

function fixture(initialSpeed, initialVideos) {
  const page = { videos: initialVideos, listeners: new Map(), observer: null, settings: { speed: initialSpeed, autoDetect: true } };
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
  const context = { browser, document, MutationObserver: Observer, queueMicrotask };
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
  assert.equal((await page.send({ type: 'INCREASE' })).speed, 1.25);
  assert.equal(page.settings.speed, 1.25);
  assert.equal(page.observer.active, true);
  assert.equal((await page.send({ type: 'RESET' })).speed, 1);
  assert.equal(page.settings.speed, 1);
  assert.equal(page.observer.active, false);
  assert.equal(page.listeners.size, 0);
});
