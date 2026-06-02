/* DevAesthetic — Content Script v2.3 — Performance Optimized */
(() => {
  'use strict';

  // ── Guard: skip extension pages & already-initialized tabs ────────
  const href = location.href;
  if (
    href.startsWith('chrome://') ||
    href.startsWith('chrome-extension://') ||
    href.startsWith('devtools://') ||
    document.getElementById('dev-aesthetic-cursor')
  ) return;

  // ── Pre-computed color lookup — zero parse overhead ───────────────
  const THEME_COLORS = {
    midnight:  [123, 104, 238],
    cyberpunk: [255, 0,   60 ],
    monokai:   [249, 38,  114],
    nord:      [136, 192, 208],
    dracula:   [255, 121, 198],
    ocean:     [0,   180, 216],
    aurora:    [0,   255, 136],
    sunset:    [255, 107, 53 ],
    rainbow:   [196, 79,  255],
  };

  const WEATHER_ICONS = {
    'Clear': '☀️', 'Sunny': '☀️', 'Clouds': '☁️', 'Cloudy': '☁️',
    'Partly Cloudy': '⛅', 'Rain': '🌧️', 'Drizzle': '🌦️',
    'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️',
    'Haze': '🌫️',
  };

  // ── State ─────────────────────────────────────────────────────────
  let config = {};
  let cursorTrail = [];
  let pageParticles = [];
  let cursorAnimFrame = null;
  let particleAnimFrame = null;
  let cursorCanvas = null, cursorCtx = null;
  let particleCanvas = null, particleCtx = null;
  let infoWidget = null;
  let rainbowInterval = null;
  let colorCache = [123, 104, 238]; // default midnight
  let colorUpdateFrame = 0;

  // ── Helpers ───────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const rm = id => { const e = $(id); if (e) e.remove(); };

  function getColor() {
    return THEME_COLORS[config.theme] || THEME_COLORS.midnight;
  }

  // ── Fast storage read via background cache ─────────────────────────
  function loadConfig(cb) {
    // Try background message first (instant if service worker is alive)
    const timeout = setTimeout(() => {
      // Fallback to direct storage if message times out
      chrome.storage.sync.get('devAesthetic', (r) => {
        config = r.devAesthetic || {};
        colorCache = getColor();
        cb();
      });
    }, 80);

    chrome.runtime.sendMessage({ type: 'getConfig' }, (resp) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError || !resp) {
        chrome.storage.sync.get('devAesthetic', (r) => {
          config = r.devAesthetic || {};
          colorCache = getColor();
          cb();
        });
        return;
      }
      config = resp.config || {};
      colorCache = getColor();
      cb();
    });
  }

  // ── Apply everything ──────────────────────────────────────────────
  function applyAesthetic() {
    document.documentElement.dataset.devAestheticTheme = config.theme || 'midnight';
    updateTabAccent();

    const fxEnabled = config.browserFx !== false;
    if (fxEnabled) {
      // Defer heavy effects to after page paints — doesn't block LCP
      requestIdleCallback
        ? requestIdleCallback(() => { initCursorEffects(); initPageParticles(); }, { timeout: 800 })
        : setTimeout(() => { initCursorEffects(); initPageParticles(); }, 200);
    } else {
      cleanupCursor();
      cleanupParticles();
    }

    // Info widget is cheap — show immediately
    initInfoWidget();
  }

  // ── Tab Accent (theme-color meta) ─────────────────────────────────
  const rainbowColors = ['#ff0080','#ff6a00','#ffde00','#00ff88','#00d4ff','#c44fff'];
  let rainbowIdx = 0;

  // ── Theme Color Transition Helpers ────────────────────────────────
  let _themeColorAnim = null;

  function transitionThemeColor(metaEl, targetColorHex, duration = 400) {
    if (!metaEl) return;
    if (_themeColorAnim) {
      cancelAnimationFrame(_themeColorAnim);
      _themeColorAnim = null;
    }

    const startColorHex = metaEl.content || '#1a1a2e';
    const startRGB = parseHex(startColorHex);
    const endRGB = parseHex(targetColorHex);
    const startTime = performance.now();

    function animate(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      const r = Math.round(startRGB[0] + (endRGB[0] - startRGB[0]) * ease);
      const g = Math.round(startRGB[1] + (endRGB[1] - startRGB[1]) * ease);
      const b = Math.round(startRGB[2] + (endRGB[2] - startRGB[2]) * ease);

      const hex = '#' + 
        r.toString(16).padStart(2, '0') + 
        g.toString(16).padStart(2, '0') + 
        b.toString(16).padStart(2, '0');

      metaEl.content = hex;

      if (progress < 1) {
        _themeColorAnim = requestAnimationFrame(animate);
      } else {
        metaEl.content = targetColorHex;
        _themeColorAnim = null;
      }
    }

    _themeColorAnim = requestAnimationFrame(animate);
  }

  function parseHex(hex) {
    let clean = hex.trim();
    if (clean.startsWith('#')) clean = clean.slice(1);
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16),
        parseInt(clean[1] + clean[1], 16),
        parseInt(clean[2] + clean[2], 16)
      ];
    }
    if (clean.length === 6) {
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16)
      ];
    }
    return [26, 26, 46]; // default #1a1a2e
  }

  function updateTabAccent() {
    if (rainbowInterval) { clearInterval(rainbowInterval); rainbowInterval = null; }

    // Skip if browser theme is disabled
    if (config.browserTheme === false) {
      // Remove or reset the meta tag so Chrome uses its default chrome color
      const existing = document.querySelector('meta[name="theme-color"]');
      if (existing && existing.dataset.devOwned) {
        transitionThemeColor(existing, '#1a1a2e', 200);
        setTimeout(() => {
          if (existing && existing.parentNode && config.browserTheme === false) {
            existing.remove();
          }
        }, 250);
      }
      return;
    }

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.dataset.devOwned = '1';
      meta.content = '#1a1a2e';
      document.head.appendChild(meta);
    }

    if (config.theme === 'rainbow') {
      rainbowInterval = setInterval(() => {
        rainbowIdx = (rainbowIdx + 1) % rainbowColors.length;
        transitionThemeColor(meta, rainbowColors[rainbowIdx], 400);
      }, 1000);
      transitionThemeColor(meta, rainbowColors[0], 400);
    } else {
      const [r, g, b] = getColor();
      const colorHex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      transitionThemeColor(meta, colorHex, 200);
    }
  }

  // ── Info Widget ───────────────────────────────────────────────────
  function initInfoWidget() {
    rm('dev-aesthetic-info-widget');
    const username = config.username || '';
    const city = config.city || '';
    if (!username && !city) return;

    const waitBody = () => {
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', initInfoWidget, { once: true });
        return;
      }
      const widget = document.createElement('div');
      widget.id = 'dev-aesthetic-info-widget';
      const letter = config.avatarLetter || (username ? username[0].toUpperCase() : '');
      widget.innerHTML = `
        <div class="da-info-inner">
          ${username ? `<span class="da-info-user">${letter ? `<span class="da-info-avatar">${letter}</span>` : ''}${username}</span>` : ''}
          ${username && city ? '<span class="da-info-sep">·</span>' : ''}
          <span class="da-info-weather" id="da-info-weather">${city ? '…' : ''}</span>
        </div>`;
      document.body.appendChild(widget);
      infoWidget = widget;
      if (city) fetchWeather(city);
    };
    waitBody();
  }

  function fetchWeather(city) {
    const key = `da_w_${city}`;
    // 1. Try sessionStorage (fastest — same tab session)
    try {
      const s = sessionStorage.getItem(key);
      if (s) {
        const d = JSON.parse(s);
        if (Date.now() - d.ts < 15 * 60 * 1000) {
          setWeatherText(d.text);
          return;
        }
      }
    } catch (_) {}

    // 2. Try background service worker cache
    chrome.runtime.sendMessage({ type: 'getWeather', city }, (resp) => {
      if (!chrome.runtime.lastError && resp && resp.weather) {
        const w = resp.weather;
        const icon = WEATHER_ICONS[w.desc] || '🌤️';
        const text = `${icon} ${w.temp}°C`;
        setWeatherText(text);
        try { sessionStorage.setItem(key, JSON.stringify({ text, ts: w.ts })); } catch (_) {}
        return;
      }

      // 3. Direct API call as last resort
      fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
        .then(r => r.json())
        .then(data => {
          const c = data.current_condition[0];
          const icon = WEATHER_ICONS[c.weatherDesc[0].value] || '🌤️';
          const text = `${icon} ${c.temp_C}°C`;
          setWeatherText(text);
          try { sessionStorage.setItem(key, JSON.stringify({ text, ts: Date.now() })); } catch (_) {}
        })
        .catch(() => setWeatherText(''));
    });
  }

  function setWeatherText(text) {
    const el = $('da-info-weather');
    if (el) el.textContent = text;
  }

  // ── Cursor Trail ──────────────────────────────────────────────────
  function initCursorEffects() {
    cleanupCursor();
    if (!document.body) return;

    cursorCanvas = document.createElement('canvas');
    cursorCanvas.id = 'dev-aesthetic-cursor';
    cursorCanvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483640;';
    document.body.appendChild(cursorCanvas);
    cursorCtx = cursorCanvas.getContext('2d', { alpha: true, willReadFrequently: false });

    let w = cursorCanvas.width = window.innerWidth;
    let h = cursorCanvas.height = window.innerHeight;

    const onResize = () => {
      w = cursorCanvas.width = window.innerWidth;
      h = cursorCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });

    let mx = -200, my = -200;
    let lastMx = -200, lastMy = -200;

    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      // Only add trail point if cursor moved enough (reduces points)
      const dx = mx - lastMx, dy = my - lastMy;
      if (dx * dx + dy * dy > 9) { // 3px threshold
        lastMx = mx; lastMy = my;
        if (cursorTrail.length >= 12) cursorTrail.shift();
        cursorTrail.push({ x: mx, y: my, life: 1.0, size: 2 + Math.random() });
      }
    };
    document.addEventListener('mousemove', onMove, { passive: true });

    let frameSkip = 0;
    function animate() {
      if (!cursorCtx || !cursorCanvas) return;
      cursorAnimFrame = requestAnimationFrame(animate);

      // Skip every other frame when no mouse movement — halves CPU on idle
      if (document.hidden) return;
      frameSkip = (frameSkip + 1) % 2;
      if (frameSkip && cursorTrail.length === 0) return;

      cursorCtx.clearRect(0, 0, w, h);
      const [r, g, b] = colorCache;

      // Cursor glow
      if (mx > 0) {
        const grd = cursorCtx.createRadialGradient(mx, my, 0, mx, my, 18);
        grd.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        cursorCtx.fillStyle = grd;
        cursorCtx.beginPath();
        cursorCtx.arc(mx, my, 18, 0, Math.PI * 2);
        cursorCtx.fill();
      }

      // Trail — iterate backwards to avoid splice cost
      for (let i = cursorTrail.length - 1; i >= 0; i--) {
        const p = cursorTrail[i];
        p.life -= 0.07;
        if (p.life <= 0) { cursorTrail.splice(i, 1); continue; }
        cursorCtx.beginPath();
        cursorCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        cursorCtx.fillStyle = `rgba(${r},${g},${b},${p.life * 0.45})`;
        cursorCtx.fill();
      }
    }
    animate();
  }

  function cleanupCursor() {
    if (cursorAnimFrame) { cancelAnimationFrame(cursorAnimFrame); cursorAnimFrame = null; }
    rm('dev-aesthetic-cursor');
    cursorTrail = [];
    cursorCtx = null;
    cursorCanvas = null;
  }

  // ── Page Particles ────────────────────────────────────────────────
  function initPageParticles() {
    cleanupParticles();
    if (!document.body) return;

    particleCanvas = document.createElement('canvas');
    particleCanvas.id = 'dev-aesthetic-particles';
    particleCanvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483638;opacity:0.18;';
    document.body.appendChild(particleCanvas);
    particleCtx = particleCanvas.getContext('2d', { alpha: true, willReadFrequently: false });

    let pw = particleCanvas.width = window.innerWidth;
    let ph = particleCanvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      pw = particleCanvas.width = window.innerWidth;
      ph = particleCanvas.height = window.innerHeight;
    }, { passive: true });

    // Only 10 particles on content pages — enough for ambience, cheap to render
    for (let i = 0; i < 10; i++) {
      pageParticles.push({
        x: Math.random() * pw,
        y: Math.random() * ph,
        size: Math.random() * 1.2 + 0.4,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        opacity: Math.random() * 0.25 + 0.08,
      });
    }

    const connDistSq = 90 * 90;
    let skip = 0;

    function animate() {
      if (!particleCtx || !particleCanvas) return;
      particleAnimFrame = requestAnimationFrame(animate);
      if (document.hidden) return;

      // Run full update every 2 frames (~30fps) — halves GPU load on content pages
      skip = (skip + 1) % 2;
      if (skip) return;

      particleCtx.clearRect(0, 0, pw, ph);
      const [r, g, b] = colorCache;

      for (let i = 0; i < pageParticles.length; i++) {
        const p = pageParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = pw;
        else if (p.x > pw) p.x = 0;
        if (p.y < 0) p.y = ph;
        else if (p.y > ph) p.y = 0;

        particleCtx.beginPath();
        particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        particleCtx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`;
        particleCtx.fill();

        // Connection lines
        for (let j = i + 1; j < pageParticles.length; j++) {
          const p2 = pageParticles[j];
          const dx = p.x - p2.x, dy = p.y - p2.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < connDistSq) {
            const alpha = 0.04 * (1 - Math.sqrt(dSq) / 90);
            particleCtx.beginPath();
            particleCtx.moveTo(p.x, p.y);
            particleCtx.lineTo(p2.x, p2.y);
            particleCtx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
            particleCtx.lineWidth = 0.4;
            particleCtx.stroke();
          }
        }
      }
    }
    animate();
  }

  function cleanupParticles() {
    if (particleAnimFrame) { cancelAnimationFrame(particleAnimFrame); particleAnimFrame = null; }
    rm('dev-aesthetic-particles');
    pageParticles = [];
    particleCtx = null;
    particleCanvas = null;
  }

  function cleanup() {
    cleanupCursor();
    cleanupParticles();
    rm('dev-aesthetic-info-widget');
    if (rainbowInterval) { clearInterval(rainbowInterval); rainbowInterval = null; }
  }

  // ── Boot — use requestIdleCallback to not block page render ───────
  function boot() {
    loadConfig(applyAesthetic);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    // Page already loaded — run in idle time so we don't delay anything
    typeof requestIdleCallback === 'function'
      ? requestIdleCallback(boot, { timeout: 500 })
      : setTimeout(boot, 0);
  }

  // ── React to settings changes from popup ──────────────────────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.devAesthetic) {
      config = changes.devAesthetic.newValue || {};
      colorCache = getColor();
      cleanup();
      applyAesthetic();
    }
  });

  window.addEventListener('beforeunload', cleanup, { once: true });
})();
