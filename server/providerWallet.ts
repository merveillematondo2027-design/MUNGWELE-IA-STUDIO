import { adminDb } from './firebaseAdmin';
import { omniCreditsForRequest, videoCreditsForRequest } from './pricing';

export const GOOGLE_CREDITS_PER_USD = 150;

const GOOGLE_EMPTY_WALLET = {
  providerId: 'google',
  label: 'Google Gemini / Veo',
  balanceUsd: 0,
  totalDepositedUsd: 0,
  totalSpentUsd: 0,
  creditsPerUsd: GOOGLE_CREDITS_PER_USD,
  equivalentCreditsRemaining: 0,
};

function iso() { return new Date().toISOString(); }
function roundUsd(value: number) { return Math.round((Number(value) || 0) * 10000) / 10000; }
function capacityCredits(balanceUsd: number) {
  return Math.max(0, Math.floor((Math.max(0, Number(balanceUsd) || 0) * GOOGLE_CREDITS_PER_USD) / 5) * 5);
}

function googleVideoProviderCostUsd(generation: any) {
  if (String(generation?.provider || '').toLowerCase() !== 'google' || generation?.type !== 'video') return null;
  const settings = generation?.settings || {};
  const model = String(settings.videoModel || '').toLowerCase();
  const duration = Number(settings.duration || generation?.duration || 8);

  try {
    if (model === 'omni') return omniCreditsForRequest(duration, '720p').providerCostUsd;
    if (model === 'lite' || model === 'fast' || model === 'pro') {
      const safeDuration = duration === 4 || duration === 6 ? duration : 8;
      return videoCreditsForRequest(model, safeDuration, { resolution: '720p' }).providerCostUsd;
    }
  } catch {
    // Fallback below.
  }

  const creditsUsed = Math.max(0, Number(generation?.creditsUsed || 0));
  return creditsUsed ? roundUsd(creditsUsed / GOOGLE_CREDITS_PER_USD) : null;
}

export async function readGoogleProviderWallet() {
  const [walletSnap, txSnap] = await Promise.all([
    adminDb.collection('providerWallets').doc('google').get(),
    adminDb.collection('providerWalletTransactions').where('providerId', '==', 'google').limit(80).get(),
  ]);
  const wallet = walletSnap.exists ? { ...GOOGLE_EMPTY_WALLET, ...(walletSnap.data() || {}) } : GOOGLE_EMPTY_WALLET;
  const transactions = txSnap.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a: any, b: any) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 20);
  return { wallet, transactions };
}

export async function addGoogleProviderDeposit(amountUsdInput: number, actorId: string) {
  const amountUsd = roundUsd(Number(amountUsdInput));
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) throw Object.assign(new Error('Le montant du dépôt doit être supérieur à 0.'), { status: 400 });
  if (amountUsd > 100000) throw Object.assign(new Error('Montant de dépôt trop élevé.'), { status: 400 });

  const walletRef = adminDb.collection('providerWallets').doc('google');
  const txRef = adminDb.collection('providerWalletTransactions').doc(`google-deposit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const createdAt = iso();

  await adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(walletRef);
    const current: any = snapshot.exists ? { ...GOOGLE_EMPTY_WALLET, ...(snapshot.data() || {}) } : GOOGLE_EMPTY_WALLET;
    const nextBalance = roundUsd(Number(current.balanceUsd || 0) + amountUsd);
    const nextDeposited = roundUsd(Number(current.totalDepositedUsd || 0) + amountUsd);
    transaction.set(walletRef, {
      ...current,
      providerId: 'google',
      label: 'Google Gemini / Veo',
      balanceUsd: nextBalance,
      totalDepositedUsd: nextDeposited,
      totalSpentUsd: roundUsd(Number(current.totalSpentUsd || 0)),
      creditsPerUsd: GOOGLE_CREDITS_PER_USD,
      equivalentCreditsRemaining: capacityCredits(nextBalance),
      createdAt: current.createdAt || createdAt,
      updatedAt: createdAt,
    }, { merge: true });
    transaction.set(txRef, {
      providerId: 'google',
      type: 'deposit',
      amountUsd,
      equivalentCredits: Math.round(amountUsd * GOOGLE_CREDITS_PER_USD),
      balanceAfterUsd: nextBalance,
      description: `Dépôt Google API +$${amountUsd.toFixed(2)}`,
      actorId,
      createdAt,
    });
  });

  return readGoogleProviderWallet();
}

export async function recordProviderWalletConsumption(generation: any) {
  const providerCostUsd = googleVideoProviderCostUsd(generation);
  if (!providerCostUsd || providerCostUsd <= 0 || !generation?.id) return;

  const walletRef = adminDb.collection('providerWallets').doc('google');
  const txRef = adminDb.collection('providerWalletTransactions').doc(`google-generation-${generation.id}`);

  await adminDb.runTransaction(async (transaction) => {
    const [walletSnap, txSnap] = await Promise.all([transaction.get(walletRef), transaction.get(txRef)]);
    if (txSnap.exists) return;

    // Tracking starts only after the administrator initializes the Google wallet
    // with a manual deposit. This avoids inventing a starting balance.
    if (!walletSnap.exists) return;

    const wallet: any = walletSnap.data() || {};
    const currentBalance = roundUsd(Number(wallet.balanceUsd || 0));
    const nextBalance = roundUsd(currentBalance - providerCostUsd);
    const currentSpent = roundUsd(Number(wallet.totalSpentUsd || 0));
    const nextSpent = roundUsd(currentSpent + providerCostUsd);
    const updatedAt = iso();

    transaction.set(walletRef, {
      providerId: 'google',
      label: 'Google Gemini / Veo',
      balanceUsd: nextBalance,
      totalSpentUsd: nextSpent,
      creditsPerUsd: GOOGLE_CREDITS_PER_USD,
      equivalentCreditsRemaining: capacityCredits(nextBalance),
      updatedAt,
    }, { merge: true });

    transaction.set(txRef, {
      providerId: 'google',
      type: 'generation',
      amountUsd: -roundUsd(providerCostUsd),
      equivalentCredits: -Math.max(0, Number(generation.creditsUsed || 0)),
      balanceAfterUsd: nextBalance,
      description: `Google API — ${generation.model || 'génération vidéo'}`,
      generationId: generation.id,
      model: generation.model || null,
      userId: generation.userId || null,
      createdAt: updatedAt,
    });
  });
}
