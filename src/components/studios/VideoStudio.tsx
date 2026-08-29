import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Film, Loader2, Plus, Send, Settings2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, VideoDuration, VideoGenerationSettings, VideoModel, VideoType, VideoEngineKey } from '../../types';
import { VIDEO_ENGINES, VIDEO_TYPE_ROUTING, connectedEnginesForType, defaultConnectedEngine } from '../../config/videoRouting';

const VIDEO_COSTS: Record<VideoModel, Record<VideoDuration, number>> = {
  omni: { 4: 40, 6: 60, 8: 80 },
  lite: { 4: 20, 6: 30, 8: 40 },
  fast: { 4: 40, 6: 60, 8: 80 },
  pro: { 4: 160, 6: 240, 8: 320 },
};

const ENGINE_TO_MODEL: Partial<Record<VideoEngineKey, VideoModel>> = {
  'veo-lite': 'lite',
  'veo-fast': 'fast',
  'veo-pro': 'pro',
  omni: 'omni',
};

const TYPES = Object.entries(VIDEO_TYPE_ROUTING) as [VideoType, typeof VIDEO_TYPE_ROUTING[VideoType]][];
const MAX_OMNI_REFERENCES = 6;
const SETTINGS_KEY = 'mungwele.video.smart-routing.v1';

