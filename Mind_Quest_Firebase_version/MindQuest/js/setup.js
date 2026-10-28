/* one-time setup: creates the Teacher & Parent account (and optional sample children) in your Firebase */
(async function () {
  const st = $('#status'), log = t => { $('#log').textContent += t + '\n'; };
  if (!Store.configured) { st.innerHTML = `${ico('info')} <b>Firebase is not set up yet.</b> MindQuest is in demo mode, where the demo accounts already work. Follow SETUP.md step 1-4, paste your Firebase config into <code>js/config.js</code>, then open this page again.`; return; }
  try { await Store.init(); } catch (e) { st.className = 'ai-status warn'; st.textContent = 'Could not load Firebase: ' + e.message; return; }
  st.className = 'ai-status ok'; st.innerHTML = `${ico('check')} Connected to Firebase project <b>${esc(MQ_CONFIG.firebase.projectId)}</b>.`;
  $('#fbSteps').hidden = false;
  $('#sGo').onclick = async () => {
    const b = $('#sGo'); b.disabled = true; $('#log').textContent = '';
    const auth = Store.fb.auth, db = Store.fb.db, mail = u => `${u}@${MQ_DOMAIN}`;
    const enter = async (u, pw) => { try { return (await auth.createUserWithEmailAndPassword(mail(u), pw)).user; } catch (e) { if (/email-already-in-use/.test(e.code)) return (await auth.signInWithEmailAndPassword(mail(u), pw)).user; throw e; } };
    try {
      const kids = [];
      if ($('#sDemo').checked) {
        MQSeed.rng = 7;
        for (const k of MQSeed.KIDS) {
          const u = await enter(k.username, k.password);
          await db.collection('users').doc(u.uid).set({ username: k.username, role: 'child', createdAt: Date.now() });
          await db.collection('children').doc(u.uid).set(MQSeed.profile(k));
          for (const w of MQSeed.weeks(k)) await db.collection('children').doc(u.uid).collection('weeks').doc('w' + w.week).set(JSON.parse(JSON.stringify(w)));
          kids.push({ uid: u.uid, k }); log(`Child ${k.username} ready`);
        }
      }
      await auth.signOut();
      await Store.createStaff($('#sUser').value, $('#sPass').value); log('Teacher & Parent account ready: ' + $('#sUser').value);
      for (const { uid, k } of kids) for (const [i, m] of MQSeed.marks(k).entries()) await db.collection('children').doc(uid).collection('marks').doc('t' + i).set(m);
      if (kids.length) log('Sample marks added');
      log('\nDone! Log in on login.html as ' + $('#sUser').value + '.');
      await auth.signOut();
    } catch (e) { log('Error: ' + (e.message || e.code) + (/permission/i.test(e.message || '') ? '\nCheck that firestore.rules is deployed (SETUP.md step 5).' : '')); }
    b.disabled = false;
  };
})();
