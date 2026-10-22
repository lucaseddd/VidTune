import { activeTab, browserApi, sendToVideo } from './browser.js';
import { summarizeVideos } from './detection.js';
import { loadSettings, MODULES, updateSettings } from './settings.js';
import { formatSpeed, normalizeSpeed } from './speed.js';
import { formatVolume, positionToVolume, volumeToPosition } from './volume.js';

const labels = {
  speed: 'Video speed', volume: 'Volume boost', mono: 'Mono audio', pip: 'Picture in Picture',
  presets: 'Speed presets', customSpeed: 'Custom speed', resetSpeed: 'Reset speed',
  seekBackward: 'Skip backward', seekForward: 'Skip forward', tabVolume: 'Only this tab'
};
const list = document.querySelector('#module-list');
const status = document.querySelector('#status');
const smartToggle = document.querySelector('#smart-organize');
let settings;
let currentTab;
let videoState = { speed: 1, volume: 1, mono: false, hasVideo: false };
let scopeActive = false;
let volumeTimer;
let volumeRequests = Promise.resolve();
let layoutWrites = Promise.resolve();

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = kind;
}

function renderModules() {
  const count = settings.moduleCount;
  document.querySelector(`[name="module-count"][value="${count}"]`).checked = true;
  smartToggle.checked = settings.smartOrganize;
  list.classList.toggle('smart', settings.smartOrganize);
  const selected = settings.moduleLayouts[count].map((name, index) => ({ name, index }));
  if (settings.smartOrganize) selected.sort((a, b) => MODULES.indexOf(a.name) - MODULES.indexOf(b.name));
  list.replaceChildren(...selected.map(({ name, index }) => {
    const row = document.createElement('div');
    row.className = 'module-row';
    row.dataset.module = name;
    row.dataset.index = String(index);
    const number = document.createElement('span');
    number.className = 'module-number';
    number.textContent = String(index + 1);
    const select = document.createElement('select');
    select.className = 'module-select';
    select.setAttribute('aria-label', `Module ${index + 1} function`);
    select.append(...MODULES.map((id) => new Option(labels[id], id)));
    select.value = name;
    const body = document.createElement('div');
    body.className = 'module-control';
    body.append(document.querySelector(`#module-${name}`).content.cloneNode(true));
    row.append(number, select, body);
    return row;
  }));
  const preset = document.querySelector('#preset-choice');
  if (preset) {
    preset.append(new Option('Choose speed', ''));
    for (const speed of settings.presets) preset.append(new Option(formatSpeed(speed), String(speed)));
  }
  renderVideoState(videoState);
}

function renderVideoState(state) {
  if (!state || state.error) throw new Error(state?.error || 'Video unavailable');
  videoState = state;
  document.querySelector('#video-summary').textContent = summarizeVideos(state.count ?? 0);
  setStatus(state.disabled ? 'Disabled on this site' : state.pipPrompt ? 'Click PiP on the video' :
    state.pipError || (state.monoUnavailable ? 'Mono unavailable for this video' :
    state.boostUnavailable ? 'Boost unavailable for this video' : state.boostPending ? 'Play video for boost' :
      state.hasVideo ? 'Ready' : 'No video'),
  state.monoUnavailable || state.boostUnavailable || state.pipError ? 'error' : state.hasVideo && !state.disabled ? 'ready' : '');
  const speed = normalizeSpeed(state.speed);
  const speedValue = document.querySelector('#speed-value');
  if (speedValue) speedValue.textContent = formatSpeed(speed);
  const manual = document.querySelector('#manual-value');
  if (manual && document.activeElement !== manual) manual.value = String(speed);
  const slider = document.querySelector('#volume-slider');
  if (slider && document.activeElement !== slider) slider.value = String(volumeToPosition(state.volume));
  const volumeValue = document.querySelector('#volume-value');
  if (volumeValue) volumeValue.textContent = formatVolume(state.volume);
  const mono = document.querySelector('#mono-toggle');
  if (mono) mono.checked = Boolean(state.mono);
  const pip = document.querySelector('#toggle-pip');
  if (pip) {
    pip.disabled = Boolean(state.disabled || !state.pipAvailable);
    pip.setAttribute('aria-pressed', String(Boolean(state.pipActive)));
    pip.setAttribute('aria-label', state.pipActive ? 'Close Picture in Picture' : 'Open Picture in Picture');
  }
  const tabVolume = document.querySelector('#tab-volume-only');
  if (tabVolume) tabVolume.checked = scopeActive;
  for (const element of list.querySelectorAll('button:not(#toggle-pip), input, select:not(.module-select)')) {
    element.disabled = Boolean(state.disabled);
  }
}

async function send(message) {
  if (!currentTab?.id) return;
  try {
    const state = await sendToVideo(currentTab.id, message);
    renderVideoState(state);
    if (state.pipPrompt) await browserApi().tabs.update(currentTab.id, { active: true });
    if (!state.hasVideo && !state.disabled) setStatus('Saved for next video');
  } catch { setStatus('Control unavailable here', 'error'); }
}

