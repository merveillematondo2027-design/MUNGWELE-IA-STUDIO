import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, Loader2, Plus, Send, Settings2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, VideoDuration, VideoGenerationSettings, VideoModel } from '../../types';

const VIDEO_COSTS: Record<VideoModel, Record<VideoDuration, number>> = {
  omni: { 4: 40, 6: 60, 8: 80 },
  lite: { 4: 20, 6: 30, 8: 40 },
  fast: { 4: 40, 6: 60, 8: 80 },
  pro: { 4: 160, 6: 240, 8: 320 },
};

const MODEL_META: Record<VideoModel, { label: string; badge: string; description: string }> = {
  omni: { label: 'Gemini Omni 1.1 Flash', badge: 'Références', description: 'Recommandé pour image→vidéo, références multiples, édition et workflows multimodaux.' },
  lite: { label: 'Veo 3.1 Lite', badge: 'Économique', description: 'Texte→vidéo économique. Idéal pour les tests et itérations.' },
  fast: { label: 'Veo 3.1 Fast', badge: 'Rapide', description: 'Texte→vidéo rapide avec très bon équilibre qualité/coût.' },
  pro: { label: 'Veo 3.1 Pro', badge: 'Premium', description: 'Texte→vidéo cinématique premium, réservé aux rendus à forte valeur.' },
};

const SUPPORTED_DURATIONS: VideoDuration[] = [4, 6, 8];
const MAX_OMNI_REFERENCES = 6;
type PersistedSettings = { model: VideoModel; duration: VideoDuration; aspectRatio: '16:9' | '9:16' };
const SETTINGS_KEY = 'mungwele.video.settings.v3';

