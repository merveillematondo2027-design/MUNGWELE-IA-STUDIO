export type MonetizedVideoModel = 'omni' | 'lite' | 'fast' | 'pro';
export type MonetizedDuration = 4 | 6 | 8;

// MUNGWELE's least valuable paid credit currently comes from the Pro plan:
// $25 / 1600 credits = $0.015625 revenue per credit.
// All provider-cost checks use this worst-case credit value.
export const MIN_USD_REVENUE_PER_CREDIT = 25 / 1600;
const VIDEO_TARGET_PROVIDER_COST_SHARE = 0.65;
const MUSIC_TARGET_PROVIDER_COST_SHARE = 0.50;

const USD_PER_SECOND: Record<MonetizedVideoModel, number> = {
  omni: 0.10,
  lite: 0.05,
  fast: 0.10,
  pro: 0.40,
};

// ElevenLabs public Eleven Music API reference price: $0.15/minute, taxes excluded.
export const ELEVEN_MUSIC_USD_PER_MINUTE = 0.15;

export function minimumSafeVideoCredits(model: MonetizedVideoModel, duration: MonetizedDuration) {
  const providerCost = USD_PER_SECOND[model] * duration;
  const requiredRevenue = providerCost / VIDEO_TARGET_PROVIDER_COST_SHARE;
  return Math.ceil(requiredRevenue / MIN_USD_REVENUE_PER_CREDIT);
}

export const VIDEO_CREDIT_COSTS: Record<MonetizedVideoModel, Record<MonetizedDuration, number>> = {
  omni: { 4: 40, 6: 60, 8: 80 },
  lite: { 4: 20, 6: 30, 8: 40 },
  fast: { 4: 40, 6: 60, 8: 80 },
  pro: { 4: 160, 6: 240, 8: 320 },
};

function roundUpToFive(value: number) {
  return Math.max(5, Math.ceil(value / 5) * 5);
}

export function musicCreditsForDurationMs(durationMs: number) {
  const safeMs = Math.max(3000, Math.min(600000, Number(durationMs) || 0));
  const providerCostUsd = ELEVEN_MUSIC_USD_PER_MINUTE * (safeMs / 60000);
  const requiredRevenueUsd = providerCostUsd / MUSIC_TARGET_PROVIDER_COST_SHARE;
  const rawCredits = requiredRevenueUsd / MIN_USD_REVENUE_PER_CREDIT;
  return {
    credits: roundUpToFive(rawCredits),
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRevenueUsd: Number(requiredRevenueUsd.toFixed(4)),
    durationSeconds: Math.max(1, Math.round(safeMs / 1000)),
  };
}

export function assertMonetizationSafe(model: MonetizedVideoModel, duration: MonetizedDuration, credits: number) {
  const minimum = minimumSafeVideoCredits(model, duration);
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_MONETIZATION_PRICE',
    });
  }
}

export function assertMusicMonetizationSafe(durationMs: number, credits: number) {
  const minimum = musicCreditsForDurationMs(durationMs).credits;
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification musique bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_MUSIC_MONETIZATION_PRICE',
    });
  }
}
