/**
 * useMarket — React hook for the live market snapshot
 */

import { useState, useCallback, useEffect } from 'react';
import { marketApi } from '../api';

export type MarketNewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
};

export type MarketSummary = {
  builtAt: string;
  updatedAt: string;
  stale: boolean;
  fx: { rates: Record<string, number>; asOf: string } | null;
  watch: MarketNewsItem | null;
  news: MarketNewsItem[];
  sources: string[];
};

export const CURRENCY_NAMES: Record<string, string> = {
  KES: 'Kenya Shilling',
  UGX: 'Uganda Shilling',
  TZS: 'Tanzania Shilling',
  RWF: 'Rwanda Franc',
};

export function useMarket() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary((await marketApi.summary()) as MarketSummary);
    } catch (e: any) {
      setError(e?.message || 'Market feed unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { summary, loading, error, refresh };
}