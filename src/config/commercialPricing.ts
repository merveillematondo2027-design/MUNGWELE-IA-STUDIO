export const PRICING_VERSION = 2026090703;

// MUNGWELE launch policy
// - Packs: $5/500, $10/1,100, $20/2,500.
// - Best-value pack reference: $0.008 per credit.
// - Standard image/video/clips: minimum 20% gross markup versus supplier cost
//   when credits come from the $20 pack. The smaller packs yield more margin.
// - Music keeps the requested 50% supplier markup.
export const PROVIDER_MARKUP_RATE = 0.20;
export const PROVIDER_RETAIL_MULTIPLIER = 1 + PROVIDER_MARKUP_RATE;
export const MUSIC_PROVIDER_MARKUP_RATE = 0.50;
export const MUSIC_RETAIL_MULTIPLIER = 1 + MUSIC_PROVIDER_MARKUP_RATE;
export const ANNUAL_DISCOUNT_PERCENT = 10;
export const MIN_USD_REVENUE_PER_CREDIT = 20 / 2500;

export const LAUNCH_SUBSCRIPTION_PLANS = [
  {
    id: 'free', name: 'Gratuit', priceMonth: 0, creditsMonthly: 0,
    maxDownloadResolution: 'standard',
    features: ['100 crédits de bienvenue une seule fois', 'Achetez des crédits selon vos besoins', 'Téléchargement standard'],
  },
  {
    id: 'creator', name: 'Creator', priceMonth: 5, creditsMonthly: 500, popular: true,
    maxDownloadResolution: '720p',
    features: ['500 crédits chaque mois', 'Téléchargement vidéo jusqu’à 720p', 'Image, vidéo et musique avec les moteurs disponibles'],
  },
  {
    id: 'pro', name: 'Pro', priceMonth: 10, creditsMonthly: 1100,
    maxDownloadResolution: '1080p',
    features: ['1 100 crédits chaque mois', 'Téléchargement vidéo jusqu’à 1080p', 'Accès aux moteurs premium selon le solde'],
  },
  {
    id: 'studio', name: 'Studio', priceMonth: 20, creditsMonthly: 2500,
    maxDownloadResolution: '4k',
    features: ['2 500 crédits chaque mois', 'Téléchargement vidéo jusqu’à 4K', 'Meilleure valeur par crédit pour les créateurs intensifs'],
  },
] as const;

export const LAUNCH_CREDIT_PACKS = [
  { id: 'pack-500', name: 'Essentiel', credits: 500, priceUsd: 5, enabled: true },
  { id: 'pack-1100', name: 'Créateur', credits: 1100, priceUsd: 10, enabled: true },
  { id: 'pack-2500', name: 'Studio', credits: 2500, priceUsd: 20, enabled: true },
] as const;

export type LaunchVideoModel = 'omni' | 'lite' | 'fast' | 'pro';
export type LaunchVideoDuration = 4 | 6 | 8;
export type LaunchVideoResolution = '720p' | '1080p' | '4k';

export const VIDEO_PROVIDER_USD_PER_SECOND: Record<LaunchVideoModel, Record<LaunchVideoResolution, number | null>> = {
  lite: { '720p': 0.05, '1080p': 0.08, '4k': null },
  fast: { '720p': 0.10, '1080p': 0.12, '4k': 0.30 },
  pro: { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
  omni: { '720p': 0.10, '1080p': 0.152, '4k': 0.304 },
};

export type SeedanceModel = 'seedance2_mini' | 'seedance2_fast' | 'seedance2' | 'seedance2_5';
export type SeedanceResolution = '480p' | '720p' | '1080p' | '4k';
export type SeedanceDuration = 4 | 5 | 6 | 8 | 10 | 15 | 30;
export interface SeedanceRate { outputUsdPerSecond: number; inputVideoUsdPerSecond?: number; minimumProviderUsd?: number; }

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

// MiniMax H3 Max on Runway Dev: 5 credits/s at 480p, 8 credits/s at 768p.
// MUNGWELE uses 768p as the public baseline because it is closer to the 720p
// quality tier used for the Google launch engines.
export type H3MaxResolution = '480p' | '768p';
export const H3_MAX_USD_PER_SECOND: Record<H3MaxResolution, number> = {
  '480p': 0.05,
  '768p': 0.08,
};
export const H3_MAX_MIN_SECONDS = 5;
export const H3_MAX_MAX_SECONDS = 15;

export const ELEVEN_MUSIC_USD_PER_MINUTE = 0.15;
export const GPT_IMAGE_2_MEDIUM_ESTIMATED_USD = 0.053;
export const GPT_IMAGE_REFERENCE_ESTIMATED_USD = 0.01;

export const RUNWAY_ACT_TWO_USD_PER_SECOND = 0.05;
export const RUNWAY_ACT_TWO_MIN_SECONDS = 3;
export const RUNWAY_ACT_TWO_MAX_SECONDS = 30;

export function roundCreditsUp(value: number, step = 5) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const normalized = Math.round(safe * 1_000_000_000) / 1_000_000_000;
  return Math.max(step, Math.ceil(normalized / step) * step);
}

