import { activeTab, sendToVideo } from './browser.js';
import { summarizeVideos } from './detection.js';
import { loadSettings, updateSettings } from './settings.js';
import { formatSpeed, normalizeSpeed } from './speed.js';

const site = document.querySelector('#site');
const summary = document.querySelector('#video-summary');
const status = document.querySelector('#status');
const speedNote = document.querySelector('#speed-note');
const speedValue = document.querySelector('#speed-value');
const manualValue = document.querySelector('#manual-value');
const toggle = document.querySelector('#auto-detect');
const refresh = document.querySelector('#refresh');
const speedButtons = [...document.querySelectorAll('.speed-card button')];
let currentTab = null;

function setStatus(text, kind = '') {
  status.textContent = text;
  status.className = `status ${kind}`;
}

function renderSpeed(speed, hasVideo = false) {
  const normalized = normalizeSpeed(speed);
  speedValue.textContent = formatSpeed(normalized);
  if (document.activeElement !== manualValue) manualValue.value = String(normalized);
  speedNote.textContent = hasVideo ? 'Current video' : 'Saved preference';
  for (const button of document.querySelectorAll('[data-speed]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === normalized));
  }
}

function renderVideoState(state) {
  if (state?.error) throw new Error(state.error);
  summary.textContent = summarizeVideos(state.count);
  setStatus(state.hasVideo ? 'Ready' : 'No video', state.hasVideo ? 'ready' : '');
  renderSpeed(state.speed, state.hasVideo);
}

async function scan() {
  if (!currentTab?.id) return;
  setStatus('Checking…');
  try {
    renderVideoState(await sendToVideo(currentTab.id, { type: 'GET_STATE' }));
  } catch {
    summary.textContent = 'This page does not allow video scanning.';
    setStatus('Unavailable', 'error');
  }
}

async function control(message) {
  if (!currentTab?.id) return;
  for (const button of speedButtons) button.disabled = true;
  try {
    const state = await sendToVideo(currentTab.id, message);
    renderVideoState(state);
    if (!state.hasVideo) setStatus('Saved for next video');
  } catch {
    setStatus('Speed unavailable here', 'error');
  } finally {
    for (const button of speedButtons) button.disabled = false;
  }
}

async function initialize() {
  try {
    const [settings, tab] = await Promise.all([loadSettings(), activeTab()]);
    toggle.checked = settings.autoDetect;
    renderSpeed(settings.speed);
    currentTab = tab;
    if (!tab) {
      site.textContent = 'No active tab';
      summary.textContent = 'Open a page to get started.';
      setStatus('No tab');
      refresh.disabled = true;
      return;
    }
    try { site.textContent = new URL(tab.url).hostname || 'Current page'; }
    catch { site.textContent = 'Current page'; }
    if (settings.autoDetect) await scan();
    else { summary.textContent = 'Automatic scanning is off.'; setStatus('Paused'); }
  } catch {
    summary.textContent = 'VidTune could not load its preferences.';
    setStatus('Error', 'error');
  }
}

refresh.addEventListener('click', scan);
document.querySelector('#increase').addEventListener('click', () => control({ type: 'INCREASE' }));
document.querySelector('#decrease').addEventListener('click', () => control({ type: 'DECREASE' }));
document.querySelector('#reset').addEventListener('click', () => control({ type: 'RESET' }));
document.querySelector('#presets').addEventListener('click', (event) => {
  const button = event.target.closest('[data-speed]');
  if (button) control({ type: 'SET_SPEED', speed: Number(button.dataset.speed) });
});
document.querySelector('#manual-speed').addEventListener('submit', (event) => {
  event.preventDefault();
  const speed = Number(manualValue.value);
  if (!manualValue.value.trim() || !Number.isFinite(speed) || speed < 0.1 || speed > 16) {
    setStatus('Enter a speed from 0.1 to 16', 'error');
    return;
  }
  control({ type: 'SET_SPEED', speed });
});
toggle.addEventListener('change', async () => {
  try {
    await updateSettings({ autoDetect: toggle.checked });
    if (toggle.checked) await scan();
    else { summary.textContent = 'Automatic scanning is off.'; setStatus('Paused'); }
  } catch {
    toggle.checked = !toggle.checked;
    setStatus('Could not save', 'error');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.composedPath().some((element) => element?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]'))) return;
  const action = { KeyA: 'DECREASE', KeyD: 'INCREASE', KeyQ: 'RESET' }[event.code];
  if (!action || (action === 'RESET' && event.repeat)) return;
  event.preventDefault();
  control({ type: action });
}, true);

initialize();
