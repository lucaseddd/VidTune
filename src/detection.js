import { browserApi } from './browser.js';

export function summarizeVideos(videos) {
  const count = videos.length;
  return count === 0 ? 'No videos found' : `${count} video${count === 1 ? '' : 's'} found`;
}

// This function runs inside the active page. Keep it self-contained for scripting.executeScript.
export function inspectPageVideos() {
  const videos = [...document.querySelectorAll('video')];
  return videos.map((video) => ({
    playing: !video.paused && !video.ended,
    visible: video.getBoundingClientRect().width > 0 && video.getBoundingClientRect().height > 0
  }));
}

export async function scanTab(tabId) {
  const results = await browserApi().scripting.executeScript({ target: { tabId }, func: inspectPageVideos });
  return results.flatMap((result) => result.result ?? []);
}