export function creditsForProviderCost(providerCostUsd: number, markupRate = PROVIDER_MARKUP_RATE) {
  const safeCost = Math.max(0, Number(providerCostUsd) || 0);
  const safeMarkup = Math.max(0, Number(markupRate) || 0);
  return roundCreditsUp((safeCost * (1 + safeMarkup)) / MIN_USD_REVENUE_PER_CREDIT);
}

export function videoCreditsForRequest(
  model: LaunchVideoModel,
  duration: LaunchVideoDuration,
  options: { resolution?: LaunchVideoResolution; referenceImageCount?: number } = {},
) {
  const resolution = options.resolution || '720p';
  const rate = VIDEO_PROVIDER_USD_PER_SECOND[model][resolution];
  if (rate == null) throw new Error(`${model} ne prend pas en charge ${resolution}.`);
  if ((resolution === '1080p' || resolution === '4k') && duration !== 8) throw new Error(`${resolution} nécessite une durée de 8 secondes avec Veo 3.1.`);
  const providerCostUsd = rate * duration;
  return {
    credits: creditsForProviderCost(providerCostUsd),
    baseCredits: creditsForProviderCost(providerCostUsd),
    referenceCredits: 0,
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)),
    resolution,
  };
}

export function omniCreditsForRequest(durationSeconds: number, resolution: LaunchVideoResolution = '720p') {
  const duration = Math.max(3, Math.min(10, Math.round(Number(durationSeconds) || 8)));
  const rate = VIDEO_PROVIDER_USD_PER_SECOND.omni[resolution];
  if (rate == null) throw new Error(`Omni ne prend pas en charge ${resolution}.`);
  const providerCostUsd = rate * duration;
  return {
    credits: creditsForProviderCost(providerCostUsd), providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)), durationSeconds: duration, resolution,
  };
}

export const VIDEO_CREDIT_COSTS: Record<LaunchVideoModel, Record<LaunchVideoDuration, number>> = {
  lite: { 4: videoCreditsForRequest('lite', 4).credits, 6: videoCreditsForRequest('lite', 6).credits, 8: videoCreditsForRequest('lite', 8).credits },
  fast: { 4: videoCreditsForRequest('fast', 4).credits, 6: videoCreditsForRequest('fast', 6).credits, 8: videoCreditsForRequest('fast', 8).credits },
  omni: { 4: omniCreditsForRequest(4).credits, 6: omniCreditsForRequest(6).credits, 8: omniCreditsForRequest(8).credits },
  pro: { 4: videoCreditsForRequest('pro', 4).credits, 6: videoCreditsForRequest('pro', 6).credits, 8: videoCreditsForRequest('pro', 8).credits },
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
  const inputVideoSeconds = model === 'seedance2_5' ? Math.max(0, Math.min(30, Number(options.inputVideoSeconds) || 0)) : 0;
  const rawProviderCostUsd = rate.outputUsdPerSecond * duration + (rate.inputVideoUsdPerSecond || 0) * inputVideoSeconds;
  const providerCostUsd = Math.max(rate.minimumProviderUsd || 0, rawProviderCostUsd);
  return {
    credits: creditsForProviderCost(providerCostUsd), providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)), durationSeconds: duration, resolution, inputVideoSeconds,
  };
}

