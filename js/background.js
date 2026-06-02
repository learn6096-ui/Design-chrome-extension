/* DevAesthetic — Background Service Worker v2.3
   Performance: pre-caches config + weather so popup & newtab load instantly */
'use strict';

// ── Config cache in memory (service worker scope) ──────────────────
let _cachedConfig = null;
let _weatherCache = {}; // { city: { data, ts } }

// ── Pre-fetch and cache config on startup ─────────────────────────
function preloadConfig() {
  chrome.storage.sync.get('devAesthetic', (result) => {
    _cachedConfig = result.devAesthetic || {};
    // Pre-warm weather if city is set
    if (_cachedConfig.city) preFetchWeather(_cachedConfig.city);
  });
}

// ── Pre-fetch weather in background ───────────────────────────────
function preFetchWeather(city) {
  if (!city) return;
  const now = Date.now();
  const cached = _weatherCache[city];
  // Skip if fresh (within 15 min)
  if (cached && now - cached.ts < 15 * 60 * 1000) return;

  fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
    .then(r => r.json())
    .then(data => {
      const current = data.current_condition[0];
      _weatherCache[city] = {
        temp: current.temp_C,
        desc: current.weatherDesc[0].value,
        ts: now,
      };
    })
    .catch(() => { /* silent fail — content will handle it */ });
}

// ── Message handler ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ping') {
    sendResponse({ status: 'alive' });
    return false;
  }

  // Fast config read — return cached value without hitting storage
  if (message.type === 'getConfig') {
    if (_cachedConfig) {
      sendResponse({ config: _cachedConfig });
    } else {
      chrome.storage.sync.get('devAesthetic', (result) => {
        _cachedConfig = result.devAesthetic || {};
        sendResponse({ config: _cachedConfig });
      });
      return true; // async
    }
    return false;
  }

  // Fast weather read from background cache
  if (message.type === 'getWeather') {
    const { city } = message;
    const cached = _weatherCache[city];
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) {
      sendResponse({ weather: cached, fromCache: true });
    } else {
      sendResponse({ weather: null, fromCache: false });
      preFetchWeather(city); // fetch in background for next request
    }
    return false;
  }

  return false;
});

// ── Keep config cache in sync with storage changes ─────────────────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.devAesthetic) {
    _cachedConfig = changes.devAesthetic.newValue || {};
    // Pre-warm weather when city changes
    if (_cachedConfig.city) preFetchWeather(_cachedConfig.city);
  }
});

// ── Lifecycle ──────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DevAesthetic] Extension installed v2.3');
    // Set default config on fresh install
    chrome.storage.sync.get('devAesthetic', (result) => {
      if (!result.devAesthetic) {
        chrome.storage.sync.set({
          devAesthetic: {
            theme: 'midnight',
            wallpaper: 'mesh',
            clockFormat: '24',
            showSeconds: true,
            particles: true,
            browserFx: true,
            username: '',
            avatarLetter: '',
            city: '',
            tagline: '',
            searchEngine: 'google',
          }
        });
      }
    });
  } else if (details.reason === 'update') {
    console.log('[DevAesthetic] Updated to', chrome.runtime.getManifest().version);
  }
  preloadConfig();
});

chrome.runtime.onStartup.addListener(preloadConfig);

// Pre-warm on service worker activation
preloadConfig();
