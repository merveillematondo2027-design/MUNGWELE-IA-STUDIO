import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ArrowLeft, BookOpen, Coins, CreditCard, FileClock, Image as ImageIcon, ListChecks, Music2, Search, ShieldCheck, UserRoundCog, Users, Video } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import type { CreditTransaction, GenerationRecord, NavigationTab, UserPlan, UserProfile } from '../../types';

type AdminSection = 'home' | 'users' | 'credits' | 'subscriptions' | 'library' | 'logs' | 'usage';
type FirestoreUser = UserProfile & { uid?: string; updatedAt?: string };
type CommunityPost = { id: string; userId?: string; authorId?: string; title?: string; caption?: string; text?: string; createdAt?: string; mediaUrl?: string };

const ADMIN_TABS: Record<AdminSection, NavigationTab> = {
  home: 'admin-home', users: 'admin-users', credits: 'admin-credits', subscriptions: 'admin-subscriptions', library: 'admin-library', logs: 'admin-logs', usage: 'admin-usage',
};

const sectionMeta = [
  { key: 'users' as const, title: 'Utilisateurs', subtitle: 'Comptes, identité, statut et activité', icon: Users },
  { key: 'credits' as const, title: 'Gestion des crédits', subtitle: 'Soldes, achats, bonus et ajustements', icon: Coins },
  { key: 'subscriptions' as const, title: 'Abonnements', subtitle: 'Plans FREE, Creator et Pro', icon: CreditCard },
  { key: 'library' as const, title: 'Bibliothèque utilisateurs', subtitle: 'Images, vidéos et musiques filtrables', icon: BookOpen },
  { key: 'logs' as const, title: 'Logs application', subtitle: 'Erreurs, fournisseurs et événements serveur', icon: ListChecks },
  { key: 'usage' as const, title: 'Historique des utilisations', subtitle: 'Générations, crédits et modèles utilisés', icon: FileClock },
];

const fmt = (value?: string) => {
  if (!value) return 'Non disponible';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('fr-FR');
};

