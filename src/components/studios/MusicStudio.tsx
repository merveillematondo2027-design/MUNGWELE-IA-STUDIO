import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Loader2, Music, Pause, Play, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, MusicGenerationSettings } from '../../types';

type MusicDuration = 30 | 60 | 120;
const MUSIC_COSTS: Record<MusicDuration, number> = { 30: 10, 60: 20, 120: 40 };

function inferDuration(text: string): MusicDuration {
  const value = text.toLowerCase();
  if (/\b(2\s*(min|minute|minutes)|120\s*(s|sec|seconde|secondes))\b/.test(value)) return 120;
  if (/\b(1\s*(min|minute|minutes)|60\s*(s|sec|seconde|secondes))\b/.test(value)) return 60;
  return 30;
}

function inferInstrumental(text: string) {
  const value = text.toLowerCase();
  return /\binstrumental(e)?\b|\bsans\s+(voix|chant|paroles)\b|\bno\s+vocals?\b/.test(value);
}

export const MusicStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, generations } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const durationSeconds = useMemo(() => inferDuration(description), [description]);
  const instrumental = useMemo(() => inferInstrumental(description), [description]);
  const creditCost = MUSIC_COSTS[durationSeconds];
  const latest = generations.find((g) => g.type === 'music' && (!user.id || g.userId === user.id));

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mungwele.resume.project');
      if (!raw) return;
      const project = JSON.parse(raw) as GenerationRecord;
      if (project.type !== 'music') return;
      setTitle(project.title || '');
      setDescription(project.prompt || '');
      localStorage.removeItem('mungwele.resume.project');
    } catch {
      localStorage.removeItem('mungwele.resume.project');
    }
  }, []);

  const generate = async () => {
    if (!title.trim()) return addNotification('warning', 'Titre requis', 'Ajoutez un titre à votre morceau.');
    if (!description.trim()) return addNotification('warning', 'Description requise', 'Décrivez la musique que vous voulez créer.');

    const reason = `Eleven Music ${durationSeconds}s — ${title.trim()}`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);

    try {
      const providerPrompt = `Titre du morceau : ${title.trim()}\n\n${description.trim()}`;
      const res = await fetch('/api/generate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          prompt: providerPrompt,
          genre: 'Selon la description',
          mood: 'Selon la description',
          isInstrumental: instrumental,
          durationSeconds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.generation) throw new Error(data.error || 'La génération musicale a échoué.');

      const generation = { ...data.generation, title: title.trim(), prompt: description.trim() };
      addGeneration(generation);
      triggerCelebration();
      addNotification('success', 'Musique prête', `${title.trim()} a été générée en ${durationSeconds} secondes.`);
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur Eleven Music. Vos crédits ont été remboursés.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !latest?.resultUrl) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <audio ref={audioRef} src={latest?.resultUrl || ''} onEnded={() => setPlaying(false)} className="hidden" />

      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Studio Musique</h1>
          <p className="mt-1 text-xs text-gray-500">Un titre, une description, puis MUNGWELE s’occupe du reste avec Eleven Music v2.</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex flex-1 items-center justify-center pb-6">
          {isGenerating ? (
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-blue-300" />
              <p className="text-sm font-black text-white">Production de « {title || 'votre morceau'} »…</p>
              <p className="mt-2 text-xs text-gray-600">Eleven Music v2 • {durationSeconds}s • {creditCost} crédits</p>
            </div>
          ) : latest?.resultUrl ? (
            <div className="w-full max-w-xl rounded-3xl border border-blue-500/20 bg-blue-500/[0.06] p-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10"><Music className="h-6 w-6 text-blue-200" /></span>
              <h2 className="text-lg font-black text-white">{latest.title || 'Votre morceau MUNGWELE'}</h2>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">{latest.prompt}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-300">{latest.provider} • {latest.model} • {latest.audioDuration || '—'}s</p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={togglePlay} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08101f]">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause' : 'Écouter'}</button>
                <button onClick={() => { const a=document.createElement('a'); a.href=latest.resultUrl; a.download=`${latest.title || 'mungwele-music'}.mp3`; a.click(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> Télécharger</button>
              </div>
            </div>
          ) : (
            <div className="max-w-lg text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10"><Music className="h-5 w-5 text-blue-200" /></span>
              <p className="text-sm font-bold text-gray-300">Décrivez simplement le résultat voulu.</p>
              <p className="mt-2 text-xs leading-5 text-gray-600">Dans la description, indiquez librement genre, ambiance, instruments, voix, langue, paroles et durée. Exemples : « instrumental sans voix, 30 secondes » ou « rumba congolaise, voix masculine en français, 2 minutes ».</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2.5 shadow-2xl">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isGenerating}
            maxLength={100}
            placeholder="Titre du morceau"
            className="mb-2 w-full rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3 text-sm font-bold text-white outline-none placeholder:font-medium placeholder:text-gray-600 focus:border-blue-500/40 disabled:opacity-60"
          />
          <div className="flex items-end gap-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void generate(); } }}
              rows={3}
              disabled={isGenerating}
              maxLength={3900}
              placeholder="Décrivez votre musique : style, ambiance, instruments, type de voix, langue, paroles, durée…"
              className="max-h-48 min-h-[74px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-gray-600 disabled:opacity-60"
            />
            <button onClick={() => void generate()} disabled={isGenerating || !title.trim() || !description.trim()} className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg disabled:opacity-35">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 pt-2 text-[10px] text-gray-600">
            <span>Durée détectée : {durationSeconds === 120 ? '2 min' : `${durationSeconds}s`} {instrumental ? '• instrumental' : ''}</span>
            <span className="font-bold text-amber-300/80">{creditCost} crédits</span>
          </div>
        </div>
      </div>
    </div>
  );
};
