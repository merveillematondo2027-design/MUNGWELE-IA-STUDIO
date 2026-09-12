import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Download, Film, Loader2, Lock, Plus, Send, Settings2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type {
  ExtendedVideoDuration,
  GenerationRecord,
  VideoEngineKey,
  VideoGenerationSettings,
  VideoModel,
} from '../../types';
import { VIDEO_ENGINES } from '../../config/videoRouting';
import { videoEngineCreditsForRequest } from '../../config/commercialPricing';
import { DownloadOptionsModal } from '../common/DownloadOptionsModal';

const ENGINE_TO_MODEL: Partial<Record<VideoEngineKey, VideoModel>> = {
  'veo-lite': 'lite',
  'veo-fast': 'fast',
  omni: 'omni',
};

// Commercial hierarchy: Free -> Creator -> Pro -> Studio.
const PUBLIC_ENGINE_KEYS: VideoEngineKey[] = ['veo-lite', 'veo-fast', 'omni', 'h3-max', 'seedance-2-5'];
const PUBLIC_ENGINE_SET = new Set<VideoEngineKey>(PUBLIC_ENGINE_KEYS);
const ENGINE_MIN_LEVEL: Partial<Record<VideoEngineKey, number>> = {
  'veo-lite': 0,
  'veo-fast': 0,
  omni: 1,
  'h3-max': 2,
  'seedance-2-5': 3,
};
const PLAN_LABELS = ['Gratuit', 'Creator', 'Pro', 'Studio'] as const;
const MAX_OMNI_REFERENCES = 6;
const SETTINGS_KEY = 'mungwele.video.simple-settings.v1';
const NEW_PROJECT_KEY = 'mungwele.new.project';
const RESUME_PROJECT_KEY = 'mungwele.resume.project';
const NEW_PROJECT_EVENT = 'mungwele:new-project';
const EXTENDED_DURATIONS: ExtendedVideoDuration[] = [4, 5, 6, 8, 10, 15, 30];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Lecture image impossible.'));
    reader.readAsDataURL(file);
  });
}

function isExtendedDuration(value: unknown): value is ExtendedVideoDuration {
  return EXTENDED_DURATIONS.includes(Number(value) as ExtendedVideoDuration);
}

function isPublicEngine(value: unknown): value is VideoEngineKey {
  return typeof value === 'string' && PUBLIC_ENGINE_SET.has(value as VideoEngineKey);
}

function planLevel(plan: string, role: string) {
  if (role === 'admin') return 3;
  if (plan === 'studio') return 3;
  if (plan === 'pro') return 2;
  if (plan === 'creator') return 1;
  return 0;
}

function requiredPlanLabel(engineKey: VideoEngineKey) {
  const level = ENGINE_MIN_LEVEL[engineKey] ?? 0;
  return PLAN_LABELS[Math.max(0, Math.min(3, level))];
}

