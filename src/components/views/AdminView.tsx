import React, { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Activity, Bell, Layers, Power, RefreshCw, Save, Server, ShieldAlert, Users, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import type { CreditPackConfig, PlanConfig } from '../../types';

export const AdminView: React.FC = () => {
  const { providers, toggleProvider, appSettings, updateAppSettings, addNotification } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [announcementText, setAnnouncementText] = useState(appSettings.announcementBanner || '');
  const [maintenance, setMaintenance] = useState(appSettings.maintenanceMode || false);
  const [annualDiscount, setAnnualDiscount] = useState(appSettings.annualDiscountPercent || 20);
  const [plans, setPlans] = useState<PlanConfig[]>(appSettings.subscriptionPlans);
  const [packs, setPacks] = useState<CreditPackConfig[]>(appSettings.creditPacks);

  useEffect(() => {
    setPlans(appSettings.subscriptionPlans);
    setPacks(appSettings.creditPacks);
    setAnnualDiscount(appSettings.annualDiscountPercent);
  }, [appSettings.subscriptionPlans, appSettings.creditPacks, appSettings.annualDiscountPercent]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Stats indisponibles');
      setStats(await res.json());
    } catch { setStats(null); }
    finally { setIsLoading(false); }
  };
  useEffect(() => { fetchStats(); }, []);

  const updatePlan = (id: PlanConfig['id'], patch: Partial<PlanConfig>) => setPlans((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));
  const updatePack = (id: string, patch: Partial<CreditPackConfig>) => setPacks((prev) => prev.map((p) => p.id === id ? { ...p, ...patch } : p));

  const savePricing = async () => {
    setSavingPricing(true);
    try {
      await setDoc(doc(db, 'appSettings', 'pricing'), {
        annualDiscountPercent: Math.max(0, Math.min(80, Number(annualDiscount) || 0)),
        subscriptionPlans: plans.map((p) => ({ ...p, priceMonth: Math.max(0, Number(p.priceMonth) || 0), creditsMonthly: Math.max(0, Math.round(Number(p.creditsMonthly) || 0)) })),
        creditPacks: packs.map((p) => ({ ...p, priceUsd: Math.max(0, Number(p.priceUsd) || 0), credits: Math.max(1, Math.round(Number(p.credits) || 1)) })),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      updateAppSettings({ annualDiscountPercent: annualDiscount, subscriptionPlans: plans, creditPacks: packs });
      addNotification('success', 'Tarification enregistrée', 'Les abonnements et packs sont maintenant mis à jour pour tous les utilisateurs.');
    } catch (error: any) {
      addNotification('error', 'Enregistrement refusé', error?.message || 'Vérifiez les règles Firestore et votre session administrateur.');
    } finally { setSavingPricing(false); }
  };

  const saveGeneral = async () => {
    updateAppSettings({ announcementBanner: announcementText, maintenanceMode: maintenance });
    try {
      await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcementBanner: announcementText, maintenanceMode: maintenance }) });
      addNotification('success', 'Paramètres enregistrés', 'Configuration générale mise à jour.');
    } catch { addNotification('error', 'Erreur', 'Impossible d’enregistrer la configuration générale.'); }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2"><ShieldAlert className="w-3.5 h-3.5" />Administration générale</div><h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">Supervision MUNGWELE IA</h2><p className="text-xs text-gray-400 mt-1">Tarification commerciale, abonnements, crédits et fournisseurs.</p></div>
        <button onClick={fetchStats} disabled={isLoading} className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/10 text-white flex items-center gap-2"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />Actualiser</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Utilisateurs', stats?.totalUsers ?? 0, Users], ['Générations', stats?.totalGenerations ?? 0, Layers], ['Serveur', 'OK', Server], ['Crédits consommés', stats?.totalCreditsConsumed ?? 0, Zap]].map(([label, value, Icon]: any) => <div key={label} className="p-5 rounded-2xl bg-white/[0.03] border border-white/10"><div className="flex justify-between text-xs text-gray-400"><span>{label}</span><Icon className="w-4 h-4" /></div><div className="text-2xl font-bold text-white mt-2">{value}</div></div>)}
      </div>

      <section className="p-6 rounded-3xl bg-white/[0.03] border border-purple-500/20 space-y-5">
        <div><h3 className="text-lg font-bold text-white">Abonnements & crédits</h3><p className="text-xs text-gray-400 mt-1">Ces valeurs sont enregistrées dans Firestore et deviennent la source officielle de la page Abonnements.</p></div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => <div key={plan.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div><span className="text-sm font-bold text-white">{plan.name}</span><span className="text-[10px] text-purple-300 block uppercase">{plan.id}</span></div>
            <label className="block text-[11px] text-gray-400">Prix mensuel ($)<input type="number" min="0" step="0.5" value={plan.priceMonth} onChange={(e) => updatePlan(plan.id, { priceMonth: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white" /></label>
            <label className="block text-[11px] text-gray-400">Crédits / mois<input type="number" min="0" value={plan.creditsMonthly} onChange={(e) => updatePlan(plan.id, { creditsMonthly: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white" /></label>
            <label className="block text-[11px] text-gray-400">Téléchargement maximum<select value={plan.maxDownloadResolution} onChange={(e) => updatePlan(plan.id, { maxDownloadResolution: e.target.value as any })} className="mt-1 w-full px-3 py-2 rounded-xl bg-[#081226] border border-white/10 text-white"><option value="standard">Standard</option><option value="720p">720p</option><option value="1080p">1080p</option></select></label>
          </div>)}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {packs.map((pack) => <div key={pack.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <input value={pack.name} onChange={(e) => updatePack(pack.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-sm font-bold text-white" />
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] text-gray-400">Crédits<input type="number" min="1" value={pack.credits} onChange={(e) => updatePack(pack.id, { credits: Number(e.target.value) })} className="mt-1 w-full px-2 py-2 rounded-lg bg-black/20 border border-white/10 text-white" /></label><label className="text-[10px] text-gray-400">Prix ($)<input type="number" min="0" step="0.5" value={pack.priceUsd} onChange={(e) => updatePack(pack.id, { priceUsd: Number(e.target.value) })} className="mt-1 w-full px-2 py-2 rounded-lg bg-black/20 border border-white/10 text-white" /></label></div>
            <label className="flex items-center justify-between text-xs text-gray-300">Actif<input type="checkbox" checked={pack.enabled} onChange={(e) => updatePack(pack.id, { enabled: e.target.checked })} /></label>
          </div>)}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"><label className="text-xs text-gray-400">Remise annuelle (%)<input type="number" min="0" max="80" value={annualDiscount} onChange={(e) => setAnnualDiscount(Number(e.target.value))} className="mt-1 w-36 px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white" /></label><button onClick={savePricing} disabled={savingPricing} className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold flex items-center gap-2"><Save className="w-4 h-4" />{savingPricing ? 'Enregistrement...' : 'Enregistrer tarifs & abonnements'}</button></div>
      </section>

      <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4"><h3 className="text-base font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4" />Fournisseurs IA</h3><div className="grid sm:grid-cols-2 gap-3">{providers.map((p) => <div key={p.id} className="p-4 rounded-2xl border border-white/10 flex justify-between items-center"><div><p className="text-sm font-bold text-white">{p.name}</p><p className="text-[10px] text-gray-400">{p.modelName} • {p.isConfigured ? 'Configuré' : 'Non configuré'}</p></div><button onClick={() => toggleProvider(p.id, !p.enabled)} className={`p-2 rounded-xl ${p.enabled ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`}><Power className="w-4 h-4" /></button></div>)}</div></section>

      <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4"><h3 className="text-base font-bold text-white flex items-center gap-2"><Bell className="w-4 h-4" />Annonce globale</h3><input value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white" /><label className="flex justify-between text-xs text-gray-300">Mode maintenance<input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} /></label><div className="flex justify-end"><button onClick={saveGeneral} className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold">Enregistrer</button></div></section>
    </div>
  );
};
