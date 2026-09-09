import { randomUUID } from 'node:crypto';
import express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';
import {
  ANNUAL_DISCOUNT_PERCENT,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_SUBSCRIPTION_PLANS,
  PRICING_VERSION,
} from '../src/config/commercialPricing';
import {
  getMpesaLivePublicStatus,
  isMpesaLiveConfigured,
  mpesaLiveMessage,
  normalizeMpesaLiveMsisdn,
  requestMpesaLiveC2B,
} from './mpesaLiveClient';

const INSTALL_FLAG = Symbol.for('mungwele.mobileMoneyLivePaymentProxyInstalled');
const APP_FLAG = Symbol.for('mungwele.mobileMoneyLiveRoutesMounted');

type Provider = 'mpesa' | 'airtel' | 'orange' | 'afrimoney';
type BillingCycle = 'monthly' | 'yearly';
type ResolvedTarget = {
  kind: 'subscription' | 'credits';
  targetId: string;
  label: string;
  amountUsd: number;
  creditsAdded: number;
  planId?: 'creator' | 'pro' | 'studio';
  billingCycle?: BillingCycle;
};

type GenericProvider = Exclude<Provider, 'mpesa'>;
type GenericProviderConfig = { label: string; keyEnv: string; urlEnv: string; merchantEnv: string };

const GENERIC_PROVIDERS: Record<GenericProvider, GenericProviderConfig> = {
  airtel: { label: 'Airtel Money', keyEnv: 'AIRTEL_MONEY_API_KEY', urlEnv: 'AIRTEL_MONEY_API_URL', merchantEnv: 'AIRTEL_MONEY_MERCHANT_ID' },
  orange: { label: 'Orange Money', keyEnv: 'ORANGE_MONEY_API_KEY', urlEnv: 'ORANGE_MONEY_API_URL', merchantEnv: 'ORANGE_MONEY_MERCHANT_ID' },
  afrimoney: { label: 'Afrimoney', keyEnv: 'AFRIMONEY_API_KEY', urlEnv: 'AFRIMONEY_API_URL', merchantEnv: 'AFRIMONEY_MERCHANT_ID' },
};

const DEFAULT_PRICING = {
  annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
  creditPacks: LAUNCH_CREDIT_PACKS.map((item) => ({ ...item })),
  subscriptionPlans: LAUNCH_SUBSCRIPTION_PLANS.map((item) => ({ ...item, features: [...item.features] })),
};

const clean = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max);
const money = (value: number) => Math.round(value * 100) / 100;

function fail(message: string, status = 400, code = 'MOBILE_MONEY_REQUEST_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

function normalizeAttemptId(value: unknown) {
  const id = clean(value, 72).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return randomUUID();
  if (id.length < 8) throw fail('Identifiant de tentative invalide.', 400, 'PAYMENT_ATTEMPT_INVALID');
  return id;
}

function normalizeGenericMsisdn(value: unknown) {
  const raw = String(value || '').replace(/\D/g, '');
  if (raw.length < 9 || raw.length > 15) throw fail('Numéro Mobile Money invalide.', 400, 'MSISDN_INVALID');
  if (raw.startsWith('243')) return raw;
  return `243${raw.replace(/^0/, '')}`;
}

async function requireUser(req: express.Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw fail('Connexion requise pour payer.', 401, 'AUTH_REQUIRED');
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7).trim());
    return { uid: decoded.uid, email: String(decoded.email || '') };
  } catch {
    throw fail('Session Firebase invalide ou expirée.', 401, 'AUTH_INVALID');
  }
}

