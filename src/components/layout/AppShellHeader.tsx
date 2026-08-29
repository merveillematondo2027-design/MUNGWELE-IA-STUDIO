import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, Menu, X, UserRound, LogOut, Images, CreditCard, CircleHelp, Settings, Shield, Globe2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import brandLogo from '../../assets/mungwele-brand.svg';

export const AppShellHeader: React.FC<{ studioMode?: boolean }> = ({ studioMode = false }) => {
  const { user, setActiveTab } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const goHome = () => {
    setActiveTab('home');
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const go = (tab: any) => {
    setActiveTab(tab);
    setMenuOpen(false);
    setProfileOpen(false);
  };

  const logout = async () => {
    await auth.signOut();
    setProfileOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d1b]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {studioMode && (
              <button onClick={goHome} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white" title="Retour à l'accueil"><ArrowLeft className="h-4 w-4" /></button>
            )}
            <button onClick={goHome} className="flex min-w-0 items-center gap-2 text-left">
              <img src={brandLogo} alt="MUNGWELE IA STUDIO" className="h-10 w-12 object-contain drop-shadow-lg" />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-black tracking-wide text-white">MUNGWELE IA STUDIO</p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">Create with AI</p>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setMenuOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-gray-200 hover:bg-white/[0.08]"><Menu className="h-4 w-4" /><span className="hidden sm:inline">Menu</span></button>
            <div className="relative">
              <button onClick={() => setProfileOpen((v) => !v)} className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-2 text-left hover:bg-white/[0.08]">
                {user.avatar ? <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-lg object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500"><UserRound className="h-4 w-4 text-white" /></span>}
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1324] p-2 shadow-2xl">
                  <div className="mb-1 border-b border-white/10 px-3 py-2"><p className="truncate text-xs font-bold text-white">{user.name || 'Compte MUNGWELE'}</p><p className="truncate text-[10px] text-gray-500">{user.email}</p></div>
                  <button onClick={() => go('profile')} className="w-full rounded-xl px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06]">Mon profil</button>
                  <button onClick={() => go('subscription')} className="w-full rounded-xl px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06]">Mes crédits & abonnement</button>
                  {user.role === 'admin' && <button onClick={() => go('admin')} className="w-full rounded-xl px-3 py-2 text-left text-xs text-purple-300 hover:bg-purple-500/10">Administration</button>}
                  <button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10"><LogOut className="h-3.5 w-3.5" /> Se déconnecter</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <aside className="h-full w-full max-w-sm border-l border-white/10 bg-[#09111f] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-black text-white">Menu</p><p className="text-[11px] text-gray-500">Navigation MUNGWELE IA STUDIO.</p></div><button onClick={() => setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div>
            <div className="space-y-1">
              <button onClick={() => go('community')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><Globe2 className="h-4 w-4 text-cyan-300" /> Communauté</button>
              <button onClick={() => go('creations')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><Images className="h-4 w-4 text-purple-300" /> Galerie</button>
              <button onClick={() => go('subscription')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><CreditCard className="h-4 w-4 text-pink-300" /> Abonnements & crédits</button>
              <button onClick={() => go('profile')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><Settings className="h-4 w-4 text-blue-300" /> Profil & paramètres</button>
              <button onClick={() => go('help')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><CircleHelp className="h-4 w-4 text-cyan-300" /> Aide</button>
              {user.role === 'admin' && <button onClick={() => go('admin')} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm font-bold text-purple-200 hover:bg-purple-500/15"><Shield className="h-4 w-4" /> Administration générale</button>}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
