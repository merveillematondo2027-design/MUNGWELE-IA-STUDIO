import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { ArrowLeft, CheckCheck, MessageCircle, MoreVertical, Search, Send, Smile, UserRound } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';

const EMOJIS = ['😀','😂','😍','👍','🙏','❤️','🔥','🎉','👏','😊','😎','🤝'];

export const MessagesView: React.FC = () => {
  const { user, setActiveTab, addNotification } = useApp();
  const [conversations, setConversations] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user.id) return;
    const q = query(collection(db, 'conversations'), where('members', 'array-contains', user.id));
    return onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a: any, b: any) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
      setConversations(rows);
    }, (error) => {
      console.warn('Messages conversations sync warning:', error);
      addNotification('error','Messagerie indisponible',error?.message || 'Permissions Firestore insuffisantes.');
    });
  }, [user.id]);

  useEffect(() => {
    if (!active?.id) { setMessages([]); return; }
    return onSnapshot(collection(db, 'conversations', active.id, 'messages'), (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a: any, b: any) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
      setMessages(rows);
      rows.filter((m:any)=>m.recipientId===user.id && !m.read).forEach((m:any)=>updateDoc(doc(db,'conversations',active.id,'messages',m.id),{read:true,readAt:new Date().toISOString()}).catch(()=>undefined));
      window.setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),50);
    }, (error) => {
      console.warn('Messages thread sync warning:', error);
      addNotification('error','Conversation indisponible',error?.message || 'Permissions Firestore insuffisantes.');
    });
  }, [active?.id, user.id]);

  const otherId = useMemo(() => active?.members?.find((id: string) => id !== user.id) || '', [active, user.id]);
  const otherName = active?.memberNames?.[otherId] || 'Utilisateur MUNGWELE';
  const filtered = conversations.filter((c:any)=>{
    const id=c.members?.find((x:string)=>x!==user.id); const name=c.memberNames?.[id]||'';
    return !searchText.trim() || name.toLowerCase().includes(searchText.toLowerCase()) || String(c.lastMessage||'').toLowerCase().includes(searchText.toLowerCase());
  });

  const send = async () => {
    const value = text.trim();
    if (!value || !active?.id || !otherId) return;
    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, 'conversations', active.id, 'messages'), { userId: user.id, senderId: user.id, senderName: user.name, recipientId: otherId, text: value.slice(0, 2000), createdAt: now, read: false });
      await setDoc(doc(db, 'conversations', active.id), { lastMessage: value.slice(0, 500), updatedAt: now }, { merge: true });
      setText(''); setEmojiOpen(false);
    } catch(error:any){ addNotification('error','Message non envoyé',error?.message || 'Vérifiez les permissions Firestore.'); }
  };

  const goBack = () => {
    if (active && window.innerWidth < 768) { setActive(null); return; }
    setActiveTab('home');
  };

  return <div className="mx-auto w-full max-w-6xl pb-20">
    <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
      <button onClick={goBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-gray-300" aria-label="Retour"><ArrowLeft className="h-4 w-4"/></button>
      <div><h1 className="text-2xl font-black text-white">Messages</h1><p className="mt-1 text-xs text-gray-500">Messagerie privée MUNGWELE.</p></div>
    </div>

    <div className="grid min-h-[72vh] overflow-hidden rounded-3xl border border-white/10 bg-[#07101f] md:grid-cols-[320px_1fr]">
      <aside className={`${active ? 'hidden md:block' : 'block'} border-r-0 border-white/10 md:border-r`}>
        <div className="border-b border-white/10 p-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"/><input value={searchText} onChange={(e)=>setSearchText(e.target.value)} placeholder="Rechercher une conversation" className="w-full rounded-2xl border border-white/10 bg-white/[0.035] py-3 pl-9 pr-3 text-xs text-white outline-none placeholder:text-gray-600"/></div>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-2">{filtered.length === 0 ? <div className="p-8 text-center"><MessageCircle className="mx-auto h-9 w-9 text-gray-700" /><p className="mt-2 text-xs text-gray-600">Aucune conversation.</p></div> : filtered.map((c) => { const id = c.members?.find((x: string) => x !== user.id); const name = c.memberNames?.[id] || 'Utilisateur'; return <button key={c.id} onClick={() => setActive(c)} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left ${active?.id === c.id ? 'bg-purple-500/12' : 'hover:bg-white/[0.04]'}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/70 to-cyan-500/60"><UserRound className="h-5 w-5 text-white" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-black text-white">{name}</p><span className="shrink-0 text-[8px] text-gray-600">{c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : ''}</span></div><p className="mt-1 truncate text-[10px] text-gray-500">{c.lastMessage || 'Nouvelle conversation'}</p></div></button>; })}</div>
      </aside>

      <section className={`${!active ? 'hidden md:flex' : 'flex'} min-h-[620px] flex-col bg-[radial-gradient(circle_at_top,#111b36_0,#08111f_44%,#07101f_100%)]`}>{!active ? <div className="flex flex-1 items-center justify-center text-center"><div><MessageCircle className="mx-auto h-12 w-12 text-gray-700"/><p className="mt-3 text-sm font-bold text-gray-500">Choisissez une conversation.</p></div></div> : <>
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#08111f]/95 p-3 backdrop-blur-xl">
          <button onClick={()=>setActive(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-300 md:hidden"><ArrowLeft className="h-4 w-4"/></button>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-500"><UserRound className="h-4 w-4 text-white"/></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-white">{otherName}</p><p className="text-[10px] text-emerald-400">Conversation privée • sécurisée par MUNGWELE</p></div>
          <div className="relative"><button onClick={()=>setThreadMenuOpen(v=>!v)} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white/[0.05]"><MoreVertical className="h-4 w-4"/></button>{threadMenuOpen&&<div className="absolute right-0 top-11 z-20 w-52 rounded-2xl border border-white/10 bg-[#111827] p-1.5 shadow-2xl"><button onClick={()=>{navigator.clipboard.writeText(otherName);setThreadMenuOpen(false);addNotification('info','Nom copié',otherName)}} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-white/[0.05]">Copier le nom</button><button onClick={()=>{setSearchText(otherName);setThreadMenuOpen(false)}} className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-white/[0.05]">Rechercher cette conversation</button></div>}</div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-6">{messages.map((m) => { const mine=m.senderId===user.id; return <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[86%] rounded-2xl px-3 py-2 text-xs leading-5 shadow ${mine ? 'rounded-br-md bg-purple-600 text-white' : 'rounded-bl-md border border-white/8 bg-[#182235] text-gray-100'}`}><div className="whitespace-pre-wrap break-words">{m.text}</div><div className={`mt-1 flex items-center justify-end gap-1 text-[8px] ${mine?'text-purple-100/70':'text-gray-500'}`}><span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>{mine&&<CheckCheck className={`h-3 w-3 ${m.read?'text-cyan-200':'opacity-50'}`}/>}</div></div></div>; })}<div ref={bottomRef}/></div>
        <div className="border-t border-white/10 bg-[#08111f]/95 p-3">
          {emojiOpen&&<div className="mb-2 grid grid-cols-6 gap-1 rounded-2xl border border-white/10 bg-[#111827] p-2">{EMOJIS.map(e=><button key={e} onClick={()=>setText(v=>v+e)} className="rounded-xl p-2 text-lg hover:bg-white/[0.05]">{e}</button>)}</div>}
          <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#111827] p-2"><button onClick={()=>setEmojiOpen(v=>!v)} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-white/[0.05]"><Smile className="h-5 w-5"/></button><textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={1} placeholder="Message" className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm text-white outline-none placeholder:text-gray-600" /><button onClick={() => void send()} disabled={!text.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white disabled:opacity-35"><Send className="h-4 w-4" /></button></div>
        </div>
      </>}</section>
    </div>
  </div>;
};
