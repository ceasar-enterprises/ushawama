/**
 * Market routes — live market snapshot for the trading corridor
 *
 * GET /api/market/summary
 *   fx     : live USD → UGX/KES/TZS/RWF (open.er-api.com, no key)
 *   watch  : most relevant recent price headline (regional press via Google News)
 *   news   : latest agriculture/trade headlines (Google News RSS, regional press)
 *
 * Every number/headline comes from a named, dated source. Nothing is faked;
 * if a feed is down the cached snapshot is served with `stale: true`.
 *
 * Uses only Node built-ins (https, fs, path) — no new dependencies.
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '../../../data');
const CACHE_FILE = path.join(DATA_DIR, 'market-cache.json');

const FX_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const NEWS_TTL_MS = 15 * 60 * 1000; // 15min
const BUILD_TTL_MS = 5 * 60 * 1000; // live request rebuild window

const FX_SOURCE = 'open.er-api.com (ECB reference rates)';
const NEWS_SOURCE = 'Google News RSS — East African press';

// ── tiny helpers ──

function httpGetJson(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Ushawama/0.1)' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function httpGetText(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Ushawama/0.1)' } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        resolve(body);
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return null; }
}

function writeCache(payload) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2));
  } catch (e) { console.error('[market] cache write failed', e.message); }
}

// ── data fetchers ──

async function fetchFx() {
  const j = await httpGetJson('https://open.er-api.com/v6/latest/USD');
  if (!j || j.result !== 'success' || !j.rates) throw new Error('fx feed failed');
  const pick = {};
  for (const c of ['KES', 'UGX', 'TZS', 'RWF']) {
    if (typeof j.rates[c] === 'number') pick[c] = j.rates[c];
  }
  return { rates: pick, asOf: j.time_last_update_utc || new Date().toISOString() };
}

function parseRssNews(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = decodeEntities((block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '').trim();
    const link = decodeEntities((block.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/) || [])[1] || '').trim();
    const dateRaw = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    const source = decodeEntities(((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '').trim());
    const publishedAt = dateRaw ? new Date(dateRaw).toISOString() : null;
    if (title && link) items.push({ title, link, source: source || 'Regional press', publishedAt });
  }
  return items;
}

async function fetchNews() {
  const queries = [
    'maize price Kenya Uganda East Africa',
    'beans market East Africa price',
    'Busia Malaba cross border trade market',
  ];
  const all = [];
  for (const q of queries) {
    const url =
      'https://news.google.com/rss/search?q=' +
      encodeURIComponent(q) +
      '&hl=en-KE&gl=KE&ceid=KE:en';
    try {
      const xml = await httpGetText(url);
      all.push(...parseRssNews(xml));
    } catch (e) { console.error('[market] news query failed', q, e.message); }
  }
  // de-dupe by normalised title, keep newest, sort by date desc
  const seen = new Set();
  const news = [];
  for (const item of all) {
    const key = item.title.toLowerCase().slice(0, 90);
    if (seen.has(key)) continue;
    seen.add(key);
    news.push(item);
  }
  news.sort((a, b) => {
    const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return tb - ta;
  });
  return news.slice(0, 8);
}

function pickWatch(news) {
  const anchorRe = /(per\s+(kg|kilo|tonne|ton|sack|bag|bunch|litre|l|shilling))|price|prices|shilling|KSh|KES|UGX|TZS/i;
  const withPrice = news.filter(n => anchorRe.test(n.title));
  return (withPrice[0] || news[0] || null);
}

// ── summary builder ──

let building = null;

async function buildSummary() {
  if (building) return building;
  building = (async () => {
    const cached = readCache();
    const now = Date.now();

    const tryFx = async () => {
      if (cached && cached.fx && now - new Date(cached.builtAt).getTime() < FX_TTL_MS) return cached.fx;
      return { ...(await fetchFx()) };
    };
    const tryNews = async () => {
      if (cached && cached.news && now - new Date(cached.builtAt).getTime() < NEWS_TTL_MS) {
        return { news: cached.news, watch: cached.watch };
      }
      const news = await fetchNews();
      return { news, watch: pickWatch(news) };
    };

    let fx = null, news = null, watch = null, stale = false;

    try { fx = await tryFx(); } catch (e) {
      console.error('[market] fx fetch failed', e.message);
      if (cached && cached.fx) { fx = cached.fx; stale = true; }
    }
    try { const n = await tryNews(); news = n.news; watch = n.watch; } catch (e) {
      console.error('[market] news fetch failed', e.message);
      if (cached) { news = cached.news || []; watch = cached.watch || null; stale = true; }
    }

    const summary = {
      builtAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stale,
      fx: fx ? { rates: fx.rates, asOf: fx.asOf } : null,
      watch,
      news: news || [],
      sources: [FX_SOURCE, NEWS_SOURCE],
    };
    writeCache(summary);
    return summary;
  })();
  try {
    return await building;
  } finally {
    building = null;
  }
}

router.get('/summary', async (req, res) => {
  try {
    const summary = await buildSummary();
    res.json(summary);
  } catch (e) {
    const cached = readCache();
    if (cached) return res.json({ ...cached, stale: true, error: e.message });
    res.status(502).json({ error: 'Market feed unavailable', detail: e.message });
  }
});

router.get('/health', (req, res) => {
  const cached = readCache();
  res.json({ ok: true, cached: !!cached, builtAt: cached?.builtAt || null, sources: [FX_SOURCE, NEWS_SOURCE] });
});

module.exports = router;
module.exports.buildSummary = buildSummary;