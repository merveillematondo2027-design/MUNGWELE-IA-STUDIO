import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Film, Images, Music2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { StudioType } from '../../types';

export const GalleryView: React.FC = () => {
  const { generations, user, setActiveMediaModal, setActiveTab } = useApp();
  const [filter, setFilter] = useState<StudioType | 'all'>('all');
  const [query, setQuery] = useState('');
  const items = useMemo(() => generations
    .filter((item) => (!user.id || item.userId === user.id) && item.status === 'completed' && Boolean(item.resultUrl))
    .filter((item) => filter === 'all' || item.type === filter)
    .filter((item) => {
      const q=query.trim().toLowerCase();
      return !q || String(item.title||'').toLowerCase().includes(q) || String(item.prompt||'').toLowerCase().includes(q);
    })
    .sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()), [generations,user.id,filter,query]);

  return <div className="mx-auto w-full max-w-6xl pb-20">
    <div className="mb-5 flex items-center gap-3"><button onClick={()=>setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-4 w-4"/></button><div><h1 className="flex items-center gap-2 text-2xl font-black text-white"><Images className="h-6 w-6 text-cyan-300"/> Galerie</h1><p className="mt-1 text-xs text-gray-500">Vos contenus générés terminés, prêts à être visualisés.</p></div></div>
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2">{(['all','image','video','clips','music'] as const).map(id=><button key={id} onClick={()=>setFilter(id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${filter===id?'bg-cyan-600 text-white':'text-gray-400'}`}>{id==='all'?'Tout':id==='image'?'Images':id==='video'?'Vidéos':id==='clips'?'Clips':'Musique'}</button>)}</div>
    <div className="relative mb-5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher dans la galerie…" className="w-full rounded-2xl border border-white/10 bg-[#07101f] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600"/></div>
    {items.length===0?<div className="rounded-3xl border border-dashed border-white/10 py-20 text-center"><Images className="mx-auto h-10 w-10 text-gray-700"/><p className="mt-3 text-sm font-bold text-gray-400">Aucun contenu dans la galerie</p></div>:<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{items.map(item=><button key={item.id} onClick={()=>setActiveMediaModal(item)} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left"><div className="aspect-square">{item.type==='image'?<img src={item.thumbnailUrl||item.resultUrl} alt={item.title} className="h-full w-full object-cover"/>:item.type==='video'||item.type==='clips'?<video src={item.resultUrl} muted playsInline preload="metadata" controlsList="nodownload noplaybackrate" disablePictureInPicture className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-950 to-purple-950"><Music2 className="h-10 w-10 text-blue-300"/></div>}</div><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8"><p className="line-clamp-1 text-[11px] font-black text-white">{item.title}</p><div className="mt-1 flex items-center gap-1 text-[9px] text-gray-300">{item.type==='video'?<Film className="h-3 w-3"/>:item.type==='clips'?<Clapperboard className="h-3 w-3"/>:null}<span>{item.type}</span></div></div></button>)}</div>}
  </div>;
};
