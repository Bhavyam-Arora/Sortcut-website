var WAITLIST_URL = "https://script.google.com/macros/s/AKfycbxIWxBBd9yTzYm4pg9GshCICly0WGcx5SMT6R3K6ZlCecpBzxUDpZYDQVOz8eqQgQjiXw/exec";

(function(){
  var form = document.getElementById("wl-form");
  if (!form) return;
  var btn = document.getElementById("wl-btn"), err = document.getElementById("wl-err"), done = document.getElementById("wl-done");
  var fields = ["first_name", "last_name", "phone", "email"].map(function(n){ return form.elements[n]; });
  var LABEL = btn.textContent, sending = false;

  // the button unlocks once all four fields have something in them; autofill can skip "input", so listen wide
  function filled(){ return fields.every(function(f){ return f.value.trim() !== ""; }); }
  function sync(){ btn.disabled = sending || !filled(); }
  ["input", "change", "keyup"].forEach(function(t){ form.addEventListener(t, sync); });
  window.addEventListener("pageshow", sync);
  sync();

  function fail(){
    sending = false; btn.textContent = LABEL; err.hidden = false; sync();
  }

  form.addEventListener("submit", function(e){
    e.preventDefault();
    if (sending || !filled()) return;
    sending = true; sync(); btn.textContent = "Sending…"; err.hidden = true;

    // a URLSearchParams body is sent as application/x-www-form-urlencoded with no extra headers, so there is no CORS preflight
    var body = new URLSearchParams();
    fields.forEach(function(f){ body.append(f.name, f.value.trim()); });
    body.append("website", form.elements.website.value);

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function(){ ctrl.abort(); }, 20000);
    fetch(WAITLIST_URL, {method: "POST", body: body, signal: ctrl ? ctrl.signal : undefined})
      .then(function(r){ return r.json(); })
      .then(function(data){
        clearTimeout(timer);
        if (!data || data.ok !== true) return fail();
        form.hidden = true; done.hidden = false; done.focus();
      })
      .catch(function(){ clearTimeout(timer); fail(); });
  });
})();
