import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';

export const NotificationsView: React.FC = () => {
  const { user } = useApp();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
      setRows(data);
    });
  }, [user.id]);

  const markAll = async () => Promise.all(rows.filter((r) => !r.read).map((r) => updateDoc(doc(db, 'notifications', r.id), { read: true })));
  const icon = (type: string) => type === 'like' ? Heart : type === 'comment' ? MessageCircle : type === 'follow' ? UserPlus : Bell;

  return <div className="mx-auto w-full max-w-3xl pb-20">
    <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-5"><div><h1 className="text-2xl font-black text-white">Notifications</h1><p className="mt-1 text-xs text-gray-500">Toute l’activité autour de vos publications, abonnements et compte.</p></div><button onClick={() => void markAll()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-gray-300"><CheckCheck className="h-4 w-4" /> Tout lire</button></div>
    {rows.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] py-20 text-center"><Bell className="mx-auto h-10 w-10 text-gray-700" /><p className="mt-3 text-sm font-bold text-gray-400">Aucune notification</p></div> : <div className="space-y-2">{rows.map((item) => { const Icon = icon(item.type); return <button key={item.id} onClick={() => !item.read && updateDoc(doc(db, 'notifications', item.id), { read: true })} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${item.read ? 'border-white/10 bg-white/[0.025]' : 'border-purple-500/25 bg-purple-500/[0.07]'}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05]"><Icon className="h-4 w-4 text-purple-300" /></span><div className="min-w-0 flex-1"><p className="text-xs font-black text-white">{item.actorName || 'MUNGWELE AI'}</p><p className="mt-1 text-xs leading-5 text-gray-400">{item.message}</p><p className="mt-2 text-[10px] text-gray-600">{item.createdAt ? new Date(item.createdAt).toLocaleString('fr-FR') : ''}</p></div>{!item.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-purple-400" />}</button>; })}</div>}
  </div>;
};
