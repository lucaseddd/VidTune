import { activeTab, sendToVideo } from './browser.js';

const actions = { 'speed-up': 'INCREASE', 'speed-down': 'DECREASE', 'speed-reset': 'RESET' };
const api = globalThis.browser ?? globalThis.chrome;
api.commands.onCommand.addListener(async (command) => {
  const action = actions[command];
  if (!action) return;
  try {
    const tab = await activeTab();
    if (tab?.id) await sendToVideo(tab.id, { type: action });
  } catch (error) {
    console.warn('VidTune could not control this page:', error);
  }
});
