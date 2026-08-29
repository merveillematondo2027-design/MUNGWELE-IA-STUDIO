import React, { useEffect, useState } from 'react';
import { ArrowLeft, Film, Globe2, Image as ImageIcon, Loader2, Music2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord } from '../../types';

export const CommunityView: React.FC = () => {
  const { setActiveTab, setActiveMediaModal } = useApp();
  const [items, setItems] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/community')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Community unavailable')))
      .then((data) => setItems(Array.isArray(data?.generations) ? data.generations : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => setActiveTab('home')} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300"><ArrowLeft className="h-4 w-4" /></button>
        <div>
          <div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-cyan-300" /><h1 className="text-xl font-black text-white sm:text-2xl">Communauté</h1></div>
          <p className="mt-1 text-xs text-gray-500">Créations que les utilisateurs ont choisi de rendre publiques.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.025] text-center">
          <Globe2 className="mb-3 h-8 w-8 text-cyan-300/70" />
          <p className="text-sm font-black text-white">Aucune publication pour le moment</p>
          <p className="mt-2 max-w-sm px-6 text-xs leading-5 text-gray-500">Les créations publiées depuis les projets apparaîtront ici.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <button key={item.id} onClick={() => setActiveMediaModal(item)} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:border-cyan-400/30 hover:bg-white/[0.05]">
              <div className="relative aspect-video overflow-hidden bg-black/30">
                {item.type === 'music' ? (
                  <div className="flex h-full items-center justify-center"><Music2 className="h-10 w-10 text-blue-300/70" /></div>
                ) : (
                  <img src={item.thumbnailUrl || item.resultUrl} alt={item.title} className="h-full w-full object-cover" />
                )}
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2 py-1 text-[9px] font-bold text-white">
                  {item.type === 'image' ? <ImageIcon className="h-3 w-3" /> : item.type === 'video' ? <Film className="h-3 w-3" /> : <Music2 className="h-3 w-3" />}
                  {item.type === 'image' ? 'Image' : item.type === 'video' ? 'Vidéo' : 'Musique'}
                </span>
              </div>
              <div className="p-3.5">
                <h2 className="line-clamp-1 text-sm font-black text-white">{item.title || 'Création MUNGWELE'}</h2>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">{item.prompt}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-600"><span>{item.authorName || 'Créateur MUNGWELE'}</span><span>Public</span></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
