import { constants, publicEncrypt } from 'node:crypto';

const DEFAULT_BASE_URL = 'https://openapi.m-pesa.com';
const LIVE_SEGMENT = 'openapi';
const DEFAULT_MARKET = 'vodacomDRC';
const DEFAULT_COUNTRY = 'DRC';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_ORIGIN = '*';
const DEFAULT_SESSION_TTL_SECONDS = 3000;
const DEFAULT_SESSION_WARMUP_MS = 0;

// Official M-Pesa OpenAPI RSA public encryption key. It is public by design;
// only merchant/API credentials remain environment secrets.
const MPESA_OPENAPI_PUBLIC_KEY_B64 =
  'MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEArv9yxA69XQKBo24BaF/D+fvlqmGdYjqLQ5WtNBb5tquqGvAvG3WMFETVUSow/LizQalxj2ElMVrUmzu5mGGkxK08bWEXF7a1DEvtVJs6nppIlFJc2SnrU14AOrIrB28ogm58JjAl5BOQawOXD5dfSk7MaAA82pVHoIqEu0FxA8BOKU+RGTihRU+ptw1j4bsAJYiPbSX6i71gfPvwHPYamM0bfI4CmlsUUR3KvCG24rB6FNPcRBhM3jDuv8ae2kC33w9hEq8qNB55uw51vK7hyXoAa+U7IqP1y6nBdlN25gkxEA8yrsl1678cspeXr+3ciRyqoRgj9RD/ONbJhhxFvt1cLBh+qwK2eqISfBb06eRnNeC71oBokDm3zyCnkOtMDGl7IvnMfZfEPFCfg5QgJVk1msPpRvQxmEsrX9MQRyFVzgy2CWNIb7c+jPapyrNwoUbANlN8adU1m6yOuoX7F49x+OjiG2se0EJ6nafeKUXw/+hiJZvELUYgzKUtMAZVTNZfT8jjb58j8GVtuS+6TM2AutbejaCV84ZK58E2CRJqhmjQibEUO6KPdD7oTlEkFy52Y1uOOBXgYpqMzufNPmfdqqqSM4dU70PO8ogyKGiLAIxCetMjjm6FCMEA3Kc8K0Ig7/XtFm9By6VxTJK1Mg36TlHaZKP6VzVLXMtesJECAwEAAQ==';

export type MpesaLiveConfig = {
  environment: 'production';
  apiKey: string;
  publicKey: string;
  baseUrl: string;
  market: string;
  country: string;
  currency: string;
  serviceProviderCode: string;
  origin: string;
  sessionTtlSeconds: number;
  sessionWarmupMs: number;
};

let sessionCache: { value: string; expiresAt: number } | null = null;

const clean = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max);

export function getMpesaLiveConfig(): MpesaLiveConfig {
  return {
    environment: 'production',
    apiKey: clean(process.env.MPESA_API_KEY, 4096),
    // Optional override is supported, but the official public key is built in.
    publicKey: String(process.env.MPESA_PUBLIC_KEY || MPESA_OPENAPI_PUBLIC_KEY_B64).trim(),
    baseUrl: DEFAULT_BASE_URL,
    market: DEFAULT_MARKET,
    country: DEFAULT_COUNTRY,
    currency: DEFAULT_CURRENCY,
    serviceProviderCode: clean(process.env.MPESA_SERVICE_PROVIDER_CODE, 32),
    // During Sandbox/preview we use the OpenAPI-compatible wildcard origin.
    // When Vodacom approves a specific production origin, MPESA_ORIGIN can override it.
    origin: clean(process.env.MPESA_ORIGIN || DEFAULT_ORIGIN, 255) || DEFAULT_ORIGIN,
    sessionTtlSeconds: DEFAULT_SESSION_TTL_SECONDS,
    sessionWarmupMs: DEFAULT_SESSION_WARMUP_MS,
  };
}

export function isMpesaLiveConfigured() {
  const config = getMpesaLiveConfig();
  return Boolean(
    config.apiKey &&
    config.publicKey &&
    config.serviceProviderCode &&
    config.market &&
    config.country &&
    config.currency,
  );
}

