// contact-fab.js — expand/collapse the floating contact menu
document.addEventListener('DOMContentLoaded', () => {
  const fab = document.getElementById('contactFab');
  const toggle = document.getElementById('contactFabToggle');
  if (!fab || !toggle) return;

  function setOpen(open) {
    fab.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close contact options' : 'Open contact options');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(!fab.classList.contains('open'));
  });

  // Tap/click elsewhere collapses the menu.
  document.addEventListener('click', (e) => {
    if (!fab.contains(e.target)) setOpen(false);
  });

  // Esc closes it too.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
});
