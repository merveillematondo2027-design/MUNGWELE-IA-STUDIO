import React from 'react';
import { useApp } from '../../context/AppContext';
import { Home, FolderOpen, User, Image, Film, Music } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { activeTab, setActiveTab, setActiveStudio, generations } = useApp();

  const navClass = (active: boolean, activeColor = 'text-purple-400') =>
    `flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
      active ? `${activeColor} font-semibold` : 'text-gray-400'
    }`;

  return (
    <nav
      id="mobile-bottom-navbar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#081226]/90 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex items-center justify-around select-none shadow-2xl shadow-black/40"
    >
      <button id="mobile-nav-home" onClick={() => setActiveTab('home')} className={navClass(activeTab === 'home')}>
        <Home className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Accueil</span>
      </button>

      <button
        id="mobile-nav-studio-image"
        onClick={() => {
          setActiveStudio('image');
          setActiveTab('studio-image');
        }}
        className={navClass(activeTab === 'studio-image')}
      >
        <Image className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Image</span>
      </button>

      <button
        id="mobile-nav-studio-video"
        onClick={() => {
          setActiveStudio('video');
          setActiveTab('studio-video');
        }}
        className={navClass(activeTab === 'studio-video', 'text-pink-400')}
      >
        <Film className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Vidéo</span>
      </button>

      <button
        id="mobile-nav-studio-music"
        onClick={() => {
          setActiveStudio('music');
          setActiveTab('studio-music');
        }}
        className={navClass(activeTab === 'studio-music', 'text-blue-400')}
      >
        <Music className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Musique</span>
      </button>

      <button
        id="mobile-nav-creations"
        onClick={() => setActiveTab('creations')}
        className={`relative ${navClass(activeTab === 'creations')}`}
      >
        <FolderOpen className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Galerie</span>
        {generations.length > 0 && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-pink-500" />}
      </button>

      <button id="mobile-nav-profile" onClick={() => setActiveTab('profile')} className={navClass(activeTab === 'profile')}>
        <User className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Profil</span>
      </button>
    </nav>
  );
};
