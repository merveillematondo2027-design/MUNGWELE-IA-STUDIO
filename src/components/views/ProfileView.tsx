import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { logoutFirebase } from '../../services/authService';
import {
  User,
  Mail,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  LogIn,
  LogOut,
  UserPlus,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const {
    user,
    credits,
    addNotification,
    setIsAuthModalOpen,
    setAuthMode,
    setActiveTab,
  } = useApp();

  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => setIsAuthenticated(Boolean(firebaseUser))), []);

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutFirebase();
      addNotification('success', 'Déconnexion réussie', 'Vous êtes maintenant déconnecté de MUNGWELE IA STUDIO.');
      setActiveTab('home');
    } catch (error) {
      console.warn('Firebase logout error:', error);
      addNotification('error', 'Déconnexion impossible', 'Réessayez dans quelques instants.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div id="profile-view-container" className="w-full max-w-2xl mx-auto pb-20">
        <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-7 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-xl border border-white/20">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-extrabold text-white">Mon compte MUNGWELE</h2>
            <p className="text-sm text-gray-400 mt-2">Connectez-vous pour retrouver vos crédits, votre galerie et vos créations IA.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="profile-login-btn"
              onClick={openLogin}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg border border-white/20"
            >
              <LogIn className="w-5 h-5" />
              Se connecter
            </button>
            <button
              id="profile-register-btn"
              onClick={openRegister}
              className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Créer un compte
            </button>
          </div>
          <p className="text-xs text-gray-500">Connexion réelle via Firebase Authentication.</p>
        </div>
      </div>
    );
  }

  const roleLabel = user.role === 'admin' ? 'ADMIN GÉNÉRAL' : 'UTILISATEUR';

  return (
    <div id="profile-view-container" className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-3xl object-cover ring-4 ring-purple-500/40 shadow-xl border border-white/20"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center ring-4 ring-purple-500/20">
                <User className="w-10 h-10 text-purple-300" />
              </div>
            )}
            <span className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold uppercase tracking-wider border-2 border-[#081226] ${user.role === 'admin' ? 'bg-rose-600' : 'bg-purple-600'}`}>
              {roleLabel}
            </span>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">{user.name}</h2>
              <p className="text-xs sm:text-sm text-gray-400 font-mono flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {user.role === 'admin' && (
                <span className="px-3 py-1 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Administrateur général</span>
                </span>
              )}
              <span className="px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span className="capitalize">Forfait {user.plan}</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{credits} crédits</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Session Firebase active</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7 pt-6 border-t border-white/10">
          <button
            id="profile-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogOut className="w-5 h-5" />
            {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 space-y-4 shadow-lg">
        <div className="flex items-center space-x-3 text-emerald-400">
          <Lock className="w-5 h-5" />
          <h3 className="text-sm font-bold text-white">Compte sécurisé avec Firebase</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Votre session est gérée par Firebase Authentication. Aucun compte de démonstration n’est utilisé dans l’application.
        </p>
      </div>
    </div>
  );
};
