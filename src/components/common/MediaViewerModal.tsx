import React, { useState, useRef } from 'react';
import { GenerationRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { BrandWatermark } from './BrandWatermark';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Film, 
  Image as ImageIcon, 
  Music as MusicIcon,
  Trash2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MediaViewerModalProps {
  media: GenerationRecord | null;
  onClose: () => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ media, onClose }) => {
  const { addNotification, removeGeneration, setActiveStudio, setActiveTab, setImageToVideoTransfer } = useApp();
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!media) return null;

  const isImage = media.type === 'image';
  const isVideo = media.type === 'video' || media.type === 'clips';
  const isMusic = media.type === 'music';

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(media.enhancedPrompt || media.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('info', 'Prompt copié', 'Le prompt a été copié dans le presse-papiers.');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: media.title,
        text: `Création IA sur MUNGWELE AI STUDIO : ${media.title}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/creations?id=${media.id}`);
      addNotification('success', 'Lien de partage copié !', 'Le lien public vers cette création a été copié.');
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = media.resultUrl;
    a.download = `mungwele-${media.type}-${media.id}.${isImage ? 'png' : isVideo ? 'mp4' : 'mp3'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addNotification('success', 'Téléchargement démarré', `Votre fichier ${media.type} est en cours de téléchargement.`);
  };

  const handleTransferToVideo = () => {
    setImageToVideoTransfer(media.resultUrl);
    setActiveStudio('video');
    setActiveTab('studio-video');
    onClose();
    addNotification('success', 'Image transférée !', 'L\'image a été insérée comme image de départ dans Studio Vidéo.');
  };

  const handleDelete = () => {
    if (confirm('Voulez-vous vraiment supprimer cette création ?')) {
      removeGeneration(media.id);
      onClose();
    }
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) videoRef.current.pause();
    else videoRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  return (
    <AnimatePresence>
      <div id="media-viewer-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-2 backdrop-blur-md sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          id="media-viewer-modal-content"
          className="relative my-auto flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#081226]/85 text-white shadow-2xl backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-5 py-4">
            <div className="flex items-center space-x-3 truncate">
              <div className={`rounded-xl border border-white/20 p-2 text-white ${isImage ? 'bg-purple-600/80' : isVideo ? 'bg-pink-600/80' : 'bg-blue-600/80'}`}>
                {isImage && <ImageIcon className="h-4 w-4" />}
                {isVideo && <Film className="h-4 w-4" />}
                {isMusic && <MusicIcon className="h-4 w-4" />}
              </div>
              <div className="truncate">
                <h3 className="truncate text-base font-bold text-white">{media.title}</h3>
                <div className="flex items-center space-x-2 text-xs text-gray-400"><span>{media.provider}</span><span>•</span><span>{media.model}</span></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button id="media-viewer-download-btn" onClick={handleDownload} className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-gray-200 transition-colors hover:bg-white/[0.12] hover:text-white" title="Télécharger"><Download className="h-4 w-4" /></button>
              <button id="media-viewer-share-btn" onClick={handleShare} className="rounded-xl border border-white/10 bg-white/[0.06] p-2 text-gray-200 transition-colors hover:bg-white/[0.12] hover:text-white" title="Partager"><Share2 className="h-4 w-4" /></button>
              <button id="media-viewer-close-btn" onClick={onClose} className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white" title="Fermer"><X className="h-5 w-5" /></button>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 lg:grid-cols-12">
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/40 p-4 lg:col-span-7">
              {isImage && (
                <div className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl">
                  <img src={media.resultUrl} alt={media.title} referrerPolicy="no-referrer" className="max-h-[460px] w-auto max-w-full rounded-xl object-contain shadow-2xl" />
                  <BrandWatermark opacity={0.28} />
                </div>
              )}

              {isVideo && (
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
                  <video ref={videoRef} src={media.resultUrl} poster={media.thumbnailUrl} loop playsInline className="h-full w-full object-contain" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                  <BrandWatermark className="bottom-16" opacity={0.28} />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md">
                    <button onClick={toggleVideoPlay} className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white" />}</button>
                    <span className="text-xs font-mono text-gray-300">{media.model} • {(media.settings as any)?.duration || 10}s</span>
                    <button onClick={() => { if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); } }} className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
                  </div>
                </div>
              )}

              {isMusic && (
                <div className="flex w-full flex-col items-center justify-center space-y-4 p-6 text-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-2 border-purple-500/40 shadow-2xl">
                    <img src={media.thumbnailUrl} alt={media.title} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    <button onClick={toggleAudioPlay} className="absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-all hover:bg-black/20">{isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 fill-white" />}</button>
                  </div>
                  <audio ref={audioRef} src={media.resultUrl} loop onTimeUpdate={() => { if (audioRef.current) setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100 || 0); }} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
                  <div className="flex h-12 w-full max-w-md items-center justify-center space-x-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 backdrop-blur-md">
                    {[...Array(32)].map((_, i) => <div key={i} className={`w-1.5 rounded-full transition-all duration-150 ${isPlaying ? 'bg-gradient-to-t from-purple-500 to-pink-500' : 'h-2 bg-white/10'}`} style={{ height: isPlaying ? `${Math.max(15, (Math.sin(i + audioProgress / 10) * 0.5 + 0.5) * 100)}%` : '8px' }} />)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wider text-purple-300">Prompt Utilisé</span><button onClick={handleCopyPrompt} className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}<span>{copied ? 'Copié' : 'Copier'}</span></button></div>
                  <div className="max-h-36 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-relaxed text-gray-200 backdrop-blur-md">{media.enhancedPrompt || media.prompt}</div>
                </div>
                {isMusic && media.lyrics && <div><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-blue-300">Paroles du Morceau</span><pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.04] p-3 font-sans text-xs leading-relaxed text-gray-300 backdrop-blur-md">{media.lyrics}</pre></div>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-md"><span className="block text-[10px] uppercase text-gray-400">Coût</span><span className="flex items-center space-x-1 font-semibold text-amber-400"><Zap className="h-3 w-3" /><span>{media.creditsUsed} Crédits</span></span></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-md"><span className="block text-[10px] uppercase text-gray-400">Créé le</span><span className="font-medium text-gray-200">{new Date(media.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
                </div>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                {isImage && <button id="btn-use-in-video-modal" onClick={handleTransferToVideo} className="flex w-full items-center justify-center space-x-2 rounded-xl border border-white/20 bg-gradient-to-r from-pink-600 to-purple-600 py-3 text-xs font-semibold text-white shadow-md shadow-pink-900/30 transition-all hover:from-pink-500 hover:to-purple-500"><Film className="h-4 w-4" /><span>Animer avec Studio Vidéo</span></button>}
                <div className="flex items-center space-x-2"><button onClick={handleDownload} className="flex flex-1 items-center justify-center space-x-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/[0.12]"><Download className="h-3.5 w-3.5" /><span>Télécharger</span></button><button onClick={handleDelete} className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-2.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-900/60" title="Supprimer la création"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
