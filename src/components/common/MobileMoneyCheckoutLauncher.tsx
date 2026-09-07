import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { RadioTower, Smartphone, X, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';

export const MobileMoneyCheckoutLauncher: React.FC = () => {
  const { user, setUser, appSettings, addNotification } = useApp();
  const [chooserOpen, setChooserOpen] = useState(false);
  const [target, setTarget] = useState<MarketCashPaymentTarget | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const packs = appSettings.creditPacks.filter((pack) => pack.enabled);
  const plans = appSettings.subscriptionPlans.filter((plan) => plan.id !== 'free');
  const discount = Math.max(0, Math.min(80, appSettings.annualDiscountPercent || 0));

  const chooseTarget = (next: MarketCashPaymentTarget) => {
    setChooserOpen(false);
    setTarget(next);
  };

  const paymentSucceeded = async (transactionId?: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', user.id));
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        const nextCredits = Number(data.credits);
        const nextPlan = String(data.plan || user.plan);
        setUser((current) => ({
          ...current,
          credits: Number.isFinite(nextCredits) ? Math.max(0, nextCredits) : current.credits,
          plan: ['free', 'creator', 'pro', 'studio'].includes(nextPlan) ? nextPlan as typeof current.plan : current.plan,
        }));
      }
    } catch (error) {
      console.warn('[MUNGWELE_MOBILE_MONEY_PROFILE_REFRESH_WARNING]', error);
    }

    setTarget(null);
    addNotification(
      'success',
      'Paiement Mobile Money confirmé',
      transactionId ? `Crédits/abonnement mis à jour. Référence : ${transactionId}.` : 'Crédits/abonnement mis à jour.',
    );
  };

  return (
    <>
      <section className="mt-7 overflow-hidden rounded-[28px] border border-red-500/20 bg-gradient-to-br from-red-950/25 via-white/[0.025] to-emerald-950/15 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300"><RadioTower className="h-6 w-6" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-black text-white">Paiement Mobile Money RDC</h3><span className="rounded-full border border-amber-500/20 bg-amber-950/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-300">M-Pesa C2B Sandbox</span></div>
              <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-400">Achetez vos crédits ou votre abonnement avec Mobile Money. M-Pesa C2B est branché ; Airtel Money et Orange Money sont déjà réservés dans l’architecture pour les prochaines clés API.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-red-500/10 px-2.5 py-1 text-red-200">M-Pesa</span><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-gray-400">Airtel Money · préparé</span><span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-gray-400">Orange Money · préparé</span></div>
            </div>
          </div>
          <button onClick={() => setChooserOpen(true)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-black text-white hover:bg-red-500"><Smartphone className="h-4 w-4" />Payer par Mobile Money</button>
        </div>
      </section>

      {chooserOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-950/20 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-200"><Zap className="h-3.5 w-3.5" /> Choisir l’achat</div><h3 className="mt-3 text-2xl font-black text-white">Que voulez-vous payer ?</h3><p className="mt-1 text-xs text-gray-400">Le prix est toujours recalculé côté serveur avant le paiement.</p></div><button onClick={() => setChooserOpen(false)} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button></div>

            <div className="mt-6">
              <h4 className="text-sm font-black text-white">Packs de crédits</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {packs.map((pack) => <button key={pack.id} onClick={() => chooseTarget({ kind: 'credits', label: `${pack.credits} crédits`, amountUsd: pack.priceUsd, metadata: { packId: pack.id, credits: pack.credits } })} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-red-500/30"><p className="text-xs font-bold text-white">{pack.name}</p><div className="mt-2 flex items-end justify-between"><span className="text-2xl font-black text-amber-300">{pack.credits}</span><span className="text-lg font-black text-white">${pack.priceUsd.toFixed(2)}</span></div><p className="mt-1 text-[10px] text-gray-500">crédits MUNGWELE</p></button>)}
              </div>
            </div>

            <div className="mt-7">
              <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-black text-white">Abonnements</h4><div className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1"><button onClick={() => setBillingCycle('monthly')} className={`rounded-lg px-3 py-2 text-[10px] font-black ${billingCycle === 'monthly' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>Mensuel</button><button onClick={() => setBillingCycle('yearly')} className={`rounded-lg px-3 py-2 text-[10px] font-black ${billingCycle === 'yearly' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>Annuel -{discount}%</button></div></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {plans.map((plan) => {
                  const discountedMonthly = billingCycle === 'yearly' ? plan.priceMonth * (1 - discount / 100) : plan.priceMonth;
                  const amountDue = billingCycle === 'yearly' ? discountedMonthly * 12 : discountedMonthly;
                  return <button key={plan.id} disabled={user.plan === plan.id} onClick={() => chooseTarget({ kind: 'subscription', label: `Abonnement ${plan.name}`, amountUsd: amountDue, metadata: { planId: plan.id, billingCycle } })} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-red-500/30 disabled:cursor-not-allowed disabled:opacity-45"><p className="text-xs font-black text-white">{plan.name}</p><p className="mt-2 text-xl font-black text-white">${amountDue.toFixed(2)}</p><p className="mt-1 text-[10px] text-gray-500">{billingCycle === 'yearly' ? '12 mois' : '1 mois'} · {plan.creditsMonthly.toLocaleString('fr-FR')} crédits/mois</p></button>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {target && <MobileMoneyPaymentModal target={target} onClose={() => setTarget(null)} onSuccess={(transactionId) => void paymentSucceeded(transactionId)} />}
    </>
  );
};
