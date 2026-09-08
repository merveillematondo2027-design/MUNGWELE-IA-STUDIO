import { createHash } from 'node:crypto';
import express from 'express';
import { adminDb } from './firebaseAdmin';
import { PRICING_VERSION } from '../src/config/commercialPricing';

const INSTALL_FLAG = Symbol.for('mungwele.mpesaLiveCallbackInstalled');
const APP_FLAG = Symbol.for('mungwele.mpesaLiveCallbackRoutesMounted');

const clean = (value: unknown, max = 180) => String(value ?? '').trim().slice(0, max);
const money = (value: number) => Math.round(value * 100) / 100;

function callbackField(body: any, ...keys: string[]) {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return '';
}

function callbackAck(originalConversationId: string, description = 'Callback received successfully') {
  return {
    output_OriginalConversationID: originalConversationId,
    output_ResponseCode: 'INS-0',
    output_ResponseDesc: description,
  };
}

function callbackEventId(originalConversationId: string, transactionId: string, resultCode: string) {
  return createHash('sha256')
    .update(`${originalConversationId}|${transactionId}|${resultCode}`)
    .digest('hex')
    .slice(0, 48);
}

function expectedThirdPartyConversationId(intentId: string) {
  const seed = intentId.replace(/[^a-zA-Z0-9]/g, '');
  return `MIA${seed}`.slice(0, 40);
}

function uuidFromThirdPartyConversationId(value: string) {
  const compact = value.startsWith('MIA') ? value.slice(3) : '';
  if (!/^[a-fA-F0-9]{32}$/.test(compact)) return '';
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
}

type ResolvedStoredTarget = {
  kind: 'credits' | 'subscription';
  targetId: string;
  label: string;
  amountUsd: number;
  creditsAdded: number;
  planId?: 'creator' | 'pro' | 'studio';
  billingCycle?: 'monthly' | 'yearly';
};

function targetFromIntent(data: any): ResolvedStoredTarget | null {
  const kind = clean(data?.targetKind, 32);
  const targetId = clean(data?.targetId, 80);
  const amountUsd = money(Number(data?.amountUsd || 0));
  const creditsAdded = Math.max(0, Math.floor(Number(data?.creditsExpected || 0)));
  if ((kind !== 'credits' && kind !== 'subscription') || !targetId || !amountUsd || !creditsAdded) return null;

  if (kind === 'credits') {
    return {
      kind: 'credits',
      targetId,
      label: `${creditsAdded} crédits MUNGWELE`,
      amountUsd,
      creditsAdded,
    };
  }

  const fingerprint = clean(data?.targetFingerprint, 240);
  const cycleFromFingerprint = fingerprint.split('|')[2];
  const billingCycle: 'monthly' | 'yearly' = cycleFromFingerprint === 'yearly' ? 'yearly' : 'monthly';
  const planId = targetId as 'creator' | 'pro' | 'studio';
  return {
    kind: 'subscription',
    targetId,
    planId,
    billingCycle,
    label: `Abonnement ${targetId} ${billingCycle === 'yearly' ? 'annuel' : 'mensuel'}`,
    amountUsd,
    creditsAdded,
  };
}

async function findIntent(originalConversationId: string, thirdPartyConversationId: string) {
  if (originalConversationId) {
    const query = await adminDb
      .collection('mobileMoneyPaymentIntents')
      .where('mpesaConversationId', '==', originalConversationId)
      .limit(2)
      .get();
    if (query.size === 1) return query.docs[0];
    if (query.size > 1) return null;
  }

  const reconstructedId = uuidFromThirdPartyConversationId(thirdPartyConversationId);
  if (reconstructedId) {
    const snap = await adminDb.collection('mobileMoneyPaymentIntents').doc(reconstructedId).get();
    if (snap.exists) return snap;
  }

  return null;
}

