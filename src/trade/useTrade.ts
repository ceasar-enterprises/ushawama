/**
 * useTrade — React hook for trade matching
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  TradeMatchEngine,
  Listing,
  ListingInput,
  Match,
  MatchFilters,
  BORDER_INFO,
  PRODUCT_CATEGORIES,
} from './engine';

export function useTrade(userId: string) {
  const [engine] = useState(() => new TradeMatchEngine());
  const [listings, setListings] = useState<Listing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const refresh = useCallback(async (filters?: MatchFilters) => {
    setLoading(true);
    setError(null);
    try {
      if (!initialized.current) {
        await engine.init();
        initialized.current = true;
      }
      const [newListings, newMatches] = await Promise.all([
        engine.getListings(filters),
        engine.getMatches(userId),
      ]);
      setListings(newListings);
      setMatches(newMatches);
    } catch (e: any) {
      setError(e?.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  }, [engine, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const postListing = useCallback(async (input: ListingInput) => {
    setLoading(true);
    setError(null);
    try {
      const listing = await engine.createListing(userId, input);
      await refresh();
      return listing;
    } catch (e: any) {
      setError(e?.message || 'Failed to post listing');
      return null;
    } finally {
      setLoading(false);
    }
  }, [engine, userId, refresh]);

  const acceptMatch = useCallback(async (matchId: string) => {
    await engine.updateMatchStatus(matchId, 'accepted');
    await refresh();
  }, [engine, refresh]);

  const cancelListing = useCallback(async (id: string) => {
    await engine.cancelListing(id);
    await refresh();
  }, [engine, refresh]);

  return {
    listings,
    matches,
    loading,
    error,
    refresh,
    postListing,
    acceptMatch,
    cancelListing,
    getBorderInfo: engine.getBorderInfo.bind(engine),
    categories: PRODUCT_CATEGORIES,
    borders: Object.keys(BORDER_INFO),
  };
}