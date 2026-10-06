// Injected only when the user opens VidTune or uses a video shortcut.
(() => {
  if (globalThis.__vidTuneController) return;
  globalThis.__vidTuneController = true;

  const api = globalThis.browser ?? globalThis.chrome;
  const MIN = 0.1;
  const MAX = 16;
  const STEP = 0.1;
  let desiredSpeed = 1;
  let lastActiveVideo = null;
  let observer = null;
  let scanQueued = false;

  function normalize(value) {
    if (value == null || value === '') return 1;
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.round(Math.min(MAX, Math.max(MIN, number)) * 100) / 100
      : 1;
  }

  function videos() {
    return [...document.querySelectorAll('video')].filter((video) => video.isConnected);
  }

  function mainVideo() {
    if (lastActiveVideo && !lastActiveVideo.isConnected) lastActiveVideo = null;
    let winner = null;
    let best = -1;
    for (const video of videos()) {
      const rect = video.getBoundingClientRect();
      const area = Math.max(0, rect.width) * Math.max(0, rect.height);
      const playing = !video.paused && !video.ended;
      const score = (playing ? 1e9 : 0) + (video === lastActiveVideo ? 1e6 : 0) + area;
      if (score > best) { best = score; winner = video; }
    }
    return winner;
  }

  function apply(video, speed = desiredSpeed) {
    if (video && Math.abs(video.playbackRate - speed) > 0.001) video.playbackRate = speed;
  }

  function applyToMain() { apply(mainVideo()); }

  function onMediaEvent(event) {
    if (event.target?.localName !== 'video') return;
    if (event.type === 'play') lastActiveVideo = event.target;
    applyToMain();
  }

  function onMutations(mutations) {
    if (scanQueued) return;
    const hasVideoChange = mutations.some(({ addedNodes, removedNodes }) =>
      [...addedNodes, ...removedNodes].some((node) =>
        node.nodeType === 1 && (node.localName === 'video' || node.querySelector?.('video'))
      )
    );
    if (!hasVideoChange) return;
    scanQueued = true;
    queueMicrotask(() => { scanQueued = false; applyToMain(); });
  }

  function updateMonitoring() {
    if (desiredSpeed !== 1 && !observer) {
      document.addEventListener('play', onMediaEvent, true);
      document.addEventListener('loadedmetadata', onMediaEvent, true);
      document.addEventListener('loadstart', onMediaEvent, true);
      observer = new MutationObserver(onMutations);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    } else if (desiredSpeed === 1 && observer) {
      observer.disconnect();
      observer = null;
      lastActiveVideo = null;
      document.removeEventListener('play', onMediaEvent, true);
      document.removeEventListener('loadedmetadata', onMediaEvent, true);
      document.removeEventListener('loadstart', onMediaEvent, true);
    }
  }

  function state() {
    const video = mainVideo();
    return {
      count: videos().length,
      speed: video ? normalize(video.playbackRate) : desiredSpeed,
      hasVideo: Boolean(video),
      playing: Boolean(video && !video.paused && !video.ended)
    };
  }

  async function setSpeed(value) {
    desiredSpeed = normalize(value);
    updateMonitoring();
    applyToMain();
    const { settings } = await api.storage.local.get('settings');
    await api.storage.local.set({ settings: { ...settings, speed: desiredSpeed } });
    return state();
  }

  const ready = api.storage.local.get('settings').then(({ settings }) => {
    desiredSpeed = normalize(settings?.speed);
    updateMonitoring();
    if (desiredSpeed !== 1) applyToMain();
  });

  let pending = ready;
  api.runtime.onMessage.addListener((message, _sender, respond) => {
    if (!['GET_STATE', 'SET_SPEED', 'INCREASE', 'DECREASE', 'RESET'].includes(message?.type)) return;
    pending = pending.then(async () => {
      const current = state().speed;
      switch (message.type) {
        case 'SET_SPEED': return setSpeed(message.speed);
        case 'INCREASE': return setSpeed(current + STEP);
        case 'DECREASE': return setSpeed(current - STEP);
        case 'RESET': return setSpeed(1);
        default: return state();
      }
    });
    pending.then(respond, (error) => respond({ error: String(error) }));
    pending = pending.catch(() => {});
    return true;
  });
})();