export const VideoStudio: React.FC = () => {
  const {
    user,
    useCredits,
    refundCredits,
    addGeneration,
    addNotification,
    triggerCelebration,
    imageToVideoTransfer,
    setImageToVideoTransfer,
  } = useApp();

  const [prompt, setPrompt] = useState('');
  const [engineKey, setEngineKey] = useState<VideoEngineKey>('veo-lite');
  const [duration, setDuration] = useState<ExtendedVideoDuration>(8);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
  const [startImage, setStartImage] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [currentResult, setCurrentResult] = useState<GenerationRecord | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [engineListOpen, setEngineListOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const imageInput = useRef<HTMLInputElement | null>(null);

  const currentPlanLevel = planLevel(user.plan, user.role);
  const selectedEngine = VIDEO_ENGINES[engineKey];
  const isLite = engineKey === 'veo-lite';
  const usesOmni = engineKey === 'omni';
  const canUploadReference = selectedEngine.supportsImages;
  const effectiveEngine = selectedEngine;
  const effectiveModel: VideoModel = ENGINE_TO_MODEL[engineKey] || 'lite';
  const creditCost = videoEngineCreditsForRequest(effectiveEngine.key, duration).credits;
  const isEngineUnlocked = (key: VideoEngineKey) => currentPlanLevel >= (ENGINE_MIN_LEVEL[key] ?? 0);

  const clearImages = () => {
    setStartImage(null);
    setReferenceImages([]);
    if (imageInput.current) imageInput.current.value = '';
  };

  const resetProject = (keepSettings = true) => {
    setPrompt('');
    clearImages();
    setCurrentResult(null);
    setDownloadOpen(false);
    if (!keepSettings) {
      setEngineKey('veo-lite');
      setDuration(8);
      setAspectRatio('9:16');
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      const savedEngine = isPublicEngine(saved?.engineKey) ? saved.engineKey : 'veo-lite';
      const engine = VIDEO_ENGINES[savedEngine];
      setEngineKey(savedEngine);
      if (isExtendedDuration(saved?.duration) && engine.durations.includes(saved.duration)) setDuration(saved.duration);
      else setDuration((engine.durations.includes(8) ? 8 : engine.durations[0]) as ExtendedVideoDuration);
      if (saved?.aspectRatio === '16:9' || saved?.aspectRatio === '9:16') setAspectRatio(saved.aspectRatio);
    } catch {
      // Keep simple launch defaults.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ engineKey, duration, aspectRatio }));
  }, [engineKey, duration, aspectRatio]);

  // If a subscription expires while an advanced engine was selected, fall back to
  // the best free engine instead of leaving an inaccessible project selected.
  useEffect(() => {
    if (isEngineUnlocked(engineKey)) return;
    setEngineKey('veo-fast');
    setDuration((VIDEO_ENGINES['veo-fast'].durations.includes(duration) ? duration : 8) as ExtendedVideoDuration);
    setReferenceImages([]);
  }, [user.plan, user.role, engineKey]);

  // A module entry is always a fresh project. Resume is only allowed from Library.
  useEffect(() => {
    const newProject = sessionStorage.getItem(NEW_PROJECT_KEY);
    if (newProject === 'video') {
      sessionStorage.removeItem(NEW_PROJECT_KEY);
      localStorage.removeItem(RESUME_PROJECT_KEY);
      resetProject(true);
      return;
    }

    try {
      const raw = localStorage.getItem(RESUME_PROJECT_KEY);
      if (!raw) {
        resetProject(true);
        return;
      }
      const project = JSON.parse(raw) as GenerationRecord;
      if (project.type !== 'video') {
        localStorage.removeItem(RESUME_PROJECT_KEY);
        resetProject(true);
        return;
      }

      setCurrentResult(project);
      setPrompt(project.prompt || '');
      const settings = project.settings as VideoGenerationSettings;
      const resumedEngine = isPublicEngine(settings?.engineKey) ? settings.engineKey : 'veo-lite';
      const engine = VIDEO_ENGINES[resumedEngine];
      setEngineKey(resumedEngine);
      if (isExtendedDuration(settings?.duration) && engine.durations.includes(settings.duration)) {
        setDuration(settings.duration);
      } else {
        setDuration((engine.durations.includes(8) ? 8 : engine.durations[0]) as ExtendedVideoDuration);
      }
      if (settings?.aspectRatio === '16:9' || settings?.aspectRatio === '9:16') setAspectRatio(settings.aspectRatio);
      if (engine.supportsImages) {
        if (typeof settings?.startImage === 'string') setStartImage(settings.startImage);
        if (resumedEngine === 'omni' && Array.isArray(settings?.referenceImages)) {
          setReferenceImages(settings.referenceImages.filter((item): item is string => typeof item === 'string'));
        }
      } else {
        clearImages();
      }
      localStorage.removeItem(RESUME_PROJECT_KEY);
    } catch {
      localStorage.removeItem(RESUME_PROJECT_KEY);
      resetProject(true);
    }
  }, []);

  // Also reset when the user taps Video while already inside Video Studio.
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ studio?: string }>).detail;
      if (detail?.studio !== 'video') return;
      localStorage.removeItem(RESUME_PROJECT_KEY);
      sessionStorage.removeItem(NEW_PROJECT_KEY);
      resetProject(true);
    };
    window.addEventListener(NEW_PROJECT_EVENT, handler as EventListener);
    return () => window.removeEventListener(NEW_PROJECT_EVENT, handler as EventListener);
  }, []);

  useEffect(() => {
    if (!imageToVideoTransfer) return;
    const target: VideoEngineKey = currentPlanLevel >= 1 ? 'omni' : 'veo-fast';
    setEngineKey(target);
    if (target === 'omni') {
      setStartImage(null);
      setReferenceImages([imageToVideoTransfer]);
    } else {
      setStartImage(imageToVideoTransfer);
      setReferenceImages([]);
    }
    setCurrentResult(null);
    if (!VIDEO_ENGINES[target].durations.includes(duration)) setDuration(8);
    setImageToVideoTransfer(null);
  }, [imageToVideoTransfer, setImageToVideoTransfer, duration, currentPlanLevel]);

  // Keep Omni duration valid when references are attached.
  useEffect(() => {
    if (!usesOmni || referenceImages.length === 0) return;
    if (!VIDEO_ENGINES.omni.durations.includes(duration)) setDuration(8);
  }, [usesOmni, referenceImages.length, duration]);

  const chooseEngine = (key: VideoEngineKey) => {
    if (!PUBLIC_ENGINE_SET.has(key)) return;
    if (!isEngineUnlocked(key)) {
      addNotification('info', `${requiredPlanLabel(key)} requis`, `${VIDEO_ENGINES[key].label} est disponible à partir de la formule ${requiredPlanLabel(key)}.`);
      return;
    }

    const engine = VIDEO_ENGINES[key];
    setEngineKey(key);
    if (!engine.durations.includes(duration)) {
      setDuration((engine.durations.includes(8) ? 8 : engine.durations[0]) as ExtendedVideoDuration);
    }
    setCurrentResult(null);
    setEngineListOpen(false);

    if (!engine.supportsImages) {
      clearImages();
    } else if (key !== 'omni' && referenceImages.length > 0) {
      setStartImage((current) => current || referenceImages[0]);
      setReferenceImages([]);
    }

    if (engine.availability !== 'connected') {
      addNotification('info', 'Bientôt disponible', `${engine.label} fait partie de votre palier mais son fournisseur n’est pas encore connecté. Aucun crédit ne sera débité.`);
    }
  };

  const openImagePicker = () => {
    if (isGenerating) return;
    if (!canUploadReference) {
      addNotification('info', 'Image de référence indisponible', `${selectedEngine.label} fonctionne ici par prompt uniquement. Choisissez Veo 3.1 Fast ou un moteur supérieur compatible.`);
      return;
    }
    imageInput.current?.click();
  };

  const loadImages = async (files: FileList) => {
    if (!canUploadReference) {
      clearImages();
      addNotification('info', 'Image de référence indisponible', `${selectedEngine.label} ne prend pas en charge l’image de référence dans ce parcours.`);
      return;
    }

    const incoming = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (!incoming.length) {
      addNotification('error', 'Images invalides', 'Utilisez PNG, JPG ou WEBP, 10 Mo maximum par image.');
      return;
    }

    const maxImages = usesOmni ? MAX_OMNI_REFERENCES : 1;
    const occupied = usesOmni ? referenceImages.length : (startImage ? 1 : 0);
    const selected = incoming.slice(0, Math.max(0, maxImages - occupied));
    if (!selected.length) {
      addNotification('info', 'Limite références', usesOmni ? `${MAX_OMNI_REFERENCES} images maximum avec Gemini Omni Fast.` : 'Une image de référence maximum avec ce moteur.');
      return;
    }

    try {
      const values = await Promise.all(selected.map(fileToDataUrl));

      if (usesOmni) {
        setStartImage(null);
        setReferenceImages((current) => [...current, ...values].slice(0, MAX_OMNI_REFERENCES));
      } else {
        setStartImage(values[0]);
        setReferenceImages([]);
      }

      setCurrentResult(null);
    } catch {
      addNotification('error', 'Lecture impossible', 'Une image n’a pas pu être chargée.');
    }
  };

  const quoteForEngine = (key: VideoEngineKey) => {
    try {
      const engine = VIDEO_ENGINES[key];
      const quotedDuration = engine.durations.includes(duration)
        ? duration
        : (engine.durations.includes(8) ? 8 : engine.durations[0]);
      return videoEngineCreditsForRequest(key, quotedDuration).credits;
    } catch {
      return null;
    }
  };

  const generate = async () => {
    if (isGenerating) return;
    if (!prompt.trim()) {
      addNotification('warning', 'Prompt requis', 'Décrivez la vidéo que vous voulez créer.');
      return;
    }

    if (!isEngineUnlocked(engineKey)) {
      addNotification('warning', `${requiredPlanLabel(engineKey)} requis`, `${effectiveEngine.label} n’est pas inclus dans votre formule actuelle.`);
      return;
    }

    if (isLite && (startImage || referenceImages.length > 0)) {
      clearImages();
      addNotification('info', 'Image retirée', 'Veo 3.1 Lite fonctionne ici en prompt vidéo uniquement. Choisissez Veo 3.1 Fast ou Gemini Omni Fast pour utiliser une image.');
      return;
    }

    if (effectiveEngine.availability !== 'connected') {
      addNotification('info', 'Bientôt disponible', `${effectiveEngine.label} n’est pas encore connecté au fournisseur. Aucun crédit ne sera débité.`);
      return;
    }

    const reason = `Vidéo ${effectiveEngine.label} (${duration}s)`;
    if (!useCredits(creditCost, reason)) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          model: effectiveModel,
          prompt: prompt.trim(),
          aspectRatio,
          duration,
          startImage: isLite ? null : startImage,
          referenceImages: usesOmni ? referenceImages : [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération vidéo a échoué.');

      const serverCredits = Number(data.generation.creditsUsed);
      if (Number.isFinite(serverCredits) && serverCredits !== creditCost) {
        throw new Error('Le tarif serveur a changé. Rechargez MUNGWELE avant de relancer la génération.');
      }

      const record: GenerationRecord = {
        ...data.generation,
        creditsUsed: creditCost,
        settings: {
          ...data.generation.settings,
          engineKey: effectiveEngine.key,
          duration,
          aspectRatio,
          startImage: startImage || undefined,
          referenceImages: usesOmni ? referenceImages : undefined,
        },
      };

      addGeneration(record);
      setCurrentResult(record);
      triggerCelebration();
      setPrompt('');
      clearImages();
      addNotification('success', 'Vidéo prête', `${effectiveEngine.label} a terminé votre rendu.`);
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur vidéo. Vos crédits ont été libérés.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Studio Vidéo</h1>
          <p className="mt-1 text-xs text-gray-500">Nouveau projet • moteur, durée et format.</p>
        </div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-5">
          {isGenerating ? (
            <div className="flex min-h-[38vh] flex-col items-center justify-center text-center">
              <Loader2 className="mb-4 h-9 w-9 animate-spin text-pink-300" />
              <p className="text-sm font-black text-white">{effectiveEngine.label} génère votre vidéo…</p>
              <p className="mt-2 text-xs text-gray-500">{duration}s • {aspectRatio}</p>
            </div>
          ) : currentResult?.resultUrl ? (
            <div className="mx-auto max-w-4xl">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                <video
                  src={currentResult.resultUrl}
                  controls
                  playsInline
                  controlsList="nodownload noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(event) => event.preventDefault()}
                  className="max-h-[55vh] w-full bg-black object-contain"
                />
              </div>
              <button type="button" onClick={() => setDownloadOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200">
                <Download className="h-3.5 w-3.5" /> Télécharger
              </button>
            </div>
          ) : (
            <div className="flex min-h-[38vh] flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10"><Film className="h-5 w-5 text-pink-200" /></span>
              <p className="text-sm font-bold text-gray-300">Nouveau projet vidéo</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-gray-600">Décrivez votre vidéo puis ajustez seulement le moteur, la durée et le format.</p>
            </div>
          )}
        </div>

        {(startImage || referenceImages.length > 0) && (
          <div className="mb-2 flex gap-2 overflow-x-auto">
            <button type="button" onClick={clearImages} className="h-16 shrink-0 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-gray-400">Retirer tout</button>
            {startImage && <img src={startImage} alt="Départ" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
            {referenceImages.map((src, index) => <img key={index} src={src} alt={`Référence ${index + 1}`} className="h-16 w-16 shrink-0 rounded-xl object-cover" />)}
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl">
          <input ref={imageInput} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" disabled={!canUploadReference || isGenerating} onChange={(event) => event.target.files && void loadImages(event.target.files)} />
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={openImagePicker}
              disabled={isGenerating}
              aria-disabled={!canUploadReference}
              title={canUploadReference ? 'Ajouter une image de référence' : `${selectedEngine.label} ne prend pas en charge l’image de référence`}
              className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${canUploadReference ? 'bg-white/[0.06] text-gray-300' : 'cursor-not-allowed bg-white/[0.025] text-gray-700'}`}
            >
              <Plus className="h-5 w-5" />
            </button>
            <textarea
              value={prompt}
              onChange={(event) => { setPrompt(event.target.value); if (currentResult) setCurrentResult(null); }}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void generate(); } }}
              rows={2}
              placeholder="Décrivez la vidéo que vous voulez créer…"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-gray-600"
            />
            <button type="button" onClick={() => setSettingsOpen(true)} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400"><Settings2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => void generate()} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          {!canUploadReference && (
            <p className="px-3 pt-2 text-[10px] leading-4 text-amber-300/80">{selectedEngine.label} : image de référence désactivée pour ce moteur.</p>
          )}
          {canUploadReference && (
            <p className="px-3 pt-2 text-[10px] leading-4 text-gray-500">Le bouton + ajoute {usesOmni ? `jusqu’à ${MAX_OMNI_REFERENCES} images de référence` : 'une image de référence'} pour guider la vidéo.</p>
          )}
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600">
            <span>{effectiveEngine.label} • {duration}s • {aspectRatio}</span>
            <span>{effectiveEngine.availability === 'connected' ? `${creditCost} crédits` : `${creditCost} cr • bientôt`}</span>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <aside className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#09111f]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <h2 className="text-lg font-black text-white">Réglages Vidéo</h2>
                <p className="text-xs text-gray-500">Moteur, durée et format uniquement.</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-white/[0.05] p-2"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <section>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Moteur</p>
                <button type="button" onClick={() => setEngineListOpen((value) => !value)} className="flex w-full items-center justify-between rounded-2xl border border-blue-400/20 bg-blue-500/[0.06] px-4 py-3 text-left">
                  <div>
                    <p className="text-sm font-black text-white">{selectedEngine.label}</p>
                    <p className="mt-1 text-[10px] text-gray-500">{requiredPlanLabel(engineKey)} • jusqu’à {selectedEngine.maxSeconds}s</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition ${engineListOpen ? 'rotate-180' : ''}`} />
                </button>

                {engineListOpen && (
                  <div className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-[#07101f] p-2">
                    {PUBLIC_ENGINE_KEYS.map((key) => {
                      const engine = VIDEO_ENGINES[key];
                      const active = key === engineKey;
                      const quote = quoteForEngine(key);
                      const available = engine.availability === 'connected';
                      const unlocked = isEngineUnlocked(key);
                      return (
                        <button type="button" key={key} onClick={() => chooseEngine(key)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${active ? 'bg-blue-500/10' : 'hover:bg-white/[0.04]'} ${!unlocked ? 'opacity-65' : ''}`}>
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${active ? 'border-blue-400/35 bg-blue-500/15' : 'border-white/10 bg-white/[0.03]'}`}>
                            {active ? <Check className="h-4 w-4 text-blue-200" /> : unlocked ? <Film className="h-4 w-4 text-gray-500" /> : <Lock className="h-4 w-4 text-amber-300" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-xs font-black text-white">{engine.label}</p>
                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${!unlocked ? 'bg-amber-500/10 text-amber-300' : available ? 'bg-emerald-500/10 text-emerald-300' : 'bg-cyan-500/10 text-cyan-300'}`}>{!unlocked ? `${requiredPlanLabel(key)} requis` : available ? (quote != null ? `${quote} cr` : 'Disponible') : 'Bientôt'}</span>
                            </div>
                            <p className="mt-1 text-[9px] text-gray-600">{engine.provider} • jusqu’à {engine.maxSeconds}s</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {!canUploadReference ? (
                  <p className="mt-2 text-[10px] leading-4 text-amber-300/80">{selectedEngine.label} : génération par prompt uniquement dans MUNGWELE.</p>
                ) : (
                  <p className="mt-2 text-[10px] leading-4 text-purple-300/70">Images de référence activées pour ce moteur.</p>
                )}
              </section>

              <section className="mt-6">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Durée</p>
                <div className="flex flex-wrap gap-2">
                  {effectiveEngine.durations.map((item) => (
                    <button type="button" key={item} onClick={() => setDuration(item)} className={`rounded-xl border px-4 py-2 text-xs font-black ${duration === item ? 'border-pink-400/35 bg-pink-500/10 text-pink-200' : 'border-white/10 text-gray-400'}`}>{item}s</button>
                  ))}
                </div>
                {effectiveEngine.availability !== 'connected' && <p className="mt-2 text-[10px] leading-4 text-amber-300/80">Bientôt disponible. Le tarif est affiché à titre de préparation et aucun crédit ne sera débité.</p>}
              </section>

              <section className="mt-6">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-gray-500">Format</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAspectRatio('9:16')} className={`rounded-xl border px-3 py-2 text-xs font-bold ${aspectRatio === '9:16' ? 'border-purple-400/35 bg-purple-500/10 text-purple-200' : 'border-white/10 text-gray-400'}`}>9:16 Mobile</button>
                  <button type="button" onClick={() => setAspectRatio('16:9')} className={`rounded-xl border px-3 py-2 text-xs font-bold ${aspectRatio === '16:9' ? 'border-purple-400/35 bg-purple-500/10 text-purple-200' : 'border-white/10 text-gray-400'}`}>16:9 Paysage</button>
                </div>
              </section>
            </div>

            <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setSettingsOpen(false)} className="w-full rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 py-3 text-sm font-black text-white">Appliquer</button>
            </div>
          </aside>
        </div>
      )}

      <DownloadOptionsModal item={downloadOpen && currentResult ? currentResult : null} onClose={() => setDownloadOpen(false)} />
    </div>
  );
};