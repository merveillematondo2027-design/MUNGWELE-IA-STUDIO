import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import confetti from 'canvas-confetti';
import { db, storage } from '../lib/firebase';
import {
  StudioType,
  NavigationTab,
  UserProfile,
  GenerationRecord,
  NotificationItem,
  CreditTransaction,
  AppSettings,
  ApiProviderSetting,
} from '../types';
import {
  ANNUAL_DISCOUNT_PERCENT,
  LAUNCH_CREDIT_PACKS,
  LAUNCH_LEGACY_CREDIT_COSTS,
  LAUNCH_SUBSCRIPTION_PLANS,
  PRICING_VERSION,
} from '../config/commercialPricing';

const EMPTY_USER: UserProfile = {
  id: '', name: 'Invité', email: '', avatar: '', role: 'user', status: 'active',
  credits: 0, plan: 'free', totalGenerations: 0, createdAt: '',
};

const launchPlans: AppSettings['subscriptionPlans'] = LAUNCH_SUBSCRIPTION_PLANS.map((plan) => ({
  ...plan,
  features: [...plan.features],
}));
const launchPacks: AppSettings['creditPacks'] = LAUNCH_CREDIT_PACKS.map((pack) => ({ ...pack }));

export const DEFAULT_APP_SETTINGS: AppSettings = {
  pricingVersion: PRICING_VERSION,
  siteName: 'MUNGWELE IA STUDIO',
  slogan: 'Imaginez. Générez. Créez sans limites.',
  maintenanceMode: false,
  announcementBanner: 'Bienvenue sur MUNGWELE IA STUDIO — Génération IA nouvelle génération !',
  annualDiscountPercent: ANNUAL_DISCOUNT_PERCENT,
  subscriptionPlans: launchPlans,
  creditPacks: launchPacks,
  creditCosts: { ...LAUNCH_LEGACY_CREDIT_COSTS },
};

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  resetUser: () => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeStudio: StudioType;
  setActiveStudio: (studio: StudioType) => void;
  generations: GenerationRecord[];
  addGeneration: (gen: GenerationRecord) => void;
  removeGeneration: (id: string) => void;
  updateGeneration: (id: string, updates: Partial<GenerationRecord>) => Promise<void>;
  credits: number;
  useCredits: (amount: number, reason: string) => boolean;
  refundCredits: (amount: number, reason: string) => void;
  addCredits: (amount: number, reason: string) => void;
  transactions: CreditTransaction[];
  notifications: NotificationItem[];
  addNotification: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  dismissNotification: (id: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  toggleTheme: () => void;
  activeMediaModal: GenerationRecord | null;
  setActiveMediaModal: (media: GenerationRecord | null) => void;
  imageToVideoTransfer: string | null;
  setImageToVideoTransfer: (url: string | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (val: boolean) => void;
  authMode: 'login' | 'register' | 'forgot';
  setAuthMode: (mode: 'login' | 'register' | 'forgot') => void;
  appSettings: AppSettings;
  updateAppSettings: (newSettings: Partial<AppSettings>) => void;
  providers: ApiProviderSetting[];
  toggleProvider: (id: string, enabled: boolean) => void;
  triggerCelebration: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function extensionFor(type: StudioType, mime = '') {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  return type === 'image' ? 'png' : type === 'music' ? 'mp3' : 'mp4';
}

async function persistOutput(userId: string, gen: GenerationRecord) {
  if (!gen.resultUrl) return gen;
  if (gen.resultUrl.includes('firebasestorage.googleapis.com')) return gen;
  try {
    const response = await fetch(gen.resultUrl);
    if (!response.ok) return gen;
    const blob = await response.blob();
    const ext = extensionFor(gen.type, blob.type);
    const target = storageRef(storage, `users/${userId}/generations/${gen.id}/result.${ext}`);
    await uploadBytes(target, blob, { contentType: blob.type || undefined });
    const url = await getDownloadURL(target);
    return { ...gen, resultUrl: url, thumbnailUrl: gen.type === 'image' ? url : gen.thumbnailUrl };
  } catch (error) {
    console.warn('Media persistence warning:', error);
    return gen;
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(EMPTY_USER);
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [activeStudio, setActiveStudio] = useState<StudioType>('image');
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeMediaModal, setActiveMediaModal] = useState<GenerationRecord | null>(null);
  const [imageToVideoTransfer, setImageToVideoTransfer] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [providers, setProviders] = useState<ApiProviderSetting[]>([]);

  const resetUser = () => { setUser(EMPTY_USER); setTransactions([]); setGenerations([]); };

  useEffect(() => {
    fetch('/api/settings').then((r) => r.ok ? r.json() : null).then((data) => {
      if (!data) return;
      if (data.settings) {
        const incoming = data.settings as Partial<AppSettings>;
        const pricingMatches = Number(incoming.pricingVersion) === PRICING_VERSION;
        setAppSettings((prev) => ({
          ...prev,
          ...incoming,
          pricingVersion: PRICING_VERSION,
          annualDiscountPercent: pricingMatches && Number.isFinite(Number(incoming.annualDiscountPercent)) ? Number(incoming.annualDiscountPercent) : prev.annualDiscountPercent,
          subscriptionPlans: pricingMatches && Array.isArray(incoming.subscriptionPlans) ? incoming.subscriptionPlans : prev.subscriptionPlans,
          creditPacks: pricingMatches && Array.isArray(incoming.creditPacks) ? incoming.creditPacks : prev.creditPacks,
          creditCosts: pricingMatches && incoming.creditCosts ? incoming.creditCosts : prev.creditCosts,
        }));
      }
      if (data.providers) setProviders(data.providers);
    }).catch((err) => console.warn('Settings sync warning:', err));
  }, []);

  useEffect(() => {
    if (!user.id) return;
    const pricingRef = doc(db, 'appSettings', 'pricing');
    return onSnapshot(pricingRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as Partial<AppSettings>;
      if (Number(data.pricingVersion) !== PRICING_VERSION) {
        console.warn(`[MUNGWELE_PRICING_VERSION] Firestore pricing ignored: expected ${PRICING_VERSION}, received ${String(data.pricingVersion || 'legacy')}.`);
        return;
      }
      setAppSettings((prev) => ({
        ...prev,
        ...data,
        pricingVersion: PRICING_VERSION,
        subscriptionPlans: Array.isArray(data.subscriptionPlans) ? data.subscriptionPlans : prev.subscriptionPlans,
        creditPacks: Array.isArray(data.creditPacks) ? data.creditPacks : prev.creditPacks,
      }));
    }, (error) => console.warn('Firestore pricing sync warning:', error));
  }, [user.id]);

  // La bibliothèque utilisateur vient désormais de Firestore, plus de la mémoire du serveur.
  useEffect(() => {
    if (!user.id) { setGenerations([]); return; }
    const q = query(collection(db, 'generations'), where('userId', '==', user.id));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GenerationRecord, 'id'>) }));
      rows.sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
      setGenerations(rows);
    }, (error) => console.warn('Generation Firestore sync warning:', error));
  }, [user.id]);

  useEffect(() => {
    if (!user.id) { setTransactions([]); return; }
    const q = query(collection(db, 'creditTransactions'), where('userId', '==', user.id));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CreditTransaction, 'id'>) }));
      rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      setTransactions(rows);
    }, (error) => console.warn('Credit transaction sync warning:', error));
  }, [user.id]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const dismissNotification = (id: string) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const addNotification = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const item: NotificationItem = { id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, title, message, timestamp: new Date().toISOString() };
    setNotifications((prev) => [item, ...prev]);
    window.setTimeout(() => dismissNotification(item.id), 5000);
  };

  // Réservation locale uniquement. Le vrai débit Firestore est confirmé après succès.
  const useCredits = (amount: number, reason: string) => {
    if (!user.id) { addNotification('warning', 'Connexion requise', 'Connectez-vous avant de lancer une génération IA.'); setAuthMode('login'); setIsAuthModalOpen(true); return false; }
    if (user.credits < amount) { addNotification('error', 'Crédits insuffisants', `Cette opération nécessite ${amount} crédits. Solde : ${user.credits}.`); return false; }
    setUser((prev) => ({ ...prev, credits: Math.max(0, prev.credits - amount) }));
    return true;
  };

  // Comme le débit n'est confirmé qu'après succès, un échec rend simplement la réservation locale.
  const refundCredits = (amount: number, reason: string) => {
    if (!user.id) return;
    setUser((prev) => ({ ...prev, credits: prev.credits + amount }));
    addNotification('info', 'Crédits libérés', `${amount} crédits réservés ont été restitués.`);
  };

  const addCredits = (amount: number, reason: string) => {
    if (!user.id) return;
    setUser((prev) => ({ ...prev, credits: prev.credits + amount }));
  };

  const addGeneration = (gen: GenerationRecord) => {
    setGenerations((prev) => [gen, ...prev.filter((g) => g.id !== gen.id)]);
    void (async () => {
      if (!user.id) return;
      try {
        const persisted = await persistOutput(user.id, { ...gen, userId: user.id });
        const userRef = doc(db, 'users', user.id);
        const generationRef = doc(db, 'generations', persisted.id);
        const txRef = doc(db, 'creditTransactions', `tx-${persisted.id}`);
        let newBalance = 0;
        let newTotal = 0;

        await runTransaction(db, async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error('Profil utilisateur introuvable.');
          const data = userSnap.data();
          const currentCredits = Math.max(0, Number(data.credits || 0));
          const cost = Math.max(0, Number(persisted.creditsUsed || 0));
          if (currentCredits < cost) throw new Error('Solde Firestore insuffisant pour confirmer cette génération.');
          newBalance = currentCredits - cost;
          newTotal = Math.max(0, Number(data.totalGenerations || 0)) + 1;
          transaction.update(userRef, { credits: newBalance, totalGenerations: newTotal, updatedAt: new Date().toISOString() });
          transaction.set(generationRef, { ...persisted, userId: user.id, updatedAt: new Date().toISOString() });
          transaction.set(txRef, { userId: user.id, amount: -cost, type: 'generation', description: `${persisted.type} — ${persisted.title || persisted.model}`, balanceAfter: newBalance, createdAt: new Date().toISOString() });
        });

        setUser((prev) => ({ ...prev, credits: newBalance, totalGenerations: newTotal }));
        setGenerations((prev) => prev.map((g) => g.id === persisted.id ? persisted : g));
      } catch (error: any) {
        console.error('Generation persistence error:', error);
        addNotification('error', 'Synchronisation incomplète', error?.message || 'La création a été générée mais sa sauvegarde Firebase a échoué.');
      }
    })();
  };

  const removeGeneration = async (id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    try { await deleteDoc(doc(db, 'generations', id)); } catch {}
    try { await deleteDoc(doc(db, 'communityPosts', id)); } catch {}
    try { await fetch(`/api/generations/${id}`, { method: 'DELETE' }); } catch {}
  };

  const updateGeneration = async (id: string, updates: Partial<GenerationRecord>) => {
    const updatedAt = new Date().toISOString();
    const current = generations.find((g) => g.id === id);
    setGenerations((prev) => prev.map((g) => g.id === id ? { ...g, ...updates, updatedAt } : g));
    if (!current || !user.id) return;
    const next = { ...current, ...updates, updatedAt, userId: user.id };
    await setDoc(doc(db, 'generations', id), next, { merge: true });
    if (next.isPublic) {
      await setDoc(doc(db, 'communityPosts', id), {
        id,
        userId: user.id,
        authorId: user.id,
        authorName: user.name || 'Créateur MUNGWELE',
        title: next.title,
        caption: next.prompt,
        type: next.type,
        mediaUrl: next.resultUrl,
        thumbnailUrl: next.thumbnailUrl,
        generationId: id,
        createdAt: next.publicAt || updatedAt,
      }, { merge: true });
    } else {
      await deleteDoc(doc(db, 'communityPosts', id)).catch(() => undefined);
    }
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => setAppSettings((prev) => ({ ...prev, ...newSettings, pricingVersion: PRICING_VERSION }));
  const toggleProvider = async (id: string, enabled: boolean) => {
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, enabled } : p));
    try { await fetch('/api/admin/providers/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId: id, enabled }) }); } catch {}
  };

  const triggerCelebration = () => confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#7C3AED', '#2563EB', '#EC4899', '#38BDF8'] });

  return <AppContext.Provider value={{
    user, setUser, resetUser, activeTab, setActiveTab, activeStudio, setActiveStudio,
    generations, addGeneration, removeGeneration, updateGeneration, credits: user.credits,
    useCredits, refundCredits, addCredits, transactions, notifications, addNotification, dismissNotification,
    isDarkMode, setIsDarkMode, toggleTheme: () => setIsDarkMode((p) => !p), activeMediaModal, setActiveMediaModal,
    imageToVideoTransfer, setImageToVideoTransfer, isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode,
    appSettings, updateAppSettings, providers, toggleProvider, triggerCelebration,
  }}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
