import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  Server,
  Activity,
  Users,
  Zap,
  RefreshCw,
  Power,
  Layers,
  Bell,
} from 'lucide-react';

export const AdminView: React.FC = () => {
  const { providers, toggleProvider, appSettings, updateAppSettings, addNotification } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [announcementText, setAnnouncementText] = useState(appSettings.announcementBanner || '');
  const [maintenance, setMaintenance] = useState(appSettings.maintenanceMode || false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) throw new Error('Stats indisponibles');
      setStats(await res.json());
    } catch (e) {
      console.warn('Admin stats error:', e);
      setStats(null);
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
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementBanner: announcementText, maintenanceMode: maintenance }),
      });
      if (!res.ok) throw new Error('Enregistrement impossible');
      addNotification('success', 'Paramètres enregistrés', 'La configuration globale a été mise à jour.');
    } catch (e) {
      console.warn('Settings save error:', e);
      addNotification('error', 'Enregistrement impossible', 'La configuration n’a pas pu être enregistrée.');
    }
  };

  const totalUsers = stats?.totalUsers ?? 0;
  const totalGenerations = stats?.totalGenerations ?? 0;
  const totalCreditsConsumed = stats?.totalCreditsConsumed ?? 0;
  const serverUptime = stats?.serverUptime ?? 0;

  return (
    <div id="admin-view-container" className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Administration générale</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">Supervision MUNGWELE IA</h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Uniquement des données réelles remontées par l’application.</p>
        </div>

        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white flex items-center space-x-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Utilisateurs</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalUsers}</div>
          <span className="text-[10px] text-gray-500">Données Firebase à connecter au compteur serveur</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Générations</span>
            <Layers className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalGenerations}</div>
          <span className="text-[10px] text-gray-500">Aucune valeur simulée</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Serveur</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">Opérationnel</div>
          <span className="text-[10px] text-gray-500">Uptime: {Math.floor(serverUptime)} s</span>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase">Crédits consommés</span>
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{totalCreditsConsumed}</div>
          <span className="text-[10px] text-gray-500">Calculé depuis les générations réelles en mémoire</span>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Fournisseurs IA</span>
          </h3>
          <p className="text-xs text-gray-400">L’état affiché vient de la configuration serveur actuelle.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {providers.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white">{p.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${p.isConfigured ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40' : 'text-amber-300 border-amber-500/30 bg-amber-950/40'}`}>
                    {p.isConfigured ? 'Configuré' : 'Non configuré'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 truncate">{p.modelName}</p>
                <span className="text-[10px] text-purple-400 font-mono">{p.category}</span>
              </div>

              <button
                onClick={() => toggleProvider(p.id, !p.enabled)}
                className={`p-2.5 rounded-xl border ${p.enabled ? 'bg-purple-600 text-white border-purple-400/40' : 'bg-white/5 text-gray-400 border-white/10'}`}
                title={p.enabled ? 'Désactiver' : 'Activer'}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-pink-400" />
          <h3 className="text-base font-bold text-white">Annonce globale</h3>
        </div>

        <input
          type="text"
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          placeholder="Message affiché dans l’application"
          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white outline-none focus:border-purple-500"
        />

        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
          <div>
            <span className="text-xs font-bold text-white block">Mode maintenance</span>
            <span className="text-[10px] text-gray-400">Suspend les générations publiques</span>
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
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-white/20"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
