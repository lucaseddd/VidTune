import test from 'node:test';
import assert from 'node:assert/strict';
import { sendToVideo } from '../src/browser.js';

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
