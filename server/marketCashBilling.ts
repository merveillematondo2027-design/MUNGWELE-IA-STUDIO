import { createHash, randomUUID } from 'node:crypto';
import type express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';

const DEFAULT_MARKET_CASH_ENDPOINT = 'https://europe-west1-automarket-fintech.cloudfunctions.net/marketCashApiCardPaymentByKey';
const BILLING_CONSENT_VERSION = 'mungwele-billing-v1';
const SETUP_TTL_MS = 2 * 60 * 60 * 1000;
const WORKER_INTERVAL_MS = 15 * 60 * 1000;

let billingTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

export type BillingTarget = {
  kind: 'subscription' | 'credits';
  targetId: string;
  label: string;
  amountUsd: number;
  creditsAdded: number;
  planId?: 'creator' | 'pro' | 'studio';
  billingCycle?: 'monthly' | 'yearly';
};

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function httpError(message: string, status = 400, code = 'BILLING_REQUEST_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

async function authenticatedUser(req: express.Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw httpError('Connexion requise.', 401, 'AUTH_REQUIRED');
  const token = header.slice(7).trim();
  if (!token) throw httpError('Session Firebase invalide.', 401, 'AUTH_REQUIRED');
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, email: String(decoded.email || '') };
  } catch {
    throw httpError('Session Firebase invalide ou expirée.', 401, 'AUTH_INVALID');
  }
}

function marketCashConfig() {
  const apiKey = process.env.MARKET_CASH_API_KEY?.trim();
  const endpoint = process.env.MARKET_CASH_API_URL?.trim() || DEFAULT_MARKET_CASH_ENDPOINT;
  if (!apiKey) throw httpError('La clé API Market-Cash n’est pas configurée côté serveur.', 503, 'MARKET_CASH_NOT_CONFIGURED');
  return { apiKey, endpoint };
}

async function marketCashRequest(body: Record<string, unknown>) {
  const { apiKey, endpoint } = marketCashConfig();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'mungwele-ia-studio/billing',
    },
    body: JSON.stringify(body),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw httpError(
      String(payload?.message || payload?.error || 'Market-Cash a refusé l’opération.'),
      response.status >= 400 && response.status < 600 ? response.status : 502,
      String(payload?.code || 'MARKET_CASH_BILLING_ERROR'),
    );
  }
  return payload;
}

function publicMethod(data: any) {
  return {
    id: String(data.id || ''),
    provider: 'market-cash' as const,
    brand: 'Market-Cash',
    cardLast4: String(data.cardLast4 || ''),
    cardHolder: String(data.cardHolder || ''),
    expiry: String(data.expiry || ''),
    status: String(data.status || 'active'),
    isDefault: data.isDefault === true,
    createdAt: String(data.createdAt || ''),
    lastUsedAt: data.lastUsedAt ? String(data.lastUsedAt) : undefined,
  };
}

