import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Download, Flag, Heart, MessageCircle, MessageSquareText, MoreHorizontal, Play, Send, Share2, UserCheck, UserPlus, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addComment, notifyUser, reportPost, sharePost, subscribeComments, subscribeFollow, subscribeLikes, toggleFollow, toggleLike, sendMessage, type CommunityPost } from '../../services/socialService';
import { getMDigiProfile, type MDigiProfile } from '../../services/mdigiService';
import { DownloadOptionsModal } from '../common/DownloadOptionsModal';
import type { GenerationRecord } from '../../types';

const CommunityVideo: React.FC<{ post: CommunityPost }> = ({ post }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasPoster = Boolean(post.thumbnailUrl && post.thumbnailUrl !== post.mediaUrl);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return;
    if (!('IntersectionObserver' in window)) { setNearViewport(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: '1100px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [post.mediaUrl]);

  return <div ref={hostRef} className="relative min-h-[220px] overflow-hidden bg-black sm:min-h-[320px]">
    {!ready && hasPoster && <img src={post.thumbnailUrl} alt="Aperçu vidéo" className="absolute inset-0 h-full w-full object-contain" draggable={false} />}
    {!ready && !hasPoster && <div className="absolute inset-0 flex min-h-[220px] items-center justify-center bg-gradient-to-b from-[#111827] to-black sm:min-h-[320px]"><div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white"><Play className="ml-1 h-7 w-7 fill-current" /></div></div>}
    {nearViewport && !failed && <video src={post.mediaUrl} controls playsInline preload="auto" poster={hasPoster ? post.thumbnailUrl : undefined} controlsList="nodownload noremoteplayback" disablePictureInPicture onCanPlay={() => setReady(true)} onLoadedData={() => setReady(true)} onError={() => setFailed(true)} onContextMenu={(e)=>e.preventDefault()} className={`relative z-10 max-h-[620px] w-full bg-black object-contain transition-opacity duration-200 ${ready ? 'opacity-100' : 'opacity-0'}`} />}
    {failed && <div className="relative z-20 flex min-h-[220px] items-center justify-center bg-black px-6 text-center text-xs text-gray-500 sm:min-h-[320px]">Cette vidéo n’est plus disponible depuis sa source. La publication reste conservée.</div>}
  </div>;
};

export const CommunityPostCard: React.FC<{ post: CommunityPost }> = ({ post }) => {
  const { user, addNotification, setActiveTab, setAuthMode, setIsAuthModalOpen } = useApp();
  const [likes, setLikes] = useState<string[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [following, setFollowing] = useState(false);
  const [comment, setComment] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [liveProfile, setLiveProfile] = useState<MDigiProfile | null>(null);

  const profileId = post.userId || post.authorId;
  const canFollow = Boolean(user.id && post.userId && user.id !== post.userId && !post.isOfficial);
  const liked = Boolean(user.id && likes.includes(user.id));
  const visibleName = liveProfile?.nickname || post.authorName || 'Créateur MUNGWELE';
  const visibleAvatar = liveProfile?.avatar || post.authorAvatar || '';
  const official = Boolean(post.isOfficial || liveProfile?.isOfficial);

  const downloadItem: GenerationRecord = {
    id:post.generationId || post.id, userId:post.userId, type:post.type, title:post.title,
    prompt:post.caption || '', provider:'', model:'', status:'completed', resultUrl:post.mediaUrl,
    thumbnailUrl:post.thumbnailUrl || post.mediaUrl, creditsUsed:0, settings: post.type==='image' ? {style:'prompt-only',aspectRatio:'auto',quality:'high',quantity:1} : post.type==='music' ? {} : {aspectRatio:'16:9',duration:8},
    createdAt:post.createdAt, updatedAt:post.createdAt, isPublic:true, authorName:visibleName,
    allowCommunityDownload:Boolean(post.allowCommunityDownload),
  } as GenerationRecord;

  useEffect(() => subscribeLikes(post.id, setLikes), [post.id]);
  useEffect(() => subscribeComments(post.id, setComments), [post.id]);
  useEffect(() => canFollow ? subscribeFollow(user.id, post.userId, setFollowing) : undefined, [user.id, post.userId, canFollow]);
  useEffect(() => {
    let cancelled = false;
    if (!profileId) return;
    void getMDigiProfile(profileId).then((value) => { if (!cancelled) setLiveProfile(value); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [profileId]);

  const requestLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
    addNotification('info', 'Connexion requise', 'Connectez-vous à votre compte Créateur MUNGWELE AI STUDIO pour continuer.');
  };

  const requireStudioAccount = () => {
    if (user.id) return true;
    requestLogin();
    return false;
  };

  const requireMDigiAccount = async () => {
    if (!requireStudioAccount()) return false;
    if (user.role === 'admin') return true;
    const profile = await getMDigiProfile(user.id).catch(() => null);
    if (profile) return true;
    addNotification('info', 'Compte M.Digi requis', 'Créez votre identité M.Digi avant d’utiliser les fonctions sociales.');
    setActiveTab('mdigi');
    return false;
  };

  const openProfile = () => {
    if (!profileId) return;
    sessionStorage.setItem('mungwele.mdigi.openProfile', profileId);
    setActiveTab('mdigi');
  };

  const onLike = async () => {
    if (!await requireMDigiAccount()) return;
    try { await toggleLike(post.id, user, liked); if (!liked) await notifyUser(post.userId, user, 'like', `${user.name} aime votre publication.`, post.id); }
    catch(error:any){ addNotification('error','J’aime impossible',error?.message || 'Vérifiez vos permissions.'); }
  };
  const onComment = async () => {
    const value = comment.trim();
    if (!value || !await requireMDigiAccount()) return;
    try { await addComment(post.id, user, value); await notifyUser(post.userId, user, 'comment', `${user.name} a commenté votre publication.`, post.id); setComment(''); setCommentsOpen(true); }
    catch(error:any){ addNotification('error','Commentaire impossible',error?.message || 'Vérifiez vos permissions.'); }
  };
  const onFollow = async () => {
    if (!await requireMDigiAccount()) return;
    try { await toggleFollow(user.id, post.userId, user.name, following); if (!following) await notifyUser(post.userId, user, 'follow', `${user.name} s’est abonné à votre compte.`); }
    catch(error:any){ addNotification('error','Abonnement impossible',error?.message || 'Vérifiez vos permissions.'); }
  };
  const onShare = async () => { await sharePost(post); addNotification('success', 'Partage ouvert', 'Choisissez directement une application installée sur votre appareil.'); };
  const onMessage = async () => {
    if (!await requireMDigiAccount()) return;
    if (official) { addNotification('info', 'Compte officiel', 'La messagerie du compte officiel sera reliée au support MUNGWELE dans l’espace support.'); return; }
    try { await sendMessage(user, post.userId, visibleName, `Bonjour ${visibleName}, je vous écris à propos de votre publication « ${post.title} ».`); addNotification('success', 'Conversation créée', 'Retrouvez-la dans Messages.'); setActiveTab('messages'); }
    catch(error:any){ addNotification('error','Message impossible',error?.message || 'Vérifiez vos permissions.'); }
  };
  const openDownload = () => { if (!requireStudioAccount()) return; setDownloadOpen(true); };
  const onNotInterested = () => { setHidden(true); setActionsOpen(false); try { const ids=JSON.parse(localStorage.getItem('mungwele.hidden.posts')||'[]'); if(!ids.includes(post.id)) localStorage.setItem('mungwele.hidden.posts',JSON.stringify([...ids,post.id])); } catch {} addNotification('info','Publication masquée','MUNGWELE affichera moins de contenus similaires sur cet appareil.'); };
  const onReport = async () => {
    if (!requireStudioAccount()) return;
    try { await reportPost(post,user,'Contenu signalé depuis la communauté'); setActionsOpen(false); addNotification('success','Signalement envoyé','Merci. Le contenu a été transmis à la modération MUNGWELE.'); }
    catch(error:any){ addNotification('error','Signalement impossible',error?.message || 'Vérifiez vos permissions.'); }
  };

  useEffect(() => { try { const ids=JSON.parse(localStorage.getItem('mungwele.hidden.posts')||'[]'); if(Array.isArray(ids)&&ids.includes(post.id)) setHidden(true); } catch {} }, [post.id]);
  if (hidden) return null;
  const actionCols = post.allowCommunityDownload ? 'grid-cols-5' : 'grid-cols-4';

  return <article className="relative overflow-hidden rounded-[22px] border border-white/10 bg-[#0a1324]/95 shadow-xl">
    <div className="flex items-center gap-3 p-3.5 sm:p-4">
      <button onClick={openProfile} aria-label={`Voir le profil de ${visibleName}`} className="h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">{visibleAvatar ? <img src={visibleAvatar} alt={visibleName} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-purple-600 to-cyan-500 text-sm font-black text-white">{visibleName.charAt(0) || 'M'}</span>}</button>
      <div className="min-w-0 flex-1"><button onClick={openProfile} className="flex max-w-full items-center gap-1.5 text-left"><span className="truncate text-sm font-black text-white hover:underline">{visibleName}</span>{official && <BadgeCheck className="h-4 w-4 shrink-0 text-cyan-300" />}</button><p className="mt-0.5 text-[10px] text-gray-500">{new Date(post.createdAt).toLocaleString('fr-FR')}</p></div>
      {canFollow && <button onClick={() => void onFollow()} className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[10px] font-black ${following ? 'border-white/10 bg-white/[0.04] text-gray-300' : 'border-purple-500/25 bg-purple-500/10 text-purple-200'}`}>{following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}{following ? 'Abonné' : 'S’abonner'}</button>}
      <div className="relative"><button onClick={()=>setActionsOpen(v=>!v)} className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white/[0.06]" aria-label="Plus d’options"><MoreHorizontal className="h-5 w-5"/></button>{actionsOpen&&<div className="absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-2xl border border-white/10 bg-[#111827] p-1.5 shadow-2xl"><p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-600">Options de la publication</p>{post.allowCommunityDownload&&<button onClick={()=>{setActionsOpen(false);openDownload()}} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-gray-200 hover:bg-white/[0.05]"><Download className="h-4 w-4 text-cyan-300"/>Télécharger selon mon offre</button>}<button onClick={onNotInterested} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-gray-200 hover:bg-white/[0.05]"><XCircle className="h-4 w-4 text-amber-300"/>Pas intéressé(e)</button><button onClick={()=>void onReport()} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-rose-200 hover:bg-rose-500/10"><Flag className="h-4 w-4"/>Signaler</button></div>}</div>
    </div>
    <div className="px-4 pb-3">{post.caption && <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{post.caption}</p>}<p className="mt-2 text-xs font-black text-white">{post.title}</p></div>
    {post.type === 'music' ? <div className="flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-blue-950 to-purple-950 text-blue-200">Création musicale MUNGWELE</div> : post.type === 'video' || post.type === 'clips' ? <CommunityVideo post={post} /> : <img src={post.mediaUrl} alt={post.title} loading="lazy" decoding="async" onContextMenu={(e)=>e.preventDefault()} draggable={false} className="max-h-[620px] w-full select-none bg-black/30 object-contain" />}
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-[10px] text-gray-500"><span>{likes.length} J’aime</span><button onClick={() => setCommentsOpen((v) => !v)}>{comments.length} commentaire{comments.length > 1 ? 's' : ''}</button></div>
    <div className={`grid ${actionCols} border-b border-white/10 p-1`}><button onClick={() => void onLike()} className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-bold sm:flex-row sm:text-[11px] ${liked ? 'text-pink-300' : 'text-gray-400 hover:bg-white/[0.04]'}`}><Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} /> J’aime</button><button onClick={() => { if(requireStudioAccount()) setCommentsOpen(true); }} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-bold text-gray-400 hover:bg-white/[0.04] sm:flex-row sm:text-[11px]"><MessageCircle className="h-4 w-4" /> Commenter</button><button onClick={() => void onShare()} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-bold text-gray-400 hover:bg-white/[0.04] sm:flex-row sm:text-[11px]"><Share2 className="h-4 w-4" /> Partager</button><button onClick={() => void onMessage()} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-bold text-gray-400 hover:bg-white/[0.04] sm:flex-row sm:text-[11px]"><MessageSquareText className="h-4 w-4" /> Message</button>{post.allowCommunityDownload&&<button onClick={openDownload} className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-bold text-cyan-300 hover:bg-cyan-500/[0.06] sm:flex-row sm:text-[11px]"><Download className="h-4 w-4"/>Télécharger</button>}</div>
    {commentsOpen && <div className="p-3"><div className="space-y-2">{comments.map((c) => <div key={c.id} className="rounded-2xl bg-white/[0.04] px-3 py-2"><p className="text-[10px] font-black text-white">{c.userName}</p><p className="mt-1 text-xs leading-5 text-gray-300">{c.text}</p></div>)}</div><div className="mt-3 flex items-end gap-2 rounded-2xl border border-white/10 bg-[#07101f] p-2"><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={1} placeholder="Écrire un commentaire…" className="max-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-xs text-white outline-none placeholder:text-gray-600" /><button onClick={() => void onComment()} disabled={!comment.trim()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button></div></div>}
    <DownloadOptionsModal item={downloadOpen?downloadItem:null} onClose={()=>setDownloadOpen(false)} community ownerName={visibleName}/>
  </article>;
};
