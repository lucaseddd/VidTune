import { sendToFrame } from './browser.js';

const api = globalThis.browser ?? globalThis.chrome;
const actions = new Set(['INCREASE', 'DECREASE', 'RESET', 'SEEK_BACKWARD', 'SEEK_FORWARD']);

api.runtime.onMessage.addListener((message, sender, respond) => {
  if (!sender.tab?.id) return;
  if (message?.type !== 'INIT_PREFERENCES' && (message?.type !== 'VIDEO_SHORTCUT' || !actions.has(message.action))) return;
  const type = message.type === 'INIT_PREFERENCES' ? 'GET_STATE' : message.action;
  sendToFrame(sender.tab.id, sender.frameId ?? 0, { type }).then(respond, (error) => {
    console.warn('VidTune could not control this page:', error);
    respond({ error: String(error) });
  });
  return true;
});
