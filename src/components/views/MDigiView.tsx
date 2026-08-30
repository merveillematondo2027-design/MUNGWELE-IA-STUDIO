import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Globe2, Image as ImageIcon, Music2, Search, ShoppingBag, UserPlus, Users, Video, Home } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import { auth, db } from '../../lib/firebase';
import { CommunityFeed } from '../community/CommunityFeed';

type MDigiProfile = {
  id: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  showFollowers: boolean;
  showFriends: boolean;
  showFollowing: boolean;
  createdAt: string;
};

export const MDigiView: React.FC = () => {
  const { user, setActiveTab, addNotification } = useApp();
  const [profile, setProfile] = useState<MDigiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState(user.name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    void getDoc(doc(db, 'mdigiProfiles', uid)).then((snap) => {
      if (snap.exists()) setProfile({ id: snap.id, ...(snap.data() as Omit<MDigiProfile, 'id'>) });
    }).finally(() => setLoading(false));
  }, []);

  const createAccount = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || saving) return;
    const cleanNickname = nickname.trim();
    const cleanPhone = phone.trim();
    if (cleanNickname.length < 2) { addNotification('warning', 'Surnom requis', 'Choisissez un surnom d’au moins 2 caractères pour M.Digi.'); return; }
    if (cleanPhone.length < 7) { addNotification('warning', 'Téléphone requis', 'Ajoutez un numéro de téléphone valide pour créer votre compte M.Digi.'); return; }
    setSaving(true);
    try {
      const createdAt = new Date().toISOString();
      const publicProfile = { nickname: cleanNickname, avatar: user.avatar || '', bio: '', showFollowers: true, showFriends: true, showFollowing: true, createdAt, updatedAt: createdAt };
      await setDoc(doc(db, 'mdigiProfiles', uid), publicProfile, { merge: true });
      await setDoc(doc(db, 'mdigiPrivate', uid), { studioUserId: uid, studioEmail: user.email, phone: cleanPhone, createdAt, updatedAt: createdAt }, { merge: true });
      setProfile({ id: uid, ...publicProfile });
      addNotification('success', 'Compte M.Digi créé', `${cleanNickname} est maintenant votre identité publique et votre signature sociale.`);
    } catch (error: any) {
      addNotification('error', 'Création M.Digi impossible', error?.message || 'Vérifiez les règles Firestore puis réessayez.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center text-sm text-gray-400">Chargement de M.Digi…</div>;

  if (!profile) return (
    <div className="mx-auto w-full max-w-2xl pb-20">
      <button onClick={() => setActiveTab('profile')} className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-5 w-5" /></button>
      <section className="rounded-[30px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent p-6 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15"><Globe2 className="h-7 w-7 text-cyan-300" /></div>
        <h1 className="mt-5 text-3xl font-black text-white">Créer mon compte M.Digi</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">M.Digi est votre identité sociale séparée de votre compte MUNGWELE AI STUDIO. Votre connexion générale reste liée à votre compte Gmail déjà enregistré dans le Studio.</p>
        <div className="mt-6 space-y-4">
          <label className="block"><span className="text-xs font-bold text-gray-300">Surnom public / signature</span><input value={nickname} onChange={(e)=>setNickname(e.target.value)} maxLength={40} placeholder="Ex. Grad Bøy" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-400" /></label>
          <label className="block"><span className="text-xs font-bold text-gray-300">Numéro de téléphone obligatoire</span><input value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" placeholder="+243…" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-cyan-400" /><span className="mt-1 block text-[10px] text-gray-500">Le numéro est stocké dans les données privées M.Digi et n’est pas affiché publiquement.</span></label>
        </div>
        <button onClick={createAccount} disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50"><UserPlus className="h-5 w-5" />{saving ? 'Création…' : 'Créer mon compte M.Digi'}</button>
      </section>
    </div>
  );

  const socialTabs = [
    { label: 'Accueil', icon: Home }, { label: 'Amis', icon: Users }, { label: 'Vidéos', icon: Video },
    { label: 'Images', icon: ImageIcon }, { label: 'Musique', icon: Music2 }, { label: 'Marketplace', icon: ShoppingBag }, { label: 'Recherche', icon: Search },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl pb-20">
      <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-5 w-5" /></button><div><h1 className="text-2xl font-black text-white">M.Digi</h1><p className="text-xs text-gray-500">Compte social : <strong className="text-cyan-300">{profile.nickname}</strong></p></div></div><button onClick={()=>setActiveTab('notifications')} title="Notifications" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><Bell className="h-5 w-5" /></button></div>
      <nav className="mb-5 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-2"><div className="flex min-w-max items-center gap-1">{socialTabs.map(({label,icon:Icon})=><button key={label} className="flex min-w-[74px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold text-gray-300 hover:bg-white/[0.06]"><Icon className="h-4 w-4" />{label}</button>)}</div></nav>
      <CommunityFeed />
    </div>
  );
};
