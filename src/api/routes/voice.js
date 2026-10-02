/**
 * Voice routes — command parsing + TTS text generation
 * The mobile app does STT locally (Whisper); this endpoint
 * provides command parsing and response templates.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const spine = require('../spine');
const transcribe = require('../transcribe');
const nebula = require('../nebula');

// Load voice engine (Node-compatible parts: command parser + responses)
const VOICE_SRC = path.join(__dirname, '../../voice/engine.ts');
// Since engine.ts is TypeScript, we implement light server-side parsing here
// for the Chinese/English/Swahili command patterns.

const COMMAND_PATTERNS = [
  { type: 'duty_check', patterns: [/(?:check|calculate|how much)\s+(?:duty|tax|customs?)\s+(?:for|on|of)\s+(.+)/i, /(?:duty|tax|customs?)\s+(?:for|on|of)\s+(.+)/i, /(?:bring|import|transport)\s+(.+)/i, /(?:viwango|kodi)\s+(.+)?/i, /(.+)\s+(?:duty|kodi)/i] },
  { type: 'find_buyer', patterns: [/(?:find|look for|search|who wants?)\s+(?:a )?buyer\s+(?:for|buying)\s+(.+)/i, /(?:buyer|customer)\s+(?:for|buying)\s+(.+)/i, /(?:buy|wants?)\s+(.+)/i, /(.+)\s+(?:buyer|customer|mnunuzi)/i] },
  { type: 'find_seller', patterns: [/(?:find|look for|search|who has?)\s+(?:a )?seller\s+(?:for|selling)\s+(.+)/i, /(?:seller|supplier)\s+(?:for|selling)\s+(.+)/i, /(?:sell|has)\s+(.+)/i, /(.+)\s+(?:seller|supplier|muuzaji)/i] },
  { type: 'post_product', patterns: [/(?:post|list|advertise|sell)\s+(.+)/i, /(?:i have|i'm selling|i want to sell)\s+(.+)/i, /(?:nina|nauza)\s+(.+)/i] },
  { type: 'continue_lesson', patterns: [/(?:continue|resume|go back to)\s+(?:my )?(?:lesson|reading|learning)/i, /(?:endelea|soma)\s+(?:tena|zaidi)?/i] },
  { type: 'start_lesson', patterns: [/(?:start|begin|open)\s+(?:level|lesson)\s*(\d)?/i, /(?:anza|anzisha)\s+(?:level|lesson)?\s*(\d)?/i] },
  { type: 'track_cargo', patterns: [/(?:track|follow|where is)\s+(?:my\s+)?(?:cargo|shipment|container|order)\s*(.+)?/i, /(?:wapi|fuata)\s+(.+)?(?:mzigo|kargo|cargo)/i] },
  { type: 'help', patterns: [/(?:help|what can you do|how do i|options)/i, /(?:msaada|nisaidie|nini naweza)/i] },
];

function parseCommand(text) {
  if (!text || !text.trim()) return { type: 'unknown', raw: '' };
  const cleaned = text.trim();

  for (const { type, patterns } of COMMAND_PATTERNS) {
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        return { type, value: match[1]?.trim() || '', level: match[2] || undefined };
      }
    }
  }
  return { type: 'search', value: cleaned };
}

const INTENT_TO_TYPE = {
  duty: 'duty_check',
  list: 'post_product',
  buy: 'find_buyer',
  sell: 'find_seller',
  track: 'track_cargo',
  help: 'help',
};

// NEBULA trader_nlu already classifies to command-type names directly.
const NEBULA_TO_TYPE = {
  duty_check: 'duty_check',
  find_buyer: 'find_buyer',
  find_seller: 'find_seller',
  post_product: 'post_product',
  track_cargo: 'track_cargo',
  continue_lesson: 'continue_lesson',
  start_lesson: 'start_lesson',
  help: 'help',
};

// Phase 1 (D2+D3): NEBULA corridor brain first, spine second, regex last.
// Never throws; always resolves a command.
async function parseCommandSmart(text, lang = 'en') {
  // 1) NEBULA owns the corridor NLU (engine-layer marriage) — rules + Ollama.
  try {
    if (nebula.isEnabled() && nebula.hasKey()) {
      const nlu = await nebula.classifyText(text, lang);
      if (nlu.ok && nlu.body && NEBULA_TO_TYPE[nlu.body.intent]) {
        const value = nlu.body.product || nlu.body.value || '';
        return {
          command: {
            type: NEBULA_TO_TYPE[nlu.body.intent],
            value: value || '',
            level: nlu.body.level || undefined,
          },
          source: 'nebula',
          intent: nlu.body.intent,
          nlu: nlu.body,
        };
      }
    }
  } catch { /* next tier */ }
  // 2) Spine (Gemini / local Ollama) for richer intent + slots.
  const nlu = await spine.parseWithSpine(text, lang);
  if (!nlu || nlu.intent === 'unknown' || !INTENT_TO_TYPE[nlu.intent]) {
    // 3) Local regex fallback — offline-first.
    return { command: parseCommand(text), source: 'local' };
  }
  const slots = nlu.slots || {};
  const value = [slots.product, slots.quantity, slots.origin, slots.destination]
    .filter(Boolean)
    .join(' | ');
  return {
    command: { type: INTENT_TO_TYPE[nlu.intent], value: value || '' },
    source: nlu.source,
    intent: nlu.intent,
    slots,
  };
}

