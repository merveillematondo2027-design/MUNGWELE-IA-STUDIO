import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Activity, ArrowLeft, Bell, BookOpen, CreditCard, FileClock, Image as ImageIcon, Layers, Library, RefreshCw, Save, ScrollText, Search, ShieldAlert, Users, WalletCards, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import type { CreditPackConfig, PlanConfig } from '../../types';

type AdminModule = 'dashboard' | 'users' | 'credits' | 'subscriptions' | 'library' | 'logs' | 'usage';
type AdminUser = any;

const MODULES = [
  { id: 'users', label: 'Utilisateurs', note: 'Comptes, identité, statut et activité', icon: Users },
  { id: 'credits', label: 'Gestion des crédits', note: 'Soldes, ajustements et transactions', icon: WalletCards },
  { id: 'subscriptions', label: 'Abonnements', note: 'Plans, prix et packs', icon: CreditCard },
  { id: 'library', label: 'Bibliothèque utilisateurs', note: 'Images, vidéos et musiques', icon: Library },
  { id: 'logs', label: 'Logs application', note: 'Événements techniques et fournisseurs', icon: ScrollText },
  { id: 'usage', label: 'Historique des utilisations', note: 'Générations, crédits et activité', icon: FileClock },
] as const;

export const AdminView: React.FC = () => {
  const { appSettings, updateAppSettings, addNotification } = useApp();
  const [module, setModule] = useState<AdminModule>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'music'>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<PlanConfig[]>(appSettings.subscriptionPlans || []);
  const [packs, setPacks] = useState<CreditPackConfig[]>(appSettings.creditPacks || []);
  const [annualDiscount, setAnnualDiscount] = useState(appSettings.annualDiscountPercent || 20);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, usersSnap, genSnap, txSnap] = await Promise.all([
        fetch('/api/admin/stats').then((r) => r.ok ? r.json() : null).catch(() => null),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'generations')),
        getDocs(collection(db, 'creditTransactions')).catch(() => ({ docs: [] } as any)),
      ]);
      setStats(statsRes);
      setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setGenerations(genSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTransactions(txSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
      try {
        const postsSnap = await getDocs(collection(db, 'communityPosts'));
        setCommunityPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch { setCommunityPosts([]); }
    } catch (error: any) {
      addNotification('error', 'Administration', error?.message || 'Impossible de charger toutes les données administrateur.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { setPlans(appSettings.subscriptionPlans || []); setPacks(appSettings.creditPacks || []); setAnnualDiscount(appSettings.annualDiscountPercent || 20); }, [appSettings]);

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const selectedGenerations = selectedUser ? generations.filter((g) => g.userId === selectedUser.id) : [];
  const selectedTransactions = selectedUser ? transactions.filter((t) => t.userId === selectedUser.id) : [];
  const selectedPosts = selectedUser ? communityPosts.filter((p) => p.userId === selectedUser.id || p.authorId === selectedUser.id) : [];

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.name, u.email, u.plan, u.status, u.id].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [users, query]);

  const filteredMedia = useMemo(() => generations.filter((g) => mediaFilter === 'all' || g.type === mediaFilter), [generations, mediaFilter]);
  const totalCreditsHeld = users.reduce((sum, u) => sum + Number(u.credits || 0), 0);

  const updateUser = async (userId: string, patch: Record<string, any>) => {
    try {
      await updateDoc(doc(db, 'users', userId), { ...patch, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...patch } : u));
      addNotification('success', 'Utilisateur mis à jour', 'Les changements ont été enregistrés dans Firestore.');
    } catch (error: any) { addNotification('error', 'Modification refusée', error?.message || 'Vérifiez les règles administrateur Firestore.'); }
  };

  const savePricing = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'appSettings', 'pricing'), { annualDiscountPercent: annualDiscount, subscriptionPlans: plans, creditPacks: packs, updatedAt: serverTimestamp() }, { merge: true });
      updateAppSettings({ annualDiscountPercent: annualDiscount, subscriptionPlans: plans, creditPacks: packs });
      addNotification('success', 'Tarification enregistrée', 'Plans et packs sont à jour.');
    } catch (error: any) { addNotification('error', 'Enregistrement refusé', error?.message || 'Erreur Firestore.'); }
    finally { setSaving(false); }
  };

  const fmtDate = (value: any) => {
    try {
      if (!value) return '—';
      const d = value?.toDate ? value.toDate() : new Date(value);
      return d.toLocaleString('fr-FR');
    } catch { return '—'; }
  };

  if (module !== 'dashboard') {
    return (
      <div className="mx-auto w-full max-w-7xl pb-16">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3"><button onClick={() => { setModule('dashboard'); setSelectedUserId(null); }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-300">Administration</p><h1 className="text-xl font-black text-white sm:text-2xl">{MODULES.find((m) => m.id === module)?.label}</h1></div></div>
          <button onClick={loadAll} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">Actualiser</span></button>
        </div>

        {module === 'users' && !selectedUser && (
          <div className="space-y-5">
            <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom, e-mail, plan, statut..." className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white outline-none" /></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filteredUsers.map((u) => <button key={u.id} onClick={() => setSelectedUserId(u.id)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.055]"><div className="flex items-center gap-3">{u.avatar ? <img src={u.avatar} className="h-12 w-12 rounded-xl object-cover" /> : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/15 text-lg font-black text-purple-200">{String(u.name || u.email || '?').charAt(0).toUpperCase()}</span>}<div className="min-w-0"><p className="truncate text-sm font-black text-white">{u.name || 'Utilisateur'}</p><p className="truncate text-xs text-gray-500">{u.email}</p><p className="mt-1 text-[10px] uppercase text-gray-600">{u.plan || 'free'} • {u.credits || 0} crédits • {u.status || 'active'}</p></div></div></button>)}</div>
          </div>
        )}

        {module === 'users' && selectedUser && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div className="flex items-center gap-4">{selectedUser.avatar ? <img src={selectedUser.avatar} className="h-20 w-20 rounded-2xl object-cover" /> : <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-500/15 text-2xl font-black">{String(selectedUser.name || '?').charAt(0)}</span>}<div><h2 className="text-xl font-black text-white">{selectedUser.name || 'Utilisateur'}</h2><p className="text-sm text-gray-400">{selectedUser.email}</p><p className="mt-2 text-xs text-gray-600">ID : {selectedUser.id}</p><p className="text-xs text-gray-600">Inscription : {fmtDate(selectedUser.createdAt)}</p></div></div><button onClick={() => setSelectedUserId(null)} className="rounded-xl border border-white/10 px-3 py-2 text-xs">Retour à la liste</button></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3"><label className="text-xs text-gray-400">Crédits<input type="number" value={selectedUser.credits || 0} onChange={(e) => setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, credits: Number(e.target.value) } : u))} onBlur={() => updateUser(selectedUser.id, { credits: Number(selectedUser.credits || 0) })} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" /></label><label className="text-xs text-gray-400">Plan<select value={selectedUser.plan || 'free'} onChange={(e) => updateUser(selectedUser.id, { plan: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2 text-white"><option value="free">Free</option><option value="creator">Creator</option><option value="pro">Pro</option></select></label><label className="text-xs text-gray-400">Statut<select value={selectedUser.status || 'active'} onChange={(e) => updateUser(selectedUser.id, { status: e.target.value })} className="mt-1 w-full rounded-xl border border-white/10 bg-[#09111f] px-3 py-2 text-white"><option value="active">Actif</option><option value="blocked">Bloqué</option></select></label></div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="mb-4 font-black text-white">Historique personnel</h3><div className="space-y-2">{selectedTransactions.slice(0, 20).map((t) => <div key={t.id} className="rounded-xl border border-white/10 p-3 text-xs"><div className="flex justify-between"><span className="font-bold text-gray-200">{t.description || t.type}</span><span className={Number(t.amount) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{Number(t.amount) >= 0 ? '+' : ''}{t.amount}</span></div><p className="mt-1 text-gray-600">{fmtDate(t.createdAt)}</p></div>)}{selectedTransactions.length === 0 && <p className="text-xs text-gray-600">Aucune transaction enregistrée.</p>}</div></section><section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="mb-4 font-black text-white">Communauté</h3><div className="space-y-2">{selectedPosts.slice(0, 20).map((p) => <div key={p.id} className="rounded-xl border border-white/10 p-3"><p className="text-sm text-gray-200">{p.text || p.caption || p.title || 'Publication'}</p><p className="mt-1 text-[10px] text-gray-600">{fmtDate(p.createdAt)}</p></div>)}{selectedPosts.length === 0 && <p className="text-xs leading-5 text-gray-600">Aucune publication communautaire trouvée pour cet utilisateur. Le panneau est déjà prêt pour la collection communityPosts.</p>}</div></section></div>
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="mb-4 flex items-center justify-between"><h3 className="font-black text-white">Bibliothèque personnelle</h3><span className="text-xs text-gray-500">{selectedGenerations.length} créations</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{selectedGenerations.map((g) => <div key={g.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">{g.type === 'image' ? <img src={g.thumbnailUrl || g.resultUrl} className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-white/[0.03]"><Layers className="h-6 w-6 text-gray-500" /></div>}<div className="p-3"><p className="truncate text-xs font-bold text-white">{g.title}</p><p className="mt-1 text-[10px] text-gray-600">{g.type} • {g.creditsUsed || 0} crédits</p></div></div>)}</div></section>
          </div>
        )}

        {module === 'credits' && <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-3"><Stat label="Crédits détenus" value={totalCreditsHeld} /><Stat label="Transactions" value={transactions.length} /><Stat label="Crédits consommés" value={stats?.totalCreditsConsumed ?? generations.reduce((s, g) => s + Number(g.creditsUsed || 0), 0)} /></div><div className="overflow-x-auto rounded-3xl border border-white/10"><table className="min-w-full text-left text-xs"><thead className="bg-white/[0.04] text-gray-500"><tr><th className="p-3">Utilisateur</th><th className="p-3">Solde</th><th className="p-3">Plan</th><th className="p-3">Action</th></tr></thead><tbody>{users.map((u) => <tr key={u.id} className="border-t border-white/10"><td className="p-3"><p className="font-bold text-white">{u.name}</p><p className="text-gray-600">{u.email}</p></td><td className="p-3 text-amber-300">{u.credits || 0}</td><td className="p-3 uppercase text-gray-400">{u.plan || 'free'}</td><td className="p-3"><button onClick={() => { setModule('users'); setSelectedUserId(u.id); }} className="rounded-lg bg-white/[0.05] px-2 py-1.5">Gérer</button></td></tr>)}</tbody></table></div></div>}

        {module === 'subscriptions' && <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3">{plans.map((p) => <div key={p.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 space-y-3"><h3 className="font-black text-white">{p.name}</h3><label className="block text-xs text-gray-400">Prix mensuel ($)<input type="number" value={p.priceMonth} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, priceMonth: Number(e.target.value) } : x))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" /></label><label className="block text-xs text-gray-400">Crédits / mois<input type="number" value={p.creditsMonthly} onChange={(e) => setPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, creditsMonthly: Number(e.target.value) } : x))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" /></label></div>)}</div><div className="grid gap-4 md:grid-cols-3">{packs.map((p) => <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><input value={p.name} onChange={(e) => setPacks((prev) => prev.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))} className="w-full bg-transparent text-sm font-black text-white outline-none" /><div className="mt-3 grid grid-cols-2 gap-2"><input type="number" value={p.credits} onChange={(e) => setPacks((prev) => prev.map((x) => x.id === p.id ? { ...x, credits: Number(e.target.value) } : x))} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" /><input type="number" value={p.priceUsd} onChange={(e) => setPacks((prev) => prev.map((x) => x.id === p.id ? { ...x, priceUsd: Number(e.target.value) } : x))} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" /></div></div>)}</div><div className="flex flex-wrap items-end justify-between gap-3"><label className="text-xs text-gray-400">Remise annuelle (%)<input type="number" value={annualDiscount} onChange={(e) => setAnnualDiscount(Number(e.target.value))} className="mt-1 block w-36 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white" /></label><button onClick={savePricing} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-3 text-xs font-black"><Save className="h-4 w-4" />{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></div>}

        {module === 'library' && <div className="space-y-5"><div className="flex flex-wrap gap-2">{(['all','image','video','music'] as const).map((f) => <button key={f} onClick={() => setMediaFilter(f)} className={`rounded-xl px-3 py-2 text-xs font-bold ${mediaFilter === f ? 'bg-purple-600 text-white' : 'border border-white/10 bg-white/[0.03] text-gray-400'}`}>{f === 'all' ? 'Tout' : f}</button>)}</div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filteredMedia.map((g) => <div key={g.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{g.type === 'image' ? <img src={g.thumbnailUrl || g.resultUrl} className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-black/20"><ImageIcon className="h-6 w-6 text-gray-600" /></div>}<div className="p-3"><p className="truncate text-xs font-black text-white">{g.title}</p><p className="mt-1 truncate text-[10px] text-gray-600">{users.find((u) => u.id === g.userId)?.email || g.userId}</p><p className="mt-1 text-[10px] uppercase text-purple-300">{g.type} • {g.model}</p></div></div>)}</div></div>}

        {module === 'logs' && <div className="space-y-2">{(stats?.logs || []).map((l: any) => <div key={l.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-black text-white">{l.module}</span><span className="text-[10px] text-gray-600">{fmtDate(l.timestamp)}</span></div><p className="mt-2 text-xs text-gray-400">{l.message}</p></div>)}{!(stats?.logs || []).length && <p className="text-sm text-gray-600">Aucun log serveur disponible.</p>}</div>}

        {module === 'usage' && <div className="space-y-4"><div className="grid gap-4 sm:grid-cols-3"><Stat label="Générations" value={generations.length} /><Stat label="Transactions" value={transactions.length} /><Stat label="Utilisateurs" value={users.length} /></div><div className="space-y-2">{generations.slice().sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100).map((g) => <div key={g.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-black text-white">{g.title || g.type}</p><p className="text-[10px] text-gray-600">{users.find((u) => u.id === g.userId)?.email || g.userId}</p></div><span className="text-xs text-amber-300">{g.creditsUsed || 0} crédits</span></div><p className="mt-2 text-[10px] uppercase text-purple-300">{g.type} • {g.model} • {g.status}</p></div>)}</div></div>}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 pb-16">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/60 px-3 py-1 text-xs font-semibold text-rose-300"><ShieldAlert className="h-3.5 w-3.5" />Administration générale</div><h1 className="text-2xl font-black text-white sm:text-3xl">Centre d’administration MUNGWELE IA</h1><p className="mt-1 text-xs text-gray-500">Chaque module s’ouvre comme un espace de travail complet.</p></div><button onClick={loadAll} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualiser</button></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Utilisateurs" value={users.length} /><Stat label="Générations" value={generations.length} /><Stat label="Crédits détenus" value={totalCreditsHeld} /><Stat label="Serveur" value={stats ? 'OK' : '—'} /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{MODULES.map((m) => { const Icon = m.icon; return <button key={m.id} onClick={() => setModule(m.id as AdminModule)} className="group rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left hover:border-purple-500/30 hover:bg-white/[0.055]"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><Icon className="h-5 w-5 text-purple-200" /></span><span className="text-xs text-gray-600 group-hover:text-gray-300">Ouvrir →</span></div><h2 className="mt-5 text-base font-black text-white">{m.label}</h2><p className="mt-1 text-xs leading-5 text-gray-500">{m.note}</p></button>; })}</div>
      <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-300" /><h3 className="font-black text-white">Vue globale</h3></div><p className="mt-2 text-xs leading-5 text-gray-500">La supervision détaillée est maintenant séparée en modules. Les actions sensibles restent réservées au rôle administrateur et seront verrouillées côté serveur avec Firebase.</p></section>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-gray-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>;
