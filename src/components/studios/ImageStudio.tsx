import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Maximize2,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { GenerationRecord } from '../../types';

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
    generations,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const imageCreations = generations.filter((g) => g.type === 'image');
  const creditCost = 8;

  const clearWorkspace = () => {
    setPrompt('');
    setReferenceImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Format invalide', 'Importez une image PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addNotification('error', 'Fichier trop lourd', 'La taille maximale est de 10 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      addNotification(
        'info',
        'Image chargée',
        'Décrivez maintenant uniquement la modification à effectuer dans le prompt.'
      );
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addNotification('warning', 'Prompt requis', 'Décrivez précisément ce que vous voulez créer ou modifier.');
      return;
    }

    const hadReferenceImage = Boolean(referenceImage);
    const reason = hadReferenceImage ? 'Retouche image par prompt' : 'Génération image par prompt';
    const allowed = useCredits(creditCost, reason);
    if (!allowed) return;

    setIsGenerating(true);
    setGenerationProgress(12);

    const timer = window.setInterval(() => {
      setGenerationProgress((current) => (current >= 88 ? 88 : current + 12));
    }, 550);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          enhancedPrompt: prompt.trim(),
          referenceImage,
        }),
      });

      const data = await response.json().catch(() => ({}));
      window.clearInterval(timer);

      if (!response.ok || !data.generation) {
        throw new Error(data.error || 'La génération a échoué.');
      }

      if (String(data.generation.resultUrl || '').includes('images.unsplash.com')) {
        throw new Error('Résultat de démonstration refusé. Réessayez avec le fournisseur IA réel.');
      }

      setGenerationProgress(100);
      addGeneration(data.generation);
      triggerCelebration();
      clearWorkspace();
      addNotification(
        'success',
        hadReferenceImage ? 'Modification terminée' : 'Image générée',
        hadReferenceImage
          ? 'La modification a été appliquée. Le prompt et l’image de référence ont été vidés pour votre prochain projet.'
          : 'Votre image a été créée. Le champ du prompt a été vidé pour votre prochain projet.'
      );
    } catch (error: any) {
      window.clearInterval(timer);
      refundCredits(creditCost, reason);
      addNotification(
        'error',
        'Génération impossible',
        error?.message || 'Le fournisseur IA est temporairement indisponible. Vos crédits ont été remboursés.'
      );
    } finally {
      setIsGenerating(false);
      window.setTimeout(() => setGenerationProgress(0), 250);
    }
  };

  const handleTransferToVideo = (imageUrl: string) => {
    setImageToVideoTransfer(imageUrl);
    setActiveStudio('video');
    setActiveTab('studio-video');
    addNotification('success', 'Image envoyée vers Vidéo', 'Décrivez l’animation souhaitée dans le prompt vidéo.');
  };

  const reusePrompt = (generation: GenerationRecord) => {
    setPrompt(generation.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    addNotification('info', 'Prompt repris', 'Le prompt a été replacé dans le champ principal.');
  };

  return (
    <div id="image-studio-container" className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      <section className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2">
              <span className="p-2 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <ImageIcon className="w-5 h-5" />
              </span>
              <span>Studio Image IA</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Un seul contrôle créatif : votre prompt. Décrivez tout ce que vous voulez, y compris les retouches.
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] border border-purple-500/30 text-purple-200">
            {creditCost} crédits / image
          </span>
        </div>

        <div className="space-y-5 pt-5">
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-2">
              Prompt détaillé
            </label>
            <textarea
              id="image-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                referenceImage
                  ? 'Ex : Garde exactement cette image et ajoute seulement le texte « Maman » en lettres dorées élégantes au centre, sans modifier les visages, les vêtements ni le décor.'
                  : 'Ex : Crée une affiche publicitaire premium pour une boutique de mode, fond blanc, lumière studio douce, mannequin élégant, typographie dorée...'
              }
              rows={6}
              className="w-full px-4 py-4 rounded-2xl bg-white/[0.04] border border-white/10 focus:border-purple-500/80 text-white placeholder-gray-500 text-sm outline-none resize-y shadow-inner"
            />
            <p className="mt-2 text-[11px] text-gray-500">
              Indiquez directement dans le prompt le style, le format, l’éclairage, les couleurs, le texte exact et tous les détails souhaités.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Image à modifier ou référence
              </label>
              {referenceImage && (
                <span className="text-[10px] text-emerald-300">Mode modification activé</span>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />

            {referenceImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-black/20">
                <img src={referenceImage} alt="Image à modifier" className="w-full max-h-80 object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setReferenceImage(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-rose-600 text-white"
                  title="Retirer l'image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                className="w-full py-5 px-6 rounded-2xl border border-dashed border-white/15 hover:border-purple-500/60 bg-white/[0.02] hover:bg-white/[0.05] flex items-center justify-center gap-3 transition-all"
              >
                <Upload className="w-5 h-5 text-purple-400" />
                <div className="text-left">
                  <span className="text-xs font-semibold text-gray-300 block">Importer une image à modifier</span>
                  <span className="text-[10px] text-gray-500">PNG, JPG ou WEBP — 10 Mo maximum</span>
                </div>
              </button>
            )}
          </div>

          {isGenerating && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-purple-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {referenceImage ? 'Application précise de votre modification...' : 'Création à partir de votre prompt...'}
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

          <button
            id="btn-generate-image"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-base bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
          >
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{referenceImage ? `Modifier l’image (${creditCost} crédits)` : `Générer l’image (${creditCost} crédits)`}</span>
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Galerie d’Images</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-purple-500/30 text-purple-300 font-mono">
              {imageCreations.length}
            </span>
          </h3>
        </div>

        {imageCreations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white/[0.02] border border-white/10">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Aucune image générée pour l’instant</p>
            <p className="text-xs text-gray-500 mt-1">Écrivez un prompt détaillé puis lancez la génération.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {imageCreations.map((gen) => (
              <article key={gen.id} className="group rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden shadow-xl">
                <button
                  type="button"
                  onClick={() => setActiveMediaModal(gen)}
                  className="relative aspect-square w-full overflow-hidden bg-black/40"
                >
                  <img src={gen.resultUrl} alt={gen.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute bottom-3 left-3 text-xs font-semibold text-white flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg">
                    <Maximize2 className="w-3.5 h-3.5" /> Agrandir
                  </span>
                </button>

                <div className="p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{gen.title}</h4>
                  <p className="text-[11px] text-gray-400 line-clamp-3">{gen.prompt}</p>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = gen.resultUrl;
                        a.download = `mungwele-image-${gen.id}.png`;
                        a.click();
                      }}
                      className="py-2 rounded-lg bg-white/[0.06] text-gray-200 text-[10px] flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Télécharger
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTransferToVideo(gen.resultUrl)}
                      className="py-2 rounded-lg bg-pink-950/40 border border-pink-500/30 text-pink-200 text-[10px] flex items-center justify-center gap-1"
                    >
                      <Film className="w-3 h-3" /> Vers Vidéo
                    </button>
                    <button
                      type="button"
                      onClick={() => reusePrompt(gen)}
                      className="py-2 rounded-lg bg-white/[0.06] text-gray-200 text-[10px] flex items-center justify-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Reprendre prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGeneration(gen.id)}
                      className="py-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300 text-[10px] flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
