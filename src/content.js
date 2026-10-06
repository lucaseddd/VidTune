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
  let indicator = null;
  let indicatorVideo = null;
  let indicatorPlayer = null;
  let controlsObserver = null;
  let pointerVisible = false;
  let changeVisible = false;
  let pointerTimer = null;
  let changeTimer = null;

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

  function indicatorControlsVisible() {
    return indicatorPlayer?.classList?.contains('html5-video-player')
      ? !indicatorPlayer.classList.contains('ytp-autohide')
      : pointerVisible;
  }

  function updateIndicator() {
    if (!indicator) return;
    indicator.textContent = `${normalize(indicatorVideo.playbackRate).toFixed(2)}×`;
    indicator.style.opacity = String(Number(changeVisible || indicatorControlsVisible()));
  }

  function positionIndicator() {
    if (!indicator || !indicatorVideo?.isConnected) return;
    const fullscreen = document.fullscreenElement;
    const parent = fullscreen?.contains(indicatorVideo) && fullscreen !== indicatorVideo ? fullscreen : document.body;
    if (parent && indicator.parentElement !== parent) parent.append(indicator);
    const rect = indicatorVideo.getBoundingClientRect();
    indicator.style.left = `${Math.max(0, Math.min(rect.left + 12, window.innerWidth - 64))}px`;
    indicator.style.top = `${Math.max(0, rect.top + 12)}px`;
    indicator.style.display = rect.width >= 80 && rect.height >= 50 ? 'block' : 'none';
  }

  function onPointerActivity() {
    pointerVisible = true;
    clearTimeout(pointerTimer);
    pointerTimer = setTimeout(() => { pointerVisible = false; updateIndicator(); }, 2200);
    positionIndicator();
    updateIndicator();
  }

  function onPointerLeave() {
    pointerVisible = false;
    clearTimeout(pointerTimer);
    updateIndicator();
  }

  function detachIndicator() {
    if (!indicator && !indicatorPlayer) return;
    indicatorPlayer?.removeEventListener('pointermove', onPointerActivity);
    indicatorPlayer?.removeEventListener('pointerenter', onPointerActivity);
    indicatorPlayer?.removeEventListener('pointerleave', onPointerLeave);
    controlsObserver?.disconnect();
    window.removeEventListener('scroll', positionIndicator, true);
    window.removeEventListener('resize', positionIndicator);
    document.removeEventListener('fullscreenchange', positionIndicator);
    clearTimeout(pointerTimer);
    clearTimeout(changeTimer);
    indicator?.remove();
    indicator = null;
    indicatorVideo = null;
    indicatorPlayer = null;
    controlsObserver = null;
    pointerVisible = false;
    changeVisible = false;
  }

  function bindIndicator(video) {
    if (video === indicatorVideo) return;
    detachIndicator();
    if (!video || !document.body) return;
    indicatorVideo = video;
    indicatorPlayer = video.closest?.('.html5-video-player') ?? video.parentElement ?? video;
    indicator = document.createElement('div');
    indicator.id = 'vidtune-speed-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    Object.assign(indicator.style, {
      position: 'fixed', zIndex: '2147483647', pointerEvents: 'none',
      background: 'rgba(0, 0, 0, 0.58)', color: '#fff', borderRadius: '5px',
      padding: '4px 7px', font: '12px/1.2 system-ui, sans-serif',
      fontVariantNumeric: 'tabular-nums', opacity: '0', transition: 'opacity 160ms ease'
    });
    indicatorPlayer.addEventListener('pointermove', onPointerActivity, { passive: true });
    indicatorPlayer.addEventListener('pointerenter', onPointerActivity, { passive: true });
    indicatorPlayer.addEventListener('pointerleave', onPointerLeave, { passive: true });
    if (indicatorPlayer.classList?.contains('html5-video-player')) {
      controlsObserver = new MutationObserver(updateIndicator);
      controlsObserver.observe(indicatorPlayer, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('scroll', positionIndicator, true);
    window.addEventListener('resize', positionIndicator);
    document.addEventListener('fullscreenchange', positionIndicator);
    positionIndicator();
    updateIndicator();
  }

  function flashIndicator() {
    if (!indicator) return;
    changeVisible = true;
    clearTimeout(changeTimer);
    positionIndicator();
    updateIndicator();
    changeTimer = setTimeout(() => { changeVisible = false; updateIndicator(); }, 1400);
  }

  function applyToMain() {
    const video = mainVideo();
    bindIndicator(video);
    apply(video);
    updateIndicator();
  }

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
    bindIndicator(video);
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
    flashIndicator();
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
