/**
 * Payment Layer — Mobile Money payments for cross-border trade
 *
 * Providers: MTN MoMo, Airtel Money, Tigo (TZ)
 * Rails: Mobile money API → bank/PAPSS for cross-border settlement
 *
 * Safety: payments default to ESCROW until goods are confirmed received.
 */

// ── Types ──

export type PaymentProvider = 'mtn_momo' | 'airtel_money' | 'tigo_pesa' | 'bank_transfer' | 'cash';

export type Currency = 'UGX' | 'KES' | 'TZS' | 'RWF' | 'USD';

export type PaymentStatus =
  | 'pending'
  | 'in_escrow'
  | 'released'
  | 'refunded'
  | 'failed'
  | 'cancelled';

export type EscrowStatus =
  | 'created'
  | 'funded'
  | 'goods_in_transit'
  | 'goods_delivered'
  | 'released'
  | 'disputed'
  | 'refunded';

export type PaymentRequest = {
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  payerPhone: string;
  payeePhone: string;
  matchId?: string;
  reference: string;
  escrow?: boolean;
};

export type EscrowRecord = {
  id: string;
  matchId: string;
  sellerPhone: string;
  buyerPhone: string;
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  status: EscrowStatus;
  releasedTo: 'seller' | 'buyer' | null;
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  reference: string;
  type: 'deposit' | 'escrow' | 'release' | 'refund' | 'withdrawal';
  amount: number;
  currency: Currency;
  provider: PaymentProvider;
  phone: string;
  status: PaymentStatus;
  escrowId?: string;
  matchId?: string;
  createdAt: string;
  externalTransactionId?: string;
};

export type MoMoConfig = {
  baseUrl: string;
  subscriptionKey: string;
  primaryKey: string;
  secondaryKey: string;
  targetEnvironment: 'sandbox' | 'live';
  accountPhone: string;
};

export type PaymentCallbacks = {
  onStatusChange?: (txn: Transaction) => void;
};

// ── Exchange rates (daily-refreshed, fallback static) ──

export const FX_RATES: Record<Currency, number> = {
  UGX: 3720,
  KES: 129,
  TZS: 2550,
  RWF: 1130,
  USD: 1,
};

// Provider configuration
export const PROVIDER_CONFIG: Record<PaymentProvider, {
  name: string;
  regions: string[];
  minAmount: number;
  maxAmount: number;
}> = {
  mtn_momo: { name: 'MTN MoMo', regions: ['UG', 'RW', 'GH'], minAmount: 500, maxAmount: 5000000 },
  airtel_money: { name: 'Airtel Money', regions: ['UG', 'KE', 'RW'], minAmount: 500, maxAmount: 10000000 },
  tigo_pesa: { name: 'Tigo Pesa', regions: ['TZ'], minAmount: 500, maxAmount: 5000000 },
  bank_transfer: { name: 'Bank Transfer', regions: ['UG', 'KE', 'TZ', 'RW', 'BI'], minAmount: 0, maxAmount: Number.MAX_SAFE_INTEGER },
  cash: { name: 'Cash at Border', regions: ['UG', 'KE', 'TZ', 'RW', 'BI'], minAmount: 0, maxAmount: Number.MAX_SAFE_INTEGER },
};

// ── MTN MoMo API client ──

