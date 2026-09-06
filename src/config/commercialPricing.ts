export const PRICING_VERSION = 2026090602;

// MUNGWELE launch policy
// - Image/video/clips: provider cost + 33.33% commercial markup.
// - Music: provider cost + 50% commercial markup.
// The credit floor is based on the lowest commercial value we allow for a
// MUNGWELE credit so every provider quote is converted by the same rule.
export const PROVIDER_MARKUP_RATE = 1 / 3;
export const PROVIDER_RETAIL_MULTIPLIER = 1 + PROVIDER_MARKUP_RATE;
export const MUSIC_PROVIDER_MARKUP_RATE = 0.50;
export const MUSIC_RETAIL_MULTIPLIER = 1 + MUSIC_PROVIDER_MARKUP_RATE;
export const ANNUAL_DISCOUNT_PERCENT = 10;
export const MIN_USD_REVENUE_PER_CREDIT = 0.006;

export const LAUNCH_SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Gratuit',
    priceMonth: 0,
    creditsMonthly: 0,
    maxDownloadResolution: 'standard',
    features: ['100 crédits de bienvenue une seule fois', 'Achetez des crédits selon vos besoins', 'Téléchargement standard'],
  },
  {
    id: 'creator',
    name: 'Creator',
    priceMonth: 5,
    creditsMonthly: 500,
    popular: true,
    maxDownloadResolution: '720p',
    features: ['500 crédits chaque mois', 'Téléchargement vidéo jusqu’à 720p', 'Image, vidéo et musique avec tous les moteurs connectés selon le solde'],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonth: 10,
    creditsMonthly: 1250,
    maxDownloadResolution: '1080p',
    features: ['1 250 crédits chaque mois', 'Téléchargement vidéo jusqu’à 1080p', 'Priorité sur les moteurs premium et projets plus lourds'],
  },
  {
    id: 'studio',
    name: 'Studio',
    priceMonth: 20,
    creditsMonthly: 3000,
    maxDownloadResolution: '4k',
    features: ['3 000 crédits chaque mois', 'Téléchargement vidéo jusqu’à 4K', 'Meilleure valeur par crédit pour les créateurs intensifs'],
  },
] as const;

export const LAUNCH_CREDIT_PACKS = [
  { id: 'pack-300', name: 'Essentiel', credits: 300, priceUsd: 3, enabled: true },
  { id: 'pack-800', name: 'Créateur', credits: 800, priceUsd: 7, enabled: true },
  { id: 'pack-1600', name: 'Pro', credits: 1600, priceUsd: 13, enabled: true },
  { id: 'pack-3000', name: 'Studio', credits: 3000, priceUsd: 22, enabled: true },
] as const;

export type LaunchVideoModel = 'omni' | 'lite' | 'fast' | 'pro';
export type LaunchVideoDuration = 4 | 6 | 8;
export type LaunchVideoResolution = '720p' | '1080p' | '4k';

