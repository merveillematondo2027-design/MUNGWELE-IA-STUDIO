import type { ExtendedVideoDuration, VideoEngineKey, VideoType } from '../types';

export type EngineAvailability = 'connected' | 'planned';

export interface VideoEngineProfile {
  key: VideoEngineKey;
  label: string;
  provider: string;
  availability: EngineAvailability;
  maxSeconds: number;
  durations: ExtendedVideoDuration[];
  supportsAudioReference: boolean;
  supportsLipSync: boolean;
  supportsImages: boolean;
  strengths: string[];
  estimatedUsdPerSecond?: number;
}

// Public MUNGWELE video hierarchy:
// - Gratuit: Veo 3.1 Lite + Veo 3.1 Fast, up to 8s.
// - Creator: Gemini Omni Fast, up to 10s.
// - Pro: MiniMax H3 Max, up to 15s.
// - Studio: Seedance 2.5, up to 30s.
// Veo 3.1 Pro is intentionally excluded from the commercial offer.
export const VIDEO_ENGINES: Record<VideoEngineKey, VideoEngineProfile> = {
  'veo-lite': {
    key: 'veo-lite', label: 'Veo 3.1 Lite', provider: 'Google', availability: 'connected',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: false, strengths: ['économique', 'réseaux sociaux', 'publicité', 'prompt vers vidéo'], estimatedUsdPerSecond: 0.05,
  },
  'veo-fast': {
    key: 'veo-fast', label: 'Veo 3.1 Fast', provider: 'Google', availability: 'connected',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['rapide', 'réaliste', 'action', 'dialogue', 'audio natif'], estimatedUsdPerSecond: 0.10,
  },
  'veo-pro': {
    key: 'veo-pro', label: 'Veo 3.1 Pro', provider: 'Google', availability: 'planned',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['retiré de l’offre commerciale MUNGWELE'], estimatedUsdPerSecond: 0.40,
  },
  omni: {
    key: 'omni', label: 'Gemini Omni Fast', provider: 'Google', availability: 'connected',
    maxSeconds: 10, durations: [4, 6, 8, 10], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['références', 'édition', 'continuité', 'jusqu’à 10 s'], estimatedUsdPerSecond: 0.10,
  },
  'seedance-2-5': {
    key: 'seedance-2-5', label: 'Seedance 2.5', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 30, durations: [4, 5, 6, 8, 10, 15, 30], supportsAudioReference: true, supportsLipSync: false,
    supportsImages: true, strengths: ['multi-scènes', 'références', 'jusqu’à 30 s', '1080p'], estimatedUsdPerSecond: 0.30,
  },
  'h3-max': {
    key: 'h3-max', label: 'MiniMax H3 Max', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 15, durations: [5, 6, 8, 10, 15], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['économique', 'texte vers vidéo', 'image vers vidéo', 'jusqu’à 15 s'], estimatedUsdPerSecond: 0.08,
  },
  'runway-act-two': {
    key: 'runway-act-two', label: 'Runway Act-Two', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 30, durations: [5, 10, 15, 30], supportsAudioReference: true, supportsLipSync: true,
    supportsImages: true, strengths: ['clip', 'performance', 'personnage', 'lip-sync'], estimatedUsdPerSecond: 0.05,
  },
};

type VideoTypeRoute = { label: string; description: string; badge: string; engines: VideoEngineKey[]; defaultEngine: VideoEngineKey; };

