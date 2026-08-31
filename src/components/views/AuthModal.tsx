import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  friendlyAuthError,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  requestPasswordReset,
} from '../../services/authService';

interface AuthModalProps { required?: boolean; }

export const AuthModal: React.FC<AuthModalProps> = ({ required = false }) => {
  const { isAuthModalOpen, setIsAuthModalOpen, authMode, setAuthMode, setUser, addNotification, triggerCelebration } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const visible = required || isAuthModalOpen;
  if (!visible) return null;

  const changeMode = (mode: 'login' | 'register' | 'forgot') => { setAuthError(''); setAuthMode(mode); };

  const finishLogin = (profile: Awaited<ReturnType<typeof loginWithEmail>>, isNew = false) => {
    setUser(profile);
    setAuthError('');
    setIsAuthModalOpen(false);
    if (isNew) {
      triggerCelebration();
      addNotification('success', 'Bienvenue sur MUNGWELE AI ! 🎉', 'Votre compte Créateur de contenu est actif avec 100 crédits de bienvenue.');
    } else {
      addNotification('success', 'Connexion réussie !', `Bienvenue, ${profile.name}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      if (authMode === 'login') finishLogin(await loginWithEmail(email, password));
      else if (authMode === 'register') finishLogin(await registerWithEmail(name, email, password), true);
      else {
        await requestPasswordReset(email);
        addNotification('success', 'E-mail envoyé', 'Consultez votre boîte mail pour réinitialiser votre mot de passe.');
        changeMode('login');
      }
    } catch (error: any) {
      const message = friendlyAuthError(error);
      setAuthError(message);
      if (error?.code === 'auth/email-already-in-use') setAuthMode('login');
    } finally { setIsSubmitting(false); }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    setIsSubmitting(true);
    try { finishLogin(await loginWithGoogle()); }
    catch (error) { setAuthError(friendlyAuthError(error)); }
    finally { setIsSubmitting(false); }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#050b18] text-white">
        <div className="grid min-h-screen lg:grid-cols-2">
          <div className="relative hidden items-center justify-center overflow-hidden border-r border-white/10 p-12 lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,.20),transparent_38%)]" />
            <div className="relative z-10 max-w-lg"><div className="mb-8 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 shadow-2xl"><Sparkles className="h-8 w-8" /></div><h1 className="text-5xl font-extrabold leading-tight">MUNGWELE AI STUDIO</h1><p className="mt-5 text-lg leading-relaxed text-gray-300">Image, vidéo et musique par prompt, dans un espace sécurisé relié à votre compte Créateur.</p><p className="mt-8 text-sm text-gray-500">Votre session est protégée par Firebase Authentication. Aucun compte invité n’est créé.</p></div>
          </div>

          <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8">
              {!required && <button onClick={() => setIsAuthModalOpen(false)} className="absolute right-5 top-5 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>}
              <div className="mb-7 flex flex-col items-center space-y-2 text-center lg:hidden"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 shadow-xl"><Sparkles className="h-6 w-6" /></div><h3 className="text-xl font-extrabold">MUNGWELE AI STUDIO</h3></div>
              <div className="mb-6"><h2 className="text-2xl font-extrabold">{authMode === 'login' ? 'Connexion' : authMode === 'register' ? 'Créer un compte Créateur' : 'Mot de passe oublié'}</h2><p className="mt-2 text-sm text-gray-400">{authMode === 'login' && 'Connectez-vous pour accéder à votre espace de création.'}{authMode === 'register' && 'Créez votre compte Studio et recevez 100 crédits de bienvenue.'}{authMode === 'forgot' && 'Recevez un lien de réinitialisation par e-mail.'}</p></div>
              {authError && <div className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{authError}</span></div>}

              {authMode !== 'forgot' && <><button type="button" disabled={isSubmitting} onClick={handleGoogleLogin} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-xs font-black">G</span>}Continuer avec Google</button><div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-gray-500"><div className="h-px flex-1 bg-white/10" /><span>ou</span><div className="h-px flex-1 bg-white/10" /></div></>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'register' && <div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-9 pr-3 text-sm outline-none focus:border-purple-500" /></div>}
                <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-9 pr-3 text-sm outline-none focus:border-purple-500" /></div>
                {authMode !== 'forgot' && <div><div className="relative"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" /><input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-9 pr-3 text-sm outline-none focus:border-purple-500" /></div>{authMode === 'login' && <button type="button" onClick={() => changeMode('forgot')} className="mt-2 text-xs text-purple-400 hover:underline">Mot de passe oublié ?</button>}</div>}
                <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 py-3.5 text-sm font-bold text-white disabled:opacity-60">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}<span>{authMode === 'login' ? 'Se connecter' : authMode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'}</span></button>
              </form>
              <div className="pt-6 text-center text-sm text-gray-400">{authMode === 'login' ? <p>Pas encore de compte ? <button onClick={() => changeMode('register')} className="font-bold text-purple-400 hover:underline">S'inscrire</button></p> : authMode === 'forgot' ? <p><button onClick={() => changeMode('login')} className="font-bold text-purple-400 hover:underline">Retour à la connexion</button></p> : <p>Vous avez déjà un compte ? <button onClick={() => changeMode('login')} className="font-bold text-purple-400 hover:underline">Se connecter</button></p>}</div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
