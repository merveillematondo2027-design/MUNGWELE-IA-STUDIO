import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DEMO_USERS } from '../../data/mockData';
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Zap, 
  Check, 
  Sparkles, 
  Edit3, 
  Key, 
  Lock, 
  RefreshCw,
  Users
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, setUser, credits, switchDemoUser, addNotification } = useApp();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUser({ ...user, name, email });
    setIsEditing(false);
    addNotification('success', 'Profil mis à jour', 'Vos informations ont été enregistrées.');
  };

  return (
    <div id="profile-view-container" className="w-full max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header Profile Card */}
      <div className="rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-3xl object-cover ring-4 ring-purple-500/40 shadow-xl border border-white/20"
            />
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider border-2 border-[#081226]">
              {user.role}
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                  {user.name}
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 font-mono">
                  {user.email}
                </p>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 hover:text-white flex items-center justify-center space-x-1.5 self-center sm:self-start transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Fermer' : 'Modifier le profil'}</span>
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              <span className="px-3 py-1 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center space-x-1 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span className="capitalize">Forfait {user.plan}</span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-1 backdrop-blur-md">
                <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{credits} Crédits disponibles</span>
              </span>

              <span className="px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center space-x-1 backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compte Vérifié</span>
              </span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-white/10 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Adresse Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all shadow-md border border-white/20"
              >
                Enregistrer les modifications
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Switch Demo Accounts Selector */}
      <div className="rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Changer de Compte Démo (Test Rapide)</span>
            </h3>
            <p className="text-xs text-gray-400">
              Basculez facilement entre différents profils pour tester les rôles Administrateur ou Créateur.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {DEMO_USERS.map((demo) => {
            const isCurrent = user.id === demo.id;
            return (
              <button
                key={demo.id}
                onClick={() => switchDemoUser(demo.id)}
                className={`p-3.5 rounded-2xl border text-left flex items-center space-x-3 transition-all backdrop-blur-md ${
                  isCurrent
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                    : 'bg-white/[0.03] border-white/10 text-gray-300 hover:border-white/20 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <img
                  src={demo.avatar}
                  alt={demo.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/30 shrink-0 border border-white/10"
                />
                <div className="truncate text-left">
                  <span className="text-xs font-bold block truncate">{demo.name}</span>
                  <span className="text-[10px] text-gray-400 capitalize block">
                    {demo.role === 'admin' ? '👑 Admin' : 'Créateur'} • {demo.plan}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security & Server Gateway Information */}
      <div className="rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 p-6 space-y-4 shadow-lg">
        <div className="flex items-center space-x-3 text-emerald-400">
          <Lock className="w-5 h-5" />
          <h3 className="text-sm font-bold text-white">Sécurité & Clés API Protégées</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Toutes vos requêtes vers les modèles d'IA (Google Imagen 3, Google Veo 3, Suno AI, OpenAI, Gemini) 
          sont exécutées côté serveur via notre backend sécurisé Express. Aucune clé secrète n'est exposée sur le navigateur client.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/10">
            <span className="text-[10px] text-gray-400 block uppercase">Moteur Images</span>
            <span className="text-xs font-semibold text-purple-300">Google Imagen 3 (Actif)</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/10">
            <span className="text-[10px] text-gray-400 block uppercase">Moteur Vidéo</span>
            <span className="text-xs font-semibold text-pink-300">Google Veo 3 (Actif)</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/10">
            <span className="text-[10px] text-gray-400 block uppercase">Moteur Audio</span>
            <span className="text-xs font-semibold text-blue-300">Suno AI & Lyria (Actif)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
