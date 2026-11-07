/**
 * Grand Lynks Hotel AI Concierge Widget - Legacy / alias loader
 */
(function() {
  if (window.__GrandLynksConciergeLoaded) return;
  const s = document.createElement('script');
  s.src = 'concierge.js?v=' + new Date().getTime();
  s.defer = true;
  document.head.appendChild(s);
})();
