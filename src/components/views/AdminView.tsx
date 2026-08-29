import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Activity,
  Bell,
  ChevronRight,
  Coins,
  Layers,
  Power,
  RefreshCw,
  Save,
  Search,
  Server,
  ShieldAlert,
  UserRoundCog,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import type { CreditPackConfig, PlanConfig, UserPlan, UserProfile } from '../../types';

type FirestoreUser = UserProfile & {
  uid?: string;
  updatedAt?: string;
  welcomeBonusGranted?: boolean;
};

type ClientDraft = {
  credits: string;
  plan: UserPlan;
  status: 'active' | 'blocked';
};

const safeNumber = (value: string | number, fallback = 0) => {
  const parsed = typeof value === 'number' ? value : Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatDate = (value?: string) => {
  if (!value) return 'Date non disponible';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non disponible' : date.toLocaleDateString('fr-FR');
};

const NumericField: React.FC<{
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}> = ({ label, value, onCommit, min = 0, max, step = 1, className = '' }) => {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    let next = safeNumber(draft, min);
    next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    onCommit(next);
    setDraft(String(next));
  };

  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] text-gray-400">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="mt-1 w-full px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-white outline-none focus:border-purple-500"
      />
    </label>
  );
};

export const AdminView: React.FC = () => {
  const { providers, toggleProvider, appSettings, updateAppSettings, addNotification } = useApp();
  const [serverStats, setServerStats] = useState<any>(null);
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [usersReady, setUsersReady] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<FirestoreUser | null>(null);
  const [clientDraft, setClientDraft] = useState<ClientDraft>({ credits: '0', plan: 'free', status: 'active' });
  const [savingClient, setSavingClient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [announcementText, setAnnouncementText] = useState(appSettings.announcementBanner || '');
  const [maintenance, setMaintenance] = useState(appSettings.maintenanceMode || false);
  const [annualDiscount, setAnnualDiscount] = useState(appSettings.annualDiscountPercent || 20);
  const [plans, setPlans] = useState<PlanConfig[]>(appSettings.subscriptionPlans);
  const [packs, setPacks] = useState<CreditPackConfig[]>(appSettings.creditPacks);

  const usersSectionRef = useRef<HTMLDivElement | null>(null);
  const pricingSectionRef = useRef<HTMLElement | null>(null);
  const providersSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setPlans(appSettings.subscriptionPlans);
    setPacks(appSettings.creditPacks);
    setAnnualDiscount(appSettings.annualDiscountPercent);
  }, [appSettings.subscriptionPlans, appSettings.creditPacks, appSettings.annualDiscountPercent]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const nextUsers = snapshot.docs
          .map((item) => ({ id: item.id, uid: item.id, ...(item.data() as Omit<FirestoreUser, 'id'>) }))
          .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email), 'fr'));
        setUsers(nextUsers);
        setUsersReady(true);
      },
      (error) => {
        console.error('[ADMIN_USERS_REALTIME_ERROR]', error);
        setUsersReady(true);
        addNotification('error', 'Utilisateurs indisponibles', 'Firestore refuse ou interrompt la lecture temps réel des utilisateurs.');
      },
    );

    return unsubscribe;
  }, [addNotification]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Stats indisponibles');
      setServerStats(await res.json());
    } catch {
      setServerStats(null);
      addNotification('warning', 'Statistiques serveur', 'Les données Firebase restent en temps réel, mais les statistiques serveur sont momentanément indisponibles.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const totalGenerationsFromUsers = useMemo(
    () => users.reduce((sum, user) => sum + Math.max(0, Number(user.totalGenerations || 0)), 0),
    [users],
  );

  const totalGenerations = Math.max(Number(serverStats?.totalGenerations || 0), totalGenerationsFromUsers);
  const totalCreditsConsumed = Number(serverStats?.totalCreditsConsumed || 0);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => [user.name, user.email, user.plan, user.status, user.role]
      .some((value) => String(value || '').toLowerCase().includes(term)));
  }, [users, userSearch]);

  const updatePlan = (id: PlanConfig['id'], patch: Partial<PlanConfig>) => {
    setPlans((prev) => prev.map((plan) => plan.id === id ? { ...plan, ...patch } : plan));
  };

  const updatePack = (id: string, patch: Partial<CreditPackConfig>) => {
    setPacks((prev) => prev.map((pack) => pack.id === id ? { ...pack, ...patch } : pack));
  };

  const savePricing = async () => {
    setSavingPricing(true);
    try {
      const normalizedAnnualDiscount = Math.max(0, Math.min(80, Number(annualDiscount) || 0));
      const normalizedPlans = plans.map((plan) => ({
        ...plan,
        priceMonth: Math.max(0, Number(plan.priceMonth) || 0),
        creditsMonthly: Math.max(0, Math.round(Number(plan.creditsMonthly) || 0)),
      }));
      const normalizedPacks = packs.map((pack) => ({
        ...pack,
        priceUsd: Math.max(0, Number(pack.priceUsd) || 0),
        credits: Math.max(1, Math.round(Number(pack.credits) || 1)),
      }));

      await setDoc(doc(db, 'appSettings', 'pricing'), {
        annualDiscountPercent: normalizedAnnualDiscount,
        subscriptionPlans: normalizedPlans,
        creditPacks: normalizedPacks,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setAnnualDiscount(normalizedAnnualDiscount);
      setPlans(normalizedPlans);
      setPacks(normalizedPacks);
      updateAppSettings({
        annualDiscountPercent: normalizedAnnualDiscount,
        subscriptionPlans: normalizedPlans,
        creditPacks: normalizedPacks,
      });
      addNotification('success', 'Tarification enregistrée', 'Les abonnements et packs sont maintenant mis à jour pour tous les utilisateurs.');
    } catch (error: any) {
      addNotification('error', 'Enregistrement refusé', error?.message || 'Vérifiez les règles Firestore et votre session administrateur.');
    } finally {
      setSavingPricing(false);
    }
  };

  const saveGeneral = async () => {
    updateAppSettings({ announcementBanner: announcementText, maintenanceMode: maintenance });
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementBanner: announcementText, maintenanceMode: maintenance }),
      });
      addNotification('success', 'Paramètres enregistrés', 'Configuration générale mise à jour.');
    } catch {
      addNotification('error', 'Erreur', 'Impossible d’enregistrer la configuration générale.');
    }
  };

  const openClient = (user: FirestoreUser) => {
    setSelectedUser(user);
    setClientDraft({
      credits: String(Math.max(0, Number(user.credits || 0))),
      plan: user.plan || 'free',
      status: user.status || 'active',
    });
  };

  const saveClient = async () => {
    if (!selectedUser || savingClient) return;
    setSavingClient(true);
    try {
      const credits = Math.max(0, Math.round(safeNumber(clientDraft.credits, 0)));
      const beforeCredits = Math.max(0, Number(selectedUser.credits || 0));
      const targetId = selectedUser.uid || selectedUser.id;

      await updateDoc(doc(db, 'users', targetId), {
        credits,
        plan: clientDraft.plan,
        status: clientDraft.status,
        updatedAt: new Date().toISOString(),
      });

      if (credits !== beforeCredits) {
        await addDoc(collection(db, 'creditTransactions'), {
          userId: targetId,
          amount: credits - beforeCredits,
          type: 'admin_adjustment',
          description: `Ajustement administrateur : ${beforeCredits} → ${credits} crédits`,
          balanceAfter: credits,
          createdAt: new Date().toISOString(),
        });
      }

      addNotification('success', 'Client mis à jour', `${selectedUser.name || selectedUser.email} est maintenant synchronisé avec Firestore.`);
      setSelectedUser(null);
    } catch (error: any) {
      addNotification('error', 'Modification refusée', error?.message || 'Impossible de modifier ce client.');
    } finally {
      setSavingClient(false);
    }
  };

  const addClientCredits = (amount: number) => {
    setClientDraft((prev) => ({ ...prev, credits: String(Math.max(0, Math.round(safeNumber(prev.credits, 0) + amount))) }));
  };

  const scrollTo = (ref: React.RefObject<HTMLElement | HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />Administration générale
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">Supervision MUNGWELE IA</h2>
          <p className="text-xs text-gray-400 mt-1">Clients, tarification, abonnements, crédits et fournisseurs en temps réel.</p>
        </div>
        <button
          onClick={() => void fetchStats()}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] border border-white/10 text-white flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />Actualiser le serveur
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => scrollTo(usersSectionRef)} className="text-left p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/50 active:scale-[0.99] transition">
          <div className="flex justify-between text-xs text-gray-400"><span>Utilisateurs</span><Users className="w-4 h-4" /></div>
          <div className="text-2xl font-bold text-white mt-2">{usersReady ? users.length : '…'}</div>
          <div className="text-[10px] text-purple-300 mt-2">Gérer les clients <ChevronRight className="w-3 h-3 inline" /></div>
        </button>
        <button onClick={() => scrollTo(usersSectionRef)} className="text-left p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-purple-500/50 active:scale-[0.99] transition">
          <div className="flex justify-between text-xs text-gray-400"><span>Générations</span><Layers className="w-4 h-4" /></div>
          <div className="text-2xl font-bold text-white mt-2">{totalGenerations}</div>
          <div className="text-[10px] text-gray-500 mt-2">Voir l'activité par client</div>
        </button>
        <button onClick={() => void fetchStats()} className="text-left p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 active:scale-[0.99] transition">
          <div className="flex justify-between text-xs text-gray-400"><span>Serveur</span><Server className="w-4 h-4" /></div>
          <div className="text-2xl font-bold text-white mt-2">{serverStats ? 'OK' : isLoading ? '…' : 'À vérifier'}</div>
          <div className="text-[10px] text-gray-500 mt-2">Tester maintenant</div>
        </button>
        <button onClick={() => scrollTo(pricingSectionRef)} className="text-left p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-amber-500/40 active:scale-[0.99] transition">
          <div className="flex justify-between text-xs text-gray-400"><span>Crédits consommés</span><Zap className="w-4 h-4" /></div>
          <div className="text-2xl font-bold text-white mt-2">{totalCreditsConsumed}</div>
          <div className="text-[10px] text-gray-500 mt-2">Configurer les crédits</div>
        </button>
      </div>

      <div ref={usersSectionRef} className="scroll-mt-20 p-5 sm:p-6 rounded-3xl bg-white/[0.03] border border-blue-500/20 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><UserRoundCog className="w-5 h-5 text-blue-300" />Clients & utilisateurs</h3>
            <p className="text-xs text-gray-400 mt-1">Lecture Firestore en temps réel. Cliquez sur un client pour gérer son compte.</p>
          </div>
          <div className="relative sm:w-80">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Nom, e-mail, plan, statut..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/20 border border-white/10 text-white text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-black/15 border border-white/10 p-3"><div className="text-[10px] text-gray-500">Total</div><div className="text-xl font-black text-white">{users.length}</div></div>
          <div className="rounded-2xl bg-black/15 border border-white/10 p-3"><div className="text-[10px] text-gray-500">Actifs</div><div className="text-xl font-black text-emerald-300">{users.filter((u) => u.status !== 'blocked').length}</div></div>
          <div className="rounded-2xl bg-black/15 border border-white/10 p-3"><div className="text-[10px] text-gray-500">Bloqués</div><div className="text-xl font-black text-rose-300">{users.filter((u) => u.status === 'blocked').length}</div></div>
          <div className="rounded-2xl bg-black/15 border border-white/10 p-3"><div className="text-[10px] text-gray-500">Crédits détenus</div><div className="text-xl font-black text-purple-300">{users.reduce((sum, u) => sum + Math.max(0, Number(u.credits || 0)), 0)}</div></div>
        </div>

        <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
          {!usersReady && <div className="p-8 text-center text-sm text-gray-500">Connexion à Firestore…</div>}
          {usersReady && filteredUsers.map((user) => (
            <button
              key={user.uid || user.id}
              onClick={() => openClient(user)}
              className="w-full text-left p-4 rounded-2xl bg-black/15 border border-white/10 hover:border-blue-500/40 transition flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/40 to-purple-600/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {user.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <Users className="w-5 h-5 text-blue-200" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white text-sm truncate">{user.name || 'Utilisateur'}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full ${user.status === 'blocked' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{user.status === 'blocked' ? 'Bloqué' : 'Actif'}</span>
                </div>
                <div className="text-[11px] text-gray-400 truncate">{user.email}</div>
                <div className="text-[10px] text-gray-500 mt-1">{user.plan?.toUpperCase()} · {Number(user.credits || 0)} crédits · {Number(user.totalGenerations || 0)} générations · {formatDate(user.createdAt)}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
            </button>
          ))}
          {usersReady && filteredUsers.length === 0 && <div className="p-8 text-center text-sm text-gray-500">Aucun utilisateur correspondant.</div>}
        </div>
      </div>

      <section ref={pricingSectionRef} className="scroll-mt-20 p-6 rounded-3xl bg-white/[0.03] border border-purple-500/20 space-y-5">
        <div><h3 className="text-lg font-bold text-white">Abonnements & crédits</h3><p className="text-xs text-gray-400 mt-1">Ces valeurs sont enregistrées dans Firestore et deviennent la source officielle de la page Abonnements.</p></div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div><span className="text-sm font-bold text-white">{plan.name}</span><span className="text-[10px] text-purple-300 block uppercase">{plan.id}</span></div>
              <NumericField label="Prix mensuel ($)" value={plan.priceMonth} step={0.5} onCommit={(value) => updatePlan(plan.id, { priceMonth: value })} />
              <NumericField label="Crédits / mois" value={plan.creditsMonthly} onCommit={(value) => updatePlan(plan.id, { creditsMonthly: Math.round(value) })} />
              <label className="block text-[11px] text-gray-400">Téléchargement maximum
                <select value={plan.maxDownloadResolution} onChange={(e) => updatePlan(plan.id, { maxDownloadResolution: e.target.value as any })} className="mt-1 w-full px-3 py-2 rounded-xl bg-[#081226] border border-white/10 text-white">
                  <option value="standard">Standard</option><option value="720p">720p</option><option value="1080p">1080p</option>
                </select>
              </label>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {packs.map((pack) => (
            <div key={pack.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <input value={pack.name} onChange={(e) => updatePack(pack.id, { name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-black/20 border border-white/10 text-sm font-bold text-white" />
              <div className="grid grid-cols-2 gap-2">
                <NumericField label="Crédits" min={1} value={pack.credits} onCommit={(value) => updatePack(pack.id, { credits: Math.max(1, Math.round(value)) })} />
                <NumericField label="Prix ($)" value={pack.priceUsd} step={0.5} onCommit={(value) => updatePack(pack.id, { priceUsd: value })} />
              </div>
              <label className="flex items-center justify-between text-xs text-gray-300">Actif<input type="checkbox" checked={pack.enabled} onChange={(e) => updatePack(pack.id, { enabled: e.target.checked })} /></label>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div className="w-40"><NumericField label="Remise annuelle (%)" value={annualDiscount} max={80} onCommit={(value) => setAnnualDiscount(value)} /></div>
          <button onClick={savePricing} disabled={savingPricing} className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" />{savingPricing ? 'Enregistrement...' : 'Enregistrer tarifs & abonnements'}</button>
        </div>
      </section>

      <section ref={providersSectionRef} className="scroll-mt-20 p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2"><Activity className="w-4 h-4" />Fournisseurs IA</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {providers.map((provider) => (
            <div key={provider.id} className="p-4 rounded-2xl border border-white/10 flex justify-between items-center gap-3">
              <button onClick={() => addNotification('info', provider.name, `${provider.modelName} · ${provider.isConfigured ? 'Configuré' : 'Non configuré'} · ${provider.enabled ? 'Actif' : 'Désactivé'}`)} className="text-left min-w-0 flex-1">
                <p className="text-sm font-bold text-white">{provider.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{provider.modelName} • {provider.isConfigured ? 'Configuré' : 'Non configuré'}</p>
              </button>
              <button onClick={() => toggleProvider(provider.id, !provider.enabled)} className={`p-2 rounded-xl ${provider.enabled ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400'}`} title={provider.enabled ? 'Désactiver' : 'Activer'}><Power className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2"><Bell className="w-4 h-4" />Annonce globale</h3>
        <input value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white" />
        <label className="flex justify-between text-xs text-gray-300">Mode maintenance<input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} /></label>
        <div className="flex justify-end"><button onClick={saveGeneral} className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold">Enregistrer</button></div>
      </section>

      {selectedUser && (
        <div className="fixed inset-0 z-[120] bg-[#020617]/85 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center" onMouseDown={(e) => { if (e.currentTarget === e.target) setSelectedUser(null); }}>
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-[#0a1023] border border-white/10 shadow-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-purple-300">Dossier client</div>
                <h3 className="text-xl font-black text-white mt-1">{selectedUser.name || 'Utilisateur'}</h3>
                <p className="text-xs text-gray-400 break-all">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3"><div className="text-[10px] text-gray-500">Inscription</div><div className="text-xs font-bold text-white mt-1">{formatDate(selectedUser.createdAt)}</div></div>
              <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3"><div className="text-[10px] text-gray-500">Générations</div><div className="text-lg font-black text-white mt-1">{Number(selectedUser.totalGenerations || 0)}</div></div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white"><Coins className="w-4 h-4 text-purple-300" />Solde crédits</div>
              <input
                type="number"
                min="0"
                value={clientDraft.credits}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setClientDraft((prev) => ({ ...prev, credits: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white text-lg font-black outline-none focus:border-purple-500"
              />
              <div className="grid grid-cols-4 gap-2">
                {[-10, 10, 50, 100].map((amount) => <button key={amount} onClick={() => addClientCredits(amount)} className="py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white">{amount > 0 ? '+' : ''}{amount}</button>)}
              </div>
            </div>

            <label className="block text-xs text-gray-400">Abonnement
              <select value={clientDraft.plan} onChange={(e) => setClientDraft((prev) => ({ ...prev, plan: e.target.value as UserPlan }))} className="mt-1 w-full px-4 py-3 rounded-xl bg-[#11182d] border border-white/10 text-white">
                <option value="free">Gratuit</option><option value="creator">Creator</option><option value="pro">Pro</option>
              </select>
            </label>

            <label className="block text-xs text-gray-400">État du compte
              <select value={clientDraft.status} onChange={(e) => setClientDraft((prev) => ({ ...prev, status: e.target.value as 'active' | 'blocked' }))} className="mt-1 w-full px-4 py-3 rounded-xl bg-[#11182d] border border-white/10 text-white">
                <option value="active">Actif</option><option value="blocked">Bloqué</option>
              </select>
            </label>

            <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3 text-[10px] text-gray-500 break-all">
              UID : {selectedUser.uid || selectedUser.id}
            </div>

            <button onClick={() => void saveClient()} disabled={savingClient} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60">
              <Save className="w-4 h-4" />{savingClient ? 'Enregistrement…' : 'Enregistrer le client'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
