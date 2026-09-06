export const PRICING_VERSION = 20260906;

// MUNGWELE launch policy: provider cost + 33.33% commercial markup.
// A 33.33% markup corresponds to a 25% gross margin before payment, hosting,
// storage, retries, tax and FX costs. The credit floor is intentionally based
// on the cheapest effective annual subscription credit so every other offer
// remains at least as safe.
export const PROVIDER_MARKUP_RATE = 1 / 3;
export const PROVIDER_RETAIL_MULTIPLIER = 1 + PROVIDER_MARKUP_RATE;
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

// Current public API rate references used by the connected engines.
// null means the provider does not currently expose that resolution for the model.
export const VIDEO_PROVIDER_USD_PER_SECOND: Record<LaunchVideoModel, Record<LaunchVideoResolution, number | null>> = {
  lite: { '720p': 0.05, '1080p': 0.08, '4k': null },
  fast: { '720p': 0.10, '1080p': 0.12, '4k': 0.30 },
  pro: { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
  // Gemini Omni Flash is currently generated at 720p in MUNGWELE.
  // Higher-resolution values are conservative equivalents from public token pricing.
  omni: { '720p': 0.10, '1080p': 0.152, '4k': 0.304 },
};

export const ELEVEN_MUSIC_USD_PER_MINUTE = 0.15;

// MUNGWELE launches GPT-Image-2 in a cost-controlled medium 1024px profile.
// The estimate includes a conservative buffer around token-based image pricing.
export const GPT_IMAGE_2_MEDIUM_ESTIMATED_USD = 0.05;
export const GPT_IMAGE_REFERENCE_ESTIMATED_USD = 0.01;

export function roundCreditsUp(value: number, step = 5) {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  return Math.max(step, Math.ceil(safe / step) * step);
}

export function creditsForProviderCost(providerCostUsd: number) {
  const retailUsd = Math.max(0, Number(providerCostUsd) || 0) * PROVIDER_RETAIL_MULTIPLIER;
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
  const providerCostUsd = rate * duration;
  const baseCredits = creditsForProviderCost(providerCostUsd);
  // Omni image inputs are token-billed. Five credits/reference is a deliberately
  // simple launch surcharge that safely covers current input cost and orchestration.
  const referenceCount = Math.max(0, Math.min(8, Math.floor(Number(options.referenceImageCount) || 0)));
  const referenceCredits = model === 'omni' ? referenceCount * 5 : 0;
  return {
    credits: baseCredits + referenceCredits,
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
    credits: creditsForProviderCost(providerCostUsd),
    providerCostUsd: Number(providerCostUsd.toFixed(4)),
    estimatedRetailUsd: Number((providerCostUsd * PROVIDER_RETAIL_MULTIPLIER).toFixed(4)),
    durationSeconds: Math.max(1, Math.round(safeMs / 1000)),
  };
}

export const LAUNCH_LEGACY_CREDIT_COSTS = {
  imageStandard: imageCreditsForRequest(0).credits,
  imageHd: imageCreditsForRequest(0).credits,
  video5s: VIDEO_CREDIT_COSTS.lite[4],
  video10s: VIDEO_CREDIT_COSTS.fast[8],
  musicTrack: musicCreditsForDurationMs(60000).credits,
  promptEnhance: 0,
} as const;
