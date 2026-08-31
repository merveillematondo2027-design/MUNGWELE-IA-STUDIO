import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { logoutFirebase } from '../../services/authService';
import { getMDigiProfile } from '../../services/mdigiService';
import { ArrowRight, Globe2, Lock, LogIn, LogOut, Mail, ShieldCheck, Sparkles, User, UserPlus, Zap } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, credits, addNotification, setIsAuthModalOpen, setAuthMode, setActiveTab } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(auth.currentUser));
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasMDigi, setHasMDigi] = useState<boolean | null>(null);

  useEffect(() => onAuthStateChanged(auth, (firebaseUser) => setIsAuthenticated(Boolean(firebaseUser))), []);
  useEffect(() => {
    let cancelled = false;
    if (!user.id) { setHasMDigi(false); return; }
    setHasMDigi(null);
    void getMDigiProfile(user.id)
      .then((profile) => { if (!cancelled) setHasMDigi(Boolean(profile)); })
      .catch(() => { if (!cancelled) setHasMDigi(false); });
    return () => { cancelled = true; };
  }, [user.id]);

  const openLogin = () => { setAuthMode('login'); setIsAuthModalOpen(true); };
  const openRegister = () => { setAuthMode('register'); setIsAuthModalOpen(true); };
  const handleLogout = async () => { if (isLoggingOut) return; setIsLoggingOut(true); try { await logoutFirebase(); addNotification('success','Déconnexion réussie','Vous êtes maintenant déconnecté.'); setActiveTab('home'); } catch { addNotification('error','Déconnexion impossible','Réessayez dans quelques instants.'); } finally { setIsLoggingOut(false); } };

  if (!isAuthenticated || !user.id) return <div className="mx-auto w-full max-w-2xl pb-20"><div className="space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl sm:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600"><User className="h-8 w-8 text-white"/></div><div><h2 className="text-2xl font-extrabold text-white">Mon compte MUNGWELE</h2><p className="mt-2 text-sm text-gray-400">Connectez-vous avec votre compte Studio pour retrouver vos créations et services.</p></div><div className="grid gap-3 sm:grid-cols-2"><button onClick={openLogin} className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-4 py-3.5 text-sm font-bold text-white"><LogIn className="h-5 w-5"/> Se connecter</button><button onClick={openRegister} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-sm font-bold text-white"><UserPlus className="h-5 w-5"/> Créer un compte</button></div></div></div>;

  const roleLabel=user.role==='admin'?'ADMIN GÉNÉRAL':'CRÉATEUR DE CONTENU';
  return <div className="mx-auto w-full max-w-4xl space-y-6 pb-20">
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl sm:p-8">
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left"><div className="relative">{user.avatar?<img src={user.avatar} alt={user.name} className="h-24 w-24 rounded-3xl border border-white/20 object-cover ring-4 ring-purple-500/40"/>:<div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-purple-500/30 bg-purple-600/20"><User className="h-10 w-10 text-purple-300"/></div>}<span className={`absolute -bottom-2 -right-2 rounded-full border-2 border-[#081226] px-2.5 py-0.5 text-[10px] font-bold text-white ${user.role==='admin'?'bg-rose-600':'bg-purple-600'}`}>{roleLabel}</span></div><div className="flex-1 space-y-3"><div><h2 className="text-xl font-extrabold text-white sm:text-2xl">{user.name}</h2><p className="mt-1 flex items-center justify-center gap-1.5 font-mono text-xs text-gray-400 sm:justify-start"><Mail className="h-3.5 w-3.5"/> {user.email}</p></div><div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">{user.role==='admin'&&<span className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-950/60 px-3 py-1 text-xs font-bold text-rose-300"><ShieldCheck className="h-3.5 w-3.5"/> Administrateur général</span>}<span className="flex items-center gap-1 rounded-xl border border-purple-500/30 bg-purple-950/60 px-3 py-1 text-xs font-semibold text-purple-300"><Sparkles className="h-3.5 w-3.5"/> Forfait {user.role==='admin'?'illimité':user.plan}</span><span className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-300"><Zap className="h-3.5 w-3.5"/> {user.role==='admin'?'Crédits illimités':`${credits} crédits`}</span></div></div></div>
      <div className="mt-7 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2"><button onClick={()=>setActiveTab('mdigi')} className="flex items-center justify-between rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-5 py-4 text-left"><span className="flex items-center gap-3"><Globe2 className="h-5 w-5 text-cyan-300"/><span><span className="block text-sm font-black text-white">{user.role==='admin' ? 'Compte officiel M.Digi' : hasMDigi === null ? 'Vérification du compte M.Digi…' : hasMDigi ? 'Ouvrir mon compte M.Digi' : 'Créer mon compte M.Digi'}</span><span className="mt-1 block text-[10px] text-gray-400">{user.role==='admin' ? 'Identité sociale officielle MUNGWELE AI.' : hasMDigi ? 'Accédez à votre profil social et vos publications.' : 'Créez votre identité communautaire séparée du compte Studio.'}</span></span></span><ArrowRight className="h-4 w-4 text-cyan-300"/></button><button onClick={()=>setActiveTab('subscription')} className="flex items-center justify-between rounded-2xl border border-purple-500/20 bg-purple-500/10 px-5 py-4 text-left"><span><span className="block text-sm font-black text-white">Crédits & abonnements</span><span className="mt-1 block text-[10px] text-gray-400">Solde, achats, parrainage et formule.</span></span><ArrowRight className="h-4 w-4 text-purple-300"/></button></div>
      <div className="mt-4"><button onClick={handleLogout} disabled={isLoggingOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-3 text-sm font-bold text-rose-300 sm:w-auto"><LogOut className="h-5 w-5"/> {isLoggingOut?'Déconnexion...':'Se déconnecter'}</button></div>
    </section>
    <section className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6"><div className="flex items-center space-x-3 text-emerald-400"><Lock className="h-5 w-5"/><h3 className="text-sm font-bold text-white">Deux identités, une connexion sécurisée</h3></div><p className="text-xs leading-relaxed text-gray-400">Votre compte MUNGWELE AI STUDIO reste le compte principal de création. M.Digi est optionnel pour les créateurs et sert uniquement à l’identité sociale, aux publications et interactions communautaires. Les droits de téléchargement restent liés à l’abonnement Studio.</p></section>
  </div>;
};
