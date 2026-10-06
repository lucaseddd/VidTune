import { activeTab, sendToVideo } from './browser.js';
import { loadSettings, saveSettings } from './settings.js';

const form = document.querySelector('#settings-form');
const feedback = document.querySelector('#feedback');
const fields = {
  speedStep: document.querySelector('#speed-step'),
  presets: document.querySelector('#presets'),
  autoDetect: document.querySelector('#auto-detect'),
  seekEnabled: document.querySelector('#seek-enabled'),
  seekSeconds: document.querySelector('#seek-seconds'),
  siteEnabled: document.querySelector('#site-enabled'),
  siteSpeed: document.querySelector('#site-speed')
};
const keyFields = {
  decrease: document.querySelector('#key-decrease'),
  increase: document.querySelector('#key-increase'),
  reset: document.querySelector('#key-reset'),
  seekBackward: document.querySelector('#key-seek-backward'),
  seekForward: document.querySelector('#key-seek-forward')
};
let settings;
let tab;
let host = null;

function show(text, error = false) {
  feedback.textContent = text;
  feedback.className = error ? 'error' : '';
}

function validNumber(input, min, max, integer = false) {
  const value = Number(input.value);
  if (!input.value.trim() || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${input.closest('label')?.textContent?.trim() ?? 'Value'} must be between ${min} and ${max}.`);
  }
  return value;
}

function presetValues() {
  const values = fields.presets.value.split(',').map((part) => Number(part.trim()));
  if (values.length < 3 || values.length > 8 || values.some((number) =>
    !Number.isFinite(number) || number < 0.1 || number > 16 || Math.abs(Math.round(number * 100) - number * 100) > 1e-6
  ) || new Set(values).size !== values.length) {
    throw new Error('Enter 3–8 different preset speeds from 0.1× to 16×, with at most two decimal places.');
  }
  return values;
}

function chosenKeys() {
  const keys = Object.fromEntries(Object.entries(keyFields).map(([name, field]) => [name, field.value || null]));
  const assigned = Object.values(keys).filter(Boolean);
  if (new Set(assigned).size !== assigned.length) throw new Error('Each keyboard shortcut needs a different letter.');
  if (fields.seekEnabled.checked && (!keys.seekBackward || !keys.seekForward)) {
    throw new Error('Choose backward and forward letters before enabling skip controls.');
  }
  return keys;
}

function populate() {
  fields.speedStep.value = String(settings.speedStep);
  fields.presets.value = settings.presets.join(', ');
  fields.autoDetect.checked = settings.autoDetect;
  fields.seekEnabled.checked = settings.seekEnabled;
  fields.seekSeconds.value = String(settings.seekSeconds);
  for (const [name, field] of Object.entries(keyFields)) field.value = settings.shortcuts[name] ?? '';
  fields.siteEnabled.checked = Boolean(host && Object.hasOwn(settings.siteSpeeds, host));
  fields.siteSpeed.value = String(settings.siteSpeeds[host] ?? settings.speed);
  fields.siteEnabled.disabled = !host;
  fields.siteSpeed.disabled = !host || !fields.siteEnabled.checked;
}

for (const field of Object.values(keyFields)) {
  field.append(new Option('None', ''));
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') field.append(new Option(letter, `Key${letter}`));
}

fields.siteEnabled.addEventListener('change', () => {
  fields.siteSpeed.disabled = !fields.siteEnabled.checked;
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const speedStep = validNumber(fields.speedStep, 0.01, 2);
    const seekSeconds = validNumber(fields.seekSeconds, 1, 60, true);
    const siteSpeeds = { ...settings.siteSpeeds };
    if (host) {
      if (fields.siteEnabled.checked) siteSpeeds[host] = validNumber(fields.siteSpeed, 0.1, 16);
      else delete siteSpeeds[host];
    }
    const next = {
      ...settings, autoDetect: fields.autoDetect.checked, speedStep, presets: presetValues(), shortcuts: chosenKeys(),
      seekEnabled: fields.seekEnabled.checked, seekSeconds, siteSpeeds
    };
    const previousSiteSpeed = settings.siteSpeeds[host] ?? settings.speed;
    settings = await saveSettings(next);
    if (host && tab?.id && (settings.siteSpeeds[host] ?? settings.speed) !== previousSiteSpeed) {
      const speed = settings.siteSpeeds[host] ?? settings.speed;
      await sendToVideo(tab.id, { type: 'SET_SPEED', speed });
    }
    show('Settings saved.');
  } catch (error) {
    show(error.message || 'Could not save settings.', true);
  }
});

try {
  [settings, tab] = await Promise.all([loadSettings(), activeTab()]);
  const url = new URL(tab?.url);
  if (['http:', 'https:'].includes(url.protocol)) host = url.hostname.toLowerCase();
} catch {
  settings = settings ?? await loadSettings();
}
document.querySelector('#site-name').textContent = host || 'Open a website to set a site speed.';
populate();
