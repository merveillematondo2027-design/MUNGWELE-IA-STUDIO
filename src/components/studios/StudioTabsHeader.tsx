import React from 'react';
import { StudioType } from '../../types';
import { useApp } from '../../context/AppContext';
import { Image as ImageIcon, Film, Clapperboard, Music as MusicIcon } from 'lucide-react';
import { motion } from 'motion/react';

export const StudioTabsHeader: React.FC = () => {
  const { activeStudio, setActiveStudio, setActiveTab } = useApp();

  const tabs: { id: StudioType; label: string; subLabel: string; icon: any; gradient: string }[] = [
    { id: 'image', label: 'Image', subLabel: 'OpenAI Image', icon: ImageIcon, gradient: 'from-purple-600 to-indigo-600' },
    { id: 'video', label: 'Vidéo', subLabel: 'Routeur multi-moteurs', icon: Film, gradient: 'from-pink-600 to-rose-600' },
    { id: 'clips', label: 'Clips', subLabel: 'Musique vers vidéo', icon: Clapperboard, gradient: 'from-fuchsia-600 to-violet-600' },
    { id: 'music', label: 'Musique', subLabel: 'Eleven Music', icon: MusicIcon, gradient: 'from-blue-600 to-cyan-600' },
  ];

  const handleSelect = (id: StudioType) => {
    setActiveStudio(id);
    setActiveTab(`studio-${id}` as any);
  };

  return (
    <div id="studio-tabs-header" className="mx-auto mb-6 w-full max-w-5xl px-2">
      <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-xl shadow-black/40 backdrop-blur-2xl sm:gap-3">
        {tabs.map((tab) => {
          const isActive = activeStudio === tab.id;
          const Icon = tab.icon;
          return (
            <button key={tab.id} id={`tab-select-${tab.id}`} onClick={() => handleSelect(tab.id)} className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-2.5 transition-all duration-200 sm:flex-row sm:gap-3 sm:py-3.5 ${isActive ? 'text-white shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}>
              {isActive && <motion.div layoutId="activeStudioTabIndicator" className={`absolute inset-0 rounded-xl border border-white/20 bg-gradient-to-r ${tab.gradient}`} transition={{ type: 'spring', stiffness: 450, damping: 35 }} />}
              <Icon className="relative z-10 mb-1 h-4 w-4 sm:mb-0 sm:h-5 sm:w-5" />
              <div className="relative z-10 text-center sm:text-left"><div className="text-[10px] font-bold leading-tight sm:text-sm">{tab.label}</div><div className={`hidden text-[10px] font-medium sm:block ${isActive ? 'text-white/80' : 'text-gray-500'}`}>{tab.subLabel}</div></div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
