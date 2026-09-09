export type MarketCashPaymentTarget = {
  kind: 'subscription' | 'credits';
  label: string;
  amountUsd: number;
  metadata?: Record<string, string | number>;
};

export type MarketCashCardInput = {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
};

export type MarketCashCardScanData = Partial<Omit<MarketCashCardInput, 'cvv'>> & { cardReference?: string };
export type CardNetwork = 'market-cash' | 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

export type MarketCashPaymentResult = {
  success: boolean;
  status?: string;
  transactionId?: string;
  reference?: string;
  message?: string;
  raw?: unknown;
};

const digits = (value: string) => value.replace(/\D/g, '');

export function normalizeCardNumber(value: string) {
  return digits(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
}

export function normalizeExpiry(value: string) {
  const clean = digits(value).slice(0, 4);
  return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
}

export function detectCardNetwork(value: string): CardNetwork {
  const pan = digits(value);
  if (!pan) return 'unknown';

  // Market-Cash reserves 5585. Do not announce Mastercard too early while the
  // user is still typing 55 / 558 because those prefixes are ambiguous.
  if (pan.startsWith('5585')) return 'market-cash';
  if (pan === '5' || pan === '55' || pan === '558') return 'unknown';

  if (/^4/.test(pan)) return 'visa';

  const first2 = Number(pan.slice(0, 2));
  const first4 = Number(pan.slice(0, 4));
  if (pan.length >= 2 && first2 >= 51 && first2 <= 54) return 'mastercard';
  if (pan.length >= 4 && first2 === 55) return 'mastercard';
  if (pan.length >= 4 && first4 >= 2221 && first4 <= 2720) return 'mastercard';

  if (/^3[47]/.test(pan)) return 'amex';
  if (/^(6011|65|64[4-9])/.test(pan)) return 'discover';
  return 'unknown';
}

export function cardNetworkLabel(network: CardNetwork) {
  return ({ 'market-cash': 'Market-Cash', visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover', unknown: 'Carte' } as const)[network];
}

function nativeCardReference(value: string) {
  const text = String(value || '').trim();
  const match = text.match(/(?:MARKET-CASH-CARD\s*:\s*)?(MCL-[A-Z0-9_-]{4,120})/i);
  return match?.[1]?.toUpperCase() || '';
}

export function parseMarketCashCardPayload(raw: string): MarketCashCardScanData {
  const text = String(raw || '').trim();
  if (!text) return {};
  const reference = nativeCardReference(text);
  if (reference) return { cardReference: reference };
  let payload: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(text.includes('?') ? text.split('?').slice(1).join('?') : text);
    payload = Object.fromEntries(params.entries());
  }
  const embeddedReference = nativeCardReference(String(payload.cardReference ?? payload.cardIdentifier ?? payload.reference ?? ''));
  const cardNumber = String(payload.cardNumber ?? payload.pan ?? payload.number ?? '').replace(/\D/g, '').slice(0, 19);
  const cardHolder = String(payload.cardHolder ?? payload.holder ?? payload.name ?? '').trim().slice(0, 80);
  const expiry = normalizeExpiry(String(payload.expiry ?? payload.exp ?? payload.expiration ?? ''));
  return {
    ...(embeddedReference ? { cardReference: embeddedReference } : {}),
    ...(cardNumber ? { cardNumber } : {}),
    ...(cardHolder ? { cardHolder } : {}),
    ...(expiry ? { expiry } : {}),
  };
}

export async function resolveMarketCashCardPayload(raw: string): Promise<MarketCashCardScanData> {
  const parsed = parseMarketCashCardPayload(raw);
  if (parsed.cardNumber && parsed.cardHolder && parsed.expiry) return parsed;
  if (!parsed.cardReference) return parsed;
  const response = await fetch('/api/market-cash/card-capture', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardReference: parsed.cardReference }),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok || payload?.resolved !== true) throw new Error(payload?.error || 'Cette carte Market-Cash n’a pas pu être reconnue par le QR/NFC.');
  const cardNumber = digits(String(payload.cardNumber || '')).slice(0, 19);
  const cardHolder = String(payload.cardHolder || '').trim().slice(0, 80);
  const expiry = normalizeExpiry(String(payload.expiry || ''));
  if (!cardNumber || !cardHolder || !/^\d{2}\/\d{2}$/.test(expiry)) throw new Error('Les informations retournées par Market-Cash sont incomplètes.');
  return { cardNumber, cardHolder, expiry, cardReference: parsed.cardReference };
}

export async function payWithMarketCashCard(params: {
  target: MarketCashPaymentTarget;
  card: MarketCashCardInput;
  captureMethod: 'manual' | 'qr' | 'nfc';
  userId?: string;
  userEmail?: string;
}): Promise<MarketCashPaymentResult> {
  const pan = digits(params.card.cardNumber);
  const network = detectCardNetwork(pan);
  const endpoint = network === 'market-cash' ? '/api/market-cash/payments' : '/api/card-payments/pay';
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target: params.target,
      paymentMethod: 'card', network,
      card: { cardNumber: pan, cardHolder: params.card.cardHolder.trim(), expiry: params.card.expiry.trim(), cvv: digits(params.card.cvv) },
      captureMethod: params.captureMethod, cvvEntry: 'manual', userId: params.userId, userEmail: params.userEmail,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Paiement ${cardNetworkLabel(network)} indisponible (${response.status}).`);
  return payload as MarketCashPaymentResult;
}