export function h3MaxCreditsForRequest(durationSeconds: number, resolution: H3MaxResolution = '768p') {
  const duration = Math.max(H3_MAX_MIN_SECONDS, Math.min(H3_MAX_MAX_SECONDS, Math.round(Number(durationSeconds) || 8)));
  const providerCostUsd = H3_MAX_USD_PER_SECOND[resolution] * duration;
  return {
    credits: creditsForProviderCost(providerCostUsd), providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)), durationSeconds: duration, resolution,
  };
}

export function videoEngineCreditsForRequest(
  engineKey: string,
  durationSeconds: number,
  options: { resolution?: LaunchVideoResolution | SeedanceResolution | H3MaxResolution; inputVideoSeconds?: number } = {},
) {
  const duration = Math.round(Number(durationSeconds) || 8);
  if (engineKey === 'veo-lite' || engineKey === 'veo-fast' || engineKey === 'veo-pro') {
    if (duration !== 4 && duration !== 6 && duration !== 8) throw new Error('Veo 3.1 prend en charge 4, 6 ou 8 secondes.');
    const model = engineKey === 'veo-lite' ? 'lite' : engineKey === 'veo-fast' ? 'fast' : 'pro';
    return videoCreditsForRequest(model, duration, { resolution: (options.resolution as LaunchVideoResolution) || '720p' });
  }
  if (engineKey === 'omni') return omniCreditsForRequest(duration, (options.resolution as LaunchVideoResolution) || '720p');
  if (engineKey === 'seedance-2-5') return seedanceCreditsForRequest('seedance2_5', duration, { resolution: (options.resolution as SeedanceResolution) || '720p', inputVideoSeconds: options.inputVideoSeconds });
  if (engineKey === 'h3-max') return h3MaxCreditsForRequest(duration, (options.resolution as H3MaxResolution) || '768p');
  throw new Error(`Moteur vidéo inconnu: ${engineKey}.`);
}

export const SEEDANCE_LAUNCH_EXAMPLES = {
  mini720: { 10: seedanceCreditsForRequest('seedance2_mini', 10, { resolution: '720p' }).credits, 15: seedanceCreditsForRequest('seedance2_mini', 15, { resolution: '720p' }).credits },
  fast720: { 10: seedanceCreditsForRequest('seedance2_fast', 10, { resolution: '720p' }).credits, 15: seedanceCreditsForRequest('seedance2_fast', 15, { resolution: '720p' }).credits },
  standard720: { 10: seedanceCreditsForRequest('seedance2', 10, { resolution: '720p' }).credits, 15: seedanceCreditsForRequest('seedance2', 15, { resolution: '720p' }).credits },
  seedance25_480: { 10: seedanceCreditsForRequest('seedance2_5', 10, { resolution: '480p' }).credits, 15: seedanceCreditsForRequest('seedance2_5', 15, { resolution: '480p' }).credits, 30: seedanceCreditsForRequest('seedance2_5', 30, { resolution: '480p' }).credits },
  seedance25_720: { 10: seedanceCreditsForRequest('seedance2_5', 10, { resolution: '720p' }).credits, 15: seedanceCreditsForRequest('seedance2_5', 15, { resolution: '720p' }).credits, 30: seedanceCreditsForRequest('seedance2_5', 30, { resolution: '720p' }).credits },
  seedance25_1080: { 10: seedanceCreditsForRequest('seedance2_5', 10, { resolution: '1080p' }).credits, 15: seedanceCreditsForRequest('seedance2_5', 15, { resolution: '1080p' }).credits, 30: seedanceCreditsForRequest('seedance2_5', 30, { resolution: '1080p' }).credits },
} as const;

