import { constants, publicEncrypt, randomUUID } from 'node:crypto';
import express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';
import {
  ANNUAL_DISCOUNT_PERCENT,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_SUBSCRIPTION_PLANS,
  PRICING_VERSION,
} from '../src/config/commercialPricing';

const INSTALL_FLAG = Symbol.for('mungwele.mobileMoneyPaymentProxyInstalled');
const APP_FLAG = Symbol.for('mungwele.mobileMoneyRoutesMounted');
const DEFAULT_BASE_URL = 'https://openapi.m-pesa.com';

type MpesaMode = 'sandbox' | 'production';
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

let sessionCache: { value: string; expiresAt: number } | null = null;

const clean = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max);
const money = (value: number) => Math.round(value * 100) / 100;

function fail(message: string, status = 400, code = 'MOBILE_MONEY_REQUEST_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

function modeFromEnv(): MpesaMode {
  return String(process.env.MPESA_MODE || 'sandbox').trim().toLowerCase() === 'production'
    ? 'production'
    : 'sandbox';
}

function config() {
  const mode: MpesaMode = modeFromEnv();
  return {
    mode,
    apiKey: clean(process.env.MPESA_API_KEY, 4096),
    publicKey: String(process.env.MPESA_PUBLIC_KEY || '').trim(),
    baseUrl: String(process.env.MPESA_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/$/, ''),
    market: clean(process.env.MPESA_MARKET || 'vodacomRC', 32),
    country: clean(process.env.MPESA_COUNTRY || 'RDC', 8),
    currency: clean(process.env.MPESA_CURRENCY || 'USD', 8),
    serviceProviderCode: clean(process.env.MPESA_SERVICE_PROVIDER_CODE || (mode === 'sandbox' ? '000000' : ''), 32),
    origin: clean(process.env.MPESA_ORIGIN || '*', 255),
    sessionTtlSeconds: Math.max(60, Number(process.env.MPESA_SESSION_TTL_SECONDS || 3000)),
    sessionWarmupMs: Math.max(0, Math.min(30_000, Number(process.env.MPESA_SESSION_WARMUP_MS || 0))),
  };
}

function isConfigured() {
  const c = config();
  return Boolean(c.apiKey && c.publicKey && c.market && c.country && c.currency && c.serviceProviderCode);
}

function normalizePublicKey(value: string) {
  const normalized = String(value || '').replace(/\\n/g, '\n').trim();
  if (!normalized) throw fail('Clé publique M-Pesa absente.', 503, 'MPESA_PUBLIC_KEY_MISSING');
  if (normalized.includes('-----BEGIN')) return normalized;
  const compact = normalized.replace(/\s+/g, '');
  const body = compact.match(/.{1,64}/g)?.join('\n') || compact;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

function encryptedApiKey(apiKey: string, publicKey: string) {
  try {
    return publicEncrypt(
      { key: normalizePublicKey(publicKey), padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(apiKey, 'utf8'),
    ).toString('base64');
  } catch (error: any) {
    throw fail(
      `Impossible de préparer l'authentification M-Pesa : ${String(error?.message || error)}`,
      503,
      'MPESA_KEY_ENCRYPTION_FAILED',
    );
  }
}

function normalizeMsisdn(value: unknown, mode: MpesaMode) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (mode === 'sandbox') {
    if (!/^\d{12,14}$/.test(digits)) throw fail('MSISDN sandbox invalide.', 400, 'MPESA_MSISDN_INVALID');
    return digits;
  }
  if (!/^243\d{9}$/.test(digits)) {
    throw fail('Numéro M-Pesa invalide. Utilisez le format +243XXXXXXXXX.', 400, 'MPESA_MSISDN_INVALID');
  }
  return digits;
}

function attemptId(value: unknown) {
  const id = clean(value, 72).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return randomUUID();
  if (id.length < 8) throw fail('Identifiant de tentative invalide.', 400, 'PAYMENT_ATTEMPT_INVALID');
  return id;
}

function responseMessage(code: string, fallback = '') {
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
    'INS-997': "L'API M-Pesa n'est pas activée.",
    'INS-998': 'Marché M-Pesa invalide.',
    'INS-2006': 'Solde M-Pesa insuffisant.',
    'INS-2051': 'MSISDN M-Pesa invalide.',
  };
  return messages[code] || fallback || 'Paiement M-Pesa refusé.';
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

async function getSessionId() {
  const c = config();
  if (!isConfigured()) throw fail('M-Pesa C2B n’est pas configuré côté serveur.', 503, 'MPESA_NOT_CONFIGURED');
  if (sessionCache && sessionCache.expiresAt > Date.now() + 30_000) return sessionCache.value;

  const auth = encryptedApiKey(c.apiKey, c.publicKey);
  const environment = c.mode === 'production' ? 'openapi' : 'sandbox';
  const endpoint = `${c.baseUrl}/${environment}/ipg/v2/${encodeURIComponent(c.market)}/getSession/`;
  const upstream = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth}`,
      Origin: c.origin,
      Accept: 'application/json',
      'User-Agent': 'mungwele-ia-studio/mpesa-session',
    },
  });
  const payload: any = await upstream.json().catch(() => ({}));
  const sessionId = clean(payload?.output_SessionID, 4096);
  if (!upstream.ok || !sessionId) {
    throw fail(
      clean(payload?.output_ResponseDesc || payload?.error || `Session M-Pesa refusée (${upstream.status}).`, 300),
      upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502,
      'MPESA_SESSION_FAILED',
    );
  }

  sessionCache = { value: sessionId, expiresAt: Date.now() + c.sessionTtlSeconds * 1000 };
  if (c.sessionWarmupMs) await new Promise((resolve) => setTimeout(resolve, c.sessionWarmupMs));
  return sessionId;
}

async function settle(id: string, uid: string, target: ResolvedTarget, mpesa: any) {
  const settlementRef = adminDb.collection('mobileMoneySettlements').doc(id);
  const intentRef = adminDb.collection('mobileMoneyPaymentIntents').doc(id);
  const userRef = adminDb.collection('users').doc(uid);
  const creditTxRef = adminDb.collection('creditTransactions').doc(`mpesa-${id}`);
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
        subscriptionSource: 'mpesa',
      });
    }

    const transactionId = clean(mpesa.output_TransactionID, 120);
    const conversationId = clean(mpesa.output_ConversationID, 120);
    const responseCode = clean(mpesa.output_ResponseCode, 32) || 'INS-0';

    result = {
      success: true,
      status: 'settled',
      provider: 'mpesa',
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
      description: target.kind === 'credits' ? `Achat ${target.creditsAdded} crédits via M-Pesa` : `${target.label} via M-Pesa`,
      balanceAfter,
      source: 'mpesa',
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
    const c = config();
    if (!isConfigured()) throw fail('M-Pesa C2B n’est pas encore configuré. Ajoutez les secrets serveur M-Pesa.', 503, 'MPESA_NOT_CONFIGURED');

    const target = await resolveTarget(req.body?.target || {});
    const requestedAmount = Number(req.body?.target?.amountUsd);
    if (Number.isFinite(requestedAmount) && Math.abs(money(requestedAmount) - target.amountUsd) > 0.009) {
      throw fail('Le prix affiché a changé. Rechargez la page.', 409, 'PRICE_CHANGED');
    }

    const msisdn = normalizeMsisdn(req.body?.msisdn, c.mode);
    const id = attemptId(req.body?.attemptId);
    const intent = await prepareIntent(id, user.uid, target, msisdn);
    if (intent.existing) return res.json(intent.existing);

    const sessionId = await getSessionId();
    const seed = id.replace(/[^a-zA-Z0-9]/g, '');
    const thirdPartyConversationId = `MIA${seed}`.slice(0, 40);
    const transactionReference = `MIA${Date.now().toString(36)}${seed.slice(-6)}`.slice(0, 20);
    const environment = c.mode === 'production' ? 'openapi' : 'sandbox';
    const endpoint = `${c.baseUrl}/${environment}/ipg/v2/${encodeURIComponent(c.market)}/c2bPayment/singleStage/`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionId}`,
        Origin: c.origin,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'mungwele-ia-studio/mpesa-c2b',
      },
      body: JSON.stringify({
        input_Amount: target.amountUsd.toFixed(2),
        input_Country: c.country,
        input_Currency: c.currency,
        input_CustomerMSISDN: msisdn,
        input_ServiceProviderCode: c.serviceProviderCode,
        input_ThirdPartyConversationID: thirdPartyConversationId,
        input_TransactionReference: transactionReference,
        input_PurchasedItemsDesc: clean(target.label.replace(/[^a-zA-Z0-9 À-ÿ._-]/g, ''), 120) || 'MUNGWELE',
      }),
    });

    const payload: any = await upstream.json().catch(() => ({}));
    const code = clean(payload?.output_ResponseCode, 32);
    const description = clean(payload?.output_ResponseDesc, 300);

    if (upstream.ok && code === 'INS-0') {
      if (clean(payload?.output_TransactionID, 120)) {
        return res.json(await settle(id, user.uid, target, payload));
      }
      await intent.ref.set({
        status: 'pending',
        responseCode: code,
        responseDesc: description,
        mpesaConversationId: clean(payload?.output_ConversationID, 120) || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return res.status(202).json({
        success: true,
        status: 'pending',
        provider: 'mpesa',
        responseCode: code,
        conversationId: clean(payload?.output_ConversationID, 120),
        message: description || 'Paiement M-Pesa initié. Confirmation en attente.',
      });
    }

    await intent.ref.set({
      status: 'failed',
      responseCode: code || null,
      responseDesc: description || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => undefined);

    return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 402).json({
      success: false,
      status: 'failed',
      provider: 'mpesa',
      responseCode: code,
      error: responseMessage(code, description),
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const code = clean(error?.code || 'MPESA_C2B_ERROR', 80);
    console.warn('[MUNGWELE_MPESA_C2B_ERROR]', code, String(error?.message || ''));
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      status: 'failed',
      provider: 'mpesa',
      error: String(error?.message || 'Erreur M-Pesa inconnue.'),
      code,
    });
  }
}

export function installMobileMoneyPaymentProxy() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);
    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      this.get('/api/mobile-money/status', (_req: express.Request, res: express.Response) => {
        const c = config();
        res.json({
          mode: c.mode,
          currency: c.currency,
          country: c.country,
          providers: {
            mpesa: {
              enabled: true,
              configured: isConfigured(),
              market: c.market,
              serviceProviderCodeConfigured: Boolean(c.serviceProviderCode),
              testMsisdnSuccess: c.mode === 'sandbox' ? '000000000001' : undefined,
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
