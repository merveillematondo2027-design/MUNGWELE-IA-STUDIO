import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Check, Crown, Lock, PackageOpen, Receipt, ShieldCheck, WalletCards, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { MarketCashPaymentModal } from '../common/MarketCashPaymentModal';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';

type SectionMode = 'choose' | 'credits' | 'subscription';

const VIDEO_ROWS = [
  ['Veo 3.1 Lite', '20 / 30 / 40 crédits', '4s / 6s / 8s'],
  ['Veo 3.1 Fast', '40 / 60 / 80 crédits', '4s / 6s / 8s'],
  ['Gemini Omni', '40 / 60 / 80 crédits', '4s / 6s / 8s'],
  ['Veo 3.1 Pro', '160 / 240 / 320 crédits', '4s / 6s / 8s'],
] as const;

export const SubscriptionView: React.FC = () => {
  const { user, setUser, credits, transactions, addNotification, appSettings } = useApp();
  const [section, setSection] = useState<SectionMode>('choose');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentTarget, setPaymentTarget] = useState<MarketCashPaymentTarget | null>(null);

  const plans = appSettings.subscriptionPlans;
  const packs = appSettings.creditPacks.filter((pack) => pack.enabled);
  const discount = Math.max(0, Math.min(80, appSettings.annualDiscountPercent || 0));

  const openPayment = (target: MarketCashPaymentTarget) => setPaymentTarget(target);
  const closePayment = () => setPaymentTarget(null);

  const paymentSucceeded = async (transactionId?: string) => {
    // Le backend ne renvoie désormais un succès qu'après :
    // 1) débit réel de la carte Market-Cash ;
    // 2) règlement dans MUNGWELE ;
    // 3) écriture du nouveau solde / abonnement dans Firestore.
    // On relit alors le profil officiel au lieu d'afficher un faux succès local.
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
      console.warn('[MARKET_CASH_PROFILE_REFRESH_WARNING]', error);
    }

    setPaymentTarget(null);
    addNotification(
      'success',
      'Paiement Market-Cash confirmé',
      transactionId
        ? `Paiement réellement réglé. Crédits/abonnement mis à jour. Référence : ${transactionId}.`
        : 'Paiement réellement réglé. Crédits/abonnement mis à jour.',
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-20">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/50 px-3 py-1 text-xs font-bold text-purple-300"><Zap className="h-3.5 w-3.5 text-amber-300" /> Crédits & abonnements</div>
            <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Gérer mon offre MUNGWELE</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-400">Les achats de crédits et abonnements passent désormais par Market-Cash.</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">Solde</p><p className="text-2xl font-black text-white">{credits} <span className="text-xs text-amber-300">crédits</span></p></div>
        </div>
      </div>

      {section === 'choose' && (
        <div className="grid gap-5 md:grid-cols-2">
          <button onClick={() => setSection('credits')} className="group rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-purple-950/35 to-transparent p-6 text-left transition hover:border-purple-400/50">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300"><WalletCards className="h-6 w-6" /></span>
            <h2 className="mt-5 text-xl font-black text-white">Acheter des crédits</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Choisissez un pack, puis payez avec votre carte Market-Cash.</p>
            <span className="mt-5 inline-flex rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white">Voir les crédits</span>
          </button>
          <button onClick={() => setSection('subscription')} className="group rounded-[28px] border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-transparent p-6 text-left transition hover:border-cyan-400/50">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300"><Crown className="h-6 w-6" /></span>
            <h2 className="mt-5 text-xl font-black text-white">Mes abonnements</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">Comparez les formules puis payez directement via Market-Cash.</p>
            <span className="mt-5 inline-flex rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white">Voir les abonnements</span>
          </button>
        </div>
      )}

      {section !== 'choose' && <button onClick={() => setSection('choose')} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-300">← Revenir au choix</button>}

      {section === 'credits' && (
        <>
          <section className="space-y-4">
            <div><h2 className="text-2xl font-black text-white">Acheter des crédits</h2><p className="mt-1 text-xs text-gray-400">Le formulaire Market-Cash accepte la saisie manuelle, le QR de la carte et le NFC.</p></div>
            <div className="grid gap-4 sm:grid-cols-3">
              {packs.map((pack) => (
                <article key={pack.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <PackageOpen className="h-5 w-5 text-purple-300" />
                  <p className="mt-4 text-sm font-bold text-white">{pack.name}</p>
                  <p className="mt-1 text-3xl font-black text-amber-300">{pack.credits}</p>
                  <p className="text-xs text-gray-500">crédits</p>
                  <p className="mt-3 text-lg font-black text-white">${pack.priceUsd.toFixed(2)}</p>
                  <button onClick={() => openPayment({ kind: 'credits', label: `${pack.credits} crédits`, amountUsd: pack.priceUsd, metadata: { packId: pack.id, credits: pack.credits } })} className="mt-5 w-full rounded-xl bg-purple-600 py-3 text-xs font-black text-white">Payer avec Market-Cash</button>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-bold text-white"><Receipt className="h-4 w-4 text-purple-400" /> Historique crédits</h3><span className="text-xs text-gray-400">Solde : <strong className="text-amber-400">{credits}</strong></span></div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              {transactions.length === 0 ? <div className="p-8 text-center text-xs text-gray-500">Aucune transaction enregistrée.</div> : transactions.map((tx) => <div key={tx.id} className="flex justify-between gap-4 border-b border-white/5 p-3 text-xs"><div><p className="text-white">{tx.description}</p><p className="text-gray-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p></div><span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span></div>)}
            </div>
          </section>
        </>
      )}

      {section === 'subscription' && (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h2 className="text-2xl font-black text-white">Abonnements</h2><p className="mt-1 text-xs text-gray-400">Sélectionnez votre cycle puis passez au paiement Market-Cash.</p></div>
              <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1"><button onClick={() => setBillingCycle('monthly')} className={`rounded-xl px-4 py-2 text-xs font-bold ${billingCycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Mensuel</button><button onClick={() => setBillingCycle('yearly')} className={`rounded-xl px-4 py-2 text-xs font-bold ${billingCycle === 'yearly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Annuel -{discount}%</button></div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan) => {
                const current = user.plan === plan.id;
                const discountedMonthly = billingCycle === 'yearly' ? plan.priceMonth * (1 - discount / 100) : plan.priceMonth;
                const amountDue = billingCycle === 'yearly' ? discountedMonthly * 12 : discountedMonthly;
                return (
                  <article key={plan.id} className={`relative flex flex-col rounded-3xl border p-5 ${plan.popular ? 'border-purple-500 bg-purple-950/25' : 'border-white/10 bg-white/[0.03]'}`}>
                    {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-[10px] font-black text-white">POPULAIRE</span>}
                    <h3 className="text-xl font-black text-white">{plan.name}</h3>
                    <p className="mt-2 text-4xl font-black text-white">${discountedMonthly.toFixed(discountedMonthly % 1 ? 2 : 0)}<span className="text-xs font-medium text-gray-500"> / mois</span></p>
                    {billingCycle === 'yearly' && plan.id !== 'free' && <p className="mt-1 text-[11px] font-bold text-cyan-300">Facturé ${amountDue.toFixed(2)} pour 12 mois</p>}
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3"><div className="flex justify-between text-xs"><span className="text-gray-400">Crédits mensuels</span><strong className="text-amber-300">{plan.creditsMonthly}</strong></div></div>
                    <ul className="mt-4 flex-1 space-y-2">{plan.features.map((feature, index) => <li key={index} className="flex gap-2 text-xs text-gray-300"><Check className="h-4 w-4 shrink-0 text-purple-400" />{feature}</li>)}</ul>
                    <button disabled={current || plan.id === 'free'} onClick={() => openPayment({ kind: 'subscription', label: `Abonnement ${plan.name}`, amountUsd: amountDue, metadata: { planId: plan.id, billingCycle } })} className={`mt-5 w-full rounded-xl py-3 text-xs font-black ${current || plan.id === 'free' ? 'border border-white/10 bg-white/[0.03] text-gray-500' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>{current ? 'Formule actuelle' : plan.id === 'free' ? 'Sans abonnement' : `Payer ${plan.name} avec Market-Cash`}</button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><h3 className="text-sm font-black text-white">Paiement carte protégé</h3><p className="mt-1 text-xs leading-5 text-gray-400">Le QR et le NFC peuvent préremplir les informations non sensibles de la carte Market-Cash. Le CVV reste toujours saisi manuellement et n'est jamais conservé par MUNGWELE IA STUDIO. Les frais Market-Cash éventuels sont ajoutés par Market-Cash au débit de la carte.</p></div></div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">{VIDEO_ROWS.map(([name, cost, duration]) => <div key={name} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-white/5 px-4 py-3 text-xs"><span className="font-bold text-white">{name}</span><span className="text-amber-300">{cost}</span><span className="text-gray-500">{duration}</span></div>)}</div>
          </section>

          <section className="flex gap-3 rounded-3xl border border-amber-500/20 bg-amber-950/10 p-5"><Lock className="h-5 w-5 shrink-0 text-amber-400" /><div><h4 className="text-sm font-bold text-white">Qualité et téléchargement</h4><p className="mt-1 text-xs leading-5 text-gray-400">Gratuit : génération avec crédits disponibles. Creator : téléchargement vidéo jusqu’à 720p. Pro : jusqu’à 1080p.</p></div></section>
        </>
      )}

      {paymentTarget && <MarketCashPaymentModal target={paymentTarget} userId={user.id} userEmail={user.email} onClose={closePayment} onSuccess={(transactionId) => void paymentSucceeded(transactionId)} />}
    </div>
  );
};
