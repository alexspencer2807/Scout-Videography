// scroll-animations.js — fade in elements as they enter the viewport
document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('.fade-in');
  if (!targets.length) return;

  // Respect reduced-motion: reveal everything immediately, no observer.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => observer.observe(el));
});
