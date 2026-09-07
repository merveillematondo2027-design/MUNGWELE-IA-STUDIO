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
  const response = await fetch('/api/mobile-money/status');
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
