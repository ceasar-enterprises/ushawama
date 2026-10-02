/**
 * Trade Match Engine — Buyer/Seller marketplace
 *
 * Handles: listing CRUD, matching algorithm, proximity ranking,
 * verification status, and border-crossing recommendations.
 */

import { Platform } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

// ── Types ──

export type UserRole = 'buyer' | 'seller';

export type ListingStatus = 'active' | 'matched' | 'completed' | 'expired' | 'cancelled';

export type Listing = {
  id: string;
  userId: string;
  role: UserRole;
  product: string;
  productCategory: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  currency: string;
  location: string;
  village?: string;
  district?: string;
  country: string;
  border: string;
  phone: string;
  description?: string;
  images?: string[];
  verified: boolean;
  status: ListingStatus;
  createdAt: string;
  expiresAt: string;
};

export type Match = {
  id: string;
  buyerListingId: string;
  sellerListingId: string;
  buyerId: string;
  sellerId: string;
  product: string;
  agreedPrice: number;
  currency: string;
  quantity: number;
  border: string;
  status: 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'disputed';
  createdAt: string;
};

export type ListingInput = {
  role: UserRole;
  product: string;
  quantity: number;
  unit?: string;
  pricePerUnit: number;
  currency?: string;
  location: string;
  village?: string;
  district?: string;
  country: string;
  border: string;
  phone: string;
  description?: string;
};

export type MatchFilters = {
  product?: string;
  country?: string;
  border?: string;
  maxPrice?: number;
  minPrice?: number;
  verified?: boolean;
  role?: UserRole;
  nearby?: { lat: number; lng: number; radiusKm: number };
};

// ── Product Categories (for grouping and matching) ──

export const PRODUCT_CATEGORIES: Record<string, string[]> = {
  grains: ['maize', 'beans', 'rice', 'millet', 'sorghum', 'wheat', 'cassava', 'potatoes'],
  livestock: ['cattle', 'goats', 'sheep', 'chickens', 'pigs', 'fish'],
  cash_crops: ['coffee', 'tea', 'cotton', 'tobacco', 'vanilla', 'flowers'],
  vegetables: ['tomatoes', 'onions', 'cabbage', 'spinach', 'peppers', 'okra'],
  fruits: ['mangoes', 'bananas', 'avocados', 'pineapples', 'oranges'],
  processed: ['sugar', 'salt', 'cooking oil', 'soap', 'flour', 'dried fish'],
  textiles: ['fabric', 'clothes', 'shoes', 'bags'],
  hardware: ['tools', 'roofing sheets', 'cement', 'nails', 'pipes'],
};

// ── Border Cost Estimates (for matching recommendations) ──

export const BORDER_INFO: Record<string, {
  crossingTime: string;
  fees: number;
  countries: string[];
  busiest: string;
}> = {
  BUSIA: {
    crossingTime: '2-4 hours',
    fees: 25,
    countries: ['UG', 'KE'],
    busiest: 'Monday-Wednesday 6am-2pm',
  },
  MALABA: {
    crossingTime: '3-6 hours',
    fees: 25,
    countries: ['UG', 'KE'],
    busiest: 'Tuesday-Thursday 7am-1pm',
  },
  NAMANGA: {
    crossingTime: '1-3 hours',
    fees: 20,
    countries: ['UG', 'KE', 'TZ'],
    busiest: 'Monday-Friday 8am-12pm',
  },
  SUAM: {
    crossingTime: '2-4 hours',
    fees: 20,
    countries: ['UG', 'KE'],
    busiest: 'Wednesday-Saturday 6am-2pm',
  },
  MOYALE: {
    crossingTime: '4-8 hours',
    fees: 30,
    countries: ['KE', 'ET'],
    busiest: 'Monday-Wednesday 7am-11am',
  },
};

// ── Engine ──

export class TradeMatchEngine {
  private db: SQLiteDatabase | null = null;
  private listings: Listing[] = [];
  private matches: Match[] = [];

