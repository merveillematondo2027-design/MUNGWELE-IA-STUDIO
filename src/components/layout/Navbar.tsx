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
  User,
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

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => setIsAuthenticated(Boolean(firebaseUser))), []);

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutFirebase();
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
        <button onClick={() => setActiveTab('home')} className="flex items-center space-x-2 text-left">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7C3AED] via-[#2563EB] to-[#EC4899] flex items-center justify-center text-white shadow-md shadow-purple-900/40 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-display font-extrabold text-sm tracking-tight text-white block leading-none">MUNGWELE</span>
            <span className="text-[9px] font-semibold text-purple-400 tracking-wider uppercase">IA STUDIO</span>
          </div>
        </button>
      </div>

      <div className="hidden lg:flex items-center space-x-3">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-purple-200 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>« Imaginez. Générez. Créez sans limites. »</span>
        </span>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-4">
        <div className="hidden md:flex items-center space-x-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
          {[
            ['image', 'studio-image', 'Image'],
            ['video', 'studio-video', 'Vidéo'],
            ['music', 'studio-music', 'Musique'],
          ].map(([studio, tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveStudio(studio as any);
                setActiveTab(tab as any);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isAuthenticated && (
          <button
            id="navbar-credits-btn"
            onClick={() => setActiveTab('subscription')}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-amber-500/30 text-amber-300 transition-all"
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
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-gray-300 hover:text-white"
          title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-purple-400" />}
        </button>

        {!isAuthenticated ? (
          <button
            id="navbar-login-btn"
            onClick={openLogin}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white text-xs font-bold border border-white/20 shadow-lg"
          >
            <LogIn className="w-4 h-4" />
            <span>Connexion</span>
          </button>
        ) : (
          <>
            <button
              id="navbar-profile-btn"
              onClick={() => setActiveTab('profile')}
              className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white"
              title="Ouvrir mon profil"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-lg object-cover ring-2 ring-purple-500/40" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                  <User className="w-4 h-4 text-purple-300" />
                </div>
              )}
              <div className="hidden sm:block text-left">
                <span className="text-xs font-semibold leading-none block truncate max-w-[110px]">{user.name.split(' ')[0]}</span>
                <span className={`text-[10px] uppercase font-bold ${user.role === 'admin' ? 'text-rose-400' : 'text-purple-400'}`}>
                  {user.role === 'admin' ? 'Admin général' : user.plan}
                </span>
              </div>
            </button>

            <button
              id="navbar-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-gray-300 hover:text-rose-300 text-xs font-bold disabled:opacity-50"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Déconnexion...' : 'Déconnexion'}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};
