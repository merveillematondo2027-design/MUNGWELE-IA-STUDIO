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

// Launch supplier set is intentionally small:
// - Google Gemini API: Veo 3.1 Lite / Fast / Standard.
// - Runway Dev: Seedance 2 family and Seedance 2.5.
// - Runway Act-Two is reserved for the dedicated Clips studio.
// Gemini Omni remains only as a compatibility engine for the already-working
// multi-reference flow and is not promoted as an additional supplier.
export const VIDEO_ENGINES: Record<VideoEngineKey, VideoEngineProfile> = {
  'veo-lite': { key: 'veo-lite', label: 'Veo 3.1 Lite', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: true, strengths: ['économique', 'publicité', 'réseaux sociaux'], estimatedUsdPerSecond: 0.05 },
  'veo-fast': { key: 'veo-fast', label: 'Veo 3.1 Fast', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: true, strengths: ['rapide', 'réaliste', 'publicité', 'audio natif'], estimatedUsdPerSecond: 0.10 },
  'veo-pro': { key: 'veo-pro', label: 'Veo 3.1 Pro', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: true, strengths: ['cinématique', 'premium', 'dialogue', 'audio natif'], estimatedUsdPerSecond: 0.40 },
  omni: { key: 'omni', label: 'Google Omni Références', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: true, strengths: ['compatibilité références multiples', 'image vers vidéo'], estimatedUsdPerSecond: 0.10 },
  'seedance-2-mini': { key: 'seedance-2-mini', label: 'Seedance 2 Mini', provider: 'Runway Dev', availability: 'planned', maxSeconds: 15, durations: [4, 5, 6, 8, 10, 15], supportsAudioReference: true, supportsLipSync: false, supportsImages: true, strengths: ['économique', 'séquences longues', 'social', 'multimodal'], estimatedUsdPerSecond: 0.16 },
  'seedance-2-fast': { key: 'seedance-2-fast', label: 'Seedance 2 Fast', provider: 'Runway Dev', availability: 'planned', maxSeconds: 15, durations: [4, 5, 6, 8, 10, 15], supportsAudioReference: true, supportsLipSync: false, supportsImages: true, strengths: ['rapide', 'action', 'réseaux sociaux', 'multimodal'], estimatedUsdPerSecond: 0.29 },
  'seedance-2': { key: 'seedance-2', label: 'Seedance 2', provider: 'Runway Dev', availability: 'planned', maxSeconds: 15, durations: [4, 5, 6, 8, 10, 15], supportsAudioReference: true, supportsLipSync: false, supportsImages: true, strengths: ['cinématique', 'action', 'multi-scènes', 'jusqu’à 4K'], estimatedUsdPerSecond: 0.36 },
  'seedance-2-5': { key: 'seedance-2-5', label: 'Seedance 2.5', provider: 'Runway Dev', availability: 'planned', maxSeconds: 30, durations: [4, 5, 6, 8, 10, 15, 30], supportsAudioReference: true, supportsLipSync: false, supportsImages: true, strengths: ['10–30 secondes', 'audio et références', 'multi-scènes', '1080p'], estimatedUsdPerSecond: 0.30 },
  'runway-act-two': { key: 'runway-act-two', label: 'Runway Act-Two', provider: 'Runway Dev', availability: 'planned', maxSeconds: 30, durations: [5, 10, 15, 30], supportsAudioReference: true, supportsLipSync: true, supportsImages: true, strengths: ['clip', 'performance', 'personnage', 'lip-sync'], estimatedUsdPerSecond: 0.05 },
};

