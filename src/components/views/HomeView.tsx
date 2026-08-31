import React from 'react';
import { ArrowRight, Clapperboard, Film, Image as ImageIcon, Music as MusicIcon, Sparkles, WalletCards } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { StudioType } from '../../types';
import officialLogo from '../../assets/mungwele-ai-official-logo.svg';
import { CommunityFeed } from '../community/CommunityFeed';

export const HomeView: React.FC = () => {
  const { setActiveStudio, setActiveTab, user } = useApp();

  const openStudio = (studio: StudioType) => {
    localStorage.removeItem('mungwele.resume.project');
    sessionStorage.setItem('mungwele.new.project', studio);
    setActiveStudio(studio);
    setActiveTab(`studio-${studio}` as any);
  };

  const modules = [
    { id: 'image' as const, title: 'Image', subtitle: 'Créer & modifier', icon: ImageIcon, accent: 'from-purple-500/25 to-fuchsia-500/5', iconBg: 'bg-purple-500/15 border-purple-400/30 text-purple-200' },
    { id: 'video' as const, title: 'Vidéo', subtitle: 'Génération vidéo IA', icon: Film, accent: 'from-pink-500/25 to-rose-500/5', iconBg: 'bg-pink-500/15 border-pink-400/30 text-pink-200' },
    { id: 'clips' as const, title: 'Clips Vidéo', subtitle: 'Musique → clip', icon: Clapperboard, accent: 'from-fuchsia-500/25 to-violet-500/5', iconBg: 'bg-fuchsia-500/15 border-fuchsia-400/30 text-fuchsia-200' },
    { id: 'music' as const, title: 'Musique', subtitle: 'Composer avec IA', icon: MusicIcon, accent: 'from-blue-500/25 to-cyan-500/5', iconBg: 'bg-blue-500/15 border-blue-400/30 text-blue-200' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl pb-12 pt-2 sm:pt-6">
      <div className="mx-auto mb-6 max-w-2xl text-center sm:mb-8">
        <div className="mb-2 flex justify-center"><img src={officialLogo} alt="MUNGWELE AI STUDIO" className="h-24 w-48 object-contain drop-shadow-2xl sm:h-28 sm:w-60" /></div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-purple-200"><Sparkles className="h-3 w-3 text-pink-300" /> MUNGWELE AI STUDIO</div>
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl">Que voulez-vous créer ?</h1>
        <p className="mt-2 text-xs text-gray-500 sm:text-sm">Choisissez un studio et commencez directement votre génération.</p>
        {user.id && <p className="mt-1 text-[11px] text-gray-700">Bonjour {user.name || 'créateur'}.</p>}
      </div>

      {user.id && <button onClick={()=>setActiveTab('subscription')} className="mx-auto mb-4 flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.06] px-3 py-1.5 text-[11px] font-black text-amber-200"><WalletCards className="h-3.5 w-3.5"/><span>{user.role === 'admin' ? 'Crédits illimités' : `${Math.max(0, Number(user.credits || 0)).toLocaleString('fr-FR')} crédits`}</span></button>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button key={module.id} onClick={() => openStudio(module.id)} className="group relative min-h-[118px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left shadow-lg transition hover:-translate-y-0.5 hover:bg-white/[0.055] sm:min-h-[145px] sm:p-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${module.accent}`} />
              <div className="relative flex h-full flex-col justify-between gap-3">
                <div>
                  <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${module.iconBg}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
                  <h2 className="text-sm font-black text-white sm:text-lg">{module.title}</h2>
                  <p className="mt-0.5 text-[9px] font-semibold leading-3 text-gray-400 sm:text-[11px]">{module.subtitle}</p>
                </div>
                <div className="flex items-center justify-between text-[9px] font-bold text-white/80 sm:text-[10px]"><span>Créer maintenant</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-center text-[11px] leading-5 text-gray-500">MUNGWELE choisit automatiquement le moteur adapté au résultat demandé. Les réglages restent disponibles dans chaque studio.</div>

      <CommunityFeed compact />
    </div>
  );
};
