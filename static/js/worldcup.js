/* ===================== WORLD CUP 2026 FAN ZONE ===================== */
/* Vanilla JS. All user data in localStorage. No external libraries. */
(function () {
  'use strict';
  if (!document.querySelector('.wc-page')) return;

  // Opening match (Mexico v South Africa): 11 June 2026, 15:00 ET / 14:00 Jamaica === 19:00 UTC.
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

  /* ===================== TEAMS — official 2026 qualifiers (48) =====================
     Jamaica did not qualify for 2026 — fans pick a qualified team to support. */
  var TEAM = {
    MEX:{n:'Mexico',f:'🇲🇽'}, RSA:{n:'South Africa',f:'🇿🇦'}, KOR:{n:'Korea Republic',f:'🇰🇷'}, CZE:{n:'Czechia',f:'🇨🇿'},
    CAN:{n:'Canada',f:'🇨🇦'}, BIH:{n:'Bosnia & Herzegovina',f:'🇧🇦'}, QAT:{n:'Qatar',f:'🇶🇦'}, SUI:{n:'Switzerland',f:'🇨🇭'},
    BRA:{n:'Brazil',f:'🇧🇷'}, MAR:{n:'Morocco',f:'🇲🇦'}, HAI:{n:'Haiti',f:'🇭🇹'}, SCO:{n:'Scotland',f:'🏴󠁧󠁢󠁳󠁣󠁴󠁿'},
    USA:{n:'USA',f:'🇺🇸'}, PAR:{n:'Paraguay',f:'🇵🇾'}, AUS:{n:'Australia',f:'🇦🇺'}, TUR:{n:'Türkiye',f:'🇹🇷'},
    GER:{n:'Germany',f:'🇩🇪'}, CUW:{n:'Curaçao',f:'🇨🇼'}, CIV:{n:"Côte d'Ivoire",f:'🇨🇮'}, ECU:{n:'Ecuador',f:'🇪🇨'},
    NED:{n:'Netherlands',f:'🇳🇱'}, JPN:{n:'Japan',f:'🇯🇵'}, SWE:{n:'Sweden',f:'🇸🇪'}, TUN:{n:'Tunisia',f:'🇹🇳'},
    BEL:{n:'Belgium',f:'🇧🇪'}, EGY:{n:'Egypt',f:'🇪🇬'}, IRN:{n:'IR Iran',f:'🇮🇷'}, NZL:{n:'New Zealand',f:'🇳🇿'},
    ESP:{n:'Spain',f:'🇪🇸'}, CPV:{n:'Cabo Verde',f:'🇨🇻'}, KSA:{n:'Saudi Arabia',f:'🇸🇦'}, URU:{n:'Uruguay',f:'🇺🇾'},
    FRA:{n:'France',f:'🇫🇷'}, SEN:{n:'Senegal',f:'🇸🇳'}, IRQ:{n:'Iraq',f:'🇮🇶'}, NOR:{n:'Norway',f:'🇳🇴'},
    ARG:{n:'Argentina',f:'🇦🇷'}, ALG:{n:'Algeria',f:'🇩🇿'}, AUT:{n:'Austria',f:'🇦🇹'}, JOR:{n:'Jordan',f:'🇯🇴'},
    POR:{n:'Portugal',f:'🇵🇹'}, COD:{n:'Congo DR',f:'🇨🇩'}, UZB:{n:'Uzbekistan',f:'🇺🇿'}, COL:{n:'Colombia',f:'🇨🇴'},
    ENG:{n:'England',f:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, CRO:{n:'Croatia',f:'🇭🇷'}, GHA:{n:'Ghana',f:'🇬🇭'}, PAN:{n:'Panama',f:'🇵🇦'}
  };

  // Backing dropdown: all 48 qualified teams, alphabetical by name.
  var TEAMS = Object.keys(TEAM).map(function (c) { return TEAM[c]; })
    .sort(function (a, b) { return a.n < b.n ? -1 : (a.n > b.n ? 1 : 0); });

  function flagFor(name) {
    for (var i = 0; i < TEAMS.length; i++) { if (TEAMS[i].n === name) return TEAMS[i].f; }
    return '⚽';
  }

  function populateTeams() {
    var sel = document.getElementById('wcBacking');
    if (!sel) return;
    var reg = read(LS.reg, null);
    var current = reg && reg.backing ? reg.backing : '';
    TEAMS.forEach(function (t) {
      var opt = document.createElement('option');
      opt.value = t.n;
      opt.textContent = t.f + '  ' + t.n;
      if (t.n === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  /* ===================== SCHEDULE — official FIFA WC2026 group stage =====================
     Source: FIFA official Match Schedule (v17, 10 Apr 2026) + the final group draw.
     Every group of four is a round-robin (6 fixtures) in FIFA's positional pattern —
     MD1: 1v2,3v4 · MD2: 1v3,4v2 · MD3: 4v1,2v3 — which the official schedule confirms.
     All 72 group-stage matches are included. Kick-off times are US Eastern Time (ET). */
  var GROUPS = {
    A: ['MEX','RSA','KOR','CZE'], B: ['CAN','BIH','QAT','SUI'], C: ['BRA','MAR','HAI','SCO'],
    D: ['USA','PAR','AUS','TUR'], E: ['GER','CUW','CIV','ECU'], F: ['NED','JPN','SWE','TUN'],
    G: ['BEL','EGY','IRN','NZL'], H: ['ESP','CPV','KSA','URU'], I: ['FRA','SEN','IRQ','NOR'],
    J: ['ARG','ALG','AUT','JOR'], K: ['POR','COD','UZB','COL'], L: ['ENG','CRO','GHA','PAN']
  };

  // Per group: [homeCode, awayCode, matchday, matchNo, kickoffET, dateISO, venueCity]
  // Verified against ESPN's official 2026 fixture list (Jun 2026). All times US Eastern.
  var SCHED = {
    A: [['MEX','RSA',1,1,'15:00','2026-06-11','Mexico City'],['KOR','CZE',1,2,'22:00','2026-06-11','Guadalajara'],['CZE','RSA',2,25,'12:00','2026-06-18','Atlanta'],['MEX','KOR',2,28,'23:00','2026-06-18','Guadalajara'],['CZE','MEX',3,53,'21:00','2026-06-24','Mexico City'],['RSA','KOR',3,54,'21:00','2026-06-24','Monterrey']],
    B: [['CAN','BIH',1,3,'15:00','2026-06-12','Toronto'],['QAT','SUI',1,8,'15:00','2026-06-13','San Francisco'],['SUI','BIH',2,26,'15:00','2026-06-18','Los Angeles'],['CAN','QAT',2,27,'18:00','2026-06-18','Vancouver'],['SUI','CAN',3,51,'15:00','2026-06-24','Vancouver'],['BIH','QAT',3,52,'15:00','2026-06-24','Seattle']],
    C: [['HAI','SCO',1,5,'21:00','2026-06-13','Boston'],['BRA','MAR',1,7,'18:00','2026-06-13','New York/NJ'],['BRA','HAI',2,29,'21:00','2026-06-19','Philadelphia'],['SCO','MAR',2,30,'18:00','2026-06-19','Boston'],['SCO','BRA',3,49,'18:00','2026-06-24','Miami'],['MAR','HAI',3,50,'18:00','2026-06-24','Atlanta']],
    D: [['USA','PAR',1,4,'21:00','2026-06-12','Los Angeles'],['AUS','TUR',1,6,'00:00','2026-06-14','Vancouver'],['USA','AUS',2,32,'15:00','2026-06-19','Seattle'],['TUR','PAR',2,31,'00:00','2026-06-20','San Francisco'],['TUR','USA',3,59,'22:00','2026-06-25','Los Angeles'],['PAR','AUS',3,60,'22:00','2026-06-25','San Francisco']],
    E: [['CIV','ECU',1,9,'19:00','2026-06-14','Philadelphia'],['GER','CUW',1,10,'13:00','2026-06-14','Houston'],['GER','CIV',2,33,'16:00','2026-06-20','Toronto'],['ECU','CUW',2,34,'20:00','2026-06-20','Kansas City'],['CUW','CIV',3,55,'16:00','2026-06-25','Philadelphia'],['ECU','GER',3,56,'16:00','2026-06-25','New York/NJ']],
    F: [['NED','JPN',1,11,'16:00','2026-06-14','Dallas'],['SWE','TUN',1,12,'22:00','2026-06-14','Monterrey'],['NED','SWE',2,35,'13:00','2026-06-20','Houston'],['TUN','JPN',2,36,'00:00','2026-06-21','Monterrey'],['JPN','SWE',3,57,'19:00','2026-06-25','Dallas'],['TUN','NED',3,58,'19:00','2026-06-25','Kansas City']],
    G: [['IRN','NZL',1,15,'00:00','2026-06-16','Los Angeles'],['BEL','EGY',1,16,'18:00','2026-06-15','Seattle'],['BEL','IRN',2,39,'15:00','2026-06-21','Los Angeles'],['NZL','EGY',2,40,'21:00','2026-06-21','Vancouver'],['EGY','IRN',3,63,'23:00','2026-06-26','Seattle'],['NZL','BEL',3,64,'23:00','2026-06-26','Vancouver']],
    H: [['KSA','URU',1,13,'18:00','2026-06-15','Miami'],['ESP','CPV',1,14,'13:00','2026-06-15','Atlanta'],['URU','CPV',2,37,'18:00','2026-06-21','Miami'],['ESP','KSA',2,38,'12:00','2026-06-21','Atlanta'],['CPV','KSA',3,65,'20:00','2026-06-26','Houston'],['URU','ESP',3,66,'20:00','2026-06-26','Guadalajara']],
    I: [['FRA','SEN',1,17,'15:00','2026-06-16','New York/NJ'],['IRQ','NOR',1,18,'18:00','2026-06-16','Boston'],['NOR','SEN',2,41,'20:00','2026-06-22','New York/NJ'],['FRA','IRQ',2,42,'17:00','2026-06-22','Philadelphia'],['NOR','FRA',3,61,'15:00','2026-06-26','Boston'],['SEN','IRQ',3,62,'15:00','2026-06-26','Toronto']],
    J: [['ARG','ALG',1,19,'21:00','2026-06-16','Kansas City'],['AUT','JOR',1,20,'00:00','2026-06-17','San Francisco'],['ARG','AUT',2,43,'13:00','2026-06-22','Dallas'],['JOR','ALG',2,44,'23:00','2026-06-22','San Francisco'],['ALG','AUT',3,69,'22:00','2026-06-27','Kansas City'],['JOR','ARG',3,70,'22:00','2026-06-27','Dallas']],
    K: [['POR','COD',1,23,'13:00','2026-06-17','Houston'],['UZB','COL',1,24,'22:00','2026-06-17','Mexico City'],['POR','UZB',2,47,'13:00','2026-06-23','Houston'],['COL','COD',2,48,'22:00','2026-06-23','Guadalajara'],['COL','POR',3,71,'19:30','2026-06-27','Miami'],['COD','UZB',3,72,'19:30','2026-06-27','Atlanta']],
    L: [['GHA','PAN',1,21,'19:00','2026-06-17','Toronto'],['ENG','CRO',1,22,'16:00','2026-06-17','Dallas'],['ENG','GHA',2,45,'16:00','2026-06-23','Boston'],['PAN','CRO',2,46,'19:00','2026-06-23','Toronto'],['PAN','ENG',3,67,'17:00','2026-06-27','New York/NJ'],['CRO','GHA',3,68,'17:00','2026-06-27','Philadelphia']]
  };

  var MATCHES = [];
  Object.keys(SCHED).forEach(function (g) {
    SCHED[g].forEach(function (r) {
      MATCHES.push({
        id: 'M' + r[3], group: g, md: r[2], no: r[3], time: r[4],
        date: r[5], venue: r[6],
        ca: r[0], cb: r[1],           // team codes (for player-data lookup)
        a: TEAM[r[0]], b: TEAM[r[1]], status: 'upcoming'
        // result:{a,b} can be added once a match is played → unlocks scoring + ✓/✗
      });
    });
  });

  function mdLabel(md) { return 'Matchday ' + md; }

  var WC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var WC_DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function fmtMatchDate(iso) {
    if (!iso) return '';
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
    return WC_DOW[d.getUTCDay()] + ' ' + (+p[2]) + ' ' + WC_MONTHS[+p[1] - 1];
  }
  function fmtTime(t) {
    if (!t) return '';
    var pp = t.split(':'), h = +pp[0];
    var ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
    return h12 + ':' + pp[1] + ' ' + ap;
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

  /* ===================== REGISTRATION GATE =====================
     Registration is remembered in localStorage, so a returning visitor is never
     asked again on the same browser — they're greeted with "Welcome back". */
  function checkRegistration() {
    var reg = read(LS.reg, null);
    if (reg && reg.registered) {
      unlockFanZone(reg, true); // returning visitor — already registered
    } else {
      var note = document.getElementById('wcLockNote');
      if (note) note.classList.add('show');
    }
  }

  function unlockFanZone(reg, returning) {
    var form = document.getElementById('wcRegForm');
    var success = document.getElementById('wcRegSuccess');
    var gated = document.getElementById('wcGated');
    var note = document.getElementById('wcLockNote');
    var nameEl = document.getElementById('wcMemberName');
    var titleEl = document.querySelector('#wcRegSuccess .wc-h2');
    if (titleEl) titleEl.textContent = returning ? 'Welcome back! 👋' : "You're in! 🎉";
    if (form) form.style.display = 'none';
    if (success) success.classList.add('show');
    if (nameEl && reg && reg.name) nameEl.textContent = reg.name;
    var backEl = document.getElementById('wcMemberBacking');
    if (backEl && reg && reg.backing) backEl.textContent = flagFor(reg.backing) + ' ' + reg.backing;
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
      var backingEl = document.getElementById('wcBacking');
      var backing = backingEl ? backingEl.value : '';
      var follows = document.getElementById('wcFollow').checked;
      var err = document.getElementById('wcFormError');
      err.textContent = ''; // Clear previous error message
      err.classList.remove('wc-error-msg'); // Remove error styling

      if (!name) { err.textContent = 'Please enter your name.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Please enter a valid email address.'; return; }
      if (!insta) { err.textContent = 'Please enter your Instagram handle.'; return; }
      if (!backing) { err.textContent = 'Pick the team you\'re backing.'; return; }
      if (!follows) { err.textContent = 'Please confirm you follow @scoutvideoja to enter.'; return; }
      // If we reach here, validation passed, so no error class is needed.
      var reg = { name: name, email: email, instagram: insta, backing: backing, registered: true };
      write(LS.reg, reg);

      // Fire-and-forget to the server (never block the user on it).
      fetch('/api/worldcup/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, email: email, instagram: '@' + insta, backing: backing })
      }).catch(function () {});

      unlockFanZone(reg);
      var success = document.getElementById('wcRegSuccess');
      if (err.textContent) err.classList.add('wc-error-msg'); // Add error styling if an error occurred
      if (success && success.scrollIntoView) success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ===================== PREDICTIONS ===================== */
  function predictableMatches() {
    // Matchday-1 fixtures are the next ones up — feature them for predictions.
    return MATCHES.filter(function (m) { return m.md === 1 && m.status !== 'complete'; }).slice(0, 6);
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
        '<div class="wc-match-meta"><span>' + mdLabel(m.md) + ' · ' + fmtMatchDate(m.date) + ' · ' + fmtTime(m.time) + ' ET</span><span>Group ' + esc(m.group) + '</span></div>' +
        '<div class="wc-pred-top">' +
          '<div class="wc-team wc-team-link" data-team="' + m.ca + '"><span class="wc-flag">' + m.a.f + '</span><span class="wc-team-name">' + esc(m.a.n) + '</span></div>' +
          '<span class="wc-vs">VS</span>' +
          '<div class="wc-team wc-team-link" data-team="' + m.cb + '"><span class="wc-flag">' + m.b.f + '</span><span class="wc-team-name">' + esc(m.b.n) + '</span></div>' +
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
    var scoreA = sa && sa.value !== '' ? +sa.value : null;
    var scoreB = sb && sb.value !== '' ? +sb.value : null;
    preds[matchId] = {
      pick: pick,
      scoreA: scoreA,
      scoreB: scoreB,
      timestamp: new Date().toISOString()
    };
    write(LS.preds, preds);

    // Sync to the shared backend so this prediction can be scored server-side
    // once the match has a result (fire-and-forget — never block the UI).
    var reg = read(LS.reg, null);
    if (reg && reg.email) {
      fetch('/api/worldcup/prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: reg.email, match_id: matchId, pick: pick,
          score_a: scoreA, score_b: scoreB
        })
      }).catch(function () {});
    }

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

    // Sync this attempt to the shared backend; the server keeps the best score
    // and reflects it on the multi-user leaderboard (fire-and-forget).
    var reg = read(LS.reg, null);
    if (reg && reg.email) {
      fetch('/api/worldcup/trivia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: reg.email, score: trivia.score })
      }).catch(function () {});
    }

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

  /* ===================== LEADERBOARD (shared, multi-user) =====================
     The board is sourced from the Firestore-backed API so every fan sees the
     same standings. We render optimistically from the last fetch, then refresh
     from the server. The current fan's own row is rendered from live local
     values (so points update instantly), and Coach Scout is computed client-side
     from MATCH_ANALYSIS. */
  var _serverBoard = [];

  function normHandle(h) { return String(h || '').replace(/^@+/, '').toLowerCase(); }

  function renderLeaderboard() {
    var board = document.getElementById('wcBoard');
    if (!board) return;
    var reg = read(LS.reg, null);
    var predPts = predictionPoints();
    var triviaBest = read(LS.triviaBest, 0);
    var youTotal = predPts + triviaBest;
    var youHandleNorm = reg ? normHandle(reg.instagram) : '';

    // Other fans from the shared server board (exclude the current user — we add
    // a live local row for them below to avoid duplicates / stale points).
    var rows = _serverBoard.filter(function (e) {
      return !(youHandleNorm && normHandle(e.instagram) === youHandleNorm);
    }).map(function (e) {
      var handle = e.instagram || '';
      if (e.backing) handle += (handle ? ' · ' : '') + 'backing ' + flagFor(e.backing) + ' ' + e.backing;
      return { name: esc(e.name || 'Anonymous'), handle: esc(handle),
               pred: e.prediction_points || 0, trivia: e.trivia_best || 0,
               total: e.total_points || 0 };
    });

    // The current fan — registered users get a live row.
    if (reg && reg.registered) {
      var youHandle = reg.instagram ? '@' + reg.instagram : '@yourhandle';
      if (reg.backing) youHandle += ' · backing ' + flagFor(reg.backing) + ' ' + reg.backing;
      var serverYou = _serverBoard.filter(function (e) {
        return youHandleNorm && normHandle(e.instagram) === youHandleNorm;
      })[0];
      var bestTotal = Math.max(youTotal, serverYou ? (serverYou.total_points || 0) : 0);
      rows.push({ name: esc(reg.name || 'You'), handle: esc(youHandle),
                  pred: predPts, trivia: triviaBest, total: bestTotal, you: true });
    }

    // Coach Scout competes too — default avatar, swapping to winning-streak on a 3+ run.
    var coach = coachScoutRecord();
    var coachName = '<img class="coach-scout-avatar sm wc-board-av" src="' + coachImg(coach.avatar) + '" alt="Coach Scout"> Coach Scout' +
      (coach.streak >= 3 ? ' <span class="wc-board-streak">🔥 ' + coach.streak + ' in a row</span>' : '');
    rows.push({ name: coachName, handle: 'AI Analyst · ' + coach.correct + '/' + coach.completed + ' correct',
                pred: coach.pts, trivia: '🤖', total: coach.pts, isCoach: true });

    // Sort by numeric total, assign medal/number ranks, pad to at least 4 rows.
    rows.sort(function (a, b) { return (b.total || 0) - (a.total || 0); });
    var medals = ['🥇', '🥈', '🥉'];
    rows.forEach(function (r, i) { r.rank = i < 3 ? medals[i] : String(i + 1); });
    while (rows.length < 4) {
      rows.push({ rank: String(rows.length + 1), name: 'Coming soon…', handle: '—', pred: '—', trivia: '—', total: '—' });
    }

    board.innerHTML =
      '<div class="wc-board-head">' +
        '<span>#</span><span>Fan</span>' +
        '<span class="wc-hide-sm">Predict</span><span class="wc-hide-sm">Trivia</span><span style="text-align:right">Total</span>' +
      '</div>' +
      rows.map(function (r) {
        return '<div class="wc-board-row' + (r.you ? ' you' : '') + (r.isCoach ? ' is-coach' : '') + '">' +
          '<span class="wc-board-rank">' + r.rank + '</span>' +
          '<span class="wc-board-name">' + r.name + '<small>' + r.handle + '</small></span>' +
          '<span class="wc-board-col wc-hide-sm">' + r.pred + '</span>' +
          '<span class="wc-board-col wc-hide-sm">' + r.trivia + '</span>' +
          '<span class="wc-board-total">' + r.total + '</span>' +
        '</div>';
      }).join('');

    // Compact top-3 mirror near the top of the page (shown to everyone).
    var mini = document.getElementById('wcBoardMini');
    if (mini) {
      mini.innerHTML = rows.slice(0, 3).map(function (r) {
        var pts = typeof r.total === 'number' ? r.total + ' pts' : r.total;
        return '<div class="wc-minilb-row' + (r.you ? ' you' : '') + (r.isCoach ? ' is-coach' : '') + '">' +
          '<span class="wc-minilb-rank">' + r.rank + '</span>' +
          '<span class="wc-minilb-name">' + r.name + '</span>' +
          '<span class="wc-minilb-pts">' + pts + '</span>' +
        '</div>';
      }).join('');
    }
  }

  function updateLeaderboard() {
    renderLeaderboard();   // optimistic render from cached data
    fetch('/api/worldcup/leaderboard')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        _serverBoard = (data && data.leaderboard) || [];
        renderLeaderboard();
      })
      .catch(function () { /* offline — keep the optimistic render */ });
  }

  /* ===================== SCHEDULE + FILTER TABS ===================== */
  var currentFilter = 'all';
  var scheduleExpanded = false; // "All Matches" starts collapsed to the next matchday

  // The earliest matchday that still has unplayed fixtures.
  function nextMatchday() {
    var mds = MATCHES.filter(function (m) { return m.status !== 'complete'; })
                     .map(function (m) { return m.md; });
    return mds.length ? Math.min.apply(null, mds) : 1;
  }

  function buildTabs() {
    var tabsEl = document.getElementById('wcTabs');
    if (!tabsEl) return;
    var groups = [];
    MATCHES.forEach(function (m) { if (groups.indexOf(m.group) === -1) groups.push(m.group); });
    groups.sort();

    var tabs = [{ key: 'all', label: 'All Matches' }];
    groups.forEach(function (g) { tabs.push({ key: 'group:' + g, label: 'Group ' + g }); });

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
    return '<span class="wc-vs">' + fmtTime(m.time) + '<br>ET</span>';
  }

  function filterSchedule(filter) {
    currentFilter = filter;
    var el = document.getElementById('wcSchedule');
    if (!el) return;
    var list = matchesForFilter(filter);

    // "All Matches" is collapsed to the next matchday by default to save space;
    // a toggle reveals the full fixture list. Group tabs always show in full.
    var collapsible = (filter === 'all');
    var nmd = nextMatchday();
    var note = '';
    if (collapsible && !scheduleExpanded) {
      list = list.filter(function (m) { return m.md === nmd; });
      note = '<p class="wc-sub" style="text-align:center;margin:0 auto 18px">Showing ' +
             mdLabel(nmd) + ' — the next fixtures up.</p>';
    }

    if (!list.length) {
      el.innerHTML = '<p class="wc-sub" style="text-align:center;margin:24px auto">No fixtures to show yet — check back soon.</p>';
      return;
    }

    // Group fixtures by group letter; order each group by matchday / match number.
    var byGroup = {};
    var order = [];
    list.forEach(function (m) {
      if (!byGroup[m.group]) { byGroup[m.group] = []; order.push(m.group); }
      byGroup[m.group].push(m);
    });
    order.sort();

    var groupsHtml = order.map(function (g) {
      var matches = byGroup[g].slice().sort(function (x, y) { return x.no - y.no; });
      var cards = matches.map(function (m) {
        return '<div class="wc-match-card">' +
          '<div class="wc-match-meta"><span>' + mdLabel(m.md) + '</span>' + badgeFor(m) + '</div>' +
          '<div class="wc-match-teams">' +
            '<div class="wc-team wc-team-link" data-team="' + m.ca + '"><span class="wc-flag">' + m.a.f + '</span><span class="wc-team-name">' + esc(m.a.n) + '</span></div>' +
            centerCell(m) +
            '<div class="wc-team wc-team-link" data-team="' + m.cb + '"><span class="wc-flag">' + m.b.f + '</span><span class="wc-team-name">' + esc(m.b.n) + '</span></div>' +
          '</div>' +
          '<div class="wc-match-venue">' + fmtMatchDate(m.date) + ' · ' + esc(m.venue) + '</div>' +
        '</div>';
      }).join('');
      return '<div class="wc-date-group"><div class="wc-date-head">Group ' + esc(g) + '</div>' +
             '<div class="wc-match-grid">' + cards + '</div></div>';
    }).join('');

    var toggle = '';
    if (collapsible) {
      toggle = '<div class="wc-sched-toggle-wrap">' +
        '<button type="button" class="wc-btn wc-btn--ghost wc-sched-toggle" id="wcSchedToggle">' +
        (scheduleExpanded ? 'Show less ▲' : 'View all 72 fixtures ▼') + '</button></div>';
    }

    el.innerHTML = note + groupsHtml + toggle;

    var tgl = document.getElementById('wcSchedToggle');
    if (tgl) tgl.addEventListener('click', function () {
      scheduleExpanded = !scheduleExpanded;
      filterSchedule('all');
    });
  }

  /* ===================== PLAYERS + MATCH PREVIEW + TEAM MODAL ===================== */
  var PLAYERS = null;

  // Coach Scout pre-match analyses for the opening fixtures.
  // TODO: Generate dynamically via Gemini API before each match day.
  var MATCH_ANALYSIS = [
    { no: 1, date: '11 June', text: "Home advantage and a roaring Estadio Azteca should lift Mexico. Santiago Giménez will lead the line against a disciplined South African block marshalled by keeper Ronwen Williams. If El Tri move the ball quickly the opener is theirs — but Bafana Bafana are well organised and dangerous on the break.", scoreline: 'Mexico 2-0 South Africa', confidence: 78, keyBattle: 'Santiago Giménez vs Ronwen Williams', watchCode: 'MEX' },
    { no: 7, date: '11 June', text: "A heavyweight Group C opener. Brazil's front line of Vinícius and Raphinha against Hakimi's overlapping runs is must-watch. Morocco's 2022 semi-final run proved they fear no one and they will press high. Brazil's individual quality should edge a tight, end-to-end contest.", scoreline: 'Brazil 2-1 Morocco', confidence: 62, keyBattle: 'Vinícius Júnior vs Achraf Hakimi', watchCode: 'BRA' },
    { no: 4, date: '12 June', text: "Under Pochettino the USA will look to dominate the ball at home. Pulisic is the difference-maker, but Gustavo Alfaro's Paraguay are gritty and well-drilled. Expect the hosts to control possession; the question is whether Enciso can spark something on the counter.", scoreline: 'USA 1-1 Paraguay', confidence: 55, keyBattle: 'Christian Pulisic vs Omar Alderete', watchCode: 'USA' },
    { no: 19, date: '12 June', text: "The world champions begin their defence. Messi pulling the strings with Lautaro and Julián ahead of him is a frightening prospect for Algeria. Mahrez carries the Algerian threat, but Argentina's control and tournament know-how should see them open with a comfortable win.", scoreline: 'Argentina 3-0 Algeria', confidence: 80, keyBattle: 'Lionel Messi vs Ramy Bensebaini', watchCode: 'ARG' },
    { no: 22, date: '13 June', text: "A classic in the making. Tuchel's England against Modrić's Croatia revives memories of past tournament drama. Bellingham versus the experienced Croatian midfield is the central battle. England's pace out wide through Saka should be decisive against an ageing back line.", scoreline: 'England 2-1 Croatia', confidence: 58, keyBattle: 'Jude Bellingham vs Luka Modrić', watchCode: 'ENG' }
  ];

  // ---- Coach Scout avatar + prediction record ----
  var COACH_BASE = '/static/media/coach-scout/';
  function coachImg(state) { return COACH_BASE + state + '.png'; }
  function parseScore(s) {
    var m = String(s).match(/(\d+)\s*-\s*(\d+)/);
    return m ? { a: +m[1], b: +m[2] } : { a: 0, b: 0 };
  }
  // Tally Coach Scout's own predictions (MATCH_ANALYSIS scorelines) against any
  // completed results. Used for the leaderboard entry + winning-streak avatar.
  function coachScoutRecord() {
    var correct = 0, exact = 0, pts = 0, streak = 0, completed = 0;
    MATCH_ANALYSIS.slice().sort(function (a, b) { return a.no - b.no; }).forEach(function (an) {
      var m = findMatchByNo(an.no);
      if (!m || !m.result) return;
      completed++;
      var pg = parseScore(an.scoreline);
      var pw = pg.a > pg.b ? 'A' : (pg.a < pg.b ? 'B' : 'D');
      var aw = m.result.a > m.result.b ? 'A' : (m.result.a < m.result.b ? 'B' : 'D');
      if (pw === aw) {
        correct++; pts += 3; streak++;
        if (pg.a === m.result.a && pg.b === m.result.b) { exact++; pts += 5; }
      } else { streak = 0; }
    });
    return { correct: correct, exact: exact, pts: pts, streak: streak, completed: completed,
             avatar: streak >= 3 ? 'winning-streak' : 'default' };
  }

  function loadPlayers() {
    var url = window.WC_PLAYERS_URL || '/static/data/worldcup-players.json';
    return fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      PLAYERS = data.teams || {};
      renderMatchPreview();
    }).catch(function () {
      var el = document.getElementById('wcMatchPreviewBody');
      if (el) el.innerHTML = '<p class="wc-sub" style="text-align:center">Player previews are loading — check back shortly.</p>';
    });
  }

  // Merge AI-generated Coach Scout predictions into MATCH_ANALYSIS, replacing any
  // hardcoded entry for the same match (by `no`) and appending new ones.
  function mergeCoachAnalysis(list) {
    list.forEach(function (item) {
      if (item == null || item.no == null) return;
      var idx = -1;
      for (var i = 0; i < MATCH_ANALYSIS.length; i++) {
        if (MATCH_ANALYSIS[i].no === item.no) { idx = i; break; }
      }
      var entry = {
        no: item.no, date: item.date || '', text: item.text || '',
        scoreline: item.scoreline || '', confidence: item.confidence || 0,
        keyBattle: item.keyBattle || '', watchCode: item.watchCode || ''
      };
      if (idx >= 0) MATCH_ANALYSIS[idx] = entry; else MATCH_ANALYSIS.push(entry);
    });
    MATCH_ANALYSIS.sort(function (a, b) { return a.no - b.no; });
  }

  // Pull shared, AI-generated predictions from the backend. When present they
  // override the hardcoded defaults across the preview, leaderboard & ask tool.
  function loadCoachPredictions() {
    return fetch('/api/worldcup/coach-predictions')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = (data && data.predictions) || [];
        if (!list.length) return;
        mergeCoachAnalysis(list);
        renderMatchPreview();
        populateCoachAsk();
        updateLeaderboard();
      })
      .catch(function () { /* keep hardcoded defaults if the API is unavailable */ });
  }

  // FIFA Ultimate Team-style player card.
  function playerCard(p, colors) {
    var prim = (colors && colors.primary) || '#0E6B9E';
    var sec  = (colors && colors.secondary) || '#0a1628';
    var star = p.player_to_watch ? ' <span class="wc-pl-star">★</span>' : '';
    var watchLabel = p.player_to_watch ? '<div class="wc-pl-watch">⭐ Player to Watch</div>' : '';
    return '<div class="wc-pl-card' + (p.player_to_watch ? ' is-watch' : '') + '">' +
      '<div class="wc-pl-bar" style="background:linear-gradient(135deg,' + prim + ' 0%,' + sec + ' 100%)">' +
        '<div class="wc-pl-avatar" style="background:' + prim + '"><i class="fas fa-user"></i></div>' +
        '<span class="wc-pl-pos">' + esc(p.position) + '</span>' +
      '</div>' +
      '<div class="wc-pl-body">' +
        '<div class="wc-pl-name">' + esc(p.name) + star + '</div>' +
        '<div class="wc-pl-club">' + esc(p.club) + ' · ' + esc(p.league) + '</div>' +
        '<div class="wc-pl-stat"><i class="fas fa-bolt"></i> ' + esc(p.stat_highlight) + '</div>' +
        '<div class="wc-pl-metarow">Age ' + esc(p.age) + ' · ' + esc(p.caps) + ' caps · ' + esc(p.goals) + ' goals</div>' +
        '<div class="wc-pl-note">&ldquo;' + esc(p.scout_note) + '&rdquo;</div>' +
        watchLabel +
      '</div>' +
    '</div>';
  }

  function findMatchByNo(no) {
    for (var i = 0; i < MATCHES.length; i++) { if (MATCHES[i].no === no) return MATCHES[i]; }
    return null;
  }

  function renderMatchPreview() {
    var body = document.getElementById('wcMatchPreviewBody');
    if (!body || !PLAYERS) return;

    var blocks = MATCH_ANALYSIS.map(function (an) {
      var m = findMatchByNo(an.no);
      if (!m) return '';
      var tA = PLAYERS[m.ca], tB = PLAYERS[m.cb];
      if (!tA || !tB) return '';

      var watchTeam = an.watchCode === m.cb ? tB : tA;
      var watchPlayer = watchTeam.players.filter(function (p) { return p.player_to_watch; })[0] || watchTeam.players[0];

      var header =
        '<div class="wc-mp-header">' +
          '<div class="wc-mp-team wc-team-link" data-team="' + m.ca + '"><span class="wc-mp-flag">' + m.a.f + '</span><span>' + esc(m.a.n) + '</span></div>' +
          '<span class="wc-mp-vs">VS</span>' +
          '<div class="wc-mp-team wc-team-link" data-team="' + m.cb + '"><span class="wc-mp-flag">' + m.b.f + '</span><span>' + esc(m.b.n) + '</span></div>' +
        '</div>' +
        '<div class="wc-mp-meta">Group ' + esc(m.group) + ' · ' + mdLabel(m.md) + ' · ' + fmtMatchDate(m.date) + ' · ' + fmtTime(m.time) + ' ET · ' + esc(m.venue) + '</div>';

      // Avatar reflects Coach Scout's outcome once the match has a result.
      var coachState = 'analyzing';
      if (m.result) {
        var pg = parseScore(an.scoreline);
        var pw = pg.a > pg.b ? 'A' : (pg.a < pg.b ? 'B' : 'D');
        var aw = m.result.a > m.result.b ? 'A' : (m.result.a < m.result.b ? 'B' : 'D');
        coachState = (pw === aw) ? 'celebrating' : 'shocked';
      }
      var analysis =
        '<div class="wc-analysis">' +
          '<div class="wc-analysis-head"><img class="coach-scout-avatar sm" src="' + coachImg(coachState) + '" alt="Coach Scout"> Coach Scout&rsquo;s Pre-Match Analysis</div>' +
          '<p class="wc-analysis-text">&ldquo;' + esc(an.text) + '&rdquo;</p>' +
          '<div class="wc-analysis-foot">' +
            '<div><span class="wc-analysis-k">🤖 Prediction:</span> ' + esc(an.scoreline) + ' <span class="wc-analysis-conf">(' + an.confidence + '% confidence)</span></div>' +
            '<div><span class="wc-analysis-k">Key Battle:</span> ' + esc(an.keyBattle) + '</div>' +
            '<div><span class="wc-analysis-k">Player to Watch:</span> ⭐ ' + esc(watchPlayer.name) + ' (' + esc(watchTeam.name) + ')</div>' +
          '</div>' +
        '</div>';

      var colA = tA.players.map(function (p) { return playerCard(p, tA.colors); }).join('');
      var colB = tB.players.map(function (p) { return playerCard(p, tB.colors); }).join('');
      var comparison =
        '<div class="wc-mp-compare">' +
          '<div class="wc-mp-col"><div class="wc-mp-colhead wc-team-link" data-team="' + m.ca + '">' + m.a.f + ' ' + esc(m.a.n) + '</div>' + colA + '</div>' +
          '<div class="wc-mp-col"><div class="wc-mp-colhead wc-team-link" data-team="' + m.cb + '">' + m.b.f + ' ' + esc(m.b.n) + '</div>' + colB + '</div>' +
        '</div>';

      // Note: no .fade-in here — these blocks are injected after the scroll
      // observer has already run, so they'd never receive the .visible class.
      return '<div class="wc-mp-block">' + header + analysis + comparison + '</div>';
    }).join('');

    body.innerHTML = blocks || '<p class="wc-sub" style="text-align:center">No upcoming fixtures to preview.</p>';
  }

  // Coach Scout tournament outlook from FIFA ranking (expanded 48-team / Round-of-32 format).
  function predictFor(team) {
    var r = team.fifa_ranking || 99;
    var star = (team.players.filter(function (p) { return p.player_to_watch; })[0] || team.players[0] || {}).name || 'their key man';
    if (r <= 2)  return { result: 'Champions',       reason: 'Tournament favourites — squad depth and ' + star + ' make them the team to beat.' };
    if (r <= 5)  return { result: 'Runners-up',      reason: 'Genuine contenders who should reach the business end behind only the very best.' };
    if (r <= 9)  return { result: 'Semi Finals',     reason: 'Elite quality throughout — a deep run is well within reach.' };
    if (r <= 16) return { result: 'Quarter Finals',  reason: 'A strong side that can trouble anyone, led by ' + star + '.' };
    if (r <= 28) return { result: 'Round of 16',     reason: 'Capable of escaping the group and springing a knockout surprise.' };
    if (r <= 45) return { result: 'Round of 32',     reason: 'The expanded 48-team format gives them a real shot at the knockouts.' };
    return { result: 'Group stage exit', reason: 'A tough draw, but the pride of competing on the world stage awaits.' };
  }

  function openTeamModal(code) {
    var modal = document.getElementById('wcTeamModal');
    var body = document.getElementById('wcTeamModalBody');
    if (!modal || !body || !PLAYERS) return;
    var t = PLAYERS[code];
    if (!t) return;
    var pred = predictFor(t);
    var prim = (t.colors && t.colors.primary) || '#0E6B9E';
    var roster = t.players.map(function (p) { return playerCard(p, t.colors); }).join('');
    body.innerHTML =
      '<div class="wc-tm-hero" style="background:linear-gradient(135deg,' + prim + ' 0%, #0a1628 100%)">' +
        '<div class="wc-tm-flag">' + t.flag + '</div>' +
        '<div class="wc-tm-name">' + esc(t.name) + '</div>' +
        '<div class="wc-tm-tags">' +
          '<span><i class="fas fa-ranking-star"></i> FIFA #' + esc(t.fifa_ranking) + '</span>' +
          '<span><i class="fas fa-layer-group"></i> Group ' + esc(t.group) + '</span>' +
          '<span><i class="fas fa-user-tie"></i> ' + esc(t.coach) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="wc-tm-predict">' +
        '<div class="wc-tm-predict-head">🤖 Coach Scout&rsquo;s Prediction</div>' +
        '<div class="wc-tm-predict-result">' + esc(pred.result) + '</div>' +
        '<p class="wc-tm-predict-reason">' + esc(pred.reason) + '</p>' +
      '</div>' +
      '<div class="wc-tm-rostertitle">Featured Players</div>' +
      '<div class="wc-tm-roster">' + roster + '</div>' +
      '<button type="button" class="wc-btn wc-btn--green wc-tm-backbtn" id="wcTeamBack"><i class="fas fa-arrow-left"></i> Back to Fan Zone</button>';
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('open'); });
    document.body.style.overflow = 'hidden';
    var dlg = modal.querySelector('.wc-tm-dialog'); if (dlg) dlg.scrollTop = 0;
    var back = document.getElementById('wcTeamBack');
    if (back) back.addEventListener('click', closeTeamModal);
  }

  function closeTeamModal() {
    var modal = document.getElementById('wcTeamModal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { modal.hidden = true; }, 250);
  }

  function initTeamModal() {
    var modal = document.getElementById('wcTeamModal');
    if (modal) {
      var overlay = modal.querySelector('.wc-tm-overlay');
      var x = modal.querySelector('.wc-tm-close');
      if (overlay) overlay.addEventListener('click', closeTeamModal);
      if (x) x.addEventListener('click', closeTeamModal);
    }
    // Delegate clicks: any element (or ancestor) carrying data-team opens that team.
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-team]') : null;
      if (el && el.getAttribute('data-team')) openTeamModal(el.getAttribute('data-team'));
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeTeamModal();
    });
  }

  /* ===================== ASK COACH SCOUT TOOL ===================== */
  // Populate (or repopulate) the match dropdown from the current MATCH_ANALYSIS.
  // Kept separate so it can be rebuilt when AI predictions load asynchronously.
  function populateCoachAsk() {
    var select = document.getElementById('wcCoachAskSelect');
    if (!select) return;
    var placeholder = select.options[0];           // keep the "choose a match" option
    select.innerHTML = '';
    if (placeholder) select.appendChild(placeholder);
    MATCH_ANALYSIS.forEach(function (an) {
      var m = findMatchByNo(an.no);
      if (!m) return;
      var opt = document.createElement('option');
      opt.value = an.no;
      opt.textContent = m.a.n + ' vs ' + m.b.n;
      select.appendChild(opt);
    });
  }

  function initCoachAsk() {
    var select = document.getElementById('wcCoachAskSelect');
    var btn = document.getElementById('wcCoachAskBtn');
    var resultEl = document.getElementById('wcCoachAskResult');
    if (!select || !btn || !resultEl) return;

    populateCoachAsk();

    select.addEventListener('change', function() {
      btn.disabled = !select.value;
    });

    btn.addEventListener('click', function() {
      var matchNo = +select.value;
      if (!matchNo) return;

      var analysis = MATCH_ANALYSIS.filter(function(an) { return an.no === matchNo; })[0];
      if (!analysis) return;

      var watchPlayer = analysis.watchCode ? (PLAYERS[analysis.watchCode] || { players: [{}] }).players.filter(function(p) { return p.player_to_watch; })[0] : null;
      var watchPlayerName = watchPlayer ? watchPlayer.name : 'the key players';

      resultEl.innerHTML =
        '<div class="wc-analysis">' +
          '<div class="wc-analysis-head"><img class="coach-scout-avatar sm" src="' + coachImg('analyzing') + '" alt="Coach Scout"> Coach Scout&rsquo;s Analysis</div>' +
          '<p class="wc-analysis-text">&ldquo;' + esc(analysis.text) + '&rdquo;</p>' +
          '<div class="wc-analysis-foot">' +
            '<div><span class="wc-analysis-k">🤖 Prediction:</span> ' + esc(analysis.scoreline) + ' <span class="wc-analysis-conf">(' + analysis.confidence + '% confidence)</span></div>' +
            '<div><span class="wc-analysis-k">Key Battle:</span> ' + esc(analysis.keyBattle) + '</div>' +
            '<div><span class="wc-analysis-k">Player to Watch:</span> ⭐ ' + esc(watchPlayerName) + '</div>' +
          '</div>' +
        '</div>';

      // Animate the result card in
      resultEl.style.maxHeight = '0px';
      resultEl.style.opacity = '0';
      requestAnimationFrame(function() {
        resultEl.style.transition = 'max-height 0.5s ease, opacity 0.5s ease';
        resultEl.style.maxHeight = resultEl.scrollHeight + 'px';
        resultEl.style.opacity = '1';
        if (resultEl.scrollIntoView) resultEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', function () {
    initCountdown();
    populateTeams();
    handleRegister();
    buildTabs();
    filterSchedule('all');
    loadPredictions();
    renderPredShare();
    initTrivia();
    updateLeaderboard();
    initTeamModal();
    initCoachAsk();
    loadPlayers().then(loadCoachPredictions); // render preview, then layer in AI predictions
    checkRegistration(); // gate last (after content is rendered)
    setInterval(updateLeaderboard, 30000); // keep the shared board fresh
  });
})();
