import { sendToFrame } from './browser.js';

const api = globalThis.browser ?? globalThis.chrome;
const actions = new Set(['INCREASE', 'DECREASE', 'RESET', 'SEEK_BACKWARD', 'SEEK_FORWARD']);

async function volumeScope() {
  return (await api.storage.session.get('volumeScope')).volumeScope ?? null;
}

api.tabs.onRemoved.addListener(async (tabId) => {
  if ((await volumeScope())?.tabId === tabId) await api.storage.session.remove('volumeScope');
});

api.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === 'GET_VOLUME_SCOPE') {
    volumeScope().then((scope) => respond({
      active: Boolean(scope && scope.tabId === (message.tabId ?? sender.tab?.id)),
      volume: scope?.volume ?? 1,
      selectedTabId: scope?.tabId ?? null
    }), (error) => respond({ error: String(error) }));
    return true;
  }
  if (message?.type === 'SET_VOLUME_SCOPE' && Number.isInteger(message.tabId)) {
    (async () => {
      const old = await volumeScope();
      if (message.enabled) {
        const { settings } = await api.storage.local.get('settings');
        const previousVolume = old?.previousVolume ?? settings?.volume ?? 1;
        const volume = Math.max(0, Math.min(3, Number(message.volume) || 0));
        await api.storage.session.set({ volumeScope: { tabId: message.tabId, volume, previousVolume } });
        if ((settings?.volume ?? 1) > 1) {
          await api.storage.local.set({ settings: { ...settings, volume: 1 } });
        }
      } else if (old?.tabId === message.tabId) {
        await api.storage.session.remove('volumeScope');
        const { settings } = await api.storage.local.get('settings');
        await api.storage.local.set({ settings: { ...settings, volume: old.previousVolume } });
      }
      respond({ previousTabId: old?.tabId ?? null, scope: await volumeScope() });
    })().catch((error) => respond({ error: String(error) }));
    return true;
  }
  if (message?.type === 'SAVE_SCOPED_VOLUME' && sender.tab?.id) {
    (async () => {
      const scope = await volumeScope();
      if (scope?.tabId !== sender.tab.id) return respond({ active: false });
      const volume = Math.max(0, Math.min(3, Number(message.volume) || 0));
      await api.storage.session.set({ volumeScope: { ...scope, volume } });
      respond({ active: true });
    })().catch((error) => respond({ error: String(error) }));
    return true;
  }
  if (!sender.tab?.id) return;
  if (message?.type !== 'INIT_PREFERENCES' && (message?.type !== 'VIDEO_SHORTCUT' || !actions.has(message.action))) return;
  const type = message.type === 'INIT_PREFERENCES' ? 'GET_STATE' : message.action;
  sendToFrame(sender.tab.id, sender.frameId ?? 0, { type }).then(respond, (error) => {
    console.warn('VidTune could not control this page:', error);
    respond({ error: String(error) });
  });
  return true;
});
