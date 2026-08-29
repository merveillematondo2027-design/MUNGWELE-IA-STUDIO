import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2, Music, Pause, Play, Send, Settings2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const SETTINGS_KEY = 'mungwele.music.settings.v1';

export const MusicStudio: React.FC = () => {
  const { useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, generations } = useApp();
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('Afrobeats');
  const [mood, setMood] = useState('Énergique');
  const [instrumental, setInstrumental] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const creditCost = 10;
  const latest = generations.find((g) => g.type === 'music');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (saved) {
        if (saved.genre) setGenre(saved.genre);
        if (saved.mood) setMood(saved.mood);
        if (typeof saved.instrumental === 'boolean') setInstrumental(saved.instrumental);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ genre, mood, instrumental }));
  }, [genre, mood, instrumental]);

  const generateLyrics = async () => {
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez d’abord le thème du morceau.');
    setIsGeneratingLyrics(true);
    try {
      const res = await fetch('/api/ai/generate-lyrics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: prompt.trim(), genre, mood, isInstrumental: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.lyrics) throw new Error(data.error || 'Impossible de générer les paroles.');
      setLyrics(data.lyrics);
      setInstrumental(false);
      addNotification('success', 'Paroles prêtes', 'Vous pouvez les modifier avant de générer la musique.');
    } catch (error: any) {
      addNotification('error', 'Paroles indisponibles', error?.message || 'Erreur du service de paroles.');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const generate = async () => {
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez le morceau que vous voulez créer.');
    const reason = `Génération musicale ${genre} / ${mood}`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), enhancedPrompt: prompt.trim(), genre, mood, isInstrumental: instrumental, lyrics: instrumental ? undefined : lyrics }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.generation) throw new Error(data.error || 'La génération musicale a échoué.');
      addGeneration(data.generation);
      triggerCelebration();
      setPrompt('');
      addNotification('success', 'Musique prête', 'Votre morceau a été généré.');
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur du fournisseur musical. Vos crédits ont été remboursés.');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !latest?.resultUrl) return;
    if (playing) audioRef.current.pause();
    else audioRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <audio ref={audioRef} src={latest?.resultUrl || ''} onEnded={() => setPlaying(false)} className="hidden" />
      <div className="mb-5 flex items-center justify-between px-1">
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Musique</h1><p className="mt-1 text-xs text-gray-500">Décrivez le morceau. Les réglages restent dans un panneau discret.</p></div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex flex-1 items-center justify-center pb-6">
          {latest?.resultUrl ? (
            <div className="w-full max-w-xl rounded-3xl border border-blue-500/20 bg-blue-500/[0.06] p-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10"><Music className="h-6 w-6 text-blue-200" /></span>
              <h2 className="text-lg font-black text-white">{latest.title || 'Votre morceau MUNGWELE'}</h2>
              <p className="mt-2 line-clamp-2 text-xs text-gray-500">{latest.prompt}</p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={togglePlay} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-[#08101f]">{playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{playing ? 'Pause' : 'Écouter'}</button>
                <button onClick={() => { const a=document.createElement('a'); a.href=latest.resultUrl; a.download=`mungwele-music-${latest.id}.mp3`; a.click(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> Télécharger</button>
              </div>
            </div>
          ) : (
            <div className="text-center"><span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10"><Music className="h-5 w-5 text-blue-200" /></span><p className="text-sm font-bold text-gray-300">Votre prochain morceau commence ici.</p><p className="mt-1 text-xs text-gray-600">Genre, ambiance et voix sont disponibles dans les réglages.</p></div>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl">
          <div className="flex items-end gap-2">
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }} rows={2} placeholder="Décrivez le morceau que vous voulez créer…" className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-gray-600" />
            <button onClick={() => setSettingsOpen(true)} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400 hover:text-white"><Settings2 className="h-4 w-4" /></button>
            <button onClick={generate} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600"><span>{genre} • {mood} • {instrumental ? 'Instrumental' : 'Avec voix'}</span><span>{creditCost} crédits</span></div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Musique</h2><p className="text-xs text-gray-500">Conservés automatiquement.</p></div><button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div>
            <div className="mt-8 space-y-6">
              <label className="block"><span className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Genre</span><input value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-blue-500" /></label>
              <label className="block"><span className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Ambiance</span><input value={mood} onChange={(e) => setMood(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none focus:border-blue-500" /></label>
              <section><span className="mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Type</span><div className="grid grid-cols-2 gap-2"><button onClick={() => setInstrumental(false)} className={`rounded-2xl border py-3 text-xs font-black ${!instrumental?'border-blue-500 bg-blue-500/10 text-white':'border-white/10 text-gray-400'}`}>Avec voix</button><button onClick={() => setInstrumental(true)} className={`rounded-2xl border py-3 text-xs font-black ${instrumental?'border-blue-500 bg-blue-500/10 text-white':'border-white/10 text-gray-400'}`}>Instrumental</button></div></section>
              {!instrumental && <section><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Paroles</span><button onClick={generateLyrics} disabled={isGeneratingLyrics} className="text-[11px] font-bold text-blue-300">{isGeneratingLyrics ? 'Génération…' : 'Générer par IA'}</button></div><textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={9} placeholder="Laissez vide pour laisser le fournisseur composer les paroles, ou écrivez vos propres paroles." className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-white outline-none focus:border-blue-500" /></section>}
            </div>
            <button onClick={() => setSettingsOpen(false)} className="mt-8 w-full rounded-2xl bg-white py-3 text-sm font-black text-[#08101f]">Appliquer</button>
          </aside>
        </div>
      )}
    </div>
  );
};
