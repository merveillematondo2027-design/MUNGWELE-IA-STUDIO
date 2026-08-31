import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, ChevronDown, CircleHelp, Clapperboard, CreditCard, Globe2, Home, Image as ImageIcon, Images, LogOut, Menu, MessageCircle, Music2, Settings, Shield, UserRound, X, Film } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useApp } from '../../context/AppContext';
import type { NavigationTab, StudioType } from '../../types';
import { auth, db } from '../../lib/firebase';
import officialLogo from '../../assets/mungwele-ai-official-logo.svg';

export const AppShellHeader: React.FC<{ studioMode?: boolean }> = ({ studioMode = false }) => {
  const { user, setActiveTab, setActiveStudio } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const closeMenus = () => { setMenuOpen(false); setProfileOpen(false); };
  const go = (tab: NavigationTab) => { setActiveTab(tab); closeMenus(); };
  const goHome = () => go('home');
  const goStudioProjects = (studio: StudioType) => { setActiveStudio(studio); go(`projects-${studio}` as NavigationTab); };
  const logout = async () => { await auth.signOut(); setProfileOpen(false); };

  useEffect(() => {
    if (!user.id) { setUnreadNotifications(0); return; }
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    return onSnapshot(q, (snap) => setUnreadNotifications(snap.docs.filter((d) => d.data().read !== true).length), () => setUnreadNotifications(0));
  }, [user.id]);

  useEffect(() => {
    if (!user.id) { setUnreadMessages(0); return; }
    const q = query(collection(db, 'conversations'), where('members', 'array-contains', user.id));
    return onSnapshot(q, (snap) => {
      const total = snap.docs.reduce((sum, d) => sum + Math.max(0, Number(d.data()?.unreadBy?.[user.id] || 0)), 0);
      setUnreadMessages(total);
    }, () => setUnreadMessages(0));
  }, [user.id]);

  const badge = (count: number) => count > 0 ? <span className="absolute -right-1 -top-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-[#070d1b]">{count > 99 ? '99+' : count}</span> : null;

  return <>
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#070d1b]/90 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">{studioMode&&<button onClick={goHome} title="Retour" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300"><ArrowLeft className="h-4 w-4"/></button>}<button onClick={goHome}><img src={officialLogo} alt="MUNGWELE AI STUDIO" className="h-11 w-[105px] object-contain object-left sm:w-[142px]"/></button></div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {user.role==='admin'&&<button onClick={()=>go('admin-home')} title="Administration" className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-200 sm:w-auto sm:px-3"><Shield className="h-4 w-4"/><span className="ml-2 hidden sm:inline text-xs font-black">Admin</span></button>}
          <button onClick={()=>go('notifications')} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300" title="Notifications"><Bell className="h-4 w-4"/>{badge(unreadNotifications)}</button>
          <button onClick={()=>go('messages')} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300" title="Messages"><MessageCircle className="h-4 w-4"/>{badge(unreadMessages)}</button>
          <button onClick={()=>{setMenuOpen(true);setProfileOpen(false)}} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-200 sm:w-auto sm:px-3"><Menu className="h-4 w-4"/><span className="ml-2 hidden sm:inline text-xs font-bold">Menu</span></button>
          <div className="relative z-50"><button onClick={()=>{setProfileOpen(v=>!v);setMenuOpen(false)}} className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2">{user.avatar?<img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-lg object-cover"/>:<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-pink-500"><UserRound className="h-4 w-4"/></span>}<ChevronDown className="h-3.5 w-3.5 text-gray-400"/></button>{profileOpen&&<><button aria-label="Fermer" onClick={()=>setProfileOpen(false)} className="fixed inset-0 z-[-1]"/><div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0b1324] p-2 shadow-2xl"><div className="border-b border-white/10 px-3 py-2"><p className="truncate text-xs font-bold text-white">{user.name}</p><p className="truncate text-[10px] text-gray-500">{user.email}</p></div><button onClick={()=>go('profile')} className="w-full rounded-xl px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06]">Mon profil Studio</button><button onClick={()=>go('mdigi')} className="w-full rounded-xl px-3 py-2 text-left text-xs font-bold text-cyan-300 hover:bg-cyan-500/10">M.Digi — compte social</button><button onClick={()=>go('notifications')} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06]"><span>Notifications</span>{unreadNotifications>0&&<span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">{unreadNotifications}</span>}</button><button onClick={()=>go('messages')} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06]"><span>Messages</span>{unreadMessages>0&&<span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-black text-white">{unreadMessages}</span>}</button><button onClick={()=>go('subscription')} className="w-full rounded-xl px-3 py-2 text-left text-xs text-gray-300 hover:bg-white/[0.06]">Crédits & abonnements</button>{user.role==='admin'&&<button onClick={()=>go('admin-home')} className="w-full rounded-xl px-3 py-2 text-left text-xs text-purple-300 hover:bg-purple-500/10">Centre d’administration</button>}<button onClick={logout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10"><LogOut className="h-3.5 w-3.5"/> Se déconnecter</button></div></>}</div>
        </div>
      </div>
    </header>

    {menuOpen&&<div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={()=>setMenuOpen(false)}><aside className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={e=>e.stopPropagation()}><div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-black text-white">Menu</p><p className="text-[11px] text-gray-500">MUNGWELE AI STUDIO & M.Digi</p></div><button onClick={()=>setMenuOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4"/></button></div><div className="space-y-1">
      <button onClick={goHome} className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.035] px-4 py-3 text-sm font-bold text-white"><Home className="h-4 w-4"/> Accueil Studio</button>
      <button onClick={()=>go('mdigi')} className="flex w-full items-center gap-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-bold text-cyan-200"><Globe2 className="h-4 w-4"/> M.Digi — réseau social</button>
      <button onClick={()=>go('community')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><Globe2 className="h-4 w-4 text-cyan-300"/> Communauté MUNGWELE</button>
      <button onClick={()=>go('notifications')} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><span className="flex items-center gap-3"><Bell className="h-4 w-4 text-amber-300"/> Notifications</span>{unreadNotifications>0&&<span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{unreadNotifications}</span>}</button>
      <button onClick={()=>go('messages')} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm text-gray-200 hover:bg-white/[0.06]"><span className="flex items-center gap-3"><MessageCircle className="h-4 w-4 text-emerald-300"/> Messages</span>{unreadMessages>0&&<span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">{unreadMessages}</span>}</button>
      <div className="my-3 h-px bg-white/10"/>
      <button onClick={()=>goStudioProjects('image')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><ImageIcon className="h-4 w-4 text-purple-300"/> Image</button><button onClick={()=>goStudioProjects('video')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><Film className="h-4 w-4 text-pink-300"/> Vidéo</button><button onClick={()=>goStudioProjects('clips')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><Clapperboard className="h-4 w-4 text-fuchsia-300"/> Clips Vidéo</button><button onClick={()=>goStudioProjects('music')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><Music2 className="h-4 w-4 text-blue-300"/> Musique</button>
      <div className="my-3 h-px bg-white/10"/><button onClick={()=>go('creations')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><Images className="h-4 w-4 text-purple-300"/> Bibliothèque</button><button onClick={()=>go('subscription')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><CreditCard className="h-4 w-4 text-pink-300"/> Abonnements & crédits</button><button onClick={()=>go('profile')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><Settings className="h-4 w-4 text-blue-300"/> Profil Studio</button><button onClick={()=>go('help')} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-gray-200"><CircleHelp className="h-4 w-4 text-cyan-300"/> Aide</button>{user.role==='admin'&&<button onClick={()=>go('admin-home')} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm font-bold text-purple-200"><Shield className="h-4 w-4"/> Centre d’administration</button>}
    </div></aside></div>}
  </>;
};
