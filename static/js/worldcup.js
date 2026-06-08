/* ===================== WORLD CUP 2026 FAN ZONE ===================== */
/* Vanilla JS. All user data in localStorage. No external libraries. */
(function () {
  'use strict';
  if (!document.querySelector('.wc-page')) return;

  // Opening match: 11 June 2026, 14:00 EST (Jamaica time) === 19:00 UTC.
  var KICKOFF_UTC = Date.UTC(2026, 5, 11, 19, 0, 0);

  var LS = {
    reg: 'worldcup_registration',
    preds: 'worldcup_predictions',
    triviaBest: 'worldcup_trivia_best'
  };

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ===================== SHARE HELPERS ===================== */
  var PRED_SHARE_MSG = "I'm playing the Scout World Cup Predictor! ⚽🏆 Make your picks: scoutvideoja.com/worldcup @scoutvideoja";

  function waShareUrl(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }

  function shareButtonsHTML() {
    return '<a href="#" class="wc-btn wc-btn--ig js-share-ig"><i class="fab fa-instagram"></i> Share to Instagram Story</a>' +
           '<a href="#" target="_blank" rel="noopener" class="wc-btn wc-btn--wa js-share-wa"><i class="fab fa-whatsapp"></i> Share to WhatsApp</a>';
  }

  function fallbackCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
  }

  function copyToClipboard(text, btn) {
    function done() {
      if (!btn) return;
      if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-check"></i> Copied! Paste in your Story';
      setTimeout(function () { btn.innerHTML = btn.dataset.label; }, 2600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }

  // Wire up the two share buttons inside `scope` for the given message.
  function attachShare(scope, message) {
    if (!scope) return;
    var ig = scope.querySelector('.js-share-ig');
    var wa = scope.querySelector('.js-share-wa');
    if (wa) wa.href = waShareUrl(message);
    if (ig) ig.addEventListener('click', function (e) {
      e.preventDefault();
      copyToClipboard(message, ig);                          // copy text for the Story
      window.open('https://instagram.com/scoutvideoja', '_blank', 'noopener'); // hop to IG to paste
    });
  }

  function renderPredShare() {
    var el = document.getElementById('wcPredShare');
    if (!el) return;
    el.innerHTML = '<p class="wc-share-prompt">Share your picks and challenge your friends 👇</p>' +
      '<div class="wc-quiz-actions">' + shareButtonsHTML() + '</div>';
    attachShare(el, PRED_SHARE_MSG);
  }

  /* ===================== SCHEDULE DATA =====================
     FIFA World Cup 2026 group stage. The official draw is not yet finalised,
     so some opponents/times are placeholders (TBD). Opening match and the
     Reggae Boyz fixtures are included.
     TODO: Make dynamic / confirm fixtures when the draw is finalised. */
  var MATCHES = [
    // Matchday 1
    { id: 'A1', group: 'A', date: '2026-06-11', time: '14:00', a: { n: 'Mexico', f: '🇲🇽' }, b: { n: 'TBD', f: '⚽' }, venue: 'Estadio Azteca', city: 'Mexico City', status: 'upcoming' },
    { id: 'A2', group: 'A', date: '2026-06-11', time: '17:00', a: { n: 'Croatia', f: '🇭🇷' }, b: { n: 'Senegal', f: '🇸🇳' }, venue: 'Estadio Akron', city: 'Guadalajara', status: 'upcoming' },
    { id: 'B1', group: 'B', date: '2026-06-12', time: '15:00', a: { n: 'Canada', f: '🇨🇦' }, b: { n: 'TBD', f: '⚽' }, venue: 'BMO Field', city: 'Toronto', status: 'upcoming' },
    { id: 'B2', group: 'B', date: '2026-06-12', time: '18:00', a: { n: 'Belgium', f: '🇧🇪' }, b: { n: 'Morocco', f: '🇲🇦' }, venue: 'BC Place', city: 'Vancouver', status: 'upcoming' },
    { id: 'C1', group: 'C', date: '2026-06-12', time: '20:00', a: { n: 'USA', f: '🇺🇸' }, b: { n: 'TBD', f: '⚽' }, venue: 'SoFi Stadium', city: 'Los Angeles', status: 'upcoming' },
    { id: 'C2', group: 'C', date: '2026-06-13', time: '14:00', a: { n: 'Uruguay', f: '🇺🇾' }, b: { n: 'South Korea', f: '🇰🇷' }, venue: 'NRG Stadium', city: 'Houston', status: 'upcoming' },
    { id: 'D1', group: 'D', date: '2026-06-13', time: '17:00', a: { n: 'Argentina', f: '🇦🇷' }, b: { n: 'Australia', f: '🇦🇺' }, venue: 'Mercedes-Benz Stadium', city: 'Atlanta', status: 'upcoming' },
    { id: 'D2', group: 'D', date: '2026-06-13', time: '20:00', a: { n: 'Nigeria', f: '🇳🇬' }, b: { n: 'TBD', f: '⚽' }, venue: 'Lincoln Financial Field', city: 'Philadelphia', status: 'upcoming' },
    // Group F — Reggae Boyz 🇯🇲
    { id: 'F1', group: 'F', date: '2026-06-14', time: '14:00', a: { n: 'Jamaica', f: '🇯🇲' }, b: { n: 'Japan', f: '🇯🇵' }, venue: 'Hard Rock Stadium', city: 'Miami', status: 'upcoming' },
    { id: 'F2', group: 'F', date: '2026-06-14', time: '17:00', a: { n: 'England', f: '🏴' }, b: { n: 'Tunisia', f: '🇹🇳' }, venue: 'AT&T Stadium', city: 'Dallas', status: 'upcoming' },
    { id: 'G1', group: 'G', date: '2026-06-14', time: '20:00', a: { n: 'Brazil', f: '🇧🇷' }, b: { n: 'TBD', f: '⚽' }, venue: 'MetLife Stadium', city: 'New York / NJ', status: 'upcoming' },
    { id: 'G2', group: 'G', date: '2026-06-15', time: '15:00', a: { n: 'Spain', f: '🇪🇸' }, b: { n: 'Ecuador', f: '🇪🇨' }, venue: 'Levi\'s Stadium', city: 'San Francisco', status: 'upcoming' },
    // Matchday 2 (selected)
    { id: 'A3', group: 'A', date: '2026-06-17', time: '17:00', a: { n: 'Mexico', f: '🇲🇽' }, b: { n: 'Croatia', f: '🇭🇷' }, venue: 'Estadio Azteca', city: 'Mexico City', status: 'upcoming' },
    { id: 'F3', group: 'F', date: '2026-06-18', time: '14:00', a: { n: 'Jamaica', f: '🇯🇲' }, b: { n: 'England', f: '🏴' }, venue: 'AT&T Stadium', city: 'Dallas', status: 'upcoming' },
    { id: 'F4', group: 'F', date: '2026-06-18', time: '17:00', a: { n: 'Japan', f: '🇯🇵' }, b: { n: 'Tunisia', f: '🇹🇳' }, venue: 'Hard Rock Stadium', city: 'Miami', status: 'upcoming' }
    // result fields (e.g. result:{a:2,b:1}) get added once matches are played → unlocks scoring + ✓/✗
  ];

  var DATE_FMT = { weekday: 'short', day: 'numeric', month: 'long' };
  function fmtDate(iso) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
    return d.toLocaleDateString('en-GB', DATE_FMT);
  }
  function winnerOf(res) {
    if (!res) return null;
    if (res.a > res.b) return 'A';
    if (res.a < res.b) return 'B';
    return 'D';
  }

  /* ===================== COUNTDOWN ===================== */
  function initCountdown() {
    var elD = document.getElementById('cdDays'),
        elH = document.getElementById('cdHours'),
        elM = document.getElementById('cdMins'),
        elS = document.getElementById('cdSecs'),
        cd  = document.getElementById('wcCountdown'),
        live = document.getElementById('wcLiveBanner');
    if (!elD) return;

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function tick() {
      var diff = KICKOFF_UTC - Date.now();
      if (diff <= 0) {
        if (cd) cd.style.display = 'none';
        if (live) live.classList.add('show');
        clearInterval(timer);
        return;
      }
      var s = Math.floor(diff / 1000);
      elD.textContent = pad(Math.floor(s / 86400));
      elH.textContent = pad(Math.floor((s % 86400) / 3600));
      elM.textContent = pad(Math.floor((s % 3600) / 60));
      elS.textContent = pad(s % 60);
    }
    tick();
    var timer = setInterval(tick, 1000);
  }

  /* ===================== REGISTRATION GATE ===================== */
  function checkRegistration() {
    var reg = read(LS.reg, null);
    if (reg && reg.registered) {
      unlockFanZone(reg);
    } else {
      var note = document.getElementById('wcLockNote');
      if (note) note.classList.add('show');
    }
  }

  function unlockFanZone(reg) {
    var form = document.getElementById('wcRegForm');
    var success = document.getElementById('wcRegSuccess');
    var gated = document.getElementById('wcGated');
    var note = document.getElementById('wcLockNote');
    var nameEl = document.getElementById('wcMemberName');
    if (form) form.style.display = 'none';
    if (success) success.classList.add('show');
    if (nameEl && reg && reg.name) nameEl.textContent = reg.name;
    if (gated) gated.classList.remove('locked');
    if (note) note.classList.remove('show');
    updateLeaderboard();
  }

  function handleRegister() {
    var form = document.getElementById('wcForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('wcName').value.trim();
      var email = document.getElementById('wcEmail').value.trim();
      var insta = document.getElementById('wcInsta').value.trim().replace(/^@+/, '');
      var follows = document.getElementById('wcFollow').checked;
      var err = document.getElementById('wcFormError');
      err.textContent = '';

      if (!name) { err.textContent = 'Please enter your name.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Please enter a valid email address.'; return; }
      if (!insta) { err.textContent = 'Please enter your Instagram handle.'; return; }
      if (!follows) { err.textContent = 'Please confirm you follow @scoutvideoja to enter.'; return; }

      var reg = { name: name, email: email, instagram: insta, registered: true };
      write(LS.reg, reg);

      // Fire-and-forget to the server (never block the user on it).
      fetch('/api/worldcup/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, instagram: '@' + insta })
      }).catch(function () {});

      unlockFanZone(reg);
      var success = document.getElementById('wcRegSuccess');
      if (success && success.scrollIntoView) success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ===================== PREDICTIONS ===================== */
  function predictableMatches() {
    return MATCHES.filter(function (m) {
      return m.status !== 'complete' && m.a.n !== 'TBD' && m.b.n !== 'TBD';
    }).slice(0, 6);
  }

  function predictionPoints() {
    var preds = read(LS.preds, {});
    var pts = 0;
    MATCHES.forEach(function (m) {
      var p = preds[m.id];
      if (!p || !m.result) return;
      if (p.pick === winnerOf(m.result)) pts += 3;
      if (p.scoreA != null && p.scoreB != null &&
          +p.scoreA === m.result.a && +p.scoreB === m.result.b) pts += 5;
    });
    return pts;
  }

  function loadPredictions() {
    var grid = document.getElementById('wcPredGrid');
    if (!grid) return;
    var preds = read(LS.preds, {});
    var list = predictableMatches();
    grid.innerHTML = list.map(function (m) {
      var p = preds[m.id] || null;
      var picks = [
        { k: 'A', label: m.a.n + ' Win' },
        { k: 'D', label: 'Draw' },
        { k: 'B', label: m.b.n + ' Win' }
      ];
      var btns = picks.map(function (x) {
        var sel = p && p.pick === x.k ? ' selected' : '';
        var dis = p ? ' disabled' : '';
        return '<button type="button" class="wc-pred-btn' + sel + '"' + dis +
               ' data-match="' + m.id + '" data-pick="' + x.k + '">' + esc(x.label) + '</button>';
      }).join('');

      var scoreA = p && p.scoreA != null ? p.scoreA : '';
      var scoreB = p && p.scoreB != null ? p.scoreB : '';
      var scoreRow = '<div class="wc-pred-score">' +
        '<input type="number" min="0" max="20" id="sa-' + m.id + '" value="' + esc(scoreA) + '" ' + (p ? 'disabled' : '') + ' aria-label="' + esc(m.a.n) + ' score">' +
        '<span>score (optional)</span>' +
        '<input type="number" min="0" max="20" id="sb-' + m.id + '" value="' + esc(scoreB) + '" ' + (p ? 'disabled' : '') + ' aria-label="' + esc(m.b.n) + ' score">' +
        '</div>';

      var locked = '';
      if (p) {
        if (m.result) {
          var ok = p.pick === winnerOf(m.result);
          locked = '<div class="wc-pred-locked' + (ok ? '' : ' wrong') + '">' +
                   (ok ? 'Correct ✓ +3 pts' : 'Not this time ✗') + '</div>';
        } else {
          locked = '<div class="wc-pred-locked">Your prediction is locked ✓</div>';
        }
      }

      return '<div class="wc-pred-card">' +
        '<div class="wc-match-meta"><span>' + esc(fmtDate(m.date)) + ' · ' + esc(m.time) + ' EST</span><span>Group ' + esc(m.group) + '</span></div>' +
        '<div class="wc-pred-top">' +
          '<div class="wc-team"><span class="wc-flag">' + m.a.f + '</span><span class="wc-team-name">' + esc(m.a.n) + '</span></div>' +
          '<span class="wc-vs">VS</span>' +
          '<div class="wc-team"><span class="wc-flag">' + m.b.f + '</span><span class="wc-team-name">' + esc(m.b.n) + '</span></div>' +
        '</div>' +
        '<div class="wc-pred-btns">' + btns + '</div>' +
        scoreRow + locked +
      '</div>';
    }).join('');

    grid.querySelectorAll('.wc-pred-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        savePrediction(btn.dataset.match, btn.dataset.pick);
      });
    });
  }

  function savePrediction(matchId, pick) {
    var preds = read(LS.preds, {});
    if (preds[matchId]) return; // already locked
    var sa = document.getElementById('sa-' + matchId);
    var sb = document.getElementById('sb-' + matchId);
    preds[matchId] = {
      pick: pick,
      scoreA: sa && sa.value !== '' ? +sa.value : null,
      scoreB: sb && sb.value !== '' ? +sb.value : null,
      timestamp: new Date().toISOString()
    };
    write(LS.preds, preds);
    loadPredictions();
    updateLeaderboard();
  }

  /* ===================== TRIVIA ===================== */
  var QUESTIONS = [
    { q: 'Which country has won the most World Cups?', o: ['Germany', 'Brazil', 'Italy', 'Argentina'], a: 1 },
    { q: 'In what year did Jamaica first qualify for the World Cup?', o: ['1994', '1998', '2002', '2010'], a: 1 },
    { q: "Who scored Jamaica's first ever World Cup goal?", o: ['Theodore Whitmore', 'Robbie Earle', 'Ricardo Gardner', 'Deon Burton'], a: 1 },
    { q: 'Which country hosted the 2022 World Cup?', o: ['Russia', 'Brazil', 'Qatar', 'UAE'], a: 2 },
    { q: 'How many teams compete in the 2026 World Cup?', o: ['32', '40', '48', '64'], a: 2 },
    { q: "What is the name of Jamaica's national football team?", o: ['Sunshine Boys', 'Reggae Boyz', 'Island Warriors', 'Blue & Gold'], a: 1 },
    { q: 'Which stadium will host the 2026 World Cup final?', o: ['SoFi Stadium', 'Estadio Azteca', 'MetLife Stadium', 'AT&T Stadium'], a: 2 },
    { q: 'Who is the all-time top scorer in World Cup history?', o: ['Ronaldo', 'Miroslav Klose', 'Pelé', 'Lionel Messi'], a: 1 },
    { q: 'Which Caribbean nation reached the World Cup in 1998?', o: ['Trinidad & Tobago', 'Cuba', 'Jamaica', 'Haiti'], a: 2 },
    { q: 'How many host countries are there for 2026?', o: ['1', '2', '3', '4'], a: 2 }
  ];

  var trivia = { i: 0, score: 0, answered: false };

  function initTrivia() {
    trivia = { i: 0, score: 0, answered: false };
    renderQuestion();
  }

  function renderQuestion() {
    var quiz = document.getElementById('wcQuiz');
    if (!quiz) return;
    if (trivia.i >= QUESTIONS.length) return showResults();

    var item = QUESTIONS[trivia.i];
    var pct = Math.round((trivia.i / QUESTIONS.length) * 100);
    quiz.innerHTML =
      '<div class="wc-quiz-bar"><div class="wc-quiz-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="wc-quiz-meta"><span>Question ' + (trivia.i + 1) + ' / ' + QUESTIONS.length + '</span>' +
        '<span>Score: <strong>' + trivia.score + '</strong></span></div>' +
      '<div class="wc-quiz-q">' + esc(item.q) + '</div>' +
      '<div class="wc-quiz-options">' +
        item.o.map(function (opt, idx) {
          return '<button type="button" class="wc-quiz-opt" data-idx="' + idx + '">' + esc(opt) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="wc-quiz-feedback" id="wcQuizFeedback"></div>' +
      '<div id="wcQuizNextWrap"></div>';

    trivia.answered = false;
    quiz.querySelectorAll('.wc-quiz-opt').forEach(function (b) {
      b.addEventListener('click', function () { checkAnswer(trivia.i, +b.dataset.idx); });
    });
  }

  function checkAnswer(questionIndex, answer) {
    if (trivia.answered) return;
    trivia.answered = true;
    var item = QUESTIONS[questionIndex];
    var opts = document.querySelectorAll('.wc-quiz-opt');
    var fb = document.getElementById('wcQuizFeedback');
    var correct = answer === item.a;

    opts.forEach(function (b, idx) {
      b.disabled = true;
      if (idx === item.a) b.classList.add('correct');
      else if (idx === answer) b.classList.add('wrong');
    });

    if (correct) { trivia.score++; fb.innerHTML = '<span class="ok">Correct! ✓</span>'; }
    else { fb.innerHTML = '<span class="no">Not quite ✗ — Answer: ' + esc(item.o[item.a]) + '</span>'; }

    var last = trivia.i === QUESTIONS.length - 1;
    var wrap = document.getElementById('wcQuizNextWrap');
    wrap.innerHTML = '<button type="button" class="wc-btn wc-btn--green wc-quiz-next" id="wcQuizNext">' +
      (last ? 'See Results 🏆' : 'Next Question →') + '</button>';
    document.getElementById('wcQuizNext').addEventListener('click', function () {
      trivia.i++;
      renderQuestion();
    });
  }

  function showResults() {
    var quiz = document.getElementById('wcQuiz');
    if (!quiz) return;
    var best = read(LS.triviaBest, 0);
    if (trivia.score > best) { best = trivia.score; write(LS.triviaBest, best); }

    var shareMsg = 'I scored ' + trivia.score + '/' + QUESTIONS.length +
      ' on the Scout World Cup Trivia! ⚽🏆 Try it: scoutvideoja.com/worldcup @scoutvideoja';

    quiz.innerHTML =
      '<div class="wc-quiz-results">' +
        '<div class="wc-quiz-bar"><div class="wc-quiz-bar-fill" style="width:100%"></div></div>' +
        '<p class="wc-eyebrow" style="margin-top:10px">Your Score</p>' +
        '<div class="wc-score-big">' + trivia.score + '/' + QUESTIONS.length + '</div>' +
        '<p class="wc-sub" style="margin:8px auto 0">Best score: <strong class="wc-gold-text">' + best + '/' + QUESTIONS.length + '</strong></p>' +
        '<div class="wc-share-msg">' + esc(shareMsg) + '</div>' +
        '<div class="wc-quiz-actions">' +
          shareButtonsHTML() +
          '<button type="button" class="wc-btn wc-btn--ghost" id="wcQuizReplay"><i class="fas fa-rotate-right"></i> Play Again</button>' +
        '</div>' +
      '</div>';

    attachShare(quiz, shareMsg);

    var copyTarget = quiz.querySelector('.wc-share-msg');
    if (copyTarget && navigator.clipboard) {
      copyTarget.style.cursor = 'copy';
      copyTarget.title = 'Tap to copy';
      copyTarget.addEventListener('click', function () {
        navigator.clipboard.writeText(shareMsg).then(function () {
          copyTarget.textContent = 'Copied to clipboard! ✓';
        }).catch(function () {});
      });
    }
    document.getElementById('wcQuizReplay').addEventListener('click', initTrivia);
    updateLeaderboard();
  }

  /* ===================== LEADERBOARD ===================== */
  function updateLeaderboard() {
    var board = document.getElementById('wcBoard');
    if (!board) return;
    var reg = read(LS.reg, null);
    var predPts = predictionPoints();
    var triviaBest = read(LS.triviaBest, 0);
    var total = predPts + triviaBest;

    var youName = reg && reg.name ? reg.name : 'You';
    var youHandle = reg && reg.instagram ? '@' + reg.instagram : '@yourhandle';

    var rows = [
      { rank: '🥇', name: esc(youName), handle: esc(youHandle), pred: predPts, trivia: triviaBest, total: total, you: true },
      { rank: '🥈', name: 'Coming soon…', handle: '—', pred: '—', trivia: '—', total: '—', you: false },
      { rank: '🥉', name: 'Coming soon…', handle: '—', pred: '—', trivia: '—', total: '—', you: false },
      { rank: '4', name: 'Coming soon…', handle: '—', pred: '—', trivia: '—', total: '—', you: false }
    ];

    board.innerHTML =
      '<div class="wc-board-head">' +
        '<span>#</span><span>Fan</span>' +
        '<span class="wc-hide-sm">Predict</span><span class="wc-hide-sm">Trivia</span><span style="text-align:right">Total</span>' +
      '</div>' +
      rows.map(function (r) {
        return '<div class="wc-board-row' + (r.you ? ' you' : '') + '">' +
          '<span class="wc-board-rank">' + r.rank + '</span>' +
          '<span class="wc-board-name">' + r.name + '<small>' + r.handle + '</small></span>' +
          '<span class="wc-board-col wc-hide-sm">' + r.pred + '</span>' +
          '<span class="wc-board-col wc-hide-sm">' + r.trivia + '</span>' +
          '<span class="wc-board-total">' + r.total + '</span>' +
        '</div>';
      }).join('');
  }

  /* ===================== SCHEDULE + FILTER TABS ===================== */
  var currentFilter = 'all';

  function buildTabs() {
    var tabsEl = document.getElementById('wcTabs');
    if (!tabsEl) return;
    var groups = [];
    MATCHES.forEach(function (m) { if (groups.indexOf(m.group) === -1) groups.push(m.group); });
    groups.sort();

    var tabs = [{ key: 'all', label: 'All Matches' }];
    groups.forEach(function (g) { tabs.push({ key: 'group:' + g, label: 'Group ' + g }); });
    tabs.push({ key: 'jamaica', label: 'Jamaica 🇯🇲' });

    tabsEl.innerHTML = tabs.map(function (t) {
      return '<button type="button" class="wc-tab' + (t.key === 'all' ? ' active' : '') +
        '" data-filter="' + t.key + '">' + t.label + '</button>';
    }).join('');

    tabsEl.querySelectorAll('.wc-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabsEl.querySelectorAll('.wc-tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        filterSchedule(btn.dataset.filter);
      });
    });
  }

  function matchesForFilter(filter) {
    if (filter === 'all') return MATCHES;
    if (filter === 'jamaica') return MATCHES.filter(function (m) { return m.a.n === 'Jamaica' || m.b.n === 'Jamaica'; });
    if (filter.indexOf('group:') === 0) {
      var g = filter.split(':')[1];
      return MATCHES.filter(function (m) { return m.group === g; });
    }
    return MATCHES;
  }

  function badgeFor(m) {
    if (m.status === 'live') return '<span class="wc-badge wc-badge--live">LIVE</span>';
    if (m.status === 'complete') return '<span class="wc-badge wc-badge--complete">Full Time</span>';
    return '<span class="wc-badge wc-badge--upcoming">Upcoming</span>';
  }

  function centerCell(m) {
    if (m.status === 'complete' && m.result) {
      return '<span class="wc-score">' + m.result.a + ' – ' + m.result.b + '</span>';
    }
    return '<span class="wc-vs">' + esc(m.time) + '<br>EST</span>';
  }

  function filterSchedule(filter) {
    currentFilter = filter;
    var el = document.getElementById('wcSchedule');
    if (!el) return;
    var list = matchesForFilter(filter);

    if (!list.length) {
      el.innerHTML = '<p class="wc-sub" style="text-align:center;margin:24px auto">No fixtures to show yet — check back soon.</p>';
      return;
    }

    // Group by date
    var byDate = {};
    var order = [];
    list.forEach(function (m) {
      if (!byDate[m.date]) { byDate[m.date] = []; order.push(m.date); }
      byDate[m.date].push(m);
    });
    order.sort();

    el.innerHTML = order.map(function (date) {
      var cards = byDate[date].map(function (m) {
        return '<div class="wc-match-card">' +
          '<div class="wc-match-meta"><span>Group ' + esc(m.group) + '</span>' + badgeFor(m) + '</div>' +
          '<div class="wc-match-teams">' +
            '<div class="wc-team"><span class="wc-flag">' + m.a.f + '</span><span class="wc-team-name">' + esc(m.a.n) + '</span></div>' +
            centerCell(m) +
            '<div class="wc-team"><span class="wc-flag">' + m.b.f + '</span><span class="wc-team-name">' + esc(m.b.n) + '</span></div>' +
          '</div>' +
          '<div class="wc-match-venue">' + esc(m.venue) + ' · ' + esc(m.city) + '</div>' +
        '</div>';
      }).join('');
      return '<div class="wc-date-group"><div class="wc-date-head">' + esc(fmtDate(date)) + '</div>' +
             '<div class="wc-match-grid">' + cards + '</div></div>';
    }).join('');
  }

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', function () {
    initCountdown();
    handleRegister();
    buildTabs();
    filterSchedule('all');
    loadPredictions();
    renderPredShare();
    initTrivia();
    updateLeaderboard();
    checkRegistration(); // gate last (after content is rendered)
  });
})();
