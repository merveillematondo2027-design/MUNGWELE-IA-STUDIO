import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Music, 
  Sparkles, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Download, 
  Share2, 
  Trash2, 
  Zap, 
  RefreshCw, 
  Wand2, 
  Mic, 
  FileText, 
  Layers, 
  Radio,
  Sliders,
  CheckCircle2,
  Copy
} from 'lucide-react';
import { GENRE_PRESETS_MUSIC, MOOD_PRESETS_MUSIC, PROMPT_TEMPLATES } from '../../data/mockData';
import { PromptEnhanceButton } from '../common/PromptEnhanceButton';
import { PromptEnhancerModal } from '../common/PromptEnhancerModal';
import { MusicGenerationSettings, GenerationRecord } from '../../types';

export const MusicStudio: React.FC = () => {
  const { 
    useCredits, 
    refundCredits, 
    addGeneration, 
    removeGeneration, 
    addNotification, 
    triggerCelebration,
    generations
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('Afrobeats');
  const [selectedMood, setSelectedMood] = useState<string>('Énergique');
  const [isInstrumental, setIsInstrumental] = useState<boolean>(false);
  const [lyrics, setLyrics] = useState<string>('');
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isEnhancerModalOpen, setIsEnhancerModalOpen] = useState(false);

  // Audio player state for generated items
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const musicCreations = generations.filter((g) => g.type === 'music');
  const creditCost = 10;

  const handleGenerateLyrics = async () => {
    if (!prompt.trim()) {
      addNotification('warning', 'Thème requis', 'Indiquez un thème ou un style dans le champ principal pour écrire les paroles.');
      return;
    }

    setIsGeneratingLyrics(true);
    try {
      const res = await fetch('/api/ai/generate-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: prompt,
          genre: selectedGenre,
          mood: selectedMood,
          isInstrumental: false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.lyrics) {
        setLyrics(data.lyrics);
        setIsInstrumental(false);
        addNotification('success', 'Paroles composées par IA 🎵', 'Couplets, refrain et pont ont été générés.');
      } else {
        throw new Error(data.error || 'Échec de la génération des paroles');
      }
    } catch (e: any) {
      console.warn('Lyrics error:', e);
      // Fallback generator
      const fallbackLyrics = `[Couplet 1]\nDans les rues de la cité lumineuse\nLes pulsations résonnent sous le ciel d'ébène\nUn battement qui transcende nos peines\n\n[Refrain]\nDanse au rythme de nos cœurs éveillés\nMUNGWELE Studio, les rêves réinventés\n\n[Pont]\nLève les mains, embrasse la cadence\nC'est notre nuit, notre renaissance !`;
      setLyrics(fallbackLyrics);
      setIsInstrumental(false);
      addNotification('info', 'Paroles générées', 'Paroles standard insérées.');
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!prompt.trim()) {
      addNotification('warning', 'Description requise', 'Décrivez le style musical ou l\'instrumentation.');
      return;
    }

    const allowed = useCredits(creditCost, `Génération morceau IA [${selectedGenre} - ${selectedMood}]`);
    if (!allowed) return;

    setIsGenerating(true);
    setGenerationProgress(10);

    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 20;
      });
    }, 450);

    try {
      const res = await fetch('/api/generate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          enhancedPrompt,
          genre: selectedGenre,
          mood: selectedMood,
          isInstrumental,
          lyrics: isInstrumental ? undefined : lyrics,
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      const data = await res.json();
      if (res.ok && data.generation) {
        addGeneration(data.generation);
        triggerCelebration();
        addNotification(
          'success',
          'Morceau produit avec succès ! 🎧',
          `Votre titre audio haute définition est prêt pour l'écoute.`
        );
      } else {
        throw new Error(data.error || 'Erreur lors de la production musicale.');
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.warn('Music gen error:', err);
      refundCredits(creditCost, 'Échec de génération musicale');
      addNotification(
        'error',
        'Échec de la production audio',
        'Une erreur est survenue. Vos crédits ont été automatiquement remboursés.'
      );
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const togglePlayTrack = (track: GenerationRecord) => {
    if (currentlyPlayingId === track.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setCurrentlyPlayingId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = track.resultUrl;
        audioPlayerRef.current.play().catch(() => {});
      }
      setCurrentlyPlayingId(track.id);
    }
  };

  return (
    <div id="music-studio-container" className="w-full max-w-6xl mx-auto space-y-8 pb-16">
      {/* Hidden audio instance */}
      <audio
        ref={audioPlayerRef}
        onEnded={() => setCurrentlyPlayingId(null)}
        className="hidden"
      />

      {/* Main Creation Card */}
      <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-blue-600/20 text-blue-300 border border-blue-500/30">
                <Music className="w-5 h-5" />
              </span>
              <span>Studio Musique — Suno AI & Lyria</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Composez des morceaux complets avec voix réalistes, arrangements riches et mastering stéréo 3D.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/[0.05] border border-blue-500/30 text-blue-200 flex items-center space-x-1.5 backdrop-blur-md">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Coût : <strong>{creditCost} crédits</strong></span>
            </span>
          </div>
        </div>

        {/* Form Body */}
        <div className="space-y-6 pt-5">
          {/* Main Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-gray-200 flex items-center space-x-1.5">
                <span>Décrivez le style musical, le thème ou les instruments</span>
                <span className="text-blue-400">*</span>
              </label>

              <div className="flex items-center space-x-2">
                <PromptEnhanceButton
                  rawPrompt={prompt}
                  type="music"
                  mood={selectedMood}
                  onEnhanced={(text) => {
                    setPrompt(text);
                    setEnhancedPrompt(text);
                  }}
                />
                <button
                  id="open-prompt-modal-music"
                  onClick={() => setIsEnhancerModalOpen(true)}
                  className="text-xs text-gray-400 hover:text-blue-300 flex items-center space-x-1 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Options sonores</span>
                </button>
              </div>
            </div>

            <textarea
              id="music-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Titre Afrobeats moderne et solaire avec kalimba hypnotique, guitare acoustique caribéenne, percussions 808 chaleureuses et voix soul entraînante..."
              rows={3}
              className="w-full px-4 py-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/10 focus:border-blue-500/80 focus:bg-white/[0.08] text-white placeholder-gray-500 text-sm outline-none transition-all resize-none shadow-inner"
            />

            {/* Inspiration tags */}
            <div className="flex items-center space-x-1.5 overflow-x-auto py-1 text-xs no-scrollbar">
              <span className="text-gray-400 text-[11px] shrink-0 font-medium">Inspirations :</span>
              {PROMPT_TEMPLATES.music.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPrompt(tmpl);
                    setEnhancedPrompt(tmpl);
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-blue-500/40 text-gray-300 hover:text-white transition-colors truncate max-w-[240px]"
                  title={tmpl}
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          {/* Instrumental vs Vocal Switcher */}
          <div className="flex items-center space-x-3 p-1.5 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/10">
            <button
              type="button"
              onClick={() => setIsInstrumental(false)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                !isInstrumental
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>Morceau avec Paroles & Chant</span>
            </button>

            <button
              type="button"
              onClick={() => setIsInstrumental(true)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                isInstrumental
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Instrumental Pur (Sans voix)</span>
            </button>
          </div>

          {/* Genre Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2.5">
              Genre Musical
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {GENRE_PRESETS_MUSIC.map((genre) => {
                const isSelected = selectedGenre === genre.id;
                return (
                  <button
                    key={genre.id}
                    id={`music-genre-${genre.id}`}
                    onClick={() => setSelectedGenre(genre.id)}
                    className={`p-3 rounded-2xl border text-left transition-all backdrop-blur-md ${
                      isSelected
                        ? 'bg-blue-950/50 border-blue-500 text-white shadow-md shadow-blue-950/40'
                        : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-0.5">
                      <span className="text-base">{genre.icon}</span>
                      <span className="text-xs font-bold">{genre.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-1 leading-tight">
                      {genre.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2.5">
              Ambiance & Mood
            </label>
            <div className="flex flex-wrap gap-2">
              {MOOD_PRESETS_MUSIC.map((mood) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all backdrop-blur-md ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white/[0.04] border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>{mood.icon}</span>
                    <span>{mood.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lyrics Zone (when vocal is enabled) */}
          {!isInstrumental && (
            <div className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-blue-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-blue-200 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Paroles du morceau (Optionnel)</span>
                </label>

                <button
                  type="button"
                  id="btn-generate-lyrics"
                  onClick={handleGenerateLyrics}
                  disabled={isGeneratingLyrics}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600/30 to-purple-600/30 hover:from-blue-600/50 hover:to-purple-600/50 border border-blue-500/40 text-blue-200 hover:text-white transition-all disabled:opacity-50"
                >
                  {isGeneratingLyrics ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                      <span>Écriture par IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>Générer les paroles avec l’IA</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                id="music-lyrics-input"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="[Couplet 1]&#10;Écrivez vos propres paroles ici, ou cliquez sur 'Générer les paroles avec l'IA' pour une composition automatique..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] backdrop-blur-md border border-white/10 focus:border-blue-500 text-white text-xs outline-none resize-none font-mono"
              />
            </div>
          )}

          {/* Generation Progress */}
          {isGenerating && (
            <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md border border-blue-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-300 flex items-center space-x-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>Production du master audio en cours...</span>
                </span>
                <span className="font-mono text-blue-400 font-bold">{generationProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Action Button */}
          <button
            id="btn-generate-music"
            onClick={handleGenerateMusic}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-4 rounded-2xl font-display font-extrabold text-base bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:to-pink-500 text-white flex items-center justify-center space-x-3 shadow-xl shadow-blue-950/60 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Composition en cours...</span>
              </>
            ) : (
              <>
                <Music className="w-5 h-5" />
                <span>Générer le morceau ({creditCost} crédits)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Music Tracks Library */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span>Discographie & Pistes Audio</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-blue-500/30 text-blue-300 font-mono">
              {musicCreations.length}
            </span>
          </h3>
        </div>

        {musicCreations.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/10">
            <Music className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-300">Aucun titre composé pour l'instant</p>
            <p className="text-xs text-gray-500 mt-1">
              Utilisez les styles et générateurs ci-dessus pour lancer votre première production musicale.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {musicCreations.map((track) => {
              const isPlaying = currentlyPlayingId === track.id;
              const settings = track.settings as MusicGenerationSettings;

              return (
                <div
                  key={track.id}
                  id={`track-card-${track.id}`}
                  className={`p-4 rounded-2xl border transition-all backdrop-blur-xl ${
                    isPlaying
                      ? 'bg-blue-950/40 border-blue-500/60 shadow-xl shadow-blue-950/50'
                      : 'bg-white/[0.03] border-white/10 hover:border-blue-500/40 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    {/* Cover Art with Play overlay */}
                    <div 
                      onClick={() => togglePlayTrack(track)}
                      className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer group shadow-md"
                    >
                      <img
                        src={track.thumbnailUrl}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center text-white transition-all">
                        {isPlaying ? (
                          <Pause className="w-6 h-6 fill-white" />
                        ) : (
                          <Play className="w-6 h-6 fill-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate">
                          {track.title}
                        </h4>
                        <span className="text-[10px] font-semibold text-blue-400 uppercase bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
                          {settings?.genre || 'Afrobeats'}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                        {track.prompt}
                      </p>

                      {/* Equalizer Visualizer when playing */}
                      <div className="h-4 flex items-center space-x-1 mt-2">
                        {[...Array(16)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full transition-all duration-200 ${
                              isPlaying
                                ? 'bg-gradient-to-t from-blue-500 to-pink-500 ' +
                                  (i % 3 === 0 ? 'animate-wave-1' : i % 3 === 1 ? 'animate-wave-2' : 'animate-wave-3')
                                : 'bg-white/10 h-1'
                            }`}
                            style={{
                              height: isPlaying ? `${Math.floor(Math.random() * 80) + 20}%` : '4px',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/10 text-xs">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {settings?.mood || 'Énergique'} • {settings?.isInstrumental ? 'Instrumental' : 'Vocal'}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = track.resultUrl;
                          a.download = `mungwele-music-${track.id}.mp3`;
                          a.click();
                          addNotification('success', 'Téléchargement lancé', 'Votre fichier audio MP3 a été téléchargé.');
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white transition-colors"
                        title="Télécharger MP3"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(track.lyrics || track.prompt);
                          addNotification('info', 'Paroles/Prompt copié', 'Copié dans le presse-papiers.');
                        }}
                        className="p-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white transition-colors"
                        title="Copier les paroles"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => removeGeneration(track.id)}
                        className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 transition-colors"
                        title="Supprimer la piste"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Advanced Prompt Enhancer Modal */}
      <PromptEnhancerModal
        isOpen={isEnhancerModalOpen}
        onClose={() => setIsEnhancerModalOpen(false)}
        initialPrompt={prompt}
        type="music"
        onApply={(text) => {
          setPrompt(text);
          setEnhancedPrompt(text);
        }}
      />
    </div>
  );
};
