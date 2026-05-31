/* ------------------------------------------------------------------ */
/*  Popup script – sync UI with chrome.storage and active tab          */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  const enabledChk = document.getElementById('enabled');
  const blurSlider   = document.getElementById('blur');
  const padSlider    = document.getElementById('padding');
  const speedSlider  = document.getElementById('speed');

  // --------------------------------------------------------------
  // Load stored values and populate UI
  // --------------------------------------------------------------
  chrome.storage.local.get(
    {
      enabled: false,
      blurIntensity: '8px',
      padding: 8,
      transitionSpeed: '0.2s'
    },
    (settings) => {
      enabledChk.checked = settings.enabled;
      blurSlider.value = parseInt(settings.blurIntensity);
      padSlider.value = settings.padding;
      speedSlider.value = parseFloat(settings.transitionSpeed);
    }
  );

  // --------------------------------------------------------------
  // Helper: push new settings to storage & active tab
  // --------------------------------------------------------------
  function pushSettings(updated) {
    chrome.storage.local.get(null, (current) => {
      const newSettings = { ...current, ...updated };
      chrome.storage.local.set(newSettings);
      // Broadcast to the current tab so the content script can apply immediately
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            settings: newSettings
          });
        }
      });
    });
  }

  // --------------------------------------------------------------
  // UI event listeners
  // --------------------------------------------------------------
  enabledChk.addEventListener('change', () => {
    pushSettings({ enabled: enabledChk.checked });
  });

  blurSlider.addEventListener('input', () => {
    const val = `${blurSlider.value}px`;
    pushSettings({ blurIntensity: val });
  });

  padSlider.addEventListener('input', () => {
    pushSettings({ padding: parseInt(padSlider.value) });
  });

  speedSlider.addEventListener('input', () => {
    const val = `${speedSlider.value}s`;
    pushSettings({ transitionSpeed: val });
  });
});