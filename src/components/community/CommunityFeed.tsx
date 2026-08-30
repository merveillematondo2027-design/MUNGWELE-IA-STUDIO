import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Globe2, Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { db } from '../../lib/firebase';
import type { StudioType } from '../../types';
import type { CommunityPost } from '../../services/socialService';
import { CommunityPostCard } from './CommunityPostCard';

type FilterType = 'all' | StudioType;

export const CommunityFeed: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    let fallbackUnsubscribe: (() => void) | undefined;
    const primaryUnsubscribe = onSnapshot(collection(db, 'communityPosts'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityPost, 'id'>) }));
      rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      setItems(rows); setLoading(false);
    }, (error) => {
      console.warn('Community posts sync unavailable, using public generations fallback:', error);
      const publicQuery = query(collection(db, 'generations'), where('isPublic', '==', true));
      fallbackUnsubscribe = onSnapshot(publicQuery, (snap) => {
        const rows: CommunityPost[] = snap.docs.map((d) => {
          const g: any = d.data();
          return {
            id: d.id, userId: g.userId || '', authorId: g.publicationAuthorId || g.userId || '',
            authorName: g.authorName || 'Créateur MUNGWELE', authorAvatar: g.authorAvatar || '',
            isOfficial: Boolean(g.isOfficialPublication), title: g.title || 'Création MUNGWELE',
            caption: g.publicationCaption || g.prompt || '', type: g.type, mediaUrl: g.resultUrl,
            thumbnailUrl: g.thumbnailUrl || g.resultUrl, generationId: d.id,
            createdAt: g.publicAt || g.updatedAt || g.createdAt || new Date(0).toISOString(),
          };
        }).filter((row) => Boolean(row.mediaUrl));
        rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
        setItems(rows); setLoading(false);
      }, (fallbackError) => { console.warn('Community fallback sync warning:', fallbackError); setItems([]); setLoading(false); });
    });
    return () => { primaryUnsubscribe(); fallbackUnsubscribe?.(); };
  }, []);

  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.type !== filter) return false;
      if (!needle) return true;
      return [item.title, item.caption, item.authorName, item.type].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [items, queryText, filter]);

  return <section className={compact ? 'mt-5' : ''}>
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Globe2 className="h-5 w-5 text-cyan-300"/><h2 className="text-lg font-black text-white sm:text-xl">Communauté MUNGWELE</h2></div><p className="mt-1 text-xs text-gray-500">Publications, abonnements, J’aime, commentaires et partages en temps réel.</p></div><div className="flex items-center gap-2 text-[10px] text-gray-500"><SlidersHorizontal className="h-3.5 w-3.5"/> Rechercher et filtrer</div></div>
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.025] p-2.5"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"/><input value={queryText} onChange={(e)=>setQueryText(e.target.value)} placeholder="Rechercher un créateur, une description ou une création…" className="w-full rounded-xl border border-white/10 bg-[#081120] py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-gray-600 focus:border-cyan-500/40"/></div><div className="mt-2 grid grid-cols-5 gap-1.5">{([['all','Tout'],['image','Image'],['video','Vidéo'],['clips','Clips'],['music','Musique']] as const).map(([value,label])=><button key={value} onClick={()=>setFilter(value)} className={`rounded-xl border px-2 py-2 text-[10px] font-bold ${filter===value?'border-cyan-400/40 bg-cyan-500/10 text-cyan-200':'border-white/10 bg-white/[0.025] text-gray-500'}`}>{label}</button>)}</div></div>
    {loading ? <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300"/></div> : filtered.length===0 ? <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] text-center"><Globe2 className="mb-3 h-8 w-8 text-cyan-300/70"/><p className="text-sm font-black text-white">Aucune publication trouvée</p><p className="mt-2 max-w-sm px-6 text-xs leading-5 text-gray-500">Publiez une création depuis le Studio ou votre bibliothèque.</p></div> : <div className="mx-auto max-w-3xl space-y-4">{filtered.map((post)=><CommunityPostCard key={post.id} post={post}/>)}</div>}
  </section>;
};
