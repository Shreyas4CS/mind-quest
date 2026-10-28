/* ================================================================
   Store: accounts and data.
   - Firebase mode (js/config.js filled in): Firebase Authentication for logins (passwords are
     stored and checked by Firebase, never by this code) and Cloud Firestore for data.
   - Demo mode (config not filled in): the same functions, kept in this browser's localStorage,
     with demo accounts and sample children ready.
   Usernames become hidden e-mails (riya.k -> riya.k@users.mindquest.app) because Firebase
   e-mail/password sign-in needs an e-mail; children never see or need one.
   ================================================================ */
const MQ_DOMAIN = 'users.mindquest.app';
const FB_VER = '10.12.2';
const USERNAME_RE = /^[a-z0-9][a-z0-9._]{2,19}$/;

const Store = {
  mode: 'local', ready: null, user: null, fb: null,
  get configured() { const c = (window.MQ_CONFIG || {}).firebase || {}; return !!c.apiKey && !/^PASTE_/.test(c.apiKey); },
  isStaffName(u) { return ((window.MQ_CONFIG || {}).staffUsernames || []).includes(String(u).toLowerCase()); },
  cleanName(u) { return String(u || '').trim().toLowerCase(); },

  init() {
    if (this.ready) return this.ready;
    this.mode = this.configured ? 'firebase' : 'local';
    this.ready = this.mode === 'firebase' ? this.fbInit() : this.localInit();
    return this.ready;
  },
  current() { return this.user; },

  /* ======================= Firebase ======================= */
  async fbInit() {
    const base = `https://www.gstatic.com/firebasejs/${FB_VER}/`;
    for (const f of ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js']) await loadScript(base + f);
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(MQ_CONFIG.firebase);
    this.fb = { auth: firebase.auth(app), db: firebase.firestore(app) };
    await new Promise(res => { const off = this.fb.auth.onAuthStateChanged(async u => { off(); this.user = u ? await this.fbProfile(u) : null; res(); }); });
  },
  async fbProfile(u) {
    const username = u.email.split('@')[0], ref = this.fb.db.collection('users').doc(u.uid);
    let snap = await ref.get();
    if (!snap.exists) { await ref.set({ username, role: this.isStaffName(username) ? 'staff' : 'child', createdAt: Date.now() }); snap = await ref.get(); }
    const d = snap.data();
    let displayName = username;
    if (d.role === 'child') { const c = await this.fb.db.collection('children').doc(u.uid).get(); if (c.exists && c.data().name) displayName = c.data().name; }
    else displayName = d.displayName || 'Teacher & Parent';
    return { uid: u.uid, username, role: d.role, displayName };
  },
  fbErr(e) {
    const c = (e && e.code) || '';
    if (/user-not-found|wrong-password|invalid-credential|invalid-login/.test(c)) return 'That username and password do not match. Please try again.';
    if (/email-already-in-use/.test(c)) return 'That username is taken. Try adding a number, like riya.k2.';
    if (/weak-password/.test(c)) return 'Please choose a longer password (at least 6 characters).';
    if (/too-many-requests/.test(c)) return 'Too many tries. Please wait a minute and try again.';
    if (/network/.test(c)) return 'No internet connection. Please check and try again.';
    if (/operation-not-allowed/.test(c)) return 'Username login is not switched on yet: in Firebase console > Authentication, enable Email/Password.';
    return (e && e.message) || 'Something went wrong.';
  },

  /* ======================= Demo (this browser) ======================= */
  KEY: 'mq.v2.db',
  load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || null; } catch (e) { return null; } },
  persist() { try { localStorage.setItem(this.KEY, JSON.stringify(this.db)); } catch (e) { toast(ico('alert') + ' This browser is out of storage space for demo data.'); } },
  async localInit() {
    this.db = this.load();
    if (!this.db || this.db.v !== 3 || !Object.keys(this.db.users || {}).length) { this.db = { v: 3, users: {}, children: {}, weeks: {}, marks: {}, notes: {}, insights: {} }; if (typeof MQSeed !== 'undefined') await MQSeed.local(this); this.persist(); }
    let sid = null; try { sid = sessionStorage.getItem('mq.sid') || localStorage.getItem('mq.sid'); } catch (e) { /* private */ }
    const u = sid && this.db.users[sid];
    this.user = u ? { uid: sid, username: u.username, role: u.role, displayName: u.role === 'child' ? ((this.db.children[sid] || {}).name || u.username) : 'Teacher & Parent' } : null;
  },
  async hash(pw) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mq|' + pw)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    catch (e) { let h = 7; for (const c of 'mq|' + pw) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'x' + h.toString(16); }
  },
  /* Firestore refuses arrays inside arrays; the demo store checks the same so bugs show up early */
  check(o, path = '') {
    if (Array.isArray(o)) { o.forEach((v, i) => { if (Array.isArray(v)) throw new Error('nested array at ' + path + '[' + i + ']'); this.check(v, path + '[' + i + ']'); }); }
    else if (o && typeof o === 'object') for (const k in o) { if (o[k] === undefined) delete o[k]; else this.check(o[k], path + '.' + k); }
    return o;
  },
  newId() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },

  /* ======================= Accounts ======================= */
  async signUp(username, password) {
    username = this.cleanName(username);
    if (!USERNAME_RE.test(username)) throw new Error('Username: 3 to 20 letters or numbers (dots and _ are ok), starting with a letter or number.');
    if (String(password).length < 6) throw new Error('Password must be at least 6 characters.');
    if (this.isStaffName(username)) throw new Error('That username is reserved. Please choose another one.');
    if (this.mode === 'firebase') {
      try {
        const cr = await this.fb.auth.createUserWithEmailAndPassword(`${username}@${MQ_DOMAIN}`, password);
        await this.fb.db.collection('users').doc(cr.user.uid).set({ username, role: 'child', createdAt: Date.now() });
        await this.fb.db.collection('children').doc(cr.user.uid).set({ username, createdAt: Date.now(), profileDone: false });
        this.user = { uid: cr.user.uid, username, role: 'child', displayName: username };
      } catch (e) { throw new Error(this.fbErr(e)); }
    } else {
      if (Object.values(this.db.users).some(u => u.username === username)) throw new Error('That username is taken. Try adding a number, like riya.k2.');
      const uid = this.newId();
      this.db.users[uid] = { username, role: 'child', pw: await this.hash(password), createdAt: Date.now() };
      this.db.children[uid] = { username, createdAt: Date.now(), profileDone: false }; this.persist();
      this.setSession(uid); this.user = { uid, username, role: 'child', displayName: username };
    }
    return this.user;
  },
  async signIn(username, password) {
    username = this.cleanName(username);
    if (this.mode === 'firebase') {
      try { const cr = await this.fb.auth.signInWithEmailAndPassword(`${username}@${MQ_DOMAIN}`, password); this.user = await this.fbProfile(cr.user); }
      catch (e) { throw new Error(this.fbErr(e)); }
    } else {
      const uid = Object.keys(this.db.users).find(k => this.db.users[k].username === username), u = uid && this.db.users[uid];
      if (!u || u.pw !== await this.hash(password)) throw new Error('That username and password do not match. Please try again.');
      this.setSession(uid);
      this.user = { uid, username, role: u.role, displayName: u.role === 'child' ? ((this.db.children[uid] || {}).name || username) : 'Teacher & Parent' };
    }
    return this.user;
  },
  setSession(uid) { try { localStorage.setItem('mq.sid', uid); } catch (e) { /* private */ } },
  async signOut() {
    if (this.mode === 'firebase') await this.fb.auth.signOut();
    else try { localStorage.removeItem('mq.sid'); sessionStorage.removeItem('mq.sid'); } catch (e) { /* private */ }
    this.user = null;
  },
  /* staff account creation, used by setup.html (Firebase) */
  async createStaff(username, password) {
    username = this.cleanName(username);
    if (!this.isStaffName(username)) throw new Error(`Add "${username}" to staffUsernames in js/config.js (and STAFF in firestore.rules) first.`);
    if (this.mode !== 'firebase') throw new Error('Demo mode already has the staff account.');
    let cr;
    try { cr = await this.fb.auth.createUserWithEmailAndPassword(`${username}@${MQ_DOMAIN}`, password); }
    catch (e) { if (/email-already-in-use/.test(e.code)) cr = await this.fb.auth.signInWithEmailAndPassword(`${username}@${MQ_DOMAIN}`, password); else throw new Error(this.fbErr(e)); }
    await this.fb.db.collection('users').doc(cr.user.uid).set({ username, role: 'staff', displayName: 'Teacher & Parent', createdAt: Date.now() });
    this.user = { uid: cr.user.uid, username, role: 'staff', displayName: 'Teacher & Parent' };
    return this.user;
  },

  /* ======================= Data ======================= */
  col(uid, sub) { return this.fb.db.collection('children').doc(uid).collection(sub); },
  async getChild(uid) {
    if (this.mode === 'firebase') { const s = await this.fb.db.collection('children').doc(uid).get(); return s.exists ? { uid, ...s.data() } : null; }
    return this.db.children[uid] ? { uid, ...this.db.children[uid] } : null;
  },
  async saveChild(uid, data) {
    this.check(data);
    if (this.mode === 'firebase') await this.fb.db.collection('children').doc(uid).set(data, { merge: true });
    else { this.db.children[uid] = { ...(this.db.children[uid] || {}), ...data }; this.persist(); }
    if (this.user && this.user.uid === uid && data.name) this.user.displayName = data.name;
  },
  async listChildren() {
    if (this.mode === 'firebase') { const s = await this.fb.db.collection('children').get(); return s.docs.map(d => ({ uid: d.id, ...d.data() })); }
    return Object.entries(this.db.children).map(([uid, c]) => ({ uid, ...c }));
  },
  async getWeeks(uid) {
    if (this.mode === 'firebase') { const s = await this.col(uid, 'weeks').get(); return s.docs.map(d => d.data()).sort((a, b) => a.week - b.week); }
    return Object.values(this.db.weeks[uid] || {}).sort((a, b) => a.week - b.week);
  },
  async saveWeek(uid, w) {
    this.check(w);
    if (this.mode === 'firebase') await this.col(uid, 'weeks').doc('w' + w.week).set(JSON.parse(JSON.stringify(w)));
    else { (this.db.weeks[uid] = this.db.weeks[uid] || {})['w' + w.week] = JSON.parse(JSON.stringify(w)); this.persist(); }
  },
  async getMarks(uid) {
    if (this.mode === 'firebase') { const s = await this.col(uid, 'marks').get(); return s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.date || 0) - (b.date || 0)); }
    return Object.entries(this.db.marks[uid] || {}).map(([id, m]) => ({ id, ...m })).sort((a, b) => (a.date || 0) - (b.date || 0));
  },
  async saveMarks(uid, id, m) {
    this.check(m); id = id || 't' + Date.now().toString(36);
    if (this.mode === 'firebase') await this.col(uid, 'marks').doc(id).set(m);
    else { (this.db.marks[uid] = this.db.marks[uid] || {})[id] = m; this.persist(); }
    return id;
  },
  async deleteMarks(uid, id) {
    if (this.mode === 'firebase') await this.col(uid, 'marks').doc(id).delete();
    else { delete (this.db.marks[uid] || {})[id]; this.persist(); }
  },
  async getNotes(uid) {
    if (this.mode === 'firebase') { const s = await this.col(uid, 'notes').doc('main').get(); return s.exists ? s.data() : {}; }
    return (this.db.notes[uid] || {});
  },
  async saveNotes(uid, n) {
    this.check(n);
    if (this.mode === 'firebase') await this.col(uid, 'notes').doc('main').set(n, { merge: true });
    else { this.db.notes[uid] = { ...(this.db.notes[uid] || {}), ...n }; this.persist(); }
  },
  async getInsight(uid, key) {
    if (this.mode === 'firebase') { const s = await this.col(uid, 'insights').doc(key).get(); return s.exists ? s.data() : null; }
    return ((this.db.insights[uid] || {})[key]) || null;
  },
  async saveInsight(uid, key, v) {
    this.check(v);
    if (this.mode === 'firebase') await this.col(uid, 'insights').doc(key).set(JSON.parse(JSON.stringify(v)));
    else { (this.db.insights[uid] = this.db.insights[uid] || {})[key] = v; this.persist(); }
  },
  async idToken() { return this.mode === 'firebase' && this.fb.auth.currentUser ? this.fb.auth.currentUser.getIdToken() : null; }
};
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.append(s); }); }
