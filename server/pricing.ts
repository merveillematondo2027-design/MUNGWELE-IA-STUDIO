import {
  ANNUAL_DISCOUNT_PERCENT,
  CLIP_LAUNCH_EXAMPLES,
  ELEVEN_MUSIC_USD_PER_MINUTE,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_SUBSCRIPTION_PLANS,
  MIN_USD_REVENUE_PER_CREDIT,
  MUSIC_PROVIDER_MARKUP_RATE,
  MUSIC_RETAIL_MULTIPLIER,
  PRICING_VERSION,
  PROVIDER_MARKUP_RATE,
  PROVIDER_RETAIL_MULTIPLIER,
  RUNWAY_ACT_TWO_USD_PER_SECOND,
  RUNWAY_USD_PER_CREDIT,
  SEEDANCE_LAUNCH_EXAMPLES,
  SEEDANCE_MODEL_LIMITS,
  SEEDANCE_PROVIDER_RATES,
  VIDEO_CREDIT_COSTS,
  VIDEO_PROVIDER_USD_PER_SECOND,
  clipCreditsForDurationSeconds,
  creditsForProviderCost,
  imageCreditsForRequest,
  musicCreditsForDurationMs,
  seedanceCreditsForRequest,
  videoCreditsForRequest,
  type LaunchVideoDuration,
  type LaunchVideoModel,
  type SeedanceModel,
  type SeedanceResolution,
} from '../src/config/commercialPricing';

export type MonetizedVideoModel = LaunchVideoModel;
export type MonetizedDuration = LaunchVideoDuration;

export {
  ANNUAL_DISCOUNT_PERCENT,
  CLIP_LAUNCH_EXAMPLES,
  ELEVEN_MUSIC_USD_PER_MINUTE,
  MIN_USD_REVENUE_PER_CREDIT,
  MUSIC_PROVIDER_MARKUP_RATE,
  MUSIC_RETAIL_MULTIPLIER,
  PRICING_VERSION,
  PROVIDER_MARKUP_RATE,
  PROVIDER_RETAIL_MULTIPLIER,
  RUNWAY_ACT_TWO_USD_PER_SECOND,
  RUNWAY_USD_PER_CREDIT,
  SEEDANCE_LAUNCH_EXAMPLES,
  SEEDANCE_MODEL_LIMITS,
  SEEDANCE_PROVIDER_RATES,
  VIDEO_CREDIT_COSTS,
  VIDEO_PROVIDER_USD_PER_SECOND,
  clipCreditsForDurationSeconds,
  creditsForProviderCost,
  imageCreditsForRequest,
  musicCreditsForDurationMs,
  seedanceCreditsForRequest,
  videoCreditsForRequest,
};

export function minimumSafeVideoCredits(model: MonetizedVideoModel, duration: MonetizedDuration) {
  return videoCreditsForRequest(model, duration).credits;
}

export const COMMERCIAL_PRICING_SNAPSHOT = {
  pricingVersion: PRICING_VERSION,
  providerMarkupPercent: 33.33,
  musicMarkupPercent: 50,
  annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
  plans: LAUNCH_SUBSCRIPTION_PLANS,
  creditPacks: LAUNCH_CREDIT_PACKS,
  suppliers: {
    image: 'OpenAI',
    veoVideo: 'Google Gemini API',
    seedanceVideo: 'Runway Dev',
    music: 'ElevenLabs',
    clips: 'Runway Dev / Act-Two',
  },
  image: {
    baseCredits: imageCreditsForRequest(0).credits,
    referencePricing: 'Le coût augmente selon le nombre d’images de référence.',
    launchProfile: 'GPT-Image-2 medium 1K',
  },
  video: {
    veo: VIDEO_CREDIT_COSTS,
    seedance: SEEDANCE_LAUNCH_EXAMPLES,
  },
  music: {
    providerUsdPerMinute: ELEVEN_MUSIC_USD_PER_MINUTE,
    markupPercent: 50,
    creditsPerMinute: musicCreditsForDurationMs(60000).credits,
  },
  clips: {
    model: 'act_two',
    providerUsdPerSecond: RUNWAY_ACT_TWO_USD_PER_SECOND,
    examples: CLIP_LAUNCH_EXAMPLES,
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

export function assertSeedanceMonetizationSafe(
  model: SeedanceModel,
  durationSeconds: number,
  credits: number,
  options: { resolution?: SeedanceResolution; inputVideoSeconds?: number } = {},
) {
  const minimum = seedanceCreditsForRequest(model, durationSeconds, options).credits;
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification Seedance bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_SEEDANCE_PRICE',
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

export function assertClipMonetizationSafe(durationSeconds: number, credits: number) {
  const minimum = clipCreditsForDurationSeconds(durationSeconds).credits;
  if (credits < minimum) {
    throw Object.assign(new Error(`Tarification clip bloquée: ${credits} crédits est inférieur au minimum sécurisé de ${minimum}.`), {
      status: 503,
      code: 'UNSAFE_CLIP_MONETIZATION_PRICE',
    });
  }
}
