import { activeTab, browserApi, sendToVideo } from './browser.js';
import { summarizeVideos } from './detection.js';
import { loadSettings } from './settings.js';
import { formatSpeed, normalizeSpeed } from './speed.js';
import { formatVolume, positionToVolume, volumeToPosition } from './volume.js';

const site = document.querySelector('#site');
const summary = document.querySelector('#video-summary');
const status = document.querySelector('#status');
const speedNote = document.querySelector('#speed-note');
const speedValue = document.querySelector('#speed-value');
const manualValue = document.querySelector('#manual-value');
const refresh = document.querySelector('#refresh');
const volumeSlider = document.querySelector('#volume-slider');
const volumeValue = document.querySelector('#volume-value');
let currentTab = null;
let volumeTimer = null;
let pendingVolume = null;
let volumeRequests = Promise.resolve();
let shortcuts = { decrease: 'KeyA', increase: 'KeyD', reset: 'KeyQ', seekBackward: null, seekForward: null };
let seekEnabled = false;

function renderPresets(presets) {
  document.querySelector('#presets').replaceChildren(...presets.map((speed) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.speed = String(speed);
    button.textContent = formatSpeed(speed);
    return button;
  }));
}

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

function renderVolume(volume) {
  const label = formatVolume(volume);
  volumeSlider.value = String(volumeToPosition(volume));
  volumeSlider.setAttribute('aria-valuetext', label);
  volumeValue.textContent = label;
}

function volumeFromSlider() {
  const volume = positionToVolume(volumeSlider.value);
  const label = formatVolume(volume);
  volumeSlider.setAttribute('aria-valuetext', label);
  volumeValue.textContent = label;
  return volume;
}

function sendVolume(volume, persist) {
  if (!currentTab?.id) return;
  volumeRequests = volumeRequests.catch(() => {}).then(async () => {
    const state = await sendToVideo(currentTab.id, { type: persist ? 'SET_VOLUME' : 'PREVIEW_VOLUME', volume });
    if (state.error) throw new Error(state.error);
    if (state.boostUnavailable) setStatus('Boost unavailable for this video', 'error');
    else if (state.boostPending) setStatus('Play video to enable boost');
    else if (state.hasVideo) setStatus('Ready', 'ready');
    if (persist) renderVolume(state.volume);
  }).catch(() => setStatus('Volume unavailable here', 'error'));
}

function renderVideoState(state) {
  if (state?.error) throw new Error(state.error);
  summary.textContent = summarizeVideos(state.count);
  setStatus(state.boostUnavailable ? 'Boost unavailable for this video' : state.boostPending ? 'Play video to enable boost' : state.hasVideo ? 'Ready' : 'No video',
    state.boostUnavailable ? 'error' : state.hasVideo && !state.boostPending ? 'ready' : '');
  renderSpeed(state.speed, state.hasVideo);
  if (document.activeElement !== volumeSlider) renderVolume(state.volume);
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
  for (const button of document.querySelectorAll('.speed-card button')) button.disabled = true;
  try {
    const state = await sendToVideo(currentTab.id, message);
    renderVideoState(state);
    if (!state.hasVideo) setStatus('Saved for next video');
  } catch {
    setStatus('Speed unavailable here', 'error');
  } finally {
    for (const button of document.querySelectorAll('.speed-card button')) button.disabled = false;
  }
}

async function initialize() {
  try {
    const [settings, tab] = await Promise.all([loadSettings(), activeTab()]);
    shortcuts = settings.shortcuts;
    seekEnabled = settings.seekEnabled;
    manualValue.step = String(settings.speedStep);
    renderPresets(settings.presets);
    document.querySelector('.footnote').textContent = `Video shortcuts: ${shortcuts.decrease?.slice(3) ?? '—'} slower · ${shortcuts.increase?.slice(3) ?? '—'} faster · ${shortcuts.reset?.slice(3) ?? '—'} reset`;
    renderSpeed(settings.speed);
    renderVolume(settings.volume);
    currentTab = tab;
    if (!tab) {
      site.textContent = 'No active tab';
      summary.textContent = 'Open a page to get started.';
      setStatus('No tab');
      refresh.disabled = true;
      volumeSlider.disabled = true;
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
volumeSlider.addEventListener('input', () => {
  pendingVolume = volumeFromSlider();
  if (!volumeTimer) volumeTimer = setTimeout(() => {
    volumeTimer = null;
    sendVolume(pendingVolume, false);
  }, 50);
});
volumeSlider.addEventListener('change', () => {
  clearTimeout(volumeTimer);
  volumeTimer = null;
  sendVolume(volumeFromSlider(), true);
});
document.querySelector('#open-settings').addEventListener('click', () => browserApi().runtime.openOptionsPage());
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
document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.composedPath().some((element) => element?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]'))) return;
  const name = Object.keys(shortcuts).find((key) => shortcuts[key] === event.code);
  if (!name || (name.startsWith('seek') && !seekEnabled)) return;
  const action = {
    decrease: 'DECREASE', increase: 'INCREASE', reset: 'RESET',
    seekBackward: 'SEEK_BACKWARD', seekForward: 'SEEK_FORWARD'
  }[name];
  if (event.repeat && !['INCREASE', 'DECREASE'].includes(action)) return;
  event.preventDefault();
  control({ type: action });
}, true);

initialize();
