/* ============================================
   DevAesthetic v2.2 — Developer New Tab
   Core JavaScript — Optimized for speed & UX
   ============================================ */

(() => {
  'use strict';

  // ── Default Config ──────────────────────────────────────────────
  const DEFAULTS = {
    theme: 'midnight',
    wallpaper: 'mesh',
    clockFormat: '24',
    showSeconds: true,
    particles: true,
    browserFx: true,
    browserTheme: true,
    username: '',
    avatarLetter: '',
    city: '',
    tagline: '',
    searchEngine: 'google',
    notes: '',
    pomodoroSessions: 0,
    goals: [],
    bookmarks: [
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { name: 'MDN', url: 'https://developer.mozilla.org' },
    ],
    streak: { count: 0, best: 0, lastDate: null, week: [false,false,false,false,false,false,false] },
    recentApps: [
      { title: 'GitHub', url: 'https://github.com' },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { title: 'YouTube', url: 'https://youtube.com' },
      { title: 'Gmail', url: 'https://mail.google.com' },
      { title: 'ChatGPT', url: 'https://chatgpt.com' },
      { title: 'Figma', url: 'https://figma.com' },
      { title: 'Canva', url: 'https://canva.com' },
      { title: 'MDN', url: 'https://developer.mozilla.org' }
    ],
    quickLinks: [
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { name: 'YouTube', url: 'https://youtube.com' },
      { name: 'Reddit', url: 'https://reddit.com' },
      { name: 'MDN', url: 'https://developer.mozilla.org' },
      { name: 'CodePen', url: 'https://codepen.io' },
    ]
  };

  // ── State ───────────────────────────────────────────────────────
  let config = { ...DEFAULTS };
  let pomoState = { running: false, time: 25 * 60, interval: null, sessions: 0 };
  let focusState = { running: false, time: 0, interval: null, sessions: 0, totalMinutes: 0 };
  let engineDropdownOpen = false;
  let settingsOpen = false;
  let wallpaperOpen = false;
  let commandPaletteOpen = false;
  let focusModeActive = false;

  // ── Debounce utility ────────────────────────────────────────────
  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // ── Storage Helpers ─────────────────────────────────────────────
  // Apply theme instantly from localStorage (before async storage loads)
  // This eliminates the flash of default theme on new tab open
  (function instantTheme() {
    try {
      const saved = localStorage.getItem('devAesthetic_theme_cache');
      if (saved) {
        const { theme, wallpaper } = JSON.parse(saved);
        if (theme) document.body.dataset.theme = theme;
        if (wallpaper) document.body.dataset.wallpaper = wallpaper;
      }
    } catch (_) {}
  })();

  function loadConfig() {
    return new Promise((resolve) => {
      // Try background cache first (fastest — no storage I/O)
      chrome.runtime.sendMessage({ type: 'getConfig' }, (resp) => {
        if (!chrome.runtime.lastError && resp?.config) {
          config = { ...DEFAULTS, ...resp.config };
          config.goals      = config.goals      || DEFAULTS.goals;
          config.bookmarks  = config.bookmarks  || DEFAULTS.bookmarks;
          config.streak     = config.streak     || DEFAULTS.streak;
          config.quickLinks = config.quickLinks || DEFAULTS.quickLinks;
          config.recentApps = config.recentApps || DEFAULTS.recentApps;
          // Update instant-theme cache
          try { localStorage.setItem('devAesthetic_theme_cache', JSON.stringify({ theme: config.theme, wallpaper: config.wallpaper })); } catch (_) {}
          resolve(config);
          return;
        }
        // Fallback: direct storage
        if (chrome?.storage?.sync) {
          chrome.storage.sync.get('devAesthetic', (result) => {
            if (result.devAesthetic) {
              config = { ...DEFAULTS, ...result.devAesthetic };
              config.goals      = config.goals      || DEFAULTS.goals;
              config.bookmarks  = config.bookmarks  || DEFAULTS.bookmarks;
              config.streak     = config.streak     || DEFAULTS.streak;
              config.quickLinks = config.quickLinks || DEFAULTS.quickLinks;
              config.recentApps = config.recentApps || DEFAULTS.recentApps;
              try { localStorage.setItem('devAesthetic_theme_cache', JSON.stringify({ theme: config.theme, wallpaper: config.wallpaper })); } catch (_) {}
            }
            resolve(config);
          });
        } else {
          const saved = localStorage.getItem('devAesthetic');
          if (saved) {
            try {
              config = { ...DEFAULTS, ...JSON.parse(saved) };
              config.goals      = config.goals      || DEFAULTS.goals;
              config.bookmarks  = config.bookmarks  || DEFAULTS.bookmarks;
              config.streak     = config.streak     || DEFAULTS.streak;
              config.quickLinks = config.quickLinks || DEFAULTS.quickLinks;
              config.recentApps = config.recentApps || DEFAULTS.recentApps;
            } catch (_) {}
          }
          resolve(config);
        }
      });
    });
  }

  // Debounced save — 150ms to reduce storage writes (faster response)
  const saveConfig = debounce(() => {
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ devAesthetic: config });
    } else {
      localStorage.setItem('devAesthetic', JSON.stringify(config));
    }
  }, 150);

  // Immediate save for critical changes (theme, wallpaper, etc.)
  function saveConfigNow() {
    if (chrome?.storage?.sync) {
      chrome.storage.sync.set({ devAesthetic: config });
    } else {
      localStorage.setItem('devAesthetic', JSON.stringify(config));
    }
  }

  // ── Quotes ──────────────────────────────────────────────────────
  const quotes = [
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
    { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
    { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "Programs must be written for people to read.", author: "Hal Abelson" },
    { text: "Any fool can write code that a computer can understand.", author: "Martin Fowler" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupery" },
    { text: "The best code is no code at all.", author: "Jeff Atwood" },
    { text: "It works on my machine.", author: "Every Developer" },
    { text: "Debugging is twice as hard as writing the code in the first place.", author: "Brian Kernighan" },
    { text: "There are only two kinds of languages: the ones people complain about and the ones nobody uses.", author: "Bjarne Stroustrup" },
    { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch" },
    { text: "Fix the cause, not the symptom.", author: "Steve Maguire" },
    { text: "Optimism is an occupational hazard of programming; feedback is the treatment.", author: "Kent Beck" },
    { text: "The most important property of a program is whether it accomplishes the intention of its user.", author: "C.A.R. Hoare" },
    { text: "Unix is simple. It just takes a genius to understand its simplicity.", author: "Dennis Ritchie" },
    { text: "Measuring progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
  ];

  // ── Commands ────────────────────────────────────────────────────
  const commands = [
    { label: 'Change Theme', shortcut: 'Ctrl+Shift+T', action: () => toggleSettings() },
    { label: 'Change Wallpaper', shortcut: '', action: () => toggleWallpaper() },
    { label: 'Toggle Particles', shortcut: '', action: () => toggleParticles() },
    { label: 'Toggle Clock Format', shortcut: '', action: () => toggleClockFormat() },
    { label: 'Toggle Seconds', shortcut: '', action: () => toggleSeconds() },
    { label: 'Toggle Focus Mode', shortcut: 'Ctrl+F', action: () => toggleFocusMode() },
    { label: 'Reset Pomodoro', shortcut: '', action: () => resetPomodoro() },
    { label: 'New Quote', shortcut: '', action: () => showRandomQuote() },
    { label: 'Clear Notes', shortcut: '', action: () => clearNotes() },
    { label: 'Clear All Goals', shortcut: '', action: () => clearGoals() },
    { label: 'Open Settings', shortcut: 'Ctrl+,', action: () => toggleSettings() },
  ];

  // ── Quick Link Icons (SVG) ──────────────────────────────────────
  const linkIcons = {
    'GitHub': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>',
    'Stack Overflow': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15.725 0l-1.72 1.277 6.39 8.588 1.72-1.277L15.725 0zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644-8.225-6.85zm-3.15 4.465l-.905 1.94 9.702 4.517.905-1.94-9.702-4.517zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092-10.473-2.203zM1.89 15.47V24h19.19v-8.53h-2.133v6.397H4.021v-6.396H1.89zm4.265 2.133v2.13h10.66v-2.13H6.154z"/></svg>',
    'YouTube': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    'Reddit': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
    'MDN': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0zm21.6 2.4c-.2-.4-.6-.4-.8-.2L12 14.8 3.2 2.2c-.2-.2-.6-.2-.8.2-.2.4 0 .8.4.8l8.4 12.2c.2.2.4.2.6 0l8.4-12.2c.4-.4.6-.6.4-.8z"/></svg>',
    'CodePen': '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.144 13.067v-2.134L16.55 12zm1.936-1.003l-8.576-5.718a.6.6 0 0 0-.656 0L2.28 12.064a.6.6 0 0 0-.28.5V15a.6.6 0 0 0 .28.5l8.576 5.718a.6.6 0 0 0 .656 0l8.576-5.718a.6.6 0 0 0 .28-.5v-3.5a.6.6 0 0 0-.28-.5zM12 14.567L8.284 12 12 9.433 15.716 12zm-8.576-1.003L7.14 11.434v2.132zm8.576 5.436l-3.716-2.478v-2.134L12 16.866l3.716-2.478v2.134zm0-6.436L12 14.067l-3.716-2.478v-2.132L12 11.933l3.716-2.478z"/></svg>',
  };

  // ── Weather Icons ───────────────────────────────────────────────
  const weatherIcons = {
    'Clear': '☀️', 'Sunny': '☀️', 'Clouds': '☁️', 'Cloudy': '☁️',
    'Partly Cloudy': '⛅', 'Rain': '🌧️', 'Drizzle': '🌦️', 'Thunderstorm': '⛈️',
    'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️',
  };

  // ── Initialize ──────────────────────────────────────────────────
  async function init() {
    await loadConfig();

    // ── Critical path: run immediately (visible content) ──────────
    applyTheme();
    applyWallpaper();
    startClock();
    initSearch();
    initRecentApps();
    renderQuickLinks();
    initWelcomeCard();

    // ── Deferred: run after first paint via scheduler ─────────────
    const defer = typeof scheduler !== 'undefined' && scheduler.postTask
      ? (fn) => scheduler.postTask(fn, { priority: 'background' })
      : (fn) => setTimeout(fn, 0);

    defer(() => {
      renderQuote();
      initParticles();
      initPomodoro();
      initSystemInfo();
      initGoals();
      initStreak();
    });

    defer(() => {
      initNotesTerminal();
      initSettings();
      initWallpaperPicker();
      initCommandPalette();
      initKeyboardShortcuts();
      initBookmarks();
      initFocusMode();
      initWeather();
    });

    // Quote widget click listener
    const quoteWidget = document.getElementById('quoteWidget');
    if (quoteWidget) quoteWidget.addEventListener('click', showRandomQuote);
  }

  // ── Theme ───────────────────────────────────────────────────────
  // Theme colors for Chrome tab bar (theme-color meta)
  const THEME_CHROME_COLORS = {
    midnight: '#7b68ee', cyberpunk: '#ff003c', monokai: '#f92672',
    nord: '#88c0d0',   dracula: '#ff79c6',   ocean: '#00b4d8',
    aurora: '#00ff88', sunset: '#ff6b35',    rainbow: '#c44fff',
  };

  // For rainbow theme, cycle the tab/title color for extra flair
  let _rainbowInterval = null;
  const _rainbowColors = ['#ff0080','#ff6a00','#ffde00','#00ff88','#00d4ff','#c44fff'];
  let _rainbowIdx = 0;

  // ── Theme Color Transition Helper ────────────────────────────────
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
      
      // easeInOutQuad easing
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

  function applyTheme() {
    document.body.dataset.theme = config.theme;
    const color = THEME_CHROME_COLORS[config.theme] || '#7b68ee';
    const meta = document.querySelector('meta[name="theme-color"]');

    // Stop previous rainbow cycle if switching away
    if (_rainbowInterval) { clearInterval(_rainbowInterval); _rainbowInterval = null; }

    // Only apply theme-color meta if Browser Theme is enabled
    if (config.browserTheme !== false) {
      if (config.theme === 'rainbow') {
        // Cycle tab color through rainbow smoothly over 400ms every 1000ms
        _rainbowInterval = setInterval(() => {
          _rainbowIdx = (_rainbowIdx + 1) % _rainbowColors.length;
          transitionThemeColor(meta, _rainbowColors[_rainbowIdx], 400);
        }, 1000);
        transitionThemeColor(meta, _rainbowColors[0], 400);
      } else {
        transitionThemeColor(meta, color, 200);
      }
    } else {
      // Restore default / neutral color when browser theme is off smoothly
      transitionThemeColor(meta, '#1a1a2e', 200);
    }

    const themeName = config.theme.charAt(0).toUpperCase() + config.theme.slice(1);
    document.title = `>_ Dev \u2014 ${themeName}`;
  }

  // ── Wallpaper ───────────────────────────────────────────────────
  function applyWallpaper() {
    document.body.dataset.wallpaper = config.wallpaper;
  }

  // ── Welcome Card ────────────────────────────────────────────────
  function initWelcomeCard() {
    updateWelcomeCard();
  }

  function updateWelcomeCard() {
    const avatar = document.getElementById('welcomeAvatar');
    const greeting = document.getElementById('greeting');
    const sub = document.getElementById('welcomeSub');

    const letter = config.avatarLetter || (config.username ? config.username[0].toUpperCase() : '>');
    avatar.textContent = letter;

    const name = config.username || 'Developer';
    const now = new Date();
    const hour = now.getHours();
    let timeGreeting = '';
    if (hour < 6) timeGreeting = 'Good night';
    else if (hour < 12) timeGreeting = 'Good morning';
    else if (hour < 17) timeGreeting = 'Good afternoon';
    else if (hour < 21) timeGreeting = 'Good evening';
    else timeGreeting = 'Good night';

    greeting.textContent = `${timeGreeting}, ${name}`;

    const tagline = config.tagline || getDefaultTagline(hour);
    sub.textContent = tagline;
  }

  function getDefaultTagline(hour) {
    if (hour < 6) return '// late night coding session';
    if (hour < 12) return '// time to ship some code';
    if (hour < 17) return '// stay in the flow';
    if (hour < 21) return '// almost done for today';
    return '// remember to rest';
  }

  // ── Clock ───────────────────────────────────────────────────────
  // Track last minute to avoid running streak check every second
  let _lastStreakMinute = -1;

  function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    let ampm = '';
    if (config.clockFormat === '12') {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
    }

    const timeStr = String(hours).padStart(2, '0');
    document.getElementById('clock').textContent = timeStr + ':' + minutes + ampm;

    const secEl = document.getElementById('seconds');
    secEl.textContent = ':' + seconds;
    secEl.style.display = config.showSeconds ? 'inline' : 'none';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('date').textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();

    // Only check streak once per minute (not every second)
    const currentMinute = now.getMinutes();
    if (currentMinute !== _lastStreakMinute) {
      _lastStreakMinute = currentMinute;
      updateStreakDaily();
    }
  }

  // ── Recent Apps (Most Visited Sites) ────────────────────────────
  function initRecentApps() {
    const container = document.getElementById('recentApps');
    if (!container) return;

    // Load recentApps from config, or populate dynamically on first run
    if (!config.recentApps || config.recentApps.length === 0) {
      if (chrome && chrome.topSites && typeof chrome.topSites.get === 'function') {
        chrome.topSites.get((sites) => {
          config.recentApps = sites && sites.length > 0 ? sites.slice(0, 8) : DEFAULTS.recentApps;
          saveConfigNow();
          renderSites(config.recentApps);
        });
      } else {
        config.recentApps = DEFAULTS.recentApps;
        saveConfigNow();
        renderSites(config.recentApps);
      }
    } else {
      renderSites(config.recentApps);
    }

    function renderSites(sites) {
      const frag = document.createDocumentFragment();
      sites.forEach((site, idx) => {
        const el = document.createElement('a');
        el.className = 'recent-app';
        el.href = site.url;
        el.target = '_self';
        el.title = site.title;

        let initial = 'W';
        let domain = '';
        try {
          const urlObj = new URL(site.url);
          domain = urlObj.hostname;
          initial = site.title ? site.title.trim()[0].toUpperCase() : urlObj.hostname[0].toUpperCase();
        } catch (_) {
          initial = site.title ? site.title.trim()[0].toUpperCase() : 'W';
        }

        el.innerHTML = `
          <button class="recent-app-delete" title="Delete app">×</button>
          <div class="recent-app-icon-wrap">
            <span class="recent-app-icon-text">${initial}</span>
          </div>
          <span class="recent-app-label">${site.title || domain || 'Web'}</span>
        `;

        const delBtn = el.querySelector('.recent-app-delete');
        delBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          config.recentApps.splice(idx, 1);
          saveConfigNow();
          initRecentApps(); // refresh view with updated indices
        });

        frag.appendChild(el);
      });

      // Add "+" Button at the end
      const addBtn = document.createElement('div');
      addBtn.className = 'recent-app';
      addBtn.style.opacity = '0.5';
      addBtn.innerHTML = `
        <div class="recent-app-icon-wrap" style="border-style: dashed;">
          <span class="recent-app-icon-text">+</span>
        </div>
        <span class="recent-app-label">Add App</span>
      `;
      addBtn.onclick = () => {
        const title = prompt('App name:');
        if (!title) return;
        const url = prompt('URL (include https://):');
        if (!url) return;
        config.recentApps.push({ title, url });
        saveConfigNow();
        initRecentApps();
      };
      frag.appendChild(addBtn);

      container.innerHTML = '';
      container.appendChild(frag);
    }
  }

  // ── Quick Links ─────────────────────────────────────────────────
  function renderQuickLinks() {
    const container = document.getElementById('quickLinks');
    // Use fragment to minimize reflows
    const frag = document.createDocumentFragment();

    config.quickLinks.forEach((link, idx) => {
      const el = document.createElement('a');
      el.className = 'quick-link';
      el.href = link.url;
      el.target = '_self';
      el.innerHTML = `
        <button class="quick-link-delete" title="Delete link">×</button>
        <div class="quick-link-icon">${linkIcons[link.name] || link.name[0]}</div>
        <span class="quick-link-label">${link.name}</span>
      `;

      const delBtn = el.querySelector('.quick-link-delete');
      delBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        config.quickLinks.splice(idx, 1);
        saveConfigNow();
        renderQuickLinks();
      });

      frag.appendChild(el);
    });

    const addBtn = document.createElement('div');
    addBtn.className = 'quick-link';
    addBtn.style.opacity = '0.5';
    addBtn.innerHTML = `
      <div class="quick-link-icon">+</div>
      <span class="quick-link-label">Add Link</span>
    `;
    addBtn.onclick = () => {
      const name = prompt('Link name:');
      if (!name) return;
      const url = prompt('URL (include https://):');
      if (!url) return;
      config.quickLinks.push({ name, url });
      saveConfigNow();
      renderQuickLinks();
    };
    frag.appendChild(addBtn);

    container.innerHTML = '';
    container.appendChild(frag);
  }

  // ── Quote ───────────────────────────────────────────────────────
  function renderQuote() {
    showRandomQuote();
  }

  function showRandomQuote() {
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    const textEl = document.getElementById('quoteText');
    const authorEl = document.getElementById('quoteAuthor');
    textEl.style.opacity = '0';
    authorEl.style.opacity = '0';
    setTimeout(() => {
      textEl.textContent = '"' + q.text + '"';
      authorEl.textContent = '— ' + q.author;
      textEl.style.transition = 'opacity 0.5s';
      authorEl.style.transition = 'opacity 0.5s';
      textEl.style.opacity = '1';
      authorEl.style.opacity = '1';
    }, 300);
  }

  // ── Particles ───────────────────────────────────────────────────
  function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    let particles = [];
    let frameCount = 0;
    // Cache color components — refresh every 90 frames (~1.5s)
    let colorR = 123, colorG = 104, colorB = 238;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      };
    }

    function hexToRGB(color) {
      if (color.startsWith('#')) {
        return [
          parseInt(color.slice(1, 3), 16),
          parseInt(color.slice(3, 5), 16),
          parseInt(color.slice(5, 7), 16),
        ];
      }
      const m = color.match(/\d+/g);
      return m ? [+m[0], +m[1], +m[2]] : [123, 104, 238];
    }

    function animate() {
      if (document.hidden) { requestAnimationFrame(animate); return; }
      if (!config.particles) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(animate);
        return;
      }

      // Refresh color every 90 frames — cheaper than getComputedStyle every frame
      frameCount++;
      if (frameCount % 90 === 0) {
        const v = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7b68ee';
        [colorR, colorG, colorB] = hexToRGB(v);
      }

      const connDistSq = 120 * 120;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0 || p.x > canvas.width)  p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${colorR},${colorG},${colorB},${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x, dy = p.y - p2.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < connDistSq) {
            const alpha = 0.12 * (1 - Math.sqrt(dSq) / 120);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(${colorR},${colorG},${colorB},${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    }

    resize();
    // Seed initial color
    const initAccent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7b68ee';
    [colorR, colorG, colorB] = hexToRGB(initAccent);
    particles = Array.from({ length: 48 }, createParticle);
    animate();
    window.addEventListener('resize', debounce(resize, 200), { passive: true });
  }

  // ── Search ──────────────────────────────────────────────────────
  function initSearch() {
    const input = document.getElementById('searchInput');
    const engineBtn = document.getElementById('searchEngine');
    const dropdown = document.getElementById('enginesDropdown');
    const options = dropdown.querySelectorAll('.engine-option');

    // Helper: strip leading emoji + space to get clean engine name
    function getEngineName(el) {
      // Extract text after the emoji prefix (e.g. "🔍 Google" → "Google")
      const text = el.textContent.trim();
      const parts = text.split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : text;
    }

    const activeOption = dropdown.querySelector(`[data-engine="${config.searchEngine}"]`);
    if (activeOption) {
      engineBtn.querySelector('span').textContent = getEngineName(activeOption);
      options.forEach(o => o.classList.remove('active'));
      activeOption.classList.add('active');
    }

    engineBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      engineDropdownOpen = !engineDropdownOpen;
      dropdown.classList.toggle('show', engineDropdownOpen);
    });

    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing
        const engine = opt.dataset.engine;
        config.searchEngine = engine;
        saveConfigNow();
        engineBtn.querySelector('span').textContent = getEngineName(opt);
        options.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        dropdown.classList.remove('show');
        engineDropdownOpen = false;
      });
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = input.value.trim();
        if (!query) return;

        if (query.startsWith('>')) {
          const cmd = query.slice(1).trim().toLowerCase();
          executeCommand(cmd);
          input.value = '';
          return;
        }

        const urls = {
          google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
          github: `https://github.com/search?q=${encodeURIComponent(query)}`,
          stackoverflow: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
          npm: `https://www.npmjs.com/search?q=${encodeURIComponent(query)}`,
          mdn: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(query)}`,
          duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
        };

        window.location.href = urls[config.searchEngine] || urls.google;
      }
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
      engineDropdownOpen = false;
    });

    // Focus faster — 100ms vs original 500ms
    setTimeout(() => input.focus(), 100);
  }

  function executeCommand(cmd) {
    const match = commands.find(c => c.label.toLowerCase().includes(cmd));
    if (match) match.action();
  }

  // ── Pomodoro ────────────────────────────────────────────────────
  function initPomodoro() {
    const display = document.getElementById('pomoDisplay');
    const startBtn = document.getElementById('pomoStart');
    const resetBtn = document.getElementById('pomoReset');

    pomoState.sessions = config.pomodoroSessions || 0;
    updatePomoDots();

    startBtn.addEventListener('click', () => {
      if (pomoState.running) {
        clearInterval(pomoState.interval);
        pomoState.running = false;
        startBtn.textContent = 'Resume';
      } else {
        pomoState.running = true;
        startBtn.textContent = 'Pause';
        pomoState.interval = setInterval(() => {
          pomoState.time--;
          if (pomoState.time <= 0) {
            clearInterval(pomoState.interval);
            pomoState.running = false;
            pomoState.sessions++;
            config.pomodoroSessions = pomoState.sessions;
            saveConfigNow();
            updatePomoDots();
            startBtn.textContent = 'Start';
            pomoState.time = 5 * 60;
            display.textContent = formatTime(pomoState.time);

            if (Notification.permission === 'granted') {
              new Notification('Pomodoro Complete!', { body: 'Time for a 5 minute break.' });
            }
            return;
          }
          display.textContent = formatTime(pomoState.time);
        }, 1000);
      }
    });

    resetBtn.addEventListener('click', resetPomodoro);
    display.textContent = formatTime(pomoState.time);

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function resetPomodoro() {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    pomoState.time = 25 * 60;
    document.getElementById('pomoDisplay').textContent = formatTime(pomoState.time);
    document.getElementById('pomoStart').textContent = 'Start';
  }

  function updatePomoDots() {
    document.querySelectorAll('.pomo-dot').forEach((dot, i) => {
      dot.classList.toggle('completed', i < pomoState.sessions % 4);
    });
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  // ── System Info ─────────────────────────────────────────────────
  function initSystemInfo() {
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        const update = () => {
          const level = Math.round(battery.level * 100);
          const charging = battery.charging ? ' ⚡' : '';
          document.getElementById('battery').textContent = level + '%' + charging;
        };
        update();
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
      });
    } else {
      document.getElementById('battery').textContent = 'N/A';
    }

    document.getElementById('memory').textContent = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'N/A';

    if (navigator.connection) {
      const conn = navigator.connection;
      const update = () => {
        document.getElementById('connection').textContent = conn.effectiveType || conn.type || 'Unknown';
      };
      update();
      conn.addEventListener('change', update);
    } else {
      document.getElementById('connection').textContent = 'Online';
    }
  }

  // ── Notes ───────────────────────────────────────────────────────
  // ── Notes & Terminal Tabbed Widget ──────────────────────────────
  function initNotesTerminal() {
    const tabNotesBtn = document.getElementById('tabNotesBtn');
    const tabTerminalBtn = document.getElementById('tabTerminalBtn');
    const tabNotesContent = document.getElementById('tabNotesContent');
    const tabTerminalContent = document.getElementById('tabTerminalContent');

    if (tabNotesBtn && tabTerminalBtn && tabNotesContent && tabTerminalContent) {
      tabNotesBtn.addEventListener('click', () => {
        tabNotesBtn.classList.add('active');
        tabTerminalBtn.classList.remove('active');
        tabNotesContent.classList.add('active');
        tabTerminalContent.classList.remove('active');
      });

      tabTerminalBtn.addEventListener('click', () => {
        tabTerminalBtn.classList.add('active');
        tabNotesBtn.classList.remove('active');
        tabTerminalContent.classList.add('active');
        tabNotesContent.classList.remove('active');
        // focus terminal input when switching to tab
        setTimeout(() => document.getElementById('terminalInput').focus(), 50);
      });
    }

    // Notes behavior
    const textarea = document.getElementById('notesArea');
    if (textarea) {
      textarea.value = config.notes || '';
      textarea.addEventListener('input', debounce(() => {
        config.notes = textarea.value;
        saveConfig();
      }, 500));
    }

    // Terminal behavior
    initTerminal();
  }

  function clearNotes() {
    const notesArea = document.getElementById('notesArea');
    if (notesArea) notesArea.value = '';
    config.notes = '';
    saveConfigNow();
  }

  const devJokes = [
    "Why do programmers wear glasses? Because they can't C#.",
    "There are 10 types of people in the world: those who understand binary, and those who don't.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "['hip', 'hip'] (hip hip array!)",
    "A SQL query goes into a bar, walks up to two tables and asks, 'Can I join you?'",
    "Why did the programmer quit his job? Because he didn't get arrays."
  ];

  function initTerminal() {
    const input = document.getElementById('terminalInput');
    const output = document.getElementById('terminalOutput');
    if (!input || !output) return;

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const commandLine = input.value.trim();
        input.value = '';
        if (!commandLine) return;

        // Print input line
        printTerminalLine(`> ${commandLine}`, 'output-prompt');

        // Parse command and args
        const parts = commandLine.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');

        executeTerminalCommand(cmd, args);
      }
    });

    function printTerminalLine(text, className = '') {
      const line = document.createElement('div');
      line.className = `terminal-line ${className}`;
      line.textContent = text;
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function executeTerminalCommand(cmd, args) {
      if (cmd === 'help') {
        printTerminalLine('Available commands:', 'output-info');
        printTerminalLine('  neofetch      Show system specs and dev status');
        printTerminalLine('  theme <name>  Switch theme (e.g. theme cyberpunk)');
        printTerminalLine('  weather <city> Set city and check weather');
        printTerminalLine('  joke          Tell a programmer joke');
        printTerminalLine('  streak        Show coding streak details');
        printTerminalLine('  eval <expr>   Evaluate a simple JS expression');
        printTerminalLine('  clear         Clear the terminal screen');
      } else if (cmd === 'clear') {
        output.innerHTML = '';
      } else if (cmd === 'joke') {
        const joke = devJokes[Math.floor(Math.random() * devJokes.length)];
        printTerminalLine(joke, 'output-success');
      } else if (cmd === 'streak') {
        const currentStreak = config.streak?.count || 0;
        const bestStreak = config.streak?.best || 0;
        printTerminalLine(`Current Streak: ${currentStreak} days`, 'output-info');
        printTerminalLine(`Best Streak: ${bestStreak} days 🏆`, 'output-info');
      } else if (cmd === 'theme') {
        const themes = ['midnight', 'cyberpunk', 'monokai', 'nord', 'dracula', 'ocean', 'aurora', 'sunset', 'rainbow'];
        const chosen = args.trim().toLowerCase();
        if (themes.includes(chosen)) {
          config.theme = chosen;
          saveConfigNow();
          applyTheme();
          syncSettingsUI();
          printTerminalLine(`Theme successfully switched to: ${chosen}`, 'output-success');
        } else {
          printTerminalLine(`Unknown theme. Choose from: ${themes.join(', ')}`, 'output-error');
        }
      } else if (cmd === 'weather') {
        const city = args.trim();
        if (city) {
          config.city = city;
          saveConfigNow();
          const cityInput = document.getElementById('cityInput');
          if (cityInput) cityInput.value = city;
          printTerminalLine(`City updated to: ${city}. Loading weather...`, 'output-info');
          initWeather();
        } else {
          printTerminalLine('Please specify a city. (e.g. weather London)', 'output-error');
        }
      } else if (cmd === 'eval') {
        if (!args) {
          printTerminalLine('Usage: eval <expression> (e.g. eval 2 + 2)', 'output-error');
          return;
        }
        try {
          const sanitized = args.replace(/[^0-9+\-*/().\s]/g, '');
          
          // Safe mathematical evaluator to comply with Chrome Extension CSP (no eval / new Function)
          const evaluateMath = (str) => {
            const tokens = str.match(/\d+(\.\d+)?|[+\-*/()]/g) || [];
            let position = 0;

            const peek = () => tokens[position];
            const consume = (token) => {
              if (peek() === token) {
                position++;
                return true;
              }
              return false;
            };

            const parsePrimary = () => {
              const token = peek();
              if (!token) throw new Error("Unexpected end of expression");
              if (token === '(') {
                position++;
                const result = parseExpression();
                if (!consume(')')) throw new Error("Expected ')'");
                return result;
              }
              if (token === '-') {
                position++;
                return -parsePrimary();
              }
              if (token === '+') {
                position++;
                return parsePrimary();
              }
              if (/^\d+(\.\d+)?$/.test(token)) {
                position++;
                return parseFloat(token);
              }
              throw new Error(`Unexpected token: ${token}`);
            };

            const parseMultiplicative = () => {
              let result = parsePrimary();
              while (true) {
                if (consume('*')) {
                  result *= parsePrimary();
                } else if (consume('/')) {
                  const divisor = parsePrimary();
                  if (divisor === 0) throw new Error("Division by zero");
                  result /= divisor;
                } else {
                  break;
                }
              }
              return result;
            };

            const parseExpression = () => {
              let result = parseMultiplicative();
              while (true) {
                if (consume('+')) {
                  result += parseMultiplicative();
                } else if (consume('-')) {
                  result -= parseMultiplicative();
                } else {
                  break;
                }
              }
              return result;
            };

            const res = parseExpression();
            if (position < tokens.length) {
              throw new Error("Extra tokens at end of expression");
            }
            return res;
          };

          const result = evaluateMath(sanitized);
          printTerminalLine(`Result: ${result}`, 'output-success');
        } catch (err) {
          printTerminalLine('Error evaluating expression.', 'output-error');
        }
      } else if (cmd === 'neofetch') {
        const username = config.username || 'Developer';
        const batteryEl = document.getElementById('battery');
        const memoryEl = document.getElementById('memory');
        const connEl = document.getElementById('connection');
        const streakCount = config.streak?.count || 0;
        const goalCount = config.goals?.length || 0;
        const doneGoalCount = config.goals?.filter(g => g.done).length || 0;

        printTerminalLine('      _          ' + username + '@dev-aesthetic', 'output-prompt');
        printTerminalLine('   _ |_| _       ' + '-'.repeat(username.length + 14), 'output-info');
        printTerminalLine('  |_|   |_|      ' + `OS: Chrome Extension OS v2.3`, 'terminal-line');
        printTerminalLine('   _     _       ' + `Shell: dev-sh v2.3`, 'terminal-line');
        printTerminalLine('  |_|   |_|      ' + `Theme: ${config.theme}`, 'terminal-line');
        printTerminalLine('      -          ' + `Battery: ${batteryEl ? batteryEl.textContent : 'N/A'}`, 'terminal-line');
        printTerminalLine('                 ' + `Memory: ${memoryEl ? memoryEl.textContent : 'N/A'}`, 'terminal-line');
        printTerminalLine('                 ' + `Network: ${connEl ? connEl.textContent : 'Online'}`, 'terminal-line');
        printTerminalLine('                 ' + `Streak: ${streakCount} days 🔥`, 'terminal-line');
        printTerminalLine('                 ' + `Goals Progress: ${doneGoalCount}/${goalCount}`, 'terminal-line');
      } else {
        printTerminalLine(`Command not found: ${cmd}. Type 'help' for options.`, 'output-error');
      }
    }
  }

  // ── Goals ───────────────────────────────────────────────────────
  function initGoals() {
    renderGoals();
    const input = document.getElementById('goalInput');
    const addBtn = document.getElementById('goalAddBtn');

    const addGoal = () => {
      const text = input.value.trim();
      if (!text) return;
      config.goals.push({ text, done: false });
      input.value = '';
      saveConfigNow();
      renderGoals();
    };

    addBtn.addEventListener('click', addGoal);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addGoal();
    });
  }

  function renderGoals() {
    const list = document.getElementById('goalsList');
    if (!list) return;
    const frag = document.createDocumentFragment();

    config.goals.forEach((goal, idx) => {
      const el = document.createElement('div');
      el.className = 'goal-item' + (goal.done ? ' done' : '');

      const check = document.createElement('div');
      check.className = 'goal-check';

      const text = document.createElement('span');
      text.className = 'goal-text';
      text.textContent = goal.text;

      const del = document.createElement('button');
      del.className = 'goal-delete';
      del.textContent = '×';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        config.goals.splice(idx, 1);
        saveConfigNow();
        renderGoals();
      });

      el.appendChild(check);
      el.appendChild(text);
      el.appendChild(del);

      // Whole-item click toggles goal
      el.addEventListener('click', () => {
        config.goals[idx].done = !config.goals[idx].done;
        saveConfigNow();
        renderGoals();
      });

      frag.appendChild(el);
    });

    list.innerHTML = '';
    list.appendChild(frag);
    updateGoalProgress();
  }

  function updateGoalProgress() {
    const total = config.goals.length;
    const done = config.goals.filter(g => g.done).length;
    document.getElementById('goalProgressBar').style.width = total > 0 ? (done / total * 100) + '%' : '0%';
    document.getElementById('goalProgressText').textContent = `${done} / ${total}`;
  }

  function clearGoals() {
    config.goals = [];
    saveConfigNow();
    renderGoals();
  }

  // ── Weather ─────────────────────────────────────────────────────
  function initWeather() {
    if (!config.city) {
      document.getElementById('weatherDesc').textContent = 'Enter your city in settings';
      return;
    }

    // Use sessionStorage cache to avoid repeat API calls on new tab
    const cacheKey = `weather_${config.city}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        const age = Date.now() - data.ts;
        if (age < 15 * 60 * 1000) { // 15-minute cache
          document.getElementById('weatherTemp').textContent = data.temp + '°C';
          document.getElementById('weatherIcon').textContent = data.icon;
          document.getElementById('weatherDesc').textContent = data.desc;
          return;
        }
      } catch (e) { /* stale cache, refetch */ }
    }

    const city = encodeURIComponent(config.city);
    fetch(`https://wttr.in/${city}?format=j1`)
      .then(r => r.json())
      .then(data => {
        const current = data.current_condition[0];
        const temp = current.temp_C;
        const desc = current.weatherDesc[0].value;
        const icon = weatherIcons[desc] || '🌤️';

        document.getElementById('weatherTemp').textContent = temp + '°C';
        document.getElementById('weatherIcon').textContent = icon;
        document.getElementById('weatherDesc').textContent = desc;

        // Cache result
        sessionStorage.setItem(cacheKey, JSON.stringify({ temp, desc, icon, ts: Date.now() }));
      })
      .catch(() => {
        document.getElementById('weatherDesc').textContent = 'Could not load weather';
      });
  }

  // ── Streak ──────────────────────────────────────────────────────
  function initStreak() {
    renderStreakBar();
    updateStreakDaily();
  }

  function updateStreakDaily() {
    const today = new Date().toISOString().split('T')[0];
    const streak = config.streak;

    if (streak.lastDate === today) {
      // Still update UI even if already counted
      document.getElementById('streakCount').textContent = streak.count || 0;
      document.getElementById('streakBest').textContent = streak.best || 0;
      return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (streak.lastDate === yesterday) {
      streak.count++;
    } else if (streak.lastDate !== today) {
      streak.count = 1;
    }

    if (streak.count > streak.best) streak.best = streak.count;

    streak.lastDate = today;
    streak.week[new Date().getDay()] = true;

    config.streak = streak;
    saveConfigNow();

    document.getElementById('streakCount').textContent = streak.count;
    document.getElementById('streakBest').textContent = streak.best;
    renderStreakBar();
  }

  function renderStreakBar() {
    const bar = document.getElementById('streakBar');
    const frag = document.createDocumentFragment();
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date().getDay();

    for (let i = 0; i < 7; i++) {
      const dot = document.createElement('div');
      dot.className = 'streak-day';
      if (config.streak.week[i]) dot.classList.add('active');
      if (i === today) dot.classList.add('today');
      dot.textContent = dayNames[i];
      frag.appendChild(dot);
    }

    bar.innerHTML = '';
    bar.appendChild(frag);

    document.getElementById('streakCount').textContent = config.streak.count || 0;
    document.getElementById('streakBest').textContent = config.streak.best || 0;
  }

  // ── Bookmarks ───────────────────────────────────────────────────
  let _bookmarksListenersInitialized = false;

  function initBookmarks() {
    // If native bookmarks API is available, register listeners once
    if (chrome && chrome.bookmarks && !_bookmarksListenersInitialized) {
      _bookmarksListenersInitialized = true;
      try {
        chrome.bookmarks.onCreated.addListener(() => renderBookmarks());
        chrome.bookmarks.onRemoved.addListener(() => renderBookmarks());
        chrome.bookmarks.onChanged.addListener(() => renderBookmarks());
      } catch (err) {
        console.warn('Failed to add native bookmarks listeners:', err);
      }
    }

    renderBookmarks();

    const addBtn = document.getElementById('bookmarkAddBtn');
    if (addBtn) {
      // Re-create listener to avoid duplicate bindings
      const newAddBtn = addBtn.cloneNode(true);
      addBtn.parentNode.replaceChild(newAddBtn, addBtn);
      
      newAddBtn.addEventListener('click', () => {
        const name = prompt('Bookmark name:');
        if (!name) return;
        const url = prompt('URL (include https://):');
        if (!url) return;
        
        // Ensure protocol exists
        let formattedUrl = url.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = 'https://' + formattedUrl;
        }

        if (chrome && chrome.bookmarks && typeof chrome.bookmarks.create === 'function') {
          chrome.bookmarks.create({ title: name, url: formattedUrl }, () => {
            renderBookmarks();
          });
        } else {
          // Fallback to local storage bookmarks
          config.bookmarks.push({ name, url: formattedUrl });
          saveConfigNow();
          renderBookmarks();
        }
      });
    }
  }

  function renderBookmarks() {
    const list = document.getElementById('bookmarksList');
    if (!list) return;

    if (chrome && chrome.bookmarks && typeof chrome.bookmarks.getRecent === 'function') {
      // Fetch 15 most recent bookmarks
      chrome.bookmarks.getRecent(15, (items) => {
        // filter out folders
        const links = (items || []).filter(item => item.url);
        renderBookmarkItems(links, true);
      });
    } else {
      // Fallback
      renderBookmarkItems(config.bookmarks, false);
    }
  }

  function renderBookmarkItems(items, isNative) {
    const list = document.getElementById('bookmarksList');
    const frag = document.createDocumentFragment();

    items.forEach((bm, idx) => {
      const el = document.createElement('a');
      el.className = 'bookmark-item';
      el.href = bm.url;
      el.target = '_self';

      const icon = document.createElement('span');
      icon.className = 'bookmark-icon';
      icon.textContent = '🔗';

      const name = document.createElement('span');
      name.className = 'bookmark-name';
      // Native Chrome bookmarks use 'title', fallback storage uses 'name'
      name.textContent = isNative ? (bm.title || 'Bookmark') : (bm.name || 'Bookmark');

      const del = document.createElement('button');
      del.className = 'bookmark-delete';
      del.textContent = '×';
      del.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isNative) {
          chrome.bookmarks.remove(bm.id, () => {
            renderBookmarks();
          });
        } else {
          config.bookmarks.splice(idx, 1);
          saveConfigNow();
          renderBookmarks();
        }
      });

      el.appendChild(icon);
      el.appendChild(name);
      el.appendChild(del);
      frag.appendChild(el);
    });

    list.innerHTML = '';
    list.appendChild(frag);
  }

  // ── Focus Mode ──────────────────────────────────────────────────
  function initFocusMode() {
    const btn = document.getElementById('focusModeBtn');
    const startBtn = document.getElementById('focusStart');
    const resetBtn = document.getElementById('focusReset');

    btn.addEventListener('click', () => toggleFocusMode());

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (focusState.running) {
          clearInterval(focusState.interval);
          focusState.running = false;
          startBtn.textContent = 'Resume';
          focusState.sessions++;
          focusState.totalMinutes += Math.floor(focusState.time / 60);
          document.getElementById('focusSessions').textContent = focusState.sessions;
          document.getElementById('focusMinutes').textContent = focusState.totalMinutes;
        } else {
          focusState.running = true;
          startBtn.textContent = 'Pause';
          focusState.interval = setInterval(() => {
            focusState.time++;
            document.getElementById('focusTimer').textContent = formatFocusTime(focusState.time);
          }, 1000);
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        clearInterval(focusState.interval);
        focusState.running = false;
        focusState.time = 0;
        document.getElementById('focusTimer').textContent = '00:00:00';
        if (startBtn) startBtn.textContent = 'Start Focus';
      });
    }
  }

  function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    document.body.classList.toggle('focus-mode', focusModeActive);
    document.getElementById('focusModeBtn').classList.toggle('active', focusModeActive);
  }

  function formatFocusTime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  // ── Settings ────────────────────────────────────────────────────
  function initSettings() {
    const panel = document.getElementById('settingsPanel');
    const openBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeSettings');
    const themeGrid = document.getElementById('themeGrid');
    const wallpaperGrid = document.getElementById('wallpaperGrid');
    const usernameInput = document.getElementById('usernameInput');
    const avatarInput = document.getElementById('avatarInput');
    const cityInput = document.getElementById('cityInput');
    const taglineInput = document.getElementById('taglineInput');

    openBtn.addEventListener('click', () => toggleSettings());
    closeBtn.addEventListener('click', () => toggleSettings(false));
    panel.addEventListener('click', (e) => {
      if (e.target === panel) toggleSettings(false);
    });

    themeGrid.querySelectorAll('.theme-swatch').forEach((swatch) => {
      if (swatch.dataset.theme === config.theme) swatch.classList.add('active');
      swatch.addEventListener('click', () => {
        config.theme = swatch.dataset.theme;
        saveConfigNow();
        applyTheme();
        themeGrid.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    wallpaperGrid.querySelectorAll('.wallpaper-swatch').forEach((swatch) => {
      if (swatch.dataset.wallpaper === config.wallpaper) swatch.classList.add('active');
      swatch.addEventListener('click', () => {
        config.wallpaper = swatch.dataset.wallpaper;
        saveConfigNow();
        applyWallpaper();
        wallpaperGrid.querySelectorAll('.wallpaper-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      });
    });

    document.querySelectorAll('[data-format]').forEach((btn) => {
      if (btn.dataset.format === config.clockFormat) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.clockFormat = btn.dataset.format;
        saveConfigNow();
        document.querySelectorAll('[data-format]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateClock(); // Update clock immediately
      });
    });

    document.querySelectorAll('[data-seconds]').forEach((btn) => {
      if (btn.dataset.seconds === String(config.showSeconds)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.showSeconds = btn.dataset.seconds === 'true';
        saveConfigNow();
        document.querySelectorAll('[data-seconds]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateClock(); // Update clock immediately
      });
    });

    document.querySelectorAll('[data-particles]').forEach((btn) => {
      if (btn.dataset.particles === String(config.particles)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.particles = btn.dataset.particles === 'true';
        saveConfigNow();
        document.querySelectorAll('[data-particles]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('[data-browserfx]').forEach((btn) => {
      if (btn.dataset.browserfx === String(config.browserFx !== false)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.browserFx = btn.dataset.browserfx === 'true';
        saveConfigNow();
        document.querySelectorAll('[data-browserfx]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.querySelectorAll('[data-browsertheme]').forEach((btn) => {
      if (btn.dataset.browsertheme === String(config.browserTheme !== false)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        config.browserTheme = btn.dataset.browsertheme === 'true';
        saveConfigNow();
        document.querySelectorAll('[data-browsertheme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyTheme(); // instantly re-apply with new browser theme setting
      });
    });

    usernameInput.value = config.username || '';
    usernameInput.addEventListener('input', debounce(() => {
      config.username = usernameInput.value;
      saveConfig();
      updateWelcomeCard();
    }, 300));

    avatarInput.value = config.avatarLetter || '';
    avatarInput.addEventListener('input', debounce(() => {
      config.avatarLetter = avatarInput.value;
      saveConfig();
      updateWelcomeCard();
    }, 300));

    cityInput.value = config.city || '';
    cityInput.addEventListener('input', debounce(() => {
      config.city = cityInput.value;
      saveConfig();
      initWeather(); // Fetch weather immediately when user stops typing
    }, 800));

    taglineInput.value = config.tagline || '';
    taglineInput.addEventListener('input', debounce(() => {
      config.tagline = taglineInput.value;
      saveConfig();
      updateWelcomeCard();
    }, 300));
  }

  function toggleSettings(show) {
    const panel = document.getElementById('settingsPanel');
    settingsOpen = show !== undefined ? show : !settingsOpen;
    panel.classList.toggle('show', settingsOpen);
    if (settingsOpen) {
      syncSettingsUI();
    }
  }

  // ── Sync Settings Panel UI Controls ─────────────────────────────
  function syncSettingsUI() {
    const themeGrid = document.getElementById('themeGrid');
    if (themeGrid) {
      themeGrid.querySelectorAll('.theme-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.theme === config.theme);
      });
    }

    const wallpaperGrid = document.getElementById('wallpaperGrid');
    if (wallpaperGrid) {
      wallpaperGrid.querySelectorAll('.wallpaper-swatch').forEach(s => {
        s.classList.toggle('active', s.dataset.wallpaper === config.wallpaper);
      });
    }

    document.querySelectorAll('[data-format]').forEach(b => {
      b.classList.toggle('active', b.dataset.format === config.clockFormat);
    });

    document.querySelectorAll('[data-seconds]').forEach(b => {
      b.classList.toggle('active', b.dataset.seconds === String(config.showSeconds));
    });

    document.querySelectorAll('[data-particles]').forEach(b => {
      b.classList.toggle('active', b.dataset.particles === String(config.particles));
    });

    document.querySelectorAll('[data-browserfx]').forEach(b => {
      b.classList.toggle('active', b.dataset.browserfx === String(config.browserFx !== false));
    });

    document.querySelectorAll('[data-browsertheme]').forEach(b => {
      b.classList.toggle('active', b.dataset.browsertheme === String(config.browserTheme !== false));
    });

    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) usernameInput.value = config.username || '';

    const avatarInput = document.getElementById('avatarInput');
    if (avatarInput) avatarInput.value = config.avatarLetter || '';

    const cityInput = document.getElementById('cityInput');
    if (cityInput) cityInput.value = config.city || '';

    const taglineInput = document.getElementById('taglineInput');
    if (taglineInput) taglineInput.value = config.tagline || '';
  }

  function toggleClockFormat() {
    config.clockFormat = config.clockFormat === '24' ? '12' : '24';
    saveConfigNow();
  }

  function toggleSeconds() {
    config.showSeconds = !config.showSeconds;
    saveConfigNow();
  }

  function toggleParticles() {
    config.particles = !config.particles;
    saveConfigNow();
  }



  // ── Wallpaper Picker ────────────────────────────────────────────
  function initWallpaperPicker() {
    const panel = document.getElementById('wallpaperPanel');
    const openBtn = document.getElementById('wallpaperBtn');
    const closeBtn = document.getElementById('closeWallpaper');
    const grid = document.getElementById('wallpaperPreviewGrid');

    openBtn.addEventListener('click', () => toggleWallpaper());
    closeBtn.addEventListener('click', () => toggleWallpaper(false));
    panel.addEventListener('click', (e) => {
      if (e.target === panel) toggleWallpaper(false);
    });

    const wallpapers = [
      { id: 'mesh',   name: 'Mesh Gradient', bg: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)' },
      { id: 'waves',  name: 'Waves',         bg: 'linear-gradient(135deg, #0c0c1d, #1a1a3e, #2d1b69)' },
      { id: 'stars',  name: 'Starry Night',  bg: 'linear-gradient(135deg, #000011, #0a0a2e, #1a0a3e)' },
      { id: 'matrix', name: 'Matrix',        bg: 'linear-gradient(135deg, #000a00, #001a00, #003300)' },
      { id: 'neon',   name: 'Neon City',     bg: 'linear-gradient(135deg, #0d0221, #3a0647, #ff006e)' },
      { id: 'aurora', name: 'Aurora Borealis', bg: 'linear-gradient(135deg, #001a0a, #004422, #00ff88, #00d4ff)' },
      { id: 'none',   name: 'Minimal',       bg: '#0a0a0f' },
    ];

    const frag = document.createDocumentFragment();
    wallpapers.forEach((wp) => {
      const el = document.createElement('div');
      el.className = 'wallpaper-preview' + (config.wallpaper === wp.id ? ' active' : '');
      el.style.background = wp.bg;
      el.innerHTML = `<div class="wallpaper-preview-name">${wp.name}</div>`;
      el.addEventListener('click', () => {
        config.wallpaper = wp.id;
        saveConfigNow();
        applyWallpaper();
        grid.querySelectorAll('.wallpaper-preview').forEach(p => p.classList.remove('active'));
        el.classList.add('active');
      });
      frag.appendChild(el);
    });
    grid.appendChild(frag);
  }

  function toggleWallpaper(show) {
    const panel = document.getElementById('wallpaperPanel');
    wallpaperOpen = show !== undefined ? show : !wallpaperOpen;
    panel.classList.toggle('show', wallpaperOpen);
  }

  // ── Command Palette ─────────────────────────────────────────────
  function initCommandPalette() {
    const palette = document.getElementById('commandPalette');
    const input = document.getElementById('commandInput');
    const list = document.getElementById('commandList');

    function renderCommands(filter = '') {
      const frag = document.createDocumentFragment();
      const lf = filter.toLowerCase();
      const filtered = filter ? commands.filter(c => c.label.toLowerCase().includes(lf)) : commands;

      filtered.forEach((cmd, i) => {
        const el = document.createElement('div');
        el.className = 'command-item' + (i === 0 ? ' selected' : '');
        el.innerHTML = `
          <span class="command-item-label">${cmd.label}</span>
          <span class="command-item-shortcut">${cmd.shortcut}</span>
        `;
        el.addEventListener('click', () => {
          cmd.action();
          toggleCommandPalette(false);
        });
        frag.appendChild(el);
      });

      list.innerHTML = '';
      list.appendChild(frag);
    }

    input.addEventListener('input', () => renderCommands(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleCommandPalette(false);
      if (e.key === 'Enter') {
        const selected = list.querySelector('.command-item.selected');
        if (selected) selected.click();
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = list.querySelectorAll('.command-item');
        let idx = Array.from(items).findIndex(i => i.classList.contains('selected'));
        items[idx]?.classList.remove('selected');
        idx = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
        items[idx]?.classList.add('selected');
      }
    });

    palette.addEventListener('click', (e) => {
      if (e.target === palette) toggleCommandPalette(false);
    });

    renderCommands();
  }

  function toggleCommandPalette(show) {
    const palette = document.getElementById('commandPalette');
    commandPaletteOpen = show !== undefined ? show : !commandPaletteOpen;
    palette.classList.toggle('show', commandPaletteOpen);
    if (commandPaletteOpen) {
      const input = document.getElementById('commandInput');
      input.value = '';
      input.focus();
      document.getElementById('commandList').querySelectorAll('.command-item').forEach((el, i) => {
        el.classList.toggle('selected', i === 0);
      });
    }
  }

  // ── Keyboard Shortcuts ──────────────────────────────────────────
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        toggleSettings();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        const themes = ['midnight', 'cyberpunk', 'monokai', 'nord', 'dracula', 'ocean', 'aurora', 'sunset', 'rainbow'];
        const idx = themes.indexOf(config.theme);
        config.theme = themes[(idx + 1) % themes.length];
        saveConfigNow();
        applyTheme();
      }
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        toggleFocusMode();
      }
      if (e.key === 'Escape') {
        toggleSettings(false);
        toggleWallpaper(false);
        toggleCommandPalette(false);
      }
    });
  }

  // ── Boot ────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  // Listen for external changes (from popup)
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.devAesthetic) {
        config = { ...config, ...changes.devAesthetic.newValue };
        applyTheme();
        applyWallpaper();
        updateClock();
        updateWelcomeCard();
        initWeather();
        syncSettingsUI();
        renderBookmarks();
      }
    });
  }
})();