function newMethodId() {
  return `pm_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

function setupId() {
  return `setup_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

async function listMethodDocs(uid: string) {
  const snap = await adminDb.collection('billingPaymentMethods').where('userId', '==', uid).limit(30).get();
  return snap.docs
    .map((doc) => ({ ref: doc.ref, id: doc.id, data: { id: doc.id, ...(doc.data() || {}) } as any }))
    .filter((row) => row.data.status !== 'deleted');
}

async function saveMandate(params: {
  uid: string;
  mandate: any;
  cardFingerprint: string;
  makeDefault?: boolean;
}) {
  const existing = await listMethodDocs(params.uid);
  const match = existing.find((row) => row.data.cardFingerprint === params.cardFingerprint && row.data.status === 'active');
  const methodId = match?.id || newMethodId();
  const methodRef = adminDb.doc(`billingPaymentMethods/${methodId}`);
  const secretRef = adminDb.doc(`billingPaymentMethodSecrets/${methodId}`);
  const now = new Date().toISOString();
  const activeMethods = existing.filter((row) => row.data.status === 'active');
  const isDefault = params.makeDefault === true || activeMethods.length === 0 || match?.data.isDefault === true;
  const oldSecret = match ? await adminDb.doc(`billingPaymentMethodSecrets/${methodId}`).get() : null;
  const oldToken = String(oldSecret?.data()?.mandateToken || '');
  const newToken = String(params.mandate.mandateToken || '');
  if (!newToken) throw httpError('Market-Cash n’a pas retourné l’autorisation de paiement.', 502, 'MANDATE_TOKEN_MISSING');

  const batch = adminDb.batch();
  if (isDefault) {
    for (const row of activeMethods) {
      if (row.id !== methodId && row.data.isDefault === true) batch.set(row.ref, { isDefault: false, updatedAt: now }, { merge: true });
    }
  }
  batch.set(methodRef, {
    id: methodId,
    userId: params.uid,
    provider: 'market-cash',
    brand: 'Market-Cash',
    cardLast4: String(params.mandate.cardLast4 || ''),
    cardHolder: String(params.mandate.cardHolder || ''),
    expiry: String(params.mandate.expiry || ''),
    cardFingerprint: params.cardFingerprint,
    marketCashMandateId: String(params.mandate.mandateId || ''),
    recurringAllowed: params.mandate.recurringAllowed === true,
    status: 'active',
    isDefault,
    createdAt: match?.data.createdAt || now,
    updatedAt: now,
  }, { merge: true });
  batch.set(secretRef, {
    id: methodId,
    userId: params.uid,
    provider: 'market-cash',
    mandateToken: newToken,
    marketCashMandateId: String(params.mandate.mandateId || ''),
    updatedAt: now,
    createdAt: oldSecret?.data()?.createdAt || now,
  }, { merge: true });
  batch.set(adminDb.doc(`billingProfiles/${params.uid}`), {
    userId: params.uid,
    ...(isDefault ? { defaultPaymentMethodId: methodId } : {}),
    updatedAt: now,
    createdAt: now,
  }, { merge: true });
  await batch.commit();

  if (oldToken && oldToken !== newToken) {
    await marketCashRequest({ operation: 'revoke-mandate', mandateToken: oldToken }).catch(() => undefined);
  }

  return publicMethod({ id: methodId, ...(await methodRef.get()).data() });
}

export async function createBillingSetup(params: {
  uid: string;
  target: BillingTarget;
  marketCash: any;
  externalReference: string;
}) {
  const cardReference = String(params.marketCash?.cardReference || '').trim().toUpperCase();
  if (!/^MCL-[A-Z0-9_-]{4,120}$/.test(cardReference)) return null;
  const id = setupId();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + SETUP_TTL_MS).toISOString();
  const candidate = {
    brand: 'Market-Cash',
    cardLast4: String(params.marketCash?.cardLast4 || ''),
    cardHolder: String(params.marketCash?.cardHolder || ''),
    expiry: String(params.marketCash?.expiry || ''),
  };
  await adminDb.doc(`billingPaymentMethodSetups/${id}`).set({
    id,
    userId: params.uid,
    status: 'pending',
    cardReference,
    cardFingerprint: sha256(cardReference),
    originalExternalReference: params.externalReference,
    targetKind: params.target.kind,
    targetId: params.target.targetId,
    planId: params.target.planId || null,
    billingCycle: params.target.billingCycle || null,
    ...candidate,
    createdAt,
    expiresAt,
  });
  return { id, candidate };
}

