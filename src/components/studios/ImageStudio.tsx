import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Sparkles, 
  Upload, 
  X, 
  Image as ImageIcon, 
  RefreshCw, 
  Zap, 
  Maximize2, 
  Download, 
  Film, 
  Trash2, 
  Copy, 
  Layers, 
  Sliders,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import { STYLE_PRESETS_IMAGE, PROMPT_TEMPLATES } from '../../data/mockData';
import { PromptEnhanceButton } from '../common/PromptEnhanceButton';
import { PromptEnhancerModal } from '../common/PromptEnhancerModal';
import { ImageGenerationSettings, GenerationRecord } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const ImageStudio: React.FC = () => {
  const { 
    useCredits, 
    refundCredits, 
    addGeneration, 
    removeGeneration, 
    addNotification, 
    setActiveMediaModal,
    setImageToVideoTransfer,
    setActiveStudio,
    setActiveTab,
    triggerCelebration,
    generations
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ImageGenerationSettings['style']>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<ImageGenerationSettings['aspectRatio']>('1:1');
  const [quality, setQuality] = useState<ImageGenerationSettings['quality']>('ultra_4k');
  const [quantity, setQuantity] = useState<number>(1);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancerModalOpen, setIsEnhancerModalOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter image creations to display in gallery
  const imageCreations = generations.filter((g) => g.type === 'image');

  const creditCost = (quality === 'ultra_4k' || quality === 'studio_master' ? 8 : 5) * quantity;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Format invalide', 'Veuillez sélectionner un fichier image valide (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addNotification('error', 'Fichier trop lourd', 'La taille maximale de l\'image de référence est de 10 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      addNotification('info', 'Image importée', 'L\'image de référence sera utilisée pour guider le style et la composition.');
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addNotification('warning', 'Prompt requis', 'Décrivez l\'image que vous souhaitez créer.');
      return;
    }

    // Deduct credits
    const allowed = useCredits(creditCost, `Génération de ${quantity} image(s) [${selectedStyle}]`);
    if (!allowed) return;

    setIsGenerating(true);
    setGenerationProgress(15);

    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 15;
      });
    }, 400);

    try {
      const res = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          enhancedPrompt,
          style: selectedStyle,
          aspectRatio,
          quality,
          quantity,
          referenceImage,
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      const data = await res.json();
      if (res.ok && data.generation) {
        addGeneration(data.generation);
        triggerCelebration();
        addNotification(
          'success',
          'Image générée avec succès !',
          `Votre chef-d'œuvre a été ajouté à votre galerie.`
        );
      } else {
        throw new Error(data.error || 'Erreur inconnue lors du rendu.');
      }
    } catch (err: any) {
      console.warn('Image gen error, refunding credits:', err);
      refundCredits(creditCost, 'Échec de génération image');
      addNotification(
        'error',
        'Échec de la génération',
        'Une erreur s\'est produite. Vos crédits ont été automatiquement remboursés.'
      );
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleTransferToVideo = (imgUrl: string) => {
    setImageToVideoTransfer(imgUrl);
    setActiveStudio('video');
    setActiveTab('studio-video');
    addNotification('success', 'Image envoyée au Studio Vidéo', 'Vous pouvez maintenant l\'animer avec Google Veo 3 !');
  };

  const handleCreateVariant = (gen: GenerationRecord) => {
    setPrompt(gen.prompt);
    setEnhancedPrompt(gen.enhancedPrompt || '');
    if ((gen.settings as ImageGenerationSettings)?.style) {
      setSelectedStyle((gen.settings as ImageGenerationSettings).style);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addNotification('info', 'Variante préparée', 'Les paramètres ont été chargés dans le formulaire.');
  };

  return (
    <div id="image-studio-container" className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* Creation Card */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <ImageIcon className="w-5 h-5" />
              </span>
              <span>Studio Image IA</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Générez des visuels 8K photoréalistes avec Google Imagen 3 et nos moteurs artistiques.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] border border-purple-500/30 text-purple-200 flex items-center space-x-1.5 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Coût : <strong>{creditCost} crédits</strong></span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-6 pt-5">
          {/* Prompt Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-gray-200 flex items-center space-x-1.5">
                <span>Décrivez l’image que vous souhaitez créer</span>
                <span className="text-pink-500">*</span>
              </label>

              <div className="flex items-center space-x-2">
                <PromptEnhanceButton
                  rawPrompt={prompt}
                  type="image"
                  style={selectedStyle}
                  onEnhanced={(text) => {
                    setPrompt(text);
                    setEnhancedPrompt(text);
                  }}
                />
                <button
                  id="open-prompt-modal-image"
                  onClick={() => setIsEnhancerModalOpen(true)}
                  className="text-xs text-gray-400 hover:text-purple-300 flex items-center space-x-1 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Options avancées</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                id="image-prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Cité africaine ultra-futuriste en 2080 avec gratte-ciels en verre bioluminescent et ponts suspendus dorés au crépuscule, vue cinématique 8K..."
                rows={3}
                className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] text-white placeholder-gray-500 text-sm outline-none transition-all resize-none shadow-inner"
              />
            </div>

            {/* Quick Inspiration Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
              <span className="text-gray-400 text-[11px] shrink-0 font-medium">Suggestions :</span>
              {PROMPT_TEMPLATES.image.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(tmpl);
                    setEnhancedPrompt(tmpl);
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-purple-500/40 text-gray-300 hover:text-white transition-colors truncate max-w-[220px]"
                  title={tmpl}
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Image Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Image de référence (Optionnel)
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            {referenceImage ? (
              <div className="relative inline-block rounded-2xl overflow-hidden border border-purple-500/40 shadow-lg group">
                <img
                  src={referenceImage}
                  alt="Référence"
                  className="w-28 h-28 object-cover"
                />
                <button
                  onClick={() => setReferenceImage(null)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white transition-colors"
                  title="Supprimer la référence"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="w-full py-4 px-6 rounded-2xl border border-dashed border-white/15 hover:border-purple-500/60 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-md flex items-center justify-center space-x-3 cursor-pointer transition-all group"
              >
                <div className="p-2 rounded-xl bg-purple-950/40 text-purple-400 group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-semibold text-gray-300 group-hover:text-white block">
                    Glissez une image de référence ou cliquez pour importer
                  </span>
                  <span className="text-[10px] text-gray-500">
                    PNG, JPG, WEBP jusqu'à 10 Mo
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Style Selector Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2.5">
              Style Artistique
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {STYLE_PRESETS_IMAGE.map((style) => {
                const isSelected = selectedStyle === style.id;
                return (
                  <button
                    key={style.id}
                    id={`style-select-${style.id}`}
                    onClick={() => setSelectedStyle(style.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all relative backdrop-blur-md ${
                      isSelected
                        ? 'bg-purple-950/50 border-purple-500 text-white shadow-md shadow-purple-950/40'
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
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-400 ring-2 ring-purple-500/50" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format & Quality Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {/* Format / Aspect Ratio */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Format d'image
              </label>
              <select
                id="image-aspect-ratio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
              >
                <option value="1:1" className="bg-[#081226] text-white">Carré 1:1 (Instagram / Avatar)</option>
                <option value="9:16" className="bg-[#081226] text-white">Portrait 9:16 (Stories / TikTok)</option>
                <option value="16:9" className="bg-[#081226] text-white">Paysage 16:9 (Cinéma / YouTube)</option>
                <option value="4:5" className="bg-[#081226] text-white">Publication 4:5 (Réseaux Sociaux)</option>
                <option value="banner" className="bg-[#081226] text-white">Bannière (Header Web)</option>
              </select>
            </div>

            {/* Quality */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Résolution & Qualité
              </label>
              <select
                id="image-quality-select"
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/10 text-xs text-white outline-none focus:border-purple-500"
              >
                <option value="standard" className="bg-[#081226] text-white">Standard HD (5 crédits)</option>
                <option value="hd" className="bg-[#081226] text-white">Haute Définition 2K (5 crédits)</option>
                <option value="ultra_4k" className="bg-[#081226] text-white">Ultra HD 4K (8 crédits)</option>
                <option value="studio_master" className="bg-[#081226] text-white">Studio Master 8K (8 crédits)</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Nombre d'images
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQuantity(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      quantity === num
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white/[0.04] backdrop-blur-md border border-white/10 text-gray-400 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generation Progress Indicator */}
          {isGenerating && (
            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-purple-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-300 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-400" />
                  <span>Rendu en cours via Google Imagen 3...</span>
                </span>
                <span className="font-mono text-purple-400 font-bold">{generationProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Action Button */}
          <button
            id="btn-generate-image"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center justify-center space-x-3 shadow-xl shadow-purple-950/60 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Création de votre image en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Générer l’image ({creditCost} crédits)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gallery of Generated Images */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Galerie d'Images</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-purple-500/30 text-purple-300 font-mono">
              {imageCreations.length}
            </span>
          </h3>
        </div>

        {imageCreations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Aucune image générée pour l'instant</p>
            <p className="text-xs text-gray-500 mt-1">
              Remplissez le formulaire ci-dessus pour donner vie à vos idées.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {imageCreations.map((gen) => (
              <div
                key={gen.id}
                id={`image-card-${gen.id}`}
                className="group relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] overflow-hidden shadow-xl transition-all duration-200 flex flex-col justify-between"
              >
                {/* Thumbnail */}
                <div 
                  className="relative aspect-square overflow-hidden bg-black/40 cursor-pointer"
                  onClick={() => setActiveMediaModal(gen)}
                >
                  <img
                    src={gen.resultUrl}
                    alt={gen.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-xs font-semibold text-white flex items-center space-x-1">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Agrandir</span>
                    </span>
                  </div>
                </div>

                {/* Content & Metadata */}
                <div className="p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {gen.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                    {gen.prompt}
                  </p>

                  {/* 6 Actions Bar */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = gen.resultUrl;
                        a.download = `mungwele-image-${gen.id}.png`;
                        a.click();
                        addNotification('success', 'Téléchargement démarré', 'Votre image haute résolution est enregistrée.');
                      }}
                      className="py-1.5 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-gray-200 hover:text-white text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors"
                      title="Télécharger"
                    >
                      <Download className="w-3 h-3" />
                      <span>Télécharger</span>
                    </button>

                    <button
                      onClick={() => handleTransferToVideo(gen.resultUrl)}
                      className="py-1.5 px-2 rounded-lg bg-pink-950/40 hover:bg-pink-900/60 border border-pink-500/30 text-pink-200 text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors"
                      title="Utiliser dans une vidéo"
                    >
                      <Film className="w-3 h-3" />
                      <span>En vidéo</span>
                    </button>

                    <button
                      onClick={() => handleCreateVariant(gen)}
                      className="py-1.5 px-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 text-[10px] font-medium flex items-center justify-center space-x-1 transition-colors"
                      title="Créer une variante"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Variante</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                    <span>{new Date(gen.createdAt).toLocaleDateString('fr-FR')}</span>
                    <button
                      onClick={() => removeGeneration(gen.id)}
                      className="text-gray-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
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
        type="image"
        onApply={(text) => {
          setPrompt(text);
          setEnhancedPrompt(text);
        }}
      />
    </div>
  );
};
