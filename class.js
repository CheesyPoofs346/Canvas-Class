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

  .card{border:1px solid #272d3a;border-radius:10px;padding:15px 16px;margin-top:10px;background:#191d27}
  .chead{display:flex;align-items:baseline;gap:13px}
  .per{
    font:700 15px/1 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace;
    color:#e2a13f;flex:none;min-width:3ch
  }
  .cname{font-size:16px;font-weight:600;line-height:1.3}
  .teach{margin:7px 0 0 calc(3ch + 13px);color:#57c9a5;
    font:400 13px/1.3 ui-monospace,"SF Mono","Roboto Mono",Menlo,monospace}

  .cap{margin-top:12px;color:#5f6879;font-size:13px}
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

  // ESUHSD names sections "TITLE - CODE - SURNAME - Period 0X".
  // The period chunk is the anchor; the teacher is whatever sits before it.
  function parseSection(raw) {
    var out = { title: raw || '', teacher: null, period: null };
    if (!raw) { return out; }
    var parts = raw.split(/\s+-\s+/);
    var isName = function (s) { return /^[A-Za-z][A-Za-z'\u2019\-. ]*$/.test(s.trim()); };
    var pIdx = -1, m, i;

    for (i = 0; i < parts.length; i++) {
      m = parts[i].match(/^per(?:iod)?\.?\s*0*(\d{1,2})$/i);
      if (m) { pIdx = i; out.period = parseInt(m[1], 10); break; }
    }
    // Some sections just end in a bare section number, e.g. "... - NGUYEN - 02".
    if (pIdx === -1 && parts.length > 1 && /^0*\d{1,2}$/.test(parts[parts.length - 1])) {
      pIdx = parts.length - 1;
      out.period = parseInt(parts[pIdx], 10);
    }

    if (pIdx > 0 && isName(parts[pIdx - 1])) {
      out.teacher = parts[pIdx - 1].trim();
      out.title = parts.slice(0, pIdx - 1).join(' - ');
    } else if (pIdx > 0) {
      out.title = parts.slice(0, pIdx).join(' - ');
    } else if (parts.length > 1 && isName(parts[parts.length - 1])) {
      out.teacher = parts[parts.length - 1].trim();
      out.title = parts.slice(0, -1).join(' - ');
    }
    if (!out.title) { out.title = raw; }
    // Drop the district course code chunk, e.g. "Y4000XX", "S2210XX".
    out.title = out.title.split(/\s+-\s+/).filter(function (s) {
      return !/^[A-Z]{1,2}\d{3,}[A-Z]*$/.test(s.trim());
    }).join(' - ') || out.title;
    return out;
  }

  function fmtTime(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) { h = 12; }
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap;
  }

  function cardHTML(r) {
    return '<div class="card"><div class="chead">' +
      '<span class="per">' + (r.period != null ? ('P' + r.period) : '\u2014') + '</span>' +
      '<span class="cname">' + esc(r.title || 'Untitled') + '</span></div>' +
      '<div class="teach">' + (r.teacher ? esc(r.teacher) : 'teacher unknown') + '</div>' +
      '</div>';
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
      '<section id="stw-probe"></section>' +
      '<p class="foot">Last checked ' + fmtTime(now) + ' \u00b7 rechecks every 10 min</p>';

    // Preview: newest enrollment on the account, rendered exactly the way a
    // real class will be, so the layout and parser are both visible early.
    var probe = root.getElementById('stw-probe');
    var newest = enr.slice().sort(function (a, b) { return b.id - a.id; })[0];
    if (newest) {
      var pSec = null;
      try {
        pSec = await getJSON('/api/v1/sections/' + newest.course_section_id);
      } catch (x) { /* ignore */ }
      var pp = parseSection(pSec && pSec.name);
      probe.innerHTML = '<div class="lbl">Preview</div>' +
        cardHTML({
          title: pp.title,
          teacher: pp.teacher,
          period: pp.period,
          raw: pSec && pSec.name
        }) +
        '<p class="cap">Your most recent class, drawn the way senior year will be.</p>';
    }

    if (current.length === 0) { return; }

    // Section names carry teacher and period and are readable even when the
    // course itself is still unpublished, so lead with those.
    var list = root.getElementById('stw-list');
    list.innerHTML = '<div class="lbl">Loading detail\u2026</div>';

    var rows = [];
    for (var i = 0; i < current.length; i++) {
      var e = current[i];
      var section = null, course = null;
      try {
        section = await getJSON('/api/v1/sections/' + e.course_section_id);
      } catch (x) { /* rare, section reads are usually allowed */ }
      try {
        course = await getJSON('/api/v1/courses/' + e.course_id);
      } catch (x) { /* unpublished courses reject students, expected */ }

      var p = parseSection(section && section.name);
      rows.push({
        enr: e,
        raw: (section && section.name) || null,
        title: p.title || (course && course.name) || ('Course ' + e.course_id),
        teacher: p.teacher,
        period: p.period
      });
    }

    rows.sort(function (a, b) {
      if (a.period == null && b.period == null) { return 0; }
      if (a.period == null) { return 1; }
      if (b.period == null) { return -1; }
      return a.period - b.period;
    });

    list.innerHTML = '<div class="lbl">Your classes</div>' +
      rows.map(cardHTML).join('');
  }

  run();
  timer = setInterval(run, 600000);
})();