async function settleFromCallback(
  intentDoc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot,
  target: ResolvedStoredTarget,
  callback: {
    originalConversationId: string;
    transactionId: string;
    resultCode: string;
    resultDesc: string;
    thirdPartyConversationId: string;
  },
) {
  const id = intentDoc.id;
  const intentData: any = intentDoc.data() || {};
  const uid = clean(intentData.userId, 160);
  if (!uid) throw new Error('Intent M-Pesa sans utilisateur associé.');

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
    if (!userSnap.exists) throw new Error('Profil MUNGWELE introuvable pour le paiement M-Pesa.');

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
        subscriptionSource: 'mpesa-live-callback',
      });
    }

    result = {
      success: true,
      status: 'settled',
      provider: 'mpesa',
      environment: 'production',
      transactionId: callback.transactionId,
      conversationId: callback.originalConversationId,
      responseCode: callback.resultCode || 'INS-0',
      amountUsd: target.amountUsd,
      creditsAdded: target.creditsAdded,
      balanceAfter,
      plan,
      billingCycle: target.billingCycle,
      subscriptionEndsAt,
      message: target.kind === 'credits'
        ? `${target.creditsAdded} crédits ont été ajoutés.`
        : `${target.label} activé.`,
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
      source: 'mpesa-live-callback',
      mpesaTransactionId: callback.transactionId,
      mpesaConversationId: callback.originalConversationId,
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
      callbackVerifiedByCorrelation: true,
      result,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    tx.set(intentRef, {
      status: 'settled',
      result,
      callbackResultCode: callback.resultCode,
      callbackResultDesc: callback.resultDesc,
      callbackTransactionId: callback.transactionId,
      callbackReceivedAt: nowIso,
      updatedAt: nowIso,
    }, { merge: true });
  });

  return result;
}

