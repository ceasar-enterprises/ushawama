/**
 * Duty routes — HS code lookup + duty calculator
 */

const express = require('express');
const { DutyCalculator } = require('../../core/duty-calculator');
const { HsCodeService } = require('../../core/hs-codes');

const router = express.Router();
const dutyCalc = new DutyCalculator();
const hsService = new HsCodeService();

// POST /api/duty/calculate
// Full landed-cost breakdown
router.post('/calculate', async (req, res, next) => {
  try {
    const {
      productDescription,
      hsCode,
      quantity,
      unit,
      unitPriceUSD,
      origin,
      destination,
      border,
      tradeRegime,
    } = req.body;

    if (!productDescription && !hsCode) {
      return res.status(400).json({ error: 'productDescription or hsCode required' });
    }
    if (unitPriceUSD === undefined || unitPriceUSD === null) {
      return res.status(400).json({ error: 'unitPriceUSD required (0 allowed for missing price)' });
    }
    if (!origin || !destination) {
      return res.status(400).json({ error: 'origin and destination required' });
    }

    const result = await dutyCalc.calculate({
      productDescription,
      hsCode,
      quantity: quantity || 1,
      unit: unit || 'piece',
      unitPriceUSD,
      origin,
      destination,
      border,
      tradeRegime: tradeRegime || 'formal',
    });

    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

// GET /api/duty/quick?product=maize&to=KE&from=UG
// Quick estimate without price
router.get('/quick', async (req, res, next) => {
  try {
    const { product, to = 'KE', from = 'UG' } = req.query;
    if (!product) {
      return res.status(400).json({ error: 'product query param required' });
    }
    const result = await dutyCalc.quickEstimate(String(product), to, from);
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

// GET /api/duty/hs/search?q=maize&lang=en
router.get('/hs/search', async (req, res, next) => {
  try {
    const { q, lang = 'en' } = req.query;
    if (!q) return res.status(400).json({ error: 'q query param required' });
    const results = await hsService.search(String(q), lang);
    res.json({ ok: true, results });
  } catch (err) {
    next(err);
  }
});

// GET /api/duty/hs/:code
router.get('/hs/:code', async (req, res, next) => {
  try {
    const info = await hsService.getByCode(req.params.code);
    res.json({ ok: true, result: info });
  } catch (err) {
    next(err);
  }
});

// GET /api/duty/chapters
// All EAC duty rates by chapter
const { EAC_DUTY_RATES } = require('../../core/hs-codes');
router.get('/chapters', (req, res) => {
  res.json({ ok: true, rates: EAC_DUTY_RATES });
});

// GET /api/duty/rates
// Country VAT + STR thresholds + NTB costs
const { VAT_RATES, NTB_COSTS, STR_THRESHOLDS } = require('../../core/duty-calculator');
router.get('/rates', (req, res) => {
  res.json({ ok: true, vatRates: VAT_RATES, ntbCosts: NTB_COSTS, strThresholds: STR_THRESHOLDS });
});

module.exports = router;