export const VIDEO_ENGINE_LAUNCH_EXAMPLES = {
  veoLite720: { 4: videoEngineCreditsForRequest('veo-lite', 4).credits, 6: videoEngineCreditsForRequest('veo-lite', 6).credits, 8: videoEngineCreditsForRequest('veo-lite', 8).credits },
  veoFast720: { 4: videoEngineCreditsForRequest('veo-fast', 4).credits, 6: videoEngineCreditsForRequest('veo-fast', 6).credits, 8: videoEngineCreditsForRequest('veo-fast', 8).credits },
  veoPro720: { 4: videoEngineCreditsForRequest('veo-pro', 4).credits, 6: videoEngineCreditsForRequest('veo-pro', 6).credits, 8: videoEngineCreditsForRequest('veo-pro', 8).credits },
  omni720: { 4: videoEngineCreditsForRequest('omni', 4).credits, 6: videoEngineCreditsForRequest('omni', 6).credits, 8: videoEngineCreditsForRequest('omni', 8).credits },
  seedance25720: { 4: videoEngineCreditsForRequest('seedance-2-5', 4).credits, 6: videoEngineCreditsForRequest('seedance-2-5', 6).credits, 8: videoEngineCreditsForRequest('seedance-2-5', 8).credits, 10: videoEngineCreditsForRequest('seedance-2-5', 10).credits, 15: videoEngineCreditsForRequest('seedance-2-5', 15).credits, 30: videoEngineCreditsForRequest('seedance-2-5', 30).credits },
  h3Max768: { 5: videoEngineCreditsForRequest('h3-max', 5).credits, 6: videoEngineCreditsForRequest('h3-max', 6).credits, 8: videoEngineCreditsForRequest('h3-max', 8).credits, 10: videoEngineCreditsForRequest('h3-max', 10).credits, 15: videoEngineCreditsForRequest('h3-max', 15).credits },
} as const;

export function imageCreditsForRequest(referenceCount = 0) {
  const refs = Math.max(0, Math.min(8, Math.floor(Number(referenceCount) || 0)));
  const providerCostUsd = GPT_IMAGE_2_MEDIUM_ESTIMATED_USD + refs * GPT_IMAGE_REFERENCE_ESTIMATED_USD;
  return { credits: creditsForProviderCost(providerCostUsd), providerCostUsd: Number(providerCostUsd.toFixed(4)), estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)) };
}

export function musicCreditsForDurationMs(durationMs: number) {
  const safeMs = Math.max(3000, Math.min(600000, Number(durationMs) || 0));
  const providerCostUsd = ELEVEN_MUSIC_USD_PER_MINUTE * (safeMs / 60000);
  return { credits: creditsForProviderCost(providerCostUsd, MUSIC_PROVIDER_MARKUP_RATE), providerCostUsd: Number(providerCostUsd.toFixed(4)), estimatedRetailUsd: Number((providerCostUsd * MUSIC_RETAIL_MULTIPLIER).toFixed(4)), durationSeconds: Math.max(1, Math.round(safeMs / 1000)) };
}

export function clipCreditsForDurationSeconds(durationSeconds: number) {
  const duration = Math.max(RUNWAY_ACT_TWO_MIN_SECONDS, Math.min(RUNWAY_ACT_TWO_MAX_SECONDS, Math.round(Number(durationSeconds) || RUNWAY_ACT_TWO_MIN_SECONDS)));
  const providerCostUsd = RUNWAY_ACT_TWO_USD_PER_SECOND * duration;
  return { credits: creditsForProviderCost(providerCostUsd), providerCostUsd: Number(providerCostUsd.toFixed(4)), estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)), durationSeconds: duration };
}

export const CLIP_LAUNCH_EXAMPLES = { 10: clipCreditsForDurationSeconds(10).credits, 15: clipCreditsForDurationSeconds(15).credits, 30: clipCreditsForDurationSeconds(30).credits } as const;

export const LAUNCH_LEGACY_CREDIT_COSTS = {
  imageStandard: imageCreditsForRequest(0).credits,
  imageHd: imageCreditsForRequest(0).credits,
  video5s: VIDEO_CREDIT_COSTS.lite[4],
  video10s: VIDEO_CREDIT_COSTS.fast[8],
  musicTrack: musicCreditsForDurationMs(60000).credits,
  promptEnhance: 0,
} as const;
