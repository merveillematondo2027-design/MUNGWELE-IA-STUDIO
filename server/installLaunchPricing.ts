import { adminDb } from './firebaseAdmin';
import {
  ANNUAL_DISCOUNT_PERCENT,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_LEGACY_CREDIT_COSTS,
  LAUNCH_SUBSCRIPTION_PLANS,
  PRICING_VERSION,
  PROVIDER_MARKUP_RATE,
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
    subscriptionPlans: LAUNCH_SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, features: [...plan.features] })),
    creditPacks: LAUNCH_CREDIT_PACKS.map((pack) => ({ ...pack })),
    creditCosts: { ...LAUNCH_LEGACY_CREDIT_COSTS },
    pricingSource: 'mungwele-launch-catalog',
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
