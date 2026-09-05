import { randomUUID } from 'node:crypto';
import express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';

const INSTALL_FLAG = Symbol.for('mungwele.marketCashPaymentProxyInstalled');
const APP_FLAG = Symbol.for('mungwele.marketCashRoutesMounted');
const DEFAULT_MARKET_CASH_ENDPOINT = 'https://europe-west1-automarket-fintech.cloudfunctions.net/marketCashApiCardPaymentByKey';

type TargetKind = 'subscription' | 'credits';
type MarketCashRequestBody = {
  target?: {
    kind?: TargetKind;
    label?: string;
    amountUsd?: number;
    metadata?: Record<string, string | number>;
  };
  paymentMethod?: 'card';
  card?: {
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    cvv?: string;
  };
  captureMethod?: 'manual' | 'qr' | 'nfc';
  cvvEntry?: 'manual';
  attemptId?: string;
};

type ResolvedTarget = {
  kind: TargetKind;
  label: string;
  amountUsd: number;
  creditsAdded: number;
  targetId: string;
  planId?: 'creator' | 'pro' | 'studio';
  billingCycle?: 'monthly' | 'yearly';
};

const DEFAULT_PRICING = {
  annualDiscountPercent: 20,
  creditPacks: [
    { id: 'pack-200', name: 'Essentiel', credits: 200, priceUsd: 4, enabled: true },
    { id: 'pack-500', name: 'Créateur', credits: 500, priceUsd: 9, enabled: true },
    { id: 'pack-1200', name: 'Studio', credits: 1200, priceUsd: 20, enabled: true },
  ],
  subscriptionPlans: [
    { id: 'creator', name: 'Creator', priceMonth: 10, creditsMonthly: 600 },
    { id: 'pro', name: 'Pro', priceMonth: 25, creditsMonthly: 1600 },
  ],
};

const cleanDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const roundMoney = (value: number) => Math.round(value * 100) / 100;

function httpError(message: string, status = 400, code = 'MARKET_CASH_REQUEST_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

function normalizeAttemptId(value: unknown) {
  const candidate = String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 72);
  if (!candidate) return randomUUID();
  if (candidate.length < 8) throw httpError('Identifiant de tentative de paiement invalide.', 400, 'PAYMENT_ATTEMPT_INVALID');
  return candidate;
}

