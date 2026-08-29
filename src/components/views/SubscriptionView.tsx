import React, { useState } from 'react';
import { Check, Lock, Receipt, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SubscriptionView: React.FC = () => {
  const { user, credits, transactions, addNotification, appSettings } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = appSettings.subscriptionPlans;
  const packs = appSettings.creditPacks.filter((pack) => pack.enabled);
  const discount = Math.max(0, Math.min(80, appSettings.annualDiscountPercent || 0));

  const requestPayment = (label: string) => {
    addNotification(
      'info',
      'Paiement requis',
      `${label} sera activé uniquement après confirmation d’un paiement réel. Aucun crédit ni abonnement n’est ajouté automatiquement.`
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-20">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold"><Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />Crédits & Abonnements</div>
        <h2 className="text-3xl sm:text-4xl font-display font-black text-white">Choisissez votre niveau MUNGWELE</h2>
        <p className="text-sm text-gray-400">Les crédits servent aux générations. L’abonnement déverrouille notamment le téléchargement HD.</p>
        <div className="inline-flex p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-xl text-xs font-bold ${billingCycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Mensuel</button>
          <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-xl text-xs font-bold ${billingCycle === 'yearly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Annuel -{discount}%</button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const current = user.plan === plan.id;
          const monthlyPrice = billingCycle === 'yearly' ? plan.priceMonth * (1 - discount / 100) : plan.priceMonth;
          const qualityLabel = plan.maxDownloadResolution === 'standard' ? 'Aperçu standard' : `Téléchargement ${plan.maxDownloadResolution}`;
          return (
            <article key={plan.id} className={`relative rounded-3xl p-6 border flex flex-col justify-between ${plan.popular ? 'bg-purple-950/30 border-purple-500 shadow-xl shadow-purple-950/40' : 'bg-white/[0.03] border-white/10'}`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase">Populaire</span>}
              <div className="space-y-4">
                <div><h3 className="text-xl font-bold text-white">{plan.name}</h3><div className="mt-2"><span className="text-4xl font-black text-white">${monthlyPrice.toFixed(monthlyPrice % 1 ? 2 : 0)}</span><span className="text-xs text-gray-400"> / mois</span></div></div>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex justify-between"><span className="text-xs text-gray-300">Crédits inclus</span><strong className="text-amber-400">{plan.creditsMonthly}</strong></div>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-400" /><span className="text-xs text-gray-200">{qualityLabel}</span></div>
                <ul className="space-y-2">{plan.features.map((feature, i) => <li key={i} className="flex gap-2 text-xs text-gray-300"><Check className="w-4 h-4 text-purple-400 shrink-0" />{feature}</li>)}</ul>
              </div>
              <button disabled={current || plan.id === 'free'} onClick={() => requestPayment(`Abonnement ${plan.name}`)} className={`mt-6 w-full py-3 rounded-2xl text-xs font-bold ${current ? 'bg-white/5 text-gray-500 border border-white/10' : plan.id === 'free' ? 'bg-white/5 text-gray-500 border border-white/10' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>{current ? 'Formule actuelle' : plan.id === 'free' ? 'Sans abonnement' : `S’abonner à ${plan.name}`}</button>
            </article>
          );
        })}
      </div>

      <section className="space-y-4">
        <div><h3 className="text-xl font-extrabold text-white">Acheter des crédits</h3><p className="text-xs text-gray-400">Les packs sont configurés par l’administrateur. Acheter des crédits ne déverrouille pas automatiquement le téléchargement HD.</p></div>
        <div className="grid sm:grid-cols-3 gap-4">
          {packs.map((pack) => <article key={pack.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4"><div><span className="text-xs font-bold text-white">{pack.name}</span><div className="text-xl font-black text-amber-400 mt-1">{pack.credits} crédits</div><div className="text-sm text-gray-400">${pack.priceUsd.toFixed(2)}</div></div><button onClick={() => requestPayment(`${pack.credits} crédits pour $${pack.priceUsd.toFixed(2)}`)} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold">Acheter</button></article>)}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-5 flex gap-3"><Lock className="w-5 h-5 text-amber-400 shrink-0" /><div><h4 className="text-sm font-bold text-white">Politique qualité vidéo</h4><p className="text-xs text-gray-400 mt-1">Sans abonnement, les crédits permettent de générer mais pas de télécharger la version HD originale. Creator déverrouille 720p. Pro déverrouille jusqu’à 1080p. La 4K restera une option premium distincte lorsque nous l’activerons.</p></div></section>

      <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-purple-400" />Historique crédits</h3><span className="text-xs text-gray-400">Solde : <strong className="text-amber-400">{credits}</strong></span></div><div className="rounded-2xl border border-white/10 overflow-hidden">{transactions.length === 0 ? <div className="p-8 text-center text-xs text-gray-500">Aucune transaction enregistrée.</div> : transactions.map((tx) => <div key={tx.id} className="p-3 border-b border-white/5 flex justify-between gap-4 text-xs"><div><p className="text-white">{tx.description}</p><p className="text-gray-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p></div><span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span></div>)}</div></section>
    </div>
  );
};
