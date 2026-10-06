// A passive key listener is the only work performed on pages until a video shortcut is used.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const actions = { KeyA: 'DECREASE', KeyD: 'INCREASE', KeyQ: 'RESET' };

  function inEditable(element) {
    return Boolean(element?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]'));
  }

  window.addEventListener('keydown', (event) => {
    const action = actions[event.code];
    if (!action || !event.isTrusted || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.code === 'KeyQ' && event.repeat) return;
    if (event.composedPath().some(inEditable) || !document.querySelector('video')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    api.runtime.sendMessage({ type: 'VIDEO_SHORTCUT', action }).catch(() => {});
  }, true);
})();
