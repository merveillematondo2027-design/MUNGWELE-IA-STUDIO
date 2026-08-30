import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Home, Image as ImageIcon, Loader2, Music2, Search, ShoppingBag, Users, Video } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';
import type { CommunityPost } from '../../services/socialService';
import { CommunityPostCard } from './CommunityPostCard';

type SocialSection = 'home' | 'friends' | 'video' | 'image' | 'music' | 'marketplace' | 'search';

const nav = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'friends', label: 'Amis', icon: Users },
  { id: 'video', label: 'Vidéo', icon: Video },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'music', label: 'Musique', icon: Music2 },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'search', label: 'Recherche', icon: Search },
] as const;

export const CommunityFeed: React.FC<{ compact?: boolean; socialShell?: boolean }> = ({ compact = false, socialShell = false }) => {
  const { user } = useApp();
  const [items, setItems] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [section, setSection] = useState<SocialSection>('home');
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    let fallbackUnsubscribe: (() => void) | undefined;
    const primaryUnsubscribe = onSnapshot(collection(db, 'communityPosts'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityPost, 'id'>) }));
      rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      setItems(rows); setLoading(false);
    }, () => {
      const publicQuery = query(collection(db, 'generations'), where('isPublic', '==', true));
      fallbackUnsubscribe = onSnapshot(publicQuery, (snap) => {
        const rows: CommunityPost[] = snap.docs.map((d) => {
          const g: any = d.data();
          return {
            id: d.id,
            userId: g.userId || '',
            authorId: g.publicationAuthorId || g.userId || '',
            authorName: g.authorName || 'Créateur MUNGWELE',
            authorAvatar: g.authorAvatar || '',
            isOfficial: Boolean(g.isOfficialPublication),
            title: g.title || 'Création MUNGWELE',
            caption: g.publicationCaption || g.prompt || '',
            type: g.type,
            mediaUrl: g.resultUrl,
            thumbnailUrl: g.thumbnailUrl || g.resultUrl,
            generationId: d.id,
            createdAt: g.publicAt || g.updatedAt || g.createdAt || new Date(0).toISOString(),
            allowCommunityDownload: Boolean(g.allowCommunityDownload),
          };
        }).filter((row) => Boolean(row.mediaUrl));
        rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
        setItems(rows); setLoading(false);
      }, () => { setItems([]); setLoading(false); });
    });
    return () => { primaryUnsubscribe(); fallbackUnsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!user.id) { setFollowingIds([]); return; }
    const q = query(collection(db, 'follows'), where('followerId', '==', user.id));
    return onSnapshot(q, (snap) => setFollowingIds(snap.docs.map((d) => String(d.data().targetId || '')).filter(Boolean)), () => setFollowingIds([]));
  }, [user.id]);

  const filtered = useMemo(() => {
    const needle = queryText.trim().toLowerCase();
    return items.filter((item) => {
      if (section === 'friends' && !followingIds.includes(item.authorId)) return false;
      if (section === 'video' && !(item.type === 'video' || item.type === 'clips')) return false;
      if (section === 'image' && item.type !== 'image') return false;
      if (section === 'music' && item.type !== 'music') return false;
      if (section === 'marketplace' && !item.allowCommunityDownload) return false;
      if ((section === 'search' || needle) && needle) {
        return [item.title, item.caption, item.authorName, item.type].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
      }
      return true;
    });
  }, [items, section, queryText, followingIds]);

  return <section className={compact ? 'mt-3' : ''}>
    {!socialShell && <div className="mb-3"><h2 className="text-xl font-black text-white">M.Digi</h2><p className="text-xs text-gray-500">Le réseau social de la communauté MUNGWELE.</p></div>}

    <div className="sticky top-[72px] z-20 mb-4 overflow-x-auto border-y border-white/10 bg-[#07101f]/95 px-1 py-2 backdrop-blur-xl">
      <div className="flex min-w-max items-center gap-1">
        {nav.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return <button key={id} onClick={() => setSection(id)} className={`flex min-w-[70px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold transition ${active ? 'bg-cyan-500/12 text-cyan-200' : 'text-gray-400 hover:bg-white/[0.04]'}`}><Icon className={`h-5 w-5 ${active ? 'text-cyan-300' : ''}`} /><span>{label}</span></button>;
        })}
      </div>
    </div>

    {(section === 'search' || queryText) && <div className="mx-auto mb-4 max-w-3xl rounded-2xl border border-white/10 bg-[#0a1324] p-3"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"/><input autoFocus={section === 'search'} value={queryText} onChange={(e)=>setQueryText(e.target.value)} placeholder="Rechercher une personne, une publication ou un contenu…" className="w-full rounded-full border border-white/10 bg-[#07101f] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-cyan-500/40"/></div></div>}

    {section === 'friends' && !user.id && <div className="mx-auto mb-4 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400">Connectez-vous pour retrouver les publications des comptes M.Digi que vous suivez.</div>}
    {section === 'marketplace' && <div className="mx-auto mb-4 max-w-3xl rounded-2xl border border-purple-500/15 bg-purple-500/[0.05] p-4"><p className="text-sm font-black text-white">Marketplace M.Digi</p><p className="mt-1 text-xs text-gray-400">Contenus dont le créateur autorise le téléchargement. Les règles de qualité suivent toujours votre abonnement MUNGWELE AI STUDIO.</p></div>}

    {loading ? <div className="flex min-h-[220px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-cyan-300"/></div> : filtered.length===0 ? <div className="mx-auto flex min-h-[220px] max-w-3xl flex-col items-center justify-center rounded-[24px] border border-dashed border-white/15 bg-white/[0.025] text-center"><Search className="mb-3 h-8 w-8 text-cyan-300/70"/><p className="text-sm font-black text-white">Aucun contenu ici pour le moment</p><p className="mt-2 max-w-sm px-6 text-xs leading-5 text-gray-500">Changez d’onglet ou publiez une création depuis MUNGWELE AI STUDIO.</p></div> : <div className="mx-auto max-w-3xl space-y-3">{filtered.map((post)=><CommunityPostCard key={post.id} post={post}/>)}</div>}
  </section>;
};