async function enableAutoRenew(params: {
  uid: string;
  methodId: string;
  planId?: string;
  billingCycle?: string;
}) {
  const method = await adminDb.doc(`billingPaymentMethods/${params.methodId}`).get();
  const secret = await adminDb.doc(`billingPaymentMethodSecrets/${params.methodId}`).get();
  if (!method.exists || method.data()?.userId !== params.uid || method.data()?.status !== 'active') throw httpError('Moyen de paiement introuvable.', 404, 'PAYMENT_METHOD_NOT_FOUND');
  if (!secret.exists || secret.data()?.userId !== params.uid) throw httpError('Autorisation Market-Cash introuvable.', 409, 'PAYMENT_METHOD_SECRET_MISSING');
  const user = await adminDb.doc(`users/${params.uid}`).get();
  if (!user.exists) throw httpError('Profil MUNGWELE introuvable.', 404, 'USER_NOT_FOUND');
  const userData: any = user.data() || {};
  const planId = String(params.planId || userData.plan || '');
  const billingCycle = String(params.billingCycle || userData.subscriptionCycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly';
  const nextBillingAt = String(userData.subscriptionEndsAt || '');
  if (!['creator', 'pro', 'studio'].includes(planId) || !nextBillingAt || !Number.isFinite(Date.parse(nextBillingAt))) {
    throw httpError('Un abonnement actif est requis avant d’activer le paiement automatique.', 409, 'ACTIVE_SUBSCRIPTION_REQUIRED');
  }
  await marketCashRequest({
    operation: 'update-mandate-consent',
    mandateToken: String(secret.data()?.mandateToken || ''),
    allowRecurring: true,
    consentVersion: BILLING_CONSENT_VERSION,
  });
  const now = new Date().toISOString();
  await adminDb.doc(`billingProfiles/${params.uid}`).set({
    userId: params.uid,
    defaultPaymentMethodId: params.methodId,
    autoRenewEnabled: true,
    autoRenewPaymentMethodId: params.methodId,
    autoRenewPlanId: planId,
    autoRenewBillingCycle: billingCycle,
    nextBillingAt,
    autoRenewConsentAt: now,
    autoRenewConsentVersion: BILLING_CONSENT_VERSION,
    billingStatus: 'active',
    retryCount: 0,
    retryAt: null,
    updatedAt: now,
    createdAt: now,
  }, { merge: true });
  await adminDb.doc(`billingPaymentMethods/${params.methodId}`).set({ recurringAllowed: true, isDefault: true, updatedAt: now }, { merge: true });
}

async function disableAutoRenew(uid: string) {
  const profileRef = adminDb.doc(`billingProfiles/${uid}`);
  const profile = await profileRef.get();
  const methodId = String(profile.data()?.autoRenewPaymentMethodId || '');
  if (methodId) {
    const secret = await adminDb.doc(`billingPaymentMethodSecrets/${methodId}`).get();
    if (secret.exists && secret.data()?.userId === uid) {
      await marketCashRequest({
        operation: 'update-mandate-consent',
        mandateToken: String(secret.data()?.mandateToken || ''),
        allowRecurring: false,
        consentVersion: BILLING_CONSENT_VERSION,
      }).catch(() => undefined);
    }
    await adminDb.doc(`billingPaymentMethods/${methodId}`).set({ recurringAllowed: false, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => undefined);
  }
  await profileRef.set({
    userId: uid,
    autoRenewEnabled: false,
    billingStatus: 'disabled',
    retryCount: 0,
    retryAt: null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

async function billingSummary(uid: string) {
  const [methodRows, profileSnap, userSnap, setupSnap, settlementSnap, eventsSnap] = await Promise.all([
    listMethodDocs(uid),
    adminDb.doc(`billingProfiles/${uid}`).get(),
    adminDb.doc(`users/${uid}`).get(),
    adminDb.collection('billingPaymentMethodSetups').where('userId', '==', uid).limit(20).get(),
    adminDb.collection('marketCashSettlements').where('userId', '==', uid).limit(30).get(),
    adminDb.collection('billingEvents').where('userId', '==', uid).limit(30).get(),
  ]);

  const now = Date.now();
  const pendingSetups = setupSnap.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() || {}) } as any))
    .filter((row) => row.status === 'pending' && Date.parse(String(row.expiresAt || '')) > now)
    .sort((a, b) => Date.parse(String(b.createdAt || '')) - Date.parse(String(a.createdAt || '')));
  const pending = pendingSetups[0];

  const manualActivity = settlementSnap.docs.map((doc) => {
    const row: any = doc.data() || {};
    return {
      id: doc.id,
      type: row.targetKind === 'subscription' ? 'subscription_payment' : 'credit_purchase',
      status: String(row.status || 'settled'),
      label: row.targetKind === 'subscription' ? `Paiement abonnement ${String(row.targetId || '')}` : `Achat de crédits`,
      amountUsd: Number(row.amountUsd || 0),
      reference: String(row.marketCashReference || row.externalReference || ''),
      createdAt: String(row.createdAt || row.updatedAt || ''),
    };
  });
  const autoActivity = eventsSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) } as any));
  const activity = [...manualActivity, ...autoActivity]
    .sort((a, b) => Date.parse(String(b.createdAt || '')) - Date.parse(String(a.createdAt || '')))
    .slice(0, 20);

  const user: any = userSnap.data() || {};
  const profile: any = profileSnap.data() || {};
  return {
    methods: methodRows.map((row) => publicMethod(row.data)).sort((a, b) => Number(b.isDefault) - Number(a.isDefault)),
    profile: {
      autoRenewEnabled: profile.autoRenewEnabled === true,
      defaultPaymentMethodId: String(profile.defaultPaymentMethodId || ''),
      autoRenewPaymentMethodId: String(profile.autoRenewPaymentMethodId || ''),
      autoRenewPlanId: String(profile.autoRenewPlanId || ''),
      autoRenewBillingCycle: String(profile.autoRenewBillingCycle || ''),
      nextBillingAt: String(profile.nextBillingAt || user.subscriptionEndsAt || ''),
      billingStatus: String(profile.billingStatus || 'disabled'),
      retryCount: Number(profile.retryCount || 0),
      lastRenewedAt: String(profile.lastRenewedAt || ''),
      lastFailureCode: String(profile.lastFailureCode || ''),
    },
    subscription: {
      plan: String(user.plan || 'free'),
      billingCycle: String(user.subscriptionCycle || ''),
      endsAt: String(user.subscriptionEndsAt || ''),
    },
    pendingSetup: pending ? {
      id: String(pending.id),
      targetKind: String(pending.targetKind || ''),
      targetId: String(pending.targetId || ''),
      planId: String(pending.planId || ''),
      billingCycle: String(pending.billingCycle || ''),
      candidate: {
        brand: 'Market-Cash',
        cardLast4: String(pending.cardLast4 || ''),
        cardHolder: String(pending.cardHolder || ''),
        expiry: String(pending.expiry || ''),
      },
      expiresAt: String(pending.expiresAt || ''),
    } : null,
    activity,
  };
}

