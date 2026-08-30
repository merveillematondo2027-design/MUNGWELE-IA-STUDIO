import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Share2, UserPlus, UserCheck, BadgeCheck, MessageSquareText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addComment, notifyUser, OFFICIAL_MUNGWELE_ID, sharePost, subscribeComments, subscribeFollow, subscribeLikes, toggleFollow, toggleLike, sendMessage, type CommunityPost } from '../../services/socialService';

export const CommunityPostCard: React.FC<{ post: CommunityPost }> = ({ post }) => {
  const { user, addNotification } = useApp();
  const [likes, setLikes] = useState<string[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [comment, setComment] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);

  const targetId = post.isOfficial ? OFFICIAL_MUNGWELE_ID : post.authorId;
  const canFollow = Boolean(user.id && targetId && user.id !== targetId);
  const liked = likes.includes(user.id);

  useEffect(() => subscribeLikes(post.id, setLikes), [post.id]);
  useEffect(() => subscribeComments(post.id, setComments), [post.id]);
  useEffect(() => canFollow ? subscribeFollow(user.id, targetId, setFollowing) : undefined, [user.id, targetId, canFollow]);

  const onLike = async () => {
    await toggleLike(post.id, user, liked);
    if (!liked) await notifyUser(post.userId, user, 'like', `${user.name} aime votre publication.`, post.id);
  };
  const onComment = async () => {
    const value = comment.trim(); if (!value) return;
    await addComment(post.id, user, value);
    await notifyUser(post.userId, user, 'comment', `${user.name} a commenté votre publication.`, post.id);
    setComment(''); setCommentsOpen(true);
  };
  const onFollow = async () => {
    await toggleFollow(user.id, targetId, user.name, following);
    if (!following && !post.isOfficial) await notifyUser(post.userId, user, 'follow', `${user.name} s’est abonné à votre compte.`);
  };
  const onShare = async () => { await sharePost(post); addNotification('success', 'Partage prêt', 'Le partage interne/externe est disponible.'); };
  const onMessage = async () => {
    if (post.isOfficial) { addNotification('info', 'Compte officiel', 'La messagerie du compte officiel sera gérée par le support MUNGWELE.'); return; }
    await sendMessage(user, post.userId, post.authorName, `Bonjour ${post.authorName}, je vous écris à propos de votre publication « ${post.title} ».`);
    addNotification('success', 'Conversation créée', 'Retrouvez-la dans Messages.');
  };

  return <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a1324]/95 shadow-xl">
    <div className="flex items-center gap-3 p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 text-sm font-black text-white">{post.authorName?.charAt(0) || 'M'}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-sm font-black text-white">{post.authorName || 'Créateur MUNGWELE'}</p>{post.isOfficial && <BadgeCheck className="h-4 w-4 text-cyan-300" />}</div><p className="mt-0.5 text-[10px] text-gray-600">{new Date(post.createdAt).toLocaleString('fr-FR')}</p></div>{canFollow && <button onClick={() => void onFollow()} className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[10px] font-black ${following ? 'border-white/10 bg-white/[0.04] text-gray-300' : 'border-purple-500/25 bg-purple-500/10 text-purple-200'}`}>{following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}{following ? 'Abonné' : 'S’abonner'}</button>}</div>
    <div className="px-4 pb-3">{post.caption && <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{post.caption}</p>}<p className="mt-2 text-xs font-black text-white">{post.title}</p></div>
    {post.type === 'music' ? <div className="flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-blue-950 to-purple-950 text-blue-200">Création musicale MUNGWELE</div> : post.type === 'video' || post.type === 'clips' ? <video src={post.mediaUrl} controls playsInline preload="metadata" className="max-h-[620px] w-full bg-black object-contain" /> : <img src={post.mediaUrl} alt={post.title} className="max-h-[620px] w-full bg-black/30 object-contain" />}
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[10px] text-gray-500"><span>{likes.length} J’aime</span><button onClick={() => setCommentsOpen((v) => !v)}>{comments.length} commentaire{comments.length > 1 ? 's' : ''}</button></div>
    <div className="grid grid-cols-4 border-b border-white/10 p-1.5"><button onClick={() => void onLike()} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold ${liked ? 'text-pink-300' : 'text-gray-400 hover:bg-white/[0.04]'}`}><Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> J’aime</button><button onClick={() => setCommentsOpen(true)} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gray-400 hover:bg-white/[0.04]"><MessageCircle className="h-4 w-4" /> Commenter</button><button onClick={() => void onShare()} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gray-400 hover:bg-white/[0.04]"><Share2 className="h-4 w-4" /> Partager</button><button onClick={() => void onMessage()} className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-bold text-gray-400 hover:bg-white/[0.04]"><MessageSquareText className="h-4 w-4" /> Message</button></div>
    {commentsOpen && <div className="p-3"><div className="space-y-2">{comments.map((c) => <div key={c.id} className="rounded-2xl bg-white/[0.04] px-3 py-2"><p className="text-[10px] font-black text-white">{c.userName}</p><p className="mt-1 text-xs leading-5 text-gray-300">{c.text}</p></div>)}</div><div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/10 bg-[#07101f] p-2"><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={1} placeholder="Écrire un commentaire…" className="max-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-xs text-white outline-none placeholder:text-gray-600" /><button onClick={() => void onComment()} disabled={!comment.trim()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button></div></div>}
  </article>;
};
