// counters.js — animate stat numbers from 0 to their target when scrolled into view.
// Markup: <span class="stat-number" data-target="50" data-suffix="+">0</span>
document.addEventListener('DOMContentLoaded', () => {
  const counters = document.querySelectorAll('.stat-number');
  if (!counters.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render(el, value, suffix, prefix) {
    el.textContent = `${prefix}${value}${suffix}`;
  }

  function animate(el) {
    const target  = parseFloat(el.dataset.target) || 0;
    const suffix  = el.dataset.suffix || '';
    const prefix  = el.dataset.prefix || '';
    const duration = 2000; // 2 seconds

    // Reduced motion (or no rAF): jump straight to the final value.
    if (reduceMotion || !window.requestAnimationFrame) {
      render(el, target, suffix, prefix);
      return;
    }

    let startTime = null;
    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easeOutQuad for a natural settle
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(target * eased);
      render(el, current, suffix, prefix);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        render(el, target, suffix, prefix);
      }
    }
    requestAnimationFrame(step);
  }

  if (!('IntersectionObserver' in window)) {
    counters.forEach(el => animate(el));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  counters.forEach(el => observer.observe(el));
});
