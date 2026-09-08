import { auth } from '../lib/firebase';
import type { MarketCashPaymentTarget } from './marketCashPaymentService';

export type MobileMoneyProvider = 'mpesa' | 'airtel' | 'orange';

export type MobileMoneyStatus = {
  mode: 'production';
  currency: string;
  country: string;
  providers: {
    mpesa: {
      enabled: boolean;
      configured: boolean;
      market?: string;
      environment?: 'production';
      endpointFamily?: string;
      serviceProviderCodeConfigured?: boolean;
    };
    airtel: { enabled: boolean; configured: boolean; status?: string };
    orange: { enabled: boolean; configured: boolean; status?: string };
  };
};

export type MpesaSandboxStatus = {
  enabled: boolean;
  configured: boolean;
  environment: 'sandbox';
  market: string;
  country: string;
  currency: string;
  testMsisdn: string;
};

export type MpesaSandboxStart = {
  ok: boolean;
  phase: 'warming';
  waitMs: number;
  environment: 'sandbox';
  moneyMoved: false;
  error?: string;
};

export type MpesaSandboxVerification = {
  ok: boolean;
  environment: 'sandbox';
  moneyMoved: false;
  httpStatus?: number;
  responseCode?: string;
  responseDesc?: string;
  conversationId?: string;
  error?: string;
};

export type MobileMoneyPaymentResult = {
  success: boolean;
  status: 'settled' | 'pending' | 'failed';
  provider: MobileMoneyProvider;
  environment?: 'production';
  transactionId?: string;
  conversationId?: string;
  responseCode?: string;
  creditsAdded?: number;
  balanceAfter?: number;
  message?: string;
};

async function authenticatedHeaders() {
  const current = auth.currentUser;
  if (!current) throw new Error('Connectez-vous avant de payer.');
  const token = await current.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function sandboxRequest<T>(path: string, timeoutMs = 25_000): Promise<T> {
  const headers = await authenticatedHeaders();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || payload?.responseDesc || `M-Pesa Sandbox a refusé la requête (${response.status}).`);
    }
    return payload as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Le serveur de prévisualisation ou M-Pesa a interrompu le test. Vous pouvez le relancer sans risque.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function getMobileMoneyStatus(): Promise<MobileMoneyStatus> {
  const response = await fetch('/api/mobile-money/status');
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Statut Mobile Money indisponible.');
  return payload as MobileMoneyStatus;
}

export async function getMpesaSandboxStatus(): Promise<MpesaSandboxStatus> {
  const headers = await authenticatedHeaders();
  const response = await fetch('/api/mobile-money/mpesa/sandbox/status', { headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Statut M-Pesa Sandbox indisponible.');
  return payload as MpesaSandboxStatus;
}

export async function startMpesaSandboxTest(): Promise<MpesaSandboxStart> {
  return sandboxRequest<MpesaSandboxStart>('/api/mobile-money/mpesa/sandbox/start');
}

export async function completeMpesaSandboxTest(): Promise<MpesaSandboxVerification> {
  return sandboxRequest<MpesaSandboxVerification>('/api/mobile-money/mpesa/sandbox/complete');
}

// Kept for compatibility with older callers.
export async function verifyMpesaSandbox(): Promise<MpesaSandboxVerification> {
  return sandboxRequest<MpesaSandboxVerification>('/api/mobile-money/mpesa/sandbox/verify', 70_000);
}

export async function payWithMobileMoney(params: {
  provider: MobileMoneyProvider;
  target: MarketCashPaymentTarget;
  msisdn: string;
  attemptId?: string;
}): Promise<MobileMoneyPaymentResult> {
  if (params.provider !== 'mpesa') {
    throw new Error('Ce réseau Mobile Money est préparé mais pas encore activé.');
  }

  const headers = await authenticatedHeaders();
  const response = await fetch('/api/mobile-money/mpesa/c2b', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      provider: params.provider,
      target: params.target,
      msisdn: params.msisdn,
      attemptId: params.attemptId || crypto.randomUUID(),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || `Paiement M-Pesa refusé (${response.status}).`);
  }
  return payload as MobileMoneyPaymentResult;
}
