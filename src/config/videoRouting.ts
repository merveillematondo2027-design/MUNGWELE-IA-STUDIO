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

export const VIDEO_ENGINES: Record<VideoEngineKey, VideoEngineProfile> = {
  'veo-lite': { key: 'veo-lite', label: 'Veo 3.1 Lite', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: false, strengths: ['économique', 'publicité', 'réseaux sociaux'], estimatedUsdPerSecond: 0.05 },
  'veo-fast': { key: 'veo-fast', label: 'Veo 3.1 Fast', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: false, strengths: ['rapide', 'réaliste', 'publicité'], estimatedUsdPerSecond: 0.10 },
  'veo-pro': { key: 'veo-pro', label: 'Veo 3.1 Pro', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: false, strengths: ['cinématique', 'premium', 'dialogue'], estimatedUsdPerSecond: 0.40 },
  omni: { key: 'omni', label: 'Gemini Omni Flash', provider: 'Google', availability: 'connected', maxSeconds: 8, durations: [4, 6, 8], supportsAudioReference: false, supportsLipSync: false, supportsImages: true, strengths: ['références multiples', 'image vers vidéo', 'édition'], estimatedUsdPerSecond: 0.10 },
  'runway-gen45': { key: 'runway-gen45', label: 'Runway Gen-4.5', provider: 'Runway', availability: 'planned', maxSeconds: 10, durations: [5, 10], supportsAudioReference: false, supportsLipSync: false, supportsImages: true, strengths: ['cinématique', 'mouvements caméra', 'effets'], estimatedUsdPerSecond: 0.12 },
  'minimax-h3': { key: 'minimax-h3', label: 'MiniMax H3', provider: 'MiniMax', availability: 'planned', maxSeconds: 15, durations: [5, 10, 15], supportsAudioReference: true, supportsLipSync: false, supportsImages: true, strengths: ['action', 'audio référence', 'clip musical', 'multimodal'], estimatedUsdPerSecond: 0.15 },
  'kling-v3-pro': { key: 'kling-v3-pro', label: 'Kling V3 Pro', provider: 'Kling', availability: 'planned', maxSeconds: 15, durations: [5, 10, 15], supportsAudioReference: true, supportsLipSync: true, supportsImages: true, strengths: ['personnage', 'lip-sync', 'réalisme humain', 'performance'], estimatedUsdPerSecond: 0.168 },
  'seedance-25': { key: 'seedance-25', label: 'Seedance 2.5', provider: 'ByteDance', availability: 'planned', maxSeconds: 30, durations: [5, 10, 15, 30], supportsAudioReference: true, supportsLipSync: false, supportsImages: true, strengths: ['séquences longues', 'action', 'animation', 'multi-scènes'], estimatedUsdPerSecond: 0.10 },
};

export const VIDEO_TYPE_ROUTING: Record<VideoType, { label: string; description: string; engines: VideoEngineKey[]; defaultEngine: VideoEngineKey }> = {
  cinematic: { label: 'Cinématique / Film', description: 'Plans cinéma, narration visuelle et rendu premium.', engines: ['veo-pro', 'runway-gen45', 'seedance-25'], defaultEngine: 'veo-pro' },
  action: { label: 'Action', description: 'Mouvements rapides, cascades, scènes dynamiques.', engines: ['minimax-h3', 'seedance-25', 'veo-pro'], defaultEngine: 'veo-pro' },
  commercial: { label: 'Publicité / Produit', description: 'Produit, marque, démonstration et campagne.', engines: ['veo-fast', 'veo-pro', 'runway-gen45'], defaultEngine: 'veo-fast' },
  realistic: { label: 'Réaliste / Personnes', description: 'Humains, lifestyle et rendu naturel.', engines: ['veo-pro', 'kling-v3-pro', 'veo-fast'], defaultEngine: 'veo-pro' },
  comedy: { label: 'Comédie / Dialogue', description: 'Scènes légères, personnages et dialogue.', engines: ['veo-pro', 'kling-v3-pro'], defaultEngine: 'veo-pro' },
  '3d': { label: 'Animation 3D', description: 'Objets, personnages et univers 3D.', engines: ['seedance-25', 'runway-gen45', 'veo-pro'], defaultEngine: 'veo-pro' },
  anime: { label: 'Anime / Illustration', description: 'Anime, illustration animée et stylisation.', engines: ['seedance-25', 'runway-gen45', 'veo-fast'], defaultEngine: 'veo-fast' },
  social: { label: 'Reel / Réseaux sociaux', description: 'Formats courts, rapides et verticaux.', engines: ['veo-lite', 'veo-fast', 'seedance-25'], defaultEngine: 'veo-lite' },
  talking: { label: 'Présentateur / Parlant', description: 'Personnage, présentation et synchronisation labiale.', engines: ['kling-v3-pro', 'veo-pro'], defaultEngine: 'veo-pro' },
  effects: { label: 'Effets / Transformation', description: 'Transitions, métamorphoses et VFX créatifs.', engines: ['runway-gen45', 'minimax-h3', 'veo-pro'], defaultEngine: 'veo-pro' },
  music_clip: { label: 'Clip musical', description: 'Chanson, performance, rythme et narration musicale.', engines: ['minimax-h3', 'kling-v3-pro', 'seedance-25'], defaultEngine: 'minimax-h3' },
  custom: { label: 'Personnalisé', description: 'MUNGWELE choisit le moteur selon votre demande.', engines: ['veo-fast', 'veo-pro', 'omni', 'runway-gen45', 'minimax-h3', 'kling-v3-pro', 'seedance-25'], defaultEngine: 'veo-fast' },
};

export function connectedEnginesForType(type: VideoType) {
  return VIDEO_TYPE_ROUTING[type].engines.map((key) => VIDEO_ENGINES[key]).filter((engine) => engine.availability === 'connected');
}

export function defaultConnectedEngine(type: VideoType) {
  const configured = connectedEnginesForType(type);
  return configured[0] || VIDEO_ENGINES['veo-fast'];
}
