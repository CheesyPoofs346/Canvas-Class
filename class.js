(function () {
  var HOST_ID = 'stw-host';
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
    background:#12151d;color:#e8eaf0;
    font:400 15px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif;
    overflow-y:auto;-webkit-overflow-scrolling:touch;
  }
  .inner{max-width:720px;margin:0 auto;padding:20px 18px 64px}
  .bar{display:flex;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid #272d3a}
  .mark{
    font:600 11px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.22em;text-transform:uppercase;color:#767e91;flex:1
  }
  button{
    all:unset;cursor:pointer;
    font:500 12px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.08em;text-transform:uppercase;
    color:#a7aebe;border:1px solid #272d3a;border-radius:6px;padding:8px 12px;
  }
  button:hover{color:#e8eaf0;border-color:#3a4254}
  button:focus-visible{outline:2px solid #e2a13f;outline-offset:2px}

  .state{padding:40px 0 32px}
  .big{
    font:700 clamp(34px,10vw,58px)/0.95 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:-0.035em;
  }
  .big.wait{color:#e2a13f}
  .big.live{color:#57c9a5}
  .big.err{color:#e06b5a}
  .sub{margin-top:14px;color:#9aa2b4;font-size:15px;max-width:44ch}

  .lbl{
    font:600 10px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    letter-spacing:.24em;text-transform:uppercase;color:#5f6879;
    padding-bottom:12px;border-bottom:1px solid #272d3a;margin-bottom:4px
  }

  .row{display:flex;align-items:baseline;gap:14px;padding:13px 0;border-bottom:1px solid #1e232e;
    font:400 14px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}
  .yr{color:#5f6879;width:4.5ch;flex:none}
  .dt{color:#e8eaf0;width:12ch;flex:none}
  .tm{color:#767e91;flex:1}
  .ct{color:#767e91}
  .row.pending{border-bottom:1px dashed #3a4254;color:#e2a13f}
  .row.pending .yr,.row.pending .dt,.row.pending .tm{color:#e2a13f}
  .dot{width:6px;height:6px;border-radius:50%;background:#e2a13f;display:inline-block;
    animation:p 2.4s ease-in-out infinite}
  @keyframes p{0%,100%{opacity:.25}50%{opacity:1}}
  @media (prefers-reduced-motion:reduce){.dot{animation:none;opacity:.7}}

  .card{border:1px solid #272d3a;border-radius:10px;padding:16px;margin-top:12px;background:#191d27}
  .cname{font-size:16px;font-weight:600;line-height:1.3}
  .meta{margin-top:10px;display:grid;grid-template-columns:auto 1fr;gap:5px 14px;
    font:400 13px/1.4 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}
  .meta dt{color:#5f6879}
  .meta dd{color:#c3cad8;word-break:break-word}
  .teach{color:#57c9a5}

  .foot{margin-top:32px;color:#5f6879;
    font:400 12px/1.6 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}
  section{margin-top:36px}
  `;

  var style = document.createElement('style');
  style.textContent = CSS;
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = '<div class="inner"><div class="bar">' +
    '<span class="mark">Schedule watch</span>' +
    '<button id="stw-r">Check now</button>' +
    '<button id="stw-x">Close</button>' +
    '</div><div id="stw-body"></div></div>';
  root.appendChild(wrap);

  var body = root.getElementById('stw-body');
  root.getElementById('stw-x').onclick = function () { clearInterval(timer); host.remove(); };
  root.getElementById('stw-r').onclick = function () { run(); };

  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  // A school year runs Jul -> Jun. Anything created in July or later belongs
  // to the year that is about to start.
  function schoolYear(d) {
    return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  }

  function fmtDate(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) { h = 12; }
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  async function getJSON(url) {
    var r = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!r.ok) { throw new Error('HTTP ' + r.status + ' on ' + url); }
    return r.json();
  }

  async function getAllPages(base) {
    var out = [], page = 1;
    while (page <= 25) {
      var batch = await getJSON(base + '&per_page=100&page=' + page);
      out = out.concat(batch);
      if (batch.length < 100) { break; }
      page++;
    }
    return out;
  }

  var timer = null;

  async function run() {
    if (!/instructure\.com$/.test(location.hostname)) {
      body.innerHTML = '<div class="state"><div class="big err">Wrong site</div>' +
        '<p class="sub">This reads your Canvas account, so it has to run on ' +
        'esuhsd.instructure.com. Open Canvas and tap the bookmark again.</p></div>';
      return;
    }

    body.innerHTML = '<div class="state"><div class="big">Reading&hellip;</div>' +
      '<p class="sub">Pulling every enrollment record on your account.</p></div>';

    var enr;
    try {
      enr = await getAllPages('/api/v1/users/self/enrollments?state[]=active' +
        '&state[]=invited&state[]=creation_pending&state[]=inactive&state[]=completed');
    } catch (e) {
      body.innerHTML = '<div class="state"><div class="big err">Not signed in</div>' +
        '<p class="sub">Canvas refused the request. Sign in at ' +
        'esuhsd.instructure.com, then run this again. (' + esc(e.message) + ')</p></div>';
      return;
    }

    var now = new Date();
    var thisYear = schoolYear(now);

    // Group by school year, find when each year's roster load started.
    var years = {};
    enr.forEach(function (e) {
      var d = new Date(e.created_at);
      var sy = schoolYear(d);
      if (!years[sy]) { years[sy] = { first: d, rows: [] }; }
      if (d < years[sy].first) { years[sy].first = d; }
      years[sy].rows.push(e);
    });

    var priorKeys = Object.keys(years).map(Number).filter(function (y) {
      return y < thisYear;
    }).sort();

    // Project the earliest and latest historical load date onto this year.
    var days = priorKeys.map(function (y) {
      var f = years[y].first;
      return new Date(now.getFullYear(), f.getMonth(), f.getDate());
    }).sort(function (a, b) { return a - b; });

    var windowText = days.length
      ? fmtDate(days[0]) + ' \u2013 ' + fmtDate(days[days.length - 1])
      : 'unknown';

    var current = years[thisYear] ? years[thisYear].rows : [];
    var html = '';

    if (current.length === 0) {
      html += '<div class="state"><div class="big wait">Not loaded yet</div>' +
        '<p class="sub">Canvas has no ' + thisYear + '\u2013' + ((thisYear + 1) % 100) +
        ' enrollment rows for you. Every past year landed between ' + windowText +
        ', overnight. This page checks again every 10 minutes on its own.</p></div>';
    } else {
      html += '<div class="state"><div class="big live">' + current.length +
        (current.length === 1 ? ' class' : ' classes') + '</div>' +
        '<p class="sub">Loaded ' + fmtDate(years[thisYear].first) + ' at ' +
        fmtTime(years[thisYear].first) + '. Teacher names only show once the ' +
        'course is published, so blanks here are normal for a day or two.</p></div>';
    }

    // Signature: the load history, with this year as an open row.
    html += '<section><div class="lbl">Roster loads</div>';
    priorKeys.forEach(function (y) {
      var f = years[y].first;
      var sameBatch = years[y].rows.filter(function (e) {
        return (new Date(e.created_at) - f) < 3 * 864e5;
      }).length;
      html += '<div class="row"><span class="yr">' + y + '</span>' +
        '<span class="dt">' + fmtDate(f) + '</span>' +
        '<span class="tm">' + fmtTime(f) + '</span>' +
        '<span class="ct">' + sameBatch + ' rows</span></div>';
    });
    if (current.length === 0) {
      html += '<div class="row pending"><span class="yr">' + thisYear + '</span>' +
        '<span class="dt">' + windowText + '</span>' +
        '<span class="tm">expected</span><span class="dot"></span></div>';
    } else {
      var f2 = years[thisYear].first;
      html += '<div class="row"><span class="yr">' + thisYear + '</span>' +
        '<span class="dt">' + fmtDate(f2) + '</span>' +
        '<span class="tm">' + fmtTime(f2) + '</span>' +
        '<span class="ct">' + current.length + ' rows</span></div>';
    }
    html += '</section>';

    body.innerHTML = html + '<section id="stw-list"></section>' +
      '<p class="foot">Last checked ' + fmtTime(now) + ' \u00b7 rechecks every 10 min \u00b7 ' +
      enr.length + ' total enrollment rows on this account</p>';

    if (current.length === 0) { return; }

    // Only now go fetch course and section detail for the new rows.
    var list = root.getElementById('stw-list');
    list.innerHTML = '<div class="lbl">Your classes</div>';

    for (var i = 0; i < current.length; i++) {
      var e = current[i];
      var course = null, section = null;
      try {
        course = await getJSON('/api/v1/courses/' + e.course_id + '?include[]=teachers');
      } catch (x) { /* unpublished courses reject students, expected */ }
      try {
        section = await getJSON('/api/v1/sections/' + e.course_section_id);
      } catch (x) { /* same */ }

      var name = (course && course.name) || (section && section.name) ||
        ('Course ' + e.course_id);
      var teachers = course && course.teachers && course.teachers.length
        ? course.teachers.map(function (t) { return t.display_name; }).join(', ')
        : null;
      var secName = section && section.name ? section.name : null;

      // Districts often bake the period into the section or course name.
      var period = null;
      var probe = (secName || '') + ' ' + name;
      var m = probe.match(/\b(?:per(?:iod)?\.?\s*|p\s*)(\d{1,2})\b/i) ||
              probe.match(/-\s*0?(\d{1,2})\s*$/);
      if (m) { period = m[1]; }

      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = '<div class="cname">' + esc(name) + '</div><dl class="meta">' +
        '<dt>Teacher</dt><dd class="teach">' + (teachers ? esc(teachers) : 'not published yet') + '</dd>' +
        (period ? '<dt>Period</dt><dd>' + esc(period) + '</dd>' : '') +
        '<dt>Section</dt><dd>' + (secName ? esc(secName) : '#' + e.course_section_id) + '</dd>' +
        '<dt>State</dt><dd>' + esc(e.enrollment_state) + '</dd>' +
        '</dl>';
      list.appendChild(card);
    }
  }

  run();
  timer = setInterval(run, 600000);
})();
