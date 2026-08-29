import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, Loader2, Music, Pause, Play, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord } from '../../types';

export const MusicStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, generations, setActiveTab } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    if (isGenerating) return;

    setIsGenerating(true);
    let chargedCredits = 0;
    let reason = '';

    try {
      const quoteResponse = await fetch('/api/music/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      const quote = await quoteResponse.json().catch(() => ({}));
      if (!quoteResponse.ok || !quote.quoteId || !Number.isFinite(Number(quote.creditCost))) {
        throw new Error(quote.error || 'Impossible de calculer le coût de cette musique.');
      }

      chargedCredits = Number(quote.creditCost);
      reason = `Eleven Music — ${title.trim()}`;
      if (!useCredits(chargedCredits, reason)) {
        setIsGenerating(false);
        return;
      }

      const response = await fetch('/api/generate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          quoteId: quote.quoteId,
          title: title.trim(),
          description: description.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération musicale a échoué.');

      addGeneration(data.generation);
      triggerCelebration();
      addNotification('success', 'Musique prête', `${title.trim()} a été générée pour ${chargedCredits} crédits.`);
    } catch (error: any) {
      if (chargedCredits > 0) refundCredits(chargedCredits, reason || title.trim());
      addNotification('error', 'Génération impossible', error?.message || 'Erreur Eleven Music.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !latest?.resultUrl) return;
    if (playing) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  const createVisualClip = () => {
    if (!latest?.resultUrl) return;
    const transfer = {
      generationId: latest.id,
      audioUrl: latest.resultUrl,
      title: latest.title,
      description: latest.prompt,
      audioDuration: latest.audioDuration || null,
    };
    localStorage.setItem('mungwele.music-to-video', JSON.stringify(transfer));
    localStorage.setItem('mungwele.resume.project', JSON.stringify({
      id: `clip-${latest.id}`,
      userId: latest.userId,
      type: 'video',
      title: `Clip — ${latest.title}`,
      prompt: `Créer un clip visuel pour la chanson « ${latest.title} ». Direction visuelle inspirée de : ${latest.prompt}. La chanson source est déjà attachée au projet MUNGWELE et devra être synchronisée par le futur fournisseur audio→vidéo.`,
      provider: 'pending-audio-to-video',
      model: 'pending',
      status: 'draft',
      resultUrl: '',
      thumbnailUrl: '',
      creditsUsed: 0,
      settings: { aspectRatio: '16:9', duration: 8, videoModel: 'fast' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setActiveTab('studio-video');
    addNotification('info', 'Chanson envoyée au Studio Vidéo', 'Le projet Clip visuel est ouvert. La piste audio reste réservée jusqu’à la connexion d’un fournisseur audio→vidéo compatible.');
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <audio ref={audioRef} src={latest?.resultUrl || ''} onEnded={() => setPlaying(false)} className="hidden" />

      <div className="mb-4 px-1">
        <h1 className="text-xl font-black text-white sm:text-2xl">Studio Musique</h1>
        <p className="mt-1 text-xs text-gray-500">Titre + description. Le style, la voix, les instruments et la structure sont compris depuis votre texte.</p>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex flex-1 items-center justify-center pb-6">
          {isGenerating ? (
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-9 w-9 animate-spin text-blue-300" />
              <p className="text-sm font-black text-white">Analyse puis production de « {title || 'votre morceau'} »…</p>
              <p className="mt-2 text-xs text-gray-600">MUNGWELE calcule d’abord le coût réel estimé via Eleven Music, puis lance la génération.</p>
            </div>
          ) : latest?.resultUrl ? (
            <div className="w-full max-w-xl rounded-3xl border border-blue-500/20 bg-blue-500/[0.06] p-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10"><Music className="h-6 w-6 text-blue-200" /></span>
              <h2 className="text-lg font-black text-white">{latest.title || 'Votre morceau MUNGWELE'}</h2>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-gray-500">{latest.prompt}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-300">{latest.provider} • {latest.model} • {latest.audioDuration || '—'}s • {latest.creditsUsed} crédits</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button onClick={togglePlay} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08101f]">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause' : 'Écouter'}</button>
                <button onClick={() => { const a=document.createElement('a'); a.href=latest.resultUrl; a.download=`${latest.title || 'mungwele-music'}.mp3`; a.click(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> Télécharger</button>
                <button onClick={createVisualClip} className="inline-flex items-center gap-2 rounded-xl border border-pink-500/25 bg-pink-500/10 px-4 py-2 text-xs font-black text-pink-200"><Film className="h-3.5 w-3.5" /> Créer un clip visuel</button>
              </div>
            </div>
          ) : (
            <div className="max-w-lg text-center">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10"><Music className="h-5 w-5 text-blue-200" /></span>
              <p className="text-sm font-bold text-gray-300">Décrivez simplement la musique voulue.</p>
              <p className="mt-2 text-xs leading-5 text-gray-600">Exemple : « Rumba congolaise romantique, guitare douce, voix masculine en français, refrain puissant, batterie chaleureuse et ambiance élégante. »</p>
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
              rows={4}
              disabled={isGenerating}
              maxLength={4100}
              placeholder="Décrivez la musique : style, vibe, rythme, instruments, voix, langue, paroles, ambiance, effets…"
              className="max-h-56 min-h-[90px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-5 text-white outline-none placeholder:text-gray-600 disabled:opacity-60"
            />
            <button onClick={() => void generate()} disabled={isGenerating || !title.trim() || !description.trim()} className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg disabled:opacity-35">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          <div className="px-3 pb-1 pt-2 text-[10px] text-gray-600">Le coût n’est pas choisi manuellement : Eleven prépare la structure, MUNGWELE calcule le tarif avec notre marge de sécurité, puis débite les crédits.</div>
        </div>
      </div>
    </div>
  );
};
