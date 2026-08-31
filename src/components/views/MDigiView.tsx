import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, Camera, Home, Image as ImageIcon, Loader2, MessageCircle, Music2, Search, ShoppingBag, UserPlus, Users, Video } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { CommunityPostCard } from '../community/CommunityPostCard';
import type { CommunityPost } from '../../services/socialService';
import { createMDigiAccount, ensureOfficialMDigiAccount, getMDigiProfile, uploadMDigiAvatar, type MDigiProfile } from '../../services/mdigiService';

const OPEN_PROFILE_KEY = 'mungwele.mdigi.openProfile';

export const MDigiView: React.FC = () => {
  const { user, setActiveTab, addNotification, setAuthMode, setIsAuthModalOpen } = useApp();
  const requestedId = useMemo(() => {
    const value = sessionStorage.getItem(OPEN_PROFILE_KEY) || '';
    sessionStorage.removeItem(OPEN_PROFILE_KEY);
    return value;
  }, []);
  const [targetId, setTargetId] = useState(requestedId || user.id || '');
  const [profile, setProfile] = useState<MDigiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState(user.name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [friends, setFriends] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isOwnProfile = Boolean(user.id && targetId === user.id);

  useEffect(() => {
    if (!targetId && user.id) setTargetId(user.id);
  }, [targetId, user.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!targetId) { setProfile(null); setLoading(false); return; }
      setLoading(true);
      try {
        if (targetId === user.id && user.role === 'admin') await ensureOfficialMDigiAccount(user).catch(() => undefined);
        const found = await getMDigiProfile(targetId);
        if (cancelled) return;
        setProfile(found);
        setPosts([]); setFollowers(0); setFollowing(0); setFriends(0);
        if (!found) return;

        const postSnap = await getDocs(query(collection(db, 'communityPosts'), where('userId', '==', targetId))).catch(() => null);
        if (postSnap && !cancelled) {
          const rows = postSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommunityPost, 'id'>) }));
          rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
          setPosts(rows);
        }

        const followerIds = new Set<string>();
        const followingIds = new Set<string>();
        if (found.showFollowers || found.showFriends || isOwnProfile) {
          const snap = await getDocs(query(collection(db, 'follows'), where('targetId', '==', targetId))).catch(() => null);
          snap?.forEach((d) => followerIds.add(String(d.data().followerId || '')));
        }
        if (found.showFollowing || found.showFriends || isOwnProfile) {
          const snap = await getDocs(query(collection(db, 'follows'), where('followerId', '==', targetId))).catch(() => null);
          snap?.forEach((d) => followingIds.add(String(d.data().targetId || '')));
        }
        if (!cancelled) {
          setFollowers(followerIds.size);
          setFollowing(followingIds.size);
          setFriends([...followerIds].filter((id) => followingIds.has(id)).length);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [targetId, user.id, user.role, isOwnProfile]);

  const createAccount = async () => {
    if (!user.id || saving) return;
    setSaving(true);
    try {
      const created = user.role === 'admin'
        ? await ensureOfficialMDigiAccount(user)
        : await createMDigiAccount({ user, nickname, phone });
      if (!created) throw new Error('Création M.Digi impossible.');
      setProfile(created);
      setTargetId(user.id);
      addNotification('success', 'Compte M.Digi créé', `${created.nickname} est maintenant votre identité sociale.`);
    } catch (error: any) {
      addNotification('error', 'Création M.Digi impossible', error?.message || 'Vérifiez les règles Firebase puis réessayez.');
    } finally { setSaving(false); }
  };

  const choosePhoto = () => fileRef.current?.click();
  const onPhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user.id || !isOwnProfile) return;
    setPhotoSaving(true);
    try {
      const avatar = await uploadMDigiAvatar(user.id, file);
      setProfile((prev) => prev ? { ...prev, avatar, updatedAt: new Date().toISOString() } : prev);
      addNotification('success', 'Photo mise à jour', 'Votre nouvelle photo de profil M.Digi est maintenant publique.');
    } catch (error: any) {
      addNotification('error', 'Photo impossible', error?.message || 'Impossible de mettre à jour la photo.');
    } finally { setPhotoSaving(false); }
  };

  const connect = () => { setAuthMode('login'); setIsAuthModalOpen(true); };
  const goBack = () => setActiveTab('community');

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div>;

  if (!targetId && !user.id) return (
    <div className="mx-auto max-w-xl py-16 text-center"><h1 className="text-3xl font-black text-white">M.Digi</h1><p className="mt-3 text-sm leading-6 text-gray-400">Explorez la communauté librement. Connectez-vous à votre compte MUNGWELE AI STUDIO lorsque vous voulez créer votre identité sociale M.Digi.</p><button onClick={connect} className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-3 text-sm font-black text-white">Se connecter</button></div>
  );

  if (!profile && isOwnProfile) return (
    <div className="mx-auto w-full max-w-2xl pb-20">
      <button onClick={goBack} className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-5 w-5" /></button>
      <section className="rounded-[30px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent p-6 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15"><Users className="h-7 w-7 text-cyan-300" /></div>
        <h1 className="mt-5 text-3xl font-black text-white">Créer mon compte M.Digi</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">M.Digi est votre compte social séparé. Votre compte Gmail MUNGWELE AI STUDIO reste votre connexion générale et votre abonnement Studio continue de définir vos droits de téléchargement.</p>
        {user.role === 'admin' ? <div className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-cyan-100">Votre compte administrateur devient automatiquement le compte officiel <strong>MUNGWELE AI</strong>.</div> : <div className="mt-6 space-y-4"><label className="block"><span className="text-xs font-bold text-gray-300">Surnom public / signature</span><input value={nickname} onChange={(e)=>setNickname(e.target.value)} maxLength={40} placeholder="Ex. Grad Bøy" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-400" /></label><label className="block"><span className="text-xs font-bold text-gray-300">Numéro de téléphone obligatoire</span><input value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" placeholder="+243…" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-400" /><span className="mt-1 block text-[10px] text-gray-500">Le numéro reste dans les données privées M.Digi et n’est pas affiché publiquement.</span></label></div>}
        <button onClick={createAccount} disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50"><UserPlus className="h-5 w-5" />{saving ? 'Création…' : user.role === 'admin' ? 'Activer le compte officiel' : 'Créer mon compte M.Digi'}</button>
      </section>
    </div>
  );

  if (!profile) return <div className="mx-auto max-w-xl py-16 text-center"><p className="text-sm text-gray-400">Ce profil M.Digi n’existe plus ou n’est pas disponible.</p><button onClick={goBack} className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white">Retour à la communauté</button></div>;

  const socialTabs = [
    { label: 'Accueil', icon: Home, action: () => setActiveTab('community') },
    { label: 'Amis', icon: Users, action: () => addNotification('info','Amis M.Digi','La liste des amis et abonnements sera ouverte depuis le profil.') },
    { label: 'Vidéos', icon: Video, action: () => setActiveTab('community') },
    { label: 'Images', icon: ImageIcon, action: () => setActiveTab('community') },
    { label: 'Musique', icon: Music2, action: () => setActiveTab('community') },
    { label: 'Marketplace', icon: ShoppingBag, action: () => setActiveTab('community') },
    { label: 'Recherche', icon: Search, action: () => setActiveTab('community') },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <div className="mb-3 flex items-center gap-3"><button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">M.Digi</p><h1 className="text-lg font-black text-white">Profil social</h1></div></div>

      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0a1324] shadow-2xl">
        <div className="h-36 bg-gradient-to-r from-purple-700/80 via-blue-600/70 to-cyan-500/70 sm:h-52" />
        <div className="px-4 pb-5 sm:px-7">
          <div className="-mt-14 flex items-end justify-between gap-4 sm:-mt-16">
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-[#0a1324] bg-gradient-to-tr from-purple-600 to-cyan-500 sm:h-32 sm:w-32">
              {profile.avatar ? <img src={profile.avatar} alt={profile.nickname} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white">{profile.nickname.charAt(0)}</div>}
              {isOwnProfile && <button onClick={choosePhoto} disabled={photoSaving} className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0a1324] bg-white text-[#07101f] shadow-lg" aria-label="Changer la photo de profil">{photoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</button>}
            </div>
            {isOwnProfile ? <button onClick={choosePhoto} disabled={photoSaving} className="mb-1 hidden rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-black text-white sm:block">Changer la photo</button> : user.id && <button onClick={()=>setActiveTab('messages')} className="mb-1 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white"><MessageCircle className="h-4 w-4" />Message</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhotoSelected} className="hidden" />
          <div className="mt-3"><div className="flex items-center gap-2"><h2 className="text-2xl font-black text-white sm:text-3xl">{profile.nickname}</h2>{profile.isOfficial && <BadgeCheck className="h-6 w-6 text-cyan-300" />}</div>{profile.bio && <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">{profile.bio}</p>}<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">{(profile.showFollowers || isOwnProfile) && <span><strong className="text-white">{followers}</strong> <span className="text-gray-500">abonnés</span></span>}{(profile.showFriends || isOwnProfile) && <span><strong className="text-white">{friends}</strong> <span className="text-gray-500">amis</span></span>}{(profile.showFollowing || isOwnProfile) && <span><strong className="text-white">{following}</strong> <span className="text-gray-500">suivis</span></span>}</div></div>
        </div>
      </section>

      <nav className="sticky top-[68px] z-20 mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#081120]/95 p-1.5 backdrop-blur-xl"><div className="flex min-w-max items-center gap-1">{socialTabs.map(({label,icon:Icon,action})=><button key={label} onClick={action} className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-300 hover:bg-white/[0.06]"><Icon className="h-4 w-4" />{label}</button>)}</div></nav>

      <section className="mt-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-black text-white">Publications</h3><span className="text-xs text-gray-500">{posts.length} publication{posts.length > 1 ? 's' : ''}</span></div>{posts.length ? <div className="mx-auto max-w-3xl space-y-4">{posts.map((post)=><CommunityPostCard key={post.id} post={post}/>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">Aucune publication publique pour le moment.</div>}</section>
    </div>
  );
};
