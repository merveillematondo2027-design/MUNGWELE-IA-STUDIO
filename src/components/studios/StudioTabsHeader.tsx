import React from 'react';
import { StudioType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Image as ImageIcon, Film, Music as MusicIcon, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export const StudioTabsHeader: React.FC = () => {
  const { activeStudio, setActiveStudio, setActiveTab } = useApp();

  const tabs: { id: StudioType; label: string; subLabel: string; icon: any; color: string; gradient: string }[] = [
    {
      id: 'image',
      label: 'Studio Image',
      subLabel: 'Google Imagen 3 & 4K',
      icon: ImageIcon,
      color: '#7C3AED',
      gradient: 'from-purple-600 to-indigo-600',
    },
    {
      id: 'video',
      label: 'Studio Vidéo',
      subLabel: 'Google Veo 3 Cinématique',
      icon: Film,
      color: '#EC4899',
      gradient: 'from-pink-600 to-rose-600',
    },
    {
      id: 'music',
      label: 'Studio Musique',
      subLabel: 'Suno AI & Lyria Stéréo',
      icon: MusicIcon,
      color: '#2563EB',
      gradient: 'from-blue-600 to-cyan-600',
    },
  ];

  const handleSelect = (id: StudioType) => {
    setActiveStudio(id);
    setActiveTab(`studio-${id}` as any);
  };

  return (
    <div id="studio-tabs-header" className="w-full max-w-4xl mx-auto mb-6 px-2">
      <div className="grid grid-cols-3 gap-2 sm:gap-3 p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl shadow-xl shadow-black/40">
        {tabs.map((tab) => {
          const isActive = activeStudio === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              id={`tab-select-${tab.id}`}
              onClick={() => handleSelect(tab.id)}
              className={`relative flex flex-col sm:flex-row items-center justify-center sm:space-x-3 py-2.5 sm:py-3.5 px-3 rounded-xl transition-all duration-200 outline-none select-none ${
                isActive
                  ? 'text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeStudioTabIndicator"
                  className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.gradient} shadow-lg shadow-purple-950/40 border border-white/20`}
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex items-center justify-center mb-1 sm:mb-0">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              </div>

              <div className="relative z-10 text-center sm:text-left">
                <div className="text-xs sm:text-sm font-bold leading-tight">
                  {tab.label}
                </div>
                <div className={`text-[10px] hidden sm:block font-medium ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                  {tab.subLabel}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
