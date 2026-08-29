import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, Loader2, Plus, Send, Settings2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { VideoDuration, VideoModel } from '../../types';

const VIDEO_COSTS: Record<VideoModel, Record<VideoDuration, number>> = {
  lite: { 4: 15, 6: 23, 8: 30 },
  fast: { 4: 30, 6: 45, 8: 60 },
  pro: { 4: 120, 6: 180, 8: 240 },
};

const MODEL_LABELS: Record<VideoModel, string> = {
  lite: 'Veo 3.1 Lite',
  fast: 'Veo 3.1 Fast',
  pro: 'Veo 3.1 Pro',
};

type PersistedSettings = { model: VideoModel; duration: VideoDuration; aspectRatio: '16:9' | '9:16' };
const SETTINGS_KEY = 'mungwele.video.settings.v1';

export const VideoStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, imageToVideoTransfer, setImageToVideoTransfer, generations, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState<VideoModel>('fast');
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const startInput = useRef<HTMLInputElement | null>(null);
  const endInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') as PersistedSettings | null;
      if (saved) {
        if (saved.model === 'lite' || saved.model === 'fast' || saved.model === 'pro') setModel(saved.model);
        if (saved.duration === 4 || saved.duration === 6 || saved.duration === 8) setDuration(saved.duration);
        if (saved.aspectRatio === '16:9' || saved.aspectRatio === '9:16') setAspectRatio(saved.aspectRatio);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ model, duration, aspectRatio }));
  }, [model, duration, aspectRatio]);

  useEffect(() => {
    if (imageToVideoTransfer) {
      setStartImage(imageToVideoTransfer);
      setImageToVideoTransfer(null);
    }
  }, [imageToVideoTransfer, setImageToVideoTransfer]);

  useEffect(() => {
    if (endImage && duration !== 8) setDuration(8);
  }, [endImage, duration]);

  const latest = generations.find((g) => g.type === 'video');
  const creditCost = VIDEO_COSTS[model][duration];

  const loadImage = (file: File, target: 'start' | 'end') => {
    if (!file.type.startsWith('image/')) return addNotification('error', 'Format invalide', 'Utilisez PNG, JPG ou WEBP.');
    if (file.size > 10 * 1024 * 1024) return addNotification('error', 'Fichier trop lourd', '10 Mo maximum.');
    const reader = new FileReader();
    reader.onload = () => target === 'start' ? setStartImage(reader.result as string) : setEndImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez la vidéo que vous voulez créer.');
    if (endImage && !startImage) return addNotification('warning', 'Image de départ requise', 'Ajoutez une image de départ avant une image de fin.');
    const reason = `Génération vidéo ${MODEL_LABELS[model]} (${duration}s)`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: prompt.trim(), aspectRatio, duration, startImage, endImage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération vidéo a échoué.');
      addGeneration(data.generation);
      triggerCelebration();
      setPrompt('');
      setStartImage(null);
      setEndImage(null);
      if (startInput.current) startInput.current.value = '';
      if (endInput.current) endInput.current.value = '';
      addNotification('success', 'Vidéo prête', `${MODEL_LABELS[model]} a terminé votre rendu.`);
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur Veo. Vos crédits ont été remboursés.');
    } finally {
      setIsGenerating(false);
    }
  };

  const download = () => {
    if (!latest?.resultUrl) return;
    if (user.plan === 'free') {
      addNotification('info', 'Abonnement requis', 'Le téléchargement HD nécessite un abonnement Creator ou Pro.');
      setActiveTab('subscription');
      return;
    }
    const a = document.createElement('a');
    a.href = latest.resultUrl;
    a.download = `mungwele-video-${latest.id}.mp4`;
    a.click();
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <div className="mb-5 flex items-center justify-between px-1">
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Vidéo Veo</h1><p className="mt-1 text-xs text-gray-500">Prompt au centre. Réglages à droite. Vos choix restent mémorisés.</p></div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-6">
          {latest?.resultUrl ? (
            <div className="mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30"><video src={latest.resultUrl} controls playsInline className="max-h-[58vh] w-full bg-black object-contain" /></div>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> {user.plan === 'free' ? 'Débloquer téléchargement HD' : 'Télécharger HD'}</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[42vh] flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10"><Film className="h-5 w-5 text-pink-200" /></span>
              <p className="text-sm font-bold text-gray-300">Décrivez la vidéo. Veo s’occupe du reste.</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-gray-600">Caméra, mouvements, dialogue, musique, ambiance et lumière peuvent être précisés directement dans le prompt.</p>
            </div>
          )}
        </div>

        {(startImage || endImage) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
            {startImage && <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-pink-400/30"><img src={startImage} alt="Départ" className="h-full w-full object-cover" /><button onClick={() => setStartImage(null)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><X className="h-3 w-3" /></button></div>}
            {endImage && <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-blue-400/30"><img src={endImage} alt="Fin" className="h-full w-full object-cover" /><button onClick={() => setEndImage(null)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><X className="h-3 w-3" /></button></div>}
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl">
          <input ref={startInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0], 'start')} />
          <input ref={endInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0], 'end')} />
          <div className="flex items-end gap-2">
            <button onClick={() => startInput.current?.click()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]" title="Ajouter une image de départ"><Plus className="h-5 w-5" /></button>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }} rows={2} placeholder="Décrivez la vidéo que vous voulez créer…" className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-gray-600" />
            <button onClick={() => setSettingsOpen(true)} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400 hover:text-white" title="Réglages"><Settings2 className="h-4 w-4" /></button>
            <button onClick={generate} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40" title="Générer">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600"><span>{MODEL_LABELS[model]} • {duration}s • {aspectRatio}</span><span>{creditCost} crédits</span></div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Vidéo</h2><p className="text-xs text-gray-500">Conservés automatiquement jusqu’à votre prochaine modification.</p></div><button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div>

            <div className="mt-8 space-y-7">
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Modèle</p><div className="space-y-2">{(['lite','fast','pro'] as VideoModel[]).map((m) => <button key={m} onClick={() => setModel(m)} className={`w-full rounded-2xl border p-4 text-left ${model===m?'border-pink-500 bg-pink-500/10':'border-white/10 bg-white/[0.025]'}`}><div className="flex items-center justify-between"><span className="text-sm font-black text-white">{MODEL_LABELS[m]}</span><span className="text-[10px] text-amber-300">4s {VIDEO_COSTS[m][4]} • 6s {VIDEO_COSTS[m][6]} • 8s {VIDEO_COSTS[m][8]} cr</span></div></button>)}</div></section>
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Durée</p><div className="grid grid-cols-3 gap-2">{([4,6,8] as VideoDuration[]).map((d) => <button key={d} disabled={Boolean(endImage) && d!==8} onClick={() => setDuration(d)} className={`rounded-2xl border py-3 text-sm font-black disabled:opacity-30 ${duration===d?'border-pink-500 bg-pink-500/10 text-white':'border-white/10 bg-white/[0.025] text-gray-400'}`}>{d}s</button>)}</div>{endImage && <p className="mt-2 text-[10px] text-amber-300">Une image de fin impose 8 secondes.</p>}</section>
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Format</p><div className="grid grid-cols-2 gap-2">{(['16:9','9:16'] as const).map((r) => <button key={r} onClick={() => setAspectRatio(r)} className={`rounded-2xl border py-3 text-sm font-black ${aspectRatio===r?'border-pink-500 bg-pink-500/10 text-white':'border-white/10 bg-white/[0.025] text-gray-400'}`}>{r}</button>)}</div></section>
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Images avancées</p><button onClick={() => endInput.current?.click()} className="w-full rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-left text-xs font-bold text-gray-300">Ajouter / remplacer l’image de fin</button></section>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><p className="text-xs text-gray-400">Cette génération</p><p className="mt-1 text-2xl font-black text-amber-300">{creditCost} crédits</p></div>
            </div>
            <button onClick={() => setSettingsOpen(false)} className="mt-8 w-full rounded-2xl bg-white py-3 text-sm font-black text-[#08101f]">Appliquer</button>
          </aside>
        </div>
      )}
    </div>
  );
};
