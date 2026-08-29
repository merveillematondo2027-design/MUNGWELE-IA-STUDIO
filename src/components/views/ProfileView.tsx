import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { logoutFirebase } from '../../services/authService';
import { User, Mail, ShieldCheck, Zap, Sparkles, Lock, LogIn, LogOut, UserPlus, WalletCards, ArrowRight } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, credits, addNotification, setIsAuthModalOpen, setAuthMode, setActiveTab } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => setIsAuthenticated(Boolean(firebaseUser))), []);

  const openLogin = () => { setAuthMode('login'); setIsAuthModalOpen(true); };
  const openRegister = () => { setAuthMode('register'); setIsAuthModalOpen(true); };

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
    } finally { setIsLoggingOut(false); }
  };

  if (!isAuthenticated) {
    return (
      <div id="profile-view-container" className="mx-auto w-full max-w-2xl pb-20">
        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl backdrop-blur-2xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 shadow-xl"><User className="h-8 w-8 text-white" /></div>
          <div><h2 className="text-2xl font-extrabold text-white">Mon compte MUNGWELE</h2><p className="mt-2 text-sm text-gray-400">Connectez-vous pour retrouver vos crédits, votre galerie et vos créations IA.</p></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button onClick={openLogin} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg"><LogIn className="h-5 w-5" /> Se connecter</button>
            <button onClick={openRegister} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm font-bold text-white hover:bg-white/[0.08]"><UserPlus className="h-5 w-5" /> Créer un compte</button>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel = user.role === 'admin' ? 'ADMIN GÉNÉRAL' : 'UTILISATEUR';

  return (
    <div id="profile-view-container" className="mx-auto w-full max-w-4xl space-y-6 pb-20">
      <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-transparent p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10"><WalletCards className="h-6 w-6 text-amber-300" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-300/80">Solde du compte</p><p className="mt-1 text-2xl font-black text-white sm:text-3xl">{credits} crédits</p><p className="mt-1 text-[11px] text-gray-500">Crédits disponibles pour vos générations IA.</p></div></div>
          <button onClick={() => setActiveTab('subscription')} className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.08] sm:flex">Gérer <ArrowRight className="h-3.5 w-3.5" /></button>
        </div>
        <button onClick={() => setActiveTab('subscription')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-xs font-bold text-white sm:hidden">Gérer mes crédits <ArrowRight className="h-3.5 w-3.5" /></button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
          <div className="relative">
            {user.avatar ? <img src={user.avatar} alt={user.name} className="h-24 w-24 rounded-3xl border border-white/20 object-cover shadow-xl ring-4 ring-purple-500/40" /> : <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-purple-500/30 bg-purple-600/20 ring-4 ring-purple-500/20"><User className="h-10 w-10 text-purple-300" /></div>}
            <span className={`absolute -bottom-2 -right-2 rounded-full border-2 border-[#081226] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${user.role === 'admin' ? 'bg-rose-600' : 'bg-purple-600'}`}>{roleLabel}</span>
          </div>
          <div className="flex-1 space-y-3">
            <div><h2 className="text-xl font-extrabold text-white sm:text-2xl">{user.name}</h2><p className="mt-1 flex items-center justify-center gap-1.5 font-mono text-xs text-gray-400 sm:justify-start sm:text-sm"><Mail className="h-3.5 w-3.5" /> {user.email}</p></div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
              {user.role === 'admin' && <span className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/60 px-3 py-1 text-xs font-bold text-rose-300"><ShieldCheck className="h-3.5 w-3.5" /> Administrateur général</span>}
              <span className="flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-950/60 px-3 py-1 text-xs font-semibold text-purple-300"><Sparkles className="h-3.5 w-3.5 text-pink-400" /> Forfait {user.plan}</span>
              <span className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-300"><Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {credits} crédits</span>
              <span className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Session Firebase active</span>
            </div>
          </div>
        </div>
        <div className="mt-7 border-t border-white/10 pt-6"><button onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-3 text-sm font-bold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 sm:w-auto"><LogOut className="h-5 w-5" /> {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</button></div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6 shadow-lg backdrop-blur-xl"><div className="flex items-center space-x-3 text-emerald-400"><Lock className="h-5 w-5" /><h3 className="text-sm font-bold text-white">Compte sécurisé avec Firebase</h3></div><p className="text-xs leading-relaxed text-gray-400">Votre session est gérée par Firebase Authentication. Aucun compte de démonstration n’est utilisé dans l’application.</p></div>
    </div>
  );
};
