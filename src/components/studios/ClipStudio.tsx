import React, { useEffect, useRef, useState } from 'react';
import { Film, ImagePlus, Music2, Send, Sparkles, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VIDEO_ENGINES } from '../../config/videoRouting';
import { clipCreditsForDurationSeconds } from '../../config/commercialPricing';

interface MusicTransfer {
  generationId?: string;
  audioUrl?: string;
  title?: string;
  description?: string;
  audioDuration?: number | null;
}

const CLIP_MODES = [
  { id: 'auto', label: 'Automatique', description: 'MUNGWELE prépare la performance et les références.' },
  { id: 'performance', label: 'Artiste / Performance', description: 'Chanteur, danse, scène et lip-sync.' },
  { id: 'story', label: 'Narratif', description: 'Le clip suit une direction artistique et une performance.' },
  { id: 'lyrics', label: 'Lyrics / Visualizer', description: 'Performance avec direction graphique et paroles.' },
  { id: '3d', label: '3D / Animation', description: 'Référence personnage stylisée ou animée.' },
  { id: 'social', label: 'Vertical / Réseaux', description: 'Clip court 9:16 pour Reels, Shorts et TikTok.' },
] as const;

type ClipMode = typeof CLIP_MODES[number]['id'];
type ClipDuration = 10 | 15 | 30;
const CLIP_DURATIONS: ClipDuration[] = [10, 15, 30];

