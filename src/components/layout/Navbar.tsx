import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { logoutFirebase } from '../../services/authService';
import {
  Zap,
  Sun,
  Moon,
  Sparkles,
  PlusCircle,
  LogIn,
  LogOut,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    user,
    credits,
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleTheme,
    setIsAuthModalOpen,
    setAuthMode,
    setActiveStudio,
    addNotification,
  } = useApp();

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setIsAuthenticated(Boolean(firebaseUser));
    });
  }, []);

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutFirebase();
      localStorage.removeItem('mungwele_user');
      setActiveTab('home');
      addNotification('success', 'Déconnexion réussie', 'Votre session Firebase a été fermée.');
    } catch (error) {
      console.warn('Firebase logout error:', error);
      addNotification('error', 'Déconnexion impossible', 'Réessayez dans quelques instants.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      id="top-navbar"
      className="sticky top-0 z-30 w-full h-16 bg-white/[0.03] backdrop-blur-2xl border-b border-white/10 px-4 lg:px-8 flex items-center justify-between transition-colors shadow-lg shadow-black/20"
    >
      <div className="flex items-center space-x-3 lg:hidden">
        <button
          onClick={() => setActiveTab('home')}
          className="flex items-center space-x-2 text-left"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#2563EB] to-[#EC4899] flex items-center justify-center text-white shadow-md shadow-purple-900/40 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-display font-extrabold text-sm tracking-tight text-white block leading-none">
              MUNGWELE
            </span>
            <span className="text-[9px] font-semibold text-purple-400 tracking-wider uppercase">
              IA STUDIO
            </span>
          </div>
        </button>
      </div>

      <div className="hidden lg:flex items-center space-x-3">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/10 text-purple-200 flex items-center space-x-1.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>« Imaginez. Générez. Créez sans limites. »</span>
        </span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10">
          <button
            onClick={() => {
              setActiveStudio('image');
              setActiveTab('studio-image');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'studio-image'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Image
          </button>
          <button
            onClick={() => {
              setActiveStudio('video');
              setActiveTab('studio-video');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'studio-video'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Vidéo
          </button>
          <button
            onClick={() => {
              setActiveStudio('music');
              setActiveTab('studio-music');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'studio-music'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Musique
          </button>
        </div>

        {isAuthenticated && (
          <button
            id="navbar-credits-btn"
            onClick={() => setActiveTab('subscription')}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] backdrop-blur-md border border-amber-500/30 text-amber-300 transition-all shadow-sm active:scale-95"
            title="Recharger des crédits"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold font-mono tracking-tight text-white">{credits}</span>
            <span className="text-[10px] uppercase font-semibold text-amber-400/90 hidden sm:inline">Crédits</span>
            <PlusCircle className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
          </button>
        )}

        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 text-gray-300 hover:text-white transition-colors"
          title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-purple-400" />}
        </button>

        {!isAuthenticated ? (
          <button
            id="navbar-login-btn"
            onClick={openLogin}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold border border-white/20 shadow-lg active:scale-95 transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Connexion</span>
          </button>
        ) : (
          <>
            <button
              id="navbar-profile-btn"
              onClick={() => setActiveTab('profile')}
              className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 text-white transition-colors"
              title="Ouvrir mon profil"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-7 h-7 rounded-lg object-cover ring-2 ring-purple-500/40"
              />
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold leading-none block truncate max-w-[100px]">
                  {user.name.split(' ')[0]}
                </span>
                <span className="text-[10px] text-purple-400 uppercase font-medium">{user.plan}</span>
              </div>
            </button>

            <button
              id="navbar-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-gray-300 hover:text-rose-300 text-xs font-bold transition-all disabled:opacity-50"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
