import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Film, 
  Sparkles, 
  Upload, 
  X, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Share2, 
  Copy, 
  Trash2, 
  Zap, 
  RefreshCw, 
  Wand2, 
  Layers, 
  SlidersHorizontal,
  Clock,
  Mic,
  Clapperboard,
  RotateCcw
} from 'lucide-react';
import { STYLE_PRESETS_VIDEO, PROMPT_TEMPLATES } from '../../data/mockData';
import { PromptEnhanceButton } from '../common/PromptEnhanceButton';
import { PromptEnhancerModal } from '../common/PromptEnhancerModal';
import { VideoGenerationSettings, GenerationRecord } from '../../types';

export const VideoStudio: React.FC = () => {
  const { 
    useCredits, 
    refundCredits, 
    addGeneration, 
    removeGeneration, 
    addNotification, 
    setActiveMediaModal,
    imageToVideoTransfer,
    setImageToVideoTransfer,
    triggerCelebration,
    generations
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<VideoGenerationSettings['style']>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<VideoGenerationSettings['aspectRatio']>('16:9');
  const [duration, setDuration] = useState<5 | 10>(10);
  const [enableAudio, setEnableAudio] = useState(true);
  const [dialogue, setDialogue] = useState('');
  const [multiScenes, setMultiScenes] = useState(false);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [isEnhancerModalOpen, setIsEnhancerModalOpen] = useState(false);

  const startFileInputRef = useRef<HTMLInputElement | null>(null);
  const endFileInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Transfer image from Studio Image if available
  useEffect(() => {
    if (imageToVideoTransfer) {
      setStartImage(imageToVideoTransfer);
      setImageToVideoTransfer(null); // reset transfer
    }
  }, [imageToVideoTransfer, setImageToVideoTransfer]);

  const videoCreations = generations.filter((g) => g.type === 'video');
  const creditCost = duration === 10 ? 25 : 15;

  const handleStartImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Format invalide', 'Veuillez importer une image (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setStartImage(reader.result as string);
      addNotification('info', 'Image de départ ajoutée', 'Google Veo 3 démarrera la séquence à partir de ce visuel.');
    };
    reader.readAsDataURL(file);
  };

  const handleEndImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Format invalide', 'Veuillez importer une image valide.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEndImage(reader.result as string);
      addNotification('info', 'Image de fin ajoutée', 'Interpolation temporelle activée vers cette image.');
    };
    reader.readAsDataURL(file);
  };

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setGenerationProgress(0);
    refundCredits(creditCost, 'Annulation de la génération vidéo');
    addNotification('info', 'Génération annulée', 'Vos crédits ont été restitués.');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addNotification('warning', 'Prompt requis', 'Décrivez la vidéo que vous souhaitez créer.');
      return;
    }

    const allowed = useCredits(creditCost, `Génération vidéo Google Veo 3 (${duration}s)`);
    if (!allowed) return;

    setIsGenerating(true);
    setGenerationProgress(5);
    setStatusMessage('Initialisation du pipeline Google Veo 3...');

    abortControllerRef.current = new AbortController();

    const stages = [
      { progress: 20, msg: 'Analyse sémantique et cadrage de la scène...' },
      { progress: 45, msg: 'Synthèse des images clés et physique des mouvements...' },
      { progress: 70, msg: 'Rendu cinématique haute définition 60fps...' },
      { progress: 90, msg: 'Spatialisation audio et étalonnage des couleurs...' },
    ];

    let currentStage = 0;
    const progressTimer = setInterval(() => {
      if (currentStage < stages.length) {
        setGenerationProgress(stages[currentStage].progress);
        setStatusMessage(stages[currentStage].msg);
        currentStage++;
      }
    }, 1200);

    try {
      const res = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          enhancedPrompt,
          style: selectedStyle,
          aspectRatio,
          duration,
          enableAudio,
          dialogue,
          multiScenes,
          startImage,
          endImage,
        }),
        signal: abortControllerRef.current.signal,
      });

      clearInterval(progressTimer);
      setGenerationProgress(100);
      setStatusMessage('Finalisation...');

      const data = await res.json();
      if (res.ok && data.generation) {
        addGeneration(data.generation);
        triggerCelebration();
        addNotification(
          'success',
          'Vidéo Veo 3 prête ! 🎬',
          `Votre vidéo de ${duration}s a été générée avec succès.`
        );
      } else {
        throw new Error(data.error || 'Erreur lors de la synthèse vidéo.');
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      if (err.name !== 'AbortError') {
        console.warn('Video gen error:', err);
        refundCredits(creditCost, 'Échec de génération vidéo');
        addNotification(
          'error',
          'Échec du rendu vidéo',
          'Un problème technique est survenu. Vos crédits ont été remboursés.'
        );
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleDuplicateProject = (gen: GenerationRecord) => {
    setPrompt(gen.prompt);
    setEnhancedPrompt(gen.enhancedPrompt || '');
    if ((gen.settings as VideoGenerationSettings)?.style) {
      setSelectedStyle((gen.settings as VideoGenerationSettings).style);
      setDuration((gen.settings as VideoGenerationSettings).duration || 10);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addNotification('info', 'Projet dupliqué', 'Paramètres et prompt chargés dans le studio.');
  };

  return (
    <div id="video-studio-container" className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* Creation Card */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-pink-600/20 text-pink-300 border border-pink-500/30">
                <Film className="w-5 h-5" />
              </span>
              <span>Studio Vidéo — Google Veo 3</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Génération vidéo cinématique haute fidélité avec mouvements de caméra fluides et audio synchronisé.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] border border-pink-500/30 text-pink-200 flex items-center space-x-1.5 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Coût : <strong>{creditCost} crédits</strong></span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-6 pt-5">
          {/* Prompt Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-gray-200 flex items-center space-x-1.5">
                <span>Décrivez votre vidéo</span>
                <span className="text-pink-500">*</span>
              </label>

              <div className="flex items-center space-x-2">
                <PromptEnhanceButton
                  rawPrompt={prompt}
                  type="video"
                  style={selectedStyle}
                  onEnhanced={(text) => {
                    setPrompt(text);
                    setEnhancedPrompt(text);
                  }}
                />
                <button
                  id="open-prompt-modal-video"
                  onClick={() => setIsEnhancerModalOpen(true)}
                  className="text-xs text-gray-400 hover:text-pink-300 flex items-center space-x-1 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Options de caméra</span>
                </button>
              </div>
            </div>

            <textarea
              id="video-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Travelling de drone cinématographique au-dessus d'un temple futuriste dans la brume matinale, lumière dorée et vol d'oiseaux holographiques en 4K..."
              rows={3}
              className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 focus:border-pink-500/80 focus:bg-white/[0.08] text-white placeholder-gray-500 text-sm outline-none transition-all resize-none shadow-inner"
            />

            {/* Suggestions */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
              <span className="text-gray-400 text-[11px] shrink-0 font-medium">Inspirations :</span>
              {PROMPT_TEMPLATES.video.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(tmpl);
                    setEnhancedPrompt(tmpl);
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-pink-500/40 text-gray-300 hover:text-white transition-colors truncate max-w-[240px]"
                  title={tmpl}
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Start and End Image Uploaders (Keyframes) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Frame */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Image de départ (Image-to-Video)
              </label>
              <input
                type="file"
                ref={startFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleStartImageUpload(e.target.files[0]);
                  }
                }}
              />

              {startImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-pink-500/40 p-2 bg-white/[0.04] backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={startImage} alt="Départ" className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Image de départ active</span>
                      <span className="text-[10px] text-pink-300">Point d'amorce Veo 3</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setStartImage(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => startFileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-dashed border-white/15 hover:border-pink-500/60 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-md flex items-center space-x-3 cursor-pointer transition-all"
                >
                  <div className="p-2 rounded-xl bg-pink-950/40 text-pink-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-300 block">Choisir image de départ</span>
                    <span className="text-[10px] text-gray-500">Ou transférer depuis Studio Image</span>
                  </div>
                </div>
              )}
            </div>

            {/* End Frame */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Image de fin (Interpolation de fin)
              </label>
              <input
                type="file"
                ref={endFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleEndImageUpload(e.target.files[0]);
                  }
                }}
              />

              {endImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 p-2 bg-white/[0.04] backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={endImage} alt="Fin" className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Image de fin active</span>
                      <span className="text-[10px] text-purple-300">Point d'arrivée Veo 3</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEndImage(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => endFileInputRef.current?.click()}
                  className="p-3.5 rounded-2xl border border-dashed border-white/15 hover:border-purple-500/60 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-md flex items-center space-x-3 cursor-pointer transition-all"
                >
                  <div className="p-2 rounded-xl bg-purple-950/40 text-purple-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-300 block">Choisir image de fin</span>
                    <span className="text-[10px] text-gray-500">Optionnel pour cadrage final</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Style Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2.5">
              Style de Réalisation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {STYLE_PRESETS_VIDEO.map((style) => {
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    id={`video-style-${style.id}`}
                    onClick={() => setSelectedStyle(style.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all backdrop-blur-md ${
                      isSelected
                        ? 'bg-pink-950/50 border-pink-500 text-white shadow-md shadow-pink-950/40'
                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{style.icon}</span>
                      <span className="text-xs font-bold">{style.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">
                      {style.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formats, Duration & Audio Config */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Format Vidéo
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-pink-500"
              >
                <option value="16:9" className="bg-[#081226] text-white">Paysage 16:9 (Cinéma / TV / YouTube)</option>
                <option value="9:16" className="bg-[#081226] text-white">Portrait 9:16 (TikTok / Reels / Shorts)</option>
                <option value="1:1" className="bg-[#081226] text-white">Carré 1:1 (Post Réseaux Sociaux)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Durée de la séquence
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDuration(5)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    duration === 5
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-white/[0.04] backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  5 Secondes (15 crédits)
                </button>
                <button
                  type="button"
                  onClick={() => setDuration(10)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    duration === 10
                      ? 'bg-pink-600 text-white shadow-md'
                      : 'bg-white/[0.04] backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.08]'
                  }`}
                >
                  10 Secondes (25 crédits)
                </button>
              </div>
            </div>

            {/* Audio Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Environnement Sonore
              </label>
              <button
                type="button"
                onClick={() => setEnableAudio(!enableAudio)}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border transition-all ${
                  enableAudio
                    ? 'bg-pink-950/40 border-pink-500/50 text-pink-200'
                    : 'bg-white/[0.04] backdrop-blur-md border-white/10 text-gray-400 hover:bg-white/[0.08]'
                }`}
              >
                {enableAudio ? <Volume2 className="w-4 h-4 text-pink-400" /> : <VolumeX className="w-4 h-4" />}
                <span>{enableAudio ? 'Audio IA Activé' : 'Vidéo Muette'}</span>
              </button>
            </div>
          </div>

          {/* Dialogue / Commentary field & Multi-scenes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Dialogue ou commentaire audio (Optionnel)
              </label>
              <input
                type="text"
                value={dialogue}
                onChange={(e) => setDialogue(e.target.value)}
                placeholder="Ex: 'Voici la nouvelle ère de la création par IA...'"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10">
              <div>
                <span className="text-xs font-semibold text-white block">Générer plusieurs scènes</span>
                <span className="text-[10px] text-gray-400">Enchaînement multi-plans automatique</span>
              </div>
              <input
                type="checkbox"
                checked={multiScenes}
                onChange={(e) => setMultiScenes(e.target.checked)}
                className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Generation Progress & Status Overlay */}
          {isGenerating && (
            <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-pink-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
                  <span className="text-xs font-bold text-pink-200">{statusMessage}</span>
                </div>
                <span className="text-xs font-mono font-bold text-pink-400">{generationProgress}%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                <span>⏱️ La synthèse vidéo peut prendre quelques instants.</span>
                <button
                  onClick={handleCancelGeneration}
                  className="text-rose-400 hover:text-rose-300 font-semibold underline"
                >
                  Annuler et rembourser
                </button>
              </div>
            </div>
          )}

          {/* Main Button */}
          <button
            id="btn-generate-video"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-base bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 hover:from-pink-500 hover:to-blue-500 text-white flex items-center justify-center space-x-3 shadow-xl shadow-pink-950/60 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Synthèse Veo 3 en cours...</span>
              </>
            ) : (
              <>
                <Clapperboard className="w-5 h-5" />
                <span>Générer la vidéo ({creditCost} crédits)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Video Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Galerie Vidéo Google Veo 3</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-pink-500/30 text-pink-300 font-mono">
              {videoCreations.length}
            </span>
          </h3>
        </div>

        {videoCreations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10">
            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Aucune vidéo générée pour l'instant</p>
            <p className="text-xs text-gray-500 mt-1">
              Décrivez votre projet cinématographique ci-dessus pour lancer le rendu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {videoCreations.map((gen) => (
              <div
                key={gen.id}
                id={`video-card-${gen.id}`}
                className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-pink-500/40 hover:bg-white/[0.06] overflow-hidden shadow-xl transition-all flex flex-col justify-between"
              >
                {/* Video Player */}
                <div className="relative aspect-video bg-black flex items-center justify-center group">
                  <video
                    src={gen.resultUrl}
                    poster={gen.thumbnailUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Info & Actions */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white line-clamp-1">
                      {gen.title}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-pink-950/60 border border-pink-500/30 text-pink-300 font-semibold font-mono">
                      Veo 3 • {(gen.settings as any)?.duration || 10}s
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {gen.prompt}
                  </p>

                  {/* Actions Bar */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = gen.resultUrl;
                        a.download = `mungwele-video-${gen.id}.mp4`;
                        a.click();
                        addNotification('success', 'Téléchargement lancé', 'Votre vidéo est en cours de téléchargement.');
                      }}
                      className="py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 hover:text-white text-[10px] font-medium flex items-center justify-center space-x-1"
                      title="Télécharger la vidéo"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger</span>
                    </button>

                    <button
                      onClick={() => handleDuplicateProject(gen)}
                      className="py-1.5 px-2 rounded-lg bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/30 text-pink-200 text-[10px] font-medium flex items-center justify-center space-x-1"
                      title="Dupliquer le projet"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Dupliquer</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        addNotification('success', 'Lien copié', 'Lien de partage enregistré.');
                      }}
                      className="py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 hover:text-white text-[10px] font-medium flex items-center justify-center space-x-1"
                      title="Partager la vidéo"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Partager</span>
                    </button>

                    <button
                      onClick={() => removeGeneration(gen.id)}
                      className="py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[10px] font-medium flex items-center justify-center space-x-1"
                      title="Supprimer la vidéo"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Prompt Enhancer Modal */}
      <PromptEnhancerModal
        isOpen={isEnhancerModalOpen}
        onClose={() => setIsEnhancerModalOpen(false)}
        initialPrompt={prompt}
        type="video"
        onApply={(text) => {
          setPrompt(text);
          setEnhancedPrompt(text);
        }}
      />
    </div>
  );
};
