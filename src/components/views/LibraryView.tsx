import React, { useMemo, useState } from 'react';
import { ArrowLeft, Clapperboard, Eye, Film, FolderOpen, Image as ImageIcon, Music2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, StudioType } from '../../types';

const iconFor = (type: StudioType) => type === 'image' ? ImageIcon : type === 'video' ? Film : type === 'clips' ? Clapperboard : Music2;

export const LibraryView: React.FC = () => {
  const { generations, user, setActiveStudio, setActiveTab, setActiveMediaModal } = useApp();
  const [filter, setFilter] = useState<StudioType | 'all'>('all');
  const [query, setQuery] = useState('');

  const projects = useMemo(() => generations
    .filter((item) => (!user.id || item.userId === user.id) && (filter === 'all' || item.type === filter))
    .filter((item) => {
      const q = query.trim().toLowerCase();
      return !q || String(item.title || '').toLowerCase().includes(q) || String(item.prompt || '').toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()), [generations, user.id, filter, query]);

  const resume = (project: GenerationRecord) => {
    sessionStorage.removeItem('mungwele.new.project');
    localStorage.setItem('mungwele.resume.project', JSON.stringify(project));
    setActiveStudio(project.type);
    setActiveTab(`studio-${project.type}` as any);
  };

  return <div className="mx-auto w-full max-w-6xl pb-20">
    <div className="mb-5 flex items-center gap-3"><button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="flex items-center gap-2 text-2xl font-black text-white"><FolderOpen className="h-6 w-6 text-purple-300" /> Bibliothèque</h1><p className="mt-1 text-xs text-gray-500">Vos projets avec leurs informations, paramètres et actions.</p></div></div>

    <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3"><div className="flex gap-1 overflow-x-auto">{(['all', 'image', 'video', 'clips', 'music'] as const).map((id) => <button key={id} onClick={() => setFilter(id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs font-bold ${filter === id ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>{id === 'all' ? 'Tout' : id === 'image' ? 'Images' : id === 'video' ? 'Vidéos' : id === 'clips' ? 'Clips' : 'Musique'}</button>)}</div><div className="relative mt-3"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un projet…" className="w-full rounded-xl border border-white/10 bg-[#07101f] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600" /></div></div>

    {projects.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 py-20 text-center"><FolderOpen className="mx-auto h-10 w-10 text-gray-700" /><p className="mt-3 text-sm font-bold text-gray-400">Aucun projet trouvé</p></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{projects.map((project) => {
      const Icon = iconFor(project.type);
      const hasMedia = Boolean(project.thumbnailUrl || project.resultUrl);
      return <article key={project.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-purple-400/30 hover:bg-white/[0.05]">
        <button type="button" onClick={() => setActiveMediaModal(project)} className="block w-full text-left">
          <div className="aspect-video overflow-hidden bg-black/30">{project.type === 'image' && hasMedia ? <img src={project.thumbnailUrl || project.resultUrl} alt={project.title} className="h-full w-full object-cover" /> : (project.type === 'video' || project.type === 'clips') && hasMedia ? <video src={project.resultUrl} poster={project.thumbnailUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Icon className="h-10 w-10 text-gray-600" /></div>}</div>
          <div className="p-3.5"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-purple-300" /><span className="text-[10px] font-black uppercase text-gray-500">{project.type}</span><span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold ${project.status === 'completed' ? 'bg-emerald-500/10 text-emerald-300' : project.status === 'failed' ? 'bg-rose-500/10 text-rose-300' : 'bg-amber-500/10 text-amber-300'}`}>{project.status || 'projet'}</span></div><h2 className="mt-2 line-clamp-1 text-sm font-black text-white">{project.title || 'Projet sans titre'}</h2><p className="mt-1 line-clamp-3 text-[11px] leading-4 text-gray-500">{project.enhancedPrompt || project.prompt || 'Aucun prompt enregistré.'}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-lg bg-white/[0.03] px-2 py-2"><span className="block text-gray-600">Modèle</span><strong className="line-clamp-1 text-gray-300">{project.model || '—'}</strong></div><div className="rounded-lg bg-white/[0.03] px-2 py-2"><span className="block text-gray-600">Coût</span><strong className="text-amber-300">{project.creditsUsed || 0} crédits</strong></div></div><div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-gray-600">{new Date(project.updatedAt || project.createdAt).toLocaleString('fr-FR')}</span><span className="flex items-center gap-1 font-black text-purple-200"><Eye className="h-3 w-3" /> Détails</span></div></div>
        </button>
        <div className="border-t border-white/5 p-3"><button type="button" onClick={() => resume(project)} className="w-full rounded-xl border border-purple-500/20 bg-purple-500/10 py-2.5 text-xs font-black text-purple-200">Reprendre dans le studio</button></div>
      </article>;
    })}</div>}
  </div>;
};