function normalizePublicKey(value: string) {
  const normalized = String(value || '').replace(/\\n/g, '\n').trim();
  if (!normalized) throw Object.assign(new Error('Clé publique M-Pesa absente.'), { status: 503, code: 'MPESA_PUBLIC_KEY_MISSING' });
  if (normalized.includes('-----BEGIN')) return normalized;
  const compact = normalized.replace(/\s+/g, '');
  const body = compact.match(/.{1,64}/g)?.join('\n') || compact;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

function encryptForMpesa(value: string, publicKey: string) {
  try {
    return publicEncrypt(
      { key: normalizePublicKey(publicKey), padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(value, 'utf8'),
    ).toString('base64');
  } catch (error: any) {
    throw Object.assign(
      new Error(`Impossible de préparer l'authentification M-Pesa : ${String(error?.message || error)}`),
      { status: 503, code: 'MPESA_KEY_ENCRYPTION_FAILED' },
    );
  }
}

export function normalizeMpesaLiveMsisdn(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!/^243\d{9}$/.test(digits)) {
    throw Object.assign(new Error('Numéro M-Pesa invalide. Utilisez le format +243XXXXXXXXX.'), {
      status: 400,
      code: 'MPESA_MSISDN_INVALID',
    });
  }
  return digits;
}

async function getLiveSessionId() {
  const config = getMpesaLiveConfig();
  if (!isMpesaLiveConfigured()) {
    throw Object.assign(new Error('M-Pesa C2B Live n’est pas configuré côté serveur.'), {
      status: 503,
      code: 'MPESA_NOT_CONFIGURED',
    });
  }

  if (sessionCache && sessionCache.expiresAt > Date.now() + 30_000) return sessionCache.value;

  const encryptedApiKey = encryptForMpesa(config.apiKey, config.publicKey);
  const endpoint = `${config.baseUrl}/${LIVE_SEGMENT}/ipg/v2/${encodeURIComponent(config.market)}/getSession/`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${encryptedApiKey}`,
      Origin: config.origin,
      Accept: 'application/json',
      'User-Agent': 'mungwele-ia-studio/mpesa-live-session',
    },
  });

  const payload: any = await response.json().catch(() => ({}));
  const sessionId = clean(payload?.output_SessionID, 4096);
  if (!response.ok || !sessionId) {
    throw Object.assign(
      new Error(clean(payload?.output_ResponseDesc || payload?.error || `Session M-Pesa Live refusée (${response.status}).`, 300)),
      { status: response.status >= 400 && response.status < 600 ? response.status : 502, code: 'MPESA_SESSION_FAILED' },
    );
  }

  sessionCache = { value: sessionId, expiresAt: Date.now() + config.sessionTtlSeconds * 1000 };
  if (config.sessionWarmupMs > 0) await new Promise((resolve) => setTimeout(resolve, config.sessionWarmupMs));
  return sessionId;
}

export function mpesaLiveMessage(code: string, fallback = '') {
  const messages: Record<string, string> = {
    'INS-0': 'Requête traitée avec succès.',
    'INS-1': 'Erreur interne M-Pesa.',
    'INS-6': 'La transaction a échoué.',
    'INS-9': "Délai d'attente dépassé.",
    'INS-10': 'Transaction en double.',
    'INS-13': 'Code marchand M-Pesa invalide.',
    'INS-15': 'Montant invalide.',
    'INS-17': 'Référence de transaction invalide.',
    'INS-20': 'Paramètres M-Pesa incomplets.',
    'INS-21': 'Validation des paramètres M-Pesa échouée.',
    'INS-26': 'Devise M-Pesa invalide.',
    'INS-28': 'Identifiant de conversation invalide.',
    'INS-30': "Description de l'achat invalide.",
    'INS-990': 'Limite de valeur des transactions du client dépassée.',
    'INS-991': 'Limite du nombre de transactions du client dépassée.',
    'INS-993': "Limite du nombre de transactions de l'organisation dépassée.",
    'INS-994': "Limite de valeur des transactions de l'organisation dépassée.",
    'INS-995': 'Limite de transactions API dépassée.',
    'INS-996': "API utilisée en dehors des heures d'utilisation autorisées.",
    'INS-997': "L'API M-Pesa n'est pas activée pour cette application.",
    'INS-998': 'Marché M-Pesa invalide.',
    'INS-2006': 'Solde M-Pesa insuffisant.',
    'INS-2051': 'MSISDN M-Pesa invalide.',
  };
  return messages[code] || fallback || 'Paiement M-Pesa refusé.';
}

export async function requestMpesaLiveC2B(params: {
  amountUsd: number;
  msisdn: string;
  thirdPartyConversationId: string;
  transactionReference: string;
  purchasedItemsDescription: string;
}) {
  const config = getMpesaLiveConfig();
  const sessionId = await getLiveSessionId();

  const encryptedSessionId = encryptForMpesa(sessionId, config.publicKey);
  const endpoint = `${config.baseUrl}/${LIVE_SEGMENT}/ipg/v2/${encodeURIComponent(config.market)}/c2bPayment/singleStage/`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${encryptedSessionId}`,
      Origin: config.origin,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mungwele-ia-studio/mpesa-live-c2b',
    },
    body: JSON.stringify({
      input_Amount: params.amountUsd.toFixed(2),
      input_Country: config.country,
      input_Currency: config.currency,
      input_CustomerMSISDN: params.msisdn,
      input_ServiceProviderCode: config.serviceProviderCode,
      input_ThirdPartyConversationID: params.thirdPartyConversationId,
      input_TransactionReference: params.transactionReference,
      input_PurchasedItemsDesc: clean(params.purchasedItemsDescription, 120) || 'MUNGWELE',
    }),
  });

  const payload: any = await response.json().catch(() => ({}));
  return { response, payload };
}

export function getMpesaLivePublicStatus() {
  const config = getMpesaLiveConfig();
  return {
    mode: 'production' as const,
    configured: isMpesaLiveConfigured(),
    market: config.market,
    country: config.country,
    currency: config.currency,
    serviceProviderCodeConfigured: Boolean(config.serviceProviderCode),
    endpointFamily: `${config.baseUrl}/${LIVE_SEGMENT}/ipg/v2/${config.market}`,
  };
}