// Direct Google Gemini API paid-tier rates, USD per generated second.
// MUNGWELE currently renders the connected Veo flow in 720p; 1080p/4K rates
// remain here so the quote engine is ready when those settings are exposed.
export const VIDEO_PROVIDER_USD_PER_SECOND: Record<LaunchVideoModel, Record<LaunchVideoResolution, number | null>> = {
  lite: { '720p': 0.05, '1080p': 0.08, '4k': null },
  fast: { '720p': 0.10, '1080p': 0.12, '4k': 0.30 },
  pro: { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
  // Compatibility engine used by the existing multi-reference flow. It is not
  // promoted as a separate launch supplier; Google remains the supplier.
  omni: { '720p': 0.10, '1080p': 0.152, '4k': 0.304 },
};

export type SeedanceModel = 'seedance2_mini' | 'seedance2_fast' | 'seedance2' | 'seedance2_5';
export type SeedanceResolution = '480p' | '720p' | '1080p' | '4k';
export type SeedanceDuration = 4 | 5 | 6 | 8 | 10 | 15 | 30;

export interface SeedanceRate {
  outputUsdPerSecond: number;
  inputVideoUsdPerSecond?: number;
  minimumProviderUsd?: number;
}

// Runway Dev sells one developer credit for $0.01. These USD rates are the
// published Runway Dev rates converted to dollars. Runway is the selected API
// supplier for the Seedance family and for the dedicated clip engine Act-Two.
export const RUNWAY_USD_PER_CREDIT = 0.01;
export const SEEDANCE_PROVIDER_RATES: Record<SeedanceModel, Partial<Record<SeedanceResolution, SeedanceRate>>> = {
  seedance2_mini: {
    '480p': { outputUsdPerSecond: 0.16, minimumProviderUsd: 0.64 },
    '720p': { outputUsdPerSecond: 0.16, minimumProviderUsd: 0.64 },
  },
  seedance2_fast: {
    '480p': { outputUsdPerSecond: 0.29 },
    '720p': { outputUsdPerSecond: 0.29 },
  },
  seedance2: {
    '480p': { outputUsdPerSecond: 0.36 },
    '720p': { outputUsdPerSecond: 0.36 },
    '1080p': { outputUsdPerSecond: 0.40 },
    '4k': { outputUsdPerSecond: 1.50 },
  },
  seedance2_5: {
    '480p': { outputUsdPerSecond: 0.20, inputVideoUsdPerSecond: 0.10, minimumProviderUsd: 0.80 },
    '720p': { outputUsdPerSecond: 0.30, inputVideoUsdPerSecond: 0.15, minimumProviderUsd: 0.80 },
    '1080p': { outputUsdPerSecond: 0.68, inputVideoUsdPerSecond: 0.34, minimumProviderUsd: 0.80 },
  },
};

export const SEEDANCE_MODEL_LIMITS: Record<SeedanceModel, { minSeconds: number; maxSeconds: number; defaultResolution: SeedanceResolution }> = {
  seedance2_mini: { minSeconds: 4, maxSeconds: 15, defaultResolution: '720p' },
  seedance2_fast: { minSeconds: 4, maxSeconds: 15, defaultResolution: '720p' },
  seedance2: { minSeconds: 4, maxSeconds: 15, defaultResolution: '720p' },
  seedance2_5: { minSeconds: 4, maxSeconds: 30, defaultResolution: '720p' },
};

export const ELEVEN_MUSIC_USD_PER_MINUTE = 0.15;

// GPT-Image-2 is token-priced by OpenAI. MUNGWELE launches it in a controlled
// 1K medium profile. The base estimate mirrors the current medium 1K output
// cost and we keep a small per-reference input reserve for edits.
export const GPT_IMAGE_2_MEDIUM_ESTIMATED_USD = 0.053;
export const GPT_IMAGE_REFERENCE_ESTIMATED_USD = 0.01;

// Runway Act-Two is the one dedicated MUNGWELE Clips provider/model at launch.
// 5 Runway credits/s × $0.01 = $0.05/s.
export const RUNWAY_ACT_TWO_USD_PER_SECOND = 0.05;
export const RUNWAY_ACT_TWO_MIN_SECONDS = 3;
export const RUNWAY_ACT_TWO_MAX_SECONDS = 30;

export function roundCreditsUp(value: number, step = 5) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return Math.max(step, Math.ceil(safe / step) * step);
}

export function creditsForProviderCost(providerCostUsd: number, markupRate = PROVIDER_MARKUP_RATE) {
  const safeCost = Math.max(0, Number(providerCostUsd) || 0);
  const safeMarkup = Math.max(0, Number(markupRate) || 0);
  const retailUsd = safeCost * (1 + safeMarkup);
  return roundCreditsUp(retailUsd / MIN_USD_REVENUE_PER_CREDIT);
}

export function videoCreditsForRequest(
  model: LaunchVideoModel,
  duration: LaunchVideoDuration,
  options: { resolution?: LaunchVideoResolution; referenceImageCount?: number } = {},
) {
  const resolution = options.resolution || '720p';
  const rate = VIDEO_PROVIDER_USD_PER_SECOND[model][resolution];
  if (rate == null) throw new Error(`${model} ne prend pas en charge ${resolution}.`);
  if ((resolution === '1080p' || resolution === '4k') && duration !== 8) {
    throw new Error(`${resolution} nécessite une durée de 8 secondes avec Veo 3.1.`);
  }
  const providerCostUsd = rate * duration;
  const baseCredits = creditsForProviderCost(providerCostUsd);
  // Current Google image-input cost is absorbed by the rounded output quote so
  // client and server keep the same price for the compatibility Omni flow.
  const referenceCredits = 0;
  return {
    credits: baseCredits,
    baseCredits,
    referenceCredits,
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)),
    resolution,
  };
}

export const VIDEO_CREDIT_COSTS: Record<LaunchVideoModel, Record<LaunchVideoDuration, number>> = {
  lite: {
    4: videoCreditsForRequest('lite', 4).credits,
    6: videoCreditsForRequest('lite', 6).credits,
    8: videoCreditsForRequest('lite', 8).credits,
  },
  fast: {
    4: videoCreditsForRequest('fast', 4).credits,
    6: videoCreditsForRequest('fast', 6).credits,
    8: videoCreditsForRequest('fast', 8).credits,
  },
  omni: {
    4: videoCreditsForRequest('omni', 4).credits,
    6: videoCreditsForRequest('omni', 6).credits,
    8: videoCreditsForRequest('omni', 8).credits,
  },
  pro: {
    4: videoCreditsForRequest('pro', 4).credits,
    6: videoCreditsForRequest('pro', 6).credits,
    8: videoCreditsForRequest('pro', 8).credits,
  },
};

