(function(){
  // copy buttons
  document.querySelectorAll("[data-copy]").forEach(function(b){
    b.addEventListener("click", function(){
      var el = document.getElementById(b.getAttribute("data-copy"));
      var label = b.getAttribute("data-label");
      var done = function(){ b.textContent = "Copied"; setTimeout(function(){ b.textContent = label; }, 1800); };
      var fallback = function(){ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); };
      try { navigator.clipboard.writeText(el.textContent.trim()).then(done, fallback); } catch(e){ fallback(); }
    });
  });

  // interactive sorting demo in the hero mockup
  var grid = document.getElementById("demo-grid");
  if (grid) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll(".tile"));
    var newest = tiles.slice();
    var MODES = {v:"Views", ov:"Outlier score · views", l:"Likes", ol:"Outlier score · likes", c:"Comments", oc:"Outlier score · comments"};
    var MED = {v:9800, l:1100, c:62}, MEDT = {v:"9.8K views", l:"1.1K likes", c:"62 comments"};
    var ICON = {v:'<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z" fill="#fff"/></svg>',
      l:'<svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.5-9A5.3 5.3 0 0112 6a5.3 5.3 0 019.5 6c-2 4.4-9.5 9-9.5 9z" fill="#fff"/></svg>',
      c:'<svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4 21l4.6-2.1c1.1.3 2.2.5 3.4.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3z" fill="#fff"/></svg>'};
    var mode = "ov";
    function base(m){ return m.replace("o", ""); }
    function fmtN(n){ return n >= 1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,"") + "M" : n >= 1e3 ? (n/1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/,"") + "K" : String(n); }
    function metric(t, m){ return +t.dataset[base(m)]; }
    function rankedFor(m){ return tiles.slice().sort(function(a,b){ return metric(b, m) - metric(a, m); }); }
    function paint(m){
      var b = base(m), isO = m.charAt(0) === "o";
      grid.classList.toggle("plain", !isO);
      rankedFor(m).forEach(function(t, i){
        t.dataset.rank = i + 1;
        t.querySelector(".rk").textContent = i + 1;
        var x = metric(t, m) / MED[b];
        t.querySelector(".ox").textContent = (x >= 10 ? Math.round(x) : x.toFixed(1)) + "x";
        t.querySelector(".vw").innerHTML = ICON[b] + fmtN(metric(t, m));
      });
    }
    paint(mode);
    var btn = document.getElementById("demo-sort"), bar = document.getElementById("demo-bar");
    var countEl = document.getElementById("demo-count"), stateEl = document.getElementById("demo-state");
    var chip = document.getElementById("demo-chip"), chipT = document.getElementById("demo-chip-t"), info = document.getElementById("demo-info");
    var segBtns = Array.prototype.slice.call(document.querySelectorAll(".seg button"));
    var depth = 100, running = false, isSorted = false, timers = [];
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var EASE = "cubic-bezier(.22,.8,.24,1)";

    function label(n){ return n >= 1377 ? "All 1,377" : "Top " + n + " of 1,377"; }
    function setCount(done){ countEl.textContent = done.toLocaleString("en-IN") + " of " + (depth >= 1377 ? "1,377" : depth) + " sorted"; }

    function flip(order, dur){
      var first = tiles.map(function(t){ return t.getBoundingClientRect(); });
      order.forEach(function(t){ grid.appendChild(t); });
      tiles.forEach(function(t, i){
        var f = first[i], l = t.getBoundingClientRect();
        t.style.transition = "none";
        t.style.transform = (f.width && l.width) ? "translate(" + (f.left - l.left) + "px," + (f.top - l.top) + "px)" : "";
      });
      void grid.offsetWidth;
      tiles.forEach(function(t){ t.style.transition = "transform " + dur + "ms " + EASE; t.style.transform = ""; });
    }
    function shuffled(){
      var a = tiles.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
      return a;
    }
    function later(fn, ms){ timers.push(setTimeout(fn, ms)); }

    function setUnsortedLabels(){
      chip.className = "chip"; chipT.textContent = "Newest first"; info.textContent = "1,377 posts";
    }
    function finish(){
      tiles.forEach(function(t){ t.style.setProperty("--d", ((+t.dataset.rank - 1) * 70) + "ms"); });
      grid.classList.remove("scanning"); grid.classList.add("sorted");
      chip.className = "chip live"; chipT.textContent = MODES[mode];
      info.textContent = label(depth) + " · median " + MEDT[base(mode)];
      bar.style.width = "100%"; setCount(depth >= 1377 ? 1377 : depth); stateEl.textContent = "Done";
      btn.disabled = false; btn.textContent = "Sort again";
      segBtns.forEach(function(b){ b.disabled = false; });
      running = false; isSorted = true;
    }

    function run(){
      if (running) return;
      running = true; btn.classList.remove("hint"); btn.disabled = true; btn.textContent = "Sorting…";
      segBtns.forEach(function(b){ b.disabled = true; });
      tiles.forEach(function(t){ t.style.setProperty("--d", "0ms"); });
      grid.classList.remove("sorted");
      if (reduce) { rankedFor(mode).forEach(function(t){ grid.appendChild(t); }); finish(); return; }

      var offset = 0;
      if (isSorted) { flip(newest, 380); offset = 420; }
      isSorted = false;
      chip.className = "chip busy"; chipT.textContent = "Sorting…"; info.textContent = "Reading " + label(depth).toLowerCase() + " posts";
      stateEl.textContent = "Scanning";

      var total = 2300, start = null, target = depth >= 1377 ? 1377 : depth;
      later(function(){
        grid.classList.add("scanning");
        function step(ts){
          if (!running) return;
          if (start === null) start = ts;
          var p = Math.min((ts - start) / total, 1);
          var e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          bar.style.width = (e * 100).toFixed(1) + "%";
          setCount(Math.round(e * target));
          if (p < 1 && running) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        flip(shuffled(), 420);
        later(function(){ flip(shuffled(), 420); }, 480);
        later(function(){ flip(shuffled(), 420); }, 960);
        later(function(){ stateEl.textContent = "Ranking"; flip(rankedFor(mode), 820); }, 1450);
        later(finish, 2350);
      }, offset);
    }

    btn.addEventListener("click", run);
    segBtns.forEach(function(b){
      b.addEventListener("click", function(){
        if (running) return;
        segBtns.forEach(function(x){ x.classList.remove("on"); x.removeAttribute("aria-pressed"); });
        b.classList.add("on"); b.setAttribute("aria-pressed", "true");
        depth = +b.dataset.n;
        bar.style.width = "0"; setCount(0); stateEl.textContent = "Ready";
        btn.textContent = "Sort this profile";
        if (isSorted) { info.textContent = "Press sort to re-rank " + label(depth).toLowerCase() + " posts"; }
      });
    });

    // sort-by dropdown
    var dd = document.getElementById("dd"), ddBtn = document.getElementById("dd-btn"), ddLabel = document.getElementById("dd-label");
    var ddOpts = Array.prototype.slice.call(dd.querySelectorAll('[role="option"]'));
    function ddOpen(o){ dd.classList.toggle("open", o); ddBtn.setAttribute("aria-expanded", String(o)); }
    function setMode(m){
      mode = m; ddLabel.textContent = MODES[m];
      ddOpts.forEach(function(o){ if (o.dataset.m === m) o.setAttribute("aria-selected","true"); else o.removeAttribute("aria-selected"); });
      paint(m);
      if (isSorted && !running) {
        tiles.forEach(function(t){ t.style.setProperty("--d", "0ms"); });
        flip(rankedFor(m), 650);
        chipT.textContent = MODES[m]; info.textContent = label(depth) + " · median " + MEDT[base(m)];
      } else if (!running) {
        info.textContent = "Press sort to rank by " + MODES[m].toLowerCase();
      }
    }
    ddBtn.addEventListener("click", function(){ if (!running) ddOpen(!dd.classList.contains("open")); });
    ddOpts.forEach(function(o){ o.addEventListener("click", function(){ setMode(o.dataset.m); ddOpen(false); }); });
    document.addEventListener("click", function(e){ if (!dd.contains(e.target)) ddOpen(false); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") ddOpen(false); });
    setUnsortedLabels(); setCount(0);

    // downloads: Export CSV / Transcribe show a browser-style download bubble
    var dlBtn = document.getElementById("dl-btn"), dlBadge = document.getElementById("dl-badge"), dlPop = document.getElementById("dl-pop");
    var dlIco = document.getElementById("dl-ico"), dlName = document.getElementById("dl-name"), dlStat = document.getElementById("dl-stat"), dlBar = document.getElementById("dl-bar");
    var csvBtn = document.getElementById("demo-csv"), txtBtn = document.getElementById("demo-txt");
    var dlCount = 0, dlTimers = [];
    function download(kind){
      var csv = kind === "csv";
      var name = csv ? "mosseri_top" + (depth >= 1377 ? "1377" : depth) + ".csv" : "reel_C8x2Lk_transcript.txt";
      var size = csv ? (depth >= 1377 ? "138 KB" : Math.round(depth / 10) + " KB") : "2 KB";
      var b = csv ? csvBtn : txtBtn;
      dlTimers.forEach(clearTimeout); dlTimers = [];
      b.classList.add("busy"); b.textContent = csv ? "Exporting…" : "Transcribing…";
      dlIco.textContent = csv ? "CSV" : "TXT"; dlIco.style.background = csv ? "#1D9E5B" : "var(--ig-btn)";
      dlName.textContent = name; dlStat.textContent = csv ? "Downloading…" : "Transcribing reel…";
      dlPop.classList.remove("done"); dlBar.style.transition = "none"; dlBar.style.width = "0";
      void dlPop.offsetWidth; dlPop.classList.add("show");
      var dur = csv ? 1000 : 1500;
      dlTimers.push(setTimeout(function(){ dlBar.style.transition = "width " + dur + "ms cubic-bezier(.22,.8,.24,1)"; dlBar.style.width = "100%"; }, 250));
      dlTimers.push(setTimeout(function(){
        dlPop.classList.add("done"); dlStat.textContent = "Done · " + size;
        dlCount++; dlBadge.textContent = dlCount; dlBtn.classList.add("show");
        dlBtn.classList.remove("bump"); void dlBtn.offsetWidth; dlBtn.classList.add("bump");
        b.classList.remove("busy"); b.textContent = csv ? "Export CSV" : "Transcribe";
      }, 250 + dur));
      dlTimers.push(setTimeout(function(){ dlPop.classList.remove("show"); }, 250 + dur + 1600));
      return 250 + dur + 500;
    }
    csvBtn.addEventListener("click", function(){ download("csv"); });
    txtBtn.addEventListener("click", function(){ download("txt"); });

    // endless tutorial: a cursor works the panel by itself until the viewer takes over
    var cur = document.getElementById("cur"), win = grid.closest(".window");
    var gen = 0, vis = false, idleT = null, userBusy = false;
    function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function tutOk(){ return vis && !document.hidden && !userBusy; }
    function place(el, dur, fx){
      var w = win.getBoundingClientRect(), r = el.getBoundingClientRect();
      cur.style.transition = dur ? "transform " + dur + "ms cubic-bezier(.3,.7,.3,1), opacity .3s" : "opacity .3s";
      cur.style.transform = "translate(" + (r.left - w.left + r.width * (fx || .5) - 3) + "px," + (r.top - w.top + r.height * .55 - 3) + "px)";
    }
    function press(el){ cur.classList.add("down"); el.click(); return wait(180).then(function(){ cur.classList.remove("down"); }); }
    async function tutorial(){
      var last = -1;
      while (true) {
        while (!tutOk() || running) await wait(300);
        var g = ++gen;
        var ok = function(){ return g === gen && tutOk(); };
        var start = segBtns[Math.floor(Math.random() * segBtns.length)];
        place(start, 0); place(segBtns[last < 0 ? 1 : last], 0);
        cur.classList.add("on");
        await wait(500); if (!ok()) continue;
        var i; do { i = Math.floor(Math.random() * segBtns.length); } while (i === last);
        last = i;
        place(segBtns[i], 700); await wait(800); if (!ok()) continue;
        await press(segBtns[i]); await wait(500); if (!ok()) continue;
        place(ddBtn, 600, .88); await wait(700); if (!ok()) continue;
        await press(ddBtn); await wait(420); if (!ok()) { ddOpen(false); continue; }
        var mi; do { mi = Math.floor(Math.random() * ddOpts.length); } while (ddOpts[mi].dataset.m === mode);
        place(ddOpts[mi], 600, .88); await wait(560); if (!ok()) { ddOpen(false); continue; }
        ddOpts[mi].classList.add("hl"); await wait(450); if (!ok()) { ddOpts[mi].classList.remove("hl"); ddOpen(false); continue; }
        await press(ddOpts[mi]); ddOpts[mi].classList.remove("hl"); await wait(500); if (!ok()) continue;
        place(btn, 650); await wait(750); if (!ok()) continue;
        await press(btn);
        while (running) { await wait(100); if (!ok()) break; }
        if (!ok()) continue;
        await wait(900); if (!ok()) continue;
        place(csvBtn, 600); await wait(700); if (!ok()) continue;
        await press(csvBtn); await wait(2200); if (!ok()) continue;
        place(txtBtn, 450); await wait(550); if (!ok()) continue;
        await press(txtBtn); await wait(3200); if (!ok()) continue;
        cur.classList.remove("on"); await wait(1200);
      }
    }
    if (!reduce && "IntersectionObserver" in window) {
      new IntersectionObserver(function(es){ vis = es[0].isIntersecting; if (!vis) cur.classList.remove("on"); }, {threshold:.45}).observe(win);
      win.addEventListener("pointerdown", function(){
        userBusy = true; gen++; cur.classList.remove("on");
        clearTimeout(idleT); idleT = setTimeout(function(){ userBusy = false; }, 7000);
      });
      document.addEventListener("visibilitychange", function(){ if (document.hidden) cur.classList.remove("on"); });
      tutorial();
    }
  }

  // how-it-works mini demos
  (function(){
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    function $(id){ return document.getElementById(id); }
    function pressed(group, btn){ group.forEach(function(b){ b.classList.toggle("on", b === btn); if (b === btn) b.setAttribute("aria-pressed","true"); else b.removeAttribute("aria-pressed"); }); }
    function slideInd(ind, btn){ if (!ind || !btn) return; ind.style.width = btn.offsetWidth + "px"; ind.style.transform = "translateX(" + (btn.offsetLeft - 3) + "px)"; }
    function autoplay(el, steps){
      if (reduce || !el || !("IntersectionObserver" in window)) return;
      var vis = false, i = 0, t = null, started = false;
      function tick(){
        if (vis && !document.hidden) { steps[i][0](); var d = steps[i][1]; i = (i + 1) % steps.length; t = setTimeout(tick, d); }
        else { t = setTimeout(tick, 400); }
      }
      new IntersectionObserver(function(es){
        vis = es[0].isIntersecting;
        if (vis && !started) { started = true; t = setTimeout(tick, 300); }
      }, {threshold:.3}).observe(el);
      el.addEventListener("pointerdown", function(){ if (!started) return; clearTimeout(t); t = setTimeout(tick, 5000); });
    }
    function onView(el, fn){
      if (!el || !("IntersectionObserver" in window)) return;
      var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting){ io.disconnect(); setTimeout(fn, 250); } }); }, {threshold:.55});
      io.observe(el);
    }

    // card 1: open a profile
    var v1 = $("v1");
    if (v1) {
      var P = [
        {h:"fitwithriya", av:"a4", st:[412,"86.2K"], t:["p1","p2","p3","p4","p5","p6"]},
        {h:"chefanaya", av:"a1", st:[268,"41.7K"], t:["p6","p3","p8","p1","p4","p2"]},
        {h:"growwithdev", av:"a5", st:[189,"23.9K"], t:["p2","p7","p5","p4","p3","p6"]}
      ];
      var pills = Array.prototype.slice.call(v1.querySelectorAll(".pills button"));
      var typed = $("v1-typed"), ring = $("v1-ring"), av = $("v1-av"), tx = $("v1-t"), nm = $("v1-name"), stt = $("v1-stats"), g1 = $("v1-grid");
      var cells = Array.prototype.slice.call(g1.children), busy1 = false;
      function load(i){
        if (busy1) return; busy1 = true;
        var p = P[i]; pressed(pills, pills[i]);
        if (reduce){ typed.textContent = p.h; av.className = p.av; nm.textContent = p.h; stt.textContent = p.st[0] + " posts · " + p.st[1] + " followers"; cells.forEach(function(c,k){ c.className = p.t[k]; }); busy1 = false; return; }
        typed.textContent = ""; g1.classList.add("out"); tx.classList.add("skel"); ring.classList.add("loading");
        var k = 0;
        (function type(){
          if (k <= p.h.length){ typed.textContent = p.h.slice(0, k++); setTimeout(type, 42); return; }
          setTimeout(function(){
            ring.classList.remove("loading"); av.className = p.av; tx.classList.remove("skel");
            nm.textContent = p.h;
            var t0 = performance.now();
            (function count(now){
              var q = Math.min((now - t0) / 600, 1), e = 1 - Math.pow(1 - q, 3);
              stt.textContent = Math.round(p.st[0] * e) + " posts · " + p.st[1] + " followers";
              if (q < 1) requestAnimationFrame(count);
            })(t0);
            cells.forEach(function(c,j){ c.className = p.t[j]; c.style.setProperty("--d", (j * 70) + "ms"); });
            void g1.offsetWidth; g1.classList.remove("out");
            setTimeout(function(){ busy1 = false; }, 700);
          }, 450);
        })();
      }
      pills.forEach(function(b){ b.addEventListener("click", function(){ load(+b.dataset.p); }); });
      autoplay(v1, [[function(){ load(0); }, 3600], [function(){ load(1); }, 3600], [function(){ load(2); }, 3600]]);
    }

    // card 2: rank by a metric
    var v2 = $("v2");
    if (v2) {
      var R = [
        {id:"C8x2Lk", sw:"p1", v:1400000, l:61000, c:640},
        {id:"C7mQ9a", sw:"p2", v:598000, l:88000, c:1900},
        {id:"C9bT4e", sw:"p3", v:372000, l:24000, c:3400},
        {id:"C6vR1p", sw:"p4", v:235000, l:41000, c:410},
        {id:"C5kW8n", sw:"p5", v:118000, l:9800, c:1200}
      ];
      var MED = 9800, ROW = 38;
      var names = {v:"views", o:"outlier score", l:"likes", c:"comments"};
      function fmt(n){ return n >= 1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,"") + "M" : n >= 1e3 ? (n/1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/,"") + "K" : String(n); }
      function val(r, m){ return m === "o" ? r.v / MED : r[m === "v" ? "v" : m]; }
      function lab(r, m){ return m === "o" ? Math.round(r.v / MED) + "x" : fmt(val(r, m)); }
      var rankEl = $("v2-rank"), note = $("v2-note"), ind2 = $("v2-ind");
      var mbtns = Array.prototype.slice.call(v2.querySelectorAll(".mseg button"));
      R.forEach(function(r){
        var row = document.createElement("div"); row.className = "rrow";
        row.innerHTML = '<span class="rn"></span><i class="sw ' + r.sw + '"></i><span class="rt"><span class="rb"></span></span><span class="rv"></span>';
        r.el = row; rankEl.appendChild(row);
      });
      function apply(m, grow){
        var max = Math.max.apply(null, R.map(function(r){ return val(r, m); }));
        var order = R.slice().sort(function(a,b){ return val(b, m) - val(a, m); });
        order.forEach(function(r, i){
          r.el.style.transform = "translateY(" + (i * ROW) + "px)";
          r.el.querySelector(".rn").textContent = i + 1;
          r.el.classList.toggle("lead", i === 0 || m === "o" && i < 2);
          var bar = r.el.querySelector(".rb"), target = Math.max(4, val(r, m) / max * 100);
          if (grow && !reduce){ bar.style.transition = "none"; bar.style.width = "0"; void bar.offsetWidth; bar.style.transition = ""; bar.style.transitionDelay = (i * 80) + "ms"; }
          else bar.style.transitionDelay = "0ms";
          bar.style.width = target + "%";
          var rv = r.el.querySelector(".rv"), endTxt = lab(r, m);
          if (reduce){ rv.textContent = endTxt; return; }
          var endVal = val(r, m), t0 = performance.now();
          (function count(now){
            var q = Math.min((now - t0) / 700, 1), e = 1 - Math.pow(1 - q, 3);
            rv.textContent = q < 1 ? (m === "o" ? Math.round(endVal * e) + "x" : fmt(Math.round(endVal * e))) : endTxt;
            if (q < 1) requestAnimationFrame(count);
          })(t0);
        });
        rankEl.querySelectorAll(".rrow").forEach(function(row){ row.style.zIndex = ""; });
        note.textContent = "Ranked by " + names[m] + " · top 5 reels";
      }
      mbtns.forEach(function(b){ b.addEventListener("click", function(){ pressed(mbtns, b); slideInd(ind2, b); apply(b.dataset.m, false); }); });
      apply("v", false);
      requestAnimationFrame(function(){ slideInd(ind2, mbtns[0]); });
      window.addEventListener("resize", function(){ slideInd(ind2, v2.querySelector(".mseg button.on")); slideInd($("v3-ind"), document.querySelector("#v3 .mseg button.on")); });
      function pick(i, grow){ var b = mbtns[i]; pressed(mbtns, b); slideInd(ind2, b); apply(b.dataset.m, grow); }
      autoplay(v2, [[function(){ pick(0, true); }, 2800], [function(){ pick(1); }, 2600], [function(){ pick(2); }, 2600], [function(){ pick(3); }, 2600]]);
    }

    // card 3: export or transcribe
    var v3 = $("v3");
    if (v3) {
      var tbtns = Array.prototype.slice.call(v3.querySelectorAll(".mseg button")), ind3 = $("v3-ind");
      var csv = $("v3-csv"), txt = $("v3-txt"), csvBar = $("v3-csv-bar"), csvS = $("v3-csv-s"), sheet = $("v3-sheet");
      var wave = $("v3-wave"), line = $("v3-line"), txtS = $("v3-txt-s"), busy3 = false;
      var LINE = line.textContent;
      var hs = [30,55,80,45,95,60,35,70,100,50,40,85,65,30,75,90,45,60,35,80,55,95,40,70,50,30,65,45];
      hs.forEach(function(h, i){ var b = document.createElement("i"); b.style.setProperty("--h", h + "%"); b.style.setProperty("--wd", (i % 7) * -0.09 + "s"); wave.appendChild(b); });
      var rows = Array.prototype.slice.call(sheet.querySelectorAll(".sr:not(.sh)"));
      function runCsv(){
        if (reduce){ csvBar.style.width = "100%"; csvS.textContent = "100 rows · saved"; return; }
        busy3 = true; sheet.classList.add("out"); var t0 = performance.now();
        (function step(now){
          var q = Math.min((now - t0) / 1000, 1), e = q < .5 ? 2*q*q : 1 - Math.pow(-2*q + 2, 2) / 2;
          csvBar.style.width = (e * 100) + "%"; csvS.textContent = q < 1 ? "Exporting " + Math.round(e * 100) + " of 100 rows" : "100 rows · saved";
          if (q < 1) { requestAnimationFrame(step); return; }
          rows.forEach(function(r, i){ r.style.setProperty("--d", (i * 90) + "ms"); });
          void sheet.offsetWidth; sheet.classList.remove("out");
          setTimeout(function(){ busy3 = false; }, 500);
        })(t0);
      }
      function runTxt(){
        if (reduce){ line.textContent = LINE; return; }
        busy3 = true; line.textContent = ""; line.classList.add("typing"); wave.classList.add("live"); txtS.textContent = "Transcribing 0:48 reel…";
        setTimeout(function(){
          wave.classList.remove("live"); txtS.textContent = "Hindi → Hinglish · 0:48";
          var k = 0;
          (function type(){
            if (k <= LINE.length){ line.textContent = LINE.slice(0, k); k += 2; setTimeout(type, 24); return; }
            line.textContent = LINE; line.classList.remove("typing"); busy3 = false;
          })();
        }, 1100);
      }
      function show(t, play){
        if (busy3) return;
        var b = tbtns[t === "csv" ? 0 : 1]; pressed(tbtns, b); slideInd(ind3, b);
        csv.hidden = t !== "csv"; txt.hidden = t !== "txt";
        if (play) (t === "csv" ? runCsv : runTxt)();
      }
      tbtns.forEach(function(b){ b.addEventListener("click", function(){ show(b.dataset.t, true); }); });
      requestAnimationFrame(function(){ slideInd(ind3, tbtns[0]); });
      autoplay(v3, [[function(){ show("csv", true); }, 4200], [function(){ show("txt", true); }, 5600]]);
    }
  })();

  // features: outlier bars grow once on scroll, transcripts type in a loop
  (function(){
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var oc = document.getElementById("oc");
    if (oc && !reduce && "IntersectionObserver" in window) {
      var rows = Array.prototype.slice.call(oc.querySelectorAll(".chart-row"));
      var data = rows.map(function(r, i){
        var f = r.querySelector(".cbar"), v = r.querySelector(".val");
        var d = {f:f, v:v, w:f.style.width, txt:v.textContent, num:parseFloat(v.textContent), dec:/\./.test(v.textContent) ? 1 : 0, i:i};
        f.style.transition = "none"; f.style.width = "0"; v.textContent = "0x";
        return d;
      });
      void oc.offsetWidth;
      var io = new IntersectionObserver(function(es){
        if (!es[0].isIntersecting) return;
        io.disconnect();
        data.forEach(function(d){
          d.f.style.transition = ""; d.f.style.setProperty("--d", (d.i * 160) + "ms"); d.f.style.width = d.w;
          setTimeout(function(){
            var t0 = performance.now();
            (function count(now){
              var q = Math.min((now - t0) / 1200, 1), e = 1 - Math.pow(1 - q, 3);
              d.v.textContent = q < 1 ? (d.num * e).toFixed(d.dec) + "x" : d.txt;
              if (q < 1) requestAnimationFrame(count);
            })(t0);
          }, d.i * 160);
        });
      }, {threshold:.5});
      io.observe(oc);
    }

    var tb = document.getElementById("tx-b");
    if (tb && !reduce) {
      var T = [
        {f:"reel_C8x2Lk_transcript.txt", l:"Hindi → Hinglish", m:"# Posted 14 Aug 2026 · 0:48", t:"Agar tum roz gym jaate ho aur fir bhi result nahi aa raha, toh problem workout nahi hai. Problem hai tumhari sleep..."},
        {f:"reel_D1pQ7v_transcript.txt", l:"English", m:"# Posted 2 Sep 2026 · 0:36", t:"Stop posting every single day. Post three times a week, and make every reel answer one question your audience is already searching for..."},
        {f:"reel_C9tN3m_transcript.txt", l:"Hindi → Hinglish", m:"# Posted 21 Jul 2026 · 0:52", t:"Ye ek galti 90% log karte hain jab wo pehli baar investing start karte hain. Wo pehle stock dhundhte hain, goal nahi..."}
      ];
      var ef = document.getElementById("tx-f"), el = document.getElementById("tx-l"), em = document.getElementById("tx-m"), et = document.getElementById("tx-t");
      var idx = 0, vis = false, started = false;
      function wait(ms, fn){ setTimeout(function step(){ if (document.hidden || !vis) { setTimeout(step, 300); return; } fn(); }, ms); }
      function play(){
        var x = T[idx];
        ef.textContent = x.f; el.textContent = x.l; em.textContent = x.m;
        et.textContent = ""; et.classList.add("typing"); tb.classList.remove("fade");
        var k = 0;
        (function type(){
          if (k < x.t.length) { k = Math.min(x.t.length, k + (Math.random() < .3 ? 2 : 1)); et.textContent = x.t.slice(0, k); wait(26 + Math.random() * 30, type); return; }
          wait(2200, function(){
            et.classList.remove("typing"); tb.classList.add("fade");
            wait(400, function(){ idx = (idx + 1) % T.length; play(); });
          });
        })();
      }
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function(es){
          vis = es[0].isIntersecting;
          if (vis && !started) { started = true; play(); }
        }, {threshold:.3}).observe(tb);
      }
    }
  })();

  // pricing: Monthly / Yearly switch on the Pro card (works on every copy of the cards)
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest(".bill [data-b]");
    if (!b) return;
    var plan = b.closest(".plan");
    plan.setAttribute("data-billing", b.dataset.b);
    plan.querySelectorAll(".bill [data-b]").forEach(function(x){ x.setAttribute("aria-pressed", String(x === b)); });
  });
})();