  async init() {
    if (!this.db && Platform.OS !== 'web') {
      try {
        const SQLite = await import('expo-sqlite');
        this.db = await SQLite.openDatabaseAsync('ushawama_trade.db');
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        role TEXT NOT NULL,
        product TEXT NOT NULL,
        productCategory TEXT,
        quantity REAL NOT NULL,
        unit TEXT DEFAULT 'kg',
        pricePerUnit REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        location TEXT NOT NULL,
        village TEXT,
        district TEXT,
        country TEXT NOT NULL,
        border TEXT NOT NULL,
        phone TEXT NOT NULL,
        description TEXT,
        images TEXT,
        verified INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        buyerListingId TEXT NOT NULL,
        sellerListingId TEXT NOT NULL,
        buyerId TEXT NOT NULL,
        sellerId TEXT NOT NULL,
        product TEXT NOT NULL,
        agreedPrice REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        quantity REAL NOT NULL,
        border TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt TEXT NOT NULL,
        FOREIGN KEY (buyerListingId) REFERENCES listings(id),
        FOREIGN KEY (sellerListingId) REFERENCES listings(id)
      );

      CREATE INDEX IF NOT EXISTS idx_listings_product ON listings(product);
      CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
      CREATE INDEX IF NOT EXISTS idx_listings_border ON listings(border);
    `);
      } catch (e: any) {
        console.warn('[trade] SQLite unavailable, using in-memory store:', e?.message);
        this.db = null;
      }
    }
  }

  // ── Listings ──

  async createListing(userId: string, input: ListingInput): Promise<Listing> {
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const category = this.categorizeProduct(input.product);

    const listing: Listing = {
      id,
      userId,
      role: input.role,
      product: input.product,
      productCategory: category,
      quantity: input.quantity,
      unit: input.unit || 'kg',
      pricePerUnit: input.pricePerUnit,
      currency: input.currency || 'USD',
      location: input.location,
      village: input.village,
      district: input.district,
      country: input.country,
      border: input.border.toUpperCase(),
      phone: input.phone,
      description: input.description,
      verified: false,
      status: 'active',
      createdAt: now,
      expiresAt: expires,
    };

    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO listings (id, userId, role, product, productCategory, quantity, unit,
         pricePerUnit, currency, location, village, district, country, border, phone,
         description, verified, status, createdAt, expiresAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, userId, listing.role, listing.product, category, listing.quantity, listing.unit,
        listing.pricePerUnit, listing.currency, listing.location, listing.village || '',
        listing.district || '', listing.country, listing.border, listing.phone,
        listing.description || '', 0, 'active', now, expires,
      );
    }

    this.listings.push(listing);

    // Auto-match after creating
    await this.findMatches(listing);

    return listing;
  }

  async getListings(filters?: MatchFilters): Promise<Listing[]> {
    if (this.db) {
      let query = 'SELECT * FROM listings WHERE status = ?';
      const params: any[] = ['active'];

      if (filters?.role) {
        query += ' AND role = ?';
        params.push(filters.role);
      }
      if (filters?.border) {
        query += ' AND border = ?';
        params.push(filters.border.toUpperCase());
      }
      if (filters?.country) {
        query += ' AND country = ?';
        params.push(filters.country);
      }
      if (filters?.product) {
        query += ' AND LOWER(product) LIKE ?';
        params.push(`%${filters.product.toLowerCase()}%`);
      }
      if (filters?.verified) {
        query += ' AND verified = 1';
      }

      query += ' ORDER BY createdAt DESC';

      const rows = await this.db.getAllAsync(query, ...params);
      return (rows as any[]).map(this.rowToListing);
    }

    // In-memory fallback
    return this.listings.filter(l => {
      if (l.status !== 'active') return false;
      if (filters?.role && l.role !== filters.role) return false;
      if (filters?.border && l.border !== filters.border.toUpperCase()) return false;
      if (filters?.country && l.country !== filters.country) return false;
      if (filters?.product && !l.product.toLowerCase().includes(filters.product.toLowerCase())) return false;
      if (filters?.verified && !l.verified) return false;
      return true;
    });
  }

  async getListingById(id: string): Promise<Listing | null> {
    if (this.db) {
      const row = await this.db.getFirstAsync('SELECT * FROM listings WHERE id = ?', id);
      return row ? this.rowToListing(row) : null;
    }
    return this.listings.find(l => l.id === id) || null;
  }

  async cancelListing(id: string): Promise<boolean> {
    if (this.db) {
      await this.db.runAsync("UPDATE listings SET status = 'cancelled' WHERE id = ?", id);
    }
    const listing = this.listings.find(l => l.id === id);
    if (listing) listing.status = 'cancelled';
    return true;
  }

  // ── Matching Algorithm ──

  async findMatches(newListing: Listing): Promise<Match[]> {
    const oppositeRole = newListing.role === 'buyer' ? 'seller' : 'buyer';
    const candidates = await this.getListings({
      role: oppositeRole,
      product: newListing.product,
      border: newListing.border,
    });

    const matches: Match[] = [];

    for (const candidate of candidates) {
      if (candidate.userId === newListing.userId) continue;
      if (candidate.status !== 'active') continue;

      // Score the match
      const score = this.scoreMatch(newListing, candidate);
      if (score >= 40) {
        const match = await this.createMatch(
          newListing.role === 'buyer' ? newListing : candidate,
          newListing.role === 'seller' ? newListing : candidate,
        );
        matches.push(match);
      }
    }

    return matches;
  }

  private scoreMatch(a: Listing, b: Listing): number {
    let score = 0;

    // Product match (30 pts)
    if (a.product.toLowerCase() === b.product.toLowerCase()) {
      score += 30;
    } else if (a.productCategory === b.productCategory) {
      score += 15;
    }

    // Border match (20 pts)
    if (a.border === b.border) score += 20;

    // Price overlap (20 pts) — buyer max >= seller min
    const buyerPrice = a.role === 'buyer' ? a.pricePerUnit : b.pricePerUnit;
    const sellerPrice = a.role === 'seller' ? a.pricePerUnit : b.pricePerUnit;
    if (buyerPrice >= sellerPrice) {
      score += 20;
    } else {
      const gap = (sellerPrice - buyerPrice) / sellerPrice;
      if (gap < 0.15) score += 10; // Within 15%
    }

    // Quantity overlap (15 pts)
    const buyerQty = a.role === 'buyer' ? a.quantity : b.quantity;
    const sellerQty = a.role === 'seller' ? a.quantity : b.quantity;
    if (sellerQty >= buyerQty) {
      score += 15;
    } else {
      score += Math.round((sellerQty / buyerQty) * 15);
    }

    // Same country bonus (10 pts)
    if (a.country === b.country) score += 10;

    // Verified bonus (5 pts)
    if (a.verified && b.verified) score += 5;

    return Math.min(100, score);
  }

  private async createMatch(buyerListing: Listing, sellerListing: Listing): Promise<Match> {
    const id = `mch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const agreedPrice = (buyerListing.pricePerUnit + sellerListing.pricePerUnit) / 2;
    const quantity = Math.min(buyerListing.quantity, sellerListing.quantity);

    const match: Match = {
      id,
      buyerListingId: buyerListing.id,
      sellerListingId: sellerListing.id,
      buyerId: buyerListing.userId,
      sellerId: sellerListing.userId,
      product: buyerListing.product,
      agreedPrice,
      currency: buyerListing.currency,
      quantity,
      border: buyerListing.border,
      status: 'pending',
      createdAt: now,
    };

    if (this.db) {
      await this.db.runAsync(
        `INSERT INTO matches (id, buyerListingId, sellerListingId, buyerId, sellerId,
         product, agreedPrice, currency, quantity, border, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id, match.buyerListingId, match.sellerListingId, match.buyerId, match.sellerId,
        match.product, match.agreedPrice, match.currency, match.quantity, match.border,
        'pending', now,
      );

      // Mark listings as matched
      await this.db.runAsync("UPDATE listings SET status = 'matched' WHERE id = ?", buyerListing.id);
      await this.db.runAsync("UPDATE listings SET status = 'matched' WHERE id = ?", sellerListing.id);
    }

    buyerListing.status = 'matched';
    sellerListing.status = 'matched';
    this.matches.push(match);

    return match;
  }

  async getMatches(userId: string): Promise<Match[]> {
    if (this.db) {
      const rows = await this.db.getAllAsync(
        'SELECT * FROM matches WHERE buyerId = ? OR sellerId = ? ORDER BY createdAt DESC',
        userId, userId,
      );
      return (rows as any[]).map(r => ({
        ...r,
        verified: !!r.verified,
      })) as Match[];
    }
    return this.matches.filter(m => m.buyerId === userId || m.sellerId === userId);
  }

  async updateMatchStatus(matchId: string, status: Match['status']): Promise<boolean> {
    if (this.db) {
      await this.db.runAsync('UPDATE matches SET status = ? WHERE id = ?', status, matchId);
    }
    const match = this.matches.find(m => m.id === matchId);
    if (match) match.status = status;
    return true;
  }

  // ── Helpers ──

  private categorizeProduct(product: string): string {
    const lower = product.toLowerCase();
    for (const [category, items] of Object.entries(PRODUCT_CATEGORIES)) {
      if (items.some(item => lower.includes(item))) return category;
    }
    return 'other';
  }

  private rowToListing(row: any): Listing {
    return {
      id: row.id,
      userId: row.userId,
      role: row.role,
      product: row.product,
      productCategory: row.productCategory,
      quantity: row.quantity,
      unit: row.unit,
      pricePerUnit: row.pricePerUnit,
      currency: row.currency,
      location: row.location,
      village: row.village,
      district: row.district,
      country: row.country,
      border: row.border,
      phone: row.phone,
      description: row.description,
      verified: !!row.verified,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    };
  }

  // ── Border Info ──

  getBorderInfo(border: string) {
    return BORDER_INFO[border.toUpperCase()] || null;
  }

  getCategories() {
    return PRODUCT_CATEGORIES;
  }
}
