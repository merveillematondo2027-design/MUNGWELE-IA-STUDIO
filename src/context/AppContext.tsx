import React, { createContext, useContext, useState, useEffect } from 'react';
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
import confetti from 'canvas-confetti';

const EMPTY_USER: UserProfile = {
  id: '',
  name: 'Invité',
  email: '',
  avatar: '',
  role: 'user',
  status: 'active',
  credits: 0,
  plan: 'free',
  totalGenerations: 0,
  createdAt: '',
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

const defaultAppSettings: AppSettings = {
  siteName: 'MUNGWELE IA STUDIO',
  slogan: 'Imaginez. Générez. Créez sans limites.',
  maintenanceMode: false,
  announcementBanner: 'Bienvenue sur MUNGWELE IA STUDIO — Génération IA nouvelle génération !',
  creditCosts: {
    imageStandard: 5,
    imageHd: 8,
    video5s: 15,
    video10s: 25,
    musicTrack: 10,
    promptEnhance: 0,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(EMPTY_USER);
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [activeStudio, setActiveStudio] = useState<StudioType>('image');
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeMediaModal, setActiveMediaModal] = useState<GenerationRecord | null>(null);
  const [imageToVideoTransfer, setImageToVideoTransfer] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [providers, setProviders] = useState<ApiProviderSetting[]>([]);

  const resetUser = () => {
    setUser(EMPTY_USER);
    setTransactions([]);
    setGenerations([]);
  };

  useEffect(() => {
    const loadServerSettings = async () => {
      try {
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.settings) setAppSettings(sData.settings);
          if (sData.providers) setProviders(sData.providers);
        }
      } catch (err) {
        console.warn('Settings sync warning:', err);
      }
    };

    loadServerSettings();
  }, []);

  useEffect(() => {
    if (!user.id) {
      setGenerations([]);
      return;
    }

    const loadUserGenerations = async () => {
      try {
        const genRes = await fetch('/api/generations');
        if (genRes.ok) {
          const genData = await genRes.json();
          if (Array.isArray(genData.generations)) {
            setGenerations(genData.generations.filter((gen: GenerationRecord) => gen.userId === user.id));
          }
        }
      } catch (err) {
        console.warn('Generation sync warning:', err);
      }
    };

    loadUserGenerations();
  }, [user.id]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const addNotification = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string,
  ) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setTimeout(() => dismissNotification(newNotif.id), 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const useCredits = (amount: number, reason: string): boolean => {
    if (!user.id) {
      addNotification('warning', 'Connexion requise', 'Connectez-vous avant de lancer une génération IA.');
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return false;
    }

    if (user.credits < amount) {
      addNotification(
        'error',
        'Crédits insuffisants',
        `Cette opération nécessite ${amount} crédits. Votre solde actuel est de ${user.credits} crédits.`,
      );
      return false;
    }

    const newBalance = user.credits - amount;
    setUser((prev) => ({ ...prev, credits: newBalance, totalGenerations: prev.totalGenerations + 1 }));

    const tx: CreditTransaction = {
      id: `tx-${Date.now()}`,
      userId: user.id,
      amount: -amount,
      type: 'generation',
      description: reason,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);
    return true;
  };

  const refundCredits = (amount: number, reason: string) => {
    if (!user.id) return;
    const newBalance = user.credits + amount;
    setUser((prev) => ({ ...prev, credits: newBalance }));
    const tx: CreditTransaction = {
      id: `tx-ref-${Date.now()}`,
      userId: user.id,
      amount,
      type: 'refund',
      description: `Remboursement automatique : ${reason}`,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);
    addNotification('info', 'Crédits remboursés', `${amount} crédits ont été restitués à votre compte.`);
  };

  const addCredits = (amount: number, reason: string) => {
    if (!user.id) {
      addNotification('warning', 'Connexion requise', 'Connectez-vous pour recharger votre compte.');
      return;
    }
    const newBalance = user.credits + amount;
    setUser((prev) => ({ ...prev, credits: newBalance }));
    const tx: CreditTransaction = {
      id: `tx-add-${Date.now()}`,
      userId: user.id,
      amount,
      type: 'purchase',
      description: reason,
      balanceAfter: newBalance,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [tx, ...prev]);
    addNotification('success', 'Recharge réussie !', `+${amount} crédits ajoutés à votre compte.`);
  };

  const addGeneration = (gen: GenerationRecord) => setGenerations((prev) => [gen, ...prev]);

  const removeGeneration = async (id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    try {
      await fetch(`/api/generations/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Delete sync error:', e);
    }
    addNotification('info', 'Suppression confirmée', 'La création a été supprimée de votre bibliothèque.');
  };

  const updateGeneration = (id: string, updates: Partial<GenerationRecord>) => {
    setGenerations((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g)),
    );
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleProvider = async (id: string, enabled: boolean) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, enabled } : p)));
    try {
      await fetch('/api/admin/providers/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: id, enabled }),
      });
    } catch (e) {
      console.warn('Provider toggle error:', e);
    }
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#7C3AED', '#2563EB', '#EC4899', '#38BDF8'],
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        resetUser,
        activeTab,
        setActiveTab,
        activeStudio,
        setActiveStudio,
        generations,
        addGeneration,
        removeGeneration,
        updateGeneration,
        credits: user.credits,
        useCredits,
        refundCredits,
        addCredits,
        transactions,
        notifications,
        addNotification,
        dismissNotification,
        isDarkMode,
        setIsDarkMode,
        toggleTheme,
        activeMediaModal,
        setActiveMediaModal,
        imageToVideoTransfer,
        setImageToVideoTransfer,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authMode,
        setAuthMode,
        appSettings,
        updateAppSettings,
        providers,
        toggleProvider,
        triggerCelebration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
