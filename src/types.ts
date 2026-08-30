export type StudioType = 'image' | 'video' | 'clips' | 'music';
export type NavigationTab = 'home' | 'community' | 'notifications' | 'messages' | 'projects-image' | 'projects-video' | 'projects-clips' | 'projects-music' | 'studio-image' | 'studio-video' | 'studio-clips' | 'studio-music' | 'creations' | 'subscription' | 'profile' | 'help' | 'admin' | 'admin-home' | 'admin-users' | 'admin-credits' | 'admin-subscriptions' | 'admin-library' | 'admin-logs' | 'admin-usage';
export type GenerationStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'failed';
export type UserPlan = 'free' | 'creator' | 'pro' | 'studio';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  credits: number;
  plan: UserPlan;
  totalGenerations: number;
  createdAt: string;
  referralCode?: string;
  referredBy?: string;
  referralRewardsCount?: number;
}

export interface ImageGenerationSettings {
  style: 'realistic' | '3d' | 'cinematic' | 'illustration' | 'anime' | 'product' | 'logo' | 'artistic' | 'prompt-only' | 'custom';
  aspectRatio: '1:1' | '9:16' | '16:9' | '4:5' | 'banner' | 'auto';
  quality: 'standard' | 'hd' | 'ultra_4k' | 'studio_master' | 'high';
  quantity: number;
  referenceImage?: string | boolean;
  referenceImages?: string[];
  negativePrompt?: string;
  guidanceScale?: number;
}

export type VideoModel = 'omni' | 'lite' | 'fast' | 'pro';
export type VideoDuration = 4 | 6 | 8;
export type ExtendedVideoDuration = 4 | 5 | 6 | 8 | 10 | 15 | 30;
export type VideoResolution = '480p' | '720p' | '780p' | '1080p' | '1440p' | '2k' | '4k';
export type VideoType = 'social' | 'commercial' | 'realistic' | 'cinematic' | 'action' | 'comedy' | 'drama' | 'romantic_series' | '3d' | 'anime' | 'talking' | 'effects' | 'music_clip' | 'custom';
export type VideoEngineKey = 'veo-lite' | 'veo-fast' | 'veo-pro' | 'omni' | 'runway-gen45' | 'minimax-h3' | 'kling-v3-pro' | 'seedance-25';

export interface VideoGenerationSettings {
  style?: 'cinematic' | 'commercial' | 'realistic' | '3d_animation' | 'social_media' | 'music_clip' | 'prompt-only';
  videoType?: VideoType;
  engineKey?: VideoEngineKey;
  videoModel?: VideoModel;
  aspectRatio: '16:9' | '9:16';
  duration: VideoDuration | ExtendedVideoDuration;
  enableAudio?: boolean;
  dialogue?: string;
  multiScenes?: boolean;
  startImage?: boolean | string;
  endImage?: boolean | string;
  referenceImages?: string[];
  cameraMotion?: 'pan' | 'zoom' | 'orbit' | 'drone' | 'static' | 'dynamic';
  resolution?: VideoResolution;
}

export interface MusicGenerationSettings {
  genre?: 'afrobeat' | 'gospel' | 'rap' | 'rumba' | 'pop' | 'amapiano' | 'electronic' | 'cinematic' | 'custom';
  customGenre?: string;
  mood?: 'joyful' | 'romantic' | 'energetic' | 'sad' | 'inspiring' | 'relaxing';
  voice?: 'male' | 'female' | 'duet' | 'instrumental';
  isInstrumental?: boolean;
  durationSeconds?: number;
  lyrics?: string;
  bpm?: number;
}

export interface ClipGenerationSettings {
  sourceAudioUrl?: string;
  sourceMusicGenerationId?: string;
  clipMode?: 'auto' | 'performance' | 'story' | 'lyrics' | '3d' | 'social';
  aspectRatio: '16:9' | '9:16';
  referenceImages?: string[];
  enginePreference?: VideoEngineKey | 'auto';
  providerStatus?: 'ready' | 'not_configured';
}

export interface GenerationRecord {
  id: string;
  userId: string;
  type: StudioType;
  title: string;
  prompt: string;
  enhancedPrompt?: string;
  provider: string;
  model: string;
  status: GenerationStatus;
  progress?: number;
  resultUrl: string;
  thumbnailUrl: string;
  creditsUsed: number;
  errorMessage?: string;
  settings: ImageGenerationSettings | VideoGenerationSettings | MusicGenerationSettings | ClipGenerationSettings;
  createdAt: string;
  updatedAt: string;
  audioDuration?: number;
  lyrics?: string;
  isPublic?: boolean;
  publicAt?: string;
  authorName?: string;
  publicationCaption?: string;
  publicationAuthorId?: string;
  isOfficialPublication?: boolean;
  allowCommunityDownload?: boolean;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'generation' | 'purchase' | 'refund' | 'bonus' | 'admin_adjustment';
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PlanConfig {
  id: UserPlan;
  name: string;
  priceMonth: number;
  creditsMonthly: number;
  popular?: boolean;
  features: string[];
  maxVideoDuration?: number;
  veo3Access?: boolean;
  supportLevel?: string;
  maxDownloadResolution?: '480p' | '780p' | '1080p' | '4k';
}

export interface CreditPackConfig { id: string; name: string; credits: number; priceUsd: number; enabled: boolean; }

export interface ApiProviderSetting {
  id: string;
  name: string;
  providerKey: 'gemini' | 'openai' | 'veo' | 'suno' | 'elevenlabs' | 'runway' | 'minimax' | 'kling' | 'seedance';
  category: 'image' | 'video' | 'clips' | 'music' | 'text';
  enabled: boolean;
  isConfigured: boolean;
  isDemoFallback: boolean;
  modelName: string;
  latencyAvgMs: number;
  creditCost: number;
}

export interface AppSettings {
  siteName: string;
  slogan: string;
  maintenanceMode: boolean;
  announcementBanner: string;
  annualDiscountPercent: number;
  subscriptionPlans: PlanConfig[];
  creditPacks: CreditPackConfig[];
  creditCosts: { imageStandard: number; imageHd: number; video5s: number; video10s: number; musicTrack: number; promptEnhance: number; };
}

export interface TechnicalLog { id: string; timestamp: string; type: 'info' | 'warn' | 'error' | 'success'; module: string; message: string; details?: Record<string, unknown>; userId?: string; }
export interface NotificationItem { id: string; type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string; timestamp: string; read?: boolean; }
