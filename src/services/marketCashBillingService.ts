import type { MarketCashCardInput } from './marketCashPaymentService';

export type SavedMarketCashPaymentMethod = {
  id: string;
  provider: 'market-cash';
  brand: string;
  cardLast4: string;
  cardHolder: string;
  expiry: string;
  status: string;
  isDefault: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export type MarketCashBillingActivity = {
  id: string;
  type: string;
  status: string;
  label: string;
  amountUsd: number;
  reference?: string;
  failureCode?: string;
  createdAt: string;
};

export type MarketCashBillingSummary = {
  methods: SavedMarketCashPaymentMethod[];
  profile: {
    autoRenewEnabled: boolean;
    defaultPaymentMethodId: string;
    autoRenewPaymentMethodId: string;
    autoRenewPlanId: string;
    autoRenewBillingCycle: string;
    nextBillingAt: string;
    billingStatus: string;
    retryCount: number;
    lastRenewedAt: string;
    lastFailureCode: string;
  };
  subscription: { plan: string; billingCycle: string; endsAt: string };
  activity: MarketCashBillingActivity[];
};

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, init);
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || payload?.message || `Opération refusée (${response.status}).`);
  return payload as T;
}

export function getMarketCashBillingSummary() {
  return request<MarketCashBillingSummary>('/api/market-cash/billing');
}

export async function registerMarketCashPaymentMethod(card: MarketCashCardInput, makeDefault = true) {
  const payload = await request<{ ok: boolean; method: SavedMarketCashPaymentMethod }>('/api/market-cash/payment-methods/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ makeDefault, card }),
  });
  return payload.method;
}

export function setDefaultMarketCashPaymentMethod(methodId: string) {
  return request<{ ok: boolean }>('/api/market-cash/payment-methods/default', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ methodId }),
  });
}

export function removeMarketCashPaymentMethod(methodId: string) {
  return request<{ ok: boolean }>('/api/market-cash/payment-methods/remove', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ methodId }),
  });
}

export function setMarketCashAutoRenew(enabled: boolean, methodId?: string) {
  return request<{ ok: boolean; summary: MarketCashBillingSummary }>('/api/market-cash/auto-renew', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled, ...(methodId ? { methodId } : {}) }),
  });
}
