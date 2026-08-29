import React from 'react';
import { ArrowRight, Film, Image as ImageIcon, Music as MusicIcon, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HomeView: React.FC = () => {
  const { setActiveStudio, setActiveTab, user } = useApp();

  const openStudio = (studio: 'image' | 'video' | 'music') => {
    setActiveStudio(studio);
    setActiveTab(`studio-${studio}` as any);
  };

  const modules = [
    {
      id: 'image' as const,
      title: 'Image',
      subtitle: 'Créer et modifier des images',
      description: 'Générez une image ou importez une référence puis décrivez seulement ce que vous voulez obtenir.',
      icon: ImageIcon,
      accent: 'from-purple-500/25 via-fuchsia-500/10 to-transparent',
      border: 'hover:border-purple-400/50',
      iconBg: 'bg-purple-500/15 border-purple-400/30 text-purple-200',
    },
    {
      id: 'video' as const,
      title: 'Vidéo Veo',
      subtitle: 'Créer une vidéo avec Veo',
      description: 'Prompt, image de départ si nécessaire, puis génération avec vos derniers réglages mémorisés.',
      icon: Film,
      accent: 'from-pink-500/25 via-rose-500/10 to-transparent',
      border: 'hover:border-pink-400/50',
      iconBg: 'bg-pink-500/15 border-pink-400/30 text-pink-200',
    },
    {
      id: 'music' as const,
      title: 'Musique',
      subtitle: 'Composer avec IA',
      description: 'Décrivez le morceau, choisissez vos réglages dans un panneau discret et lancez la production.',
      icon: MusicIcon,
      accent: 'from-blue-500/25 via-cyan-500/10 to-transparent',
      border: 'hover:border-blue-400/50',
      iconBg: 'bg-blue-500/15 border-blue-400/30 text-blue-200',
    },
  ];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-6xl flex-col justify-center py-8 sm:py-12">
      <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
        <div className="mb-5 flex justify-center">
          <img src="/branding/mungwele-ia-logo.png" alt="MUNGWELE IA STUDIO" className="h-24 w-24 rounded-3xl object-contain shadow-2xl sm:h-28 sm:w-28" />
        </div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-purple-200">
          <Sparkles className="h-3.5 w-3.5 text-pink-300" /> MUNGWELE IA STUDIO
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">Que voulez-vous créer ?</h1>
        <p className="mt-3 text-sm text-gray-400 sm:text-base">Créez avec l’intelligence artificielle MUNGWELE. Trois studios, une expérience simple.</p>
        <p className="mt-2 text-xs text-gray-600">Bonjour {user.name || 'créateur'}.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.id}
              onClick={() => openStudio(module.id)}
              className={`group relative min-h-[260px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] p-6 text-left shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.055] ${module.border}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${module.accent}`} />
              <div className="relative flex h-full flex-col justify-between gap-8">
                <div>
                  <div className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border ${module.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-black text-white">{module.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-gray-300">{module.subtitle}</p>
                  <p className="mt-4 text-xs leading-6 text-gray-500">{module.description}</p>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Ouvrir le studio</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition-transform group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
