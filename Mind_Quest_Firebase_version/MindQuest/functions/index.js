/* ================================================================
   MindQuest AI proxy (Firebase Cloud Function, 2nd gen).
   The browser never sees the Google Gemini API key: it is a Firebase secret
   (firebase functions:secrets:set GEMINI_API_KEY) read only here.
   Only signed-in MindQuest users can call it; suggestions only staff.
   ================================================================ */
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
admin.initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const MODEL = 'gemini-2.5-flash';                  // change here to use another Gemini model
const STAFF = ['teacher.demo'];                    // same as staffUsernames in js/config.js

exports.insights = onRequest({ secrets: [GEMINI_API_KEY], cors: true, region: 'asia-south1', maxInstances: 5, timeoutSeconds: 90 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const m = (req.get('Authorization') || '').match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'Sign in first' });
  let user;
  try { user = await admin.auth().verifyIdToken(m[1]); } catch (e) { return res.status(401).json({ error: 'Invalid sign-in' }); }
  const username = String(user.email || '').split('@')[0];
  const { kind, system, messages } = req.body || {};
  if (!['insights', 'chat'].includes(kind) || !Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Bad request' });
  if (kind === 'insights' && !STAFF.includes(username)) return res.status(403).json({ error: 'Staff only' });
  if (JSON.stringify(messages).length > 40000) return res.status(413).json({ error: 'Too long' });
  const contents = [];
  for (const x of messages.slice(-12)) {
    const role = x.role === 'assistant' ? 'model' : 'user', text = String(x.content || '').slice(0, 20000);
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += '\n' + text; else contents.push({ role, parts: [{ text }] });
  }
  if (contents[0].role === 'model') contents.unshift({ role: 'user', parts: [{ text: '(start)' }] });
  const chat = kind === 'chat';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY.value() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: String(system || '').slice(0, 4000) }] }, contents,
        generationConfig: chat ? { maxOutputTokens: 300, temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } } : { maxOutputTokens: 4096, temperature: 0.7, responseMimeType: 'application/json' }
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || 'AI error' });
    const c = (j.candidates || [])[0];
    if (!c || !c.content) return res.status(502).json({ error: 'AI gave no answer' + (c && c.finishReason ? ' (' + c.finishReason + ')' : '') });
    res.json({ text: (c.content.parts || []).map(p => p.text || '').join('') });
  } catch (e) {
    res.status(502).json({ error: 'Could not reach the AI' });
  }
});
