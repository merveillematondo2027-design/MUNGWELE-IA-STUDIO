import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Image as ImageIcon, 
  Film, 
  Music as MusicIcon, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Flame, 
  Layers, 
  FolderOpen,
  Wand2,
  CheckCircle2,
  Play
} from 'lucide-react';
import { StudioTabsHeader } from '../studios/StudioTabsHeader';

export const HomeView: React.FC = () => {
  const { setActiveStudio, setActiveTab, generations, setActiveMediaModal, credits } = useApp();

  const recentCreations = generations.slice(0, 6);

  return (
    <div id="home-view-container" className="w-full max-w-6xl mx-auto space-y-12 pb-20">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 p-6 sm:p-12 shadow-2xl">
        {/* Glow backdrop effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/15 text-purple-200 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            <span>Moteur Multi-IA de Dernière Génération</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-tight">
            Imaginez. Générez. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
              Créez sans limites.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl font-light">
            <strong>MUNGWELE IA STUDIO</strong> rassemble le summum de l'intelligence artificielle générative : 
            créez des images photoréalistes 8K, animez des vidéos cinématiques avec <strong>Google Veo 3</strong> et composez des morceaux de musique studio avec <strong>Suno AI</strong>.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              id="hero-btn-image-studio"
              onClick={() => {
                setActiveStudio('image');
                setActiveTab('studio-image');
              }}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center space-x-2 shadow-xl shadow-purple-950/60 transition-all active:scale-95 border border-white/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ouvrir un Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              id="hero-btn-view-creations"
              onClick={() => setActiveTab('creations')}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-white/[0.05] hover:bg-white/[0.1] backdrop-blur-md border border-white/15 text-gray-200 hover:text-white flex items-center space-x-2 transition-all shadow-md"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Voir la galerie ({generations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Studios Cards Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
              Nos 3 Studios de Création
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Basculez instantanément entre les formats pour vos projets créatifs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Image Studio */}
          <div
            id="home-card-image"
            onClick={() => {
              setActiveStudio('image');
              setActiveTab('studio-image');
            }}
            className="group relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/50 hover:bg-white/[0.06] p-6 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                  Studio Image
                </h3>
                <span className="text-xs text-purple-400 font-mono font-medium">
                  Google Imagen 3 & 4K
                </span>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Rendu visuel haute précision, ratios personnalisés, variantes instantanées et transfert direct vers la vidéo.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span>Créer une image</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Video Studio */}
          <div
            id="home-card-video"
            onClick={() => {
              setActiveStudio('video');
              setActiveTab('studio-video');
            }}
            className="group relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-pink-500/50 hover:bg-white/[0.06] p-6 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-600/20 border border-pink-500/40 text-pink-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors">
                  Studio Vidéo
                </h3>
                <span className="text-xs text-pink-400 font-mono font-medium">
                  Google Veo 3 Cinématique
                </span>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Génération cinématique 5s à 10s, mouvements de drone, physique réaliste et interpolation Image-to-Video.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-xs font-semibold text-pink-400 group-hover:text-pink-300">
              <span>Produire une vidéo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Music Studio */}
          <div
            id="home-card-music"
            onClick={() => {
              setActiveStudio('music');
              setActiveTab('studio-music');
            }}
            className="group relative rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-blue-500/50 hover:bg-white/[0.06] p-6 shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MusicIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                  Studio Musique
                </h3>
                <span className="text-xs text-blue-400 font-mono font-medium">
                  Suno AI & Arrangements Stéréo
                </span>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Afrobeats, Electro, Hip-hop, Lo-fi... Paroles écrites par IA ou instrumentaux purs avec mastering 3D.
                </p>
              </div>
            </div>

            <div className="pt-6 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span>Composer un morceau</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl">
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30 shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Prompt Master IA</h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Enrichissez vos idées brutes en descriptions techniques de haut vol en un clic.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-pink-950/60 text-pink-400 border border-pink-500/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Sécurité & Clés Serveur</h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Vos requêtes transitent par une passerelle sécurisée sans exposer vos données.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 rounded-xl bg-blue-950/60 text-blue-400 border border-blue-500/30 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Crédits & Remboursement</h4>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
              Validation stricte et remboursement automatique garanti en cas d'erreur de rendu.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Community / User Showcase Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">
              Dernières Créations Récentes
            </h3>
            <p className="text-xs text-gray-400">
              Découvrez les dernières productions sorties de nos 3 studios
            </p>
          </div>

          <button
            onClick={() => setActiveTab('creations')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
          >
            <span>Toute la galerie</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentCreations.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveMediaModal(item)}
              className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] overflow-hidden shadow-xl cursor-pointer transition-all duration-200"
            >
              <div className="relative aspect-video overflow-hidden bg-black/50">
                <img
                  src={item.thumbnailUrl || item.resultUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white uppercase border border-white/10">
                  {item.type === 'image' ? 'Image' : item.type === 'video' ? 'Vidéo Veo 3' : 'Audio Suno'}
                </div>
              </div>

              <div className="p-3.5">
                <h4 className="text-xs font-bold text-white line-clamp-1">
                  {item.title}
                </h4>
                <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                  {item.prompt}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