// Legacy routing remains available for old saved projects and internal tools,
// but only engines in the current commercial hierarchy are proposed.
export const VIDEO_TYPE_ROUTING: Record<VideoType, VideoTypeRoute> = {
  social: { label: 'Reel / Réseaux sociaux', badge: 'Économique', description: 'TikTok, Reels, Shorts, stories et formats verticaux rapides.', engines: ['veo-lite', 'veo-fast', 'h3-max'], defaultEngine: 'veo-lite' },
  commercial: { label: 'Publicité / Produit', badge: 'Business', description: 'Produit, marque, démonstration et campagne publicitaire.', engines: ['veo-lite', 'veo-fast', 'h3-max'], defaultEngine: 'veo-lite' },
  realistic: { label: 'Réaliste / Personnes', badge: 'Réel', description: 'Humains, lifestyle, influenceurs et rendu naturel.', engines: ['veo-fast', 'omni', 'h3-max'], defaultEngine: 'veo-fast' },
  cinematic: { label: 'Cinématique / Film', badge: 'Cinéma', description: 'Plans cinéma, narration visuelle et rendu premium.', engines: ['veo-fast', 'omni', 'seedance-2-5'], defaultEngine: 'veo-fast' },
  action: { label: 'Action', badge: 'Dynamique', description: 'Mouvements rapides, cascades, poursuites et scènes dynamiques.', engines: ['veo-fast', 'h3-max', 'seedance-2-5'], defaultEngine: 'veo-fast' },
  comedy: { label: 'Comédie / Dialogue', badge: 'Dialogue', description: 'Scènes légères, personnages expressifs et dialogue.', engines: ['veo-fast', 'omni', 'h3-max'], defaultEngine: 'veo-fast' },
  drama: { label: 'Drame', badge: 'Émotion', description: 'Jeu d’acteur, tension, émotions fortes et mise en scène narrative.', engines: ['veo-fast', 'omni', 'seedance-2-5'], defaultEngine: 'veo-fast' },
  romantic_series: { label: 'Série romantique', badge: 'Série', description: 'Couples, continuité de personnages, dialogues et scènes émotionnelles.', engines: ['omni', 'h3-max', 'seedance-2-5'], defaultEngine: 'omni' },
  '3d': { label: 'Animation 3D', badge: '3D', description: 'Objets, personnages et univers 3D.', engines: ['veo-lite', 'veo-fast', 'seedance-2-5'], defaultEngine: 'veo-lite' },
  anime: { label: 'Anime / Illustration', badge: 'Stylisé', description: 'Anime, illustration animée et stylisation.', engines: ['veo-lite', 'veo-fast', 'h3-max'], defaultEngine: 'veo-lite' },
  talking: { label: 'Présentateur / Parlant', badge: 'Dialogue', description: 'Personnage, présentation, discours et synchronisation visuelle.', engines: ['veo-fast', 'omni', 'h3-max'], defaultEngine: 'veo-fast' },
  effects: { label: 'Effets / Transformation', badge: 'VFX', description: 'Transitions, métamorphoses et effets visuels créatifs.', engines: ['omni', 'h3-max', 'seedance-2-5'], defaultEngine: 'omni' },
  music_clip: { label: 'Clip musical', badge: 'Musique', description: 'Chanson, performance, rythme et narration musicale.', engines: ['runway-act-two', 'seedance-2-5'], defaultEngine: 'runway-act-two' },
  custom: { label: 'Personnalisé', badge: 'Auto', description: 'MUNGWELE propose les moteurs les plus polyvalents selon votre demande.', engines: ['veo-lite', 'veo-fast', 'omni'], defaultEngine: 'veo-lite' },
};

export function enginesForType(type: VideoType) { return VIDEO_TYPE_ROUTING[type].engines.map((key) => VIDEO_ENGINES[key]); }
export function connectedEnginesForType(type: VideoType) { return enginesForType(type).filter((engine) => engine.availability === 'connected'); }
export function recommendedEnginesForType(type: VideoType, limit = 3) { return enginesForType(type).slice(0, Math.max(1, Math.min(3, limit))); }
export function defaultConnectedEngine(type: VideoType) {
  const connected = connectedEnginesForType(type).sort((a, b) => (a.estimatedUsdPerSecond ?? Number.POSITIVE_INFINITY) - (b.estimatedUsdPerSecond ?? Number.POSITIVE_INFINITY));
  return connected[0] || VIDEO_ENGINES['veo-fast'];
}
