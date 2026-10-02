/**
 * Ushawama API — Express server
 * Exposes core services (duty, voice, trade, payment, tracking) over HTTP
 * for the mobile app and USSD fallback.
 * Integrates with NEBULA via /src/api/nebula.js adapter (corridor events).
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const dutyRoutes = require('./routes/duty');
const voiceRoutes = require('./routes/voice');
const tradeRoutes = require('./routes/trade');
const paymentRoutes = require('./routes/payment');
const trackingRoutes = require('./routes/tracking');
const marketRoutes = require('./routes/market');
const nebula = require('./nebula');
const momo = require('./momo');

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ──

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ushawama-api',
    version: '0.1.0',
    time: new Date().toISOString(),
    nebula: { enabled: nebula.isEnabled(), apiKeyLoaded: nebula.hasKey(), base: nebula.apiBase, keyHint: nebula.keyHint },
    nlu: {
      tier: 'nebula → spine → local',
      nebulaReachable: nebula.isEnabled() && nebula.hasKey(),
    },
    momo: momo.config(),
    routes: {
      duty: '/api/duty',
      voice: '/api/voice',
      trade: '/api/trade',
      payment: '/api/payment',
      tracking: '/api/tracking',
      market: '/api/market',
    },
  });
});

// ── Routes ──

app.use('/api/duty', dutyRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/market', marketRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.url });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    detail: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Create data directory if missing
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.listen(PORT, () => {
  console.log(`Ushawama API running on http://localhost:${PORT}`);
  console.log(`  NEBULA adapter: ${nebula.isEnabled() ? 'enabled' : 'disabled'}  key=${nebula.keyHint}  base=${nebula.apiBase}`);
  nebula.selfTest().catch(() => {});
});