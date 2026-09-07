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
const DEFAULT_MPESA_BASE_URL = 'https://openapi.m-pesa.com';

type TargetKind = 'subscription' | 'credits';
type BillingCycle = 'monthly' | 'yearly';

type PaymentTarget = {
  kind?: TargetKind;
  label?: string;
  amountUsd?: number;
  metadata?: Record<string, string | number>;
};

type ResolvedTarget = {
  kind: TargetKind;
  label: string;
  amountUsd: number;
  creditsAdded: number;
  targetId: string;
  planId?: 'creator' | 'pro' | 'studio';
  billingCycle?: BillingCycle;
};

type MpesaSession = {
  value: string;
  expiresAt: number;
};

const DEFAULT_PRICING = {
  pricingVersion: PRICING_VERSION,
  annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
  creditPacks: LAUNCH_CREDIT_PACKS.map((pack) => ({ ...pack })),
  subscriptionPlans: LAUNCH_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, features: [...plan.features] })),
};

let cachedMpesaSession: MpesaSession | null = null;

const roundMoney = (value: number) => Math.round(value * 100) / 100;
const cleanText = (value: unknown, max = 120) => String(value ?? '').trim().slice(0, max);

function httpError(message: string, status = 400, code = 'MOBILE_MONEY_REQUEST_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

function normalizeAttemptId(value: unknown) {
  const candidate = cleanText(value, 72).replace(/[^a-zA-Z0-9_-]/g, '');
  if (!candidate) return randomUUID();
  if (candidate.length < 8) throw httpError('Identifiant de tentative de paiement invalide.', 400, 'PAYMENT_ATTEMPT_INVALID');
  return candidate;
}

function mpesaMode() {
  return String(process.env.MPESA_MODE || 'sandbox').trim().toLowerCase() === 'production' ? 'production' : 'sandbox';
}

function mpesaConfig() {
  const mode = mpesaMode();
  return {
    mode,
    apiKey: cleanText(process.env.MPESA_API_KEY, 4096),
    publicKey: String(process.env.MPESA_PUBLIC_KEY || '').trim(),
    baseUrl: String(process.env.MPESA_BASE_URL || DEFAULT_MPESA_BASE_URL).trim().replace(/\/$/, ''),
    market: cleanText(process.env.MPESA_MARKET || 'vodacomRC', 32),
    country: cleanText(process.env.MPESA_COUNTRY || 'RDC', 8),
    currency: cleanText(process.env.MPESA_CURRENCY || 'USD', 8),
    serviceProviderCode: cleanText(process.env.MPESA_SERVICE_PROVIDER_CODE || (mode === 'sandbox' ? '000000' : ''), 32),
    origin: cleanText(process.env.MPESA_ORIGIN || '*', 255),
    sessionTtlSeconds: Math.max(60, Number(process.env.MPESA_SESSION_TTL_SECONDS || 3000)),
    sessionWarmupMs: Math.max(0, Math.min(30000, Number(process.env.MPESA_SESSION_WARMUP_MS || 0))),
  };
}

function mpesaConfigured() {
  const config = mpesaConfig();
  return Boolean(config.apiKey && config.publicKey && config.market && config.country && config.currency && config.serviceProviderCode);
}

function normalizePublicKey(value: string) {
  const normalized = String(value || '').replace(/\\n/g, '\n').trim();
  if (!normalized) throw httpError('Clé publique M-Pesa absente.', 503, 'MPESA_PUBLIC_KEY_MISSING');
  if (normalized.includes('-----BEGIN')) return normalized;
  const compact = normalized.replace(/\s+/g, '');
  const body = compact.match(/.{1,64}/g)?.join('\n') || compact;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

function encryptMpesaApiKey(apiKey: string, publicKey: string) {
  try {
    return publicEncrypt(
      {
        key: normalizePublicKey(publicKey),
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(apiKey, 'utf8'),
    ).toString('base64');
  } catch (error: any) {
    throw httpError(`Impossible de préparer l'authentification M-Pesa : ${String(error?.message || error)}`, 503, 'MPESA_KEY_ENCRYPTION_FAILED');
  }
}

function normalizeMsisdn(value: unknown, mode: 'sandbox' | 'production') {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (mode === 'sandbox') {
    if (!/^\d{12,14}$/.test(digits)) throw httpError('MSISDN sandbox invalide.', 400, 'MPESA_MSISDN_INVALID');
    return digits;
  }
  if (!/^243\d{9}$/.test(digits)) {
    throw httpError('Numéro M-Pesa invalide. Utilisez le format +243XXXXXXXXX.', 400, 'MPESA_MSISDN_INVALID');
  }
  return digits;
}

function mpesaMessage(code: string, fallback = '') {
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
    'INS-995': 'Limite de transactions de cette API dépassée.',
    'INS-996': "API utilisée en dehors des heures d'utilisation autorisées.",
    'INS-997': "L'API M-Pesa n'est pas activée.",
    'INS-998': 'Marché M-Pesa invalide.',
    'INS-2006': 'Solde M-Pesa insuffisant.',
    'INS-2051': 'MSISDN M-Pesa invalide.',
  };
  return messages[code] || fallback || 'Paiement M-Pesa refusé.';
}

async function authenticatedUser(req: express.Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw httpError('Connexion requise pour payer.', 401, 'AUTH_REQUIRED');
  const token = header.slice(7).trim();
  if (!token) throw httpError('Session Firebase invalide.', 401, 'AUTH_REQUIRED');
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: String(decoded.email || '') };
  } catch {
    throw httpError('Session Firebase invalide ou expirée.', 401, 'AUTH_INVALID');
  }
}