export const VideoStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, imageToVideoTransfer, setImageToVideoTransfer, generations, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [model, setModel] = useState<VideoModel>('fast');
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const imageInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null') as PersistedSettings | null;
      if (saved) {
        if (saved.model === 'omni' || saved.model === 'lite' || saved.model === 'fast' || saved.model === 'pro') setModel(saved.model);
        if (SUPPORTED_DURATIONS.includes(saved.duration)) setDuration(saved.duration);
        if (saved.aspectRatio === '16:9' || saved.aspectRatio === '9:16') setAspectRatio(saved.aspectRatio);
      }
    } catch {}
  }, []);

  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ model, duration, aspectRatio })); }, [model, duration, aspectRatio]);

  useEffect(() => {
    if (!imageToVideoTransfer) return;
    setStartImage(imageToVideoTransfer);
    setModel('omni');
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
      if (settings?.videoModel) setModel(settings.videoModel);
      if (settings?.duration && SUPPORTED_DURATIONS.includes(settings.duration)) setDuration(settings.duration);
      if (settings?.aspectRatio === '16:9' || settings?.aspectRatio === '9:16') setAspectRatio(settings.aspectRatio);
      if (typeof settings?.startImage === 'string') setStartImage(settings.startImage);
      if (Array.isArray(settings?.referenceImages)) setReferenceImages(settings.referenceImages.filter((item): item is string => typeof item === 'string'));
      localStorage.removeItem('mungwele.resume.project');
    } catch {
      localStorage.removeItem('mungwele.resume.project');
    }
  }, []);

  const latest = generations.find((g) => g.type === 'video' && (!user.id || g.userId === user.id));
  const creditCost = VIDEO_COSTS[model][duration];
  const hasImages = Boolean(startImage || referenceImages.length);

  const loadImages = (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (!incoming.length) return addNotification('error', 'Images invalides', 'Utilisez PNG, JPG ou WEBP, 10 Mo maximum par image.');
    setModel('omni');
    const slots = MAX_OMNI_REFERENCES - referenceImages.length - (startImage ? 1 : 0);
    if (slots <= 0) return addNotification('warning', 'Limite atteinte', `Ce projet accepte actuellement ${MAX_OMNI_REFERENCES} images au total.`);
    const selected = incoming.slice(0, slots);
    selected.forEach((file, fileIndex) => {
      const reader = new FileReader();
      reader.onload = () => {
        const value = reader.result as string;
        if (!startImage && fileIndex === 0) setStartImage(value);
        else setReferenceImages((prev) => prev.length >= MAX_OMNI_REFERENCES - 1 ? prev : [...prev, value]);
      };
      reader.readAsDataURL(file);
    });
    if (incoming.length > selected.length) addNotification('info', 'Certaines images ignorées', `Limite opérationnelle actuelle : ${MAX_OMNI_REFERENCES} images pour un projet vidéo guidé.`);
  };

  const selectModel = (next: VideoModel) => {
    if (hasImages && next !== 'omni') {
      addNotification('info', 'Omni conservé', 'Pour éviter l’erreur inlineData observée avec Veo, les vidéos guidées par image utilisent actuellement Gemini Omni.');
      return;
    }
    setModel(next);
  };

  const generate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez la vidéo que vous voulez créer.');
    const effectiveModel: VideoModel = hasImages ? 'omni' : model;
    const effectiveCost = VIDEO_COSTS[effectiveModel][duration];
    const reason = `Génération vidéo ${MODEL_META[effectiveModel].label} (${duration}s)`;
    if (!useCredits(effectiveCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, model: effectiveModel, prompt: prompt.trim(), aspectRatio, duration, startImage, referenceImages }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération vidéo a échoué.');
      addGeneration({ ...data.generation, creditsUsed: effectiveCost });
      triggerCelebration();
      setPrompt('');
      setStartImage(null);
      setReferenceImages([]);
      if (imageInput.current) imageInput.current.value = '';
      addNotification('success', 'Vidéo prête', `${MODEL_META[effectiveModel].label} a terminé votre rendu.`);
    } catch (error: any) {
      refundCredits(effectiveCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur vidéo. Vos crédits ont été remboursés.');
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
    const a = document.createElement('a'); a.href = latest.resultUrl; a.download = `mungwele-video-${latest.id}.mp4`; a.click();
  };

  const totalImages = (startImage ? 1 : 0) + referenceImages.length;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <div className="mb-4 flex items-center justify-between px-1">
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Vidéo</h1><p className="mt-1 text-xs text-gray-500">Veo pour le texte • Omni pour les images et références multiples.</p></div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{VIDEO_COSTS[hasImages ? 'omni' : model][duration]} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-5">
          {isGenerating ? (
            <div className="flex min-h-[38vh] flex-col items-center justify-center text-center"><Loader2 className="mb-4 h-9 w-9 animate-spin text-pink-300" /><p className="text-sm font-black text-white">{MODEL_META[hasImages ? 'omni' : model].label} génère votre vidéo…</p><p className="mt-2 max-w-md text-xs leading-5 text-gray-500">Les crédits sont remboursés automatiquement si le fournisseur refuse ou échoue.</p></div>
          ) : latest?.resultUrl ? (
            <div className="mx-auto max-w-4xl"><div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30"><video src={latest.resultUrl} controls playsInline className="max-h-[55vh] w-full bg-black object-contain" /></div><div className="mt-3"><button onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> {user.plan === 'free' ? 'Débloquer téléchargement HD' : 'Télécharger HD'}</button></div></div>
          ) : (
            <div className="flex min-h-[38vh] flex-col items-center justify-center text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10"><Film className="h-5 w-5 text-pink-200" /></span><p className="text-sm font-bold text-gray-300">Décrivez votre vidéo.</p><p className="mt-1 max-w-md text-xs leading-5 text-gray-600">Sans image : choisissez Veo ou Omni. Avec une ou plusieurs images : MUNGWELE bascule automatiquement vers Omni pour un flux compatible.</p></div>
          )}
        </div>

        {totalImages > 0 && (
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-gray-500"><span>Images guidant la vidéo {totalImages}/{MAX_OMNI_REFERENCES} • Omni activé</span><button onClick={() => { setStartImage(null); setReferenceImages([]); }} className="font-bold text-gray-400">Tout retirer</button></div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {startImage && <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-pink-400/40"><img src={startImage} alt="Image principale" className="h-full w-full object-cover" /><span className="absolute bottom-0 left-0 right-0 bg-black/70 py-0.5 text-center text-[8px] font-bold">DÉPART</span><button onClick={() => setStartImage(null)} className="absolute right-1 top-1 rounded-full bg-black/75 p-1"><X className="h-3 w-3" /></button></div>}
              {referenceImages.map((src, index) => <div key={`${index}-${src.slice(-10)}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-purple-400/30"><img src={src} alt={`Référence ${index + 1}`} className="h-full w-full object-cover" /><button onClick={() => setReferenceImages((prev) => prev.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/75 p-1"><X className="h-3 w-3" /></button></div>)}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl">
          <input ref={imageInput} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files && loadImages(e.target.files)} />
          <div className="flex items-end gap-2">
            <button onClick={() => imageInput.current?.click()} disabled={isGenerating} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-40" title="Ajouter une ou plusieurs images"><Plus className="h-5 w-5" /></button>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }} rows={2} disabled={isGenerating} placeholder="Décrivez la vidéo que vous voulez créer…" className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-gray-600 disabled:opacity-60" />
            <button onClick={() => setSettingsOpen(true)} disabled={isGenerating} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400 hover:text-white disabled:opacity-40" title="Réglages"><Settings2 className="h-4 w-4" /></button>
            <button onClick={generate} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40" title="Générer">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600"><span>{MODEL_META[hasImages ? 'omni' : model].label} • {duration}s • {aspectRatio} • audio natif</span><span>{VIDEO_COSTS[hasImages ? 'omni' : model][duration]} crédits</span></div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Vidéo</h2><p className="text-xs text-gray-500">Les prix sont calculés pour conserver une marge de sécurité.</p></div><button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div>
            <div className="mt-8 space-y-7">
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Modèle</p><div className="space-y-2">{(['omni','lite','fast','pro'] as VideoModel[]).map((m) => <button key={m} onClick={() => selectModel(m)} className={`w-full rounded-2xl border p-4 text-left transition ${model===m?'border-pink-500 bg-pink-500/10':'border-white/10 bg-white/[0.025] hover:bg-white/[0.045]'} ${hasImages && m !== 'omni' ? 'opacity-40' : ''}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-black text-white">{MODEL_META[m].label}</span><span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold text-gray-400">{MODEL_META[m].badge}</span></div><p className="mt-1.5 text-[10px] leading-4 text-gray-500">{MODEL_META[m].description}</p></div><span className="shrink-0 text-[10px] text-amber-300">4s {VIDEO_COSTS[m][4]} • 8s {VIDEO_COSTS[m][8]} cr</span></div></button>)}</div></section>
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Durée</p><div className="grid grid-cols-3 gap-2">{SUPPORTED_DURATIONS.map((d) => <button key={d} onClick={() => setDuration(d)} className={`rounded-xl border px-3 py-3 text-xs font-black ${duration===d?'border-pink-500 bg-pink-500/10 text-white':'border-white/10 bg-white/[0.025] text-gray-400'}`}>{d}s</button>)}</div></section>
              <section><p className="mb-3 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Format</p><div className="grid grid-cols-2 gap-2">{(['16:9','9:16'] as const).map((r) => <button key={r} onClick={() => setAspectRatio(r)} className={`rounded-xl border px-3 py-3 text-xs font-black ${aspectRatio===r?'border-blue-500 bg-blue-500/10 text-white':'border-white/10 bg-white/[0.025] text-gray-400'}`}>{r}</button>)}</div></section>
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4 text-[10px] leading-5 text-amber-100/70">Image guidée = Omni automatiquement. Cette règle évite le chemin `inlineData` qui a provoqué votre erreur avec le modèle Veo sélectionné.</div>
            </div>
            <button onClick={() => setSettingsOpen(false)} className="mt-7 w-full rounded-2xl bg-white py-3 text-sm font-black text-[#08101f]">Appliquer</button>
          </aside>
        </div>
      )}
    </div>
  );
};