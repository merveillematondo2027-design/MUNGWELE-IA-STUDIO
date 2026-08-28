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

interface AuthModalProps {
  required?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ required = false }) => {
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

  const visible = required || isAuthModalOpen;
  if (!visible) return null;

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
      if (profile) finishLogin(profile);
    } catch (error) {
      addNotification('error', 'Connexion Google impossible', friendlyAuthError(error));
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-[#050b18] text-white overflow-y-auto">
        <div className="min-h-screen grid lg:grid-cols-2">
          <div className="hidden lg:flex relative overflow-hidden p-12 items-center justify-center border-r border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.28),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,.20),transparent_38%)]" />
            <div className="relative z-10 max-w-lg">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-2xl border border-white/20 mb-8">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-5xl font-display font-extrabold leading-tight">MUNGWELE IA STUDIO</h1>
              <p className="mt-5 text-lg text-gray-300 leading-relaxed">Image, vidéo et musique par prompt, dans un espace sécurisé relié à votre compte.</p>
              <p className="mt-8 text-sm text-gray-500">Votre session est protégée par Firebase Authentication.</p>
            </div>
          </div>

          <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative w-full max-w-md bg-white/[0.035] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl"
            >
              {!required && (
                <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}

              <div className="flex flex-col items-center text-center space-y-2 mb-7 lg:hidden">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center shadow-xl border border-white/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-display font-extrabold">MUNGWELE IA STUDIO</h3>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-display font-extrabold">
                  {authMode === 'login' ? 'Connexion' : authMode === 'register' ? 'Créer un compte' : 'Mot de passe oublié'}
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  {authMode === 'login' && 'Connectez-vous pour accéder à votre espace MUNGWELE.'}
                  {authMode === 'register' && 'Créez votre compte et recevez 50 crédits de bienvenue.'}
                  {authMode === 'forgot' && 'Recevez un lien de réinitialisation par e-mail.'}
                </p>
              </div>

              {authMode !== 'forgot' && (
                <>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleGoogleLogin}
                    className="w-full py-3.5 rounded-xl bg-white text-gray-900 hover:bg-gray-100 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center font-black text-xs">G</span>}
                    Continuer avec Google
                  </button>
                  <div className="flex items-center gap-3 my-5 text-[10px] uppercase tracking-widest text-gray-500">
                    <div className="h-px bg-white/10 flex-1" /><span>ou</span><div className="h-px bg-white/10 flex-1" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" className="w-full pl-9 pr-3 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm outline-none focus:border-purple-500" />
                  </div>
                )}

                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="w-full pl-9 pr-3 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm outline-none focus:border-purple-500" />
                </div>

                {authMode !== 'forgot' && (
                  <div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" className="w-full pl-9 pr-3 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm outline-none focus:border-purple-500" />
                    </div>
                    {authMode === 'login' && (
                      <button type="button" onClick={() => setAuthMode('forgot')} className="mt-2 text-xs text-purple-400 hover:underline">Mot de passe oublié ?</button>
                    )}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white flex items-center justify-center gap-2 disabled:opacity-60">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{authMode === 'login' ? 'Se connecter' : authMode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'}</span>
                </button>
              </form>

              <div className="text-center pt-6 text-sm text-gray-400">
                {authMode === 'login' ? (
                  <p>Pas encore de compte ? <button onClick={() => setAuthMode('register')} className="text-purple-400 font-bold hover:underline">S'inscrire</button></p>
                ) : (
                  <p>Vous avez déjà un compte ? <button onClick={() => setAuthMode('login')} className="text-purple-400 font-bold hover:underline">Se connecter</button></p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
