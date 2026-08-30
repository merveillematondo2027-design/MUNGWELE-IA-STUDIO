import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Globe2, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CommunityFeed } from '../community/CommunityFeed';
import { createMDigiAccount, ensureOfficialMDigiAccount, getMDigiProfile, type MDigiProfile } from '../../services/mdigiService';

export const MDigiView: React.FC = () => {
  const { user, setActiveTab, addNotification } = useApp();
  const [profile, setProfile] = useState<MDigiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState(user.name || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!user.id) { if (active) setLoading(false); return; }
      try {
        const resolved = user.role === 'admin'
          ? await ensureOfficialMDigiAccount(user)
          : await getMDigiProfile(user.id);
        if (active) setProfile(resolved);
      } catch (error: any) {
        if (active) addNotification('error', 'M.Digi indisponible', error?.message || 'Impossible de synchroniser le compte social.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user.id, user.role]);

  const createAccount = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const created = await createMDigiAccount({ user, nickname, phone });
      setProfile(created);
      addNotification('success', 'Compte M.Digi créé', `${created.nickname} devient votre identité publique et votre signature sociale.`);
    } catch (error: any) {
      addNotification('error', 'Création M.Digi impossible', error?.message || 'Vérifiez les règles Firestore puis réessayez.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm text-gray-400">Chargement de M.Digi…</div>;

  if (!profile) return (
    <div className="mx-auto w-full max-w-xl pb-20">
      <button onClick={() => setActiveTab('profile')} className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-5 w-5" /></button>
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1527] shadow-2xl">
        <div className="h-24 bg-gradient-to-r from-cyan-500/25 via-blue-500/20 to-purple-500/25" />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-8 flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#0b1527] bg-gradient-to-tr from-cyan-500 to-purple-600"><Globe2 className="h-8 w-8 text-white" /></div>
          <h1 className="mt-3 text-2xl font-black text-white">Créer mon compte M.Digi</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">M.Digi est votre compte social, distinct du compte MUNGWELE AI STUDIO. Votre Gmail reste votre connexion générale au Studio.</p>
          <div className="mt-6 space-y-4">
            <label className="block"><span className="text-xs font-bold text-gray-300">Surnom public / signature</span><input value={nickname} onChange={(e)=>setNickname(e.target.value)} maxLength={40} placeholder="Ex. Grad Bøy" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07101f] px-4 py-3 text-white outline-none focus:border-cyan-400" /></label>
            <label className="block"><span className="text-xs font-bold text-gray-300">Numéro de téléphone obligatoire</span><input value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" placeholder="+243…" className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07101f] px-4 py-3 text-white outline-none focus:border-cyan-400" /><span className="mt-1 block text-[10px] text-gray-500">Ce numéro reste privé et n’apparaît pas sur votre profil public.</span></label>
          </div>
          <button onClick={createAccount} disabled={saving} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50"><UserPlus className="h-5 w-5" />{saving ? 'Création…' : 'Créer mon compte M.Digi'}</button>
        </div>
      </section>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-5xl pb-20">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={() => setActiveTab('home')} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"><ArrowLeft className="h-5 w-5" /></button>
        <div className="min-w-0"><div className="flex items-center gap-1.5"><h1 className="truncate text-xl font-black text-white">{profile.nickname}</h1>{profile.isOfficial && <BadgeCheck className="h-5 w-5 text-cyan-300" />}</div><p className="text-xs text-gray-500">M.Digi · compte social séparé du Studio</p></div>
      </div>
      <CommunityFeed socialShell />
    </div>
  );
};
