(function() {
  try {
    var _c = JSON.parse(localStorage.getItem('devAesthetic_theme_cache') || '{}');
    if (_c.theme) document.body.dataset.theme = _c.theme;
    if (_c.wallpaper) document.body.dataset.wallpaper = _c.wallpaper;
  } catch(e) {}
})();
