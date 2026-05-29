/* ============================================================
   SWEET PAY — Auth Logic
   ============================================================ */
(function () {
  'use strict';

  /* ── Password hash ── */
  async function hashPw(pw) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ── Generate unique 8-digit ID ── */
  function genId(existingUsers) {
    let id;
    do {
      id = String(Math.floor(10000000 + Math.random() * 90000000));
    } while (existingUsers.some(u => u.id === id));
    return id;
  }

  /* ── Storage helpers ── */
  function getUsers() { return JSON.parse(localStorage.getItem('sp_users') || '[]'); }
  function saveUsers(u) { localStorage.setItem('sp_users', JSON.stringify(u)); }

  function getSession() { return JSON.parse(localStorage.getItem('sp_session') || 'null'); }
  function saveSession(data, remember) {
    localStorage.setItem('sp_session', JSON.stringify({ ...data, remember }));
  }

  /* ── Redirect if already logged in ── */
  const session = getSession();
  const page = location.pathname.split('/').pop();
  if (session && (page === 'login.html' || page === 'register.html' || page === '')) {
    location.href = 'card.html';
    return;
  }

  /* ── Eye toggle ── */
  document.querySelectorAll('.af-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.style.color = inp.type === 'text' ? 'var(--gold)' : '';
    });
  });

  /* ── Password strength ── */
  const pwInput = document.getElementById('password');
  const pwBar   = document.getElementById('pw-bar');
  const pwFill  = document.getElementById('pw-fill');
  const pwLabel = document.getElementById('pw-label');
  if (pwInput && pwBar) {
    pwInput.addEventListener('input', () => {
      const v = pwInput.value;
      pwBar.hidden  = v.length === 0;
      if (pwLabel) pwLabel.hidden = v.length === 0;
      let score = 0;
      if (v.length >= 8)       score++;
      if (/[A-Z]/.test(v))     score++;
      if (/[0-9]/.test(v))     score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;
      const lvls = [
        { w:'20%', bg:'#ef4444', txt:'Weak',   color:'#ef4444' },
        { w:'50%', bg:'#f59e0b', txt:'Fair',   color:'#f59e0b' },
        { w:'75%', bg:'#3b82f6', txt:'Good',   color:'#3b82f6' },
        { w:'100%',bg:'#10b981', txt:'Strong', color:'#10b981' },
      ];
      const lvl = lvls[Math.max(0, score - 1)];
      if (pwFill) { pwFill.style.width = lvl.w; pwFill.style.background = lvl.bg; }
      if (pwLabel){ pwLabel.textContent = lvl.txt; pwLabel.style.color = lvl.color; }
    });
  }

  /* ── Field helpers ── */
  function markErr(wrapId, errId, msg) {
    const w = document.getElementById(wrapId); if (w) w.classList.add('has-error');
    const e = document.getElementById(errId);  if (e) e.textContent = msg;
  }
  function clearErr(wrapId, errId) {
    const w = document.getElementById(wrapId); if (w) w.classList.remove('has-error');
    const e = document.getElementById(errId);  if (e) e.textContent = '';
  }
  function showGlobal(msg) {
    const el = document.getElementById('global-err');
    if (!el) return;
    el.textContent = msg; el.classList.add('visible');
  }
  function hideGlobal() {
    const el = document.getElementById('global-err');
    if (el) el.classList.remove('visible');
  }
  function setLoading(on) {
    const btn = document.getElementById('submit-btn');
    const txt = document.getElementById('btn-text');
    const ldr = document.getElementById('btn-loader');
    if (!btn) return;
    btn.disabled = on;
    if (txt) txt.hidden = on;
    if (ldr) ldr.hidden = !on;
  }

  /* ── Card number generator ── */
  function genCard() {
    return Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(' ');
  }

  /* ══════════════ LOGIN ══════════════ */
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const email    = document.getElementById('email').value.trim().toLowerCase();
      const pw       = document.getElementById('password').value;
      const remember = document.getElementById('remember')?.checked ?? false;

      clearErr('email-wrap','email-err');
      clearErr('pass-wrap','pass-err');
      hideGlobal();

      let ok = true;
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        markErr('email-wrap','email-err','Enter a valid email address.'); ok = false;
      }
      if (!pw) { markErr('pass-wrap','pass-err','Password is required.'); ok = false; }
      if (!ok) return;

      setLoading(true);
      await new Promise(r => setTimeout(r, 850));

      const hash  = await hashPw(pw);
      const users = getUsers();
      const user  = users.find(u => u.email === email && u.hash === hash);
      setLoading(false);

      if (!user) {
        showGlobal('Incorrect email or password. Please try again.');
        markErr('email-wrap','email-err',' ');
        markErr('pass-wrap','pass-err',' ');
        return;
      }

      saveSession({
        id: user.id, name: user.name, email: user.email,
        cardNum: user.cardNum, cardActivated: user.cardActivated
      }, remember);
      location.href = 'card.html';
    });
  }

  /* ══════════════ REGISTER ══════════════ */
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name    = document.getElementById('name').value.trim();
      const email   = document.getElementById('email').value.trim().toLowerCase();
      const pw      = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;
      const terms   = document.getElementById('terms')?.checked ?? false;

      ['name-wrap','email-wrap','pass-wrap','confirm-wrap'].forEach(id => {
        const w = document.getElementById(id); if (w) w.classList.remove('has-error');
      });
      ['name-err','email-err','pass-err','confirm-err','terms-err'].forEach(id => {
        const el = document.getElementById(id); if (el) el.textContent = '';
      });
      hideGlobal();

      let ok = true;
      if (!name || name.length < 2)  { markErr('name-wrap','name-err','Please enter your full name.'); ok = false; }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { markErr('email-wrap','email-err','Enter a valid email address.'); ok = false; }
      if (!pw || pw.length < 8)      { markErr('pass-wrap','pass-err','Password must be at least 8 characters.'); ok = false; }
      if (pw !== confirm)            { markErr('confirm-wrap','confirm-err','Passwords do not match.'); ok = false; }
      if (!terms) {
        const el = document.getElementById('terms-err');
        if (el) el.textContent = 'You must accept the terms to continue.'; ok = false;
      }
      if (!ok) return;

      const users = getUsers();
      if (users.find(u => u.email === email)) {
        showGlobal('An account with this email already exists.');
        markErr('email-wrap','email-err',' '); return;
      }

      setLoading(true);
      await new Promise(r => setTimeout(r, 1000));

      const hash    = await hashPw(pw);
      const cardNum = genCard();
      const id      = genId(users);
      users.push({ id, name, email, hash, cardNum, cardActivated: false, createdAt: Date.now() });
      saveUsers(users);
      saveSession({ id, name, email, cardNum, cardActivated: false }, true);
      setLoading(false);
      location.href = 'card.html';
    });
  }

})();
