import test from 'node:test';
import assert from 'node:assert/strict';
import { activeTab, sendToVideo } from '../src/browser.js';

test('commands reach only the main video frame and ignore inaccessible frames', async () => {
  const commands = [];
  const probes = {
    0: { count: 0, playing: false, area: 0 },
    3: { count: 1, playing: false, area: 1000000 },
    7: { count: 1, playing: true, area: 200000 }
  };
  globalThis.browser = {
    webNavigation: { async getAllFrames() { return [0, 3, 7, 9].map(frameId => ({ frameId })); } },
    tabs: { async sendMessage(_tabId, message, { frameId }) {
      if (frameId === 9) throw new Error('Restricted frame');
      if (message.type === 'PROBE_VIDEOS') return probes[frameId];
      commands.push({ frameId, type: message.type });
      return { hasVideo: true, count: 1, speed: 1.5 };
    } },
    scripting: { async executeScript() { throw new Error('Restricted frame'); } }
  };
  try {
    const state = await sendToVideo(5, { type: 'INCREASE' });
    assert.equal(state.count, 2);
    assert.deepEqual(commands, [{ frameId: 7, type: 'INCREASE' }]);
  } finally { delete globalThis.browser; }
});

test('popup-page fallback resolves tab URLs when Chromium omits them', async () => {
  globalThis.browser = {
    runtime: { getURL: () => 'chrome-extension://vidtune/' },
    tabs: { async query(query) {
      return query.active ? [{ id: 9, url: 'chrome-extension://vidtune/popup.html' }]
        : [{ id: 3, lastAccessed: 10 }, { id: 4, lastAccessed: 20 }];
    } },
    webNavigation: { async getAllFrames({ tabId }) {
      return [{ frameId: 0, url: `https://video.example/${tabId}` }];
    } }
  };
  try { assert.equal((await activeTab()).url, 'https://video.example/4'); }
  finally { delete globalThis.browser; }
});

test('a hidden playing frame does not override a visible player frame', async () => {
  let selected;
  globalThis.browser = {
    webNavigation: { async getAllFrames() { return [{ frameId: 0 }, { frameId: 1 }]; } },
    tabs: { async sendMessage(_tabId, message, { frameId }) {
      if (message.type === 'PROBE_VIDEOS') return { count: 1, playing: frameId === 0, area: frameId === 0 ? 0 : 100000 };
      selected = frameId;
      return { speed: 1.5 };
    } }
  };
  try { await sendToVideo(1, { type: 'SET_SPEED', speed: 1.5 }); assert.equal(selected, 1); }
  finally { delete globalThis.browser; }
});