export const VIDEO_TYPE_ROUTING: Record<VideoType, { label: string; description: string; badge: string; engines: VideoEngineKey[]; defaultEngine: VideoEngineKey }> = {
  social: { label: 'Reel / Réseaux sociaux', badge: 'Recommandé', description: 'TikTok, Reels, Shorts, stories et formats verticaux rapides.', engines: ['veo-lite', 'veo-fast', 'seedance-2-mini', 'seedance-2-fast', 'seedance-2-5'], defaultEngine: 'veo-lite' },
  commercial: { label: 'Publicité / Produit', badge: 'Business', description: 'Produit, marque, démonstration et campagne publicitaire.', engines: ['veo-fast', 'veo-pro', 'seedance-2-fast', 'seedance-2-5'], defaultEngine: 'veo-fast' },
  realistic: { label: 'Réaliste / Personnes', badge: 'Réel', description: 'Humains, lifestyle, influenceurs et rendu naturel.', engines: ['veo-pro', 'veo-fast', 'seedance-2-5'], defaultEngine: 'veo-pro' },
  cinematic: { label: 'Cinématique / Film', badge: 'Cinéma', description: 'Plans cinéma, narration visuelle et rendu premium.', engines: ['veo-pro', 'seedance-2', 'seedance-2-5'], defaultEngine: 'veo-pro' },
  action: { label: 'Action', badge: 'Dynamique', description: 'Mouvements rapides, cascades, poursuites et scènes dynamiques.', engines: ['seedance-2-fast', 'seedance-2-5', 'veo-pro'], defaultEngine: 'veo-pro' },
  comedy: { label: 'Comédie / Dialogue', badge: 'Dialogue', description: 'Scènes légères, personnages expressifs et dialogue.', engines: ['veo-pro', 'seedance-2-5'], defaultEngine: 'veo-pro' },
  drama: { label: 'Drame', badge: 'Émotion', description: 'Jeu d’acteur, tension, émotions fortes et mise en scène narrative.', engines: ['veo-pro', 'seedance-2-5', 'seedance-2'], defaultEngine: 'veo-pro' },
  romantic_series: { label: 'Série romantique', badge: 'Série', description: 'Couples, continuité de personnages, dialogues et scènes émotionnelles.', engines: ['seedance-2-5', 'veo-pro', 'seedance-2'], defaultEngine: 'veo-pro' },
  '3d': { label: 'Animation 3D', badge: '3D', description: 'Objets, personnages et univers 3D.', engines: ['seedance-2', 'seedance-2-5', 'veo-pro'], defaultEngine: 'veo-pro' },
  anime: { label: 'Anime / Illustration', badge: 'Stylisé', description: 'Anime, illustration animée et stylisation.', engines: ['seedance-2-mini', 'seedance-2-5', 'veo-fast'], defaultEngine: 'veo-fast' },
  talking: { label: 'Présentateur / Parlant', badge: 'Dialogue', description: 'Personnage, présentation, discours et synchronisation visuelle.', engines: ['veo-pro', 'seedance-2-5'], defaultEngine: 'veo-pro' },
  effects: { label: 'Effets / Transformation', badge: 'VFX', description: 'Transitions, métamorphoses et effets visuels créatifs.', engines: ['seedance-2', 'seedance-2-5', 'veo-pro'], defaultEngine: 'veo-pro' },
  music_clip: { label: 'Clip musical', badge: 'Musique', description: 'Chanson, performance, rythme et narration musicale.', engines: ['runway-act-two', 'seedance-2-5'], defaultEngine: 'runway-act-two' },
  custom: { label: 'Personnalisé', badge: 'Auto', description: 'MUNGWELE choisit le moteur selon votre demande.', engines: ['veo-fast', 'veo-pro', 'veo-lite', 'seedance-2-mini', 'seedance-2-fast', 'seedance-2', 'seedance-2-5'], defaultEngine: 'veo-fast' },
};

export function connectedEnginesForType(type: VideoType) {
  return VIDEO_TYPE_ROUTING[type].engines.map((key) => VIDEO_ENGINES[key]).filter((engine) => engine.availability === 'connected');
}

export function defaultConnectedEngine(type: VideoType) {
  const configured = connectedEnginesForType(type);
  return configured[0] || VIDEO_ENGINES['veo-fast'];
}
