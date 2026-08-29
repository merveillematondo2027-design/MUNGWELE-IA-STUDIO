import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Film, Lock, RefreshCw, Sparkles, Trash2, Upload, X, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, VideoDuration, VideoGenerationSettings, VideoModel } from '../../types';

const MODEL_CONFIG: Record<VideoModel, { label: string; subtitle: string; description: string }> = {
  lite: { label: 'Veo 3.1 Lite', subtitle: 'Économique', description: 'Faible coût pour essais et contenus sociaux.' },
  fast: { label: 'Veo 3.1 Fast', subtitle: 'Recommandé', description: 'Rapide, audio natif et excellent rapport qualité/coût.' },
  pro: { label: 'Veo 3.1 Pro', subtitle: 'Premium', description: 'Veo 3.1 Standard pour les rendus cinématographiques haut de gamme.' },
};

const CREDIT_TABLE: Record<VideoModel, Record<VideoDuration, number>> = {
  lite: { 4: 15, 6: 23, 8: 30 },
  fast: { 4: 30, 6: 45, 8: 60 },
  pro: { 4: 120, 6: 180, 8: 240 },
};

export const VideoStudio: React.FC = () => {
  const { user, appSettings, useCredits, refundCredits, addGeneration, removeGeneration, addNotification, imageToVideoTransfer, setImageToVideoTransfer, triggerCelebration, generations, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [videoModel, setVideoModel] = useState<VideoModel>('fast');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<VideoDuration>(8);
  const [startImage, setStartImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const startInputRef = useRef<HTMLInputElement | null>(null);
  const endInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (imageToVideoTransfer) { setStartImage(imageToVideoTransfer); setImageToVideoTransfer(null); } }, [imageToVideoTransfer, setImageToVideoTransfer]);

  const creditCost = CREDIT_TABLE[videoModel][duration];
  const videoCreations = generations.filter((g) => g.type === 'video');
  const plan = appSettings.subscriptionPlans.find((p) => p.id === user.plan);
  const canDownloadHd = plan?.maxDownloadResolution === '720p' || plan?.maxDownloadResolution === '1080p';

  const loadImage = (file: File, target: 'start' | 'end') => {
    if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { addNotification('error', 'Image invalide', 'PNG/JPG/WEBP, 10 Mo maximum.'); return; }
    const reader = new FileReader();
    reader.onload = () => target === 'start' ? setStartImage(reader.result as string) : setEndImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearWorkspace = () => { setPrompt(''); setStartImage(null); setEndImage(null); setDuration(8); if (startInputRef.current) startInputRef.current.value = ''; if (endInputRef.current) endInputRef.current.value = ''; };

  const handleGenerate = async () => {
    if (!prompt.trim()) { addNotification('warning', 'Prompt requis', 'Décrivez précisément la vidéo.'); return; }
    if (endImage && !startImage) { addNotification('warning', 'Image de départ requise', 'Une image de fin nécessite une image de départ.'); return; }
    const label = MODEL_CONFIG[videoModel].label;
    const reason = `Génération ${label} ${duration}s`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true); setProgress(8); setStatus(`Envoi à ${label}…`);
    const timer = window.setInterval(() => setProgress((v) => Math.min(92, v + (v < 50 ? 5 : 2))), 4000);
    try {
      const response = await fetch('/api/generate/video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: videoModel, prompt: prompt.trim(), aspectRatio, duration, startImage, endImage, userId: user.id }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération vidéo a échoué.');
      setProgress(100); setStatus('Vidéo prête.'); addGeneration(data.generation); triggerCelebration(); clearWorkspace();
      addNotification('success', 'Vidéo prête', `${label} a généré votre vidéo de ${duration}s.`);
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Vos crédits ont été remboursés.');
    } finally { window.clearInterval(timer); setIsGenerating(false); window.setTimeout(() => { setProgress(0); setStatus(''); }, 500); }
  };

  const downloadVideo = (gen: GenerationRecord) => {
    if (!canDownloadHd) {
      addNotification('warning', 'Abonnement requis', 'La génération reste disponible en aperçu. Abonnez-vous à Creator ou Pro pour télécharger la version HD.');
      setActiveTab('subscription');
      return;
    }
    const a = document.createElement('a'); a.href = gen.resultUrl; a.download = `mungwele-video-${gen.id}.mp4`; a.click();
  };

  const reusePrompt = (gen: GenerationRecord) => {
    setPrompt(gen.prompt); const s = gen.settings as VideoGenerationSettings;
    if (s.videoModel) setVideoModel(s.videoModel); if (s.duration) setDuration(s.duration); if (s.aspectRatio) setAspectRatio(s.aspectRatio);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <div className="w-full max-w-6xl mx-auto space-y-8 pb-16">
    <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 sm:p-7 space-y-6">
      <div className="flex justify-between gap-4 border-b border-white/10 pb-5"><div><h2 className="text-2xl font-extrabold text-white flex items-center gap-2"><Film className="text-pink-400" />Studio Vidéo Veo</h2><p className="text-xs text-gray-400 mt-1">Lite, Fast ou Pro. 4, 6 ou 8 secondes. Audio natif.</p></div><span className="text-sm font-bold text-amber-400 flex items-center gap-1"><Zap className="w-4 h-4" />{creditCost} crédits</span></div>
      <div><label className="text-xs font-bold uppercase text-gray-300">1. Modèle</label><div className="grid md:grid-cols-3 gap-3 mt-2">{(Object.keys(MODEL_CONFIG) as VideoModel[]).map((model) => <button key={model} onClick={() => setVideoModel(model)} className={`relative p-4 rounded-2xl border text-left ${videoModel === model ? 'border-pink-500 bg-pink-600/15' : 'border-white/10 bg-white/[0.02]'}`}>{videoModel === model && <Check className="absolute top-3 right-3 w-4 h-4 text-pink-300" />}<p className="font-bold text-white">{MODEL_CONFIG[model].label}</p><p className="text-[11px] text-pink-300">{MODEL_CONFIG[model].subtitle}</p><p className="text-[11px] text-gray-400 mt-2">{MODEL_CONFIG[model].description}</p><p className="text-[10px] text-amber-300 mt-3">4s {CREDIT_TABLE[model][4]}cr • 6s {CREDIT_TABLE[model][6]}cr • 8s {CREDIT_TABLE[model][8]}cr</p></button>)}</div></div>
      <div><label className="text-sm font-bold text-gray-200">2. Prompt détaillé</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} className="mt-2 w-full px-4 py-4 rounded-2xl bg-white/[0.04] border border-white/10 text-white outline-none focus:border-pink-500" placeholder="Décrivez scène, caméra, mouvements, personnages, dialogue exact, bruitages, musique et lumière…" /></div>
      <div className="grid sm:grid-cols-2 gap-4"><div><label className="text-xs font-bold uppercase text-gray-300">Format</label><div className="grid grid-cols-2 gap-2 mt-2">{(['16:9','9:16'] as const).map((r) => <button key={r} onClick={() => setAspectRatio(r)} className={`py-3 rounded-xl border ${aspectRatio === r ? 'border-pink-500 text-pink-200 bg-pink-600/15' : 'border-white/10 text-gray-400'}`}>{r}</button>)}</div></div><div><label className="text-xs font-bold uppercase text-gray-300">Durée</label><div className="grid grid-cols-3 gap-2 mt-2">{([4,6,8] as VideoDuration[]).map((d) => <button key={d} onClick={() => setDuration(d)} className={`py-3 rounded-xl border ${duration === d ? 'border-pink-500 text-pink-200 bg-pink-600/15' : 'border-white/10 text-gray-400'}`}>{d}s</button>)}</div></div></div>
      <div className="grid sm:grid-cols-2 gap-4">{(['start','end'] as const).map((target) => { const value = target === 'start' ? startImage : endImage; const ref = target === 'start' ? startInputRef : endInputRef; return <div key={target}><label className="text-xs font-bold uppercase text-gray-300">Image de {target === 'start' ? 'départ' : 'fin'} — optionnelle</label><input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0], target)} />{value ? <div className="relative mt-2 rounded-2xl border border-white/10 overflow-hidden"><img src={value} className="w-full h-40 object-contain bg-black/20" /><button onClick={() => target === 'start' ? setStartImage(null) : setEndImage(null)} className="absolute top-2 right-2 p-2 rounded-full bg-black/70"><X className="w-4 h-4" /></button></div> : <button onClick={() => ref.current?.click()} className="mt-2 w-full h-40 rounded-2xl border border-dashed border-white/15 text-gray-400 flex flex-col items-center justify-center gap-2"><Upload className="w-5 h-5" />Importer</button>}</div>; })}</div>
      {isGenerating && <div className="p-4 rounded-2xl border border-pink-500/30 bg-white/[0.03]"><div className="flex justify-between text-xs text-pink-200"><span className="flex gap-2"><RefreshCw className="w-4 h-4 animate-spin" />{status}</span><span>{progress}%</span></div><div className="h-2 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-pink-500 to-blue-500" style={{ width: `${progress}%` }} /></div></div>}
      <button disabled={isGenerating || !prompt.trim()} onClick={handleGenerate} className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white font-extrabold flex justify-center gap-2 disabled:opacity-50"><Sparkles className="w-5 h-5" />Générer avec {MODEL_CONFIG[videoModel].label} — {creditCost} crédits</button>
    </section>
    <section className="space-y-4"><div className="flex justify-between items-center"><h3 className="text-lg font-bold text-white">Galerie vidéo ({videoCreations.length})</h3><span className={`text-[11px] px-3 py-1 rounded-full border ${canDownloadHd ? 'text-emerald-300 border-emerald-500/30' : 'text-amber-300 border-amber-500/30'}`}>{canDownloadHd ? `Téléchargement HD : ${plan?.maxDownloadResolution}` : 'HD verrouillée sans abonnement'}</span></div>{videoCreations.length === 0 ? <div className="py-12 text-center rounded-3xl border border-white/10 text-gray-500">Aucune vidéo générée.</div> : <div className="grid md:grid-cols-2 gap-5">{videoCreations.map((gen) => { const s = gen.settings as VideoGenerationSettings; return <article key={gen.id} className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.03]"><video src={gen.resultUrl} controls playsInline className="w-full aspect-video bg-black" /><div className="p-4 space-y-3"><div className="flex justify-between text-[10px]"><span className="text-pink-300 font-bold">{s.videoModel ? MODEL_CONFIG[s.videoModel].label : gen.model}</span><span className="text-gray-500">{s.duration}s • {s.aspectRatio} • {s.resolution || '720p'}</span></div><p className="text-xs text-gray-300 line-clamp-2">{gen.prompt}</p><div className="grid grid-cols-3 gap-2"><button onClick={() => downloadVideo(gen)} className="py-2 rounded-lg bg-white/[0.06] text-[10px] text-gray-200 flex justify-center gap-1">{canDownloadHd ? <Download className="w-3 h-3" /> : <Lock className="w-3 h-3" />}Télécharger</button><button onClick={() => reusePrompt(gen)} className="py-2 rounded-lg bg-white/[0.06] text-[10px] text-gray-200 flex justify-center gap-1"><Copy className="w-3 h-3" />Prompt</button><button onClick={() => removeGeneration(gen.id)} className="py-2 rounded-lg bg-rose-950/30 text-[10px] text-rose-300 flex justify-center gap-1"><Trash2 className="w-3 h-3" />Supprimer</button></div></div></article>; })}</div>}</section>
  </div>;
};
