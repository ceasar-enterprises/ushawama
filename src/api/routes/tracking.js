/**
 * Tracking routes — cargo location pings for live corridor tracking.
 * Each ping is stored locally AND forwarded to NEBULA as a cargo.tracking event.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const nebula = require('../nebula');

const router = express.Router();
const TRACKING_FILE = path.join(__dirname, '../../../data/tracking.json');

const MAX_PINGS = 500;

function loadPings() {
  try {
    if (!fs.existsSync(TRACKING_FILE)) return [];
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  } catch { return []; }
}

function savePings(pings) {
  const dir = path.dirname(TRACKING_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(pings, null, 2));
}

// POST /api/tracking/ping
// Register a cargo location ping (shipment/truck moving along a corridor).
router.post('/ping', (req, res) => {
  const {
    matchId, truckId, shipmentId, border, route, status, lat, lng, note,
  } = req.body;

  if (!matchId && !truckId && !shipmentId) {
    return res.status(400).json({ error: 'matchId, truckId or shipmentId required' });
  }
  if (!border) return res.status(400).json({ error: 'border required' });

  const ping = {
    id: `trk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    matchId: matchId || null,
    truckId: truckId || null,
    shipmentId: shipmentId || null,
    border: String(border).toUpperCase(),
    route: route || '',
    status: status || 'in_transit',
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
    note: note || '',
    at: new Date().toISOString(),
  };

  const pings = loadPings();
  pings.push(ping);
  savePings(pings.slice(-MAX_PINGS));

  nebula.postCorridorEvent('cargo.tracking', ping);

  res.status(201).json({ ok: true, ping });
});

// GET /api/tracking/latest?border=...&limit=...
router.get('/latest', (req, res) => {
  const { border, limit } = req.query;
  let pings = loadPings();
  if (border) pings = pings.filter(p => p.border === String(border).toUpperCase());
  pings.reverse();
  const n = Math.min(Number(limit) || 20, MAX_PINGS);
  res.json({ ok: true, results: pings.slice(0, n) });
});

module.exports = router;