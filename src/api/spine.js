/**
 * spine.js — Phase 1 (D2) NLU spine caller
 * Pushes the trader's utterance to a live LLM and returns
 * { intent, slots }. On any failure it resolves null so the route falls
 * back to the regex parser (offline-first, roadmap D3).
 *
 * PROVIDER (env SPINE_PROVIDER):
 *   gemini (default)  — the money agent's model. Key auto-loaded from, in order:
 *                       process.env.GEMINI_API_KEY, then the env file at
 *                       $SPINE_KEY_PATH or $AGENT_ENV_PATH.
 *                       Model: $SPINE_MODEL, else $GEMINI_MODEL, else
 *                       gemini-3.5-flash-lite (the agent's default).
 *   ollama            — local Ollama /api/generate (roadmap's original option;
 *                       needs the model pulled).
 *
 * CONTRACT (what everyone agrees on):
 *   response text = exactly one JSON object:
 *   { "intent": duty|list|buy|sell|track|help|unknown,
 *     "slots":  { product, quantity, unit, origin, destination, hs_code } }
 *   anything else / timeout / error => null => regex fallback.
 */

const fs = require('fs');

const SYSTEM_PROMPT = [
  'You are the Ushawama corridor voice assistant, fluent in English, Kiswahili,',
  'Luganda and Kinyarwanda. Parse the trader\'s utterance and return ONLY one',
  'JSON object (no markdown, no commentary).',
  'Schema: {"intent":"duty|list|buy|sell|track|help|unknown","slots":{',
  '"product":string|null, "quantity":string|null, "unit":string|null,',
  '"origin":string|null, "destination":string|null, "hs_code":string|null}}',
  'Intent rules:',
  '- duty  : asking customs duty / tax / kodi / viwango for a product',
  '- list  : wants to post, list, advertise or sell a product (nina/nauza)',
  '- buy   : wants to find a buyer, or wants to buy a product',
  '- sell  : wants to find a seller or supplier',
  '- track : asking where a shipment/cargo is (wapi mzigo)',
  '- help  : asking what the assistant can do',
  '- unknown: nothing clearly matches',
  'Slots: extract the product name, quantity ("50kg", "2 tonnes"/"tani"),',
  'and any town/city as origin or destination. Use the language the trader used.',
].join(' ');

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const PROVIDER = env('SPINE_PROVIDER', 'gemini').toLowerCase();
const TIMEOUT_MS = Number(env('SPINE_TIMEOUT_MS', '6000'));

// ── Gemini config (money agent's model) ─────────────────────────────────
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

function resolveAgentEnv() {
  const candidates = [
    env('SPINE_KEY_PATH', ''),
    env('AGENT_ENV_PATH', ''),
  ].filter(Boolean);
  for (const p of candidates) {
    const kv = loadEnvFile(p);
    if (kv.GEMINI_API_KEY) return kv;
  }
  return {};
}

let GEMINI_KEY = env('GEMINI_API_KEY', '');
const GEMINI_MODEL = env('SPINE_MODEL', env('GEMINI_MODEL', 'gemini-3.5-flash-lite'));
let resolvedAgentEnv = null;

function geminiKey() {
  if (GEMINI_KEY) return GEMINI_KEY;
  if (!resolvedAgentEnv) resolvedAgentEnv = resolveAgentEnv();
  GEMINI_KEY = resolvedAgentEnv.GEMINI_API_KEY || '';
  return GEMINI_KEY;
}

// ── Ollama config ────────────────────────────────────────────────────────
const OLLAMA_URL = env('SPINE_URL', env('NEBULA_SPINE_URL', 'http://localhost:11434/api/generate'));
const OLLAMA_MODEL = env('SPINE_MODEL', 'qwen2.5:7b');

async function callGemini(text, lang) {
  const key = geminiKey();
  if (!key) return null;
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\nTrader said (${lang}): "${text.trim()}"` }],
    }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
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
    if (!resp.ok) return null; // incl. 429 free-tier quota -> regex fallback
    const data = await resp.json();
    const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return cleanJson(textOut);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(text, lang) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        format: 'json',
        system: SYSTEM_PROMPT,
        prompt: `Trader said (${lang}): "${text.trim()}"`,
        stream: false,
        options: { temperature: 0 },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return cleanJson(data.response);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isEnabled() {
  if (PROVIDER === 'ollama') return true;
  return Boolean(geminiKey());
}

function cleanJson(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalise(nlu) {
  const allowed = ['duty', 'list', 'buy', 'sell', 'track', 'help', 'unknown'];
  const intent = allowed.includes(nlu?.intent) ? nlu.intent : 'unknown';
  const slots = nlu?.slots && typeof nlu.slots === 'object' ? nlu.slots : {};
  return { intent, slots };
}

/**
 * Try the spine. Resolves null on disabled/timeout/error (never throws).
 * Resolves { intent, slots, source: 'gemini'|'ollama' } on success.
 */
async function parseWithSpine(text, lang = 'en') {
  if (!text || !text.trim()) return null;
  const nlu = PROVIDER === 'ollama'
    ? await callOllama(text, lang)
    : await callGemini(text, lang);
  if (!nlu) return null;
  return { ...normalise(nlu), raw: nlu, source: PROVIDER };
}

module.exports = { parseWithSpine, isEnabled, SYSTEM_PROMPT, PROVIDER, GEMINI_MODEL };