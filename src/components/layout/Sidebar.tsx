import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { auth } from '../../lib/firebase';
import { logoutFirebase } from '../../services/authService';
import {
  Home,
  Image as ImageIcon,
  Film,
  Music as MusicIcon,
  FolderOpen,
  CreditCard,
  User,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  Zap,
  LogOut,
  LogIn,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setActiveStudio,
    user,
    credits,
    generations,
    setIsAuthModalOpen,
    setAuthMode,
    addNotification,
  } = useApp();

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => setIsAuthenticated(Boolean(firebaseUser))), []);

  const mainNavItems = [
    { id: 'home', label: 'Accueil', icon: Home, badge: null },
    {
      id: 'studio-image',
      label: 'Studio Image',
      icon: ImageIcon,
      color: 'text-purple-400',
      action: () => {
        setActiveStudio('image');
        setActiveTab('studio-image');
      },
    },
    {
      id: 'studio-video',
      label: 'Studio Vidéo',
      icon: Film,
      badge: 'Veo',
      color: 'text-pink-400',
      action: () => {
        setActiveStudio('video');
        setActiveTab('studio-video');
      },
    },
    {
      id: 'studio-music',
      label: 'Studio Musique',
      icon: MusicIcon,
      badge: 'Suno',
      color: 'text-blue-400',
      action: () => {
        setActiveStudio('music');
        setActiveTab('studio-music');
      },
    },
    { id: 'creations', label: 'Mes créations', icon: FolderOpen, badge: generations.length > 0 ? `${generations.length}` : null },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard, badge: null },
    { id: 'profile', label: 'Profil', icon: User, badge: null },
    { id: 'help', label: 'Aide & FAQ', icon: HelpCircle, badge: null },
  ];

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
      setActiveTab('home');
      addNotification('success', 'Déconnexion réussie', 'Votre session a été fermée.');
    } catch (error) {
      console.warn('Firebase logout error:', error);
      addNotification('error', 'Déconnexion impossible', 'Réessayez dans quelques instants.');
    }
  };

  return (
    <aside
      id="desktop-sidebar"
      className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white/[0.02] backdrop-blur-2xl border-r border-white/10 p-4 justify-between select-none z-40 shadow-2xl"
    >
      <div>
        <div className="flex items-center space-x-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#2563EB] to-[#EC4899] flex items-center justify-center text-white shadow-xl shadow-purple-950/60 ring-2 ring-white/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base tracking-tight text-white leading-none">MUNGWELE</h1>
            <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 uppercase tracking-widest block mt-0.5">
              IA STUDIO
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => item.action ? item.action() : setActiveTab(item.id as NavigationTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/[0.08] backdrop-blur-md text-white border border-white/20 shadow-lg shadow-purple-950/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color || 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/10 text-gray-300">{item.badge}</span>
                )}
              </button>
            );
          })}

          {isAuthenticated && user.role === 'admin' && (
            <div className="pt-2">
              <button
                id="sidebar-link-admin"
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-rose-950/40 text-rose-200 border border-rose-500/40'
                    : 'text-gray-400 hover:text-rose-300 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Administration générale</span>
                </div>
              </button>
            </div>
          )}
        </nav>
      </div>

      <div className="space-y-3 pt-4 border-t border-white/10">
        {isAuthenticated ? (
          <>
            <div
              onClick={() => setActiveTab('subscription')}
              className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-all"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400 font-medium">Solde crédits</span>
                <span className="font-bold text-amber-400 flex items-center space-x-1">
                  <Zap className="w-3 h-3 fill-amber-400" />
                  <span>{credits}</span>
                </span>
              </div>
              <div className="text-[11px] text-purple-300 capitalize font-medium">Plan {user.plan}</div>
            </div>

            <div className="flex items-center justify-between px-1">
              <button onClick={() => setActiveTab('profile')} className="flex items-center space-x-2.5 text-left min-w-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-xl object-cover ring-2 ring-purple-500/30" />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-300" />
                  </div>
                )}
                <div className="truncate max-w-[120px]">
                  <span className="text-xs font-semibold text-white truncate block">{user.name}</span>
                  <span className="text-[10px] text-gray-400 truncate block">{user.role === 'admin' ? 'Admin général' : user.email}</span>
                </div>
              </button>

              <button
                id="sidebar-logout-btn"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
                title="Se déconnecter"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            id="sidebar-login-btn"
            onClick={openLogin}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/20"
          >
            <LogIn className="w-4 h-4" />
            Connexion
          </button>
        )}
      </div>
    </aside>
  );
};
