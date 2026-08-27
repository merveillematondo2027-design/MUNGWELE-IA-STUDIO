import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavigationTab, StudioType } from '../../types';
import { Home, Sparkles, FolderOpen, CreditCard, User, Image, Film, Music } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, activeStudio, setActiveStudio, generations } = useApp();

  const isStudioTab = activeTab.startsWith('studio-');

  return (
    <nav 
      id="mobile-bottom-navbar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/[0.04] backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around select-none shadow-2xl shadow-black/40"
    >
      {/* Home */}
      <button
        id="mobile-nav-home"
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'home' ? 'text-purple-400 font-semibold' : 'text-gray-400'
        }`}
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Accueil</span>
      </button>

      {/* Studios Quick Access */}
      <button
        id="mobile-nav-studio-image"
        onClick={() => {
          setActiveStudio('image');
          setActiveTab('studio-image');
        }}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'studio-image' ? 'text-purple-400 font-semibold' : 'text-gray-400'
        }`}
      >
        <Image className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Image</span>
      </button>

      {/* Video Studio (Veo 3) Central Prominent Button */}
      <button
        id="mobile-nav-studio-video"
        onClick={() => {
          setActiveStudio('video');
          setActiveTab('studio-video');
        }}
        className="relative -top-3 flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white shadow-xl shadow-purple-950/60 ring-4 ring-[#081226] active:scale-95 transition-transform"
      >
        <Film className="w-5 h-5" />
        <span className="text-[9px] font-bold mt-0.5">Veo 3</span>
      </button>

      {/* Music Studio */}
      <button
        id="mobile-nav-studio-music"
        onClick={() => {
          setActiveStudio('music');
          setActiveTab('studio-music');
        }}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'studio-music' ? 'text-blue-400 font-semibold' : 'text-gray-400'
        }`}
      >
        <Music className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Musique</span>
      </button>

      {/* Creations Library */}
      <button
        id="mobile-nav-creations"
        onClick={() => setActiveTab('creations')}
        className={`relative flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'creations' ? 'text-purple-400 font-semibold' : 'text-gray-400'
        }`}
      >
        <FolderOpen className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Galerie</span>
        {generations.length > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-pink-500" />
        )}
      </button>

      {/* Profile */}
      <button
        id="mobile-nav-profile"
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
          activeTab === 'profile' ? 'text-purple-400 font-semibold' : 'text-gray-400'
        }`}
      >
        <User className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Profil</span>
      </button>
    </nav>
  );
};