async function confirmSetupHandler(req: express.Request, res: express.Response) {
  try {
    const auth = await authenticatedUser(req);
    const id = String(req.body?.setupId || '').trim();
    const autoRenew = req.body?.autoRenew === true;
    const makeDefault = req.body?.makeDefault !== false;
    if (!/^setup_[a-f0-9]{20,30}$/i.test(id)) throw httpError('Autorisation de sauvegarde invalide.', 400, 'BILLING_SETUP_INVALID');
    const ref = adminDb.doc(`billingPaymentMethodSetups/${id}`);
    const snap = await ref.get();
    const setup: any = snap.data() || {};
    if (!snap.exists || setup.userId !== auth.uid) throw httpError('Autorisation de sauvegarde introuvable.', 404, 'BILLING_SETUP_NOT_FOUND');
    if (setup.status !== 'pending' || Date.parse(String(setup.expiresAt || '')) <= Date.now()) throw httpError('Cette proposition d’enregistrement a expiré.', 409, 'BILLING_SETUP_EXPIRED');

    const mandate = await marketCashRequest({
      operation: 'create-mandate',
      cardReference: String(setup.cardReference || ''),
      originalExternalReference: String(setup.originalExternalReference || ''),
      allowRecurring: autoRenew && setup.targetKind === 'subscription',
      consentVersion: BILLING_CONSENT_VERSION,
    });
    const method = await saveMandate({
      uid: auth.uid,
      mandate,
      cardFingerprint: String(setup.cardFingerprint || sha256(String(setup.cardReference || ''))),
      makeDefault,
    });
    await ref.set({ status: 'used', usedAt: new Date().toISOString(), savedPaymentMethodId: method.id, autoRenewEnabled: autoRenew && setup.targetKind === 'subscription' }, { merge: true });

    if (autoRenew && setup.targetKind === 'subscription') {
      await enableAutoRenew({ uid: auth.uid, methodId: method.id, planId: String(setup.planId || ''), billingCycle: String(setup.billingCycle || '') });
    }
    return res.json({ ok: true, method, autoRenewEnabled: autoRenew && setup.targetKind === 'subscription' });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: String(error?.message || 'Erreur de facturation.'), code: String(error?.code || 'BILLING_SETUP_ERROR') });
  }
}

async function registerPaymentMethodHandler(req: express.Request, res: express.Response) {
  try {
    const auth = await authenticatedUser(req);
    const card = req.body?.card || {};
    const cardNumber = String(card.cardNumber || '').replace(/\D/g, '');
    const cardHolder = String(card.cardHolder || '').trim();
    const expiry = String(card.expiry || '').trim();
    const cvv = String(card.cvv || '').replace(/\D/g, '');
    if (!/^4585020002\d{6}$/.test(cardNumber)) throw httpError('Numéro de carte Market-Cash invalide.', 400, 'CARD_INVALID');
    if (cardHolder.length < 2) throw httpError('Nom du titulaire requis.', 400, 'CARD_HOLDER_REQUIRED');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) throw httpError('Expiration invalide.', 400, 'EXPIRY_INVALID');
    if (!/^\d{3}$/.test(cvv)) throw httpError('CVV Market-Cash invalide.', 400, 'CVV_INVALID');

    const mandate = await marketCashRequest({
      operation: 'create-mandate',
      cardNumber,
      cardHolder,
      expiry,
      cvv,
      allowRecurring: false,
      consentVersion: BILLING_CONSENT_VERSION,
    });
    const cardReference = String(mandate.cardReference || '');
    const method = await saveMandate({
      uid: auth.uid,
      mandate,
      cardFingerprint: sha256(cardReference || `${cardHolder}|${expiry}|${mandate.cardLast4 || ''}`),
      makeDefault: req.body?.makeDefault !== false,
    });
    return res.json({ ok: true, method });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: String(error?.message || 'Impossible d’enregistrer la carte.'), code: String(error?.code || 'PAYMENT_METHOD_SAVE_ERROR') });
  }
}

