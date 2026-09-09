import { auth } from '../lib/firebase';
import type { MarketCashPaymentTarget } from './marketCashPaymentService';

export type MobileMoneyProvider = 'mpesa' | 'airtel' | 'orange' | 'afrimoney';

export type MobileMoneyProviderStatus = {
  enabled: boolean;
  configured: boolean;
  label?: string;
  status?: string;
};

export type MobileMoneyStatus = {
  mode: 'production';
  currency: string;
  country: string;
  providers: Record<MobileMoneyProvider, MobileMoneyProviderStatus>;
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

export async function getMobileMoneyStatus(): Promise<MobileMoneyStatus> {
  const response = await fetch('/api/mobile-money/status', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'Statut Mobile Money indisponible.');
  return payload as MobileMoneyStatus;
}

export async function payWithMobileMoney(params: {
  provider: MobileMoneyProvider;
  target: MarketCashPaymentTarget;
  msisdn: string;
  attemptId?: string;
}): Promise<MobileMoneyPaymentResult> {
  const headers = await authenticatedHeaders();
  const response = await fetch(`/api/mobile-money/${encodeURIComponent(params.provider)}/pay`, {
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
    throw new Error(payload?.error || payload?.message || `Paiement ${params.provider} indisponible (${response.status}).`);
  }
  return payload as MobileMoneyPaymentResult;
}
