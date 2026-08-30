import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Film, Globe2, Image as ImageIcon, Loader2, Music2, Search, SlidersHorizontal, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import type { GenerationRecord, StudioType } from '../../types';

type FilterType = 'all' | StudioType;

export const CommunityFeed: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { setActiveMediaModal } = useApp();
  const [items, setItems] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    const q = query(collection(db, 'generations'), where('isPublic', '==', true));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GenerationRecord, 'id'>) }));
      rows.sort((a, b) => String(b.publicAt || b.updatedAt || b.createdAt).localeCompare(String(a.publicAt || a.updatedAt || a.createdAt)));
      setItems(rows);
      setLoading(false);
    }, (error) => {
      console.warn('Community Firestore sync warning:', error);
      setItems([]);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.type !== filter) return false;
      if (!needle) return true;
      return [item.title, item.prompt, item.authorName, item.model, item.provider].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [items, queryText, filter]);

  return (
    <section className={compact ? 'mt-5' : ''}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-black text-white sm:text-xl">Communauté</h2></div><p className="mt-1 text-xs text-gray-500">Fil public synchronisé avec les créations réellement publiées.</p></div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500"><SlidersHorizontal className="h-3.5 w-3.5" /> Rechercher et filtrer</div>
      </div>

      <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.025] p-2.5">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" /><input value={queryText} onChange={(e) => setQueryText(e.target.value)} placeholder="Rechercher par utilisateur, titre ou prompt…" className="w-full rounded-xl border border-white/10 bg-[#081120] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-gray-600 focus:border-cyan-500/40" /></div>
        <div className="mt-2 grid grid-cols-5 gap-1.5">{([['all','Tout'],['image','Image'],['video','Vidéo'],['clips','Clips'],['music','Musique']] as const).map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-xl border px-2 py-2 text-[10px] font-bold transition ${filter===value?'border-cyan-400/40 bg-cyan-500/10 text-cyan-200':'border-white/10 bg-white/[0.025] text-gray-500 hover:text-gray-300'}`}>{label}</button>)}</div>
      </div>

      {loading ? <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div> : filtered.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] text-center"><Globe2 className="mb-3 h-8 w-8 text-cyan-300/70" /><p className="text-sm font-black text-white">Aucune publication trouvée</p><p className="mt-2 max-w-sm px-6 text-xs leading-5 text-gray-500">Publiez une création depuis vos projets ou changez votre recherche.</p></div> : (
        <div className="mx-auto max-w-3xl space-y-4">{filtered.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1324]/90 shadow-lg"><button onClick={() => setActiveMediaModal(item)} className="block w-full text-left"><div className="flex items-center gap-3 p-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600/70 to-cyan-500/70 text-white"><UserRound className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-black text-white">{item.authorName || 'Créateur MUNGWELE'}</p><p className="mt-0.5 text-[10px] text-gray-600">{new Date(item.publicAt || item.updatedAt || item.createdAt).toLocaleString('fr-FR')}</p></div><span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-bold text-gray-300">{item.type === 'image' ? <ImageIcon className="h-3 w-3" /> : item.type === 'music' ? <Music2 className="h-3 w-3" /> : <Film className="h-3 w-3" />}{item.type === 'image' ? 'Image' : item.type === 'music' ? 'Musique' : item.type === 'clips' ? 'Clip' : 'Vidéo'}</span></div><div className="px-3.5 pb-3"><h3 className="text-sm font-black text-white">{item.title || 'Création MUNGWELE'}</h3>{item.prompt && <p className="mt-1 line-clamp-3 text-[11px] leading-4 text-gray-500">{item.prompt}</p>}</div>{item.type === 'music' ? <div className="flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-blue-950/70 to-purple-950/60"><Music2 className="h-12 w-12 text-blue-300/80" /></div> : item.thumbnailUrl || item.resultUrl ? <div className="relative bg-black/30"><img src={item.thumbnailUrl || item.resultUrl} alt={item.title} className="max-h-[560px] w-full object-cover" /></div> : null}</button><div className="flex items-center justify-between border-t border-white/10 px-3.5 py-2.5 text-[10px] text-gray-600"><span>Publication publique</span><span className="font-bold text-cyan-300">Voir la création</span></div></article>)}</div>
      )}
    </section>
  );
};
