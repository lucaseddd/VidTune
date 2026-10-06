import { activeTab } from './browser.js';
import { scanTab, summarizeVideos } from './detection.js';
import { loadSettings, saveSettings } from './settings.js';

const site = document.querySelector('#site');
const summary = document.querySelector('#video-summary');
const status = document.querySelector('#status');
const toggle = document.querySelector('#auto-detect');
const refresh = document.querySelector('#refresh');
let currentTab = null;

function setStatus(text, kind = '') {
  status.textContent = text;
  status.className = `status ${kind}`;
}

async function scan() {
  if (!currentTab?.id) return;
  setStatus('Checking…');
  summary.textContent = 'Looking for videos…';
  try {
    const videos = await scanTab(currentTab.id);
    summary.textContent = summarizeVideos(videos);
    setStatus(videos.length ? 'Ready' : 'No video', videos.length ? 'ready' : '');
  } catch {
    summary.textContent = 'This page does not allow video scanning.';
    setStatus('Unavailable', 'error');
  }
}

async function initialize() {
  try {
    const [settings, tab] = await Promise.all([loadSettings(), activeTab()]);
    toggle.checked = settings.autoDetect;
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
toggle.addEventListener('change', async () => {
  try {
    await saveSettings({ autoDetect: toggle.checked });
    if (toggle.checked) await scan();
    else { summary.textContent = 'Automatic scanning is off.'; setStatus('Paused'); }
  } catch {
    toggle.checked = !toggle.checked;
    setStatus('Could not save', 'error');
  }
});

initialize();
