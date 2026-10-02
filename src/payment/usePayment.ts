/**
 * usePayment — React hook for payments
 */

import { useState, useCallback } from 'react';
import {
  PaymentEngine,
  PaymentRequest,
  Transaction,
  EscrowRecord,
  Currency,
} from './engine';

const sandboxEngine = new PaymentEngine({ sandbox: true });

export function usePayment() {
  const [engine] = useState(() => sandboxEngine);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = useCallback(async (req: PaymentRequest): Promise<Transaction | null> => {
    setLoading(true);
    setError(null);
    try {
      const txn = await engine.makePayment(req);
      const all = await engine.getTransactions();
      setTransactions(all);
      return txn;
    } catch (e: any) {
      setError(e?.message || 'Payment failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [engine]);

  const releaseEscrow = useCallback(async (escrowId: string) => {
    setLoading(true);
    try {
      await engine.releaseEscrow(escrowId);
    } catch (e: any) {
      setError(e?.message || 'Release failed');
    } finally {
      setLoading(false);
    }
  }, [engine]);

  const refund = useCallback(async (escrowId: string) => {
    setLoading(true);
    try {
      await engine.refundEscrow(escrowId);
    } catch (e: any) {
      setError(e?.message || 'Refund failed');
    } finally {
      setLoading(false);
    }
  }, [engine]);

  const getEscrow = useCallback((matchId: string) => engine.getEscrowByMatch(matchId), [engine]);

  const convert = useCallback(
    (amount: number, from: Currency, to: Currency) => engine.convertAmount(amount, from, to),
    [engine],
  );

  const formatMoney = useCallback(
    (amount: number, currency: Currency) => engine.formatMoney(amount, currency),
    [engine],
  );

  return {
    transactions,
    loading,
    error,
    pay,
    releaseEscrow,
    refund,
    getEscrow,
    convert,
    formatMoney,
  };
}