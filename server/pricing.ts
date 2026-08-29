export type MonetizedVideoModel = 'omni' | 'lite' | 'fast' | 'pro';
export type MonetizedDuration = 4 | 6 | 8;
export type MonetizedMusicDuration = 30 | 60 | 120;

// MUNGWELE's least valuable paid credit currently comes from the Pro plan:
// $25 / 1600 credits = $0.015625 revenue per credit.
// We price provider cost against that worst case so every paid plan remains profitable.
const MIN_USD_REVENUE_PER_CREDIT = 25 / 1600;
const TARGET_PROVIDER_COST_SHARE = 0.65; // ~35% gross margin before payment/tax/hosting overhead.

// Google public paid-tier 720p reference prices, USD/second.
const USD_PER_SECOND: Record<MonetizedVideoModel, number> = {
  omni: 0.10,
  lite: 0.05,
  fast: 0.10,
  pro: 0.40,
};

// ElevenLabs public API reference price for Music: $0.15/minute.
const ELEVEN_MUSIC_USD_PER_MINUTE = 0.15;

export function minimumSafeVideoCredits(model: MonetizedVideoModel, duration: MonetizedDuration) {
  const providerCost = USD_PER_SECOND[model] * duration;
  const requiredRevenue = providerCost / TARGET_PROVIDER_COST_SHARE;
  return Math.ceil(requiredRevenue / MIN_USD_REVENUE_PER_CREDIT);
}

export const VIDEO_CREDIT_COSTS: Record<MonetizedVideoModel, Record<MonetizedDuration, number>> = {
  omni: { 4: 40, 6: 60, 8: 80 },
  lite: { 4: 20, 6: 30, 8: 40 },
  fast: { 4: 40, 6: 60, 8: 80 },
  pro: { 4: 160, 6: 240, 8: 320 },
};

export const MUSIC_CREDIT_COSTS: Record<MonetizedMusicDuration, number> = {
  30: 10,
  60: 18,
  120: 34,
};

export function minimumSafeMusicCredits(duration: MonetizedMusicDuration) {
  const providerCost = ELEVEN_MUSIC_USD_PER_MINUTE * (duration / 60);
  const requiredRevenue = providerCost / TARGET_PROVIDER_COST_SHARE;
  return Math.ceil(requiredRevenue / MIN_USD_REVENUE_PER_CREDIT);
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

export function assertMusicMonetizationSafe(duration: MonetizedMusicDuration, credits: number) {
  const minimum = minimumSafeMusicCredits(duration);
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification musique bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_MUSIC_MONETIZATION_PRICE',
    });
  }
}
