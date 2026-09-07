import { adminDb } from './firebaseAdmin';
import { omniCreditsForRequest, videoCreditsForRequest } from './pricing';

const GOOGLE_CREDITS_PER_USD = 150;

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