async function loadPricing() {
  try {
    const snap = await adminDb.doc('appSettings/pricing').get();
    const data: any = snap.data() || {};
    if (Number(data.pricingVersion) !== PRICING_VERSION) return DEFAULT_PRICING;
    return {
      annualDiscountPercent: Number.isFinite(Number(data.annualDiscountPercent)) ? Number(data.annualDiscountPercent) : DEFAULT_PRICING.annualDiscountPercent,
      creditPacks: Array.isArray(data.creditPacks) && data.creditPacks.length ? data.creditPacks : DEFAULT_PRICING.creditPacks,
      subscriptionPlans: Array.isArray(data.subscriptionPlans) && data.subscriptionPlans.length ? data.subscriptionPlans : DEFAULT_PRICING.subscriptionPlans,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

async function resolveTarget(target: any): Promise<ResolvedTarget> {
  if (!target?.kind) throw fail('Achat MUNGWELE invalide.', 400, 'TARGET_REQUIRED');
  const pricing = await loadPricing();
  const metadata = target.metadata || {};

  if (target.kind === 'credits') {
    const packId = clean(metadata.packId, 80);
    const pack: any = pricing.creditPacks.find((item: any) => String(item.id) === packId && item.enabled !== false);
    if (!pack) throw fail('Pack de crédits introuvable.', 400, 'CREDIT_PACK_INVALID');
    const creditsAdded = Math.max(0, Math.floor(Number(pack.credits || 0)));
    const amountUsd = money(Number(pack.priceUsd || 0));
    if (!creditsAdded || !amountUsd) throw fail('Configuration du pack invalide.', 500, 'CREDIT_PACK_CONFIG_INVALID');
    return { kind: 'credits', targetId: packId, label: `${creditsAdded} crédits MUNGWELE`, amountUsd, creditsAdded };
  }

  const rawPlanId = clean(metadata.planId, 40);
  if (!['creator', 'pro', 'studio'].includes(rawPlanId)) throw fail('Abonnement introuvable.', 400, 'SUBSCRIPTION_PLAN_INVALID');
  const planId = rawPlanId as 'creator' | 'pro' | 'studio';
  const billingCycle: BillingCycle = String(metadata.billingCycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly';
  const plan: any = pricing.subscriptionPlans.find((item: any) => String(item.id) === planId);
  if (!plan) throw fail('Abonnement introuvable.', 400, 'SUBSCRIPTION_PLAN_INVALID');
  const monthlyPrice = money(Number(plan.priceMonth || 0));
  const monthlyCredits = Math.max(0, Math.floor(Number(plan.creditsMonthly || 0)));
  if (!monthlyPrice || !monthlyCredits) throw fail("Configuration de l'abonnement invalide.", 500, 'SUBSCRIPTION_CONFIG_INVALID');
  const discount = Math.max(0, Math.min(80, Number(pricing.annualDiscountPercent || 0)));
  const amountUsd = billingCycle === 'yearly' ? money(monthlyPrice * 12 * (1 - discount / 100)) : monthlyPrice;
  return {
    kind: 'subscription', targetId: planId, planId, billingCycle,
    label: `Abonnement ${String(plan.name || planId)} ${billingCycle === 'yearly' ? 'annuel' : 'mensuel'}`,
    amountUsd,
    creditsAdded: billingCycle === 'yearly' ? monthlyCredits * 12 : monthlyCredits,
  };
}

function providerLabel(provider: Provider) {
  return provider === 'mpesa' ? 'M-Pesa' : GENERIC_PROVIDERS[provider].label;
}

function genericConfigured(provider: GenericProvider) {
  const config = GENERIC_PROVIDERS[provider];
  return Boolean(process.env[config.keyEnv] && process.env[config.urlEnv]);
}

function providerConfigured(provider: Provider) {
  return provider === 'mpesa' ? isMpesaLiveConfigured() : genericConfigured(provider);
}

function targetFingerprint(target: ResolvedTarget) {
  return [target.kind, target.targetId, target.billingCycle || '', target.amountUsd, target.creditsAdded].join('|');
}

async function prepareIntent(id: string, uid: string, provider: Provider, target: ResolvedTarget, msisdn: string) {
  const ref = adminDb.collection('mobileMoneyPaymentIntents').doc(id);
  const fingerprint = targetFingerprint(target);
  let existing: any = null;
  await adminDb.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data: any = snap.data() || {};
      if (String(data.userId || '') !== uid || String(data.provider || '') !== provider || String(data.targetFingerprint || '') !== fingerprint) {
        throw fail('Cette tentative appartient à un autre achat.', 409, 'PAYMENT_ATTEMPT_CONFLICT');
      }
      if (data.status === 'settled' && data.result) existing = data.result;
      return;
    }
    tx.create(ref, {
      id, userId: uid, provider, environment: 'production',
      targetKind: target.kind, targetId: target.targetId, targetFingerprint: fingerprint,
      amountUsd: target.amountUsd, creditsExpected: target.creditsAdded,
      msisdnMasked: `${'*'.repeat(Math.max(0, msisdn.length - 4))}${msisdn.slice(-4)}`,
      status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  });
  return { ref, existing };
}

async function settlePurchase(id: string, uid: string, provider: Provider, target: ResolvedTarget, payload: any) {
  const settlementRef = adminDb.collection('mobileMoneySettlements').doc(id);
  const intentRef = adminDb.collection('mobileMoneyPaymentIntents').doc(id);
  const userRef = adminDb.collection('users').doc(uid);
  const creditTxRef = adminDb.collection('creditTransactions').doc(`mobile-money-${provider}-${id}`);
  let result: any = null;

  await adminDb.runTransaction(async tx => {
    const [settlement, userSnap] = await Promise.all([tx.get(settlementRef), tx.get(userRef)]);
    if (settlement.exists) { result = settlement.data()?.result || null; return; }
    if (!userSnap.exists) throw fail('Profil MUNGWELE introuvable.', 404, 'USER_NOT_FOUND');
    const user: any = userSnap.data() || {};
    const balanceAfter = Math.max(0, Number(user.credits || 0)) + target.creditsAdded;
    const now = new Date();
    const nowIso = now.toISOString();
    const userUpdates: Record<string, unknown> = { credits: balanceAfter, updatedAt: nowIso };
    let plan: string | undefined;
    let subscriptionEndsAt: string | undefined;

    if (target.kind === 'subscription' && target.planId) {
      plan = target.planId;
      const end = new Date(now);
      if (target.billingCycle === 'yearly') end.setUTCFullYear(end.getUTCFullYear() + 1);
      else end.setUTCMonth(end.getUTCMonth() + 1);
      subscriptionEndsAt = end.toISOString();
      Object.assign(userUpdates, {
        plan, subscriptionCycle: target.billingCycle, subscriptionStartedAt: nowIso,
        subscriptionEndsAt, subscriptionSource: `mobile-money-${provider}`,
      });
    }

    const transactionId = clean(payload?.output_TransactionID || payload?.transactionId || payload?.transaction_id || payload?.reference || payload?.id, 120);
    const conversationId = clean(payload?.output_ConversationID || payload?.conversationId || payload?.conversation_id, 120);
    result = {
      success: true, status: 'settled', provider, environment: 'production', transactionId, conversationId,
      amountUsd: target.amountUsd, creditsAdded: target.creditsAdded, balanceAfter,
      plan, billingCycle: target.billingCycle, subscriptionEndsAt,
      message: target.kind === 'credits' ? `${target.creditsAdded} crédits ont été ajoutés.` : `${target.label} activé.`,
    };

    tx.update(userRef, userUpdates);
    tx.set(creditTxRef, {
      userId: uid, amount: target.creditsAdded, type: 'purchase', description: `${target.label} via ${providerLabel(provider)}`,
      balanceAfter, source: `mobile-money-${provider}`, providerTransactionId: transactionId || null,
      amountPaidUsd: target.amountUsd, pricingVersion: PRICING_VERSION, createdAt: nowIso,
    });
    tx.set(settlementRef, {
      id, userId: uid, provider, environment: 'production', status: 'settled',
      targetKind: target.kind, targetId: target.targetId, amountUsd: target.amountUsd,
      creditsAdded: target.creditsAdded, pricingVersion: PRICING_VERSION, result,
      createdAt: nowIso, updatedAt: nowIso,
    });
    tx.set(intentRef, { status: 'settled', result, updatedAt: nowIso }, { merge: true });
  });

  if (!result) throw fail('Paiement confirmé mais synchronisation MUNGWELE incomplète.', 500, 'SETTLEMENT_PENDING');
  return result;
}

function genericState(payload: any): 'settled' | 'pending' | 'failed' {
  const state = clean(payload?.status || payload?.paymentStatus || payload?.transactionStatus || payload?.state || payload?.result, 40).toLowerCase();
  if (['success', 'successful', 'settled', 'completed', 'paid'].includes(state)) return 'settled';
  if (payload?.success === true && Boolean(payload?.transactionId || payload?.reference || payload?.id)) return 'settled';
  if (['pending', 'processing', 'initiated', 'queued', 'waiting'].includes(state) || payload?.pending === true) return 'pending';
  return 'failed';
}

async function requestGeneric(provider: GenericProvider, target: ResolvedTarget, msisdn: string, attemptId: string) {
  const config = GENERIC_PROVIDERS[provider];
  const apiKey = String(process.env[config.keyEnv] || '').trim();
  const url = String(process.env[config.urlEnv] || '').trim();
  if (!apiKey || !url) throw fail(`API ${config.label} absente.`, 503, `${provider.toUpperCase()}_NOT_CONFIGURED`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Merchant-Id': String(process.env[config.merchantEnv] || ''),
    },
    body: JSON.stringify({
      amount: target.amountUsd,
      currency: 'USD',
      msisdn,
      reference: attemptId,
      description: target.label,
      metadata: { source: 'MUNGWELE_IA', targetKind: target.kind, targetId: target.targetId },
    }),
  });
  const payload: any = await response.json().catch(() => ({}));
  return { response, payload, state: genericState(payload) };
}

async function paymentHandler(req: express.Request, res: express.Response) {
  const provider = clean(req.params.provider, 30).toLowerCase() as Provider;
  const allowed: Provider[] = ['mpesa', 'airtel', 'orange', 'afrimoney'];
  if (!allowed.includes(provider)) return res.status(404).json({ error: 'Réseau Mobile Money inconnu.' });

  try {
    const user = await requireUser(req);
    if (!providerConfigured(provider)) throw fail(`API ${providerLabel(provider)} absente.`, 503, 'PROVIDER_NOT_CONFIGURED');
    const target = await resolveTarget(req.body?.target || {});
    const displayed = Number(req.body?.target?.amountUsd);
    if (Number.isFinite(displayed) && Math.abs(money(displayed) - target.amountUsd) > 0.009) throw fail('Le prix affiché a changé. Rechargez la page.', 409, 'PRICE_CHANGED');
    const msisdn = provider === 'mpesa' ? normalizeMpesaLiveMsisdn(req.body?.msisdn) : normalizeGenericMsisdn(req.body?.msisdn);
    const id = normalizeAttemptId(req.body?.attemptId);
    const intent = await prepareIntent(id, user.uid, provider, target, msisdn);
    if (intent.existing) return res.json(intent.existing);

    if (provider === 'mpesa') {
      const seed = id.replace(/[^a-zA-Z0-9]/g, '');
      const { response, payload } = await requestMpesaLiveC2B({
        amountUsd: target.amountUsd,
        msisdn,
        thirdPartyConversationId: `MIA${seed}`.slice(0, 40),
        transactionReference: `MIA${Date.now().toString(36)}${seed.slice(-6)}`.slice(0, 20),
        purchasedItemsDescription: clean(target.label.replace(/[^a-zA-Z0-9 À-ÿ._-]/g, ''), 120) || 'MUNGWELE',
      });
      const code = clean(payload?.output_ResponseCode, 32);
      const description = clean(payload?.output_ResponseDesc, 300);
      if (response.ok && code === 'INS-0') {
        if (clean(payload?.output_TransactionID, 120)) return res.json(await settlePurchase(id, user.uid, provider, target, payload));
        await intent.ref.set({ status: 'pending', responseCode: code, responseDesc: description, updatedAt: new Date().toISOString() }, { merge: true });
        return res.status(202).json({ success: true, status: 'pending', provider, message: description || 'Confirmation en attente.' });
      }
      throw fail(mpesaLiveMessage(code, description), response.status >= 400 ? response.status : 402, 'MPESA_PAYMENT_FAILED');
    }

    const genericProvider = provider as GenericProvider;
    const result = await requestGeneric(genericProvider, target, msisdn, id);
    if (result.response.ok && result.state === 'settled') return res.json(await settlePurchase(id, user.uid, provider, target, result.payload));
    if (result.response.ok && result.state === 'pending') {
      await intent.ref.set({ status: 'pending', providerPayload: result.payload, updatedAt: new Date().toISOString() }, { merge: true });
      return res.status(202).json({ success: true, status: 'pending', provider, message: clean(result.payload?.message || result.payload?.description, 240) || 'Confirmation en attente.' });
    }
    throw fail(clean(result.payload?.message || result.payload?.error, 240) || 'Paiement refusé.', result.response.status >= 400 ? result.response.status : 402, 'MOBILE_MONEY_PAYMENT_FAILED');
  } catch (error: any) {
    const status = Number(error?.status || 500);
    console.warn('[MUNGWELE_MOBILE_MONEY_ERROR]', provider, error?.code, String(error?.message || ''));
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false, status: 'failed', provider,
      error: String(error?.message || 'Erreur Mobile Money.'),
      code: clean(error?.code || 'MOBILE_MONEY_ERROR', 80),
    });
  }
}

export function installMobileMoneyLivePaymentProxy() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;
  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);
    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      this.get('/api/mobile-money/status', (_req: express.Request, res: express.Response) => {
        const mpesa = getMpesaLivePublicStatus();
        res.json({
          mode: 'production', currency: mpesa.currency || 'USD', country: mpesa.country || 'CD',
          providers: {
            mpesa: { enabled: true, configured: mpesa.configured, label: 'M-Pesa' },
            airtel: { enabled: true, configured: genericConfigured('airtel'), label: 'Airtel Money' },
            orange: { enabled: true, configured: genericConfigured('orange'), label: 'Orange Money' },
            afrimoney: { enabled: true, configured: genericConfigured('afrimoney'), label: 'Afrimoney' },
          },
        });
      });
      this.post('/api/mobile-money/:provider/pay', paymentHandler);
      this.post('/api/mobile-money/mpesa/c2b', (req: express.Request, res: express.Response) => {
        req.params.provider = 'mpesa';
        return paymentHandler(req, res);
      });
    }
    return result;
  };
}
