/**
 * Trade routes — marketplace listings + matching
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const LISTINGS_FILE = path.join(__dirname, '../../../data/trade-listings.json');

// ── File-backed store (replaces SQLite for server) ──

function loadListings() {
  try {
    if (!fs.existsSync(LISTINGS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LISTINGS_FILE, 'utf8'));
  } catch { return []; }
}

function saveListings(listings) {
  const dir = path.dirname(LISTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LISTINGS_FILE, JSON.stringify(listings, null, 2));
}

// ── Product categories ──

const PRODUCT_CATEGORIES = {
  grains: ['maize', 'beans', 'rice', 'millet', 'sorghum', 'wheat', 'cassava', 'potatoes'],
  livestock: ['cattle', 'goats', 'sheep', 'chickens', 'pigs', 'fish'],
  cash_crops: ['coffee', 'tea', 'cotton', 'tobacco', 'vanilla', 'flowers'],
  vegetables: ['tomatoes', 'onions', 'cabbage', 'spinach', 'peppers', 'okra'],
  fruits: ['mangoes', 'bananas', 'avocados', 'pineapples', 'oranges'],
  processed: ['sugar', 'salt', 'cooking oil', 'soap', 'flour', 'dried fish'],
  textiles: ['fabric', 'clothes', 'shoes', 'bags'],
  hardware: ['tools', 'roofing sheets', 'cement', 'nails', 'pipes'],
};

function categorizeProduct(product) {
  const lower = String(product).toLowerCase();
  for (const [category, items] of Object.entries(PRODUCT_CATEGORIES)) {
    if (items.some(i => lower.includes(i))) return category;
  }
  return 'other';
}

// ── Endpoints ──

// GET /api/trade/listings
router.get('/listings', (req, res) => {
  const { role, border, country, product, verified } = req.query;
  let listings = loadListings().filter(l => l.status === 'active');

  if (role) listings = listings.filter(l => l.role === role);
  if (border) listings = listings.filter(l => l.border === String(border).toUpperCase());
  if (country) listings = listings.filter(l => l.country === country);
  if (verified) listings = listings.filter(l => l.verified);
  if (product) {
    const q = String(product).toLowerCase();
    listings = listings.filter(l => l.product.toLowerCase().includes(q));
  }
  res.json({ ok: true, results: listings });
});

// POST /api/trade/listings
router.post('/listings', (req, res) => {
  const {
    userId, role, product, quantity, unit, pricePerUnit, currency,
    location, village, district, country, border, phone, description,
  } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!product) return res.status(400).json({ error: 'product required' });
  if (!role || !['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error: 'role must be buyer or seller' });
  }
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }
  if (!Number.isFinite(Number(pricePerUnit)) || Number(pricePerUnit) < 0) {
    return res.status(400).json({ error: 'pricePerUnit must be a non-negative number' });
  }
  if (!border) return res.status(400).json({ error: 'border required' });

  const listing = {
    id: `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    role,
    product,
    productCategory: categorizeProduct(product),
    quantity: Number(quantity),
    unit: unit || 'kg',
    pricePerUnit: Number(pricePerUnit),
    currency: currency || 'USD',
    location: location || '',
    village: village || '',
    district: district || '',
    country: country || 'UG',
    border: String(border).toUpperCase(),
    phone: phone || '',
    description: description || '',
    verified: false,
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  const listings = loadListings();
  listings.push(listing);
  saveListings(listings);

  // Auto-match
  const matches = findMatches(listing).length;

  res.status(201).json({ ok: true, listing, autoMatches: matches });
});

// GET /api/trade/listings/:id
router.get('/listings/:id', (req, res) => {
  const listing = loadListings().find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json({ ok: true, listing });
});

// PATCH /api/trade/listings/:id/status
router.patch('/listings/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'matched', 'completed', 'expired', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const listings = loadListings();
  const idx = listings.findIndex(l => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Listing not found' });
  listings[idx].status = status;
  saveListings(listings);
  res.json({ ok: true, listing: listings[idx] });
});

// GET /api/trade/matches/:userId
router.get('/matches/:userId', (req, res) => {
  const listings = loadListings();
  const userListing = listings.find(l =>
    l.userId === req.params.userId && l.status === 'active',
  );
  if (!userListing) return res.json({ ok: true, results: [] });

  const matches = findMatches(userListing).filter(m =>
    m.buyerListingId === userListing.id || m.sellerListingId === userListing.id,
  );
  res.json({ ok: true, results: matches });
});

// GET /api/trade/categories
router.get('/categories', (req, res) => {
  res.json({ ok: true, categories: PRODUCT_CATEGORIES });
});

// ── Matching (server-side mirror) ──

function findMatches(newListing) {
  const listings = loadListings();
  const oppositeRole = newListing.role === 'buyer' ? 'seller' : 'buyer';
  const results = [];

  for (const candidate of listings) {
    if (candidate.userId === newListing.userId) continue;
    if (candidate.role !== oppositeRole) continue;
    if (candidate.status !== 'active') continue;

    const score = scoreMatch(newListing, candidate);
    if (score >= 40) {
      results.push({
        id: `mch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        listing: candidate,
        score,
        suggestedPrice: Math.round(
          ((newListing.pricePerUnit + candidate.pricePerUnit) / 2) * 100,
        ) / 100,
        suggestedPriceCurrency: newListing.currency,
      });
    }
  }
  return results.sort((a, b) => b.score - a.score);
}

function scoreMatch(a, b) {
  let score = 0;
  if (a.product.toLowerCase() === b.product.toLowerCase()) score += 30;
  else if (a.productCategory === b.productCategory) score += 15;
  if (a.border === b.border) score += 20;
  const buyerPrice = a.role === 'buyer' ? a.pricePerUnit : b.pricePerUnit;
  const sellerPrice = a.role === 'seller' ? a.pricePerUnit : b.pricePerUnit;
  if (buyerPrice >= sellerPrice) score += 20;
  else if ((sellerPrice - buyerPrice) / sellerPrice < 0.15) score += 10;
  const buyerQty = a.role === 'buyer' ? a.quantity : b.quantity;
  const sellerQty = a.role === 'seller' ? a.quantity : b.quantity;
  if (sellerQty >= buyerQty) score += 15;
  else score += Math.round((sellerQty / buyerQty) * 15);
  if (a.country === b.country) score += 10;
  if (a.verified && b.verified) score += 5;
  return Math.min(100, score);
}

module.exports = router;