function sendVolume(volume, persist) {
  if (!currentTab?.id) return;
  volumeRequests = volumeRequests.catch(() => {}).then(() => send({ type: persist ? 'SET_VOLUME' : 'PREVIEW_VOLUME', volume }));
}

function saveLayout(patch) {
  layoutWrites = layoutWrites.catch(() => {}).then(async () => {
    settings = await updateSettings(patch);
    renderModules();
  }).catch(() => setStatus('Could not save modules', 'error'));
}

list.addEventListener('change', async (event) => {
  const target = event.target;
  if (target.matches('.module-select')) {
    const index = Number(target.closest('.module-row').dataset.index);
    const layout = [...settings.moduleLayouts[settings.moduleCount]];
    const other = layout.indexOf(target.value);
    if (other >= 0) layout[other] = layout[index];
    layout[index] = target.value;
    saveLayout({ moduleLayouts: { ...settings.moduleLayouts, [settings.moduleCount]: layout } });
  } else if (target.id === 'volume-slider') {
    clearTimeout(volumeTimer);
    volumeTimer = null;
    sendVolume(positionToVolume(target.value), true);
  } else if (target.id === 'preset-choice' && target.value) {
    send({ type: 'SET_SPEED', speed: Number(target.value) });
  } else if (target.id === 'mono-toggle') {
    send({ type: 'SET_MONO', enabled: target.checked });
  } else if (target.id === 'tab-volume-only' && currentTab?.id) {
    target.disabled = true;
    try {
      await volumeRequests;
      const result = await browserApi().runtime.sendMessage({
        type: 'SET_VOLUME_SCOPE', tabId: currentTab.id, enabled: target.checked,
        volume: videoState.volume
      });
      if (result.error) throw new Error(result.error);
      scopeActive = result.active;
      renderVideoState(await sendToVideo(currentTab.id, { type: 'SYNC_VOLUME_SCOPE' }));
    } catch { setStatus('Could not change volume scope', 'error'); }
    finally { target.disabled = false; }
  }
});

list.addEventListener('input', (event) => {
  if (event.target.id !== 'volume-slider') return;
  const volume = positionToVolume(event.target.value);
  document.querySelector('#volume-value').textContent = formatVolume(volume);
  if (!volumeTimer) volumeTimer = setTimeout(() => {
    volumeTimer = null;
    sendVolume(volume, false);
  }, 50);
});

list.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'CUSTOM_SPEED') {
    const input = document.querySelector('#manual-value');
    const speed = Number(input.value);
    if (!input.value.trim() || !Number.isFinite(speed) || speed < 0.1 || speed > 16) {
      setStatus('Enter 0.1×–16×', 'error');
      return;
    }
    send({ type: 'SET_SPEED', speed });
  } else send({ type: action });
});

document.querySelector('.model-picker').addEventListener('change', (event) => {
  if (event.target.name === 'module-count') saveLayout({ moduleCount: Number(event.target.value) });
});
smartToggle.addEventListener('change', () => saveLayout({ smartOrganize: smartToggle.checked }));
document.querySelector('#open-settings').addEventListener('click', () => browserApi().runtime.openOptionsPage());

document.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.composedPath().some((element) => element?.closest?.('input:not([type="radio"]):not([type="checkbox"]), textarea, select, [contenteditable], [role="textbox"]'))) return;
  const shortcut = Object.keys(settings?.shortcuts ?? {}).find((key) => settings.shortcuts[key] === event.code);
  if (!shortcut || (shortcut.startsWith('seek') && !settings.seekEnabled)) return;
  const action = {
    decrease: 'DECREASE', increase: 'INCREASE', reset: 'RESET',
    seekBackward: 'SEEK_BACKWARD', seekForward: 'SEEK_FORWARD', pip: 'TOGGLE_PIP'
  }[shortcut];
  if (event.repeat && !['INCREASE', 'DECREASE'].includes(action)) return;
  event.preventDefault();
  send({ type: action });
}, true);

try {
  [settings, currentTab] = await Promise.all([loadSettings(), activeTab()]);
  videoState = { ...videoState, speed: settings.speed, volume: settings.volume, mono: settings.mono };
  renderModules();
  if (currentTab?.id) {
    try { document.querySelector('#site').textContent = new URL(currentTab.url).hostname; } catch { /* Restricted tab. */ }
    const scope = await browserApi().runtime.sendMessage({ type: 'GET_VOLUME_SCOPE', tabId: currentTab.id });
    scopeActive = Boolean(scope.active);
    if (settings.autoDetect) renderVideoState(await sendToVideo(currentTab.id, { type: 'GET_STATE' }));
    else setStatus('Video scan paused');
  } else setStatus('No tab');
} catch { setStatus('VidTune could not load', 'error'); }
