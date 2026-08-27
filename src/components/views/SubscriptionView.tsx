import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from '../../data/mockData';
import { 
  CreditCard, 
  Check, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  CheckCircle2,
  TrendingUp,
  Receipt
} from 'lucide-react';

export const SubscriptionView: React.FC = () => {
  const { user, setUser, credits, addCredits, transactions, triggerCelebration, addNotification } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);

  const handlePurchaseCredits = (pack: typeof CREDIT_PACKS[0]) => {
    setProcessingPackId(pack.id);
    setTimeout(() => {
      addCredits(pack.credits, `Achat ${pack.name} (+${pack.credits} crédits)`);
      triggerCelebration();
      setProcessingPackId(null);
    }, 600);
  };

  const handleSelectPlan = (planId: string) => {
    if (user.plan === planId) {
      addNotification('info', 'Plan actif', 'Vous êtes déjà abonné à cette formule.');
      return;
    }
    const foundPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId);
    if (foundPlan) {
      setUser({ ...user, plan: planId as any });
      addCredits(foundPlan.creditsMonthly, `Migration vers le forfait ${foundPlan.name}`);
      triggerCelebration();
      addNotification('success', 'Abonnement mis à jour !', `Vous êtes maintenant sur le forfait ${foundPlan.name}.`);
    }
  };

  return (
    <div id="subscription-view-container" className="w-full max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Gestion des Crédits & Abonnements</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
          Des formules adaptées à votre créativité
        </h2>
        <p className="text-xs sm:text-sm text-gray-400">
          Rechargez vos crédits à la demande ou optez pour un abonnement mensuel avec crédits récurrents et fonctionnalités prioritaires.
        </p>

        {/* Monthly / Yearly Switch */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 mt-2 shadow-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              billingCycle === 'yearly'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Annuel</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Subscription Plans Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SUBSCRIPTION_PLANS.map((plan) => {
          const isCurrentPlan = user.plan === plan.id;
          const isPopular = plan.popular;
          const price = billingCycle === 'yearly' ? Math.round(plan.priceMonth * 0.8) : plan.priceMonth;

          return (
            <div
              key={plan.id}
              id={`plan-card-${plan.id}`}
              className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 backdrop-blur-2xl ${
                isPopular
                  ? 'bg-purple-950/30 border-2 border-purple-500 shadow-2xl shadow-purple-950/60 scale-[1.02]'
                  : 'bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.05] shadow-xl'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-extrabold uppercase tracking-wider shadow-md border border-white/20">
                  Le Plus Populaire
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <div className="flex items-baseline space-x-1 mt-2">
                    <span className="text-3xl sm:text-4xl font-extrabold font-display text-white">
                      {price}€
                    </span>
                    <span className="text-xs text-gray-400 font-medium">/ mois</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-gray-300">Crédits inclus</span>
                  <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                    <Zap className="w-3 h-3 fill-amber-400" />
                    <span>{plan.creditsMonthly} crédits/mois</span>
                  </span>
                </div>

                <ul className="space-y-2.5 pt-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center space-x-2.5 text-xs text-gray-300">
                      <Check className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  id={`btn-select-plan-${plan.id}`}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-2xl text-xs font-bold transition-all border ${
                    isCurrentPlan
                      ? 'bg-white/5 text-gray-400 cursor-default border-white/10'
                      : isPopular
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 border-white/20'
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                  }`}
                >
                  {isCurrentPlan ? 'Formule Actuelle' : `Choisir ${plan.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Credit Refill Packs Section */}
      <div className="space-y-4 pt-6">
        <div>
          <h3 className="text-xl font-display font-extrabold text-white">
            Recharges Ponctuelles de Crédits
          </h3>
          <p className="text-xs text-gray-400">
            Besoin de crédits supplémentaires sans changer de formule ? Rechargez en un instant.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              id={`credit-pack-${pack.id}`}
              className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] flex items-center justify-between shadow-lg transition-all"
            >
              <div>
                <span className="text-xs font-bold text-white block">{pack.name}</span>
                <span className="text-lg font-extrabold text-amber-400 flex items-center space-x-1 mt-0.5">
                  <Zap className="w-4 h-4 fill-amber-400" />
                  <span>+{pack.credits} Crédits</span>
                </span>
                <span className="text-xs font-semibold text-gray-400 mt-1 block">
                  {pack.price} € TTC
                </span>
              </div>

              <button
                onClick={() => handlePurchaseCredits(pack)}
                disabled={processingPackId === pack.id}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 border border-white/20"
              >
                {processingPackId === pack.id ? 'Recharge...' : 'Acheter'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-purple-400" />
            <span>Historique des Transactions de Crédits</span>
          </h3>
          <span className="text-xs text-gray-400">Solde actuel : <strong className="text-amber-400">{credits} crédits</strong></span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-white/[0.02] border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5 text-right">Variation</th>
                  <th className="p-3.5 text-right">Solde Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="p-3.5 font-mono text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 font-medium text-white">{tx.description}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        tx.amount > 0 ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-purple-950/80 text-purple-300 border border-purple-500/30'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`p-3.5 text-right font-bold font-mono ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="p-3.5 text-right font-mono text-gray-300">
                      {tx.balanceAfter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
