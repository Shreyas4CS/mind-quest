/* login and sign-up page */
(async function () {
  $$('.pt-ic').forEach(n => n.innerHTML = ico(n.dataset.i));
  $('.auth-mascot').innerHTML = MASCOT;
  ['mars', 'ocean', 'jungle', 'arctic', 'kingdom', 'cyber'].forEach((w, i) => { $('.orbit .w' + (i + 1)).innerHTML = worldSvg(w); });
  $$('.pw-eye').forEach(b => { b.innerHTML = ico('eye'); b.onclick = () => { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; }; });
  $('#loginForm button[type=submit]').innerHTML = `${ico('rocket')} Let’s go!`;
  $('#signupForm button[type=submit]').innerHTML = `${ico('sparkle')} Create my account`;
  const show = t => { $$('.tab').forEach(b => { b.classList.toggle('on', b.dataset.tab === t); b.setAttribute('aria-selected', b.dataset.tab === t); }); $('#loginForm').hidden = t !== 'login'; $('#signupForm').hidden = t !== 'signup'; };
  $$('.tab').forEach(b => b.onclick = () => show(b.dataset.tab));
  if (location.hash === '#signup') show('signup');

  try { await Store.init(); } catch (e) { $('#loginForm .form-err').textContent = 'Could not reach Firebase: ' + e.message; return; }
  const u = Store.current(); if (u) { location.href = u.role === 'staff' ? 'staff.html' : 'child.html'; return; }
  if (Store.mode === 'local') {
    $('#demoBox').hidden = false;
    $('#demoBox').innerHTML = `<b>${ico('key')} Demo accounts (this browser only)</b>
      <div class="demo-acc"><span>Teacher &amp; parent</span><code>teacher.demo</code><code>CognoSpace@2026</code><button type="button" data-u="teacher.demo" data-p="CognoSpace@2026">Use</button></div>
      <div class="demo-acc"><span>Sample child (Riya)</span><code>riya.demo</code><code>Riya@2026</code><button type="button" data-u="riya.demo" data-p="Riya@2026">Use</button></div>
      <small>Firebase is not set up yet, so everything is saved in this browser. See SETUP.md to go live.</small>`;
    $$('#demoBox button').forEach(b => b.onclick = () => { show('login'); $('#loginForm [name=username]').value = b.dataset.u; $('#loginForm [name=password]').value = b.dataset.p; $('#loginForm').requestSubmit(); });
  }
  const busy = (f, on) => { const b = $('button[type=submit]', f); b.disabled = on; b.classList.toggle('busy', on); };
  $('#loginForm').onsubmit = async e => {
    e.preventDefault(); const f = e.target, err = $('.form-err', f); err.textContent = ''; busy(f, true);
    try { const u = await Store.signIn(f.username.value, f.password.value); Sfx.good(); location.href = u.role === 'staff' ? 'staff.html' : 'child.html'; }
    catch (x) { err.textContent = x.message; Sfx.soft(); } finally { busy(f, false); }
  };
  $('#signupForm').onsubmit = async e => {
    e.preventDefault(); const f = e.target, err = $('.form-err', f); err.textContent = '';
    if (f.password.value !== f.password2.value) { err.textContent = 'The two passwords are different. Please type them again.'; return; }
    busy(f, true);
    try { await Store.signUp(f.username.value, f.password.value); Sfx.win(); location.href = 'child.html#profile'; }
    catch (x) { err.textContent = x.message; Sfx.soft(); } finally { busy(f, false); }
  };
})();
