import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEMO_USERS } from '../../data/mockData';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authMode, 
    setAuthMode, 
    setUser, 
    addNotification, 
    triggerCelebration 
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      const existing = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) || {
        id: `user-${Date.now()}`,
        name: email.split('@')[0] || 'Utilisateur',
        email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        plan: 'createur' as const,
        credits: 200,
        totalGenerations: 5,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
      };
      setUser(existing);
      addNotification('success', 'Connexion réussie !', `Bienvenue de retour, ${existing.name}.`);
    } else if (authMode === 'register') {
      const newUser = {
        id: `user-${Date.now()}`,
        name: name || 'Nouveau Créateur',
        email,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        plan: 'decouverte' as const,
        credits: 50,
        totalGenerations: 0,
        role: 'user' as const,
        createdAt: new Date().toISOString(),
      };
      setUser(newUser);
      triggerCelebration();
      addNotification('success', 'Bienvenue sur MUNGWELE IA ! 🎉', 'Votre compte a été créé avec 50 crédits offerts.');
    } else {
      addNotification('info', 'Email envoyé', 'Un lien de réinitialisation vous a été transmis.');
    }
    setIsAuthModalOpen(false);
  };

  const handleQuickDemoLogin = (userId: string) => {
    const demo = DEMO_USERS.find((u) => u.id === userId) || DEMO_USERS[0];
    setUser(demo);
    setIsAuthModalOpen(false);
    addNotification('success', 'Connexion Rapide Démo', `Connecté en tant que ${demo.name} (${demo.role}).`);
  };

  return (
    <AnimatePresence>
      <div 
        id="auth-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          id="auth-modal-card"
          className="relative w-full max-w-md bg-[#081226]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl text-white"
        >
          {/* Close button */}
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Logo Brand */}
          <div className="flex flex-col items-center text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#2563EB] to-[#EC4899] flex items-center justify-center text-white shadow-xl shadow-purple-950/60 border border-white/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-extrabold text-white">
              MUNGWELE IA STUDIO
            </h3>
            <p className="text-xs text-gray-400">
              {authMode === 'login' && 'Connectez-vous pour accéder à vos 3 studios'}
              {authMode === 'register' && 'Créez votre compte créateur (50 crédits offerts)'}
              {authMode === 'forgot' && 'Réinitialisez votre mot de passe'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nom complet</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@exemple.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {authMode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-300">Mot de passe</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[11px] text-purple-400 hover:underline"
                    >
                      Oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center justify-center space-x-2 shadow-lg transition-all border border-white/20"
            >
              <span>
                {authMode === 'login' && 'Se connecter'}
                {authMode === 'register' && 'Créer un compte'}
                {authMode === 'forgot' && 'Envoyer les instructions'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Switch mode */}
          <div className="text-center pt-4 text-xs text-gray-400">
            {authMode === 'login' ? (
              <p>
                Pas encore de compte ?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="text-purple-400 font-bold hover:underline"
                >
                  S'inscrire
                </button>
              </p>
            ) : (
              <p>
                Vous avez déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-purple-400 font-bold hover:underline"
                >
                  Se connecter
                </button>
              </p>
            )}
          </div>

          {/* Quick Demo Logins */}
          <div className="pt-5 mt-5 border-t border-white/10 space-y-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block text-center font-semibold">
              Ou connexion rapide en 1 clic :
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('user-01')}
                className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 text-[11px] font-medium transition-colors text-center backdrop-blur-md"
              >
                Tester en Créateur
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('user-02')}
                className="py-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-[11px] font-medium transition-colors text-center border border-rose-500/30 backdrop-blur-md"
              >
                Tester en Admin
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