async function callbackHandler(req: express.Request, res: express.Response) {
  const body: any = req.body && typeof req.body === 'object' ? req.body : {};
  const originalConversationId = clean(callbackField(
    body,
    'input_OriginalConversationID',
    'input_OriginalConversationId',
    'OriginalConversationID',
    'OriginalConversationId',
  ), 160);
  const transactionId = clean(callbackField(
    body,
    'input_TransactionID',
    'input_TransactionId',
    'TransactionID',
    'TransactionId',
  ), 160);
  const resultCode = clean(callbackField(
    body,
    'input_ResultCode',
    'input_ResponseCode',
    'ResultCode',
    'ResponseCode',
  ), 32);
  const resultDesc = clean(callbackField(
    body,
    'input_ResultDesc',
    'input_ResponseDesc',
    'ResultDesc',
    'ResponseDesc',
  ), 300);
  const thirdPartyConversationId = clean(callbackField(
    body,
    'input_ThirdPartyConversationID',
    'input_ThirdPartyConversationId',
    'ThirdPartyConversationID',
    'ThirdPartyConversationId',
    'ThirdPartyReference',
  ), 160);

  if (!originalConversationId && !thirdPartyConversationId) {
    return res.status(400).json({ error: 'Référence de conversation M-Pesa absente.' });
  }

  const eventId = callbackEventId(originalConversationId, transactionId, resultCode);
  const eventRef = adminDb.collection('mpesaCallbackEvents').doc(eventId);
  const receivedAt = new Date().toISOString();

  try {
    const intentDoc = await findIntent(originalConversationId, thirdPartyConversationId);
    if (!intentDoc) {
      await eventRef.set({
        provider: 'mpesa',
        environment: 'production',
        status: 'unmatched',
        originalConversationId: originalConversationId || null,
        thirdPartyConversationId: thirdPartyConversationId || null,
        transactionId: transactionId || null,
        resultCode: resultCode || null,
        resultDesc: resultDesc || null,
        receivedAt,
      }, { merge: true });
      return res.status(200).json(callbackAck(originalConversationId, 'Callback received; reconciliation pending'));
    }

    const intent: any = intentDoc.data() || {};
    const expectedThirdParty = expectedThirdPartyConversationId(intentDoc.id);
    if (thirdPartyConversationId && thirdPartyConversationId !== expectedThirdParty) {
      await eventRef.set({
        provider: 'mpesa',
        environment: 'production',
        status: 'correlation_mismatch',
        intentId: intentDoc.id,
        originalConversationId: originalConversationId || null,
        thirdPartyConversationId,
        expectedThirdPartyConversationId: expectedThirdParty,
        transactionId: transactionId || null,
        resultCode: resultCode || null,
        resultDesc: resultDesc || null,
        receivedAt,
      }, { merge: true });
      return res.status(200).json(callbackAck(originalConversationId, 'Callback correlation rejected'));
    }

    if (clean(intent.provider, 32) !== 'mpesa' || clean(intent.environment, 32) !== 'production') {
      await eventRef.set({
        provider: 'mpesa',
        environment: 'production',
        status: 'wrong_environment',
        intentId: intentDoc.id,
        originalConversationId: originalConversationId || null,
        transactionId: transactionId || null,
        resultCode: resultCode || null,
        receivedAt,
      }, { merge: true });
      return res.status(200).json(callbackAck(originalConversationId, 'Callback ignored'));
    }

    await eventRef.set({
      provider: 'mpesa',
      environment: 'production',
      status: resultCode === 'INS-0' ? 'success_received' : 'failed_received',
      intentId: intentDoc.id,
      originalConversationId: originalConversationId || null,
      thirdPartyConversationId: thirdPartyConversationId || null,
      transactionId: transactionId || null,
      resultCode: resultCode || null,
      resultDesc: resultDesc || null,
      receivedAt,
    }, { merge: true });

    if (resultCode !== 'INS-0') {
      await intentDoc.ref.set({
        status: 'failed',
        callbackResultCode: resultCode || null,
        callbackResultDesc: resultDesc || null,
        callbackTransactionId: transactionId || null,
        callbackReceivedAt: receivedAt,
        updatedAt: receivedAt,
      }, { merge: true });
      return res.status(200).json(callbackAck(originalConversationId));
    }

    if (!transactionId) {
      await intentDoc.ref.set({
        status: 'pending',
        callbackResultCode: resultCode,
        callbackResultDesc: resultDesc || null,
        callbackReceivedAt: receivedAt,
        reconciliationRequired: true,
        updatedAt: receivedAt,
      }, { merge: true });
      return res.status(200).json(callbackAck(originalConversationId, 'Callback received; transaction verification pending'));
    }

    const target = targetFromIntent(intent);
    if (!target) {
      await intentDoc.ref.set({
        status: 'pending',
        callbackResultCode: resultCode,
        callbackResultDesc: resultDesc || null,
        callbackTransactionId: transactionId,
        callbackReceivedAt: receivedAt,
        reconciliationRequired: true,
        updatedAt: receivedAt,
      }, { merge: true });
      return res.status(200).json(callbackAck(originalConversationId, 'Callback received; purchase reconciliation pending'));
    }

    await settleFromCallback(intentDoc, target, {
      originalConversationId,
      transactionId,
      resultCode,
      resultDesc,
      thirdPartyConversationId,
    });
    await eventRef.set({ status: 'settled', settledAt: new Date().toISOString() }, { merge: true });

    return res.status(200).json(callbackAck(originalConversationId));
  } catch (error: any) {
    console.error('[MUNGWELE_MPESA_LIVE_CALLBACK_ERROR]', String(error?.message || error));
    await eventRef.set({
      provider: 'mpesa',
      environment: 'production',
      status: 'error',
      originalConversationId: originalConversationId || null,
      thirdPartyConversationId: thirdPartyConversationId || null,
      transactionId: transactionId || null,
      resultCode: resultCode || null,
      resultDesc: resultDesc || null,
      error: clean(error?.message || error, 500),
      receivedAt,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => undefined);

    return res.status(503).json({
      error: 'Callback M-Pesa reçu mais traitement temporairement indisponible.',
      output_OriginalConversationID: originalConversationId,
    });
  }
}

export function installMpesaLiveCallback() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);
    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      this.get('/api/mobile-money/mpesa/callback', (_req: express.Request, res: express.Response) => {
        res.json({
          ok: true,
          provider: 'mpesa',
          environment: 'production',
          callback: '/api/mobile-money/mpesa/callback',
          accepts: 'POST',
        });
      });
      this.post('/api/mobile-money/mpesa/callback', callbackHandler);
    }
    return result;
  };
}
