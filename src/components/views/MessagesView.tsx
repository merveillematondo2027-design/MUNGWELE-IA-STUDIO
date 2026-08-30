import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, addDoc, where } from 'firebase/firestore';
import { MessageCircle, Send, UserRound } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';

export const MessagesView: React.FC = () => {
  const { user } = useApp();
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'conversations'), where('members', 'array-contains', user.id));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a: any, b: any) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      setConversations(rows);
      setActive((current: any) => current || rows[0] || null);
    });
  }, [user.id]);

  useEffect(() => {
    if (!active?.id) { setMessages([]); return; }
    return onSnapshot(collection(db, 'conversations', active.id, 'messages'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
      setMessages(rows);
    });
  }, [active?.id]);

  const otherId = useMemo(() => active?.members?.find((id: string) => id !== user.id) || '', [active, user.id]);
  const otherName = active?.memberNames?.[otherId] || 'Utilisateur MUNGWELE';

  const send = async () => {
    const value = text.trim();
    if (!value || !active?.id || !otherId) return;
    const now = new Date().toISOString();
    await addDoc(collection(db, 'conversations', active.id, 'messages'), { userId: user.id, senderId: user.id, senderName: user.name, recipientId: otherId, text: value.slice(0, 2000), createdAt: now, read: false });
    await setDoc(doc(db, 'conversations', active.id), { lastMessage: value.slice(0, 500), updatedAt: now }, { merge: true });
    setText('');
  };

  return <div className="mx-auto w-full max-w-5xl pb-20">
    <div className="mb-5 border-b border-white/10 pb-5"><h1 className="text-2xl font-black text-white">Messages</h1><p className="mt-1 text-xs text-gray-500">Conversations privées entre membres MUNGWELE.</p></div>
    <div className="grid min-h-[65vh] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] md:grid-cols-[280px_1fr]">
      <aside className="border-b border-white/10 p-3 md:border-b-0 md:border-r"><p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-gray-600">Conversations</p>{conversations.length === 0 ? <div className="p-6 text-center"><MessageCircle className="mx-auto h-8 w-8 text-gray-700" /><p className="mt-2 text-xs text-gray-600">Aucune conversation.</p></div> : conversations.map((c) => { const id = c.members?.find((x: string) => x !== user.id); const name = c.memberNames?.[id] || 'Utilisateur'; return <button key={c.id} onClick={() => setActive(c)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left ${active?.id === c.id ? 'bg-purple-500/10' : 'hover:bg-white/[0.04]'}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]"><UserRound className="h-4 w-4 text-purple-300" /></span><div className="min-w-0"><p className="truncate text-xs font-black text-white">{name}</p><p className="mt-0.5 truncate text-[10px] text-gray-600">{c.lastMessage || 'Nouvelle conversation'}</p></div></button>; })}</aside>
      <section className="flex min-h-[500px] flex-col">{!active ? <div className="flex flex-1 items-center justify-center text-center text-sm text-gray-600">Choisissez une conversation.</div> : <><div className="border-b border-white/10 p-4"><p className="text-sm font-black text-white">{otherName}</p><p className="text-[10px] text-emerald-400">Conversation privée</p></div><div className="flex-1 space-y-2 overflow-y-auto p-4">{messages.map((m) => <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-5 ${m.senderId === user.id ? 'bg-purple-600 text-white' : 'bg-white/[0.07] text-gray-200'}`}>{m.text}<div className="mt-1 text-[8px] opacity-50">{m.createdAt ? new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</div></div></div>)}</div><div className="border-t border-white/10 p-3"><div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#07101f] p-2"><textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} placeholder="Écrire un message…" className="max-h-28 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-gray-600" /><button onClick={() => void send()} disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></div></div></>}</section>
    </div>
  </div>;
};
