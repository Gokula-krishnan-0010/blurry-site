/* ------------------------------------------------------------------ */
/*  Focus‑Mode – content script (runs on every page)                  */
/* ------------------------------------------------------------------ */

(() => {
  /* ---------- Configuration & State ---------- */
  const DEFAULTS = {
    enabled: false,
    blurIntensity: '8px',
    padding: 8,                     // px around the target element
    transitionSpeed: '0.2s'
  };

  let overlay = null;               // the <div> we inject
  let pendingRect = null;           // latest rect to apply (batched)
  let rafId = null;                 // requestAnimationFrame id

  /* ---------- Helpers ---------- */
  const SEMANTIC_SELECTOR =
    'p, h1, h2, h3, h4, h5, h6, img, li, pre';

  const SKIP_SELECTOR =
    'nav, header, footer, aside, script, style, [role="navigation"]';

  function createOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'focus-mode-overlay hidden';
    document.documentElement.appendChild(overlay);
  }

  function applySettings(settings) {
    if (!overlay) return;
    overlay.style.setProperty('--focus-blur-intensity', settings.blurIntensity);
    overlay.style.setProperty('--focus-padding', `${settings.padding}px`);
    overlay.style.setProperty('--focus-transition-speed', settings.transitionSpeed);
  }

  function getSemanticTarget(el) {
    if (!el) return null;
    // ignore elements we explicitly skip
    if (el.closest(SKIP_SELECTOR)) return null;
    // return the element itself if it matches, otherwise walk up
    return el.closest(SEMANTIC_SELECTOR);
  }

  function getRectWithPadding(rect, padding) {
    return {
      top: rect.top - padding,
      right: rect.right + padding,
      bottom: rect.bottom + padding,
      left: rect.left - padding
    };
  }

  function rectToClipPath(rect) {
    // Convert to inset() syntax – works with smooth transitions
    const { top, right, bottom, left } = rect;
    // inset(top right bottom left)
    return `inset(${top}px ${window.innerWidth - right}px ${window.innerHeight
  - bottom}px ${left}px)`;
  }

  function updateOverlayClipPath(rect) {
    if (!overlay) return;
    overlay.style.clipPath = rectToClipPath(rect);
  }

  function scheduleUpdate() {
    if (rafId) return; // already scheduled
    rafId = requestAnimationFrame(() => {
      if (pendingRect) {
        updateOverlayClipPath(pendingRect);
        pendingRect = null;
      }
      rafId = null;
    });
  }

  /* ---------- Mouse handling ---------- */
  function onMouseMove(e) {
    const target = getSemanticTarget(e.target);
    if (!target) {
      // hide the cut‑out (full blur)
      overlay.style.clipPath = 'inset(0 0 0 0)';
      return;
    }
    const box = target.getBoundingClientRect();
    const padding = parseInt(getComputedStyle(overlay).getPropertyValue('--focus-padding')) || 0;
    const padded = getRectWithPadding(box, padding);
    pendingRect = padded;
    scheduleUpdate();
  }

  /* ---------- Enable / Disable ---------- */
  function enable() {
    if (!overlay) createOverlay();
    overlay.classList.remove('hidden');
    document.addEventListener('mousemove', onMouseMove, { passive: true });
    // initial state – full blur
    overlay.style.clipPath = 'inset(0 0 0 0)';
  }

  function disable() {
    if (overlay) overlay.classList.add('hidden');
    document.removeEventListener('mousemove', onMouseMove);
  }

  /* ---------- Storage & Messaging ---------- */
  function loadSettings(callback) {
    chrome.storage.local.get(DEFAULTS, (items) => {
      callback(items);
    });
  }

  function onStorageChanged(changes, area) {
    if (area !== 'local') return;
    const newSettings = { ...DEFAULTS };
    for (const key in changes) {
      newSettings[key] = changes[key].newValue;
    }
    applySettings(newSettings);
    if (newSettings.enabled) enable(); else disable();
  }

  chrome.storage.onChanged.addListener(onStorageChanged);

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'updateSettings') {
      applySettings(msg.settings);
      if (msg.settings.enabled) enable(); else disable();
    }
    // keep the channel open for async response if needed
    return false;
  });

  /* ---------- Initialization ---------- */
  loadSettings((settings) => {
    applySettings(settings);
    if (settings.enabled) enable();
  });
})();