// POST /api/voice/parse
// Parse free text into a structured command (spine NLU with regex fallback).
// ?force=local bypasses the spine for testing the fallback path.
router.post('/parse', async (req, res) => {
  const { text, lang = 'en' } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const forceLocal = String(req.query.force || '').toLowerCase() === 'local';
  const result = forceLocal
    ? { command: parseCommand(text), source: 'local' }
    : await parseCommandSmart(text, lang);
  res.json({ ok: true, ...result, lang });
});

// GET /api/voice/templates
// TTS response templates for the given language
router.get('/templates', (req, res) => {
  const { lang = 'en' } = req.query;
  const RESPONSES = {
    en: {
      listening: "I'm listening. Tell me what you need.",
      duty_intro: "Here's the duty information for {product}:",
      buyer_intro: "I found {count} buyers looking for {product}:",
      seller_intro: "I found {count} sellers offering {product}:",
      lesson_continue: "Welcome back! Let's continue where you left off.",
      lesson_start: "Starting {name}. Get ready to learn!",
      help: "You can say: check duty for maize, find buyers for beans, continue my lesson, or post a product.",
      error: "Sorry, I didn't understand that. Please try again.",
      no_results: "I couldn't find any results for {product}. Try a different product name.",
    },
    sw: {
      listening: "Nasikiliza. Niambie unachohitaji.",
      duty_intro: "Hii ni taarifa ya kodi kwa {product}:",
      buyer_intro: "Nimepata wanunuzi {count} wanaotafuta {product}:",
      seller_intro: "Nimepata wauzaji {count} wanaouza {product}:",
      lesson_continue: "Karibu tena! Tuendele tulipoishia.",
      lesson_start: "Kuanza {name}. Jiandae kujifunza!",
      help: "Unaweza kusema: angalia kodi ya mahindi, tafuta wanunuzi wa maharage, endelea somo langu, au orodhesha bidhaa.",
      error: "Samahani, sikuelewa. Tafadhali jaribu tena.",
      no_results: "Sijapata matokeo kwa {product}. Jaribu jina lingine la bidhaa.",
    },
    lg: {
      listening: "Nuwulire. Nambira kino okikiza.",
      duty_intro: "Bino ebyafaayo by'ekaddu ku {product}:",
      buyer_intro: "Nanonya abannunzizi {count} banooba {product}:",
      seller_intro: "Nanonya abalimuzi {count} balagirako {product}:",
      lesson_continue: "Tugamba nnyo! Tweyongera ku kintwe twali.",
      lesson_start: "Kutandika {name}. Teekateeka okusoma!",
      help: "Ojogera: kennga ekaddu kya emaali, nonya abannunzizi, yongera somo lyange.",
      error: "Nsonyiwa, simanyi kino. Njogera kino ntya.",
      no_results: "Sinnanonye ebintu ku {product}. Gezezza erinnya ly'okintu ekirala.",
    },
    rw: {
      listening: "Mpumva. Mwambye ukeneye iki.",
      duty_intro: "Uyu ni amakuru y'inguzo kuri {product}:",
      buyer_intro: "Nabonye abaguzi {count} bashaka {product}:",
      seller_intro: "Nabonye abacuruzi {count} barindagura {product}:",
      lesson_continue: "Murakaza neza! Twaromeze aho twari.",
      lesson_start: "Gutangira {name}. Witegure kumenya!",
      help: "Usobora kuvuga: reba inguzo y'ibigori, ona abaguzi, Subira isomo ryanjye.",
      error: "Mfise ubusabane, nti mvumbuye. Ongera ugerageze.",
      no_results: "Ntavumbuye icyerekezo kuri {product}. Gerageza izina ry'ikintu iringiye.",
    },
  };
  res.json({ ok: true, templates: RESPONSES[lang] || RESPONSES.en });
});

