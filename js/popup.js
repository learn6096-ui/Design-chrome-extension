/* DevAesthetic — Popup Script v2.3 — Instant Load */
(() => {
  'use strict';

  const DEFAULTS = {
    theme: 'midnight',
    wallpaper: 'mesh',
    particles: true,
    showSeconds: true,
    browserFx: true,
    browserTheme: true,
    username: '',
    avatarLetter: '',
    city: '',
  };

  const WEATHER_ICONS = {
    'Clear': '☀️', 'Sunny': '☀️', 'Clouds': '☁️', 'Cloudy': '☁️',
    'Partly Cloudy': '⛅', 'Rain': '🌧️', 'Drizzle': '🌦️', 'Thunderstorm': '⛈️',
    'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️',
  };

  let config = { ...DEFAULTS };
  let saveTimer = null;

  // ── Storage helpers ───────────────────────────────────────────────
  function loadConfig() {
    return new Promise((resolve) => {
      // Fast path: try background cache first (zero storage overhead)
      chrome.runtime.sendMessage({ type: 'getConfig' }, (resp) => {
        if (!chrome.runtime.lastError && resp?.config) {
          config = { ...DEFAULTS, ...resp.config };
          resolve(config);
          return;
        }
        // Fallback: direct storage
        if (chrome?.storage?.sync) {
          chrome.storage.sync.get('devAesthetic', (result) => {
            if (result.devAesthetic) config = { ...DEFAULTS, ...result.devAesthetic };
            resolve(config);
          });
        } else {
          try {
            const s = localStorage.getItem('devAesthetic');
            if (s) config = { ...DEFAULTS, ...JSON.parse(s) };
          } catch (_) {}
          resolve(config);
        }
      });
    });
  }

  function saveConfig() {
    // Debounced save — 80ms for rapid response
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (chrome?.storage?.sync) {
        chrome.storage.sync.set({ devAesthetic: config });
      } else {
        localStorage.setItem('devAesthetic', JSON.stringify(config));
      }
    }, 80);
  }

  function saveNow() {
    clearTimeout(saveTimer);
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ devAesthetic: config });
    } else {
      localStorage.setItem('devAesthetic', JSON.stringify(config));
    }
  }

  // ── Tiny debounce ─────────────────────────────────────────────────
  function debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  // ── Theme ─────────────────────────────────────────────────────────
  function applyPopupTheme() {
    document.body.dataset.theme = config.theme || 'midnight';
  }

  // ── UI helpers ────────────────────────────────────────────────────
  function updateUser() {
    const letter = config.avatarLetter || (config.username ? config.username[0].toUpperCase() : '>');
    document.getElementById('popupAvatar').textContent = letter;
    document.getElementById('popupUsername').textContent = config.username || 'Developer';
    document.getElementById('popupLocation').textContent = config.city ? `📍 ${config.city}` : 'No location set';
  }

  function showFeedback(el) {
    el.style.outline = '2px solid #50fa7b';
    el.style.outlineOffset = '2px';
    setTimeout(() => { el.style.outline = ''; el.style.outlineOffset = ''; }, 400);
  }

  // ── Weather — uses 3-tier cache ───────────────────────────────────
  function updateWeather() {
    if (!config.city) {
      document.getElementById('popupWeatherIcon').textContent = '🌤️';
      document.getElementById('popupWeatherTemp').textContent = '--';
      document.getElementById('popupWeatherDesc').textContent = 'Set city to see weather';
      return;
    }

    // 1. Session cache (instant)
    const key = `da_popup_w_${config.city}`;
    try {
      const c = sessionStorage.getItem(key);
      if (c) {
        const d = JSON.parse(c);
        if (Date.now() - d.ts < 15 * 60 * 1000) {
          document.getElementById('popupWeatherIcon').textContent = d.icon;
          document.getElementById('popupWeatherTemp').textContent = d.temp + '°C';
          document.getElementById('popupWeatherDesc').textContent = d.desc;
          return;
        }
      }
    } catch (_) {}

    // 2. Background worker cache (fast, no network)
    chrome.runtime.sendMessage({ type: 'getWeather', city: config.city }, (resp) => {
      if (!chrome.runtime.lastError && resp?.weather) {
        const w = resp.weather;
        const icon = WEATHER_ICONS[w.desc] || '🌤️';
        document.getElementById('popupWeatherIcon').textContent = icon;
        document.getElementById('popupWeatherTemp').textContent = w.temp + '°C';
        document.getElementById('popupWeatherDesc').textContent = w.desc;
        try { sessionStorage.setItem(key, JSON.stringify({ icon, temp: w.temp, desc: w.desc, ts: w.ts })); } catch (_) {}
        return;
      }

      // 3. Direct API fetch
      document.getElementById('popupWeatherDesc').textContent = 'Loading…';
      fetch(`https://wttr.in/${encodeURIComponent(config.city)}?format=j1`)
        .then(r => r.json())
        .then(data => {
          const cur = data.current_condition[0];
          const temp = cur.temp_C;
          const desc = cur.weatherDesc[0].value;
          const icon = WEATHER_ICONS[desc] || '🌤️';
          document.getElementById('popupWeatherIcon').textContent = icon;
          document.getElementById('popupWeatherTemp').textContent = temp + '°C';
          document.getElementById('popupWeatherDesc').textContent = desc;
          try { sessionStorage.setItem(key, JSON.stringify({ icon, temp, desc, ts: Date.now() })); } catch (_) {}
        })
        .catch(() => {
          document.getElementById('popupWeatherIcon').textContent = '❌';
          document.getElementById('popupWeatherTemp').textContent = '--';
          document.getElementById('popupWeatherDesc').textContent = 'Could not load weather';
        });
    });
  }

  // ── Init ──────────────────────────────────────────────────────────
  async function init() {
    // Apply default theme immediately — removes flash of unstyled content
    document.body.dataset.theme = 'midnight';

    await loadConfig();
    applyPopupTheme();
    updateUser();
    updateWeather();

    // ── Username input ───────────────────────────────────────────
    const usernameInput = document.getElementById('popupUsernameInput');
    usernameInput.value = config.username || '';
    usernameInput.addEventListener('input', debounce(() => {
      config.username = usernameInput.value;
      saveConfig();
      updateUser();
    }, 300));

    // ── City input ───────────────────────────────────────────────
    const cityInput = document.getElementById('popupCityInput');
    cityInput.value = config.city || '';
    cityInput.addEventListener('input', debounce(() => {
      config.city = cityInput.value;
      saveConfig();
      updateWeather();
    }, 600));

    // ── Theme buttons ────────────────────────────────────────────
    document.querySelectorAll('.popup-theme').forEach((btn) => {
      if (btn.dataset.theme === config.theme) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.theme = btn.dataset.theme;
        saveNow();
        applyPopupTheme();
        document.querySelectorAll('.popup-theme').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        showFeedback(btn);
      });
    });

    // ── Wallpaper buttons ────────────────────────────────────────
    document.querySelectorAll('.popup-wallpaper').forEach((btn) => {
      if (btn.dataset.wallpaper === config.wallpaper) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.wallpaper = btn.dataset.wallpaper;
        saveNow();
        document.querySelectorAll('.popup-wallpaper').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // ── Toggles ──────────────────────────────────────────────────
    function wireToggle(id, key) {
      const cb = document.getElementById(id);
      cb.checked = config[key] !== false;
      cb.addEventListener('change', () => {
        config[key] = cb.checked;
        saveNow();
      });
    }
    wireToggle('popupParticles', 'particles');
    wireToggle('popupSeconds',   'showSeconds');
    wireToggle('popupBrowserFx', 'browserFx');
    wireToggle('popupBrowserTheme', 'browserTheme');

    // ── Live sync from newtab ────────────────────────────────────
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes) => {
        if (!changes.devAesthetic) return;
        config = { ...config, ...changes.devAesthetic.newValue };
        applyPopupTheme();
        updateUser();
        usernameInput.value = config.username || '';
        cityInput.value = config.city || '';
        document.getElementById('popupParticles').checked = config.particles !== false;
        document.getElementById('popupSeconds').checked = config.showSeconds !== false;
        document.getElementById('popupBrowserFx').checked = config.browserFx !== false;
        document.getElementById('popupBrowserTheme').checked = config.browserTheme !== false;
        document.querySelectorAll('.popup-theme').forEach(b => {
          b.classList.toggle('active', b.dataset.theme === config.theme);
        });
        document.querySelectorAll('.popup-wallpaper').forEach(b => {
          b.classList.toggle('active', b.dataset.wallpaper === config.wallpaper);
        });
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
