import React, { useMemo, useState } from 'react';
import {
  Check,
  CreditCard,
  Lock,
  Mail,
  Receipt,
  ScanLine,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type PaymentTarget = {
  kind: 'subscription' | 'credits';
  label: string;
  amountUsd: number;
  metadata?: Record<string, string | number>;
};

export const SubscriptionView: React.FC = () => {
  const { user, credits, transactions, addNotification, appSettings } = useApp();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [marketCashMode, setMarketCashMode] = useState<'account' | 'card'>('account');
  const [marketCashEmail, setMarketCashEmail] = useState('');
  const [marketCashPassword, setMarketCashPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');

  const plans = appSettings.subscriptionPlans;
  const packs = appSettings.creditPacks.filter((pack) => pack.enabled);
  const discount = Math.max(0, Math.min(80, appSettings.annualDiscountPercent || 0));

  const paymentSummary = useMemo(() => {
    if (!paymentTarget) return '';
    return `${paymentTarget.label} • $${paymentTarget.amountUsd.toFixed(2)}`;
  }, [paymentTarget]);

  const openPayment = (target: PaymentTarget) => {
    setPaymentTarget(target);
    setMarketCashMode('account');
    setMarketCashEmail(user.email || '');
    setMarketCashPassword('');
    setConfirmationCode('');
  };

  const closePayment = () => {
    setPaymentTarget(null);
    setMarketCashPassword('');
    setConfirmationCode('');
  };

  const notifyMhApisPending = (action: string) => {
    addNotification(
      'info',
      'MH APIS — bientôt connecté',
      `${action} est déjà prévu dans l’interface. L’activation réelle passera par MH APIS afin que MUNGWELE IA et Market-Cash communiquent sans exposer vos identifiants ni simuler un paiement.`
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
              <button
                disabled={current || plan.id === 'free'}
                onClick={() => openPayment({ kind: 'subscription', label: `Abonnement ${plan.name}`, amountUsd: monthlyPrice, metadata: { planId: plan.id, billingCycle } })}
                className={`mt-6 w-full py-3 rounded-2xl text-xs font-bold ${current ? 'bg-white/5 text-gray-500 border border-white/10' : plan.id === 'free' ? 'bg-white/5 text-gray-500 border border-white/10' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}
              >
                {current ? 'Formule actuelle' : plan.id === 'free' ? 'Sans abonnement' : `S’abonner à ${plan.name}`}
              </button>
            </article>
          );
        })}
      </div>

      <section className="space-y-4">
        <div><h3 className="text-xl font-extrabold text-white">Acheter des crédits</h3><p className="text-xs text-gray-400">Les packs sont configurés par l’administrateur. Acheter des crédits ne déverrouille pas automatiquement le téléchargement HD.</p></div>
        <div className="grid sm:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <article key={pack.id} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-4">
              <div><span className="text-xs font-bold text-white">{pack.name}</span><div className="text-xl font-black text-amber-400 mt-1">{pack.credits} crédits</div><div className="text-sm text-gray-400">${pack.priceUsd.toFixed(2)}</div></div>
              <button onClick={() => openPayment({ kind: 'credits', label: `${pack.credits} crédits`, amountUsd: pack.priceUsd, metadata: { packId: pack.id, credits: pack.credits } })} className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold">Acheter</button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-4">
        <div className="flex gap-3"><Sparkles className="w-5 h-5 text-emerald-400 shrink-0" /><div><h4 className="text-sm font-bold text-white">Paiement prioritaire : Market-Cash</h4><p className="text-xs text-gray-400 mt-1">MUNGWELE IA utilisera Market-Cash comme moyen de paiement principal. PayPal et Visa sont réservés dans l’interface et seront activés prochainement.</p></div></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4"><p className="text-sm font-black text-white">Market-Cash</p><p className="text-[11px] text-emerald-300 mt-1">Prioritaire • Compte ou carte</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-60"><p className="text-sm font-black text-white">PayPal</p><p className="text-[11px] text-gray-400 mt-1">Bientôt</p></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-60"><p className="text-sm font-black text-white">Visa / Mastercard</p><p className="text-[11px] text-gray-400 mt-1">Bientôt</p></div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-500/20 bg-amber-950/10 p-5 flex gap-3"><Lock className="w-5 h-5 text-amber-400 shrink-0" /><div><h4 className="text-sm font-bold text-white">Politique qualité vidéo</h4><p className="text-xs text-gray-400 mt-1">Sans abonnement, les crédits permettent de générer mais pas de télécharger la version HD originale. Creator déverrouille 720p. Pro déverrouille jusqu’à 1080p. La 4K restera une option premium distincte lorsque nous l’activerons.</p></div></section>

      <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white flex items-center gap-2"><Receipt className="w-4 h-4 text-purple-400" />Historique crédits</h3><span className="text-xs text-gray-400">Solde : <strong className="text-amber-400">{credits}</strong></span></div><div className="rounded-2xl border border-white/10 overflow-hidden">{transactions.length === 0 ? <div className="p-8 text-center text-xs text-gray-500">Aucune transaction enregistrée.</div> : transactions.map((tx) => <div key={tx.id} className="p-3 border-b border-white/5 flex justify-between gap-4 text-xs"><div><p className="text-white">{tx.description}</p><p className="text-gray-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p></div><span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span></div>)}</div></section>

      {paymentTarget && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#10101a] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Paiement Market-Cash</p><h3 className="text-xl font-black text-white mt-1">{paymentSummary}</h3><p className="text-xs text-gray-400 mt-1">Connexion sécurisée prévue via MH APIS.</p></div>
              <button onClick={closePayment} className="p-2 rounded-xl bg-white/5 text-gray-300 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMarketCashMode('account')} className={`p-3 rounded-2xl border text-left ${marketCashMode === 'account' ? 'border-emerald-500 bg-emerald-950/20' : 'border-white/10 bg-white/[0.02]'}`}><Mail className="w-4 h-4 text-emerald-400 mb-2" /><p className="text-sm font-bold text-white">Compte Market-Cash</p><p className="text-[10px] text-gray-400">E-mail + mot de passe</p></button>
                <button onClick={() => setMarketCashMode('card')} className={`p-3 rounded-2xl border text-left ${marketCashMode === 'card' ? 'border-purple-500 bg-purple-950/20' : 'border-white/10 bg-white/[0.02]'}`}><ScanLine className="w-4 h-4 text-purple-400 mb-2" /><p className="text-sm font-bold text-white">Scanner votre carte</p><p className="text-[10px] text-gray-400">Carte Market-Cash</p></button>
              </div>

              {marketCashMode === 'account' ? (
                <div className="space-y-3">
                  <input value={marketCashEmail} onChange={(e) => setMarketCashEmail(e.target.value)} type="email" autoComplete="username" placeholder="E-mail Market-Cash" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white outline-none focus:border-emerald-500" />
                  <input value={marketCashPassword} onChange={(e) => setMarketCashPassword(e.target.value)} type="password" autoComplete="current-password" placeholder="Mot de passe Market-Cash" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white outline-none focus:border-emerald-500" />
                  <button onClick={() => notifyMhApisPending('La connexion au compte Market-Cash')} className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold">Continuer avec Market-Cash</button>
                  <p className="text-[10px] text-gray-500">Le mot de passe ne sera jamais stocké dans MUNGWELE IA. MH APIS devra échanger les identifiants contre un jeton de paiement temporaire.</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-purple-500/30 bg-purple-950/10 p-8 text-center">
                  <ScanLine className="w-10 h-10 text-purple-400 mx-auto" />
                  <p className="text-sm font-bold text-white mt-3">Scanner votre carte Market-Cash</p>
                  <p className="text-xs text-gray-400 mt-1">La caméra et la lecture sécurisée de carte seront reliées au service Market-Cash via MH APIS.</p>
                  <button onClick={() => notifyMhApisPending('Le scanner de carte Market-Cash')} className="mt-4 px-5 py-3 rounded-xl bg-purple-600 text-white text-xs font-bold">Ouvrir le scanner</button>
                </div>
              )}

              <div className="rounded-2xl border border-blue-500/20 bg-blue-950/10 p-4 space-y-3">
                <div className="flex items-start gap-2"><ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" /><div><p className="text-xs font-bold text-white">Confirmation forte</p><p className="text-[10px] text-gray-400 mt-1">Après autorisation du paiement, MUNGWELE demandera à MH APIS de créer une confirmation dans Market-Cash. Le code à usage unique reçu côté Market-Cash devra être confirmé avant attribution des crédits ou de l’abonnement.</p></div></div>
                <div className="flex gap-2"><input value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} inputMode="numeric" placeholder="Code de confirmation" className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white outline-none" /><button onClick={() => notifyMhApisPending('La confirmation du code Market-Cash')} className="px-4 rounded-xl bg-blue-600 text-white text-xs font-bold">Confirmer</button></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button disabled className="py-3 rounded-xl border border-white/10 bg-white/[0.02] text-gray-500 text-xs font-bold cursor-not-allowed">PayPal — Bientôt</button>
                <button disabled className="py-3 rounded-xl border border-white/10 bg-white/[0.02] text-gray-500 text-xs font-bold cursor-not-allowed"><CreditCard className="w-3.5 h-3.5 inline mr-1" />Visa — Bientôt</button>
              </div>

              <div className="rounded-xl bg-white/[0.025] border border-white/10 p-3 text-[10px] text-gray-500">Aucun paiement n’est simulé. Aucun crédit ni abonnement n’est ajouté tant que MH APIS et Market-Cash n’ont pas confirmé une transaction réelle.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
