/**
 * Payment routes — mobile money payments + escrow
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const nebula = require('../nebula');
const momo = require('../momo');

const router = express.Router();
const TXNS_FILE = path.join(__dirname, '../../../data/payments.json');

const FX_RATES = { UGX: 3720, KES: 129, TZS: 2550, RWF: 1130, USD: 1 };

function loadTxns() {
  try {
    if (!fs.existsSync(TXNS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TXNS_FILE, 'utf8'));
  } catch { return []; }
}

function saveTxns(txns) {
  const dir = path.dirname(TXNS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TXNS_FILE, JSON.stringify(txns, null, 2));
}

// POST /api/payment/pay
// Initiate a payment (escrow by default for matched trades)
router.post('/pay', async (req, res, next) => {
  try {
    const {
      amount, currency, provider, payerPhone, payeePhone,
      matchId, reference, escrow = true,
    } = req.body;

    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount required' });
    if (!currency || !FX_RATES[currency]) return res.status(400).json({ error: 'unsupported currency' });
    if (!provider) return res.status(400).json({ error: 'provider required' });
    if (!payerPhone || !payeePhone) return res.status(400).json({ error: 'payerPhone and payeePhone required' });
    if (!reference) return res.status(400).json({ error: 'reference required' });

    const providers = ['mtn_momo', 'airtel_money', 'tigo_pesa', 'bank_transfer', 'cash'];
    if (!providers.includes(provider)) return res.status(400).json({ error: 'unsupported provider' });

    const txn = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reference,
      type: escrow ? 'escrow' : 'deposit',
      amount: Number(amount),
      currency,
      provider,
      payerPhone,
      payeePhone,
      matchId: matchId || null,
      status: escrow ? 'in_escrow' : 'released',
      escrowId: null,
      createdAt: new Date().toISOString(),
    };

    // P2: real MTN MoMo push when sandbox keys are configured; simulated otherwise.
    let externalTxnId = `sim_${txn.id}`;
    if (provider === 'mtn_momo' && momo.isConfigured()) {
      const r2p = await momo.requestToPay(payerPhone, Number(amount), currency, reference);
      if (!r2p.xref) throw new Error('MoMo did not return a reference');
      externalTxnId = r2p.xref;
      txn.externalTransactionId = externalTxnId;
    }
    txn.externalTransactionId = externalTxnId;

    // Escrow record for matched trades
    if (escrow && matchId) {
      txn.escrowId = `esc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const escrowRecord = {
        id: txn.escrowId,
        matchId,
        buyerPhone: payerPhone,
        sellerPhone: payeePhone,
        amount: Number(amount),
        currency,
        provider,
        status: 'funded',
        createdAt: new Date().toISOString(),
      };
      const escrows = loadEscrows();
      escrows.push(escrowRecord);
      saveEscrows(escrows);
    }

    const txns = loadTxns();
    txns.push(txn);
    saveTxns(txns);

    nebula.postCorridorEvent('escrow.funded', {
      escrowId: txn.escrowId,
      matchId: txn.matchId,
      reference: txn.reference,
      amount: txn.amount,
      currency: txn.currency,
      provider: txn.provider,
      payerPhone: txn.payerPhone,
      payeePhone: txn.payeePhone,
      at: txn.createdAt,
    });

    res.status(201).json({ ok: true, transaction: txn });
  } catch (err) {
    next(err);
  }
});

function loadEscrows() {
  const file = path.join(__dirname, '../../../data/escrows.json');
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return []; }
}

function saveEscrows(escrows) {
  const dir = path.dirname(TXNS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'escrows.json'), JSON.stringify(escrows, null, 2));
}

// POST /api/payment/release
// Release escrow to seller (buyer confirmed receipt)
router.post('/release', (req, res) => {
  const { escrowId } = req.body;
  const escrows = loadEscrows();
  const escrow = escrows.find(e => e.id === escrowId);
  if (!escrow) return res.status(404).json({ error: 'Escrow not found' });

  if (escrow.status === 'released') {
    return res.status(400).json({ error: 'Escrow already released' });
  }
  if (escrow.status === 'refunded') {
    return res.status(400).json({ error: 'Escrow already refunded' });
  }

  escrow.status = 'released';
  escrow.releasedTo = 'seller';
  saveEscrows(escrows);

  const txn = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    reference: `release_${escrowId}`,
    type: 'release',
    amount: escrow.amount,
    currency: escrow.currency,
    provider: escrow.provider,
    phone: escrow.sellerPhone,
    status: 'released',
    escrowId,
    createdAt: new Date().toISOString(),
  };
  const txns = loadTxns();
  txns.push(txn);
  saveTxns(txns);

  nebula.postCorridorEvent('escrow.released', {
    escrowId,
    matchId: escrow.matchId,
    amount: escrow.amount,
    currency: escrow.currency,
    provider: escrow.provider,
    sellerPhone: escrow.sellerPhone,
    at: txn.createdAt,
  });

  res.json({ ok: true, escrow });
});

// POST /api/payment/refund
router.post('/refund', (req, res) => {
  const { escrowId } = req.body;
  const escrows = loadEscrows();
  const escrow = escrows.find(e => e.id === escrowId);
  if (!escrow) return res.status(404).json({ error: 'Escrow not found' });

  escrow.status = 'refunded';
  escrow.releasedTo = 'buyer';
  saveEscrows(escrows);

  const txn = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    reference: `refund_${escrowId}`,
    type: 'refund',
    amount: escrow.amount,
    currency: escrow.currency,
    provider: escrow.provider,
    phone: escrow.buyerPhone,
    status: 'refunded',
    escrowId,
    createdAt: new Date().toISOString(),
  };
  const txns = loadTxns();
  txns.push(txn);
  saveTxns(txns);

  nebula.postCorridorEvent('escrow.refunded', {
    escrowId,
    matchId: escrow.matchId,
    amount: escrow.amount,
    currency: escrow.currency,
    provider: escrow.provider,
    payerPhone: escrow.buyerPhone,
    at: txn.createdAt,
  });

  res.json({ ok: true, escrow });
});

// GET /api/payment/transactions?phone=...
router.get('/transactions', (req, res) => {
  const { phone } = req.query;
  let txns = loadTxns();
  if (phone) {
    txns = txns.filter(t => t.payerPhone === phone || t.payeePhone === phone || t.phone === phone);
  }
  txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, results: txns });
});

// GET /api/payment/escrow/:matchId
router.get('/escrow/:matchId', (req, res) => {
  const escrow = loadEscrows().find(e => e.matchId === req.params.matchId);
  res.json({ ok: true, escrow: escrow || null });
});

// GET /api/payment/rates
router.get('/rates', (req, res) => {
  res.json({ ok: true, fxRates: FX_RATES });
});

// GET /api/payment/momo/status/:reference — poll an MTN MoMo request-to-pay
router.get('/momo/status/:reference', async (req, res, next) => {
  try {
    const result = await momo.getTransactionStatus(req.params.reference);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;