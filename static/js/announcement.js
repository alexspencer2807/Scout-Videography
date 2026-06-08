// announcement.js — dismissable top ticker, remembered for the session
document.addEventListener('DOMContentLoaded', () => {
  const bar = document.getElementById('announceBar');
  if (!bar) return;

  // Stay hidden if dismissed earlier this session.
  if (sessionStorage.getItem('announceClosed') === '1') {
    bar.remove();
    return;
  }

  const closeBtn = document.getElementById('announceClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      bar.classList.add('announce-hidden');
      sessionStorage.setItem('announceClosed', '1');
      // Remove from layout after the collapse transition finishes.
      setTimeout(() => bar.remove(), 350);
    });
  }
});
