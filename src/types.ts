export type StudioType = 'image' | 'video' | 'music';
export type NavigationTab = 'home' | 'studio-image' | 'studio-video' | 'studio-music' | 'creations' | 'subscription' | 'profile' | 'help' | 'admin';
export type GenerationStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'failed';

export interface UserProfile { id: string; name: string; email: string; avatar: string; role: 'user' | 'admin'; status: 'active' | 'blocked'; credits: number; plan: 'free' | 'creator' | 'pro'; totalGenerations: number; createdAt: string; }
export interface ImageGenerationSettings { style: 'realistic' | '3d' | 'cinematic' | 'illustration' | 'anime' | 'product' | 'logo' | 'artistic' | 'prompt-only' | 'custom'; aspectRatio: '1:1' | '9:16' | '16:9' | '4:5' | 'banner' | 'auto'; quality: 'standard' | 'hd' | 'ultra_4k' | 'studio_master' | 'high'; quantity: number; referenceImage?: string | boolean; negativePrompt?: string; guidanceScale?: number; }

export type VideoModel = 'lite' | 'fast' | 'pro';
export type VideoDuration = 4 | 6 | 8;
export type VideoResolution = '720p' | '1080p' | '4k';
export interface VideoGenerationSettings { style?: 'cinematic' | 'commercial' | 'realistic' | '3d_animation' | 'social_media' | 'music_clip' | 'prompt-only'; videoModel?: VideoModel; aspectRatio: '16:9' | '9:16'; duration: VideoDuration; enableAudio?: boolean; dialogue?: string; multiScenes?: boolean; startImage?: boolean | string; endImage?: boolean | string; cameraMotion?: 'pan' | 'zoom' | 'orbit' | 'drone' | 'static' | 'dynamic'; resolution?: VideoResolution; }

export interface MusicGenerationSettings { genre: 'afrobeat' | 'gospel' | 'rap' | 'rumba' | 'pop' | 'amapiano' | 'electronic' | 'cinematic' | 'custom'; customGenre?: string; mood: 'joyful' | 'romantic' | 'energetic' | 'sad' | 'inspiring' | 'relaxing'; voice: 'male' | 'female' | 'duet' | 'instrumental'; isInstrumental: boolean; durationSeconds: 30 | 60 | 120; lyrics?: string; bpm?: number; }
export interface GenerationRecord { id: string; userId: string; type: StudioType; title: string; prompt: string; enhancedPrompt?: string; provider: string; model: string; status: GenerationStatus; progress?: number; resultUrl: string; thumbnailUrl: string; creditsUsed: number; errorMessage?: string; settings: ImageGenerationSettings | VideoGenerationSettings | MusicGenerationSettings; createdAt: string; updatedAt: string; audioDuration?: number; lyrics?: string; }
export interface CreditTransaction { id: string; userId: string; amount: number; type: 'generation' | 'purchase' | 'refund' | 'bonus' | 'admin_adjustment'; description: string; balanceAfter: number; createdAt: string; }
export interface PlanConfig { id: 'free' | 'creator' | 'pro'; name: string; priceMonth: number; creditsMonthly: number; popular?: boolean; features: string[]; maxVideoDuration: number; veo3Access: boolean; supportLevel: string; }
export interface ApiProviderSetting { id: string; name: string; providerKey: 'gemini' | 'openai' | 'veo' | 'suno'; category: 'image' | 'video' | 'music' | 'text'; enabled: boolean; isConfigured: boolean; isDemoFallback: boolean; modelName: string; latencyAvgMs: number; creditCost: number; }
export interface AppSettings { siteName: string; slogan: string; maintenanceMode: boolean; announcementBanner: string; creditCosts: { imageStandard: number; imageHd: number; video5s: number; video10s: number; musicTrack: number; promptEnhance: number; }; }
export interface TechnicalLog { id: string; timestamp: string; type: 'info' | 'warn' | 'error' | 'success'; module: string; message: string; details?: Record<string, unknown>; userId?: string; }
export interface NotificationItem { id: string; type: 'success' | 'error' | 'info' | 'warning'; title: string; message: string; timestamp: string; read?: boolean; }
