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

// Launch supplier set:
// - Google Gemini API: Veo 3.1 Lite / Fast / Pro are connected.
// - Google Omni stays a compatibility route for projects that truly need
//   multiple visual references; it is not shown as a normal manual choice.
// - Runway/Seedance metadata stays ready for future activation, but planned
//   engines are not exposed in the client recommendation list.
export const VIDEO_ENGINES: Record<VideoEngineKey, VideoEngineProfile> = {
  'veo-lite': {
    key: 'veo-lite', label: 'Veo 3.1 Lite', provider: 'Google', availability: 'connected',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['économique', 'réseaux sociaux', 'publicité', 'image vers vidéo'], estimatedUsdPerSecond: 0.05,
  },
  'veo-fast': {
    key: 'veo-fast', label: 'Veo 3.1 Fast', provider: 'Google', availability: 'connected',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['rapide', 'réaliste', 'action', 'dialogue', 'audio natif'], estimatedUsdPerSecond: 0.10,
  },
  'veo-pro': {
    key: 'veo-pro', label: 'Veo 3.1 Pro', provider: 'Google', availability: 'connected',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['cinématique', 'premium', 'dialogue', 'audio natif'], estimatedUsdPerSecond: 0.40,
  },
  omni: {
    key: 'omni', label: 'Google Omni Références', provider: 'Google', availability: 'connected',
    maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false,
    supportsImages: true, strengths: ['références multiples', 'continuité visuelle', 'image vers vidéo'], estimatedUsdPerSecond: 0.10,
  },
  'seedance-2-mini': {
    key: 'seedance-2-mini', label: 'Seedance 2 Mini', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 15, durations: [4, 5, 6, 8, 10, 15], supportsAudioReference: true, supportsLipSync: false,
    supportsImages: true, strengths: ['économique', 'séquences longues', 'social', 'multimodal'], estimatedUsdPerSecond: 0.16,
  },
  'seedance-2-fast': {
    key: 'seedance-2-fast', label: 'Seedance 2 Fast', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 15, durations: [4, 5, 6, 8, 10, 15], supportsAudioReference: true, supportsLipSync: false,
    supportsImages: true, strengths: ['rapide', 'action', 'réseaux sociaux', 'multimodal'], estimatedUsdPerSecond: 0.29,
  },
  'seedance-2': {
    key: 'seedance-2', label: 'Seedance 2', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 15, durations: [4, 5, 6, 8, 10, 15], supportsAudioReference: true, supportsLipSync: false,
    supportsImages: true, strengths: ['cinématique', 'action', 'multi-scènes', 'jusqu’à 4K'], estimatedUsdPerSecond: 0.36,
  },
  'seedance-2-5': {
    key: 'seedance-2-5', label: 'Seedance 2.5', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 30, durations: [4, 5, 6, 8, 10, 15, 30], supportsAudioReference: true, supportsLipSync: false,
    supportsImages: true, strengths: ['10–30 secondes', 'audio et références', 'multi-scènes', '1080p'], estimatedUsdPerSecond: 0.30,
  },
  'runway-act-two': {
    key: 'runway-act-two', label: 'Runway Act-Two', provider: 'Runway Dev', availability: 'planned',
    maxSeconds: 30, durations: [5, 10, 15, 30], supportsAudioReference: true, supportsLipSync: true,
    supportsImages: true, strengths: ['clip', 'performance', 'personnage', 'lip-sync'], estimatedUsdPerSecond: 0.05,
  },
};

type VideoTypeRoute = {
  label: string;
  description: string;
  badge: string;
  // This list is deliberately short and ordered by suitability first. The
  // connected recommendation helper then sorts compatible choices by provider
  // cost, so the least expensive valid engine becomes the default.
  engines: VideoEngineKey[];
  defaultEngine: VideoEngineKey;
};

export const VIDEO_TYPE_ROUTING: Record<VideoType, VideoTypeRoute> = {
  social: {
    label: 'Reel / Réseaux sociaux', badge: 'Économique',
    description: 'TikTok, Reels, Shorts, stories et formats verticaux rapides.',
    engines: ['veo-lite', 'veo-fast'], defaultEngine: 'veo-lite',
  },
  commercial: {
    label: 'Publicité / Produit', badge: 'Business',
    description: 'Produit, marque, démonstration et campagne publicitaire.',
    engines: ['veo-lite', 'veo-fast', 'veo-pro'], defaultEngine: 'veo-lite',
  },
  realistic: {
    label: 'Réaliste / Personnes', badge: 'Réel',
    description: 'Humains, lifestyle, influenceurs et rendu naturel.',
    engines: ['veo-lite', 'veo-fast', 'veo-pro'], defaultEngine: 'veo-lite',
  },
  cinematic: {
    label: 'Cinématique / Film', badge: 'Cinéma',
    description: 'Plans cinéma, narration visuelle et rendu premium.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  action: {
    label: 'Action', badge: 'Dynamique',
    description: 'Mouvements rapides, cascades, poursuites et scènes dynamiques.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  comedy: {
    label: 'Comédie / Dialogue', badge: 'Dialogue',
    description: 'Scènes légères, personnages expressifs et dialogue.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  drama: {
    label: 'Drame', badge: 'Émotion',
    description: 'Jeu d’acteur, tension, émotions fortes et mise en scène narrative.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  romantic_series: {
    label: 'Série romantique', badge: 'Série',
    description: 'Couples, continuité de personnages, dialogues et scènes émotionnelles.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  '3d': {
    label: 'Animation 3D', badge: '3D',
    description: 'Objets, personnages et univers 3D.',
    engines: ['veo-lite', 'veo-fast', 'veo-pro'], defaultEngine: 'veo-lite',
  },
  anime: {
    label: 'Anime / Illustration', badge: 'Stylisé',
    description: 'Anime, illustration animée et stylisation.',
    engines: ['veo-lite', 'veo-fast'], defaultEngine: 'veo-lite',
  },
  talking: {
    label: 'Présentateur / Parlant', badge: 'Dialogue',
    description: 'Personnage, présentation, discours et synchronisation visuelle.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  effects: {
    label: 'Effets / Transformation', badge: 'VFX',
    description: 'Transitions, métamorphoses et effets visuels créatifs.',
    engines: ['veo-fast', 'veo-pro'], defaultEngine: 'veo-fast',
  },
  music_clip: {
    label: 'Clip musical', badge: 'Musique',
    description: 'Chanson, performance, rythme et narration musicale.',
    engines: ['runway-act-two', 'seedance-2-5'], defaultEngine: 'runway-act-two',
  },
  custom: {
    label: 'Personnalisé', badge: 'Auto',
    description: 'MUNGWELE choisit le moteur selon votre demande.',
    engines: ['veo-lite', 'veo-fast', 'veo-pro'], defaultEngine: 'veo-lite',
  },
};

export function connectedEnginesForType(type: VideoType) {
  return VIDEO_TYPE_ROUTING[type].engines
    .map((key) => VIDEO_ENGINES[key])
    .filter((engine) => engine.availability === 'connected');
}

export function recommendedConnectedEngines(type: VideoType, limit = 3) {
  return connectedEnginesForType(type)
    .sort((a, b) => (a.estimatedUsdPerSecond ?? Number.POSITIVE_INFINITY) - (b.estimatedUsdPerSecond ?? Number.POSITIVE_INFINITY))
    .slice(0, Math.max(1, Math.min(3, limit)));
}

export function defaultConnectedEngine(type: VideoType) {
  const recommended = recommendedConnectedEngines(type, 3);
  return recommended[0] || VIDEO_ENGINES['veo-fast'];
}