// ── Multipart parser (no deps) ────────────────────────────────────────────
// Splits `multipart/form-data` bytes into parts: { name, filename, contentType, data }.
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  const boundary = m ? (m[1] || m[2]).trim() : '';
  if (!boundary) return [];
  const delim = Buffer.from(`--${boundary}`);
  const parts = [];
  let start = buf.indexOf(delim);
  while (start !== -1) {
    const end = buf.indexOf(delim, start + delim.length);
    if (end === -1) break;
    const block = buf.subarray(start + delim.length, end);
    if (block.length >= 2 && block.subarray(0, 2).toString() === '--') break; // trailing boundary
    const headerEnd = block.indexOf('\r\n\r\n');
    if (headerEnd === -1) { start = end; continue; }
    const header = block.subarray(0, headerEnd).toString('utf8');
    const data = block.subarray(headerEnd + 4);
    let name = '';
    let filename = '';
    const cd = /Content-Disposition:[^\r\n]*/i.exec(header);
    if (cd) {
      const n = /name="([^"]*)"/i.exec(cd[0]);
      if (n) name = n[1];
      const f = /filename="([^"]*)"/i.exec(cd[0]);
      if (f) filename = f[1];
    }
    const ct = /Content-Type:\s*([^\r\n]*)/i.exec(header);
    const contentTypeVal = ct ? ct[1].trim() : '';
    parts.push({ name, filename, contentType: contentTypeVal, data });
    start = end;
  }
  return parts;
}

// POST /api/voice/transcribe
// Speech → text via the agent's Gemini model.
// Accepts EITHER an audio blob as the raw body (web: Content-Type = audio mime,
// ?lang=en|sw|lg|rw), OR multipart/form-data with a `file` field + optional
// `lang` field (native: expo-av .m4a).
router.post('/transcribe', express.raw({ type: () => true, limit: '25mb' }), async (req, res, next) => {
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || []);
    const contentType = String(req.headers['content-type'] || '');

    let audio = raw;
    let mime = '';
    let lang = String(req.query.lang || '');

    if (contentType.toLowerCase().startsWith('multipart/form-data')) {
      const parts = parseMultipart(raw, contentType);
      const file = parts.find((p) => p.name === 'file');
      if (!file || !file.data.length) return res.status(400).json({ error: 'file part required' });
      audio = file.data;
      mime = file.contentType || '';
      const lp = parts.find((p) => p.name === 'lang');
      if (lp && lp.data.length) lang = lp.data.toString('utf8').trim() || '';
    } else {
      mime = contentType.split(';')[0].trim();
    }

    if (!audio.length) return res.status(400).json({ error: 'empty audio' });

    const result = await transcribe.transcribe(audio, mime, lang);
    if (!result) return res.status(502).json({ error: 'Transcription unavailable (key or model down)' });
    res.json({ ok: true, text: result.text });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.parseCommand = parseCommand;
module.exports.parseCommandSmart = parseCommandSmart;