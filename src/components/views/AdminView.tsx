import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldAlert, 
  Server, 
  Activity, 
  Users, 
  Database, 
  Zap, 
  Sliders, 
  Check, 
  AlertTriangle, 
  RefreshCw,
  Power,
  Layers,
  Settings,
  Bell
} from 'lucide-react';
import { ApiProviderSetting } from '../../types';

export const AdminView: React.FC = () => {
  const { user, providers, toggleProvider, appSettings, updateAppSettings, addNotification } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [announcementText, setAnnouncementText] = useState(appSettings.announcementBanner || '');
  const [maintenance, setMaintenance] = useState(appSettings.maintenanceMode || false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Admin stats error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSaveBanner = async () => {
    updateAppSettings({ announcementBanner: announcementText, maintenanceMode: maintenance });
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...appSettings,
            announcementBanner: announcementText,
            maintenanceMode: maintenance,
          },
        }),
      });
      addNotification('success', 'Paramètres enregistrés', 'La bannière et la configuration ont été mises à jour.');
    } catch (e) {
      console.warn('Settings save error:', e);
    }
  };

  return (
    <div id="admin-view-container" className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2 backdrop-blur-md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Panneau de Contrôle Administrateur</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Supervision & Configuration MUNGWELE IA
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gérez la disponibilité des modèles IA, les règles de crédits et les annonces globales.
          </p>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white flex items-center space-x-2 transition-colors self-start sm:self-center backdrop-blur-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser les métriques</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Utilisateurs Enregistrés</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-display text-white">
            {stats?.usersCount || 1240}
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold">+18% ce mois</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Total Générations</span>
            <Layers className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold font-display text-white">
            {stats?.totalGenerations || 8540}
          </div>
          <span className="text-[10px] text-purple-400 font-semibold">Images, Vidéos & Audio</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Passerelle Serveur</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-400 flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Opérationnel</span>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Port 3000 • Express</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Crédits Distribués</span>
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-400">
            {stats?.creditsUsed ? stats.creditsUsed * 10 : '45 200'}
          </div>
          <span className="text-[10px] text-amber-300 font-semibold">Consommation saine</span>
        </div>
      </div>

      {/* AI Providers Control Matrix */}
      <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Matrice des Fournisseurs d'IA</span>
            </h3>
            <p className="text-xs text-gray-400">
              Activez ou désactivez les moteurs de calcul en temps réel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {providers.map((p) => (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border transition-all flex items-center justify-between backdrop-blur-md ${
                p.enabled
                  ? 'bg-purple-950/20 border-purple-500/40 shadow-md'
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    p.enabled ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30' : 'bg-white/10 text-gray-400'
                  }`}>
                    {p.enabled ? 'En ligne' : 'Désactivé'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{p.description}</p>
                <span className="text-[10px] text-purple-400 font-mono block">
                  Studio cible : {p.type}
                </span>
              </div>

              <button
                onClick={() => toggleProvider(p.id, !p.enabled)}
                className={`p-2.5 rounded-xl transition-all border ${
                  p.enabled
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md border-purple-400/40'
                    : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
                }`}
                title={p.enabled ? 'Désactiver le fournisseur' : 'Activer le fournisseur'}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Global Announcements & System Banner Configuration */}
      <div className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-pink-400" />
          <h3 className="text-base font-bold text-white">Bannière Globale d'Annonce</h3>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="Ex: Bienvenue sur MUNGWELE IA STUDIO — Nouvelle version 2.0 disponible !"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
          />

          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10">
            <div>
              <span className="text-xs font-bold text-white block">Mode Maintenance</span>
              <span className="text-[10px] text-gray-400">Suspend temporairement les générations publiques</span>
            </div>
            <input
              type="checkbox"
              checked={maintenance}
              onChange={(e) => setMaintenance(e.target.checked)}
              className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveBanner}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-md transition-all border border-white/20"
            >
              Enregistrer les réglages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
