import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab } from '../../types';
import { 
  Home, 
  Image as ImageIcon, 
  Film, 
  Music as MusicIcon, 
  FolderOpen, 
  CreditCard, 
  User, 
  HelpCircle, 
  ShieldAlert, 
  Sparkles,
  Zap,
  LogOut,
  Sliders
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setActiveStudio, 
    user, 
    credits, 
    generations,
    setIsAuthModalOpen 
  } = useApp();

  const mainNavItems = [
    { id: 'home', label: 'Accueil', icon: Home, badge: null },
    { 
      id: 'studio-image', 
      label: 'Studio Image', 
      icon: ImageIcon, 
      color: 'text-purple-400',
      action: () => {
        setActiveStudio('image');
        setActiveTab('studio-image');
      }
    },
    { 
      id: 'studio-video', 
      label: 'Studio Vidéo', 
      icon: Film, 
      badge: 'Veo 3',
      color: 'text-pink-400',
      action: () => {
        setActiveStudio('video');
        setActiveTab('studio-video');
      }
    },
    { 
      id: 'studio-music', 
      label: 'Studio Musique', 
      icon: MusicIcon, 
      badge: 'Suno',
      color: 'text-blue-400',
      action: () => {
        setActiveStudio('music');
        setActiveTab('studio-music');
      }
    },
    { 
      id: 'creations', 
      label: 'Mes créations', 
      icon: FolderOpen, 
      badge: generations.length > 0 ? `${generations.length}` : null 
    },
    { id: 'subscription', label: 'Abonnement', icon: CreditCard, badge: 'Pack' },
    { id: 'profile', label: 'Profil', icon: User, badge: null },
    { id: 'help', label: 'Aide & FAQ', icon: HelpCircle, badge: null },
  ];

  return (
    <aside 
      id="desktop-sidebar"
      className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-white/[0.02] backdrop-blur-2xl border-r border-white/10 p-4 justify-between select-none z-40 shadow-2xl"
    >
      {/* Brand Header */}
      <div>
        <div className="flex items-center space-x-3 px-2 py-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C3AED] via-[#2563EB] to-[#EC4899] flex items-center justify-center text-white shadow-xl shadow-purple-950/60 ring-2 ring-white/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base tracking-tight text-white leading-none">
              MUNGWELE
            </h1>
            <span className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 uppercase tracking-widest block mt-0.5">
              IA STUDIO
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                id={`sidebar-link-${item.id}`}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id as NavigationTab);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/[0.08] backdrop-blur-md text-white border border-white/20 shadow-lg shadow-purple-950/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] hover:border hover:border-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-white' : item.color || 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-gray-300 group-hover:bg-purple-950 group-hover:text-purple-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Admin Dashboard Entry */}
          <div className="pt-2">
            <button
              id="sidebar-link-admin"
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-rose-950/40 text-rose-200 border border-rose-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-rose-300 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Espace Admin</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-200 font-mono">
                PRO
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom User & Credits Widget */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        {/* Credit mini card */}
        <div 
          onClick={() => setActiveTab('subscription')}
          className="p-3 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 shadow-md cursor-pointer hover:bg-white/[0.07] hover:border-white/20 transition-all"
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400 font-medium">Solde crédits</span>
            <span className="font-bold text-amber-400 flex items-center space-x-1">
              <Zap className="w-3 h-3 fill-amber-400" />
              <span>{credits}</span>
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-purple-500 to-pink-500"
              style={{ width: `${Math.min(100, (credits / 500) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-purple-300 capitalize font-medium">Plan {user.plan}</span>
            <span className="text-pink-400 hover:underline font-semibold">Recharger</span>
          </div>
        </div>

        {/* User Mini Profile */}
        <div className="flex items-center justify-between px-1">
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center space-x-2.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-xl object-cover ring-2 ring-purple-500/30"
            />
            <div className="truncate text-left max-w-[110px]">
              <span className="text-xs font-semibold text-white truncate block">
                {user.name}
              </span>
              <span className="text-[10px] text-gray-400 truncate block">
                {user.email}
              </span>
            </div>
          </div>

          <button
            id="sidebar-auth-modal-btn"
            onClick={() => setIsAuthModalOpen(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-white/5 transition-colors"
            title="Connexion / Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
