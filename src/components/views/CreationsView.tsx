import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StudioType, GenerationRecord } from '../../types';
import { 
  FolderOpen, 
  Search, 
  Filter, 
  Image as ImageIcon, 
  Film, 
  Music as MusicIcon, 
  Download, 
  Trash2, 
  Share2, 
  Maximize2, 
  Copy, 
  Check, 
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

export const CreationsView: React.FC = () => {
  const { generations, removeGeneration, setActiveMediaModal, addNotification, setActiveStudio, setActiveTab } = useApp();
  const [filterType, setFilterType] = useState<StudioType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const filtered = generations
    .filter((item) => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.prompt.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const countImages = generations.filter((g) => g.type === 'image').length;
  const countVideos = generations.filter((g) => g.type === 'video').length;
  const countMusics = generations.filter((g) => g.type === 'music').length;

  return (
    <div id="creations-view-container" className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white flex items-center space-x-3">
            <span className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
              <FolderOpen className="w-6 h-6" />
            </span>
            <span>Bibliothèque de Créations</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gérez, téléchargez et prévisualisez toutes vos réalisations IA en un seul endroit.
          </p>
        </div>

        {/* Quick studio launcher */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setActiveStudio('image');
              setActiveTab('studio-image');
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white flex items-center space-x-1.5 shadow-lg border border-white/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nouvelle création</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-xl">
        {/* Type Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filterType === 'all'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Tout ({generations.length})
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              filterType === 'image'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images ({countImages})</span>
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              filterType === 'video'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Vidéos ({countVideos})</span>
          </button>
          <button
            onClick={() => setFilterType('music')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              filterType === 'music'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MusicIcon className="w-3.5 h-3.5" />
            <span>Musiques ({countMusics})</span>
          </button>
        </div>

        {/* Search Input & Sort */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par mot-clé..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white placeholder-gray-400 outline-none focus:border-purple-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-gray-200 outline-none focus:border-purple-500"
          >
            <option value="newest" className="bg-[#081226] text-white">Plus récent</option>
            <option value="oldest" className="bg-[#081226] text-white">Plus ancien</option>
          </select>
        </div>
      </div>

      {/* Grid of creations */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10 space-y-3">
          <FolderOpen className="w-14 h-14 text-gray-600 mx-auto" />
          <h3 className="text-base font-bold text-gray-300">Aucune création trouvée</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Aucun résultat ne correspond à votre recherche.'
              : 'Commencez à explorer les studios pour générer du contenu.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => {
            const isImage = item.type === 'image';
            const isVideo = item.type === 'video';
            const isMusic = item.type === 'music';

            return (
              <div
                key={item.id}
                id={`gallery-item-${item.id}`}
                className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] overflow-hidden shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                {/* Media Preview Box */}
                <div 
                  className="relative aspect-video bg-black/40 overflow-hidden cursor-pointer"
                  onClick={() => setActiveMediaModal(item)}
                >
                  <img
                    src={item.thumbnailUrl || item.resultUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white shadow-md ${
                      isImage ? 'bg-purple-600' : isVideo ? 'bg-pink-600' : 'bg-blue-600'
                    }`}>
                      {item.type}
                    </span>
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaModal(item);
                      }}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                      title="Plein écran"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const a = document.createElement('a');
                        a.href = item.resultUrl;
                        a.download = `mungwele-${item.type}-${item.id}`;
                        a.click();
                      }}
                      className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.prompt}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-800">
                    <span>{new Date(item.createdAt).toLocaleDateString('fr-FR')}</span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(item.prompt);
                          addNotification('info', 'Prompt copié', 'Le prompt a été copié.');
                        }}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Copier le prompt"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => removeGeneration(item.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-900/40 text-gray-400 hover:text-rose-400 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
