import React, { useMemo, useState } from 'react';
import { ArrowLeft, Images, Music2, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, StudioType } from '../../types';

export const GalleryView: React.FC = () => {
  const { generations, user, setActiveTab } = useApp();
  const [filter, setFilter] = useState<StudioType | 'all'>('all');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<GenerationRecord | null>(null);

  const items = useMemo(() => generations
    .filter((item) => (!user.id || item.userId === user.id) && item.status === 'completed' && Boolean(item.resultUrl))
    .filter((item) => filter === 'all' || item.type === filter)
    .filter((item) => {
      const q = query.trim().toLowerCase();
      return !q || String(item.title || '').toLowerCase().includes(q) || String(item.prompt || '').toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [generations, user.id, filter, query]);

  return <div className="mx-auto w-full max-w-6xl pb-20">
    <div className="mb-5 flex items-center gap-3">
      <button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-4 w-4" /></button>
      <div><h1 className="flex items-center gap-2 text-2xl font-black text-white"><Images className="h-6 w-6 text-cyan-300" /> Galerie</h1><p className="mt-1 text-xs text-gray-500">Vos créations, directement. Les détails restent dans la Bibliothèque.</p></div>
    </div>

    <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2">
      {(['all', 'image', 'video', 'clips', 'music'] as const).map((id) => <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${filter === id ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>{id === 'all' ? 'Tout' : id === 'image' ? 'Images' : id === 'video' ? 'Vidéos' : id === 'clips' ? 'Clips' : 'Musique'}</button>)}
    </div>

    <div className="relative mb-5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans la galerie…" className="w-full rounded-2xl border border-white/10 bg-[#07101f] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600" /></div>

    {items.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center"><Images className="mx-auto h-10 w-10 text-gray-700" /><p className="mt-3 text-sm font-bold text-gray-400">Aucun contenu dans la galerie</p></div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        if (item.type === 'image') return <button key={item.id} type="button" onClick={() => setPreview(item)} aria-label={`Voir ${item.title || 'image'}`} className="group overflow-hidden rounded-2xl bg-black/30"><div className="aspect-square"><img src={item.thumbnailUrl || item.resultUrl} alt={item.title || 'Création MUNGWELE'} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" /></div></button>;
        if (item.type === 'video' || item.type === 'clips') return <div key={item.id} className="overflow-hidden rounded-2xl bg-black"><div className="aspect-square"><video src={item.resultUrl} poster={item.thumbnailUrl} controls playsInline preload="metadata" className="h-full w-full object-cover" /></div></div>;
        return <div key={item.id} className="flex aspect-square flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#0b1424] p-4"><Music2 className="mb-4 h-9 w-9 text-blue-300" /><audio src={item.resultUrl} controls preload="metadata" className="w-full" /></div>;
      })}
    </div>}

    {preview && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-3" onClick={() => setPreview(null)}>
      <button type="button" onClick={() => setPreview(null)} className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 text-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
      <img src={preview.resultUrl} alt={preview.title || 'Création MUNGWELE'} className="max-h-[92vh] max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
    </div>}
  </div>;
};
