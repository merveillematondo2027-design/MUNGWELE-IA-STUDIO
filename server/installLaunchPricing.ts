import { adminDb } from './firebaseAdmin';
import {
  ANNUAL_DISCOUNT_PERCENT,
  CLIP_LAUNCH_EXAMPLES,
  ELEVEN_MUSIC_USD_PER_MINUTE,
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
    providerMarkupPercent: Number((PROVIDER_MARKUP_RATE * 100).toFixed(2)),
    musicMarkupPercent: Number((MUSIC_PROVIDER_MARKUP_RATE * 100).toFixed(2)),
    subscriptionPlans: LAUNCH_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, features: [...plan.features] })),
    creditPacks: LAUNCH_CREDIT_PACKS.map((pack) => ({ ...pack })),
    creditCosts: { ...LAUNCH_LEGACY_CREDIT_COSTS },
    providerPricing: {
      image: {
        supplier: 'OpenAI',
        model: 'gpt-image-2',
        profile: 'medium-1k',
        baseCredits: imageCreditsForRequest(0).credits,
      },
      veo: {
        supplier: 'Google Gemini API',
        creditCosts720p: VIDEO_CREDIT_COSTS,
      },
      seedance: {
        supplier: 'Runway Dev',
        rates: SEEDANCE_PROVIDER_RATES,
        limits: SEEDANCE_MODEL_LIMITS,
        examples: SEEDANCE_LAUNCH_EXAMPLES,
      },
      music: {
        supplier: 'ElevenLabs',
        usdPerMinute: ELEVEN_MUSIC_USD_PER_MINUTE,
        markupPercent: 50,
        creditsPerMinute: musicCreditsForDurationMs(60000).credits,
      },
      clips: {
        supplier: 'Runway Dev',
        model: 'act_two',
        usdPerSecond: RUNWAY_ACT_TWO_USD_PER_SECOND,
        examples: CLIP_LAUNCH_EXAMPLES,
      },
    },
    pricingSource: 'mungwele-launch-catalog-v2',
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
