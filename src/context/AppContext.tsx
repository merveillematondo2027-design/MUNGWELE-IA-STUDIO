import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  StudioType, 
  NavigationTab, 
  UserProfile, 
  GenerationRecord, 
  NotificationItem, 
  CreditTransaction, 
  AppSettings,
  ApiProviderSetting 
} from '../types';
import { INITIAL_USER, DEMO_USERS } from '../data/mockData';
import confetti from 'canvas-confetti';

interface AppContextType {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
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
  switchDemoUser: (userId: string) => void;
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
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('mungwele_user');
    return saved ? JSON.parse(saved) : INITIAL_USER;
  });

  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [activeStudio, setActiveStudio] = useState<StudioType>('image');
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([
    {
      id: 'tx-01',
      userId: INITIAL_USER.id,
      amount: 200,
      type: 'bonus',
      description: 'Bonus de bienvenue — Pack Créateur',
      balanceAfter: 200,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'tx-02',
      userId: INITIAL_USER.id,
      amount: -15,
      type: 'generation',
      description: 'Génération Image HD & Studio Vidéo',
      balanceAfter: 185,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [activeMediaModal, setActiveMediaModal] = useState<GenerationRecord | null>(null);
  const [imageToVideoTransfer, setImageToVideoTransfer] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [providers, setProviders] = useState<ApiProviderSetting[]>([]);

  // Fetch initial data from server
  useEffect(() => {
    const loadServerData = async () => {
      try {
        const [genRes, settingsRes] = await Promise.all([
          fetch('/api/generations'),
          fetch('/api/settings'),
        ]);

        if (genRes.ok) {
          const genData = await genRes.json();
          if (genData.generations) {
            setGenerations(genData.generations);
          }
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          if (sData.settings) setAppSettings(sData.settings);
          if (sData.providers) setProviders(sData.providers);
        }
      } catch (err) {
        console.warn('Initial server sync warning, using local state:', err);
      }
    };

    loadServerData();
  }, []);

  // Sync user state to localStorage
  useEffect(() => {
    localStorage.setItem('mungwele_user', JSON.stringify(user));
  }, [user]);

  // Keep dark class on <html> element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const addNotification = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string
  ) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      title,
      message,
      timestamp: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(newNotif.id);
    }, 5000);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const useCredits = (amount: number, reason: string): boolean => {
    if (user.credits < amount) {
      addNotification(
        'error',
        'Crédits insuffisants',
        `Cette opération nécessite ${amount} crédits. Votre solde actuel est de ${user.credits} crédits.`
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

    addNotification(
      'info',
      'Crédits remboursés',
      `${amount} crédits ont été restitués à votre compte.`
    );
  };

  const addCredits = (amount: number, reason: string) => {
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

    addNotification(
      'success',
      'Recharge réussie !',
      `+${amount} crédits ajoutés à votre compte.`
    );
  };

  const addGeneration = (gen: GenerationRecord) => {
    setGenerations((prev) => [gen, ...prev]);
  };

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
      prev.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g))
    );
  };

  const updateAppSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleProvider = async (id: string, enabled: boolean) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled } : p))
    );
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

  const switchDemoUser = (userId: string) => {
    const found = DEMO_USERS.find((u) => u.id === userId) || INITIAL_USER;
    setUser(found);
    addNotification('info', 'Compte changé', `Connecté en tant que ${found.name} (${found.role === 'admin' ? 'Administrateur' : 'Utilisateur'}).`);
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
        switchDemoUser,
        triggerCelebration,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
