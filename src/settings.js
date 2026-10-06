import { browserApi } from './browser.js';
import { normalizeSpeed, SPEED_PRESETS } from './speed.js';

export const DEFAULT_SHORTCUTS = Object.freeze({
  decrease: 'KeyA', increase: 'KeyD', reset: 'KeyQ', seekBackward: null, seekForward: null
});
export const DEFAULT_SETTINGS = Object.freeze({
  autoDetect: true, speed: 1, speedStep: 0.1, presets: SPEED_PRESETS,
  shortcuts: DEFAULT_SHORTCUTS, seekEnabled: false, seekSeconds: 10, siteSpeeds: {}
});

function shortcut(value, fallback) {
  return value === null || /^Key[A-Z]$/.test(value ?? '') ? value : fallback;
}

function presets(value) {
  if (!Array.isArray(value) || value.length < 3 || value.length > 8) return [...SPEED_PRESETS];
  const numbers = value.map(Number);
  if (numbers.some((number) => !Number.isFinite(number) || number < 0.1 || number > 16)) return [...SPEED_PRESETS];
  const unique = [...new Set(numbers.map(normalizeSpeed))];
  return unique.length >= 3 ? unique : [...SPEED_PRESETS];
}

function siteSpeeds(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([host, speed]) =>
    /^[a-z0-9.-]{1,253}$/i.test(host) && Number.isFinite(Number(speed)) && Number(speed) >= 0.1 && Number(speed) <= 16
  ).slice(0, 100).map(([host, speed]) => [host.toLowerCase(), normalizeSpeed(speed)]));
}

export function normalizeSettings(value) {
  const step = Number(value?.speedStep);
  const seek = Number(value?.seekSeconds);
  const keys = Object.fromEntries(Object.entries(DEFAULT_SHORTCUTS).map(([name, fallback]) =>
    [name, shortcut(value?.shortcuts?.[name], fallback)]));
  const used = new Set();
  for (const name of Object.keys(keys)) {
    if (keys[name] && used.has(keys[name])) keys[name] = null;
    if (keys[name]) used.add(keys[name]);
  }
  return {
    autoDetect: typeof value?.autoDetect === 'boolean' ? value.autoDetect : true,
    speed: normalizeSpeed(value?.speed),
    speedStep: Number.isFinite(step) && step >= 0.01 && step <= 2 ? Math.round(step * 100) / 100 : 0.1,
    presets: presets(value?.presets),
    shortcuts: keys,
    seekEnabled: value?.seekEnabled === true,
    seekSeconds: Number.isInteger(seek) && seek >= 1 && seek <= 60 ? seek : 10,
    siteSpeeds: siteSpeeds(value?.siteSpeeds)
  };
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

export async function updateSettings(patch) {
  return saveSettings({ ...await loadSettings(), ...patch });
}