export const ClipStudio: React.FC = () => {
  const { addNotification } = useApp();
  const [source, setSource] = useState<MusicTransfer | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<ClipMode>('auto');
  const [duration, setDuration] = useState<ClipDuration>(15);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [references, setReferences] = useState<string[]>([]);
  const imageInput = useRef<HTMLInputElement | null>(null);
  const audioInput = useRef<HTMLInputElement | null>(null);
  const clipEngine = VIDEO_ENGINES['runway-act-two'];
  const quote = clipCreditsForDurationSeconds(duration);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mungwele.music-to-video');
      if (!raw) return;
      const transfer = JSON.parse(raw) as MusicTransfer;
      setSource(transfer);
      setTitle(transfer.title ? `Clip — ${transfer.title}` : 'Nouveau clip');
      setDescription(transfer.description || '');
      if (transfer.audioDuration) {
        const nearest = CLIP_DURATIONS.find((value) => value >= Math.min(30, transfer.audioDuration || 15));
        if (nearest) setDuration(nearest);
      }
      localStorage.removeItem('mungwele.music-to-video');
    } catch {
      localStorage.removeItem('mungwele.music-to-video');
    }
  }, []);

  const addImages = (files: FileList) => {
    const selected = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024).slice(0, Math.max(0, 9 - references.length));
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setReferences((prev) => prev.length >= 9 ? prev : [...prev, String(reader.result)]);
      reader.readAsDataURL(file);
    });
  };

  const attachAudio = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/')) return addNotification('error', 'Audio invalide', 'Choisissez un fichier audio compatible.');
    const reader = new FileReader();
    reader.onload = () => setSource({ audioUrl: String(reader.result), title: file.name.replace(/\.[^.]+$/, ''), description: '' });
    reader.readAsDataURL(file);
  };

  const prepareClip = () => {
    if (!source?.audioUrl) return addNotification('warning', 'Chanson requise', 'Ajoutez ou sélectionnez une chanson avant de préparer le clip.');
    if (!title.trim()) return addNotification('warning', 'Titre requis', 'Ajoutez un titre au projet clip.');
    if (!description.trim()) return addNotification('warning', 'Description requise', 'Décrivez le style visuel du clip.');

    localStorage.setItem('mungwele.clip-draft', JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      source,
      mode,
      duration,
      aspectRatio,
      references,
      preferredEngine: clipEngine.key,
      creditQuote: quote.credits,
      pricingProviderCostUsd: quote.providerCostUsd,
    }));
    addNotification(
      'info',
      'Projet clip préparé',
      `${clipEngine.label} • ${duration}s • ${quote.credits} crédits. Le rendu sera activé dès que Runway Dev sera configuré côté serveur.`,
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-12">
      <div className="mb-5">
        <div className="flex items-center gap-2"><Film className="h-5 w-5 text-fuchsia-300" /><h1 className="text-xl font-black text-white sm:text-2xl">Clips Vidéo</h1></div>
        <p className="mt-1 text-xs text-gray-500">Fournisseur dédié : Runway Dev • moteur Act-Two • performance, personnage et lip-sync jusqu’à 30 secondes.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black text-white">Source musicale</h2><p className="mt-1 text-[11px] text-gray-600">Depuis Studio Musique ou fichier audio.</p></div><Music2 className="h-5 w-5 text-blue-300" /></div>
          {source?.audioUrl ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-3">
              <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-white">{source.title || 'Chanson attachée'}</p><p className="mt-1 text-[10px] text-gray-500">{source.audioDuration ? `${source.audioDuration}s` : 'Durée détectée au traitement'}</p></div><button onClick={() => setSource(null)} className="rounded-xl bg-white/[0.05] p-2 text-gray-400"><X className="h-4 w-4" /></button></div>
              <audio src={source.audioUrl} controls className="mt-3 w-full" />
            </div>
          ) : (
            <button onClick={() => audioInput.current?.click()} className="flex min-h-[110px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-gray-400"><Upload className="mb-2 h-5 w-5" /><span className="text-xs font-bold">Ajouter une chanson</span></button>
          )}
          <input ref={audioInput} type="file" accept="audio/*" className="hidden" onChange={(e) => attachAudio(e.target.files?.[0])} />

          <div className="mt-5 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du projet clip" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white outline-none" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Décrivez le clip : lieu, ambiance, artiste, vêtements, performance, mouvements, lumière, effets, style visuel…" className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white outline-none" />
          </div>

          <div className="mt-5"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Type de clip</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{CLIP_MODES.map((item) => <button key={item.id} onClick={() => { setMode(item.id); if (item.id === 'social') setAspectRatio('9:16'); }} className={`rounded-2xl border p-3 text-left ${mode === item.id ? 'border-fuchsia-400/50 bg-fuchsia-500/10' : 'border-white/10 bg-white/[0.02]'}`}><p className="text-xs font-black text-white">{item.label}</p><p className="mt-1 text-[9px] leading-4 text-gray-500">{item.description}</p></button>)}</div></div>

          <div className="mt-5"><p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Durée et coût</p><div className="grid grid-cols-3 gap-2">{CLIP_DURATIONS.map((seconds) => { const item = clipCreditsForDurationSeconds(seconds); return <button key={seconds} onClick={() => setDuration(seconds)} className={`rounded-2xl border px-3 py-3 text-left ${duration === seconds ? 'border-amber-400/40 bg-amber-500/10' : 'border-white/10 bg-white/[0.02]'}`}><p className="text-sm font-black text-white">{seconds}s</p><p className="mt-1 text-[10px] font-bold text-amber-300">{item.credits} crédits</p></button>; })}</div></div>

          <div className="mt-5 flex gap-2"><button onClick={() => setAspectRatio('16:9')} className={`rounded-xl border px-4 py-2 text-xs font-bold ${aspectRatio === '16:9' ? 'border-pink-400/40 bg-pink-500/10 text-white' : 'border-white/10 text-gray-500'}`}>16:9</button><button onClick={() => setAspectRatio('9:16')} className={`rounded-xl border px-4 py-2 text-xs font-bold ${aspectRatio === '9:16' ? 'border-pink-400/40 bg-pink-500/10 text-white' : 'border-white/10 text-gray-500'}`}>9:16</button></div>

          <div className="mt-5"><div className="mb-2 flex items-center justify-between"><p className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Références artiste / personnage</p><span className="text-[10px] text-gray-600">{references.length}/9</span></div><input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addImages(e.target.files)} /><div className="flex gap-2 overflow-x-auto pb-1"><button onClick={() => imageInput.current?.click()} className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 text-gray-500"><ImagePlus className="h-4 w-4" /><span className="mt-1 text-[9px]">Ajouter</span></button>{references.map((src, index) => <div key={index} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10"><img src={src} className="h-full w-full object-cover" alt={`Référence ${index + 1}`} /><button onClick={() => setReferences((prev) => prev.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><X className="h-3 w-3" /></button></div>)}</div></div>

          <button onClick={prepareClip} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-violet-600 px-5 py-3 text-sm font-black text-white"><Send className="h-4 w-4" /> Préparer le clip • {quote.credits} crédits</button>
        </section>

        <aside className="space-y-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.025] p-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" /><h2 className="text-sm font-black text-white">Fournisseur Clips</h2></div><p className="mt-2 text-[11px] leading-5 text-gray-500">Un seul fournisseur dédié évite les prix contradictoires : Runway Dev. Act-Two est réservé au transfert de performance, expressions et synchronisation du personnage.</p></div>
          <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-black text-white">{clipEngine.label}</p><p className="mt-1 text-[10px] text-gray-500">{clipEngine.provider} • jusqu’à {clipEngine.maxSeconds}s</p></div><span className={`rounded-full px-2 py-1 text-[9px] font-black ${clipEngine.availability === 'connected' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{clipEngine.availability === 'connected' ? 'Connecté' : 'À connecter'}</span></div><p className="mt-3 text-[10px] leading-5 text-gray-400">{clipEngine.strengths.join(' • ')}</p></div>
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3 text-[10px] leading-5 text-gray-500"><strong className="text-emerald-300">Prix cohérent :</strong> coût Runway Act-Two + 33,33 % MUNGWELE. 10s = {clipCreditsForDurationSeconds(10).credits} crédits • 15s = {clipCreditsForDurationSeconds(15).credits} • 30s = {clipCreditsForDurationSeconds(30).credits}. La majoration de 50 % est réservée à la musique ElevenLabs.</div>
        </aside>
      </div>
    </div>
  );
};
