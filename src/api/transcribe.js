/**
 * transcribe.js — speech-to-text via the money agent's Gemini model.
 * Same key-source as the spine (spine.js): process.env.GEMINI_API_KEY,
 * then the env file at $SPINE_KEY_PATH or $AGENT_ENV_PATH.
 *
 * Audio is sent as Gemini inlineData (base64) with the model's own audio
 * understanding — no Whisper server, works from the PC AND the phone.
 * On any failure resolves null so callers fall back gracefully.
 */

const fs = require('fs');

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function loadEnvFile(p) {
  try {
    const out = {};
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

let GEMINI_KEY = env('GEMINI_API_KEY', '');
const GEMINI_MODEL = env('SPINE_MODEL', env('GEMINI_MODEL', 'gemini-3.5-flash-lite'));
let resolvedEnv = null;

function geminiKey() {
  if (GEMINI_KEY) return GEMINI_KEY;
  if (!resolvedEnv) {
    for (const p of [env('SPINE_KEY_PATH', ''), env('AGENT_ENV_PATH', '')].filter(Boolean)) {
      const kv = loadEnvFile(p);
      if (kv.GEMINI_API_KEY) {
        resolvedEnv = kv;
        break;
      }
    }
    resolvedEnv = resolvedEnv || {};
  }
  GEMINI_KEY = resolvedEnv.GEMINI_API_KEY || '';
  return GEMINI_KEY;
}

const TIMEOUT_MS = Number(env('SPINE_TIMEOUT_MS', '20000'));

// Normalise the recorded container to a mime Gemini understands.
function normaliseMime(mime, hint) {
  const m = String(mime || '').toLowerCase().split(';')[0].trim();
  if (m) return m;
  const ext = String(hint || '').toLowerCase();
  if (ext.endsWith('.m4a') || ext.endsWith('.m4b')) return 'audio/mp4';
  if (ext.endsWith('.mp3')) return 'audio/mpeg';
  if (ext.endsWith('.wav')) return 'audio/wav';
  if (ext.endsWith('.ogg')) return 'audio/ogg';
  if (ext.endsWith('.webm')) return 'audio/webm';
  return 'audio/wav';
}

const PROMPT_TPL =
  'Transcribe the speech in this audio verbatim. Reply with ONLY the plain ' +
  'transcript: no quotes, no commentary, no punctuation noise. If it is not ' +
  'speech, reply with exactly: SILENCE.';

/**
 * Transcribe a decoded audio buffer with the agent's Gemini model.
 * Resolves { text } or null on any failure.
 */
async function transcribe(buf, mime, lang = 'en') {
  const key = geminiKey();
  if (!key) return null;
  if (!buf || !buf.length) return null;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`;

  let languageHint = '';
  if (lang && ['sw', 'lg', 'rw'].includes(String(lang).toLowerCase())) {
    languageHint = ` The speech is mostly ${lang === 'sw' ? 'Kiswahili' : lang === 'lg' ? 'Luganda' : 'Kinyarwanda'}.`;
  }

  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: normaliseMime(mime), data: buf.toString('base64') } },
        { text: PROMPT_TPL + languageHint },
      ],
    }],
    generationConfig: { temperature: 0 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[transcribe] gemini ${resp.status}: ${detail.slice(0, 300)}`);
      return null;
    }
    const data = await resp.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.trim().replace(/^["']|["']$/g, '');
    if (!text || /^SILENCE\.?$/i.test(text)) return { text: '' };
    return { text };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { transcribe, geminiKey, GEMINI_MODEL, normaliseMime };