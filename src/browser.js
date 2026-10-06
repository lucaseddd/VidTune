export function browserApi() {
  const api = globalThis.browser ?? globalThis.chrome;
  if (!api) throw new Error('Browser extension APIs are unavailable');
  return api;
}

export async function activeTab() {
  const [tab] = await browserApi().tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}
