import { browserApi } from './browser.js';

export const DEFAULT_SETTINGS = Object.freeze({ autoDetect: true });

export function normalizeSettings(value) {
  return { autoDetect: typeof value?.autoDetect === 'boolean' ? value.autoDetect : true };
}

export async function loadSettings() {
  const data = await browserApi().storage.local.get('settings');
  return normalizeSettings(data.settings);
}

export async function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  await browserApi().storage.local.set({ settings: normalized });
  return normalized;
}
