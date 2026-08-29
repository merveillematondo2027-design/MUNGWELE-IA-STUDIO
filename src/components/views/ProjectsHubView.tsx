import React, { useState } from 'react';
import { ArrowLeft, Film, Globe2, Image as ImageIcon, Music2, Plus, Play } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, StudioType } from '../../types';

const META = {
  image: { title: 'Projets Image', icon: ImageIcon, accent: 'text-purple-200', button: 'from-purple-600 to-fuchsia-600' },
  video: { title: 'Projets Vidéo', icon: Film, accent: 'text-pink-200', button: 'from-pink-600 to-rose-600' },
  music: { title: 'Projets Musique', icon: Music2, accent: 'text-blue-200', button: 'from-blue-600 to-cyan-600' },
} as const;

export const ProjectsHubView: React.FC<{ type: StudioType }> = ({ type }) => {
  const { generations, user, updateGeneration, addNotification, setActiveStudio, setActiveTab } = useApp();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const meta = META[type];
  const Icon = meta.icon;
  const projects = generations.filter((g) => g.type === type && (!user.id || g.userId === user.id));

  const openNew = () => {
    localStorage.removeItem('mungwele.resume.project');
    setActiveStudio(type);
    setActiveTab(`studio-${type}` as any);
  };

  const resume = (project: GenerationRecord) => {
    localStorage.setItem('mungwele.resume.project', JSON.stringify(project));
    setActiveStudio(type);
    setActiveTab(`studio-${type}` as any);
  };

  const togglePublish = async (event: React.MouseEvent, project: GenerationRecord) => {
    event.stopPropagation();
    if (publishingId) return;
    setPublishingId(project.id);
    const nextPublic = !project.isPublic;
    try {
      const response = await fetch(`/api/generations/${project.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: nextPublic, userId: user.id, authorName: user.name || 'Créateur MUNGWELE' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'Publication impossible.');
      updateGeneration(project.id, data.generation);
      addNotification('success', nextPublic ? 'Publié dans la Communauté' : 'Publication retirée', nextPublic ? 'Votre création est maintenant visible par la communauté.' : 'Votre création n’est plus publique.');
    } catch (error: any) {
      addNotification('error', 'Publication impossible', error?.message || 'Réessayez dans quelques instants.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setActiveTab('home')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-gray-300"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${meta.accent}`} /><h1 className="truncate text-xl font-black text-white sm:text-2xl">{meta.title}</h1></div>
            <p className="mt-1 text-xs text-gray-500">Ouvrez un projet existant ou démarrez une nouvelle création.</p>
          </div>
        </div>
        <button onClick={openNew} className={`inline-flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r ${meta.button} px-4 py-2.5 text-xs font-black text-white shadow-lg`}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nouveau projet</span></button>
      </div>

      {projects.length === 0 ? (
        <button onClick={openNew} className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.025] text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05]"><Plus className="h-5 w-5 text-white" /></span>
          <span className="text-sm font-black text-white">Créer votre premier projet</span>
          <span className="mt-2 max-w-sm px-6 text-xs leading-5 text-gray-500">Vos créations apparaîtront ici pour pouvoir les reprendre rapidement.</span>
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <button key={project.id} onClick={() => resume(project)} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition hover:border-white/20 hover:bg-white/[0.05]">
              <div className="relative aspect-video overflow-hidden bg-black/30">
                {type === 'music' ? (
                  <div className="flex h-full items-center justify-center"><Music2 className="h-10 w-10 text-blue-300/70" /></div>
                ) : (
                  <img src={project.thumbnailUrl || project.resultUrl} alt={project.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                )}
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white"><Play className="h-3.5 w-3.5" /></span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => togglePublish(e, project)}
                  className={`absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-md transition ${project.isPublic ? 'border-cyan-300/40 bg-cyan-500/25 text-cyan-100' : 'border-white/15 bg-black/55 text-white'}`}
                  title={project.isPublic ? 'Retirer de la communauté' : 'Publier dans la communauté'}
                >
                  <Globe2 className={`h-4 w-4 ${publishingId === project.id ? 'animate-pulse' : ''}`} />
                </span>
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-2"><h2 className="line-clamp-1 flex-1 text-sm font-black text-white">{project.title || 'Projet sans titre'}</h2>{project.isPublic && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-300">Public</span>}</div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">{project.prompt}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-gray-600"><span>{new Date(project.updatedAt || project.createdAt).toLocaleDateString('fr-FR')}</span><span className="font-bold text-gray-300">Continuer</span></div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
