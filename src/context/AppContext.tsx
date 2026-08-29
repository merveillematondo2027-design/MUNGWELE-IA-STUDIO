import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import confetti from 'canvas-confetti';
import { db } from '../lib/firebase';
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

const EMPTY_USER: UserProfile = {
  id: '', name: 'Invité', email: '', avatar: '', role: 'user', status: 'active',
  credits: 0, plan: 'free', totalGenerations: 0, createdAt: '',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  siteName: 'MUNGWELE IA STUDIO',
  slogan: 'Imaginez. Générez. Créez sans limites.',
  maintenanceMode: false,
  announcementBanner: 'Bienvenue sur MUNGWELE IA STUDIO — Génération IA nouvelle génération !',
  annualDiscountPercent: 20,
  subscriptionPlans: [
    {
      id: 'free', name: 'Gratuit', priceMonth: 0, creditsMonthly: 0,
      maxDownloadResolution: 'standard',
      features: ['Génération avec crédits achetés', 'Aperçu vidéo standard', 'Téléchargement HD réservé aux abonnés'],
    },
    {
      id: 'creator', name: 'Creator', priceMonth: 10, creditsMonthly: 600, popular: true,
      maxDownloadResolution: '720p',
      features: ['600 crédits chaque mois', 'Téléchargement vidéo 720p', 'Accès Lite, Fast et Pro selon le solde'],
    },
    {
      id: 'pro', name: 'Pro', priceMonth: 25, creditsMonthly: 1600,
      maxDownloadResolution: '1080p',
      features: ['1 600 crédits chaque mois', 'Téléchargement vidéo jusqu’à 1080p', 'Priorité sur les fonctions premium'],
    },
  ],
  creditPacks: [
    { id: 'pack-200', name: 'Essentiel', credits: 200, priceUsd: 4, enabled: true },
    { id: 'pack-500', name: 'Créateur', credits: 500, priceUsd: 9, enabled: true },
    { id: 'pack-1200', name: 'Studio', credits: 1200, priceUsd: 20, enabled: true },
  ],
  creditCosts: { imageStandard: 5, imageHd: 8, video5s: 15, video10s: 25, musicTrack: 10, promptEnhance: 0 },
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
  updateGeneration: (id: string, updates: Partial<GenerationRecord>) => void;
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
    fetch('/api/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.settings) setAppSettings((prev) => ({ ...prev, ...data.settings, subscriptionPlans: prev.subscriptionPlans, creditPacks: prev.creditPacks }));
        if (data.providers) setProviders(data.providers);
      })
      .catch((err) => console.warn('Settings sync warning:', err));
  }, []);

  useEffect(() => {
    if (!user.id) return;
    const pricingRef = doc(db, 'appSettings', 'pricing');
    return onSnapshot(pricingRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as Partial<AppSettings>;
      setAppSettings((prev) => ({
        ...prev,
        ...data,
        subscriptionPlans: Array.isArray(data.subscriptionPlans) ? data.subscriptionPlans : prev.subscriptionPlans,
        creditPacks: Array.isArray(data.creditPacks) ? data.creditPacks : prev.creditPacks,
      }));
    }, (error) => console.warn('Firestore pricing sync warning:', error));
  }, [user.id]);

  useEffect(() => {
    if (!user.id) { setGenerations([]); return; }
    fetch('/api/generations')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (Array.isArray(data?.generations)) setGenerations(data.generations.filter((gen: GenerationRecord) => gen.userId === user.id));
      })
      .catch((err) => console.warn('Generation sync warning:', err));
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

  const useCredits = (amount: number, reason: string) => {
    if (!user.id) { addNotification('warning', 'Connexion requise', 'Connectez-vous avant de lancer une génération IA.'); setAuthMode('login'); setIsAuthModalOpen(true); return false; }
    if (user.credits < amount) { addNotification('error', 'Crédits insuffisants', `Cette opération nécessite ${amount} crédits. Solde : ${user.credits}.`); return false; }
    const balance = user.credits - amount;
    setUser((prev) => ({ ...prev, credits: balance, totalGenerations: prev.totalGenerations + 1 }));
    setTransactions((prev) => [{ id: `tx-${Date.now()}`, userId: user.id, amount: -amount, type: 'generation', description: reason, balanceAfter: balance, createdAt: new Date().toISOString() }, ...prev]);
    return true;
  };

  const refundCredits = (amount: number, reason: string) => {
    if (!user.id) return;
    const balance = user.credits + amount;
    setUser((prev) => ({ ...prev, credits: balance }));
    setTransactions((prev) => [{ id: `tx-ref-${Date.now()}`, userId: user.id, amount, type: 'refund', description: `Remboursement automatique : ${reason}`, balanceAfter: balance, createdAt: new Date().toISOString() }, ...prev]);
    addNotification('info', 'Crédits remboursés', `${amount} crédits ont été restitués.`);
  };

  const addCredits = (amount: number, reason: string) => {
    if (!user.id) return;
    const balance = user.credits + amount;
    setUser((prev) => ({ ...prev, credits: balance }));
    setTransactions((prev) => [{ id: `tx-add-${Date.now()}`, userId: user.id, amount, type: 'purchase', description: reason, balanceAfter: balance, createdAt: new Date().toISOString() }, ...prev]);
  };

  const addGeneration = (gen: GenerationRecord) => setGenerations((prev) => [gen, ...prev]);
  const removeGeneration = async (id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    try { await fetch(`/api/generations/${id}`, { method: 'DELETE' }); } catch {}
  };
  const updateGeneration = (id: string, updates: Partial<GenerationRecord>) => setGenerations((prev) => prev.map((g) => g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g));
  const updateAppSettings = (newSettings: Partial<AppSettings>) => setAppSettings((prev) => ({ ...prev, ...newSettings }));

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