async function loadPricing() {
  try {
    const snap = await adminDb.doc('appSettings/pricing').get();
    const data: any = snap.data() || {};
    if (Number(data.pricingVersion) !== PRICING_VERSION) return DEFAULT_PRICING;
    return {
      pricingVersion: PRICING_VERSION,
      annualDiscountPercent: Number.isFinite(Number(data.annualDiscountPercent))
        ? Number(data.annualDiscountPercent)
        : DEFAULT_PRICING.annualDiscountPercent,
      creditPacks: Array.isArray(data.creditPacks) && data.creditPacks.length ? data.creditPacks : DEFAULT_PRICING.creditPacks,
      subscriptionPlans: Array.isArray(data.subscriptionPlans) && data.subscriptionPlans.length ? data.subscriptionPlans : DEFAULT_PRICING.subscriptionPlans,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

async function resolveTarget(target: PaymentTarget): Promise<ResolvedTarget> {
  if (!target?.kind) throw httpError('Achat MUNGWELE invalide.', 400, 'TARGET_REQUIRED');
  const pricing = await loadPricing();
  const metadata = target.metadata || {};

  if (target.kind === 'credits') {
    const packId = cleanText(metadata.packId, 80);
    const pack: any = pricing.creditPacks.find((item: any) => String(item.id) === packId && item.enabled !== false);
    if (!pack) throw httpError('Pack de crédits introuvable ou désactivé.', 400, 'CREDIT_PACK_INVALID');
    const credits = Math.max(0, Math.floor(Number(pack.credits || 0)));
    const amountUsd = roundMoney(Number(pack.priceUsd || 0));
    if (!credits || !amountUsd) throw httpError('Configuration du pack de crédits invalide.', 500, 'CREDIT_PACK_CONFIG_INVALID');
    return { kind: 'credits', targetId: packId, label: `${credits} crédits MUNGWELE`, amountUsd, creditsAdded: credits };
  }

  const planId = cleanText(metadata.planId, 40) as 'creator' | 'pro' | 'studio';
  const billingCycle: BillingCycle = String(metadata.billingCycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly';
  const plan: any = pricing.subscriptionPlans.find((item: any) => String(item.id) === planId && String(item.id) !== 'free');
  if (!plan) throw httpError('Abonnement introuvable.', 400, 'SUBSCRIPTION_PLAN_INVALID');
  const monthlyPrice = roundMoney(Number(plan.priceMonth || 0));
  const monthlyCredits = Math.max(0, Math.floor(Number(plan.creditsMonthly || 0)));
  if (!monthlyPrice || !monthlyCredits) throw httpError("Configuration de l'abonnement invalide.", 500, 'SUBSCRIPTION_CONFIG_INVALID');
  const discount = Math.max(0, Math.min(80, Number(pricing.annualDiscountPercent || 0)));
  const amountUsd = billingCycle === 'yearly' ? roundMoney(monthlyPrice * 12 * (1 - discount / 100)) : monthlyPrice;
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

async function prepareIntent(params: { attemptId: string; uid: string; target: ResolvedTarget; msisdn: string }) {
  const ref = adminDb.collection('mobileMoneyPaymentIntents').doc(params.attemptId);
  const fingerprint = targetFingerprint(params.target);
  let existingResult: any = null;
  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data: any = snap.data() || {};
      if (String(data.userId || '') !== params.uid || String(data.targetFingerprint || '') !== fingerprint) {
        throw httpError('Cette tentative de paiement appartient à un autre achat.', 409, 'PAYMENT_ATTEMPT_CONFLICT');
      }
      if (data.status === 'settled' && data.result) existingResult = data.result;
      return;
    }
    tx.create(ref, {
      id: params.attemptId,
      userId: params.uid,
      provider: 'mpesa',
      msisdnMasked: params.msisdn.length > 4 ? `${'*'.repeat(Math.max(0, params.msisdn.length - 4))}${params.msisdn.slice(-4)}` : params.msisdn,
      targetKind: params.target.kind,
      targetId: params.target.targetId,
      targetFingerprint: fingerprint,
      amountUsd: params.target.amountUsd,
      creditsExpected: params.target.creditsAdded,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
  return { ref, existingResult };
}

async function settlePurchase(params: {
  attemptId: string;
  uid: string;
  target: ResolvedTarget;
  mpesa: any;
}) {
  const settlementRef = adminDb.collection('mobileMoneySettlements').doc(params.attemptId);
  const intentRef = adminDb.collection('mobileMoneyPaymentIntents').doc(params.attemptId);
  const userRef = adminDb.collection('users').doc(params.uid);
  const creditTxRef = adminDb.collection('creditTransactions').doc(`mpesa-${params.attemptId}`);
  let result: any = null;

  await adminDb.runTransaction(async (tx) => {
    const [settlementSnap, userSnap] = await Promise.all([tx.get(settlementRef), tx.get(userRef)]);
    if (settlementSnap.exists) {
      result = settlementSnap.data()?.result || null;
      return;
    }
    if (!userSnap.exists) throw httpError('Profil MUNGWELE introuvable.', 404, 'USER_NOT_FOUND');

    const user: any = userSnap.data() || {};
    const currentCredits = Math.max(0, Number(user.credits || 0));
    const balanceAfter = currentCredits + params.target.creditsAdded;
    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const userUpdates: Record<string, unknown> = { credits: balanceAfter, updatedAt: nowIso };

    let plan: string | undefined;
    let subscriptionEndsAt: string | undefined;
    if (params.target.kind === 'subscription' && params.target.planId) {
      plan = params.target.planId;
      const end = new Date(nowDate.getTime());
      if (params.target.billingCycle === 'yearly') end.setUTCFullYear(end.getUTCFullYear() + 1);
      else end.setUTCMonth(end.getUTCMonth() + 1);
      subscriptionEndsAt = end.toISOString();
      Object.assign(userUpdates, {
        plan,
        subscriptionCycle: params.target.billingCycle,
        subscriptionStartedAt: nowIso,
        subscriptionEndsAt,
        subscriptionSource: 'mpesa',
      });
    }

    tx.update(userRef, userUpdates);
    tx.set(creditTxRef, {
      userId: params.uid,
      amount: params.target.creditsAdded,
      type: 'purchase',
      description: params.target.kind === 'credits'
        ? `Achat ${params.target.creditsAdded} crédits via M-Pesa`
        : `${params.target.label} via M-Pesa`,
      balanceAfter,
      source: 'mpesa',
      mpesaTransactionId: cleanText(params.mpesa.output_TransactionID, 120) || null,
      mpesaConversationId: cleanText(params.mpesa.output_ConversationID, 120) || null,
      amountPaidUsd: params.target.amountUsd,
      pricingVersion: PRICING_VERSION,
      createdAt: nowIso,
    });

    result = {
      success: true,
      status: 'settled',
      provider: 'mpesa',
      transactionId: cleanText(params.mpesa.output_TransactionID, 120),
      conversationId: cleanText(params.mpesa.output_ConversationID, 120),
      responseCode: cleanText(params.mpesa.output_ResponseCode, 32) || 'INS-0',
      amountUsd: params.target.amountUsd,
      creditsAdded: params.target.creditsAdded,
      balanceAfter,
      plan,
      billingCycle: params.target.billingCycle,
      subscriptionEndsAt,
      message: params.target.kind === 'credits'
        ? `${params.target.creditsAdded} crédits ont été ajoutés.`
        : `${params.target.label} activé.`,
    };

    tx.set(settlementRef, {
      id: params.attemptId,
      userId: params.uid,
      provider: 'mpesa',
      status: 'settled',
      targetKind: params.target.kind,
      targetId: params.target.targetId,
      amountUsd: params.target.amountUsd,
      creditsAdded: params.target.creditsAdded,
      pricingVersion: PRICING_VERSION,
      mpesaTransactionId: result.transactionId || null,
      mpesaConversationId: result.conversationId || null,
      result,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    tx.set(intentRef, {
      status: 'settled',
      responseCode: result.responseCode,
      mpesaTransactionId: result.transactionId || null,
      mpesaConversationId: result.conversationId || null,
      result,
      updatedAt: nowIso,
    }, { merge: true });
  });

  if (!result) throw httpError('Paiement confirmé mais synchronisation MUNGWELE incomplète.', 500, 'SETTLEMENT_PENDING');
  return result;
}

async function getMpesaSession() {
  const config = mpesaConfig();
  if (!mpesaConfigured()) throw httpError('M-Pesa C2B n’est pas encore configuré côté serveur.', 503, 'MPESA_NOT_CONFIGURED');
  if (cachedMpesaSession && cachedMpesaSession.expiresAt > Date.now() + 30_000) return cachedMpesaSession.value;

  const encryptedApiKey = encryptMpesaApiKey(config.apiKey, config.publicKey);
  const endpoint = `${config.baseUrl}/${config.mode === 'production' ? 'openapi' : 'sandbox'}/ipg/v2/${encodeURIComponent(config.market)}/getSession/`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${encryptedApiKey}`,
      Origin: config.origin,
      Accept: 'application/json',
      'User-Agent': 'mungwele-ia-studio/mpesa-session',
    },
  });
  const payload: any = await response.json().catch(() => ({}));
  const sessionId = cleanText(payload?.output_SessionID, 4096);
  if (!response.ok || !sessionId) {
    throw httpError(
      cleanText(payload?.output_ResponseDesc || payload?.error || `Session M-Pesa refusée (${response.status}).`, 300),
      response.status >= 400 && response.status < 600 ? response.status : 502,
      'MPESA_SESSION_FAILED',
    );
  }

  cachedMpesaSession = {
    value: sessionId,
    expiresAt: Date.now() + config.sessionTtlSeconds * 1000,
  };

  if (config.sessionWarmupMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.sessionWarmupMs));
  }
  return sessionId;
}

async function mpesaC2BHandler(req: express.Request, res: express.Response) {
  try {
    const authUser = await authenticatedUser(req);
    const config = mpesaConfig();
    if (!mpesaConfigured()) throw httpError('M-Pesa C2B n’est pas encore configuré. Ajoutez les secrets serveur M-Pesa.', 503, 'MPESA_NOT_CONFIGURED');

    const target = await resolveTarget(req.body?.target || {});
    const requestedAmount = Number(req.body?.target?.amountUsd);
    if (Number.isFinite(requestedAmount) && Math.abs(roundMoney(requestedAmount) - target.amountUsd) > 0.009) {
      throw httpError('Le prix affiché a changé. Rechargez la page avant de payer.', 409, 'PRICE_CHANGED');
    }

    const msisdn = normalizeMsisdn(req.body?.msisdn, config.mode);
    const attemptId = normalizeAttemptId(req.body?.attemptId);
    const intent = await prepareIntent({ attemptId, uid: authUser.uid, target, msisdn });
    if (intent.existingResult) return res.json(intent.existingResult);

    const sessionId = await getMpesaSession();
    const conversationSeed = attemptId.replace(/[^a-zA-Z0-9]/g, '');
    const thirdPartyConversationId = `MIA${conversationSeed}`.slice(0, 40);
    const transactionReference = `MIA${Date.now().toString(36)}${conversationSeed.slice(-6)}`.slice(0, 20);
    const endpoint = `${config.baseUrl}/${config.mode === 'production' ? 'openapi' : 'sandbox'}/ipg/v2/${encodeURIComponent(config.market)}/c2bPayment/singleStage/`;

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionId}`,
        Origin: config.origin,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'mungwele-ia-studio/mpesa-c2b',
      },
      body: JSON.stringify({
        input_Amount: target.amountUsd.toFixed(2),
        input_Country: config.country,
        input_Currency: config.currency,
        input_CustomerMSISDN: msisdn,
        input_ServiceProviderCode: config.serviceProviderCode,
        input_ThirdPartyConversationID: thirdPartyConversationId,
        input_TransactionReference: transactionReference,
        input_PurchasedItemsDesc: cleanText(target.label.replace(/[^a-zA-Z0-9 À-ÿ._-]/g, ''), 120) || 'MUNGWELE',
      }),
    });

    const payload: any = await upstream.json().catch(() => ({}));
    const responseCode = cleanText(payload?.output_ResponseCode, 32);
    const responseDesc = cleanText(payload?.output_ResponseDesc, 300);

    if (upstream.ok && responseCode === 'INS-0') {
      const transactionId = cleanText(payload?.output_TransactionID, 120);
      if (transactionId) {
        const settled = await settlePurchase({ attemptId, uid: authUser.uid, target, mpesa: payload });
        return res.json(settled);
      }

      await intent.ref.set({
        status: 'pending',
        responseCode,
        responseDesc,
        mpesaConversationId: cleanText(payload?.output_ConversationID, 120) || null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return res.status(202).json({
        success: true,
        status: 'pending',
        provider: 'mpesa',
        responseCode,
        conversationId: cleanText(payload?.output_ConversationID, 120),
        message: responseDesc || 'Paiement M-Pesa initié. Confirmation en attente.',
      });
    }

    const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 402;
    await intent.ref.set({
      status: 'failed',
      responseCode: responseCode || null,
      responseDesc: responseDesc || null,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => undefined);
    return res.status(status).json({
      success: false,
      status: 'failed',
      provider: 'mpesa',
      responseCode,
      error: mpesaMessage(responseCode, responseDesc),
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const code = cleanText(error?.code || 'MPESA_C2B_ERROR', 80);
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
        const config = mpesaConfig();
        res.json({
          mode: config.mode,
          currency: config.currency,
          country: config.country,
          providers: {
            mpesa: {
              enabled: true,
              configured: mpesaConfigured(),
              market: config.market,
              serviceProviderCodeConfigured: Boolean(config.serviceProviderCode),
              testMsisdnSuccess: config.mode === 'sandbox' ? '000000000001' : undefined,
            },
            airtel: { enabled: false, configured: false, status: 'prepared' },
            orange: { enabled: false, configured: false, status: 'prepared' },
          },
        });
      });
      this.post('/api/mobile-money/mpesa/c2b', mpesaC2BHandler);
    }
    return result;
  };
}
