import { adminDb } from './firebaseAdmin';
import {
  ANNUAL_DISCOUNT_PERCENT,
  CLIP_LAUNCH_EXAMPLES,
  ELEVEN_MUSIC_USD_PER_MINUTE,
  H3_MAX_MAX_SECONDS,
  H3_MAX_MIN_SECONDS,
  H3_MAX_USD_PER_SECOND,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_LEGACY_CREDIT_COSTS,
  LAUNCH_SUBSCRIPTION_PLANS,
  MUSIC_PROVIDER_MARKUP_RATE,
  PRICING_VERSION,
  PROVIDER_MARKUP_RATE,
  RUNWAY_ACT_TWO_USD_PER_SECOND,
  SEEDANCE_LAUNCH_EXAMPLES,
  SEEDANCE_MODEL_LIMITS,
  SEEDANCE_PROVIDER_RATES,
  VIDEO_CREDIT_COSTS,
  VIDEO_ENGINE_LAUNCH_EXAMPLES,
  imageCreditsForRequest,
  musicCreditsForDurationMs,
} from '../src/config/commercialPricing';

let started = false;

export async function syncLaunchPricingCatalog() {
  const ref = adminDb.doc('appSettings/pricing');
  const snap = await ref.get();
  const currentVersion = Number(snap.data()?.pricingVersion || 0);
  if (currentVersion === PRICING_VERSION) return { updated: false, pricingVersion: PRICING_VERSION };

  const now = new Date().toISOString();
  await ref.set({
    pricingVersion: PRICING_VERSION,
    annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
    providerMarkupPercentAtBestValuePack: Number((PROVIDER_MARKUP_RATE * 100).toFixed(2)),
    musicMarkupPercent: Number((MUSIC_PROVIDER_MARKUP_RATE * 100).toFixed(2)),
    subscriptionPlans: LAUNCH_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, features: [...plan.features] })),
    creditPacks: LAUNCH_CREDIT_PACKS.map((pack) => ({ ...pack })),
    creditCosts: { ...LAUNCH_LEGACY_CREDIT_COSTS },
    providerPricing: {
      image: {
        supplier: 'OpenAI', model: 'gpt-image-2', profile: 'medium-1k', baseCredits: imageCreditsForRequest(0).credits,
      },
      veo: {
        supplier: 'Google Gemini API', creditCosts720p: VIDEO_CREDIT_COSTS, examples: VIDEO_ENGINE_LAUNCH_EXAMPLES,
      },
      seedance: {
        supplier: 'Runway Dev', launchModel: 'seedance2_5', availability: 'coming_soon',
        rates: SEEDANCE_PROVIDER_RATES, limits: SEEDANCE_MODEL_LIMITS, examples: SEEDANCE_LAUNCH_EXAMPLES,
      },
      h3Max: {
        supplier: 'Runway Dev', model: 'h3_max', availability: 'coming_soon',
        usdPerSecond: H3_MAX_USD_PER_SECOND, minSeconds: H3_MAX_MIN_SECONDS, maxSeconds: H3_MAX_MAX_SECONDS,
        examples768p: VIDEO_ENGINE_LAUNCH_EXAMPLES.h3Max768,
      },
      music: {
        supplier: 'ElevenLabs', usdPerMinute: ELEVEN_MUSIC_USD_PER_MINUTE, markupPercent: 50,
        creditsPerMinute: musicCreditsForDurationMs(60000).credits,
      },
      clips: {
        supplier: 'Runway Dev', model: 'act_two', usdPerSecond: RUNWAY_ACT_TWO_USD_PER_SECOND, examples: CLIP_LAUNCH_EXAMPLES,
      },
    },
    pricingSource: 'mungwele-launch-catalog-v4',
    updatedAt: now,
    createdAt: snap.data()?.createdAt || now,
  }, { merge: true });

  console.log(`[MUNGWELE_PRICING] Launch catalog ${PRICING_VERSION} synchronized.`);
  return { updated: true, pricingVersion: PRICING_VERSION };
}

export function installLaunchPricingSync() {
  if (started) return;
  started = true;
  void syncLaunchPricingCatalog().catch((error) => {
    console.warn('[MUNGWELE_PRICING_SYNC_WARNING]', String(error?.message || error));
  });
}
