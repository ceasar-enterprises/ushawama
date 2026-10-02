/**
 * momo.js — server-side MTN MoMo (collection) provider.
 * Real request-to-pay when sandbox keys are configured; otherwise reports a
 * simulated confirmation so escrow flows keep working end-to-end (offline-first).
 *
 * env:
 *   MTN_MOMO_SUBSCRIPTION_KEY   Ocp-Apim-Subscription-Key
 *   MTN_MOMO_PRIMARY_KEY        Basic-auth user for /collection/token/
 *   MTN_MOMO_SECONDARY_KEY      unused by collection (kept for parity)
 *   MTN_MOMO_TARGET_ENV         sandbox (default) | live
 *   MTN_MOMO_BASE_URL           default https://sandbox.momodeveloper.mtn.com
 *   MTN_MOMO_ACCOUNT_PHONE      the merchant/collection account number
 */

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

const SUBSCRIPTION_KEY = env('MTN_MOMO_SUBSCRIPTION_KEY', '');
const PRIMARY_KEY = env('MTN_MOMO_PRIMARY_KEY', '');
const SECONDARY_KEY = env('MTN_MOMO_SECONDARY_KEY', '');
const TARGET_ENV = env('MTN_MOMO_TARGET_ENV', 'sandbox');
const BASE_URL = env('MTN_MOMO_BASE_URL', 'https://sandbox.momodeveloper.mtn.com');
const ACCOUNT_PHONE = env('MTN_MOMO_ACCOUNT_PHONE', '');
const TIMEOUT_MS = Number(env('MTN_MOMO_TIMEOUT_MS', '10000'));

function isConfigured() {
  return Boolean(SUBSCRIPTION_KEY && PRIMARY_KEY);
}

function config() {
  return {
    configured: isConfigured(),
    environment: TARGET_ENV,
    baseUrl: BASE_URL,
    accountPhone: ACCOUNT_PHONE,
    keyHint: SUBSCRIPTION_KEY ? SUBSCRIPTION_KEY.slice(0, 4) + '…' + SUBSCRIPTION_KEY.slice(-3) : 'unset',
  };
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\s+/g, '').replace(/^\+/, '');
}

async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    if (!res.ok) {
      const detail = body ? JSON.stringify(body).slice(0, 300) : res.statusText;
      throw new Error(`MoMo ${res.status}: ${detail}`);
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

let token = null;
let tokenExpiry = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  const basic = Buffer.from(`${SUBSCRIPTION_KEY}:${PRIMARY_KEY}`).toString('base64');
  const data = await fetchJson(`${BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
    },
  });
  token = data.access_token;
  tokenExpiry = Date.now() + ((data.expires_in || 3600) - 60) * 1000;
  return token;
}

/**
 * Request payment from a MoMo wallet. Resolves the X-Reference-Id.
 * statusType: PENDING until the wallet owner approves the push.
 */
async function requestToPay(phone, amount, currency, reference) {
  if (!isConfigured()) {
    return { simulated: true, status: 'PENDING', xref: `sim_${reference}` };
  }
  const accessToken = await getToken();
  const xref = `ushawama_${reference}_${Date.now()}`;
  await fetchJson(`${BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Reference-Id': xref,
      'X-Target-Environment': TARGET_ENV,
      'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(Number(amount)),
      currency,
      externalId: uuid(),
      payer: { partyIdType: 'MSISDN', partyId: normalizePhone(phone) },
      payerMessage: 'Ushawama trade payment',
      payeeNote: 'Trade settlement',
    }),
  });
  return { simulated: false, status: 'PENDING', xref };
}

/**
 * Poll the status of a request-to-pay. Returns SUCCESSFUL/FAILED/PENDING
 * or a simulated status for non-configured runs.
 */
async function getTransactionStatus(xref) {
  if (!xref) return { simulated: true, status: 'PENDING', xref: null };
  if (xref.startsWith('sim_')) return { simulated: true, status: 'PENDING', xref };
  const accessToken = await getToken();
  const data = await fetchJson(
    `${BASE_URL}/collection/v1_0/requesttopay/${encodeURIComponent(xref)}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Target-Environment': TARGET_ENV,
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
      },
    },
  );
  return { simulated: false, status: data?.status || 'UNKNOWN', xref };
}

module.exports = { isConfigured, config, requestToPay, getTransactionStatus, normalizePhone };