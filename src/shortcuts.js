// A passive key listener is the only work performed on pages until a video shortcut is used.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  let shortcuts = { decrease: 'KeyA', increase: 'KeyD', reset: 'KeyQ', seekBackward: null, seekForward: null };
  let seekEnabled = false;
  let siteSpeed = null;

  function useSettings(settings) {
    shortcuts = {
      decrease: 'KeyA', increase: 'KeyD', reset: 'KeyQ', seekBackward: null, seekForward: null,
      ...settings?.shortcuts
    };
    seekEnabled = settings?.seekEnabled === true;
    const speed = settings?.siteSpeeds?.[location.hostname];
    if (speed != null && speed !== siteSpeed) {
      siteSpeed = speed;
      api.runtime.sendMessage({ type: 'INIT_SITE' }).catch(() => {});
    }
  }

  api.storage.local.get('settings').then(({ settings }) => useSettings(settings)).catch(() => {});
  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) useSettings(changes.settings.newValue);
  });

  function inEditable(element) {
    return Boolean(element?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]'));
  }

  window.addEventListener('keydown', (event) => {
    if (!event.isTrusted || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const name = Object.keys(shortcuts).find((key) => shortcuts[key] === event.code);
    if (!name || (name.startsWith('seek') && !seekEnabled)) return;
    const action = {
      decrease: 'DECREASE', increase: 'INCREASE', reset: 'RESET',
      seekBackward: 'SEEK_BACKWARD', seekForward: 'SEEK_FORWARD'
    }[name];
    if (event.repeat && !['INCREASE', 'DECREASE'].includes(action)) return;
    if (event.composedPath().some(inEditable) || !document.querySelector('video')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    api.runtime.sendMessage({ type: 'VIDEO_SHORTCUT', action }).catch(() => {});
  }, true);
})();
