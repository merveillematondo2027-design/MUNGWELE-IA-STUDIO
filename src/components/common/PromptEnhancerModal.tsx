import React, { useState } from 'react';
import { StudioType } from '../../types';
import { Sparkles, Wand2, X, Check, Copy, RefreshCw, Sliders, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';

interface PromptEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  type: StudioType;
  onApply: (enhancedPrompt: string) => void;
}

export const PromptEnhancerModal: React.FC<PromptEnhancerModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  type,
  onApply,
}) => {
  const { addNotification } = useApp();
  const [userIdea, setUserIdea] = useState(initialPrompt || '');
  const [enhancedResult, setEnhancedResult] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lighting, setLighting] = useState('Volumétrique / Doré');
  const [cameraMotion, setCameraMotion] = useState('Travelling dynamique 60fps');
  const [soundMood, setSoundMood] = useState('Énergique & Profond');
  const [copied, setCopied] = useState(false);

  const handleGenerateEnhancement = async () => {
    if (!userIdea.trim()) {
      addNotification('warning', 'Texte requis', 'Veuillez saisir votre idée de base.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userIdea,
          type,
          details: {
            lighting,
            cameraMotion,
            soundMood,
          },
        }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setEnhancedResult(data.enhancedPrompt);
        setTags(data.tags || []);
      }
    } catch (e) {
      console.warn('Enhance modal error:', e);
      setEnhancedResult(`Chef-d'œuvre studio : ${userIdea}. Éclairage ${lighting}, rendu hyperréaliste 8k, composition soignée.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(enhancedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addNotification('info', 'Copié !', 'Le prompt a été copié dans votre presse-papiers.');
  };

  const handleApply = () => {
    onApply(enhancedResult || userIdea);
    onClose();
    addNotification('success', 'Prompt appliqué !', 'Le prompt amélioré a été inséré dans votre studio de création.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="prompt-enhancer-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          id="prompt-enhancer-modal"
          className="relative w-full max-w-2xl bg-[#081226]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/40 border border-white/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Assistant IA Prompt Master</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider font-semibold">
                    Studio {type === 'image' ? 'Image' : type === 'video' ? 'Vidéo' : 'Musique'}
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  Transformez une simple idée en prompt professionnel de qualité studio.
                </p>
              </div>
            </div>
            <button
              id="close-prompt-enhancer-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="py-4 space-y-4">
            {/* Input area */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                Votre idée brute :
              </label>
              <textarea
                id="enhancer-user-idea"
                value={userIdea}
                onChange={(e) => setUserIdea(e.target.value)}
                placeholder="Ex: Une voiture futuriste qui roule sous la pluie dans une ville néon..."
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] text-white placeholder-gray-500 text-sm outline-none transition-all resize-none shadow-inner"
              />
            </div>

            {/* Parameter Tweaks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10">
              {type === 'image' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Éclairage & Ambiance
                    </label>
                    <select
                      value={lighting}
                      onChange={(e) => setLighting(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-200 outline-none"
                    >
                      <option value="Volumétrique / Doré" className="bg-[#081226] text-white">Lumière dorée volumétrique</option>
                      <option value="Néon Cyberpunk Cyber-Glow" className="bg-[#081226] text-white">Néons cyberpunk vibrants</option>
                      <option value="Studio Softbox Doux" className="bg-[#081226] text-white">Éclairage studio softbox</option>
                      <option value="Clair-Obscur Dramatique" className="bg-[#081226] text-white">Clair-obscur dramatique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Niveau de détail
                    </label>
                    <div className="text-xs text-purple-300 font-semibold py-1.5">
                      Masterpiece 8K HDR Octane
                    </div>
                  </div>
                </>
              )}

              {type === 'video' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Mouvement de Caméra (Veo 3)
                    </label>
                    <select
                      value={cameraMotion}
                      onChange={(e) => setCameraMotion(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-200 outline-none"
                    >
                      <option value="Travelling dynamique 60fps" className="bg-[#081226] text-white">Travelling fluide 60fps</option>
                      <option value="Survol drone panoramique" className="bg-[#081226] text-white">Survol drone cinématique</option>
                      <option value="Zoom avant dramatique" className="bg-[#081226] text-white">Zoom progressif immersif</option>
                      <option value="Orbital 360 degrés" className="bg-[#081226] text-white">Mouvement orbital 360°</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Rendu Veo 3
                    </label>
                    <div className="text-xs text-pink-300 font-semibold py-1.5">
                      Haute Fréquence d'Images & Physique Fluide
                    </div>
                  </div>
                </>
              )}

              {type === 'music' && (
                <>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Texture Sonore
                    </label>
                    <select
                      value={soundMood}
                      onChange={(e) => setSoundMood(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-200 outline-none"
                    >
                      <option value="Énergique & Profond" className="bg-[#081226] text-white">Énergique & Basses 808</option>
                      <option value="Doux & Acoustique" className="bg-[#081226] text-white">Acoustique doux & Organique</option>
                      <option value="Euphorique Festival" className="bg-[#081226] text-white">Euphorique & Synthétiseurs</option>
                      <option value="Émouvant & Choral" className="bg-[#081226] text-white">Émouvant & Chœurs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 mb-1">
                      Mastering Audio
                    </label>
                    <div className="text-xs text-blue-300 font-semibold py-1.5">
                      Stéréo 3D Master & Limiteur Haute Dynamique
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action button */}
            <button
              id="btn-run-enhancement-ai"
              onClick={handleGenerateEnhancement}
              disabled={isLoading}
              className="w-full py-3 rounded-2xl font-semibold text-sm bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center justify-center space-x-2 shadow-lg shadow-purple-900/30 transition-all active:scale-98 disabled:opacity-50 border border-white/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Analyse et génération du prompt...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Générer la version améliorée</span>
                </>
              )}
            </button>

            {/* Result Area */}
            {enhancedResult && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-purple-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                    <span>Prompt Pro Généré (Modifiable) :</span>
                  </label>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-gray-400 hover:text-white flex items-center space-x-1 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>

                <textarea
                  id="enhancer-result-textarea"
                  value={enhancedResult}
                  onChange={(e) => setEnhancedResult(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-purple-500/50 focus:border-pink-500 text-white text-sm outline-none resize-none leading-relaxed"
                />

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-200"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Annuler
            </button>
            <button
              id="btn-apply-enhanced-prompt"
              onClick={handleApply}
              disabled={!enhancedResult && !userIdea}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center space-x-2 shadow-md shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-40 border border-white/20"
            >
              <span>Appliquer au Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
