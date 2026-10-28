/* ================================================================
   MindQuest settings: the ONLY file you need to edit to go live.
   See SETUP.md, step by step.
   ================================================================ */
window.MQ_CONFIG = {
  /* 1. Firebase: paste the config from Firebase console > Project settings > Your apps > Web app.
        While apiKey still says "PASTE_...", MindQuest runs in DEMO MODE: accounts and data
        are kept only in this browser, and the demo accounts below are ready to use.
        (A Firebase web apiKey is not a secret: it only identifies your project. Your data is
        protected by firestore.rules, which you deploy with the Firebase CLI.) */
  firebase: {
    apiKey: 'PASTE_YOUR_API_KEY',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000'
  },

  /* 2. Teacher / parent accounts. Usernames listed here open the Teacher & Parent dashboard.
        Keep this list the same as STAFF in firestore.rules. */
  staffUsernames: ['teacher.demo'],

  /* 3. AI recommendations (optional but recommended).
        functionUrl: after `firebase deploy --only functions`, paste the URL of the "insights"
        function here. Your Google Gemini API key then lives only on Google's servers (Firebase secret),
        never in these files. Leave empty to use the built-in recommendation engine. */
  ai: {
    functionUrl: '',
    /* the Gemini model a browser test key uses (the function's model is set in functions/index.js) */
    model: 'gemini-2.5-flash',
    /* let Coggy's chat replies to children come from the AI too (sends the child's typed/spoken
       chat lines to the AI). Off by default: Coggy uses its built-in friendly replies. */
    useForChat: false
  },

  /* 4. Weekly quests: when true, the next week opens 7 days after the previous one was started.
        When false, it opens as soon as the previous week is finished (handy for demos). */
  calendarLock: false,

  /* 5. School details shown on reports */
  school: { name: 'CognoSpace Partner School', year: '2026-27' }
};
