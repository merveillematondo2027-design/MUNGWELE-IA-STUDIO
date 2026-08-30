import React, { useRef, useState } from 'react';
import { GenerationRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { BrandWatermark } from './BrandWatermark';
import { PublishCreationModal } from '../community/PublishCreationModal';
import { X, Download, Share2, Copy, Check, Play, Pause, Volume2, VolumeX, Film, Image as ImageIcon, Music as MusicIcon, Trash2, Zap, Globe2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MediaViewerModalProps { media: GenerationRecord | null; onClose: () => void; }

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ media, onClose }) => {
  const { addNotification, removeGeneration, setActiveStudio, setActiveTab, setImageToVideoTransfer } = useApp();
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!media) return null;

  const isImage = media.type === 'image';
  const isVideo = media.type === 'video' || media.type === 'clips';
  const isMusic = media.type === 'music';

  const handleCopyPrompt = async () => { await navigator.clipboard.writeText(media.enhancedPrompt || media.prompt); setCopied(true); setTimeout(() => setCopied(false), 2000); addNotification('info','Prompt copié','Le prompt a été copié.'); };
  const handleShare = async () => { const url=`${window.location.origin}${window.location.pathname}?creation=${media.id}`; if(navigator.share) await navigator.share({title:media.title,text:`Création MUNGWELE AI : ${media.title}`,url}).catch(()=>undefined); else { await navigator.clipboard.writeText(url); addNotification('success','Lien copié','Le lien de partage a été copié.'); } };
  const handleDownload = async () => {
    try {
      const response=await fetch(media.resultUrl); if(!response.ok) throw new Error('Fichier indisponible.');
      const blob=await response.blob(); const url=URL.createObjectURL(blob);
      const ext=isImage?(blob.type.includes('webp')?'webp':blob.type.includes('jpeg')?'jpg':'png'):isVideo?'mp4':'mp3';
      const a=document.createElement('a'); a.href=url; a.download=`mungwele-${media.type}-${media.id}.${ext}`; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1500);
      addNotification('success','Téléchargement lancé','Le fichier est téléchargé directement.');
    } catch(error:any){ addNotification('error','Téléchargement impossible',error?.message||'Impossible de télécharger le fichier.'); }
  };
  const handleTransferToVideo = () => { setImageToVideoTransfer(media.resultUrl); setActiveStudio('video'); setActiveTab('studio-video'); onClose(); addNotification('success','Image transférée','L’image a été insérée dans Studio Vidéo.'); };
  const handleDelete = () => { if(confirm('Voulez-vous vraiment supprimer cette création ?')) { removeGeneration(media.id); onClose(); } };
  const toggleVideoPlay=()=>{if(!videoRef.current)return;if(isPlaying)videoRef.current.pause();else void videoRef.current.play();setIsPlaying(!isPlaying)};
  const toggleAudioPlay=()=>{if(!audioRef.current)return;if(isPlaying)audioRef.current.pause();else void audioRef.current.play();setIsPlaying(!isPlaying)};

  return <AnimatePresence><div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-2 backdrop-blur-md sm:p-4"><motion.div initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.96}} className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#081226]/90 text-white shadow-2xl backdrop-blur-2xl">
    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className={`rounded-xl border border-white/20 p-2 ${isImage?'bg-purple-600/80':isVideo?'bg-pink-600/80':'bg-blue-600/80'}`}>{isImage?<ImageIcon className="h-4 w-4"/>:isVideo?<Film className="h-4 w-4"/>:<MusicIcon className="h-4 w-4"/>}</div><div className="min-w-0"><h3 className="truncate text-base font-bold">{media.title}</h3><p className="truncate text-xs text-gray-400">{media.provider} • {media.model}</p></div></div><div className="flex items-center gap-2"><button onClick={()=>void handleDownload()} className="rounded-xl border border-white/10 bg-white/[0.06] p-2"><Download className="h-4 w-4"/></button><button onClick={()=>void handleShare()} className="rounded-xl border border-white/10 bg-white/[0.06] p-2"><Share2 className="h-4 w-4"/></button><button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-white/10"><X className="h-5 w-5"/></button></div></div>

    <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 lg:grid-cols-12"><div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-4 lg:col-span-7">
      {isImage&&<div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl"><img src={media.resultUrl} alt={media.title} className="max-h-[460px] max-w-full rounded-xl object-contain"/><BrandWatermark opacity={0.28}/></div>}
      {isVideo&&<div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-black"><video ref={videoRef} src={media.resultUrl} poster={media.thumbnailUrl} loop playsInline className="h-full w-full object-contain" onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)}/><BrandWatermark className="bottom-16" opacity={0.28}/><div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/60 p-2"><button onClick={toggleVideoPlay} className="rounded-lg bg-white/20 p-2">{isPlaying?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4 fill-white"/>}</button><span className="text-xs text-gray-300">{media.model} • {(media.settings as any)?.duration||10}s</span><button onClick={()=>{if(videoRef.current){videoRef.current.muted=!isMuted;setIsMuted(!isMuted)}}} className="rounded-lg bg-white/20 p-2">{isMuted?<VolumeX className="h-4 w-4"/>:<Volume2 className="h-4 w-4"/>}</button></div></div>}
      {isMusic&&<div className="flex w-full flex-col items-center justify-center space-y-4 p-6"><div className="relative h-28 w-28 overflow-hidden rounded-2xl border-2 border-purple-500/40"><img src={media.thumbnailUrl} alt={media.title} className="h-full w-full object-cover"/><button onClick={toggleAudioPlay} className="absolute inset-0 flex items-center justify-center bg-black/40">{isPlaying?<Pause className="h-10 w-10"/>:<Play className="h-10 w-10 fill-white"/>}</button></div><audio ref={audioRef} src={media.resultUrl} loop onTimeUpdate={()=>{if(audioRef.current)setAudioProgress((audioRef.current.currentTime/audioRef.current.duration)*100||0)}} onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)}/><div className="flex h-12 w-full max-w-md items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-4">{[...Array(32)].map((_,i)=><div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-purple-500 to-pink-500" style={{height:isPlaying?`${Math.max(15,(Math.sin(i+audioProgress/10)*.5+.5)*100)}%`:'8px'}}/>)}</div></div>}
    </div>

    <div className="flex flex-col justify-between space-y-4 lg:col-span-5"><div className="space-y-4"><div><div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-purple-300">Prompt utilisé</span><button onClick={()=>void handleCopyPrompt()} className="flex items-center gap-1 text-xs text-gray-400">{copied?<Check className="h-3.5 w-3.5 text-emerald-400"/>:<Copy className="h-3.5 w-3.5"/>}{copied?'Copié':'Copier'}</button></div><div className="max-h-36 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-relaxed text-gray-200">{media.enhancedPrompt||media.prompt}</div></div>{media.publicationCaption&&<div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 text-xs leading-5 text-gray-300"><p className="mb-1 text-[10px] font-black uppercase text-cyan-300">Description publiée</p>{media.publicationCaption}</div>}<div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5"><span className="block text-[10px] uppercase text-gray-400">Coût</span><span className="flex items-center gap-1 font-semibold text-amber-400"><Zap className="h-3 w-3"/>{media.creditsUsed} crédits</span></div><div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5"><span className="block text-[10px] uppercase text-gray-400">Créé le</span><span className="font-medium text-gray-200">{new Date(media.createdAt).toLocaleDateString('fr-FR')}</span></div></div></div>
      <div className="space-y-2 border-t border-white/10 pt-4">{!media.isPublic&&<button onClick={()=>setPublishing(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 py-3 text-xs font-black text-cyan-200"><Globe2 className="h-4 w-4"/> Publier dans la communauté</button>}{isImage&&<button onClick={handleTransferToVideo} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 py-3 text-xs font-semibold"><Film className="h-4 w-4"/> Animer avec Studio Vidéo</button>}<div className="flex gap-2"><button onClick={()=>void handleDownload()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-xs font-semibold"><Download className="h-3.5 w-3.5"/> Télécharger</button><button onClick={handleDelete} className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-rose-300"><Trash2 className="h-4 w-4"/></button></div></div></div>
    </div>
  </motion.div><PublishCreationModal item={publishing?media:null} onClose={()=>setPublishing(false)}/></div></AnimatePresence>;
};
