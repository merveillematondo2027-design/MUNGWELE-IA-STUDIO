import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Film, FolderOpen, Image as ImageIcon, Music2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, StudioType } from '../../types';

const iconFor = (type: StudioType) => type === 'image' ? ImageIcon : type === 'video' ? Film : type === 'clips' ? Clapperboard : Music2;

export const LibraryView: React.FC = () => {
  const { generations, user, setActiveStudio, setActiveTab } = useApp();
  const [filter, setFilter] = useState<StudioType | 'all'>('all');
  const [query, setQuery] = useState('');

  const projects = useMemo(() => generations
    .filter((item) => (!user.id || item.userId === user.id) && (filter === 'all' || item.type === filter))
    .filter((item) => {
      const q = query.trim().toLowerCase();
      return !q || String(item.title || '').toLowerCase().includes(q) || String(item.prompt || '').toLowerCase().includes(q);
    })
    .sort((a,b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()), [generations, user.id, filter, query]);

  const resume = (project: GenerationRecord) => {
    sessionStorage.removeItem('mungwele.new.project');
    localStorage.setItem('mungwele.resume.project', JSON.stringify(project));
    setActiveStudio(project.type);
    setActiveTab(`studio-${project.type}` as any);
  };

  return <div className="mx-auto w-full max-w-6xl pb-20">
    <div className="mb-5 flex items-center gap-3"><button onClick={()=>setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-4 w-4"/></button><div><h1 className="flex items-center gap-2 text-2xl font-black text-white"><FolderOpen className="h-6 w-6 text-purple-300"/> Bibliothèque</h1><p className="mt-1 text-xs text-gray-500">Tous vos projets. Touchez un projet pour le reprendre dans son studio.</p></div></div>

    <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><div className="flex gap-1 overflow-x-auto">{(['all','image','video','clips','music'] as const).map((id)=><button key={id} onClick={()=>setFilter(id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${filter===id?'bg-purple-600 text-white':'text-gray-400'}`}>{id==='all'?'Tout':id==='image'?'Images':id==='video'?'Vidéos':id==='clips'?'Clips':'Musique'}</button>)}</div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher un projet…" className="w-full rounded-xl border border-white/10 bg-[#07101f] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600"/></div></div>

    {projects.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center"><FolderOpen className="mx-auto h-10 w-10 text-gray-700"/><p className="mt-3 text-sm font-bold text-gray-400">Aucun projet trouvé</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{projects.map((project)=>{const Icon=iconFor(project.type);return <button key={project.id} onClick={()=>resume(project)} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:border-purple-400/30 hover:bg-white/[0.05]"><div className="aspect-video overflow-hidden bg-black/30">{project.type==='image' && (project.thumbnailUrl||project.resultUrl)?<img src={project.thumbnailUrl||project.resultUrl} alt={project.title} className="h-full w-full object-cover"/>:(project.type==='video'||project.type==='clips') && (project.thumbnailUrl||project.resultUrl)?<video src={project.resultUrl} muted playsInline preload="metadata" controlsList="nodownload noplaybackrate" disablePictureInPicture className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center"><Icon className="h-10 w-10 text-gray-600"/></div>}</div><div className="p-3.5"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-purple-300"/><span className="text-[10px] font-black uppercase text-gray-500">{project.type}</span></div><h2 className="mt-2 line-clamp-1 text-sm font-black text-white">{project.title || 'Projet sans titre'}</h2><p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">{project.prompt}</p><div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-gray-600">{new Date(project.updatedAt||project.createdAt).toLocaleDateString('fr-FR')}</span><span className="font-black text-purple-200">Ouvrir le projet</span></div></div></button>})}</div>}
  </div>;
};
