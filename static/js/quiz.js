// quiz.js — "Find Your Package" multi-step quiz (no API, vanilla JS)
document.addEventListener('DOMContentLoaded', () => {
  const modal    = document.getElementById('quizModal');
  const openBtn  = document.getElementById('quizOpenBtn');
  const closeBtn = document.getElementById('quizClose');
  const overlay  = document.getElementById('quizOverlay');
  const content  = document.getElementById('quizContent');
  const progress = document.getElementById('quizProgressBar');
  if (!modal || !openBtn || !content) return;

  const QUESTIONS = [
    { key: 'role', q: 'Who are you?', options: [
      { label: "I'm an Athlete", value: 'athlete' },
      { label: "I'm a Parent",   value: 'parent' },
      { label: "I'm a Coach",    value: 'coach' },
    ]},
    { key: 'goal', q: 'What are you looking for?', options: [
      { label: 'Match highlights', value: 'highlights' },
      { label: 'VR Training',      value: 'vr' },
      { label: 'Both',             value: 'both' },
      { label: 'Not sure',         value: 'unsure' },
    ]},
    { key: 'matches', q: 'How many matches per season?', options: [
      { label: '1–3',  value: 'low' },
      { label: '4–10', value: 'mid' },
      { label: '10+',  value: 'high' },
    ]},
    { key: 'budget', q: "What's your budget?", options: [
      { label: 'Under $10K JMD', value: 'b1' },
      { label: '$10–25K JMD',    value: 'b2' },
      { label: '$25K+ JMD',      value: 'b3' },
      { label: 'Not sure',       value: 'b0' },
    ]},
  ];

  let answers = {};
  let step = 0;

  function recommend(a) {
    if (a.role === 'coach') {
      return { name: 'Club Programme', price: 'Custom pricing',
        desc: 'Team-level match recording, per-player VR drill programmes, and a team analytics dashboard.',
        href: '/contact', cta: 'Contact for Club Pricing' };
    }
    if (a.goal === 'vr') {
      if (a.budget === 'b3' || a.matches === 'high') {
        return { name: '6-Session VR Training Block', price: 'Contact for pricing',
          desc: 'Six 45-minute Rezzil VR sessions on the HTC Vive Pro with full progress tracking and AI reports.',
          href: '/train', cta: 'Explore VR Training' };
      }
      return { name: 'Single VR Session', price: 'Contact for pricing',
        desc: 'A 45-minute Rezzil VR session — cognitive and technical drills with a performance score report.',
        href: '/train', cta: 'Explore VR Training' };
    }
    if (a.goal === 'both') {
      return { name: '3-Match Package + VR Block', price: 'Combo — contact for a bundle',
        desc: 'Match footage plus targeted VR training — the full athlete development loop at a discount.',
        href: '/contact', cta: 'Book a Combo' };
    }
    // highlights / unsure → match recording by volume & budget
    let pkg;
    if (a.matches === 'high' || a.budget === 'b3') {
      pkg = { name: '5-Match Package', price: '$40,000 JMD',
        desc: 'Five full match recordings with HD delivery and priority scheduling — save $10,000 vs single.' };
    } else if (a.matches === 'mid' || a.budget === 'b2') {
      pkg = { name: '3-Match Package', price: '$25,000 JMD',
        desc: 'Three full match recordings with HD delivery — our best value, save $5,000.' };
    } else if (a.budget === 'b1') {
      pkg = { name: '30-Min Game', price: '$5,000 JMD',
        desc: 'A 30-minute match recording with HD delivery within 24 hours — perfect to get started.' };
    } else {
      pkg = { name: 'Single Match', price: '$10,000 JMD',
        desc: 'One full match recording with HD delivery within 24 hours.' };
    }
    return Object.assign(pkg, { href: '/contact', cta: 'Book This' });
  }

  function setProgress(fraction) {
    if (progress) progress.style.width = Math.round(fraction * 100) + '%';
  }

  function renderQuestion() {
    const item = QUESTIONS[step];
    setProgress(step / QUESTIONS.length);
    content.innerHTML = `
      <div class="quiz-step-num">Question ${step + 1} of ${QUESTIONS.length}</div>
      <h3 class="quiz-question">${item.q}</h3>
      <div class="quiz-options">
        ${item.options.map(o =>
          `<button type="button" class="quiz-option" data-value="${o.value}">${o.label}</button>`
        ).join('')}
      </div>
      ${step > 0 ? '<button type="button" class="quiz-back" id="quizBack"><i class="fas fa-arrow-left"></i> Back</button>' : ''}
    `;
    content.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', () => {
        answers[item.key] = btn.dataset.value;
        if (step < QUESTIONS.length - 1) { step++; renderQuestion(); }
        else finish();
      });
    });
    const back = document.getElementById('quizBack');
    if (back) back.addEventListener('click', () => { step--; renderQuestion(); });
  }

  function renderResult(rec, retake) {
    setProgress(1);
    content.innerHTML = `
      <div class="quiz-result">
        <div class="quiz-result-badge"><i class="fas fa-circle-check"></i> Your match</div>
        <div class="quiz-step-num">We recommend</div>
        <h3 class="quiz-result-name">${rec.name}</h3>
        <div class="quiz-result-price">${rec.price}</div>
        <p class="quiz-result-desc">${rec.desc}</p>
        <a href="${rec.href}" class="btn btn-primary quiz-result-cta"><i class="fas fa-calendar-check"></i> ${rec.cta}</a>
        <button type="button" class="quiz-retake" id="quizRetake">Retake the quiz</button>
      </div>
    `;
    document.getElementById('quizRetake').addEventListener('click', () => {
      localStorage.removeItem('quizResult');
      answers = {}; step = 0; renderQuestion();
    });
  }

  function finish() {
    const rec = recommend(answers);
    try { localStorage.setItem('quizResult', JSON.stringify(rec)); } catch (e) {}
    renderResult(rec);
  }

  function openQuiz() {
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.body.style.overflow = 'hidden';
    // Already completed? Show the saved recommendation instead of re-asking.
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('quizResult') || 'null'); } catch (e) {}
    if (saved && saved.name) renderResult(saved);
    else { answers = {}; step = 0; renderQuestion(); }
  }

  function closeQuiz() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { modal.hidden = true; }, 250);
  }

  openBtn.addEventListener('click', openQuiz);
  if (closeBtn) closeBtn.addEventListener('click', closeQuiz);
  if (overlay) overlay.addEventListener('click', closeQuiz);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeQuiz();
  });
});