async function billingSummaryHandler(req: express.Request, res: express.Response) {
  try {
    const auth = await authenticatedUser(req);
    return res.json(await billingSummary(auth.uid));
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({ error: String(error?.message || 'Facturation indisponible.'), code: String(error?.code || 'BILLING_SUMMARY_ERROR') });
  }
}

async function setDefaultHandler(req: express.Request, res: express.Response) {
  try {
    const auth = await authenticatedUser(req);
    const methodId = String(req.body?.methodId || '').trim();
    const rows = await listMethodDocs(auth.uid);
    const target = rows.find((row) => row.id === methodId && row.data.status === 'active');
    if (!target) throw httpError('Moyen de paiement introuvable.', 404, 'PAYMENT_METHOD_NOT_FOUND');
    const now = new Date().toISOString();
    const batch = adminDb.batch();
    for (const row of rows) batch.set(row.ref, { isDefault: row.id === methodId, updatedAt: now }, { merge: true });
    batch.set(adminDb.doc(`billingProfiles/${auth.uid}`), { userId: auth.uid, defaultPaymentMethodId: methodId, updatedAt: now }, { merge: true });
    await batch.commit();
    return res.json({ ok: true });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: String(error?.message || 'Impossible de modifier le moyen par défaut.'), code: String(error?.code || 'PAYMENT_METHOD_DEFAULT_ERROR') });
  }
}

async function removePaymentMethodHandler(req: express.Request, res: express.Response) {
  try {
    const auth = await authenticatedUser(req);
    const methodId = String(req.body?.methodId || '').trim();
    const methodRef = adminDb.doc(`billingPaymentMethods/${methodId}`);
    const secretRef = adminDb.doc(`billingPaymentMethodSecrets/${methodId}`);
    const [method, secret, profile] = await Promise.all([methodRef.get(), secretRef.get(), adminDb.doc(`billingProfiles/${auth.uid}`).get()]);
    if (!method.exists || method.data()?.userId !== auth.uid) throw httpError('Moyen de paiement introuvable.', 404, 'PAYMENT_METHOD_NOT_FOUND');
    if (secret.exists && secret.data()?.userId === auth.uid) {
      await marketCashRequest({ operation: 'revoke-mandate', mandateToken: String(secret.data()?.mandateToken || '') }).catch(() => undefined);
    }
    const linkedToAutoRenew = String(profile.data()?.autoRenewPaymentMethodId || '') === methodId;
    if (linkedToAutoRenew) await disableAutoRenew(auth.uid);
    const remaining = (await listMethodDocs(auth.uid)).filter((row) => row.id !== methodId && row.data.status === 'active');
    const fallback = remaining.find((row) => row.data.isDefault === true) || remaining[0];
    const now = new Date().toISOString();
    const batch = adminDb.batch();
    batch.set(methodRef, { status: 'deleted', isDefault: false, recurringAllowed: false, deletedAt: now, updatedAt: now }, { merge: true });
    batch.delete(secretRef);
    if (fallback) batch.set(fallback.ref, { isDefault: true, updatedAt: now }, { merge: true });
    batch.set(adminDb.doc(`billingProfiles/${auth.uid}`), { userId: auth.uid, defaultPaymentMethodId: fallback?.id || '', updatedAt: now }, { merge: true });
    await batch.commit();
    return res.json({ ok: true });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: String(error?.message || 'Impossible de supprimer ce moyen de paiement.'), code: String(error?.code || 'PAYMENT_METHOD_REMOVE_ERROR') });
  }
}

