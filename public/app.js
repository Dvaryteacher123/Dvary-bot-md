'use strict';

(function () {
  var $ = function (id) { return document.getElementById(id); };

  var form = $('pairForm'), phoneEl = $('phone'), goBtn = $('go'), errEl = $('error');
  var formCard = $('formCard'), codeCard = $('codeCard');
  var codeEl = $('code'), copyBtn = $('copy'), timerEl = $('timer'), statusEl = $('status'), againBtn = $('again');

  var tick = null, poll = null, sessionId = null, deadline = 0;

  function showError(msg) { errEl.textContent = msg; errEl.hidden = false; }
  function clearError() { errEl.hidden = true; errEl.textContent = ''; }

  function stopTimers() {
    if (tick) clearInterval(tick);
    if (poll) clearInterval(poll);
    tick = poll = null;
  }

  function fmt(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function startCountdown(seconds) {
    deadline = Date.now() + seconds * 1000;
    function update() {
      var left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      timerEl.textContent = left > 0 ? '⏱️ ' + fmt(left) : 'Imeisha';
      if (left <= 0) {
        stopTimers();
        statusEl.textContent = '⌛ Code imekwisha muda. Omba mpya.';
        statusEl.className = 'status';
        againBtn.hidden = false;
      }
    }
    update();
    tick = setInterval(update, 1000);
  }

  function startPolling() {
    poll = setInterval(function () {
      if (!sessionId) return;
      fetch('/api/status/' + encodeURIComponent(sessionId))
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.connected) {
            stopTimers();
            statusEl.textContent = '✅ Umeunganishwa! Bot yako iko tayari. Tuma .menu kwenye WhatsApp.';
            statusEl.className = 'status ok';
            timerEl.textContent = '';
            againBtn.hidden = true;
          }
        })
        .catch(function () { /* try again on the next tick */ });
    }, 3000);
  }

  function reset() {
    stopTimers();
    sessionId = null;
    codeCard.hidden = true;
    formCard.hidden = false;
    againBtn.hidden = true;
    statusEl.textContent = '⏳ Inasubiri uingize code kwenye WhatsApp...';
    statusEl.className = 'status';
    goBtn.disabled = false;
    goBtn.textContent = 'Pata Pair Code';
    phoneEl.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var phone = phoneEl.value.replace(/\D/g, '');
    if (phone.length < 8 || phone.length > 15) {
      showError('Namba si sahihi. Tumia code ya nchi, bila + . Mfano: 255712345678');
      return;
    }

    goBtn.disabled = true;
    goBtn.textContent = '⏳ Inatengeneza code... (hadi sekunde 45)';

    fetch('/api/pair', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.success) {
          showError((res.j && res.j.message) || 'Imeshindikana. Jaribu tena.');
          goBtn.disabled = false;
          goBtn.textContent = 'Pata Pair Code';
          return;
        }
        sessionId = res.j.sessionId;
        codeEl.textContent = res.j.code;
        formCard.hidden = true;
        codeCard.hidden = false;
        startCountdown(res.j.expiresIn || 120);
        startPolling();
      })
      .catch(function () {
        showError('Hakuna mtandao au server haipatikani. Jaribu tena.');
        goBtn.disabled = false;
        goBtn.textContent = 'Pata Pair Code';
      });
  });

  copyBtn.addEventListener('click', function () {
    var text = codeEl.textContent.trim();
    function done() {
      copyBtn.textContent = '✅ Imenakiliwa';
      setTimeout(function () { copyBtn.textContent = '📋 Copy Code'; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallback);
    } else {
      fallback();
    }
    function fallback() {
      var r = document.createRange();
      r.selectNodeContents(codeEl);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      try { document.execCommand('copy'); done(); } catch (_) {}
    }
  });

  againBtn.addEventListener('click', reset);
})();