export const AdminWorkspaceView: React.FC<{ section: AdminSection }> = ({ section }) => {
  const { setActiveTab, appSettings, addNotification } = useApp();
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video' | 'music'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [draftPlan, setDraftPlan] = useState<UserPlan>('free');
  const [draftStatus, setDraftStatus] = useState<'active' | 'blocked'>('active');
  const [draftCredits, setDraftCredits] = useState('0');

  useEffect(() => onSnapshot(collection(db, 'users'), (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, uid: d.id, ...(d.data() as any) })))), []);
  useEffect(() => onSnapshot(collection(db, 'generations'), (snap) => setGenerations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))), []);
  useEffect(() => onSnapshot(collection(db, 'creditTransactions'), (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))), []);
  useEffect(() => onSnapshot(collection(db, 'communityPosts'), (snap) => setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))), () => setPosts([])), []);
  useEffect(() => {
    fetch('/api/admin/stats').then((r) => r.ok ? r.json() : Promise.reject()).then((data) => setLogs(Array.isArray(data.logs) ? data.logs : [])).catch(() => setLogs([]));
  }, []);

  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  useEffect(() => {
    if (!selectedUser) return;
    setDraftPlan(selectedUser.plan || 'free');
    setDraftStatus(selectedUser.status || 'active');
    setDraftCredits(String(Math.max(0, Number(selectedUser.credits || 0))));
  }, [selectedUserId, selectedUser?.updatedAt]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => [u.name, u.email, u.plan, u.status, u.role].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [users, search]);

  const library = useMemo(() => generations.filter((g) => mediaFilter === 'all' || g.type === mediaFilter), [generations, mediaFilter]);
  const selectedGenerations = selectedUser ? generations.filter((g) => g.userId === selectedUser.id || g.userId === selectedUser.uid) : [];
  const selectedTransactions = selectedUser ? transactions.filter((t) => t.userId === selectedUser.id || t.userId === selectedUser.uid) : [];
  const selectedPosts = selectedUser ? posts.filter((p) => p.userId === selectedUser.id || p.authorId === selectedUser.id) : [];

  const openSection = (key: AdminSection) => setActiveTab(ADMIN_TABS[key]);

  const saveUser = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      await updateDoc(doc(db, 'users', selectedUser.uid || selectedUser.id), {
        plan: draftPlan,
        status: draftStatus,
        credits: Math.max(0, Math.round(Number(draftCredits) || 0)),
        updatedAt: new Date().toISOString(),
      });
      addNotification('success', 'Utilisateur mis à jour', 'Les changements ont été enregistrés dans Firestore.');
    } catch (error: any) {
      addNotification('error', 'Modification refusée', error?.message || 'Impossible de modifier cet utilisateur.');
    } finally { setSavingUser(false); }
  };

  if (section === 'home') {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/[0.04] p-5 sm:p-7">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-200"><ShieldCheck className="h-4 w-4" /> Administration générale</div>
          <h1 className="text-2xl font-black text-white sm:text-4xl">Centre d’administration MUNGWELE IA</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">Chaque module s’ouvre dans sa propre page pour garder la supervision claire, rapide et exploitable.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {sectionMeta.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => openSection(item.key)} className="min-h-[140px] rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-purple-500/40 hover:bg-white/[0.055]"><Icon className="h-5 w-5 text-purple-300" /><h2 className="mt-4 text-sm font-black text-white sm:text-base">{item.title}</h2><p className="mt-1 text-[10px] leading-4 text-gray-500 sm:text-xs">{item.subtitle}</p></button>; })}
        </div>
      </div>
    );
  }

  const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-5"><button onClick={() => openSection('home')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-2xl font-black text-white sm:text-3xl">{title}</h1><p className="mt-1 text-xs text-gray-500 sm:text-sm">{subtitle}</p></div></div>
  );

  if (section === 'users') {
    if (selectedUser) {
      return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Fiche utilisateur" subtitle="Identité, historique personnel, bibliothèque et activité communautaire." />
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-purple-600/20 text-xl font-black text-white">{selectedUser.avatar ? <img src={selectedUser.avatar} className="h-full w-full object-cover" /> : (selectedUser.name || selectedUser.email || '?').slice(0,1).toUpperCase()}</div><div className="min-w-0"><p className="truncate font-black text-white">{selectedUser.name || 'Utilisateur'}</p><p className="truncate text-xs text-gray-500">{selectedUser.email}</p></div></div>
            <div className="mt-5 space-y-3 text-xs text-gray-400"><p><span className="text-gray-600">UID :</span> {selectedUser.uid || selectedUser.id}</p><p><span className="text-gray-600">Inscription :</span> {fmt(selectedUser.createdAt)}</p><p><span className="text-gray-600">Générations :</span> {selectedGenerations.length}</p><p><span className="text-gray-600">Publications communauté :</span> {selectedPosts.length}</p></div>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-4"><label className="block text-xs text-gray-400">Plan<select value={draftPlan} onChange={(e) => setDraftPlan(e.target.value as UserPlan)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a1324] px-3 py-2 text-white"><option value="free">FREE</option><option value="creator">Creator</option><option value="pro">Pro</option></select></label><label className="block text-xs text-gray-400">Statut<select value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as any)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a1324] px-3 py-2 text-white"><option value="active">Actif</option><option value="blocked">Bloqué</option></select></label><label className="block text-xs text-gray-400">Crédits<input value={draftCredits} onChange={(e) => setDraftCredits(e.target.value)} type="number" min="0" className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a1324] px-3 py-2 text-white" /></label><button onClick={saveUser} disabled={savingUser} className="w-full rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{savingUser ? 'Enregistrement…' : 'Enregistrer les changements'}</button></div>
          </aside>
          <div className="space-y-4">
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h2 className="font-black text-white">Historique personnel</h2><div className="mt-3 space-y-2">{selectedTransactions.length ? selectedTransactions.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map((t)=><div key={t.id} className="flex justify-between gap-3 rounded-xl border border-white/5 bg-black/10 p-3 text-xs"><div><p className="font-bold text-gray-200">{t.description}</p><p className="text-gray-600">{fmt(t.createdAt)}</p></div><span className={t.amount>=0?'text-emerald-300':'text-rose-300'}>{t.amount>=0?'+':''}{t.amount}</span></div>):<p className="text-xs text-gray-600">Aucune transaction enregistrée.</p>}</div></section>
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h2 className="font-black text-white">Bibliothèque</h2><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">{selectedGenerations.length ? selectedGenerations.map((g)=><div key={g.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/20"><div className="aspect-video bg-black/30">{g.type==='image'?<img src={g.thumbnailUrl||g.resultUrl} className="h-full w-full object-cover"/>:g.type==='video'?<video src={g.resultUrl} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center"><Music2 className="h-6 w-6 text-blue-300"/></div>}</div><div className="p-2"><p className="truncate text-[10px] font-bold text-white">{g.title}</p><p className="text-[9px] text-gray-600">{g.type} • {g.creditsUsed} cr</p></div></div>):<p className="col-span-full text-xs text-gray-600">Bibliothèque vide.</p>}</div></section>
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h2 className="font-black text-white">Communauté</h2><div className="mt-3 space-y-2">{selectedPosts.length ? selectedPosts.map((p)=><div key={p.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-xs"><p className="font-bold text-white">{p.title || p.caption || p.text || 'Publication'}</p><p className="mt-1 text-gray-600">{fmt(p.createdAt)}</p></div>):<p className="text-xs text-gray-600">Aucune publication communautaire pour cet utilisateur.</p>}</div></section>
          </div>
        </div></div>;
    }
    return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Utilisateurs" subtitle="Tous les comptes Firestore et leur activité." /><div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4"><Search className="h-4 w-4 text-gray-500"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Nom, e-mail, plan, statut…" className="w-full bg-transparent py-3 text-sm text-white outline-none"/></div><div className="space-y-2">{filteredUsers.map((u)=><button key={u.id} onClick={()=>setSelectedUserId(u.id)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:border-blue-500/30"><div><p className="font-bold text-white">{u.name || 'Utilisateur'}</p><p className="text-xs text-gray-500">{u.email}</p><p className="mt-1 text-[10px] text-gray-600">{u.plan?.toUpperCase()} • {u.credits || 0} crédits • {fmt(u.createdAt)}</p></div><UserRoundCog className="h-5 w-5 text-blue-300"/></button>)}</div></div>;
  }

  if (section === 'library') return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Bibliothèque utilisateurs" subtitle="Toutes les créations, filtrées par type." /><div className="mb-4 flex gap-2">{(['all','image','video','music'] as const).map((f)=><button key={f} onClick={()=>setMediaFilter(f)} className={`rounded-xl px-3 py-2 text-xs font-bold ${mediaFilter===f?'bg-purple-600 text-white':'border border-white/10 bg-white/[0.03] text-gray-400'}`}>{f==='all'?'Tout':f==='image'?'Images':f==='video'?'Vidéos':'Musique'}</button>)}</div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{library.map((g)=><div key={g.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"><div className="aspect-video bg-black/30">{g.type==='image'?<img src={g.thumbnailUrl||g.resultUrl} className="h-full w-full object-cover"/>:g.type==='video'?<video src={g.resultUrl} controls className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center"><Music2 className="h-7 w-7 text-blue-300"/></div>}</div><div className="p-3"><p className="truncate text-xs font-bold text-white">{g.title}</p><p className="mt-1 text-[10px] text-gray-600">{g.model} • {g.creditsUsed} cr</p></div></div>)}</div></div>;

  if (section === 'credits') return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Gestion des crédits" subtitle="Soldes actuels et historique des mouvements." /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{users.map((u)=><button key={u.id} onClick={()=>{setSelectedUserId(u.id);openSection('users')}} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"><p className="font-bold text-white">{u.name||u.email}</p><p className="mt-2 text-2xl font-black text-amber-300">{u.credits||0}</p><p className="text-[10px] text-gray-600">crédits disponibles</p></button>)}</div><div className="mt-6 space-y-2">{transactions.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map((t)=><div key={t.id} className="flex justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs"><div><p className="font-bold text-gray-200">{t.description}</p><p className="text-gray-600">{fmt(t.createdAt)}</p></div><span className={t.amount>=0?'text-emerald-300':'text-rose-300'}>{t.amount>=0?'+':''}{t.amount}</span></div>)}</div></div>;

  if (section === 'subscriptions') return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Gestion des abonnements" subtitle="Plans commerciaux et répartition actuelle des utilisateurs." /><div className="grid gap-3 md:grid-cols-3">{appSettings.subscriptionPlans.map((p)=><div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><p className="text-lg font-black text-white">{p.name}</p><p className="mt-2 text-2xl font-black text-purple-300">${p.priceMonth}<span className="text-xs text-gray-600">/mois</span></p><p className="mt-2 text-sm text-gray-400">{p.creditsMonthly} crédits / mois</p><p className="mt-4 text-xs text-gray-600">{users.filter((u)=>u.plan===p.id).length} utilisateur(s)</p></div>)}</div></div>;

  if (section === 'logs') return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Logs application" subtitle="Journal technique fourni par le serveur MUNGWELE." /><div className="space-y-2">{logs.length?logs.map((l:any)=><div key={l.id||`${l.timestamp}-${l.message}`} className="rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs"><div className="flex justify-between gap-3"><span className="font-bold text-white">{l.module||l.type||'Application'}</span><span className="text-gray-600">{fmt(l.timestamp)}</span></div><p className="mt-1 text-gray-400">{l.message}</p></div>):<p className="text-sm text-gray-600">Aucun log serveur disponible pour le moment.</p>}</div></div>;

  return <div className="mx-auto w-full max-w-6xl pb-16"><PageHeader title="Historique des utilisations" subtitle="Vue chronologique des créations, modèles et crédits consommés." /><div className="space-y-2">{generations.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map((g)=><div key={g.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs"><div><p className="font-bold text-white">{g.title}</p><p className="text-gray-500">{g.type} • {g.model} • utilisateur {g.userId}</p><p className="text-gray-600">{fmt(g.createdAt)}</p></div><span className="font-bold text-amber-300">{g.creditsUsed} cr</span></div>)}</div></div>;
};
