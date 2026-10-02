/**
 * API Client — React Native HTTP client for Ushawama API
 */

import { Platform } from 'react-native';

let apiBase: string | null = null;

// Default base URLs by platform; override with setApiBase
const DEFAULT_BASES = {
  android: 'http://10.0.2.2:4000', // emulator loopback
  ios: 'http://localhost:4000',
  web: 'http://localhost:4000',
  default: 'http://localhost:4000',
};

export function setApiBase(url: string) {
  apiBase = url;
}

export function getApiBase(): string {
  if (apiBase) return apiBase;

  // Web: build against the same host the page was opened from (port 4000).
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `http://${window.location.hostname}:4000`;
  }

  // Native: derive the host from the Metro dev-server host (Expo Go) so it
  // works on ANY network the device loads from — LAN, hotspot, etc.
  try {
    const Constants = require('expo-constants');
    const hostUri =
      Constants?.expoConfig?.hostUri ||
      Constants?.manifest2?.extra?.expoClient?.hostUri ||
      Constants?.manifest?.debuggerHost;
    if (hostUri) return `http://${String(hostUri).split(':')[0]}:4000`;
  } catch { /* continue to platform defaults */ }

  const platform = Platform.OS as keyof typeof DEFAULT_BASES;
  return DEFAULT_BASES[platform] || DEFAULT_BASES.default;
}

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = 12000,
  } = options;

  const url = `${getApiBase()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `API error ${res.status}`);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// ── Duty ──

export const dutyApi = {
  calculate: (params: any) =>
    request('/api/duty/calculate', { method: 'POST', body: params }),
  quick: (product: string, to = 'KE', from = 'UG') =>
    request(`/api/duty/quick?product=${encodeURIComponent(product)}&to=${to}&from=${from}`),
  searchHs: (q: string, lang = 'en') =>
    request(`/api/duty/hs/search?q=${encodeURIComponent(q)}&lang=${lang}`),
  getHs: (code: string) => request(`/api/duty/hs/${code}`),
  chapters: () => request('/api/duty/chapters'),
  rates: () => request('/api/duty/rates'),
};

// ── Voice ──

export const voiceApi = {
  parse: (text: string, lang = 'en') =>
    request('/api/voice/parse', { method: 'POST', body: { text, lang } }),
  templates: (lang = 'en') => request(`/api/voice/templates?lang=${lang}`),
};

// ── Trade ──

export const tradeApi = {
  listings: (filters?: Record<string, string>) => {
    const qs = filters
      ? '?' + new URLSearchParams(filters).toString()
      : '';
    return request(`/api/trade/listings${qs}`);
  },
  create: (input: any) =>
    request('/api/trade/listings', { method: 'POST', body: input }),
  get: (id: string) => request(`/api/trade/listings/${id}`),
  setStatus: (id: string, status: string) =>
    request(`/api/trade/listings/${id}/status`, { method: 'PATCH', body: { status } }),
  matches: (userId: string) => request(`/api/trade/matches/${userId}`),
  categories: () => request('/api/trade/categories'),
};

// ── Payment ──

export const paymentApi = {
  pay: (input: any) =>
    request('/api/payment/pay', { method: 'POST', body: input }),
  release: (escrowId: string) =>
    request('/api/payment/release', { method: 'POST', body: { escrowId } }),
  refund: (escrowId: string) =>
    request('/api/payment/refund', { method: 'POST', body: { escrowId } }),
  transactions: (phone?: string) =>
    request(`/api/payment/transactions${phone ? `?phone=${phone}` : ''}`),
  escrow: (matchId: string) => request(`/api/payment/escrow/${matchId}`),
  rates: () => request('/api/payment/rates'),
  momoStatus: (reference: string) => request(`/api/payment/momo/status/${encodeURIComponent(reference)}`),
};

// ── Tracking ──

export const trackingApi = {
  ping: (input: any) =>
    request('/api/tracking/ping', { method: 'POST', body: input }),
  latest: (border?: string, limit = 20) =>
    request(`/api/tracking/latest?limit=${limit}${border ? `&border=${border}` : ''}`),
};

// ── Market (live data) ──

export const marketApi = {
  summary: () => request('/api/market/summary'),
};

export const api = { setApiBase, getApiBase, dutyApi, voiceApi, tradeApi, paymentApi, trackingApi, marketApi };
export default api;