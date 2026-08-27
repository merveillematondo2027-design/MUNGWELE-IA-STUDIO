import React, { useState, useRef } from 'react';
import { GenerationRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Sparkles, 
  Check, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Film, 
  Image as ImageIcon, 
  Music as MusicIcon,
  Trash2,
  ExternalLink,
  Calendar,
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
  const isVideo = media.type === 'video';
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
        text: `Création IA sur MUNGWELE IA STUDIO : ${media.title}`,
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
    addNotification('success', 'Image transférée !', 'L\'image a été insérée comme image de départ dans Studio Vidéo (Veo 3).');
  };

  const handleDelete = () => {
    if (confirm('Voulez-vous vraiment supprimer cette création ?')) {
      removeGeneration(media.id);
      onClose();
    }
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleAudioPlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="media-viewer-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          id="media-viewer-modal-content"
          className="relative w-full max-w-4xl bg-[#081226]/85 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-3 truncate">
              <div className={`p-2 rounded-xl text-white border border-white/20 ${
                isImage ? 'bg-purple-600/80' : isVideo ? 'bg-pink-600/80' : 'bg-blue-600/80'
              }`}>
                {isImage && <ImageIcon className="w-4 h-4" />}
                {isVideo && <Film className="w-4 h-4" />}
                {isMusic && <MusicIcon className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <h3 className="text-base font-bold text-white truncate">
                  {media.title}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>{media.provider}</span>
                  <span>•</span>
                  <span>{media.model}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="media-viewer-download-btn"
                onClick={handleDownload}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 hover:text-white transition-colors"
                title="Télécharger"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                id="media-viewer-share-btn"
                onClick={handleShare}
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 hover:text-white transition-colors"
                title="Partager"
              >
                <Share2 className="w-4 h-4" />
              </button>
              <button
                id="media-viewer-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual / Player Area */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center bg-black/40 rounded-2xl border border-white/10 p-4 min-h-[300px]">
              {isImage && (
                <div className="relative group w-full h-full flex items-center justify-center">
                  <img
                    src={media.resultUrl}
                    alt={media.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[460px] w-auto max-w-full rounded-xl object-contain shadow-2xl"
                  />
                </div>
              )}

              {isVideo && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10">
                  <video
                    ref={videoRef}
                    src={media.resultUrl}
                    poster={media.thumbnailUrl}
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                    <button
                      onClick={toggleVideoPlay}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>
                    <span className="text-xs text-gray-300 font-mono">
                      Google Veo 3 • {(media.settings as any)?.duration || 10}s
                    </span>
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {isMusic && (
                <div className="w-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/40">
                    <img
                      src={media.thumbnailUrl}
                      alt={media.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={toggleAudioPlay}
                      className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center text-white transition-all"
                    >
                      {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 fill-white" />}
                    </button>
                  </div>

                  <audio
                    ref={audioRef}
                    src={media.resultUrl}
                    loop
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        setAudioProgress(
                          (audioRef.current.currentTime / audioRef.current.duration) * 100 || 0
                        );
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />

                  {/* Audio Wave Visualizer Simulation */}
                  <div className="w-full max-w-md h-12 flex items-center justify-center space-x-1 px-4 py-2 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10">
                    {[...Array(32)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-full transition-all duration-150 ${
                          isPlaying
                            ? 'bg-gradient-to-t from-purple-500 to-pink-500 ' +
                              (i % 4 === 0 ? 'animate-wave-1' : i % 4 === 1 ? 'animate-wave-2' : i % 4 === 2 ? 'animate-wave-3' : 'animate-wave-4')
                            : 'bg-white/10 h-2'
                        }`}
                        style={{
                          height: isPlaying ? `${Math.max(15, (Math.sin(i + audioProgress / 10) * 0.5 + 0.5) * 100)}%` : '8px',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata & Actions Area */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {/* Prompt Details */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                      Prompt Utilisé
                    </span>
                    <button
                      onClick={handleCopyPrompt}
                      className="text-xs text-gray-400 hover:text-white flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copié' : 'Copier'}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-gray-200 leading-relaxed max-h-36 overflow-y-auto">
                    {media.enhancedPrompt || media.prompt}
                  </div>
                </div>

                {/* Lyrics for music if available */}
                {isMusic && media.lyrics && (
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 block mb-1">
                      Paroles du Morceau
                    </span>
                    <pre className="p-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-gray-300 font-sans leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {media.lyrics}
                    </pre>
                  </div>
                )}

                {/* Technical Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase">Coût</span>
                    <span className="font-semibold text-amber-400 flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>{media.creditsUsed} Crédits</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10">
                    <span className="text-gray-400 block text-[10px] uppercase">Créé le</span>
                    <span className="font-medium text-gray-200">
                      {new Date(media.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                {isImage && (
                  <button
                    id="btn-use-in-video-modal"
                    onClick={handleTransferToVideo}
                    className="w-full py-3 rounded-xl font-semibold text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white flex items-center justify-center space-x-2 shadow-md shadow-pink-900/30 transition-all border border-white/20"
                  >
                    <Film className="w-4 h-4" />
                    <span>Animer avec Studio Vidéo (Veo 3)</span>
                  </button>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-2.5 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 transition-colors"
                    title="Supprimer la création"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
