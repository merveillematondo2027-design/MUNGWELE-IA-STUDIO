import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  friendlyAuthError,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  requestPasswordReset,
} from '../../services/authService';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authMode,
    setAuthMode,
    setUser,
    addNotification,
    triggerCelebration,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  const finishLogin = (profile: Awaited<ReturnType<typeof loginWithEmail>>, isNew = false) => {
    setUser(profile);
    setIsAuthModalOpen(false);
    if (isNew) {
      triggerCelebration();
      addNotification('success', 'Bienvenue sur MUNGWELE IA ! 🎉', 'Votre compte Firebase a été créé avec 50 crédits offerts.');
    } else {
      addNotification('success', 'Connexion réussie !', `Bienvenue, ${profile.name}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        finishLogin(await loginWithEmail(email, password));
      } else if (authMode === 'register') {
        finishLogin(await registerWithEmail(name, email, password), true);
      } else {
        await requestPasswordReset(email);
        addNotification('success', 'E-mail envoyé', 'Consultez votre boîte mail pour réinitialiser votre mot de passe.');
        setAuthMode('login');
      }
    } catch (error) {
      addNotification('error', 'Authentification impossible', friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      const profile = await loginWithGoogle();
      finishLogin(profile);
    } catch (error) {
      addNotification('error', 'Connexion Google impossible', friendlyAuthError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-[#081226]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white"
        >
          <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#2563EB] to-[#EC4899] flex items-center justify-center shadow-xl border border-white/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-extrabold">MUNGWELE IA STUDIO</h3>
            <p className="text-xs text-gray-400">
              {authMode === 'login' && 'Connectez-vous à votre compte sécurisé Firebase'}
              {authMode === 'register' && 'Créez votre compte et recevez 50 crédits de bienvenue'}
              {authMode === 'forgot' && 'Recevez un lien de réinitialisation par e-mail'}
            </p>
          </div>

          {authMode !== 'forgot' && (
            <>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleGoogleLogin}
                className="w-full py-3 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center font-black">G</span>
                Continuer avec Google
              </button>
              <div className="flex items-center gap-3 my-4 text-[10px] uppercase tracking-widest text-gray-500">
                <div className="h-px bg-white/10 flex-1" /><span>ou</span><div className="h-px bg-white/10 flex-1" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs outline-none focus:border-purple-500" />
              </div>
            )}

            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs outline-none focus:border-purple-500" />
            </div>

            {authMode !== 'forgot' && (
              <div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs outline-none focus:border-purple-500" />
                </div>
                {authMode === 'login' && (
                  <button type="button" onClick={() => setAuthMode('forgot')} className="mt-2 text-[11px] text-purple-400 hover:underline">Mot de passe oublié ?</button>
                )}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center gap-2 disabled:opacity-60">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{authMode === 'login' ? 'Se connecter' : authMode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'}</span>
            </button>
          </form>

          <div className="text-center pt-5 text-xs text-gray-400">
            {authMode === 'login' ? (
              <p>Pas encore de compte ? <button onClick={() => setAuthMode('register')} className="text-purple-400 font-bold hover:underline">S'inscrire</button></p>
            ) : (
              <p>Vous avez déjà un compte ? <button onClick={() => setAuthMode('login')} className="text-purple-400 font-bold hover:underline">Se connecter</button></p>
            )}
          </div>

          <p className="mt-5 pt-4 border-t border-white/10 text-[10px] text-center text-gray-500">
            Authentification sécurisée par Firebase. Les comptes de démonstration ont été désactivés.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
