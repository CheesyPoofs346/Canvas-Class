(function () {
  var HOST_ID = 'ic-scan-host';
  var old = document.getElementById(HOST_ID);
  if (old) { old.remove(); }

  if (!/infinitecampus\.org$/.test(location.hostname)) {
    alert('Run this on esuhsd.infinitecampus.org while signed in.');
    return;
  }

  var host = document.createElement('div');
  host.id = HOST_ID;
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = `
  :host{all:initial}
  *{box-sizing:border-box;margin:0;padding:0}
  .wrap{position:fixed;inset:0;z-index:2147483647;background:#121110;color:#f2efe9;
    overflow-y:auto;-webkit-overflow-scrolling:touch;
    font:400 15px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif}
  .in{max-width:660px;margin:0 auto;padding:20px 20px 80px}
  .bar{display:flex;align-items:center;gap:9px;padding-bottom:18px;border-bottom:1px solid #262320}
  .mark{font:500 11px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.2em;
    text-transform:uppercase;color:#8a837a;flex:1}
  button{all:unset;cursor:pointer;font:500 12px/1 ui-monospace,"SF Mono",Menlo,monospace;
    letter-spacing:.05em;color:#cdc6bb;background:#1e1b19;border:1px solid #2f2b27;
    border-radius:7px;padding:10px 14px;box-shadow:inset 0 1px 0 rgba(255,255,255,.045)}
  button:hover{background:#26221f;border-color:#403a34;color:#f2efe9}
  button[disabled]{opacity:.4;cursor:default}
  .lbl{font:500 10px/1 ui-monospace,monospace;letter-spacing:.22em;text-transform:uppercase;
    color:#7b736a;display:flex;align-items:center;gap:14px;margin:0 0 16px}
  .lbl::after{content:"";flex:1;height:1px;background:#262320}
  section{margin-top:40px}
  .grid{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}
  .fld{display:flex;flex-direction:column;gap:6px}
  .fld span{font:400 10px/1 ui-monospace,monospace;letter-spacing:.16em;
    text-transform:uppercase;color:#7b736a}
  input,select{all:unset;background:#1b1917;border:1px solid #2f2b27;border-radius:6px;
    padding:10px 11px;color:#f2efe9;width:98px;
    font:400 13px/1 ui-monospace,"SF Mono",Menlo,monospace}
  select{width:132px}
  input:focus,select:focus{border-color:#4a4238}
  .stat{margin-top:18px;color:#9c948a;
    font:400 12px/1.6 ui-monospace,"SF Mono",Menlo,monospace}
  .track{height:2px;background:#211e1b;margin-top:10px;border-radius:2px;overflow:hidden}
  .fill{height:100%;width:0;background:#cdc6bb;transition:width .18s linear}
  .hit{border:1px solid #2b2723;border-radius:12px;padding:14px;margin-bottom:10px;
    background:linear-gradient(180deg,#1c1917,#181513);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  .hit.same{opacity:.5}
  .h1{display:flex;gap:12px;align-items:baseline;
    font:400 13px/1.3 ui-monospace,"SF Mono",Menlo,monospace}
  .q{color:#f2efe9;flex:1;word-break:break-all}
  .tag{font:600 10px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;
    flex:none;padding:5px 7px;border-radius:4px;background:#2f2a23;color:#e6dcc9}
  .hit.same .tag{background:#242120;color:#8a837a}
  .h2{margin-top:8px;color:#9c948a;
    font:400 12px/1.5 ui-monospace,"SF Mono",Menlo,monospace;word-break:break-word}
  .none{color:#7b736a;font-size:14px;padding:8px 0}
  `;
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = '<div class="in">' +
    '<div class="bar"><span class="mark">IC parameter sweep</span>' +
    '<button id="go">Start</button><button id="stop" disabled>Stop</button>' +
    '<button id="x">Close</button></div>' +

    '<section><div class="lbl">Range</div><div class="grid">' +
    '<label class="fld"><span>Param</span><select id="p">' +
    '<option value="trialID">trialID</option>' +
    '<option value="calendarID">calendarID</option>' +
    '<option value="structureID">structureID</option>' +
    '<option value="endYear">endYear</option>' +
    '</select></label>' +
    '<label class="fld"><span>From</span><input id="a" value="5500"></label>' +
    '<label class="fld"><span>To</span><input id="b" value="5700"></label>' +
    '</div>' +
    '<div class="stat" id="stat">Idle. Baseline not read yet.</div>' +
    '<div class="track"><div class="fill" id="fill"></div></div></section>' +

    '<section><div class="lbl">Hits</div><div id="hits">' +
    '<div class="none">Nothing yet.</div></div>' +
    '<button id="cp" style="margin-top:8px">Copy hits</button></section>' +
    '</div>';
  root.appendChild(wrap);

  var $ = function (id) { return root.getElementById(id); };
  var stop = false, baseline = null, hits = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  var ROSTER = '/campus/resources/portal/roster';

  // The portal serves JSON when asked; without the header it renders a debug page.
  async function roster(qs) {
    var r = await fetch(ROSTER + (qs ? '?' + qs : ''), {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    });
    if (!r.ok) { return { err: 'HTTP ' + r.status }; }
    var txt = await r.text();
    try { return { rows: JSON.parse(txt) }; }
    catch (e) { return { err: 'non-JSON', raw: txt.slice(0, 60) }; }
  }

  // Signature lets us tell a real different result from the endpoint just
  // echoing the current year back because it ignored the value.
  function sig(rows) {
    if (!Array.isArray(rows)) { return 'x'; }
    return rows.length + ':' + rows.map(function (r) { return r.rosterID; }).sort().join(',');
  }

  function summary(rows) {
    if (!Array.isArray(rows) || !rows.length) { return 'empty'; }
    var years = {}, names = [];
    rows.forEach(function (r) {
      if (r.endYear) { years[r.endYear] = true; }
      if (names.length < 4 && r.courseName) { names.push(r.courseName); }
    });
    return rows.length + ' rows · endYear ' + Object.keys(years).join('/') +
      ' · ' + names.join(', ') + (rows.length > 4 ? '…' : '');
  }

  function addHit(h) {
    hits.push(h);
    var box = $('hits');
    if (hits.length === 1) { box.innerHTML = ''; }
    var d = document.createElement('div');
    d.className = 'hit' + (h.same ? ' same' : '');
    d.innerHTML = '<div class="h1"><span class="q">' + esc(h.q) + '</span>' +
      '<span class="tag">' + (h.same ? 'echo' : 'NEW') + '</span></div>' +
      '<div class="h2">' + esc(h.info) + '</div>';
    box.appendChild(d);
  }

  async function pool(items, n, fn) {
    var i = 0, done = 0;
    async function worker() {
      while (i < items.length && !stop) {
        var mine = items[i++];
        try { await fn(mine); } catch (e) { /* keep going */ }
        done++;
        $('fill').style.width = Math.round(done / items.length * 100) + '%';
        $('stat').textContent = 'Scanned ' + done + ' of ' + items.length +
          ' · ' + hits.length + ' hit' + (hits.length === 1 ? '' : 's');
      }
    }
    var ws = [];
    for (var k = 0; k < n; k++) { ws.push(worker()); }
    await Promise.all(ws);
  }

  async function run() {
    stop = false;
    hits = [];
    $('hits').innerHTML = '<div class="none">Nothing yet.</div>';
    $('go').disabled = true;
    $('stop').disabled = false;

    $('stat').textContent = 'Reading baseline…';
    var base = await roster('');
    if (base.err) {
      $('stat').textContent = 'Baseline failed (' + base.err + '). Signed in?';
      $('go').disabled = false; $('stop').disabled = true;
      return;
    }
    baseline = sig(base.rows);
    var baseYears = {};
    (base.rows || []).forEach(function (r) { if (r.endYear) { baseYears[r.endYear] = 1; } });
    $('stat').textContent = 'Baseline: ' + summary(base.rows);

    var p = $('p').value;
    var a = parseInt($('a').value, 10), b = parseInt($('b').value, 10);
    if (isNaN(a) || isNaN(b) || b < a) {
      $('stat').textContent = 'Check the range.';
      $('go').disabled = false; $('stop').disabled = true;
      return;
    }
    if (b - a > 4000) { b = a + 4000; }

    var vals = [];
    for (var v = a; v <= b; v++) { vals.push(v); }

    await pool(vals, 5, async function (v) {
      var qs = p + '=' + v;
      var res = await roster(qs);
      if (res.err || !Array.isArray(res.rows) || !res.rows.length) { return; }
      var s = sig(res.rows);
      var same = (s === baseline);
      // A different signature, or any row from a year we don't already have.
      var newYear = res.rows.some(function (r) { return r.endYear && !baseYears[r.endYear]; });
      addHit({ q: qs, same: same && !newYear, info: summary(res.rows) });
    });

    $('go').disabled = false;
    $('stop').disabled = true;
    $('stat').textContent = (stop ? 'Stopped. ' : 'Done. ') + hits.length +
      ' hit' + (hits.length === 1 ? '' : 's') + ' across ' + vals.length + ' values.';
  }

  $('go').onclick = run;
  $('stop').onclick = function () { stop = true; };
  $('x').onclick = function () { stop = true; host.remove(); };
  $('cp').onclick = function () {
    var t = hits.map(function (h) {
      return (h.same ? '[echo] ' : '[NEW ] ') + h.q + '  ' + h.info;
    }).join('\n') || 'no hits';
    try { navigator.clipboard.writeText(t); this.textContent = 'Copied'; }
    catch (e) { this.textContent = 'Failed'; }
  };
})();