export function seedanceCreditsForRequest(
  model: SeedanceModel,
  durationSeconds: number,
  options: { resolution?: SeedanceResolution; inputVideoSeconds?: number } = {},
) {
  const limits = SEEDANCE_MODEL_LIMITS[model];
  const duration = Math.max(limits.minSeconds, Math.min(limits.maxSeconds, Math.round(Number(durationSeconds) || limits.minSeconds)));
  const resolution = options.resolution || limits.defaultResolution;
  const rate = SEEDANCE_PROVIDER_RATES[model][resolution];
  if (!rate) throw new Error(`${model} ne prend pas en charge ${resolution}.`);

  const inputVideoSeconds = model === 'seedance2_5'
    ? Math.max(0, Math.min(30, Number(options.inputVideoSeconds) || 0))
    : 0;
  const rawProviderCostUsd = rate.outputUsdPerSecond * duration
    + (rate.inputVideoUsdPerSecond || 0) * inputVideoSeconds;
  const providerCostUsd = Math.max(rate.minimumProviderUsd || 0, rawProviderCostUsd);

  return {
    credits: creditsForProviderCost(providerCostUsd),
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)),
    durationSeconds: duration,
    resolution,
    inputVideoSeconds,
  };
}

export const SEEDANCE_LAUNCH_EXAMPLES = {
  mini720: {
    10: seedanceCreditsForRequest('seedance2_mini', 10, { resolution: '720p' }).credits,
    15: seedanceCreditsForRequest('seedance2_mini', 15, { resolution: '720p' }).credits,
  },
  fast720: {
    10: seedanceCreditsForRequest('seedance2_fast', 10, { resolution: '720p' }).credits,
    15: seedanceCreditsForRequest('seedance2_fast', 15, { resolution: '720p' }).credits,
  },
  standard720: {
    10: seedanceCreditsForRequest('seedance2', 10, { resolution: '720p' }).credits,
    15: seedanceCreditsForRequest('seedance2', 15, { resolution: '720p' }).credits,
  },
  seedance25_480: {
    10: seedanceCreditsForRequest('seedance2_5', 10, { resolution: '480p' }).credits,
    15: seedanceCreditsForRequest('seedance2_5', 15, { resolution: '480p' }).credits,
    30: seedanceCreditsForRequest('seedance2_5', 30, { resolution: '480p' }).credits,
  },
  seedance25_720: {
    10: seedanceCreditsForRequest('seedance2_5', 10, { resolution: '720p' }).credits,
    15: seedanceCreditsForRequest('seedance2_5', 15, { resolution: '720p' }).credits,
    30: seedanceCreditsForRequest('seedance2_5', 30, { resolution: '720p' }).credits,
  },
  seedance25_1080: {
    10: seedanceCreditsForRequest('seedance2_5', 10, { resolution: '1080p' }).credits,
    15: seedanceCreditsForRequest('seedance2_5', 15, { resolution: '1080p' }).credits,
    30: seedanceCreditsForRequest('seedance2_5', 30, { resolution: '1080p' }).credits,
  },
} as const;

export function imageCreditsForRequest(referenceCount = 0) {
  const refs = Math.max(0, Math.min(8, Math.floor(Number(referenceCount) || 0)));
  const providerCostUsd = GPT_IMAGE_2_MEDIUM_ESTIMATED_USD + refs * GPT_IMAGE_REFERENCE_ESTIMATED_USD;
  return {
    credits: creditsForProviderCost(providerCostUsd),
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)),
  };
}

export function musicCreditsForDurationMs(durationMs: number) {
  const safeMs = Math.max(3000, Math.min(600000, Number(durationMs) || 0));
  const providerCostUsd = ELEVEN_MUSIC_USD_PER_MINUTE * (safeMs / 60000);
  return {
    credits: creditsForProviderCost(providerCostUsd, MUSIC_PROVIDER_MARKUP_RATE),
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * MUSIC_RETAIL_MULTIPLIER).toFixed(4)),
    durationSeconds: Math.max(1, Math.round(safeMs / 1000)),
  };
}

export function clipCreditsForDurationSeconds(durationSeconds: number) {
  const duration = Math.max(RUNWAY_ACT_TWO_MIN_SECONDS, Math.min(RUNWAY_ACT_TWO_MAX_SECONDS, Math.round(Number(durationSeconds) || RUNWAY_ACT_TWO_MIN_SECONDS)));
  const providerCostUsd = RUNWAY_ACT_TWO_USD_PER_SECOND * duration;
  return {
    credits: creditsForProviderCost(providerCostUsd),
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)),
    durationSeconds: duration,
  };
}

export const CLIP_LAUNCH_EXAMPLES = {
  10: clipCreditsForDurationSeconds(10).credits,
  15: clipCreditsForDurationSeconds(15).credits,
  30: clipCreditsForDurationSeconds(30).credits,
} as const;

export const LAUNCH_LEGACY_CREDIT_COSTS = {
  imageStandard: imageCreditsForRequest(0).credits,
  imageHd: imageCreditsForRequest(0).credits,
  video5s: VIDEO_CREDIT_COSTS.lite[4],
  video10s: VIDEO_CREDIT_COSTS.fast[8],
  musicTrack: musicCreditsForDurationMs(60000).credits,
  promptEnhance: 0,
} as const;
