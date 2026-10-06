import { sendToVideo } from './browser.js';

const api = globalThis.browser ?? globalThis.chrome;
const actions = new Set(['INCREASE', 'DECREASE', 'RESET']);

api.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type !== 'VIDEO_SHORTCUT' || !actions.has(message.action) || !sender.tab?.id) return;
  sendToVideo(sender.tab.id, { type: message.action }).then(respond, (error) => {
    console.warn('VidTune could not control this page:', error);
    respond({ error: String(error) });
  });
  return true;
});
