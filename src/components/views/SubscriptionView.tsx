import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { CalendarClock, Check, CreditCard, Crown, Lock, PackageOpen, Plus, Receipt, RefreshCw, ShieldCheck, Trash2, WalletCards, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { VIDEO_CREDIT_COSTS } from '../../config/commercialPricing';
import { MarketCashPaymentModal } from '../common/MarketCashPaymentModal';
import { MarketCashPaymentMethodModal } from '../common/MarketCashPaymentMethodModal';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import {
  getMarketCashBillingSummary,
  removeMarketCashPaymentMethod,
  setDefaultMarketCashPaymentMethod,
  setMarketCashAutoRenew,
  type MarketCashBillingSummary,
  type SavedMarketCashPaymentMethod,
} from '../../services/marketCashBillingService';

type SectionMode = 'choose' | 'credits' | 'subscription' | 'billing';
type PostPaymentPrompt = 'credits' | 'subscription' | null;

const costLabel = (model: keyof typeof VIDEO_CREDIT_COSTS) => `${VIDEO_CREDIT_COSTS[model][4]} / ${VIDEO_CREDIT_COSTS[model][6]} / ${VIDEO_CREDIT_COSTS[model][8]} crédits`;
const VIDEO_ROWS = [
  ['Veo 3.1 Lite', costLabel('lite'), '4s / 6s / 8s'],
  ['Veo 3.1 Fast', costLabel('fast'), '4s / 6s / 8s'],
  ['Gemini Omni', costLabel('omni'), '4s / 6s / 8s'],
  ['Veo 3.1 Pro', costLabel('pro'), '4s / 6s / 8s'],
] as const;

function isExpired(expiry: string) {
  const match = String(expiry || '').match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return true;
  return new Date(Date.UTC(year, month, 1)).getTime() <= Date.now();
}

function shortDate(value: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Non définie';
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const SubscriptionView: React.FC = () => {
  const { user, setUser, credits, transactions, addNotification, appSettings } = useApp();
  const [section, setSection] = useState<SectionMode>('choose');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentTarget, setPaymentTarget] = useState<MarketCashPaymentTarget | null>(null);
  const [billing, setBilling] = useState<MarketCashBillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [postPaymentPrompt, setPostPaymentPrompt] = useState<PostPaymentPrompt>(null);
  const [postPaymentAutoRenew, setPostPaymentAutoRenew] = useState(false);

  const plans = appSettings.subscriptionPlans;
  const packs = appSettings.creditPacks.filter((pack) => pack.enabled);
  const discount = Math.max(0, Math.min(80, appSettings.annualDiscountPercent || 0));

  const refreshBilling = async () => {
    if (!user.id) return null;
    setBillingLoading(true);
    try {
      const summary = await getMarketCashBillingSummary();
      setBilling(summary);
      return summary;
    } catch (error: any) {
      console.warn('[MUNGWELE_BILLING_REFRESH_WARNING]', error);
      return null;
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => { void refreshBilling(); }, [user.id]);

  const openPayment = (target: MarketCashPaymentTarget) => setPaymentTarget(target);
  const closePayment = () => setPaymentTarget(null);

  const paymentSucceeded = async (transactionId?: string) => {
    const completedTarget = paymentTarget;
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
    let summary = await refreshBilling();

    if (completedTarget?.kind === 'subscription' && summary?.profile.autoRenewEnabled) {
      try {
        const methodId = summary.profile.autoRenewPaymentMethodId || summary.profile.defaultPaymentMethodId;
        if (methodId) {
          const synced = await setMarketCashAutoRenew(true, methodId);
          summary = synced.summary;
          setBilling(summary);
        }
      } catch (error) {
        console.warn('[MUNGWELE_AUTO_RENEW_SYNC_WARNING]', error);
      }
    }

    const shouldProposeSave = !summary?.methods?.length;
    const shouldProposeAutoRenew = completedTarget?.kind === 'subscription' && summary?.profile.autoRenewEnabled !== true;
    if (shouldProposeSave || shouldProposeAutoRenew) {
      setPostPaymentPrompt(completedTarget?.kind === 'subscription' ? 'subscription' : 'credits');
      setPostPaymentAutoRenew(false);
    }

    addNotification(
      'success',
      'Paiement Market-Cash confirmé',
      transactionId
        ? `Paiement réglé. Crédits/abonnement mis à jour. Référence : ${transactionId}.`
        : 'Paiement réglé. Crédits/abonnement mis à jour.',
    );
  };

  const methodSaved = async (method: SavedMarketCashPaymentMethod) => {
    setShowAddMethod(false);
    try {
      if (postPaymentPrompt === 'subscription' && postPaymentAutoRenew) {
        const result = await setMarketCashAutoRenew(true, method.id);
        setBilling(result.summary);
        addNotification('success', 'Paiement automatique activé', `L’abonnement sera renouvelé avec la carte Market-Cash •••• ${method.cardLast4}.`);
      } else {
        await refreshBilling();
        addNotification('success', 'Moyen de paiement enregistré', `Carte Market-Cash •••• ${method.cardLast4} enregistrée.`);
      }
      setPostPaymentPrompt(null);
      setPostPaymentAutoRenew(false);
    } catch (error: any) {
      addNotification('error', 'Activation incomplète', String(error?.message || error));
      await refreshBilling();
    }
  };

  const enableAutoRenewFromPrompt = async () => {
    const method = billing?.methods.find((item) => item.id === billing.profile.defaultPaymentMethodId) || billing?.methods[0];
    if (!method) {
      setPostPaymentAutoRenew(true);
      setShowAddMethod(true);
      return;
    }
    setBillingBusy(true);
    try {
      const result = await setMarketCashAutoRenew(true, method.id);
      setBilling(result.summary);
      setPostPaymentPrompt(null);
      setPostPaymentAutoRenew(false);
      addNotification('success', 'Renouvellement automatique activé', `MUNGWELE utilisera Market-Cash •••• ${method.cardLast4} à la prochaine échéance.`);
    } catch (error: any) {
      addNotification('error', 'Activation refusée', String(error?.message || error));
    } finally {
      setBillingBusy(false);
    }
  };

  const toggleAutoRenew = async () => {
    const enabled = billing?.profile.autoRenewEnabled === true;
    const method = billing?.methods.find((item) => item.id === billing.profile.defaultPaymentMethodId) || billing?.methods[0];
    if (!enabled && !method) {
      setShowAddMethod(true);
      addNotification('info', 'Moyen de paiement requis', 'Enregistrez d’abord une carte Market-Cash. L’activation automatique restera désactivée tant que vous ne la confirmez pas.');
      return;
    }
    setBillingBusy(true);
    try {
      const result = await setMarketCashAutoRenew(!enabled, method?.id);
      setBilling(result.summary);
      addNotification('success', !enabled ? 'Renouvellement automatique activé' : 'Renouvellement automatique désactivé', !enabled ? 'MUNGWELE débitera le moyen autorisé uniquement aux échéances de votre abonnement.' : 'Aucun débit automatique ne sera effectué pour la prochaine échéance.');
    } catch (error: any) {
      addNotification('error', 'Modification impossible', String(error?.message || error));
    } finally {
      setBillingBusy(false);
    }
  };

  const setDefaultMethod = async (methodId: string) => {
    setBillingBusy(true);
    try {
      await setDefaultMarketCashPaymentMethod(methodId);
      await refreshBilling();
    } catch (error: any) {
      addNotification('error', 'Modification impossible', String(error?.message || error));
    } finally {
      setBillingBusy(false);
    }
  };

  const removeMethod = async (methodId: string) => {
    setBillingBusy(true);
    try {
      await removeMarketCashPaymentMethod(methodId);
      await refreshBilling();
      addNotification('success', 'Moyen de paiement supprimé', 'La carte n’est plus disponible dans MUNGWELE.');
    } catch (error: any) {
      addNotification('error', 'Suppression impossible', String(error?.message || error));
    } finally {
      setBillingBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-20">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-950/50 px-3 py-1 text-xs font-bold text-purple-300"><Zap className="h-3.5 w-3.5 text-amber-300" /> Crédits & abonnements</div>
            <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">Gérer mon offre MUNGWELE</h1>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-400">Crédits, abonnements et moyens de paiement Market-Cash dans un même espace.</p>
          </div>
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/80">Solde</p><p className="text-2xl font-black text-white">{credits} <span className="text-xs text-amber-300">crédits</span></p></div>
        </div>
      </div>

      {section === 'choose' && (
        <div className="grid gap-5 md:grid-cols-3">
          <button onClick={() => setSection('credits')} className="group rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-purple-950/35 to-transparent p-6 text-left transition hover:border-purple-400/50">
            <WalletCards className="h-7 w-7 text-purple-300" /><h2 className="mt-5 text-xl font-black text-white">Acheter des crédits</h2><p className="mt-2 text-sm leading-6 text-gray-400">Choisissez un pack et payez avec Market-Cash.</p>
          </button>
          <button onClick={() => setSection('subscription')} className="group rounded-[28px] border border-cyan-500/20 bg-gradient-to-br from-cyan-950/30 to-transparent p-6 text-left transition hover:border-cyan-400/50">
            <Crown className="h-7 w-7 text-cyan-300" /><h2 className="mt-5 text-xl font-black text-white">Mes abonnements</h2><p className="mt-2 text-sm leading-6 text-gray-400">Comparez les formules et choisissez votre cycle.</p>
          </button>
          <button onClick={() => setSection('billing')} className="group rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-950/25 to-transparent p-6 text-left transition hover:border-emerald-400/50">
            <CreditCard className="h-7 w-7 text-emerald-300" /><h2 className="mt-5 text-xl font-black text-white">Facturation et paiements</h2><p className="mt-2 text-sm leading-6 text-gray-400">Cartes enregistrées, paiement par défaut et renouvellement automatique.</p>
          </button>
        </div>
      )}

      {section !== 'choose' && <button onClick={() => setSection('choose')} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-gray-300">← Revenir au choix</button>}

      {section === 'credits' && (
        <>
          <section className="space-y-4">
            <div><h2 className="text-2xl font-black text-white">Acheter des crédits</h2><p className="mt-1 text-xs text-gray-400">Packs simples, sans abonnement obligatoire. Les crédits MUNGWELE sont une unité interne et ne sont pas équivalents aux crédits d’un autre service.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {packs.map((pack) => <article key={pack.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><PackageOpen className="h-5 w-5 text-purple-300" /><p className="mt-4 text-sm font-bold text-white">{pack.name}</p><p className="mt-1 text-3xl font-black text-amber-300">{pack.credits}</p><p className="text-xs text-gray-500">crédits</p><p className="mt-3 text-lg font-black text-white">${pack.priceUsd.toFixed(2)}</p><button onClick={() => openPayment({ kind: 'credits', label: `${pack.credits} crédits`, amountUsd: pack.priceUsd, metadata: { packId: pack.id, credits: pack.credits } })} className="mt-5 w-full rounded-xl bg-purple-600 py-3 text-xs font-black text-white">Payer avec Market-Cash</button></article>)}
            </div>
          </section>
          <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-bold text-white"><Receipt className="h-4 w-4 text-purple-400" /> Transactions crédits</h3><span className="text-xs text-gray-400">Solde : <strong className="text-amber-400">{credits}</strong></span></div><div className="overflow-hidden rounded-2xl border border-white/10">{transactions.length === 0 ? <div className="p-8 text-center text-xs text-gray-500">Aucune transaction enregistrée.</div> : transactions.map((tx) => <div key={tx.id} className="flex justify-between gap-4 border-b border-white/5 p-3 text-xs"><div><p className="text-white">{tx.description}</p><p className="text-gray-500">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p></div><span className={tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}>{tx.amount > 0 ? '+' : ''}{tx.amount}</span></div>)}</div></section>
        </>
      )}

      {section === 'subscription' && (
        <>
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black text-white">Abonnements</h2><p className="mt-1 text-xs text-gray-400">Des formules accessibles avec davantage de crédits mensuels. Le renouvellement automatique reste facultatif.</p></div><div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.04] p-1"><button onClick={() => setBillingCycle('monthly')} className={`rounded-xl px-4 py-2 text-xs font-bold ${billingCycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Mensuel</button><button onClick={() => setBillingCycle('yearly')} className={`rounded-xl px-4 py-2 text-xs font-bold ${billingCycle === 'yearly' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Annuel -{discount}%</button></div></div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const current = user.plan === plan.id;
                const discountedMonthly = billingCycle === 'yearly' ? plan.priceMonth * (1 - discount / 100) : plan.priceMonth;
                const amountDue = billingCycle === 'yearly' ? discountedMonthly * 12 : discountedMonthly;
                return <article key={plan.id} className={`relative flex flex-col rounded-3xl border p-5 ${plan.popular ? 'border-purple-500 bg-purple-950/25' : 'border-white/10 bg-white/[0.03]'}`}>{plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-[10px] font-black text-white">POPULAIRE</span>}<h3 className="text-xl font-black text-white">{plan.name}</h3><p className="mt-2 text-4xl font-black text-white">${discountedMonthly.toFixed(discountedMonthly % 1 ? 2 : 0)}<span className="text-xs font-medium text-gray-500"> / mois</span></p>{billingCycle === 'yearly' && plan.id !== 'free' && <p className="mt-1 text-[11px] font-bold text-cyan-300">Facturé ${amountDue.toFixed(2)} pour 12 mois</p>}<div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3"><div className="flex justify-between text-xs"><span className="text-gray-400">Crédits mensuels</span><strong className="text-amber-300">{plan.creditsMonthly.toLocaleString('fr-FR')}</strong></div></div><ul className="mt-4 flex-1 space-y-2">{plan.features.map((feature, index) => <li key={index} className="flex gap-2 text-xs text-gray-300"><Check className="h-4 w-4 shrink-0 text-purple-400" />{feature}</li>)}</ul><button disabled={current || plan.id === 'free'} onClick={() => openPayment({ kind: 'subscription', label: `Abonnement ${plan.name}`, amountUsd: amountDue, metadata: { planId: plan.id, billingCycle } })} className={`mt-5 w-full rounded-xl py-3 text-xs font-black ${current || plan.id === 'free' ? 'border border-white/10 bg-white/[0.03] text-gray-500' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'}`}>{current ? 'Formule actuelle' : plan.id === 'free' ? 'Sans abonnement' : `Payer ${plan.name} avec Market-Cash`}</button></article>;
              })}
            </div>
          </section>
          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><h3 className="text-sm font-black text-white">Coût vidéo transparent</h3><p className="mt-1 text-xs leading-5 text-gray-400">Le coût dépend du moteur et de la durée. Les tarifs ci-dessous correspondent à la génération 720p actuellement connectée ; la résolution de téléchargement relève du niveau d’abonnement.</p></div></div><div className="mt-4 overflow-hidden rounded-2xl border border-white/10">{VIDEO_ROWS.map(([name, cost, duration]) => <div key={name} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 border-b border-white/5 px-4 py-3 text-xs"><span className="font-bold text-white">{name}</span><span className="text-amber-300">{cost}</span><span className="text-gray-500">{duration}</span></div>)}</div></section>
          <section className="flex gap-3 rounded-3xl border border-amber-500/20 bg-amber-950/10 p-5"><Lock className="h-5 w-5 shrink-0 text-amber-400" /><div><h4 className="text-sm font-bold text-white">Contrôle utilisateur</h4><p className="mt-1 text-xs leading-5 text-gray-400">Vous pouvez désactiver le renouvellement automatique ou supprimer une carte enregistrée depuis Facturation et paiements.</p></div></section>
        </>
      )}

      {section === 'billing' && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-white">Facturation et paiements</h2><p className="mt-1 text-xs text-gray-400">Gérez uniquement les éléments utiles à MUNGWELE : cartes, défaut, renouvellement et activité.</p></div><button onClick={() => void refreshBilling()} disabled={billingLoading} className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-gray-300"><RefreshCw className={`h-4 w-4 ${billingLoading ? 'animate-spin' : ''}`} /></button></div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-white">Moyens de paiement</h3><p className="mt-1 text-xs text-gray-500">Cartes Market-Cash enregistrées.</p></div><button onClick={() => setShowAddMethod(true)} className="flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-xs font-black text-white"><Plus className="h-4 w-4" />Ajouter</button></div>
            <div className="mt-4 space-y-3">
              {billingLoading && !billing ? <div className="py-8 text-center text-xs text-gray-500">Chargement…</div> : !billing?.methods.length ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-gray-500">Aucun moyen de paiement enregistré.</div> : billing.methods.map((method) => {
                const expired = isExpired(method.expiry);
                return <div key={method.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-300"><CreditCard className="h-5 w-5" /></span><div><p className="text-sm font-black text-white">Market-Cash •••• {method.cardLast4}</p><p className={`mt-1 text-xs ${expired ? 'text-rose-300' : 'text-gray-500'}`}>{expired ? `Expirée ${method.expiry}` : `Expire ${method.expiry}`}{method.isDefault ? ' · Par défaut' : ''}</p></div></div><div className="flex gap-2">{!method.isDefault && !expired && <button disabled={billingBusy} onClick={() => void setDefaultMethod(method.id)} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-gray-300">Par défaut</button>}<button disabled={billingBusy} onClick={() => void removeMethod(method.id)} className="rounded-lg border border-rose-500/20 p-2 text-rose-300" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button></div></div>;
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
            <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><CalendarClock className="mt-0.5 h-5 w-5 text-cyan-300" /><div><h3 className="text-lg font-black text-white">Renouvellement automatique</h3><p className="mt-1 text-xs leading-5 text-gray-400">{billing?.profile.autoRenewEnabled ? `Actif · prochaine échéance ${shortDate(billing.profile.nextBillingAt)}` : 'Désactivé. Aucun abonnement ne sera débité automatiquement.'}</p></div></div><button disabled={billingBusy || user.plan === 'free'} onClick={() => void toggleAutoRenew()} className={`relative h-7 w-12 rounded-full transition ${billing?.profile.autoRenewEnabled ? 'bg-emerald-500' : 'bg-white/15'} disabled:opacity-40`} aria-label="Renouvellement automatique"><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${billing?.profile.autoRenewEnabled ? 'left-6' : 'left-1'}`} /></button></div>
            {user.plan === 'free' && <p className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-[11px] text-gray-500">Le paiement automatique devient disponible après l’activation d’un abonnement payant.</p>}
            {billing?.profile.billingStatus === 'payment_failed' && <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-200">Renouvellement suspendu après plusieurs échecs. Vérifiez votre carte avant de le réactiver.</p>}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"><h3 className="text-lg font-black text-white">Activité de paiement</h3><p className="mt-1 text-xs text-gray-500">Paiements récents, y compris les renouvellements automatiques.</p><div className="mt-4 overflow-hidden rounded-2xl border border-white/10">{!billing?.activity.length ? <div className="p-7 text-center text-xs text-gray-500">Aucune activité disponible.</div> : billing.activity.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 border-b border-white/5 p-3 text-xs"><div><p className="font-bold text-white">{item.label}</p><p className="mt-1 text-gray-500">{item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : ''}{item.reference ? ` · ${item.reference}` : ''}</p></div><div className="text-right"><p className={item.status === 'failed' ? 'font-bold text-rose-300' : 'font-bold text-emerald-300'}>{item.status === 'failed' ? 'Échec' : 'Payé'}</p>{item.amountUsd > 0 && <p className="mt-1 text-gray-400">${item.amountUsd.toFixed(2)}</p>}</div></div>)}</div></div>
        </section>
      )}

      {paymentTarget && <MarketCashPaymentModal target={paymentTarget} userId={user.id} userEmail={user.email} onClose={closePayment} onSuccess={(transactionId) => void paymentSucceeded(transactionId)} />}
      {showAddMethod && <MarketCashPaymentMethodModal onClose={() => setShowAddMethod(false)} onSaved={(method) => void methodSaved(method)} />}

      {postPaymentPrompt && !showAddMethod && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d1420] p-5 shadow-2xl">
            <CreditCard className="h-7 w-7 text-purple-300" />
            <h3 className="mt-4 text-xl font-black text-white">Simplifier les prochains paiements ?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">Vous pouvez enregistrer une carte Market-Cash. MUNGWELE ne conserve ni le numéro complet ni le CVV.</p>
            {postPaymentPrompt === 'subscription' && billing?.profile.autoRenewEnabled !== true && <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-4"><div><p className="text-sm font-black text-white">Activer le renouvellement automatique</p><p className="mt-1 text-[11px] leading-4 text-gray-400">Autorise MUNGWELE à débiter Market-Cash à chaque échéance de cet abonnement. Désactivable à tout moment.</p></div><input type="checkbox" checked={postPaymentAutoRenew} onChange={(e) => setPostPaymentAutoRenew(e.target.checked)} className="h-5 w-5 shrink-0 accent-cyan-500" /></label>}
            <div className="mt-5 flex gap-3"><button onClick={() => { setPostPaymentPrompt(null); setPostPaymentAutoRenew(false); }} className="flex-1 rounded-xl border border-white/10 py-3 text-xs font-bold text-gray-300">Pas maintenant</button><button disabled={billingBusy} onClick={() => { if (postPaymentPrompt === 'subscription' && postPaymentAutoRenew && billing?.methods.length) void enableAutoRenewFromPrompt(); else setShowAddMethod(true); }} className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 py-3 text-xs font-black text-white">{postPaymentPrompt === 'subscription' && postPaymentAutoRenew && billing?.methods.length ? 'Activer' : 'Enregistrer une carte'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
