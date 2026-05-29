/* ============================================================
   SWEET PAY — Lightweight Math CAPTCHA
   ============================================================ */
(function (global) {
  'use strict';

  const ops = [
    { sym: '+', fn: (a, b) => a + b },
    { sym: '−', fn: (a, b) => a - b },
    { sym: '×', fn: (a, b) => a * b },
  ];

  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function generate() {
    const op = ops[rand(0, 1)]; // only + and − (× sometimes too hard)
    let a = rand(2, 15);
    let b = rand(1, 12);
    if (op.sym === '−' && b > a) { [a, b] = [b, a]; }
    return { a, b, op, answer: op.fn(a, b) };
  }

  /* ── Public factory ── */
  global.SweetCaptcha = function (qId, refreshId) {
    let current = generate();

    const qEl  = document.getElementById(qId);
    const refEl = document.getElementById(refreshId);

    function render() {
      if (!qEl) return;
      qEl.innerHTML =
        `<span class="cq-num">${current.a}</span>` +
        `<span class="cq-op">${current.op.sym}</span>` +
        `<span class="cq-num">${current.b}</span>` +
        `<span class="cq-eq">=</span>` +
        `<span class="cq-mark">?</span>`;
    }

    render();

    if (refEl) {
      refEl.addEventListener('click', () => {
        current = generate();
        render();
        const inputEl = refEl.closest('.captcha-box').querySelector('.captcha-input');
        const errEl   = refEl.closest('.captcha-box').querySelector('.captcha-err');
        if (inputEl) inputEl.value = '';
        if (errEl)   errEl.textContent = '';
      });
    }

    return {
      verify(inputId, errId) {
        const inputEl = document.getElementById(inputId);
        const errEl   = document.getElementById(errId);
        const val     = parseInt(inputEl ? inputEl.value : '', 10);

        if (isNaN(val) || val !== current.answer) {
          if (errEl) errEl.textContent = 'الجواب غير صحيح — حاول مرة أخرى.';
          if (inputEl) { inputEl.value = ''; inputEl.focus(); }
          current = generate();
          render();
          return false;
        }

        if (errEl) errEl.textContent = '';
        return true;
      },
      reset() {
        current = generate();
        render();
        const box = qEl && qEl.closest('.captcha-box');
        if (box) {
          const inp = box.querySelector('.captcha-input');
          const err = box.querySelector('.captcha-err');
          if (inp) inp.value = '';
          if (err) err.textContent = '';
        }
      }
    };
  };

})(window);