export const VideoStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, imageToVideoTransfer, setImageToVideoTransfer, generations, setActiveStudio, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [videoType, setVideoType] = useState<VideoType>('commercial');
  const [engineKey, setEngineKey] = useState<VideoEngineKey>('veo-fast');
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const imageInput = useRef<HTMLInputElement | null>(null);

  const hasImages = Boolean(startImage || referenceImages.length);
  const connected = useMemo(() => connectedEnginesForType(videoType), [videoType]);
  const planned = useMemo(() => VIDEO_TYPE_ROUTING[videoType].engines.map((key) => VIDEO_ENGINES[key]).filter((item) => item.availability === 'planned'), [videoType]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (saved?.videoType && VIDEO_TYPE_ROUTING[saved.videoType as VideoType]) setVideoType(saved.videoType as VideoType);
      if (saved?.engineKey && VIDEO_ENGINES[saved.engineKey as VideoEngineKey]?.availability === 'connected') setEngineKey(saved.engineKey as VideoEngineKey);
      if (saved?.duration === 4 || saved?.duration === 6 || saved?.duration === 8) setDuration(saved.duration);
      if (saved?.aspectRatio === '16:9' || saved?.aspectRatio === '9:16') setAspectRatio(saved.aspectRatio);
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ videoType, engineKey, duration, aspectRatio })); }, [videoType, engineKey, duration, aspectRatio]);

  useEffect(() => {
    if (!imageToVideoTransfer) return;
    setStartImage(imageToVideoTransfer);
    setEngineKey('omni');
    setImageToVideoTransfer(null);
  }, [imageToVideoTransfer, setImageToVideoTransfer]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mungwele.resume.project');
      if (!raw) return;
      const project = JSON.parse(raw) as GenerationRecord;
      if (project.type !== 'video') return;
      setPrompt(project.prompt || '');
      const settings = project.settings as VideoGenerationSettings;
      if (settings?.videoType) setVideoType(settings.videoType);
      if (settings?.engineKey && VIDEO_ENGINES[settings.engineKey]?.availability === 'connected') setEngineKey(settings.engineKey);
      if (settings?.duration === 4 || settings?.duration === 6 || settings?.duration === 8) setDuration(settings.duration);
      if (settings?.aspectRatio === '16:9' || settings?.aspectRatio === '9:16') setAspectRatio(settings.aspectRatio);
      if (typeof settings?.startImage === 'string') setStartImage(settings.startImage);
      if (Array.isArray(settings?.referenceImages)) setReferenceImages(settings.referenceImages.filter((item): item is string => typeof item === 'string'));
      localStorage.removeItem('mungwele.resume.project');
    } catch { localStorage.removeItem('mungwele.resume.project'); }
  }, []);

  const effectiveEngine = hasImages ? VIDEO_ENGINES.omni : VIDEO_ENGINES[engineKey];
  const effectiveModel: VideoModel = hasImages ? 'omni' : (ENGINE_TO_MODEL[engineKey] || 'fast');
  const creditCost = VIDEO_COSTS[effectiveModel][duration];
  const latest = generations.find((g) => g.type === 'video' && (!user.id || g.userId === user.id));

  const chooseType = (next: VideoType) => {
    if (next === 'music_clip') {
      setActiveStudio('clips');
      setActiveTab('projects-clips');
      addNotification('info', 'Clips Vidéo', 'Les clips musicaux utilisent le studio spécialisé pour gérer chanson, scènes, lip-sync et moteurs multiples.');
      setSettingsOpen(false);
      return;
    }
    setVideoType(next);
    const best = defaultConnectedEngine(next);
    setEngineKey(best.key);
    if (!best.durations.includes(duration)) setDuration((best.durations.includes(8) ? 8 : best.durations[0]) as VideoDuration);
    if (next === 'social') setAspectRatio('9:16');
  };

  const loadImages = (files: FileList) => {
    const incoming = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (!incoming.length) return addNotification('error', 'Images invalides', 'Utilisez PNG, JPG ou WEBP, 10 Mo maximum par image.');
    setEngineKey('omni');
    const slots = MAX_OMNI_REFERENCES - referenceImages.length - (startImage ? 1 : 0);
    const selected = incoming.slice(0, Math.max(0, slots));
    selected.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = String(reader.result);
        if (!startImage && index === 0) setStartImage(value);
        else setReferenceImages((prev) => prev.length >= MAX_OMNI_REFERENCES - 1 ? prev : [...prev, value]);
      };
      reader.readAsDataURL(file);
    });
    if (incoming.length > selected.length) addNotification('info', 'Limite références', `${MAX_OMNI_REFERENCES} images maximum pour le moteur connecté actuel.`);
  };

  const generate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez la vidéo que vous voulez créer.');
    const reason = `Vidéo ${VIDEO_TYPE_ROUTING[videoType].label} — ${effectiveEngine.label} (${duration}s)`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, model: effectiveModel, prompt: prompt.trim(), aspectRatio, duration, startImage, referenceImages }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération vidéo a échoué.');
      addGeneration({ ...data.generation, creditsUsed: creditCost, settings: { ...data.generation.settings, videoType, engineKey: effectiveEngine.key } });
      triggerCelebration();
      setPrompt(''); setStartImage(null); setReferenceImages([]);
      if (imageInput.current) imageInput.current.value = '';
      addNotification('success', 'Vidéo prête', `${effectiveEngine.label} a terminé votre rendu.`);
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur vidéo. Vos crédits ont été remboursés.');
    } finally { setIsGenerating(false); }
  };

  const download = () => {
    if (!latest?.resultUrl) return;
    if (user.plan === 'free') { addNotification('info', 'Abonnement requis', 'Le téléchargement HD nécessite un abonnement Creator ou Pro.'); setActiveTab('subscription'); return; }
    const a = document.createElement('a'); a.href = latest.resultUrl; a.download = `mungwele-video-${latest.id}.mp4`; a.click();
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <div className="mb-4 flex items-center justify-between px-1"><div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Vidéo</h1><p className="mt-1 text-xs text-gray-500">Choisissez ce que vous voulez créer. MUNGWELE sélectionne ensuite le moteur compatible.</p></div><span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span></div>
      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-5">{isGenerating ? <div className="flex min-h-[38vh] flex-col items-center justify-center text-center"><Loader2 className="mb-4 h-9 w-9 animate-spin text-pink-300" /><p className="text-sm font-black text-white">{effectiveEngine.label} génère votre vidéo…</p><p className="mt-2 text-xs text-gray-500">{VIDEO_TYPE_ROUTING[videoType].label} • {duration}s • {aspectRatio}</p></div> : latest?.resultUrl ? <div className="mx-auto max-w-4xl"><div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30"><video src={latest.resultUrl} controls playsInline className="max-h-[55vh] w-full bg-black object-contain" /></div><button onClick={download} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> {user.plan === 'free' ? 'Débloquer téléchargement HD' : 'Télécharger HD'}</button></div> : <div className="flex min-h-[38vh] flex-col items-center justify-center text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10"><Film className="h-5 w-5 text-pink-200" /></span><p className="text-sm font-bold text-gray-300">{VIDEO_TYPE_ROUTING[videoType].label}</p><p className="mt-1 max-w-md text-xs leading-5 text-gray-600">{VIDEO_TYPE_ROUTING[videoType].description} Moteur actuel : {effectiveEngine.label}.</p></div>}</div>

        {(startImage || referenceImages.length > 0) && <div className="mb-2 flex gap-2 overflow-x-auto"><button onClick={() => { setStartImage(null); setReferenceImages([]); }} className="h-16 shrink-0 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-gray-400">Retirer tout</button>{startImage && <img src={startImage} alt="Départ" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}{referenceImages.map((src, i) => <img key={i} src={src} alt={`Référence ${i + 1}`} className="h-16 w-16 shrink-0 rounded-xl object-cover" />)}</div>}

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl"><input ref={imageInput} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files && loadImages(e.target.files)} /><div className="flex items-end gap-2"><button onClick={() => imageInput.current?.click()} disabled={isGenerating} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-300"><Plus className="h-5 w-5" /></button><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate(); } }} rows={2} placeholder="Décrivez la vidéo que vous voulez créer…" className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-gray-600" /><button onClick={() => setSettingsOpen(true)} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400"><Settings2 className="h-4 w-4" /></button><button onClick={() => void generate()} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div><div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600"><span>{VIDEO_TYPE_ROUTING[videoType].label} • {effectiveEngine.label} • {duration}s • {aspectRatio}</span><span>{creditCost} crédits</span></div></div>
      </div>

      {settingsOpen && <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}><aside className="h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Vidéo</h2><p className="text-xs text-gray-500">Les options changent selon le type de vidéo.</p></div><button onClick={() => setSettingsOpen(false)} className="rounded-xl bg-white/[0.05] p-2"><X className="h-4 w-4" /></button></div>
        <section className="mt-6"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Type de vidéo</p><div className="grid grid-cols-2 gap-2">{TYPES.map(([key, meta]) => <button key={key} onClick={() => chooseType(key)} className={`rounded-2xl border p-3 text-left ${videoType === key ? 'border-pink-400/40 bg-pink-500/10' : 'border-white/10 bg-white/[0.02]'}`}><p className="text-xs font-black text-white">{meta.label}</p><p className="mt-1 text-[9px] leading-4 text-gray-500">{meta.description}</p></button>)}</div></section>
        <section className="mt-6"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Moteurs disponibles maintenant</p><div className="space-y-2">{connected.map((engine) => <button key={engine.key} onClick={() => { setEngineKey(engine.key); const d = engine.durations.includes(duration) ? duration : (engine.durations.includes(8) ? 8 : engine.durations[0]); setDuration(d as VideoDuration); }} disabled={hasImages && engine.key !== 'omni'} className={`w-full rounded-2xl border p-3 text-left ${engineKey === engine.key || (hasImages && engine.key === 'omni') ? 'border-emerald-400/35 bg-emerald-500/8' : 'border-white/10'} disabled:opacity-35`}><div className="flex items-center justify-between"><p className="text-xs font-black text-white">{engine.label}</p><span className="text-[9px] font-bold text-emerald-300">Connecté</span></div><p className="mt-1 text-[9px] text-gray-500">{engine.strengths.join(' • ')}</p></button>)}</div></section>
        {planned.length > 0 && <section className="mt-6"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Moteurs compatibles à connecter</p><div className="space-y-2">{planned.map((engine) => <div key={engine.key} className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-3"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">{engine.label}</p><span className="text-[9px] font-bold text-amber-300">jusqu’à {engine.maxSeconds}s</span></div><p className="mt-1 text-[9px] text-gray-500">{engine.strengths.join(' • ')}</p></div>)}</div></section>}
        <section className="mt-6"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Durée disponible avec {effectiveEngine.label}</p><div className="flex gap-2">{effectiveEngine.durations.filter((d): d is VideoDuration => d === 4 || d === 6 || d === 8).map((d) => <button key={d} onClick={() => setDuration(d)} className={`rounded-xl border px-4 py-2 text-xs font-black ${duration === d ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/10 text-gray-500'}`}>{d}s</button>)}</div></section>
        <section className="mt-6"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Format</p><div className="flex gap-2"><button onClick={() => setAspectRatio('16:9')} className={`rounded-xl border px-4 py-2 text-xs font-black ${aspectRatio === '16:9' ? 'border-blue-400/40 bg-blue-500/10 text-white' : 'border-white/10 text-gray-500'}`}>16:9</button><button onClick={() => setAspectRatio('9:16')} className={`rounded-xl border px-4 py-2 text-xs font-black ${aspectRatio === '9:16' ? 'border-blue-400/40 bg-blue-500/10 text-white' : 'border-white/10 text-gray-500'}`}>9:16</button></div></section>
        <div className="mt-6 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3 text-[10px] leading-5 text-gray-500"><strong className="text-emerald-300">Protection prix :</strong> les moteurs non connectés restent visibles pour préparer l’architecture mais ne peuvent pas être facturés. Les générations actives utilisent uniquement les fournisseurs réellement configurés.</div></aside></div>}
    </div>
  );
};
