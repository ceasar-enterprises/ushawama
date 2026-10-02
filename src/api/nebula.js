/**
 * Nebula adapter — Phase 0 corridor event bridge (Ushawama -> NEBULA).
 * escrow + tracking events -> NEBULA /api/webhook/import (job + audit trail).
 * Background work -> NEBULA /api/jobs/enqueue. Config via env:
 *   NEBULA_ENABLED      (default true)   set 'false' to disable forwarding
 *   NEBULA_API_BASE     (default https://localhost:8080)
 *   NEBULA_API_KEY      (default: read from NEBULA_CONFIG_PATH if present)
 *   NEBULA_CONFIG_PATH  (path to a NEBULA config.json to auto-load webhook_api_key)
 *   NEBULA_TLS_INSECURE (default false) allow self-signed certs (local dev only)
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const EVENTS_LOG = path.join(DATA_DIR, 'nebula-events.jsonl');

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const ENABLED = env('NEBULA_ENABLED', 'true').toLowerCase() !== 'false';
const BASE = env('NEBULA_API_BASE', 'https://localhost:8080');
const TLS_INSECURE = env('NEBULA_TLS_INSECURE', 'false').toLowerCase() === 'true';

function resolveApiKey() {
  const direct = process.env.NEBULA_API_KEY || '';
  if (direct) return direct;
  const candidates = [process.env.NEBULA_CONFIG_PATH].filter(Boolean);
  for (const cfgPath of candidates) {
    try {
      if (!fs.existsSync(cfgPath)) continue;
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const key = String((cfg.server && cfg.server.webhook_api_key) || '');
      if (key) return key;
    } catch { /* try next candidate */ }
  }
  return '';
}

const API_KEY = resolveApiKey();

function mask(key) {
  if (!key) return 'unset';
  if (key.length <= 8) return '••••';
  return key.slice(0, 3) + '•••' + key.slice(-3);
}

function logEvent(entry) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(EVENTS_LOG, JSON.stringify(entry) + '\n');
  } catch { /* never throw */ }
}

function post(pathname, body, attempts) {
  return new Promise((resolve) => {
    const url = new URL(BASE + pathname);
    const payload = JSON.stringify(body);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-API-Key': API_KEY,
        },
        rejectUnauthorized: !TLS_INSECURE,
        timeout: 8000,
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let parsed = null;
          try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: parsed, error: null });
        });
      },
    );
    req.on('error', (err) => {
      const remaining = attempts - 1;
      if (remaining > 0) {
        setTimeout(() => {
          post(pathname, body, remaining).then(resolve);
        }, 3000);
      } else {
        resolve({ ok: false, status: 0, body: null, error: err.message });
      }
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.write(payload);
    req.end();
  });
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function postCorridorEvent(kind, event) {
  const eventId = newId('evt');
  const entry = { source: 'ushawama', kind, event: { ...event }, eventId, sentAt: new Date().toISOString() };
  if (!ENABLED) {
    logEvent({ ts: new Date().toISOString(), kind, eventId, ok: false, status: 0, error: 'forwarding disabled (NEBULA_ENABLED=false)' });
    return { ok: false, status: 0, body: null, error: 'disabled' };
  }
  if (!API_KEY) {
    logEvent({ ts: new Date().toISOString(), kind, eventId, ok: false, status: 0, error: 'NEBULA_API_KEY unset (not forwarded)' });
    return { ok: false, status: 0, body: null, error: 'no api key' };
  }
  const r = await post('/api/webhook/import', entry);
  logEvent({ ts: new Date().toISOString(), kind, eventId, ok: r.ok, status: r.status, jobId: r.body ? r.body.job_id : null, error: r.error });
  return r;
}

async function enqueueJob(type, payload, opts = {}) {
  if (!ENABLED) return { ok: false, status: 0, body: null, error: 'disabled' };
  if (!API_KEY) return { ok: false, status: 0, body: null, error: 'no api key' };
  const body = { type, payload, priority: opts.priority || 0 };
  if (opts.max_attempts) body.max_attempts = opts.max_attempts;
  if (opts.delay_seconds) body.delay_seconds = opts.delay_seconds;
  return post('/api/jobs/enqueue', body);
}

async function classifyText(text, lang = 'en') {
  // Phase 1 NLU spine: NEBULA owns intent classification for trader utterances.
  const entry = { kind: 'chatbot.classify', text, lang, at: new Date().toISOString() };
  if (!ENABLED) {
    logEvent({ ts: new Date().toISOString(), kind: 'chatbot.classify', ok: false, status: 0, error: 'forwarding disabled (NEBULA_ENABLED=false)' });
    return { ok: false, status: 0, body: null, error: 'disabled' };
  }
  if (!API_KEY) {
    logEvent({ ts: new Date().toISOString(), kind: 'chatbot.classify', ok: false, status: 0, error: 'NEBULA_API_KEY unset' });
    return { ok: false, status: 0, body: null, error: 'no api key' };
  }
  const r = await post('/api/chatbot/classify', { text, lang });
  logEvent({ ts: new Date().toISOString(), kind: 'chatbot.classify', ok: r.ok, status: r.status, error: r.error });
  return r;
}

async function selfTest() {
  if (!ENABLED) {
    logEvent({ ts: new Date().toISOString(), kind: 'self.test', eventId: newId('evt'), ok: false, status: 0, error: 'forwarding disabled (NEBULA_ENABLED=false)' });
    return;
  }
  if (!API_KEY) {
    logEvent({ ts: new Date().toISOString(), kind: 'self.test', eventId: newId('evt'), ok: false, status: 0, error: 'NEBULA_API_KEY unset (self-test skipped)' });
    return;
  }
  const r = await enqueueJob('test_ping', { from: 'ushawama-boot', at: new Date().toISOString() });
  logEvent({ ts: new Date().toISOString(), kind: 'self.test', ok: r.ok, status: r.status, jobId: r.body ? r.body.job_id : null, error: r.error });
  return r;
}

module.exports = {
  postCorridorEvent,
  enqueueJob,
  classifyText,
  selfTest,
  isEnabled: () => ENABLED,
  hasKey: () => Boolean(API_KEY),
  apiBase: BASE,
  keyHint: mask(API_KEY),
};