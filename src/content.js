// Passive frame bootstrap; the controller initializes only for a control request.
(() => {
  if (globalThis.__vidTuneBootstrap) return;
  globalThis.__vidTuneBootstrap = true;
  const bootstrapApi = globalThis.browser ?? globalThis.chrome;
  let handleMessage;
  bootstrapApi.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'PROBE_VIDEOS') {
      const videos = [...document.querySelectorAll('video')].filter((video) => video.isConnected);
      const playing = videos.filter((video) => !video.paused && !video.ended);
      const area = Math.max(0, ...(playing.length ? playing : videos).map((video) => {
        const rect = video.getBoundingClientRect();
        return Math.max(0, rect.width) * Math.max(0, rect.height);
      }));
      respond({ count: videos.length, playing: playing.length > 0, area });
      return;
    }
    if (!['GET_STATE', 'SET_SPEED', 'INCREASE', 'DECREASE', 'RESET', 'SET_VOLUME', 'PREVIEW_VOLUME', 'SEEK_BACKWARD', 'SEEK_FORWARD'].includes(message?.type)) return;
    initialize();
    return handleMessage(message, sender, respond);
  });

  function initialize() {
    if (globalThis.__vidTuneController) return;
    globalThis.__vidTuneController = true;

    const api = globalThis.browser ?? globalThis.chrome;
    const MIN = 0.1;
    const MAX = 16;
    const siteHost = globalThis.location?.hostname ?? '';
    let desiredSpeed = 1;
    let desiredVolume = 1;
    let volumeManaged = false;
    let activeBoostVideo = null;
    let boostError = null;
    const audioRoutes = new WeakMap();
    const pendingRoutes = new WeakMap();
    const failedSources = new WeakMap();
    let hasSiteProfile = false;
    let speedStep = 0.1;
    let seekSeconds = 10;
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

    function normalizeVolume(value) {
      if (value == null || value === '') return 1;
      const number = Number(value);
      return Number.isFinite(number)
        ? Math.round(Math.max(0, Math.min(3, number)) * 10000) / 10000
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

    function canRouteAudio(video) {
      if (video.srcObject) return true;
      const source = video.currentSrc || video.src;
      if (!source) return false;
      try {
        const url = new URL(source, document.baseURI);
        return url.protocol === 'data:' || url.origin === location.origin || Boolean(video.crossOrigin);
      } catch { return false; }
    }

    async function audioRoute(video) {
      if (audioRoutes.has(video)) return audioRoutes.get(video);
      if (pendingRoutes.has(video)) return pendingRoutes.get(video);
      const task = (async () => {
        if (!canRouteAudio(video) && !await prepareAudioSource(video)) return null;
        const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
        if (!AudioContextClass) return null;
        let context;
        try {
          context = new AudioContextClass();
          let timeout;
          try {
            await Promise.race([
              context.resume(),
              new Promise((resolve) => { timeout = setTimeout(resolve, 500); })
            ]);
          } finally { clearTimeout(timeout); }
          if (context.state !== 'running') throw new Error('Audio context is suspended');
          const gain = context.createGain();
          const compressor = context.createDynamicsCompressor();
          // Limit only peaks near full scale, leaving the requested gain audible.
          compressor.threshold.value = -1;
          compressor.knee.value = 0;
          compressor.ratio.value = 20;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.25;
          gain.connect(compressor);
          compressor.connect(context.destination);
          const source = context.createMediaElementSource(video);
          source.connect(gain);
          const route = { context, gain, compressor, mode: 'boost' };
          audioRoutes.set(video, route);
          return route;
        } catch {
          await context?.close().catch(() => {});
          return null;
        }
      })();
      pendingRoutes.set(video, task);
      try { return await task; }
      finally { pendingRoutes.delete(video); }
    }

    async function prepareAudioSource(video) {
      const source = video.currentSrc || video.src;
      if (!source || video.mediaKeys || failedSources.get(video) === source) return false;
      try {
        const url = new URL(source, document.baseURI);
        if (!['http:', 'https:'].includes(url.protocol)) return false;
        const response = await fetch(source, {
          method: 'HEAD', mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(5000)
        });
        if (!response.ok || !video.isConnected || (video.currentSrc || video.src) !== source) {
          failedSources.set(video, source);
          return false;
        }
      } catch {
        failedSources.set(video, source);
        return false;
      }
      const snapshot = {
        time: video.currentTime, paused: video.paused, speed: video.playbackRate,
        muted: video.muted, volume: video.volume, crossOrigin: video.getAttribute('crossorigin')
      };
      const sourceSignature = () => JSON.stringify([video.getAttribute('src'),
        [...video.querySelectorAll('source')].map((item) => item.getAttribute('src'))]);
      const originalSignature = sourceSignature();
      const stillCurrent = () => video.isConnected && sourceSignature() === originalSignature &&
        (!video.currentSrc || video.currentSrc === source);
      const reload = (cors) => new Promise((resolve) => {
        const finish = (success) => {
          clearTimeout(timer);
          video.removeEventListener('loadedmetadata', loaded);
          video.removeEventListener('error', failed);
          resolve(success);
        };
        const loaded = () => {
          if (!stillCurrent()) { finish(false); return; }
          try {
            video.playbackRate = snapshot.speed;
            video.volume = snapshot.volume;
            video.muted = snapshot.muted;
            if (Number.isFinite(snapshot.time)) video.currentTime = snapshot.time;
            if (!snapshot.paused) video.play().catch(() => {});
            finish(true);
          } catch { finish(false); }
        };
        const failed = () => finish(false);
        const timer = setTimeout(failed, 10000);
        video.addEventListener('loadedmetadata', loaded);
        video.addEventListener('error', failed);
        try {
          if (cors == null) video.removeAttribute('crossorigin');
          else video.setAttribute('crossorigin', cors);
          video.load();
        } catch { finish(false); }
      });
      if (await reload('anonymous')) return true;
      failedSources.set(video, source);
      if (stillCurrent()) await reload(snapshot.crossOrigin);
      return false;
    }

    function routeNative(video, volume) {
      const route = audioRoutes.get(video);
      if (route) {
        route.gain.gain.value = 1;
        if (route.mode !== 'native') {
          route.gain.disconnect();
          route.gain.connect(route.context.destination);
          route.mode = 'native';
        }
      }
      if (Math.abs(video.volume - volume) > 0.00005) video.volume = volume;
    }

    function routeBoost(video, route, volume) {
      if (route.mode !== 'boost') {
        route.gain.disconnect();
        route.gain.connect(route.compressor);
        route.mode = 'boost';
      }
      if (video.volume !== 1) video.volume = 1;
      route.gain.gain.setValueAtTime(volume, route.context.currentTime);
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

    async function applyToMain() {
      const video = mainVideo();
      if (activeBoostVideo && activeBoostVideo !== video) {
        routeNative(activeBoostVideo, 1);
        activeBoostVideo = null;
      }
      bindIndicator(video);
      apply(video);
      if (video && desiredVolume > 1) {
        if (video.paused && !audioRoutes.has(video)) {
          routeNative(video, 1);
          boostError = null;
          updateIndicator();
          return;
        }
        const requestedVolume = desiredVolume;
        const route = await audioRoute(video);
        if (requestedVolume !== desiredVolume || video !== mainVideo()) return applyToMain();
        if (route) {
          routeBoost(video, route, desiredVolume);
          activeBoostVideo = video;
          boostError = null;
        } else {
          routeNative(video, 1);
          boostError = 'Boost unavailable for this video';
        }
      } else if (video && (volumeManaged || audioRoutes.has(video))) {
        routeNative(video, desiredVolume);
        if (activeBoostVideo === video) activeBoostVideo = null;
        boostError = null;
      } else if (!video) {
        boostError = null;
      }
      updateIndicator();
    }

    function onMediaEvent(event) {
      if (event.target?.localName !== 'video') return;
      if (event.type === 'play') lastActiveVideo = event.target;
      applyToMain().catch(() => {});
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
      queueMicrotask(() => { scanQueued = false; applyToMain().catch(() => {}); });
    }

    function updateMonitoring() {
      if ((desiredSpeed !== 1 || desiredVolume !== 1 || hasSiteProfile) && !observer) {
        document.addEventListener('play', onMediaEvent, true);
        document.addEventListener('loadedmetadata', onMediaEvent, true);
        document.addEventListener('loadstart', onMediaEvent, true);
        observer = new MutationObserver(onMutations);
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } else if (desiredSpeed === 1 && desiredVolume === 1 && !hasSiteProfile && observer) {
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
        volume: video ? normalizeVolume(video.muted ? 0 : activeBoostVideo === video || (desiredVolume > 1 && video.paused && !boostError) ? desiredVolume : video.volume) : desiredVolume,
        boostUnavailable: Boolean(video && desiredVolume > 1 && boostError),
        boostPending: Boolean(video && desiredVolume > 1 && video.paused && !audioRoutes.has(video)),
        hasVideo: Boolean(video),
        playing: Boolean(video && !video.paused && !video.ended)
      };
    }

    async function setSpeed(value) {
      desiredSpeed = normalize(value);
      updateMonitoring();
      await applyToMain();
      flashIndicator();
      const { settings } = await api.storage.local.get('settings');
      const siteSpeeds = settings?.siteSpeeds ?? {};
      const updated = Object.hasOwn(siteSpeeds, siteHost)
        ? { ...settings, siteSpeeds: { ...siteSpeeds, [siteHost]: desiredSpeed } }
        : { ...settings, speed: desiredSpeed };
      await api.storage.local.set({ settings: updated });
      return state();
    }

    async function setVolume(value, persist) {
      desiredVolume = normalizeVolume(value);
      volumeManaged = true;
      updateMonitoring();
      const video = mainVideo();
      if (video && desiredVolume > 0 && video.muted) video.muted = false;
      await applyToMain();
      if (persist) {
        const { settings } = await api.storage.local.get('settings');
        await api.storage.local.set({ settings: { ...settings, volume: desiredVolume } });
      }
      return state();
    }

    function seek(direction) {
      const video = mainVideo();
      if (!video || !Number.isFinite(video.currentTime)) return state();
      const ranges = video.seekable;
      let start = 0;
      let end = Number.isFinite(video.duration) ? video.duration : null;
      if (ranges?.length) {
        const index = [...Array(ranges.length).keys()].find((i) =>
          video.currentTime >= ranges.start(i) && video.currentTime <= ranges.end(i));
        if (index != null) { start = ranges.start(index); end = ranges.end(index); }
      }
      if (end == null || end <= start) return state();
      video.currentTime = Math.max(start, Math.min(end, video.currentTime + direction * seekSeconds));
      return state();
    }

    const ready = api.storage.local.get('settings').then(async ({ settings }) => {
      hasSiteProfile = Object.hasOwn(settings?.siteSpeeds ?? {}, siteHost);
      desiredSpeed = normalize(settings?.siteSpeeds?.[siteHost] ?? settings?.speed);
      desiredVolume = normalizeVolume(settings?.volume);
      volumeManaged = desiredVolume !== 1;
      speedStep = Number(settings?.speedStep) || 0.1;
      seekSeconds = Number(settings?.seekSeconds) || 10;
      updateMonitoring();
      if (desiredSpeed !== 1 || desiredVolume !== 1 || hasSiteProfile) await applyToMain();
    });

    api.storage.onChanged?.addListener((changes, area) => {
      if (area !== 'local' || !changes.settings) return;
      const settings = changes.settings.newValue;
      speedStep = Number(settings?.speedStep) || 0.1;
      seekSeconds = Number(settings?.seekSeconds) || 10;
      hasSiteProfile = Object.hasOwn(settings?.siteSpeeds ?? {}, siteHost);
      const nextVolume = normalizeVolume(settings?.volume);
      if (nextVolume !== desiredVolume) {
        desiredVolume = nextVolume;
        volumeManaged = true;
        applyToMain().catch(() => {});
      }
      updateMonitoring();
    });

    let pending = ready;
    handleMessage = (message, _sender, respond) => {
      if (!['GET_STATE', 'SET_SPEED', 'INCREASE', 'DECREASE', 'RESET', 'SET_VOLUME', 'PREVIEW_VOLUME', 'SEEK_BACKWARD', 'SEEK_FORWARD'].includes(message?.type)) return;
      pending = pending.then(async () => {
        const current = state().speed;
        switch (message.type) {
          case 'SET_SPEED': return setSpeed(message.speed);
          case 'INCREASE': return setSpeed(current + speedStep);
          case 'DECREASE': return setSpeed(current - speedStep);
          case 'RESET': return setSpeed(1);
          case 'SET_VOLUME': return setVolume(message.volume, true);
          case 'PREVIEW_VOLUME': return setVolume(message.volume, false);
          case 'SEEK_BACKWARD': return seek(-1);
          case 'SEEK_FORWARD': return seek(1);
          default: return state();
        }
      });
      pending.then(respond, (error) => respond({ error: String(error) }));
      pending = pending.catch(() => {});
      return true;
    };
  }
})();
