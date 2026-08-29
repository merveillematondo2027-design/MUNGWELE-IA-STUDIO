import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Copy, Download, Film, RefreshCw, Sparkles, Trash2, Upload, X } from 'lucide-react';
import type { GenerationRecord, VideoGenerationSettings } from '../../types';

export const VideoStudio: React.FC = () => {
  const {
    useCredits,
    refundCredits,
    addGeneration,
    removeGeneration,
    addNotification,
    imageToVideoTransfer,
    setImageToVideoTransfer,
    triggerCelebration,
    generations,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<4 | 6 | 8>(8);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (imageToVideoTransfer) {
      setStartImage(imageToVideoTransfer);
      setImageToVideoTransfer(null);
    }
  }, [imageToVideoTransfer, setImageToVideoTransfer]);

  const videoCreations = generations.filter((g) => g.type === 'video');
  const effectiveDuration: 4 | 6 | 8 = endImage ? 8 : duration;
  const creditCost = effectiveDuration === 4 ? 15 : effectiveDuration === 6 ? 20 : 25;

  const loadImage = (file: File, target: 'start' | 'end') => {
    if (!file.type.startsWith('image/')) {
      addNotification('error', 'Format invalide', 'Utilisez une image PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addNotification('error', 'Fichier trop lourd', 'La taille maximale est de 10 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = reader.result as string;
      if (target === 'start') setStartImage(value);
      else {
        setEndImage(value);
        setDuration(8);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearWorkspace = () => {
    setPrompt('');
    setStartImage(null);
    setEndImage(null);
    setDuration(8);
    if (startInputRef.current) startInputRef.current.value = '';
    if (endInputRef.current) endInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addNotification('warning', 'Prompt requis', 'Décrivez précisément la vidéo à créer.');
      return;
    }

    if (endImage && !startImage) {
      addNotification('warning', 'Image de départ requise', 'Une image de fin Veo doit être utilisée avec une image de départ.');
      return;
    }

    const reason = `Génération vidéo Veo 3.1 Fast (${effectiveDuration}s)`;
    if (!useCredits(creditCost, reason)) return;

    setIsGenerating(true);
    setProgress(8);
    setStatus('Envoi de la demande à Google Veo 3.1…');

    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value < 35) {
          setStatus('Veo prépare les plans et les mouvements…');
          return value + 5;
        }
        if (value < 70) {
          setStatus('Génération vidéo et audio natif en cours…');
          return value + 3;
        }
        if (value < 92) {
          setStatus('Finalisation du rendu…');
          return value + 1;
        }
        return value;
      });
    }, 4000);

    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          duration: effectiveDuration,
          startImage,
          endImage,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) {
        throw new Error(data.error || 'La génération Veo a échoué.');
      }

      setProgress(100);
      setStatus('Vidéo prête.');
      addGeneration(data.generation);
      triggerCelebration();
      addNotification('success', 'Vidéo Veo 3.1 prête', `Votre vidéo de ${effectiveDuration}s a été générée avec audio natif.`);
      clearWorkspace();
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération vidéo impossible', error?.message || 'Erreur Veo. Vos crédits ont été remboursés.');
    } finally {
      window.clearInterval(timer);
      setIsGenerating(false);
      window.setTimeout(() => {
        setProgress(0);
        setStatus('');
      }, 600);
    }
  };

  const reusePrompt = (generation: GenerationRecord) => {
    setPrompt(generation.prompt);
    const settings = generation.settings as VideoGenerationSettings;
    if (settings.aspectRatio === '16:9' || settings.aspectRatio === '9:16') setAspectRatio(settings.aspectRatio);
    if ([4, 6, 8].includes(Number(settings.duration))) setDuration(Number(settings.duration) as 4 | 6 | 8);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      <section className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center gap-2">
              <span className="p-2 rounded-xl bg-pink-600/20 text-pink-300 border border-pink-500/30"><Film className="w-5 h-5" /></span>
              Studio Vidéo — Veo 3.1 Fast
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Texte vers vidéo et image vers vidéo avec audio natif. Décrivez les scènes, dialogues, mouvements et sons directement dans le prompt.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] border border-pink-500/30 text-pink-200">{creditCost} crédits / vidéo</span>
        </div>

        <div className="space-y-6 pt-5">
          <div>
            <label className="block text-sm font-bold text-gray-200 mb-2">Prompt vidéo détaillé</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder="Ex : Plan cinématographique d’une voiture noire traversant Kinshasa la nuit sous la pluie, travelling latéral fluide, reflets néon, moteur audible, ambiance urbaine réaliste, voix masculine en français : « La ville ne dort jamais. »"
              className="w-full px-4 py-4 rounded-2xl bg-white/[0.04] border border-white/10 focus:border-pink-500/80 text-white placeholder-gray-500 text-sm outline-none resize-y shadow-inner"
            />
            <p className="mt-2 text-[11px] text-gray-500">Indiquez directement dans le prompt le style, la caméra, les dialogues, les bruitages, la musique et le rythme souhaités.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {(['16:9', '9:16'] as const).map((ratio) => (
                  <button key={ratio} type="button" onClick={() => setAspectRatio(ratio)} className={`py-3 rounded-xl border text-sm font-bold ${aspectRatio === ratio ? 'bg-pink-600/20 border-pink-500 text-pink-200' : 'bg-white/[0.03] border-white/10 text-gray-400'}`}>{ratio}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">Durée Veo</label>
              <div className="grid grid-cols-3 gap-2">
                {([4, 6, 8] as const).map((seconds) => (
                  <button key={seconds} type="button" disabled={Boolean(endImage) && seconds !== 8} onClick={() => setDuration(seconds)} className={`py-3 rounded-xl border text-sm font-bold disabled:opacity-30 ${effectiveDuration === seconds ? 'bg-pink-600/20 border-pink-500 text-pink-200' : 'bg-white/[0.03] border-white/10 text-gray-400'}`}>{seconds}s</button>
                ))}
              </div>
              {endImage && <p className="text-[10px] text-amber-300 mt-2">Avec une image de fin, la durée est fixée à 8 secondes.</p>}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">Image de départ — optionnelle</label>
              <input ref={startInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0], 'start')} />
              {startImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-pink-500/40 bg-black/20"><img src={startImage} alt="Départ" className="w-full h-44 object-contain" /><button type="button" onClick={() => setStartImage(null)} className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-rose-600"><X className="w-4 h-4" /></button></div>
              ) : (
                <button type="button" onClick={() => startInputRef.current?.click()} className="w-full h-44 rounded-2xl border border-dashed border-white/15 hover:border-pink-500/60 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-gray-400"><Upload className="w-5 h-5 text-pink-400" /><span className="text-xs font-semibold">Importer une image de départ</span><span className="text-[10px] text-gray-500">ou envoyer une image depuis Studio Image</span></button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">Image de fin — optionnelle</label>
              <input ref={endInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0], 'end')} />
              {endImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-purple-500/40 bg-black/20"><img src={endImage} alt="Fin" className="w-full h-44 object-contain" /><button type="button" onClick={() => setEndImage(null)} className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-rose-600"><X className="w-4 h-4" /></button></div>
              ) : (
                <button type="button" onClick={() => endInputRef.current?.click()} className="w-full h-44 rounded-2xl border border-dashed border-white/15 hover:border-purple-500/60 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-gray-400"><Upload className="w-5 h-5 text-purple-400" /><span className="text-xs font-semibold">Importer une image de fin</span><span className="text-[10px] text-gray-500">nécessite une image de départ</span></button>
              )}
            </div>
          </div>

          {isGenerating && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-pink-500/40 space-y-2">
              <div className="flex justify-between gap-3 text-xs"><span className="text-pink-200 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />{status}</span><span className="font-mono text-pink-300">{progress}%</span></div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              <p className="text-[10px] text-gray-500">Une génération Veo peut prendre de quelques secondes à plusieurs minutes.</p>
            </div>
          )}

          <button type="button" disabled={isGenerating || !prompt.trim()} onClick={handleGenerate} className="w-full py-4 rounded-2xl font-display font-extrabold text-base bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
            {isGenerating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Générer avec Veo 3.1 Fast ({effectiveDuration}s)
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white">Galerie Vidéo <span className="text-xs text-pink-300">({videoCreations.length})</span></h3>
        {videoCreations.length === 0 ? (
          <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10"><Film className="w-12 h-12 text-gray-600 mx-auto mb-3" /><p className="text-sm text-gray-300">Aucune vidéo générée pour l’instant.</p></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {videoCreations.map((gen) => (
              <article key={gen.id} className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
                <video src={gen.resultUrl} controls className="w-full aspect-video bg-black" />
                <div className="p-4 space-y-3"><p className="text-xs text-gray-300 line-clamp-3">{gen.prompt}</p><div className="grid grid-cols-3 gap-2"><a href={gen.resultUrl} download className="py-2 rounded-lg bg-white/[0.06] text-gray-200 text-[10px] flex justify-center items-center gap-1"><Download className="w-3 h-3" /> Télécharger</a><button type="button" onClick={() => reusePrompt(gen)} className="py-2 rounded-lg bg-white/[0.06] text-gray-200 text-[10px] flex justify-center items-center gap-1"><Copy className="w-3 h-3" /> Prompt</button><button type="button" onClick={() => removeGeneration(gen.id)} className="py-2 rounded-lg bg-rose-950/30 text-rose-300 text-[10px] flex justify-center items-center gap-1"><Trash2 className="w-3 h-3" /> Supprimer</button></div></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
