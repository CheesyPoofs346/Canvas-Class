(function () {
  var HOST_ID = 'ic-watch-host';
  var old = document.getElementById(HOST_ID);
  if (old) { old.remove(); }

  var host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var CSS = `
  :host{all:initial}
  *{box-sizing:border-box;margin:0;padding:0}
  .wrap{
    position:fixed;inset:0;z-index:2147483647;
    background:#121110;color:#f2efe9;
    font:400 15px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;
    overflow-y:auto;-webkit-overflow-scrolling:touch;
  }
  .wrap::before{
    content:"";position:absolute;inset:0 0 auto 0;height:340px;pointer-events:none;
    background:radial-gradient(120% 100% at 50% 0,rgba(255,247,232,.055),transparent 70%);
  }
  .inner{position:relative;max-width:660px;margin:0 auto;padding:20px 22px 80px}

  .bar{display:flex;align-items:center;gap:9px;padding-bottom:18px;
    border-bottom:1px solid #262320}
  .mark{
    font:500 11px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.2em;text-transform:uppercase;color:#8a837a;flex:1
  }
  button{
    all:unset;cursor:pointer;
    font:500 12px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.05em;color:#cdc6bb;
    background:#1e1b19;border:1px solid #2f2b27;border-radius:7px;padding:10px 14px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
    transition:background .15s ease,border-color .15s ease,color .15s ease;
  }
  button:hover{background:#26221f;border-color:#403a34;color:#f2efe9}
  button:active{background:#1a1715}
  button:focus-visible{outline:1px solid #d9cbb0;outline-offset:2px}

  .state{padding:52px 0 44px}
  .big{
    font:600 clamp(33px,9vw,54px)/1.03 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;
    letter-spacing:-0.032em;
    background:linear-gradient(180deg,#fdfaf4,#c9c1b5);
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }
  .sub{margin-top:17px;color:#9c948a;font-size:15px;max-width:46ch}

  .lbl{
    font:500 10px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.22em;text-transform:uppercase;color:#7b736a;
    display:flex;align-items:center;gap:14px;margin-bottom:20px;
  }
  .lbl::after{content:"";flex:1;height:1px;background:#262320}

  .cards{margin-top:-2px}
  .rail{position:relative;padding-left:24px}
  .rail::before{content:"";position:absolute;left:4px;top:10px;bottom:14px;
    width:1px;background:linear-gradient(180deg,#3a352f,#262320)}
  .row{position:relative;display:flex;align-items:baseline;gap:16px;padding:12px 0;
    font:400 13px/1.35 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}
  .row::before{content:"";position:absolute;left:-24px;top:15px;
    width:9px;height:9px;border-radius:50%;background:#4a443c;
    box-shadow:0 0 0 4px #121110}
  .yr{color:#7b736a;width:4.5ch;flex:none}
  .dt{color:#f2efe9;width:13ch;flex:none}
  .tm{color:#9c948a;flex:1}
  .ct{color:#7b736a}
  .row.pending::before{background:#121110;border:1.5px solid #d9cbb0;
    animation:pulse 2.8s ease-in-out infinite}
  .row.pending .dt,.row.pending .tm{color:#e6dcc9}
  @keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}
  @media (prefers-reduced-motion:reduce){.row.pending::before{animation:none;opacity:.8}}

  .card{
    display:flex;gap:16px;align-items:flex-start;
    background:linear-gradient(180deg,#1c1917,#181513);
    border:1px solid #2b2723;border-radius:12px;
    padding:16px;margin-bottom:10px;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 1px 2px rgba(0,0,0,.4);
  }
  .tile{
    flex:none;width:42px;height:42px;border-radius:9px;
    display:flex;align-items:center;justify-content:center;
    background:#232019;border:1px solid #38322a;color:#e6dcc9;
    font:600 14px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.05);
  }
  .cbody{min-width:0;padding-top:3px}
  .cname{font-size:16px;font-weight:550;line-height:1.3;letter-spacing:-0.012em;
    word-break:break-word}
  .teach{margin-top:5px;color:#9c948a;
    font:400 12px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.08em;text-transform:uppercase}

  .cmeta{margin-top:6px;color:#6f685f;
    font:400 12px/1.4 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}

  .cap{margin-top:16px;color:#7b736a;font-size:13px;max-width:46ch}
  .foot{margin-top:44px;padding-top:18px;border-top:1px solid #1f1c1a;color:#6b645c;
    font:400 12px/1.6 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}
  section{margin-top:48px}
  `;
  var style = document.createElement('style');
  style.textContent = CSS;
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = '<div class="inner"><div class="bar">' +
    '<span class="mark">Infinite Campus watch</span>' +
    '<button id="ic-r">Check now</button>' +
    '<button id="ic-x">Close</button>' +
    '</div><div id="ic-body"></div></div>';
  root.appendChild(wrap);

  var body = root.getElementById('ic-body');
  var timer = null;
  root.getElementById('ic-x').onclick = function () { clearInterval(timer); host.remove(); };
  root.getElementById('ic-r').onclick = function () { run(); };

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmtDate(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) { h = 12; }
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }
  // "13:55:00" -> "1:55 PM"
  function fmtClock(t) {
    if (!t) { return null; }
    var bits = String(t).split(':');
    var h = parseInt(bits[0], 10), m = bits[1] || '00';
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) { h = 12; }
    return h + ':' + m + ' ' + ap;
  }

  async function getJSON(url) {
    var r = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!r.ok) { throw new Error('HTTP ' + r.status); }
    return r.json();
  }

  function cardHTML(r) {
    var bits = [];
    if (r.room) { bits.push('Rm ' + r.room); }
    if (r.time) { bits.push(r.time); }
    if (r.term) { bits.push(r.term); }
    return '<div class="card">' +
      '<div class="tile">' + (r.period != null ? ('P' + r.period) : '\u2014') + '</div>' +
      '<div class="cbody">' +
      '<div class="cname">' + esc(r.title || 'Untitled') + '</div>' +
      '<div class="teach">' + (r.teacher ? esc(r.teacher) : 'teacher unknown') + '</div>' +
      (bits.length ? '<div class="cmeta">' + esc(bits.join('  \u00b7  ')) + '</div>' : '') +
      '</div></div>';
  }

  function enrollRow(e, pending) {
    return '<div class="row' + (pending ? ' pending' : '') + '">' +
      '<span class="yr">' + (e.endYear ? e.endYear - 1 : '\u2014') + '</span>' +
      '<span class="dt">' + esc(e.calendarName || e.structureName || '') + '</span>' +
      '<span class="tm">grade ' + esc(e.grade || '?') + '</span>' +
      '<span class="ct">' + esc(e.schoolName || '') + '</span></div>';
  }

  // Each roster entry repeats once per period schedule (M-Collab, T/TH, W/F),
  // so collapse on sectionID and keep the first placement that has a period.
  function icRows(roster, year) {
    var seen = {}, out = [];
    roster.forEach(function (r) {
      if (r.endYear !== year || r.dropped) { return; }
      if (seen[r.sectionID]) { return; }
      seen[r.sectionID] = true;

      var pl = r.sectionPlacements || [];
      var period = null, start = null, end = null, terms = {};
      pl.forEach(function (p) {
        if (p.termName) { terms[p.termName] = true; }
        if (period == null && p.periodName != null) {
          period = parseInt(p.periodName, 10);
          start = p.startTime; end = p.endTime;
        }
      });
      var tl = Object.keys(terms).sort();

      out.push({
        title: r.courseName,
        teacher: r.teacherDisplay,
        period: isNaN(period) ? null : period,
        room: r.roomName || null,
        time: (start && end) ? (fmtClock(start) + '\u2013' + fmtClock(end)) : null,
        term: tl.length === 1 ? tl[0] : null
      });
    });
    out.sort(function (a, b) {
      if (a.period == null) { return 1; }
      if (b.period == null) { return -1; }
      return a.period - b.period;
    });
    return out;
  }

  async function run() {
    if (!/infinitecampus\.org$/.test(location.hostname)) {
      body.innerHTML = '<div class="state"><div class="big">Wrong site</div>' +
        '<p class="sub">This one reads Infinite Campus. Run it on ' +
        'esuhsd.infinitecampus.org. Canvas has its own bookmarklet.</p></div>';
      return;
    }

    body.innerHTML = '<div class="state"><div class="big">Reading\u2026</div>' +
      '<p class="sub">Checking for a next-year enrollment.</p></div>';

    var students;
    try {
      students = await getJSON('/campus/resources/portal/students');
    } catch (e) {
      body.innerHTML = '<div class="state"><div class="big">Session expired</div>' +
        '<p class="sub">Infinite Campus refused the request, so an empty result ' +
        'would not mean anything. Sign in again and rerun.</p></div>';
      return;
    }

    var me = (students && students[0]) || {};
    var cur = me.enrollments || [];
    var fut = me.futureEnrollments || [];

    var maxYear = 0;
    cur.concat(fut).forEach(function (e) {
      if (e.endYear > maxYear) { maxYear = e.endYear; }
    });
    var target = fut.length ? maxYear : maxYear + 1;

    var roster = [];
    try { roster = await getJSON('/campus/resources/portal/roster'); } catch (e) { /* ok */ }
    if (!Array.isArray(roster)) { roster = []; }

    var rows = icRows(roster, target);
    var html = '';

    if (!fut.length && !rows.length) {
      var rollover = (cur.length && cur[0].calendarEndDate)
        ? new Date(cur[0].calendarEndDate + 'T12:00:00') : null;
      html += '<div class="state"><div class="big">Not loaded yet</div>' +
        '<p class="sub">No ' + (target - 1) + '\u2013' + (target % 100) +
        ' enrollment exists yet. Infinite Campus creates it at calendar rollover' +
        (rollover ? ', and your current calendar ends ' + fmtDate(rollover) : '') +
        '. Rechecks every 10 minutes.</p></div>';
    } else {
      html += '<div class="state"><div class="big">' +
        (rows.length ? rows.length + (rows.length === 1 ? ' class' : ' classes')
                     : 'Enrollment found') + '</div>' +
        '<p class="sub">' + (rows.length
          ? 'Next year is live here, which usually means Canvas is hours behind.'
          : 'A next-year enrollment exists but no sections are attached yet. ' +
            'Those land after the enrollment record.') + '</p></div>';
    }

    html += '<section><div class="lbl">Enrollments</div><div class="rail">';
    cur.forEach(function (e) { html += enrollRow(e, false); });
    if (fut.length) {
      fut.forEach(function (e) { html += enrollRow(e, false); });
    } else {
      html += '<div class="row pending"><span class="yr">' + (target - 1) +
        '</span><span class="dt">pending</span>' +
        '<span class="tm">not created yet</span></div>';
    }
    html += '</div></section>';

    body.innerHTML = html + '<section id="ic-list"></section>' +
      '<p class="foot">Last checked ' + fmtTime(new Date()) + '</p>';

    var list = root.getElementById('ic-list');
    if (rows.length) {
      list.innerHTML = '<div class="lbl">Your classes</div><div class="cards">' +
        rows.map(cardHTML).join('') + '</div>';
    } else {
      var prev = icRows(roster, target - 1);
      if (prev.length) {
        list.innerHTML = '<div class="lbl">Preview</div><div class="cards">' +
          cardHTML(prev[0]) + '</div>';
      }
    }
  }

  run();
  timer = setInterval(run, 600000);
})();