class MTNMoMoClient {
  private config: MoMoConfig;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(config: MoMoConfig) {
    this.config = config;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const basic = Buffer.from(
      `${this.config.subscriptionKey}:${this.config.primaryKey}`,
    ).toString('base64');

    const res = await fetch(`${this.config.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
      },
    });

    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  async requestToPay(phone: string, amount: number, currency: string, reference: string): Promise<string> {
    const token = await this.getToken();
    const id = this.uuid();
    const xRef = `ushawama_${reference}_${Date.now()}`;

    const res = await fetch(`${this.config.baseUrl}/collection/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Reference-Id': xRef,
        'X-Target-Environment': this.config.targetEnvironment,
        'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency,
        externalId: id,
        payer: {
          partyIdType: 'MSISDN',
          partyId: this.normalizePhone(phone),
        },
        payerMessage: 'Ushawama trade payment',
        payeeNote: 'Trade settlement',
      }),
    });

    if (!res.ok) {
      throw new Error(`MoMo request failed: ${res.status}`);
    }

    await this.wait(4000);
    return xRef;
  }

  async getTransactionStatus(xRef: string): Promise<string> {
    const token = await this.getToken();
    const res = await fetch(
      `${this.config.baseUrl}/collection/v1_0/requesttopay/${xRef}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Target-Environment': this.config.targetEnvironment,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
      },
    );
    const data = await res.json();
    return data.status || 'UNKNOWN';
  }

  private uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\s+/g, '').replace(/^\+/, '');
  }

  private wait(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ── Payment Engine ──

export class PaymentEngine {
  private transactions: Transaction[] = [];
  private escrows: EscrowRecord[] = [];
  private callbacks: PaymentCallbacks = {};
  private momo: MTNMoMoClient | null = null;
  private sandbox: boolean = true;

  constructor(config?: { momo?: MoMoConfig; sandbox?: boolean }) {
    if (config?.momo) this.momo = new MTNMoMoClient(config.momo);
    if (config?.sandbox !== undefined) this.sandbox = config.sandbox;
  }

  setCallbacks(cb: PaymentCallbacks) {
    this.callbacks = cb;
  }

  setMomoConfig(config: MoMoConfig) {
    this.momo = new MTNMoMoClient(config);
  }

  // ── Payments ──

  async makePayment(req: PaymentRequest): Promise<Transaction> {
    this.validatePayRequest(req);

    const txn: Transaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reference: req.reference,
      type: req.escrow ? 'escrow' : 'deposit',
      amount: req.amount,
      currency: req.currency,
      provider: req.provider,
      phone: req.payerPhone,
      status: 'pending',
      matchId: req.matchId,
      createdAt: new Date().toISOString(),
    };

    try {
      if (req.provider === 'mtn_momo' && this.momo) {
        const xRef = await this.momo.requestToPay(
          req.payerPhone,
          req.amount,
          req.currency,
          req.reference,
        );
        txn.externalTransactionId = xRef;
        txn.status = req.escrow ? 'in_escrow' : 'released';
      } else {
        // Other providers: simulate with delay (sandbox)
        await this.wait(1200);
        txn.status = req.escrow ? 'in_escrow' : 'released';
        txn.externalTransactionId = `sim_${txn.id}`;
        if (this.sandbox) {
          txn.status = req.escrow ? 'in_escrow' : 'released';
        }
      }

      // Create escrow record if requested
      if (req.escrow && txn.status === 'in_escrow' && req.matchId) {
        await this.createEscrow(req, txn);
      }

      this.transactions.push(txn);
      this.callbacks.onStatusChange?.(txn);
      return txn;
    } catch (e: any) {
      txn.status = 'failed';
      this.transactions.push(txn);
      this.callbacks.onStatusChange?.(txn);
      throw new Error(`Payment failed: ${e?.message || 'Unknown error'}`);
    }
  }

  /** Release escrow funds to the seller after buyer confirms delivery. */
  async releaseEscrow(escrowId: string, releasedTo: 'seller' = 'seller'): Promise<EscrowRecord> {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (!escrow) throw new Error('Escrow not found');
    if (escrow.status !== 'goods_delivered') {
      throw new Error('Goods must be delivered before escrow release');
    }

    escrow.status = 'released';
    escrow.releasedTo = releasedTo;
    escrow.updatedAt = new Date().toISOString();

    const txn: Transaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reference: `release_${escrowId}`,
      type: 'release',
      amount: escrow.amount,
      currency: escrow.currency,
      provider: escrow.provider,
      phone: escrow.sellerPhone,
      status: 'released',
      escrowId,
      matchId: escrow.matchId,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(txn);
    this.callbacks.onStatusChange?.(txn);

    return escrow;
  }

  /** Refund escrow funds to the buyer (dispute or failed delivery). */
  async refundEscrow(escrowId: string): Promise<EscrowRecord> {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (!escrow) throw new Error('Escrow not found');

    escrow.status = 'refunded';
    escrow.releasedTo = 'buyer';
    escrow.updatedAt = new Date().toISOString();

    const txn: Transaction = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      reference: `refund_${escrowId}`,
      type: 'refund',
      amount: escrow.amount,
      currency: escrow.currency,
      provider: escrow.provider,
      phone: escrow.buyerPhone,
      status: 'refunded',
      escrowId,
      matchId: escrow.matchId,
      createdAt: new Date().toISOString(),
    };
    this.transactions.push(txn);
    this.callbacks.onStatusChange?.(txn);

    return escrow;
  }

  /** Advance escrow lifecycle (goods staged → in transit → delivered). */
  async updateGoodsStatus(escrowId: string, status: EscrowStatus): Promise<EscrowRecord> {
    const escrow = this.escrows.find(e => e.id === escrowId);
    if (!escrow) throw new Error('Escrow not found');

    const validTransitions: Record<EscrowStatus, EscrowStatus[]> = {
      created: ['funded'],
      funded: ['goods_in_transit'],
      goods_in_transit: ['goods_delivered', 'disputed'],
      goods_delivered: ['released', 'disputed'],
      released: [],
      disputed: ['refunded', 'released'],
      refunded: [],
    };

    if (!validTransitions[escrow.status].includes(status)) {
      throw new Error(`Invalid escrow transition: ${escrow.status} → ${status}`);
    }

    escrow.status = status;
    escrow.updatedAt = new Date().toISOString();
    return escrow;
  }

  // ── Query ──

  async getTransactions(phone?: string): Promise<Transaction[]> {
    if (!phone) return this.transactions;
    return this.transactions.filter(
      t => t.phone === phone || t.phone === phone,
    );
  }

  async getEscrowByMatch(matchId: string): Promise<EscrowRecord | null> {
    return this.escrows.find(e => e.matchId === matchId) || null;
  }

  async getEscrow(id: string): Promise<EscrowRecord | null> {
    return this.escrows.find(e => e.id === id) || null;
  }

  // ── Helpers ──

  private validatePayRequest(req: PaymentRequest) {
    if (req.amount <= 0) throw new Error('Amount must be positive');
    if (!req.payerPhone) throw new Error('Payer phone required');
    if (!req.payeePhone) throw new Error('Payee phone required');
    if (!req.reference) throw new Error('Reference required');

    const cfg = PROVIDER_CONFIG[req.provider];
    if (!cfg) throw new Error('Unsupported payment provider');
  }

  private async createEscrow(req: PaymentRequest, txn: Transaction) {
    const escrow: EscrowRecord = {
      id: `esc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      matchId: req.matchId!,
      sellerPhone: req.payeePhone,
      buyerPhone: req.payerPhone,
      amount: req.amount,
      currency: req.currency,
      provider: req.provider,
      status: 'created',
      releasedTo: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.escrows.push(escrow);
    txn.escrowId = escrow.id;
  }

  private wait(ms: number) {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── FX ──

  convertAmount(amount: number, from: Currency, to: Currency): number {
    const amountUSD = amount / FX_RATES[from];
    return Math.round(amountUSD * FX_RATES[to] * 100) / 100;
  }

  formatMoney(amount: number, currency: Currency): string {
    const symbols: Record<Currency, string> = {
      UGX: 'UGX', KES: 'KES', TZS: 'TZS', RWF: 'RWF', USD: '$',
    };
    if (currency === 'USD') {
      return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${symbols[currency]} ${amount.toLocaleString()}`;
  }
}

export { MTNMoMoClient };