async function autoRenewHandler(req: express.Request, res: express.Response) {
  try {
    const auth = await authenticatedUser(req);
    if (req.body?.enabled === true) {
      const profile = await adminDb.doc(`billingProfiles/${auth.uid}`).get();
      const methodId = String(req.body?.methodId || profile.data()?.defaultPaymentMethodId || '');
      if (!methodId) throw httpError('Choisissez un moyen de paiement avant d’activer le renouvellement automatique.', 409, 'PAYMENT_METHOD_REQUIRED');
      await enableAutoRenew({ uid: auth.uid, methodId });
    } else {
      await disableAutoRenew(auth.uid);
    }
    return res.json({ ok: true, summary: await billingSummary(auth.uid) });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({ ok: false, error: String(error?.message || 'Impossible de modifier le renouvellement automatique.'), code: String(error?.code || 'AUTO_RENEW_ERROR') });
  }
}

async function loadSubscriptionPricing(planId: string, billingCycle: string) {
  const defaults = {
    annualDiscountPercent: 20,
    subscriptionPlans: [
      { id: 'creator', name: 'Creator', priceMonth: 10, creditsMonthly: 600 },
      { id: 'pro', name: 'Pro', priceMonth: 25, creditsMonthly: 1600 },
    ],
  };
  const snap = await adminDb.doc('appSettings/pricing').get();
  const data: any = snap.data() || {};
  const plans = Array.isArray(data.subscriptionPlans) && data.subscriptionPlans.length ? data.subscriptionPlans : defaults.subscriptionPlans;
  const plan: any = plans.find((item: any) => String(item.id) === planId && String(item.id) !== 'free');
  if (!plan) throw httpError('Abonnement introuvable.', 400, 'SUBSCRIPTION_PLAN_INVALID');
  const monthly = roundMoney(Number(plan.priceMonth || 0));
  const monthlyCredits = Math.max(0, Math.floor(Number(plan.creditsMonthly || 0)));
  const discount = Math.max(0, Math.min(80, Number(data.annualDiscountPercent ?? defaults.annualDiscountPercent)));
  const yearly = billingCycle === 'yearly';
  return {
    label: `Abonnement ${String(plan.name || planId)} ${yearly ? 'annuel' : 'mensuel'}`,
    amountUsd: yearly ? roundMoney(monthly * 12 * (1 - discount / 100)) : monthly,
    creditsAdded: yearly ? monthlyCredits * 12 : monthlyCredits,
  };
}

function addCycle(iso: string, cycle: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return new Date().toISOString();
  if (cycle === 'yearly') date.setUTCFullYear(date.getUTCFullYear() + 1);
  else date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString();
}

async function settleAutoRenewal(params: {
  uid: string;
  profile: any;
  methodId: string;
  externalReference: string;
  pricing: { label: string; amountUsd: number; creditsAdded: number };
  marketCash: any;
}) {
  const eventId = `renew_${sha256(params.externalReference).slice(0, 36)}`;
  const eventRef = adminDb.doc(`billingEvents/${eventId}`);
  const userRef = adminDb.doc(`users/${params.uid}`);
  const profileRef = adminDb.doc(`billingProfiles/${params.uid}`);
  const methodRef = adminDb.doc(`billingPaymentMethods/${params.methodId}`);
  const creditRef = adminDb.doc(`creditTransactions/auto-${eventId}`);
  const nextBillingAt = addCycle(String(params.profile.nextBillingAt || new Date().toISOString()), String(params.profile.autoRenewBillingCycle || 'monthly'));
  const now = new Date().toISOString();

  await adminDb.runTransaction(async (tx) => {
    const [existing, userSnap] = await Promise.all([tx.get(eventRef), tx.get(userRef)]);
    if (existing.exists && existing.data()?.status === 'settled') return;
    if (!userSnap.exists) throw httpError('Profil MUNGWELE introuvable.', 404, 'USER_NOT_FOUND');
    const user: any = userSnap.data() || {};
    const currentCredits = Math.max(0, Number(user.credits || 0));
    const balanceAfter = currentCredits + params.pricing.creditsAdded;
    tx.update(userRef, {
      credits: balanceAfter,
      plan: String(params.profile.autoRenewPlanId || user.plan || 'free'),
      subscriptionCycle: String(params.profile.autoRenewBillingCycle || 'monthly'),
      subscriptionEndsAt: nextBillingAt,
      subscriptionSource: 'market-cash-auto-renew',
      updatedAt: now,
    });
    tx.set(profileRef, {
      autoRenewEnabled: true,
      billingStatus: 'active',
      nextBillingAt,
      lastRenewedAt: now,
      lastFailureCode: '',
      retryCount: 0,
      retryAt: null,
      updatedAt: now,
    }, { merge: true });
    tx.set(methodRef, { lastUsedAt: now, recurringAllowed: true, updatedAt: now }, { merge: true });
    tx.set(creditRef, {
      userId: params.uid,
      amount: params.pricing.creditsAdded,
      type: 'purchase',
      description: `${params.pricing.label} — renouvellement automatique Market-Cash`,
      balanceAfter,
      source: 'market-cash-auto-renew',
      marketCashReference: String(params.marketCash.reference || ''),
      externalReference: params.externalReference,
      amountPaidUsd: params.pricing.amountUsd,
      createdAt: now,
    });
    tx.set(eventRef, {
      id: eventId,
      userId: params.uid,
      type: 'auto_renewal',
      status: 'settled',
      label: params.pricing.label,
      amountUsd: params.pricing.amountUsd,
      creditsAdded: params.pricing.creditsAdded,
      reference: String(params.marketCash.reference || ''),
      externalReference: params.externalReference,
      paymentMethodId: params.methodId,
      planId: String(params.profile.autoRenewPlanId || ''),
      billingCycle: String(params.profile.autoRenewBillingCycle || ''),
      createdAt: now,
      updatedAt: now,
    });
    tx.set(adminDb.collection('notifications').doc(), {
      userId: params.uid,
      type: 'success',
      title: 'Abonnement renouvelé automatiquement',
      message: `${params.pricing.label} a été renouvelé via Market-Cash. Prochaine facturation : ${new Date(nextBillingAt).toLocaleDateString('fr-FR')}.`,
      read: false,
      createdAt: now,
    });
  });
}

