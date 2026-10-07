export function browserApi() {
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api) throw new Error('Browser extension APIs are unavailable');
  return api;
}

export async function activeTab() {
  const api = browserApi();
  async function withUrl(tab) {
    if (!tab || tab.url) return tab;
    try {
      const frames = await api.webNavigation.getAllFrames({ tabId: tab.id });
      return { ...tab, url: frames?.find((frame) => frame.frameId === 0)?.url };
    } catch { return tab; }
  }
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.startsWith(api.runtime.getURL(''))) {
    const tabs = await Promise.all((await api.tabs.query({ currentWindow: true })).map(withUrl));
    return tabs.filter((candidate) => /^https?:/.test(candidate.url ?? ''))
      .sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0] ?? tab;
  }
  return await withUrl(tab) ?? null;
}

export async function sendToFrame(tabId, frameId, message) {
  const api = browserApi();
  try { return await api.tabs.sendMessage(tabId, message, { frameId }); }
  catch {
    await api.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['src/content.js'] });
    return api.tabs.sendMessage(tabId, message, { frameId });
  }
}

export async function sendToVideo(tabId, message) {
  const frames = await browserApi().webNavigation.getAllFrames({ tabId }) ?? [];
  const probes = await Promise.allSettled(frames.map(async ({ frameId }) => ({
    frameId, ...await sendToFrame(tabId, frameId, { type: 'PROBE_VIDEOS' })
  })));
  const available = probes.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const candidates = available.filter((frame) => frame.count > 0);
  candidates.sort((a, b) => Number(b.area > 0) - Number(a.area > 0) || Number(b.playing) - Number(a.playing) || b.area - a.area || a.frameId - b.frameId);
  const frame = candidates[0] ?? available.find((candidate) => candidate.frameId === 0);
  if (!frame) throw new Error('This page does not allow video controls');
  const state = await sendToFrame(tabId, frame.frameId, message);
  return { ...state, count: available.reduce((total, candidate) => total + candidate.count, 0) };
}