function normalizeCaptureReference(value: unknown) {
  const raw = String(value || '').trim();
  const match = raw.match(/(?:MARKET-CASH-CARD\s*:\s*)?(MCL-[A-Z0-9_-]{4,120})/i);
  if (!match?.[1]) throw httpError('QR/NFC Market-Cash non reconnu.', 400, 'CARD_REFERENCE_INVALID');
  return match[1].toUpperCase();
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

async function resolveTarget(target: MarketCashRequestBody['target']): Promise<ResolvedTarget> {
  if (!target?.kind) throw httpError('Achat MUNGWELE invalide.', 400, 'TARGET_REQUIRED');
  const pricing = await loadPricing();
  const metadata = target.metadata || {};

  if (target.kind === 'credits') {
    const packId = String(metadata.packId || '').trim();
    const pack: any = pricing.creditPacks.find((item: any) => String(item.id) === packId && item.enabled !== false);
    if (!pack) throw httpError('Pack de crédits introuvable ou désactivé.', 400, 'CREDIT_PACK_INVALID');

    const credits = Math.max(0, Math.floor(Number(pack.credits || 0)));
    const amountUsd = roundMoney(Number(pack.priceUsd || 0));
    if (!credits || !amountUsd) throw httpError('Configuration du pack de crédits invalide.', 500, 'CREDIT_PACK_CONFIG_INVALID');

    return {
      kind: 'credits',
      targetId: packId,
      label: `${credits} crédits MUNGWELE`,
      amountUsd,
      creditsAdded: credits,
    };
  }

  const planId = String(metadata.planId || '').trim() as 'creator' | 'pro' | 'studio';
  const cycle = String(metadata.billingCycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly';
  const plan: any = pricing.subscriptionPlans.find((item: any) => String(item.id) === planId && String(item.id) !== 'free');
  if (!plan) throw httpError('Abonnement introuvable.', 400, 'SUBSCRIPTION_PLAN_INVALID');

  const monthlyPrice = roundMoney(Number(plan.priceMonth || 0));
  const monthlyCredits = Math.max(0, Math.floor(Number(plan.creditsMonthly || 0)));
  if (!monthlyPrice || !monthlyCredits) throw httpError('Configuration de l’abonnement invalide.', 500, 'SUBSCRIPTION_CONFIG_INVALID');

  const discount = Math.max(0, Math.min(80, Number(pricing.annualDiscountPercent || 0)));
  const amountUsd = cycle === 'yearly'
    ? roundMoney(monthlyPrice * 12 * (1 - discount / 100))
    : monthlyPrice;
  const creditsAdded = cycle === 'yearly' ? monthlyCredits * 12 : monthlyCredits;

  return {
    kind: 'subscription',
    targetId: planId,
    planId,
    billingCycle: cycle,
    label: `Abonnement ${String(plan.name || planId)} ${cycle === 'yearly' ? 'annuel' : 'mensuel'}`,
    amountUsd,
    creditsAdded,
  };
}

function validateCard(body: MarketCashRequestBody) {
  const pan = cleanDigits(body.card?.cardNumber);
  const cvv = cleanDigits(body.card?.cvv);
  const expiry = String(body.card?.expiry ?? '').trim();
  const cardHolder = String(body.card?.cardHolder ?? '').trim().toUpperCase();

  if (!/^4585020002\d{6}$/.test(pan)) throw httpError('Numéro de carte locale Market-Cash invalide.', 400, 'CARD_INVALID');
  if (!cardHolder) throw httpError('Titulaire de carte requis.', 400, 'CARD_HOLDER_REQUIRED');
  if (!/^\d{2}\/\d{2}$/.test(expiry)) throw httpError('Expiration invalide. Format attendu : MM/AA.', 400, 'EXPIRY_INVALID');
  if (!/^\d{3}$/.test(cvv)) throw httpError('CVV Market-Cash invalide.', 400, 'CVV_INVALID');
  if (body.cvvEntry !== 'manual') throw httpError('Le CVV doit être saisi manuellement.', 400, 'CVV_MANUAL_REQUIRED');
  if (!['manual', 'qr', 'nfc'].includes(String(body.captureMethod))) throw httpError('Mode de lecture carte invalide.', 400, 'CAPTURE_METHOD_INVALID');

  return { pan, cvv, expiry, cardHolder };
}

function targetFingerprint(target: ResolvedTarget) {
  return [target.kind, target.targetId, target.billingCycle || '', target.amountUsd, target.creditsAdded].join('|');
}

function marketCashMessage(code: string) {
  const messages: Record<string, string> = {
    UNAUTHORIZED: 'La clé API Market-Cash est invalide, inactive ou ne correspond à aucune application Developer active.',
    DEVELOPER_INACTIVE: 'Le compte Developer Market-Cash lié à cette clé n’est pas actif.',
    CARD_INVALID: 'Cette carte Market-Cash n’est pas valide.',
    CARD_NOT_FOUND: 'Cette carte n’existe pas dans Market-Cash.',
    CARD_INACTIVE: 'Cette carte Market-Cash n’est pas active.',
    CARD_ACCOUNT_INACTIVE: 'Le compte carte Market-Cash n’est pas actif.',
    HOLDER_MISMATCH: 'Le nom du titulaire ne correspond pas à la carte Market-Cash.',
    EXPIRY_MISMATCH: 'La date d’expiration ne correspond pas à la carte Market-Cash.',
    EXPIRY_INVALID: 'La date d’expiration est invalide.',
    CVV_INVALID: 'Le CVV Market-Cash est incorrect.',
    INSUFFICIENT_FUNDS: 'Solde insuffisant sur la carte Market-Cash, frais compris.',
    DEVELOPER_WALLET_INACTIVE: 'Le portefeuille Developer MUNGWELE n’est pas actif dans Market-Cash.',
  };
  return messages[code] || 'Paiement Market-Cash refusé.';
}

async function prepareIntent(params: {
  attemptId: string;
  uid: string;
  target: ResolvedTarget;
}) {
  const ref = adminDb.collection('marketCashPaymentIntents').doc(params.attemptId);
  const fingerprint = targetFingerprint(params.target);
  let existingResult: any = null;
  let externalReference = `MIA-${params.uid.slice(0, 14)}-${params.attemptId}`.slice(0, 118);

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const data: any = snap.data() || {};
      if (String(data.userId || '') !== params.uid || String(data.targetFingerprint || '') !== fingerprint) {
        throw httpError('Cette tentative de paiement appartient à un autre achat.', 409, 'PAYMENT_ATTEMPT_CONFLICT');
      }
      externalReference = String(data.externalReference || externalReference);
      if (data.status === 'settled' && data.result) existingResult = data.result;
      return;
    }

    tx.create(ref, {
      id: params.attemptId,
      userId: params.uid,
      targetKind: params.target.kind,
      targetId: params.target.targetId,
      targetFingerprint: fingerprint,
      amountUsd: params.target.amountUsd,
      creditsExpected: params.target.creditsAdded,
      externalReference,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  return { ref, externalReference, existingResult };
}

async function settlePurchase(params: {
  attemptId: string;
  externalReference: string;
  uid: string;
  target: ResolvedTarget;
  marketCash: any;
}) {
  const settlementRef = adminDb.collection('marketCashSettlements').doc(params.attemptId);
  const intentRef = adminDb.collection('marketCashPaymentIntents').doc(params.attemptId);
  const userRef = adminDb.collection('users').doc(params.uid);
  const creditTxRef = adminDb.collection('creditTransactions').doc(`market-cash-${params.attemptId}`);
  let response: any = null;

  await adminDb.runTransaction(async (tx) => {
    const [settlementSnap, userSnap] = await Promise.all([
      tx.get(settlementRef),
      tx.get(userRef),
    ]);

    if (settlementSnap.exists) {
      response = settlementSnap.data()?.result || null;
      return;
    }
    if (!userSnap.exists) throw httpError('Profil MUNGWELE introuvable.', 404, 'USER_NOT_FOUND');

    const user: any = userSnap.data() || {};
    const currentCredits = Math.max(0, Number(user.credits || 0));
    const balanceAfter = currentCredits + params.target.creditsAdded;
    const now = new Date();
    const nowIso = now.toISOString();
    const userUpdates: Record<string, unknown> = {
      credits: balanceAfter,
      updatedAt: nowIso,
    };

    let plan: string | undefined;
    let subscriptionEndsAt: string | undefined;
    if (params.target.kind === 'subscription' && params.target.planId) {
      plan = params.target.planId;
      const end = new Date(now.getTime());
      if (params.target.billingCycle === 'yearly') end.setUTCFullYear(end.getUTCFullYear() + 1);
      else end.setUTCMonth(end.getUTCMonth() + 1);
      subscriptionEndsAt = end.toISOString();
      Object.assign(userUpdates, {
        plan,
        subscriptionCycle: params.target.billingCycle,
        subscriptionStartedAt: nowIso,
        subscriptionEndsAt,
        subscriptionSource: 'market-cash',
      });
    }

    tx.update(userRef, userUpdates);
    tx.set(creditTxRef, {
      userId: params.uid,
      amount: params.target.creditsAdded,
      type: 'purchase',
      description: params.target.kind === 'credits'
        ? `Achat ${params.target.creditsAdded} crédits via Market-Cash`
        : `${params.target.label} via Market-Cash`,
      balanceAfter,
      source: 'market-cash',
      marketCashReference: params.marketCash.reference || null,
      externalReference: params.externalReference,
      amountPaidUsd: params.target.amountUsd,
      createdAt: nowIso,
    });

    response = {
      success: true,
      status: 'settled',
      transactionId: String(params.marketCash.reference || params.externalReference),
      reference: String(params.marketCash.reference || ''),
      externalReference: params.externalReference,
      amountUsd: params.target.amountUsd,
      feeAmount: Number(params.marketCash.feeAmount || 0),
      totalDebited: Number(params.marketCash.totalDebited || params.target.amountUsd),
      creditsAdded: params.target.creditsAdded,
      balanceAfter,
      plan,
      billingCycle: params.target.billingCycle,
      subscriptionEndsAt,
      duplicate: Boolean(params.marketCash.duplicate),
      message: params.target.kind === 'credits'
        ? `${params.target.creditsAdded} crédits ont été ajoutés.`
        : `${params.target.label} activé.`,
    };

    tx.set(settlementRef, {
      id: params.attemptId,
      userId: params.uid,
      status: 'settled',
      targetKind: params.target.kind,
      targetId: params.target.targetId,
      amountUsd: params.target.amountUsd,
      creditsAdded: params.target.creditsAdded,
      marketCashReference: params.marketCash.reference || null,
      externalReference: params.externalReference,
      result: response,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    tx.set(intentRef, {
      status: 'settled',
      marketCashReference: params.marketCash.reference || null,
      result: response,
      updatedAt: nowIso,
    }, { merge: true });
  });

  if (!response) throw httpError('Le paiement a été débité mais la synchronisation MUNGWELE doit être reprise.', 500, 'SETTLEMENT_PENDING');
  return response;
}

async function marketCashCaptureHandler(req: express.Request, res: express.Response) {
  const apiKey = process.env.MARKET_CASH_API_KEY?.trim();
  const endpoint = process.env.MARKET_CASH_API_URL?.trim() || DEFAULT_MARKET_CASH_ENDPOINT;
  if (!apiKey) return res.status(503).json({ resolved: false, error: 'Market-Cash n’est pas configuré.', code: 'MARKET_CASH_NOT_CONFIGURED' });

  try {
    await authenticatedUser(req);
    const cardReference = normalizeCaptureReference(req.body?.cardReference);
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'mungwele-ia-studio/market-cash-capture',
      },
      body: JSON.stringify({ operation: 'resolve-card', cardReference }),
    });
    const payload: any = await upstream.json().catch(() => ({}));
    if (!upstream.ok || payload?.resolved !== true) {
      const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 422;
      return res.status(status).json({ resolved: false, error: 'Cette carte Market-Cash n’a pas pu être reconnue.', code: String(payload?.code || 'CARD_REFERENCE_NOT_FOUND') });
    }
    return res.json({
      resolved: true,
      cardNumber: cleanDigits(payload.cardNumber),
      cardHolder: String(payload.cardHolder || '').trim(),
      expiry: String(payload.expiry || '').trim(),
      cardLast4: String(payload.cardLast4 || '').trim(),
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const code = String(error?.code || 'MARKET_CASH_CAPTURE_ERROR');
    console.warn('[MUNGWELE_MARKET_CASH_CAPTURE_ERROR]', code, String(error?.message || ''));
    return res.status(status >= 400 && status < 600 ? status : 500).json({ resolved: false, error: String(error?.message || 'Erreur de lecture Market-Cash.'), code });
  }
}

async function marketCashHandler(req: express.Request, res: express.Response) {
  const apiKey = process.env.MARKET_CASH_API_KEY?.trim();
  const endpoint = process.env.MARKET_CASH_API_URL?.trim() || DEFAULT_MARKET_CASH_ENDPOINT;

  if (!apiKey) {
    return res.status(503).json({
      error: 'La clé API Market-Cash n’est pas configurée côté serveur.',
      code: 'MARKET_CASH_NOT_CONFIGURED',
    });
  }

  try {
    const authUser = await authenticatedUser(req);
    const body = (req.body || {}) as MarketCashRequestBody;
    const target = await resolveTarget(body.target);
    const requestedAmount = Number(body.target?.amountUsd);
    if (Number.isFinite(requestedAmount) && Math.abs(roundMoney(requestedAmount) - target.amountUsd) > 0.009) {
      throw httpError('Le prix affiché a changé. Rechargez la page avant de payer.', 409, 'PRICE_CHANGED');
    }

    const card = validateCard(body);
    const attemptId = normalizeAttemptId(body.attemptId);
    const intent = await prepareIntent({ attemptId, uid: authUser.uid, target });
    if (intent.existingResult) return res.json(intent.existingResult);

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'mungwele-ia-studio/market-cash',
      },
      body: JSON.stringify({
        currency: 'USD',
        amount: target.amountUsd,
        cardNumber: card.pan,
        cardHolder: card.cardHolder,
        expiry: card.expiry,
        cvv: card.cvv,
        externalReference: intent.externalReference,
        reason: target.label,
      }),
    });

    const marketCash: any = await upstream.json().catch(() => ({}));
    const approved = upstream.ok && marketCash?.approved === true && marketCash?.status === 'approved';
    if (!approved) {
      const code = String(marketCash?.code || 'MARKET_CASH_PAYMENT_DECLINED');
      await intent.ref.set({
        status: 'declined',
        lastDeclineCode: code,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => undefined);
      return res.status(upstream.status >= 400 && upstream.status < 600 ? upstream.status : 402).json({
        success: false,
        status: 'declined',
        error: marketCashMessage(code),
        code,
      });
    }

    await intent.ref.set({
      status: 'approved',
      marketCashReference: marketCash.reference || null,
      marketCashDuplicate: Boolean(marketCash.duplicate),
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const settled = await settlePurchase({
      attemptId,
      externalReference: intent.externalReference,
      uid: authUser.uid,
      target,
      marketCash,
    });
    return res.json(settled);
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const code = String(error?.code || 'MARKET_CASH_PROXY_ERROR');
    console.warn('[MUNGWELE_MARKET_CASH_PAYMENT_ERROR]', code, String(error?.message || ''));
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      success: false,
      error: String(error?.message || 'Erreur Market-Cash inconnue.'),
      code,
    });
  }
}

export function installMarketCashPaymentProxy() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);

    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      this.get('/api/market-cash/status', (_req: express.Request, res: express.Response) => {
        res.json({
          configured: Boolean(process.env.MARKET_CASH_API_KEY),
          mode: 'market-cash-live-card-api',
        });
      });
      this.post('/api/market-cash/card-capture', marketCashCaptureHandler);
      this.post('/api/market-cash/payments', marketCashHandler);
    }

    return result;
  };
}
