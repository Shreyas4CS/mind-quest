# MindQuest setup

MindQuest works in two ways:

* **Demo mode (no setup).** While `js/config.js` still says `PASTE_YOUR_API_KEY`, everything is saved in the browser you use. Demo accounts are ready:
  * Teacher & Parent: `teacher.demo` / `CognoSpace@2026`
  * Sample child (Riya): `riya.demo` / `Riya@2026` (other sample children: `aarav.demo`, `meera.demo`, `kabir.demo`, password `Demo@2026`)
* **Live mode (Firebase).** Logins and data are stored in your own Firebase project, so they work on every device.

## Running it

The camera, microphone and Firebase need the page to be served from a web address, not opened as a file.

* Quick test on your computer: open a terminal in this folder and run `npx serve .` (or `python -m http.server 8000`), then open the address it prints in **Chrome or Edge**.
* Live: Firebase Hosting (step 6). Any static host also works (Netlify, GitHub Pages, your school server).

The site opens on the landing page (`index.html`). **Log in** and **Create account** lead to `login.html`.

Voice (speech-to-text) and the Bluetooth heart sensor need Chrome or Edge.

## Going live with Firebase (about 20 minutes)

1. Go to <https://console.firebase.google.com>, **Add project** (e.g. `mindquest-school`). Google Analytics is not needed.
2. **Build > Authentication > Get started > Sign-in method:** enable **Email/Password**. (Children only see usernames; MindQuest turns `riya.k` into `riya.k@users.mindquest.app` behind the scenes.)
3. **Build > Firestore Database > Create database**, production mode, location `asia-south1 (Mumbai)`.
4. **Project settings (gear) > Your apps > Web (`</>`)**, register the app, and copy the `firebaseConfig` values into `firebase:` in `js/config.js`. This web key is not a secret; your data is protected by the rules in step 5.
5. Install the Firebase CLI once: `npm install -g firebase-tools`, then in this folder:
   ```
   firebase login
   firebase use --add          (pick your project)
   firebase deploy --only firestore:rules,hosting
   ```
   Hosting prints your website address, e.g. `https://mindquest-school.web.app`.
6. Open `https://<your-site>/setup.html` and press **Create accounts**. It creates the shared Teacher & Parent account (`teacher.demo` / `CognoSpace@2026`, change the password there if you like) and, if ticked, the four sample children with finished weeks. Children create their own accounts from the login page.
7. Add more teacher/parent accounts: add the username to `staffUsernames` in `js/config.js` **and** to the list in `firestore.rules` (as `username@users.mindquest.app`), redeploy, then create the account from `setup.html` with that username.

## AI suggestions (Google Gemini)

Without any AI setup, a built-in engine writes the suggestions from each child's scores, own words, interests, fears, timing and marks. To have Google's Gemini AI write them:

**Recommended, secure: Firebase Function.** The API key stays on Google's servers and is never in the website files.

1. Your Firebase project must be on the **Blaze (pay as you go)** plan (needed for Functions; small use is within the free allowance).
2. Get a Gemini API key from Google AI Studio: <https://aistudio.google.com/apikey> (sign in with a Google account, press **Create API key**).
3. In this folder:
   ```
   cd functions && npm install && cd ..
   firebase functions:secrets:set GEMINI_API_KEY      (paste the key when asked)
   firebase deploy --only functions
   ```
4. Copy the printed function URL (ends in `/insights`) into `ai.functionUrl` in `js/config.js` and deploy hosting again.
5. The model is `gemini-2.5-flash` (set in `functions/index.js`; `ai.model` in `js/config.js` is for the browser test key).
6. Optional: set `ai.useForChat: true` to let Coggy's chat replies come from the AI too.

**Testing only:** on the Teacher & Parent dashboard, **AI settings** lets you paste a Gemini key (starts with `AIza`) that is kept only in that browser. Do not do this on shared computers.

What is sent to the AI: a summary (scores, short quotes from the child, interests, marks, notes). Never photos, video or audio.

## Your own videos (optional)

Story videos are drawn and narrated by the app, so no files are needed. To change a story, edit its `scenes` in `js/content.js`: each scene has a background (`class`, `home`, `park`, `canteen`, `bus`, `night`), characters (name, colour, mood: `happy`, `sad`, `angry`, `fearful`, `surprised`, `wow`, `sleepy`, `neutral`) and a narration line; a scene with `stop` pauses the video for a question.

## Weekly schedule

`calendarLock` in `js/config.js`: `false` opens the next week as soon as the previous one is finished (good for demos); `true` opens it 7 days after the previous week was started. Weeks 1 to 4 are written; from week 5 the four sets repeat (add more weeks to `WEEKS` in `js/content.js`).

## Heart sensor

Unchanged from before: HW-605 (MAX30102) on an Arduino UNO R4 WiFi. See `arduino/SENSOR-SETUP.md`. On the quest screen, press **Connect** in the Heart sensor box.
