import {
  ANNUAL_DISCOUNT_PERCENT,
  ELEVEN_MUSIC_USD_PER_MINUTE,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_SUBSCRIPTION_PLANS,
  MIN_USD_REVENUE_PER_CREDIT,
  PRICING_VERSION,
  PROVIDER_MARKUP_RATE,
  PROVIDER_RETAIL_MULTIPLIER,
  VIDEO_CREDIT_COSTS,
  VIDEO_PROVIDER_USD_PER_SECOND,
  creditsForProviderCost,
  imageCreditsForRequest,
  musicCreditsForDurationMs,
  videoCreditsForRequest,
  type LaunchVideoDuration,
  type LaunchVideoModel,
} from '../src/config/commercialPricing';

export type MonetizedVideoModel = LaunchVideoModel;
export type MonetizedDuration = LaunchVideoDuration;

export {
  ANNUAL_DISCOUNT_PERCENT,
  ELEVEN_MUSIC_USD_PER_MINUTE,
  MIN_USD_REVENUE_PER_CREDIT,
  PRICING_VERSION,
  PROVIDER_MARKUP_RATE,
  PROVIDER_RETAIL_MULTIPLIER,
  VIDEO_CREDIT_COSTS,
  VIDEO_PROVIDER_USD_PER_SECOND,
  creditsForProviderCost,
  imageCreditsForRequest,
  musicCreditsForDurationMs,
  videoCreditsForRequest,
};

export function minimumSafeVideoCredits(model: MonetizedVideoModel, duration: MonetizedDuration) {
  return videoCreditsForRequest(model, duration).credits;
}

export const COMMERCIAL_PRICING_SNAPSHOT = {
  pricingVersion: PRICING_VERSION,
  providerMarkupPercent: 33.33,
  annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
  plans: LAUNCH_SUBSCRIPTION_PLANS,
  creditPacks: LAUNCH_CREDIT_PACKS,
  image: {
    baseCredits: imageCreditsForRequest(0).credits,
    referencePricing: 'Le coût augmente selon le nombre d’images de référence.',
    launchProfile: 'GPT-Image-2 medium 1024px',
  },
  video: VIDEO_CREDIT_COSTS,
  music: {
    providerUsdPerMinute: ELEVEN_MUSIC_USD_PER_MINUTE,
    creditsPerMinute: musicCreditsForDurationMs(60000).credits,
  },
} as const;

export function assertMonetizationSafe(model: MonetizedVideoModel, duration: MonetizedDuration, credits: number, referenceImageCount = 0) {
  const minimum = videoCreditsForRequest(model, duration, { referenceImageCount }).credits;
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_MONETIZATION_PRICE',
    });
  }
}

export function assertImageMonetizationSafe(referenceCount: number, credits: number) {
  const minimum = imageCreditsForRequest(referenceCount).credits;
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification image bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_IMAGE_MONETIZATION_PRICE',
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
