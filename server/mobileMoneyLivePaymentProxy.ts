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

type TargetKind = 'subscription' | 'credits';
type BillingCycle = 'monthly' | 'yearly';

type PaymentTarget = {
  kind?: TargetKind;
  amountUsd?: number;
  metadata?: Record<string, string | number>;
};

type ResolvedTarget = {
  kind: TargetKind;
  targetId: string;
  label: string;
  amountUsd: number;
  creditsAdded: number;
  planId?: 'creator' | 'pro' | 'studio';
  billingCycle?: BillingCycle;
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
      annualDiscountPercent: Number.isFinite(Number(data.annualDiscountPercent))
        ? Number(data.annualDiscountPercent)
        : DEFAULT_PRICING.annualDiscountPercent,
      creditPacks: Array.isArray(data.creditPacks) && data.creditPacks.length
        ? data.creditPacks
        : DEFAULT_PRICING.creditPacks,
      subscriptionPlans: Array.isArray(data.subscriptionPlans) && data.subscriptionPlans.length
        ? data.subscriptionPlans
        : DEFAULT_PRICING.subscriptionPlans,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

async function resolveTarget(target: PaymentTarget): Promise<ResolvedTarget> {
  if (!target?.kind) throw fail('Achat MUNGWELE invalide.', 400, 'TARGET_REQUIRED');
  const pricing = await loadPricing();
  const metadata = target.metadata || {};

  if (target.kind === 'credits') {
    const packId = clean(metadata.packId, 80);
    const pack: any = pricing.creditPacks.find((item: any) => String(item.id) === packId && item.enabled !== false);
    if (!pack) throw fail('Pack de crédits introuvable ou désactivé.', 400, 'CREDIT_PACK_INVALID');
    const credits = Math.max(0, Math.floor(Number(pack.credits || 0)));
    const amountUsd = money(Number(pack.priceUsd || 0));
    if (!credits || !amountUsd) throw fail('Configuration du pack invalide.', 500, 'CREDIT_PACK_CONFIG_INVALID');
    return { kind: 'credits', targetId: packId, label: `${credits} crédits MUNGWELE`, amountUsd, creditsAdded: credits };
  }

  const planId = clean(metadata.planId, 40) as 'creator' | 'pro' | 'studio';
  const billingCycle: BillingCycle = String(metadata.billingCycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly';
  const plan: any = pricing.subscriptionPlans.find((item: any) => String(item.id) === planId && String(item.id) !== 'free');
  if (!plan) throw fail('Abonnement introuvable.', 400, 'SUBSCRIPTION_PLAN_INVALID');

  const monthlyPrice = money(Number(plan.priceMonth || 0));
  const monthlyCredits = Math.max(0, Math.floor(Number(plan.creditsMonthly || 0)));
  if (!monthlyPrice || !monthlyCredits) throw fail("Configuration de l'abonnement invalide.", 500, 'SUBSCRIPTION_CONFIG_INVALID');

  const discount = Math.max(0, Math.min(80, Number(pricing.annualDiscountPercent || 0)));
  const amountUsd = billingCycle === 'yearly'
    ? money(monthlyPrice * 12 * (1 - discount / 100))
    : monthlyPrice;

  return {
    kind: 'subscription',
    targetId: planId,
    planId,
    billingCycle,
    label: `Abonnement ${String(plan.name || planId)} ${billingCycle === 'yearly' ? 'annuel' : 'mensuel'}`,
    amountUsd,
    creditsAdded: billingCycle === 'yearly' ? monthlyCredits * 12 : monthlyCredits,
  };
}

function targetFingerprint(target: ResolvedTarget) {
  return [target.kind, target.targetId, target.billingCycle || '', target.amountUsd, target.creditsAdded].join('|');
}

async function prepareIntent(id: string, uid: string, target: ResolvedTarget, msisdn: string) {
  const ref = adminDb.collection('mobileMoneyPaymentIntents').doc(id);
  const fingerprint = targetFingerprint(target);
  let existing: any = null;

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data: any = snap.data() || {};
      if (String(data.userId || '') !== uid || String(data.targetFingerprint || '') !== fingerprint) {
        throw fail('Cette tentative appartient à un autre achat.', 409, 'PAYMENT_ATTEMPT_CONFLICT');
      }
      if (data.status === 'settled' && data.result) existing = data.result;
      return;
    }

    tx.create(ref, {
      id,
      userId: uid,
      provider: 'mpesa',
      environment: 'production',
      targetKind: target.kind,
      targetId: target.targetId,
      targetFingerprint: fingerprint,
      amountUsd: target.amountUsd,
      creditsExpected: target.creditsAdded,
      msisdnMasked: `${'*'.repeat(Math.max(0, msisdn.length - 4))}${msisdn.slice(-4)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return { ref, existing };
}

async function settlePurchase(id: string, uid: string, target: ResolvedTarget, mpesa: any) {
  const settlementRef = adminDb.collection('mobileMoneySettlements').doc(id);
  const intentRef = adminDb.collection('mobileMoneyPaymentIntents').doc(id);
  const userRef = adminDb.collection('users').doc(uid);
  const creditTxRef = adminDb.collection('creditTransactions').doc(`mpesa-live-${id}`);
  let result: any = null;

  await adminDb.runTransaction(async (tx) => {
    const [settlementSnap, userSnap] = await Promise.all([tx.get(settlementRef), tx.get(userRef)]);
    if (settlementSnap.exists) {
      result = settlementSnap.data()?.result || null;
      return;
    }
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
      const end = new Date(now.getTime());
      if (target.billingCycle === 'yearly') end.setUTCFullYear(end.getUTCFullYear() + 1);
      else end.setUTCMonth(end.getUTCMonth() + 1);
      subscriptionEndsAt = end.toISOString();
      Object.assign(userUpdates, {
        plan,
        subscriptionCycle: target.billingCycle,
        subscriptionStartedAt: nowIso,
        subscriptionEndsAt,
        subscriptionSource: 'mpesa-live',
      });
    }

    const transactionId = clean(mpesa.output_TransactionID, 120);
    const conversationId = clean(mpesa.output_ConversationID, 120);
    const responseCode = clean(mpesa.output_ResponseCode, 32) || 'INS-0';

    result = {
      success: true,
      status: 'settled',
      provider: 'mpesa',
      environment: 'production',
      transactionId,
      conversationId,
      responseCode,
      amountUsd: target.amountUsd,
      creditsAdded: target.creditsAdded,
      balanceAfter,
      plan,
      billingCycle: target.billingCycle,
      subscriptionEndsAt,
      message: target.kind === 'credits' ? `${target.creditsAdded} crédits ont été ajoutés.` : `${target.label} activé.`,
    };

    tx.update(userRef, userUpdates);
    tx.set(creditTxRef, {
      userId: uid,
      amount: target.creditsAdded,
      type: 'purchase',
      description: target.kind === 'credits'
        ? `Achat ${target.creditsAdded} crédits via M-Pesa Live`
        : `${target.label} via M-Pesa Live`,
      balanceAfter,
      source: 'mpesa-live',
      mpesaTransactionId: transactionId || null,
      mpesaConversationId: conversationId || null,
      amountPaidUsd: target.amountUsd,
      pricingVersion: PRICING_VERSION,
      createdAt: nowIso,
    });
    tx.set(settlementRef, {
      id,
      userId: uid,
      provider: 'mpesa',
      environment: 'production',
      status: 'settled',
      targetKind: target.kind,
      targetId: target.targetId,
      amountUsd: target.amountUsd,
      creditsAdded: target.creditsAdded,
      pricingVersion: PRICING_VERSION,
      result,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    tx.set(intentRef, { status: 'settled', result, updatedAt: nowIso }, { merge: true });
  });

  if (!result) throw fail('Paiement confirmé mais synchronisation MUNGWELE incomplète.', 500, 'SETTLEMENT_PENDING');
  return result;
}

async function c2bHandler(req: express.Request, res: express.Response) {
  try {
    const user = await requireUser(req);
    if (!isMpesaLiveConfigured()) {
      throw fail(
        'M-Pesa C2B Live est prêt mais les identifiants de production ne sont pas encore configurés.',
        503,
        'MPESA_NOT_CONFIGURED',
      );
    }

    const target = await resolveTarget(req.body?.target || {});
    const requestedAmount = Number(req.body?.target?.amountUsd);
    if (Number.isFinite(requestedAmount) && Math.abs(money(requestedAmount) - target.amountUsd) > 0.009) {
      throw fail('Le prix affiché a changé. Rechargez la page.', 409, 'PRICE_CHANGED');
    }

    const msisdn = normalizeMpesaLiveMsisdn(req.body?.msisdn);
    const id = normalizeAttemptId(req.body?.attemptId);
    const intent = await prepareIntent(id, user.uid, target, msisdn);
    if (intent.existing) return res.json(intent.existing);

    const seed = id.replace(/[^a-zA-Z0-9]/g, '');
    const thirdPartyConversationId = `MIA${seed}`.slice(0, 40);
    const transactionReference = `MIA${Date.now().toString(36)}${seed.slice(-6)}`.slice(0, 20);
    const purchasedItemsDescription = clean(target.label.replace(/[^a-zA-Z0-9 À-ÿ._-]/g, ''), 120) || 'MUNGWELE';

    const { response, payload } = await requestMpesaLiveC2B({
      amountUsd: target.amountUsd,
      msisdn,
      thirdPartyConversationId,
      transactionReference,
      purchasedItemsDescription,
    });

    const code = clean(payload?.output_ResponseCode, 32);
    const description = clean(payload?.output_ResponseDesc, 300);

    if (response.ok && code === 'INS-0') {
      if (clean(payload?.output_TransactionID, 120)) {
        return res.json(await settlePurchase(id, user.uid, target, payload));
      }

      await intent.ref.set({
        status: 'pending',
        environment: 'production',
        responseCode: code,
        responseDesc: description,
        mpesaConversationId: clean(payload?.output_ConversationID, 120) || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return res.status(202).json({
        success: true,
        status: 'pending',
        provider: 'mpesa',
        environment: 'production',
        responseCode: code,
        conversationId: clean(payload?.output_ConversationID, 120),
        message: description || 'Paiement M-Pesa Live initié. Confirmation du client en attente.',
      });
    }

    await intent.ref.set({
      status: 'failed',
      environment: 'production',
      responseCode: code || null,
      responseDesc: description || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => undefined);

    return res.status(response.status >= 400 && response.status < 600 ? response.status : 402).json({
      success: false,
      status: 'failed',
      provider: 'mpesa',
      environment: 'production',
      responseCode: code,
      error: mpesaLiveMessage(code, description),
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const code = clean(error?.code || 'MPESA_C2B_ERROR', 80);
    console.warn('[MUNGWELE_MPESA_LIVE_C2B_ERROR]', code, String(error?.message || ''));
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      status: 'failed',
      provider: 'mpesa',
      environment: 'production',
      error: String(error?.message || 'Erreur M-Pesa Live inconnue.'),
      code,
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
          mode: 'production',
          currency: mpesa.currency,
          country: mpesa.country,
          providers: {
            mpesa: {
              enabled: true,
              configured: mpesa.configured,
              market: mpesa.market,
              environment: 'production',
              endpointFamily: mpesa.endpointFamily,
              serviceProviderCodeConfigured: mpesa.serviceProviderCodeConfigured,
            },
            airtel: { enabled: false, configured: false, status: 'prepared' },
            orange: { enabled: false, configured: false, status: 'prepared' },
          },
        });
      });
      this.post('/api/mobile-money/mpesa/c2b', c2bHandler);
    }
    return result;
  };
}