async function recordRenewalFailure(uid: string, profile: any, methodId: string, error: any, externalReference: string) {
  const retryCount = Math.max(0, Number(profile.retryCount || 0)) + 1;
  const disable = retryCount >= 3;
  const retryAt = disable ? null : new Date(Date.now() + retryCount * 24 * 60 * 60 * 1000).toISOString();
  const code = String(error?.code || 'AUTO_RENEW_PAYMENT_FAILED');
  const now = new Date().toISOString();
  const eventId = `renewfail_${sha256(`${externalReference}:${retryCount}`).slice(0, 36)}`;
  const batch = adminDb.batch();
  batch.set(adminDb.doc(`billingProfiles/${uid}`), {
    autoRenewEnabled: !disable,
    billingStatus: disable ? 'payment_failed' : 'retrying',
    retryCount,
    retryAt,
    lastFailureCode: code,
    lastFailureAt: now,
    updatedAt: now,
  }, { merge: true });
  batch.set(adminDb.doc(`billingEvents/${eventId}`), {
    id: eventId,
    userId: uid,
    type: 'auto_renewal',
    status: 'failed',
    label: 'Renouvellement automatique',
    amountUsd: 0,
    failureCode: code,
    externalReference,
    paymentMethodId: methodId,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(adminDb.collection('notifications').doc(), {
    userId: uid,
    type: 'error',
    title: disable ? 'Renouvellement automatique suspendu' : 'Paiement automatique non abouti',
    message: disable
      ? 'MUNGWELE a suspendu le paiement automatique après plusieurs échecs. Vérifiez votre moyen de paiement puis réactivez-le.'
      : 'Le renouvellement automatique n’a pas abouti. Une nouvelle tentative sera effectuée plus tard.',
    read: false,
    createdAt: now,
  });
  await batch.commit();

  if (disable) {
    const secret = await adminDb.doc(`billingPaymentMethodSecrets/${methodId}`).get();
    if (secret.exists) {
      await marketCashRequest({ operation: 'update-mandate-consent', mandateToken: String(secret.data()?.mandateToken || ''), allowRecurring: false, consentVersion: BILLING_CONSENT_VERSION }).catch(() => undefined);
      await adminDb.doc(`billingPaymentMethods/${methodId}`).set({ recurringAllowed: false, updatedAt: now }, { merge: true }).catch(() => undefined);
    }
  }
}

export async function runDueAutoRenewals() {
  if (workerRunning) return { ok: true, skipped: true };
  workerRunning = true;
  let processed = 0;
  let renewed = 0;
  let failed = 0;
  try {
    marketCashConfig();
    const snap = await adminDb.collection('billingProfiles').where('autoRenewEnabled', '==', true).limit(100).get();
    const now = Date.now();
    for (const doc of snap.docs) {
      const profile: any = doc.data() || {};
      const uid = String(profile.userId || doc.id);
      const dueAt = Date.parse(String(profile.nextBillingAt || ''));
      const retryAt = profile.retryAt ? Date.parse(String(profile.retryAt)) : 0;
      if (!Number.isFinite(dueAt) || dueAt > now || (retryAt && retryAt > now)) continue;
      processed += 1;
      const methodId = String(profile.autoRenewPaymentMethodId || profile.defaultPaymentMethodId || '');
      if (!methodId) {
        await recordRenewalFailure(uid, profile, '', httpError('Moyen de paiement manquant.', 409, 'PAYMENT_METHOD_REQUIRED'), `missing-${uid}-${dueAt}`);
        failed += 1;
        continue;
      }
      const secret = await adminDb.doc(`billingPaymentMethodSecrets/${methodId}`).get();
      if (!secret.exists || secret.data()?.userId !== uid) {
        await recordRenewalFailure(uid, profile, methodId, httpError('Autorisation de paiement manquante.', 409, 'PAYMENT_METHOD_SECRET_MISSING'), `missing-secret-${uid}-${dueAt}`);
        failed += 1;
        continue;
      }
      const planId = String(profile.autoRenewPlanId || '');
      const cycle = String(profile.autoRenewBillingCycle || 'monthly') === 'yearly' ? 'yearly' : 'monthly';
      const pricing = await loadSubscriptionPricing(planId, cycle);
      const externalReference = `MIA-REN-${uid.replace(/[^A-Za-z0-9]/g, '').slice(0, 12)}-${dueAt}`.slice(0, 118);
      try {
        const marketCash = await marketCashRequest({
          operation: 'charge-mandate',
          mandateToken: String(secret.data()?.mandateToken || ''),
          currency: 'USD',
          amount: pricing.amountUsd,
          externalReference,
          reason: pricing.label,
        });
        if (marketCash?.approved !== true || marketCash?.status !== 'approved') throw httpError('Paiement automatique refusé.', 402, String(marketCash?.code || 'AUTO_RENEW_DECLINED'));
        await settleAutoRenewal({ uid, profile, methodId, externalReference, pricing, marketCash });
        renewed += 1;
      } catch (error: any) {
        await recordRenewalFailure(uid, profile, methodId, error, externalReference);
        failed += 1;
      }
    }
    return { ok: true, processed, renewed, failed };
  } finally {
    workerRunning = false;
  }
}

export async function syncAutoRenewAfterSubscriptionPayment(uid: string, planId: string, billingCycle: string, subscriptionEndsAt: string) {
  const profileRef = adminDb.doc(`billingProfiles/${uid}`);
  const profile = await profileRef.get();
  if (!profile.exists || profile.data()?.autoRenewEnabled !== true) return;
  await profileRef.set({
    autoRenewPlanId: planId,
    autoRenewBillingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
    nextBillingAt: subscriptionEndsAt,
    billingStatus: 'active',
    retryCount: 0,
    retryAt: null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export function mountMarketCashBillingRoutes(app: any) {
  app.get('/api/market-cash/billing', billingSummaryHandler);
  app.post('/api/market-cash/payment-methods/confirm', confirmSetupHandler);
  app.post('/api/market-cash/payment-methods/register', registerPaymentMethodHandler);
  app.post('/api/market-cash/payment-methods/default', setDefaultHandler);
  app.post('/api/market-cash/payment-methods/remove', removePaymentMethodHandler);
  app.post('/api/market-cash/auto-renew', autoRenewHandler);
  app.post('/api/market-cash/billing/run-renewals', async (req: express.Request, res: express.Response) => {
    const expected = process.env.MUNGWELE_BILLING_CRON_SECRET?.trim();
    const provided = String(req.header('x-mungwele-billing-secret') || '');
    if (!expected || provided !== expected) return res.status(401).json({ ok: false, error: 'Accès refusé.' });
    return res.json(await runDueAutoRenewals());
  });
}

export function startMarketCashBillingWorker() {
  if (billingTimer) return;
  const initial = setTimeout(() => void runDueAutoRenewals().catch((error) => console.warn('[MUNGWELE_BILLING_WORKER_ERROR]', error)), 20_000);
  initial.unref?.();
  billingTimer = setInterval(() => void runDueAutoRenewals().catch((error) => console.warn('[MUNGWELE_BILLING_WORKER_ERROR]', error)), WORKER_INTERVAL_MS);
  billingTimer.unref?.();
}
