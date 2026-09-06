import express from 'express';
import path from 'path';
import { createServer as createHttpServer } from 'node:http';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateVideo, type VideoModel as VeoVideoModel, type VeoAspectRatio, type VideoDuration } from './server/veo';
import { generateOmniVideo } from './server/omni';
import { createElevenMusicPlan, generateElevenMusicFromPlan, type ElevenMusicPlan } from './server/elevenMusic';
import {
  CLIP_LAUNCH_EXAMPLES,
  PRICING_VERSION,
  SEEDANCE_LAUNCH_EXAMPLES,
  VIDEO_CREDIT_COSTS,
  assertImageMonetizationSafe,
  assertMonetizationSafe,
  assertMusicMonetizationSafe,
  clipCreditsForDurationSeconds,
  imageCreditsForRequest,
  musicCreditsForDurationMs,
  seedanceCreditsForRequest,
  type MonetizedVideoModel,
} from './server/pricing';

dotenv.config();

const _TEMPORARY_AI_STUDIO_TRIGGER = process.env.GEMINI_API_KEY;

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/generated', express.static(path.join(process.cwd(), 'generated')));

let ai: GoogleGenAI | null = null;
function getAI() {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'mungwele-ia-studio' } } });
  }
  return ai;
}

const now = () => new Date().toISOString();
let generations: any[] = [];
const technicalLogs: any[] = [];
const musicConfigured = () => !!(process.env.ELEVENLABS_API_KEY || process.env.MUSIC_PROVIDER_API_KEY);
const runwayConfigured = () => !!(process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET);
const musicQuotes = new Map<string, { description: string; plan: ElevenMusicPlan; credits: number; providerCostUsd: number; expiresAt: number }>();

const VIDEO_MODELS: Record<MonetizedVideoModel, { name: string; model: string; allowed: VideoDuration[]; usdPerSecond: number }> = {
  omni: { name: 'Google Omni Références', model: 'gemini-omni-1.1-flash', allowed: [4, 6, 8], usdPerSecond: 0.10 },
  lite: { name: 'Veo 3.1 Lite', model: 'veo-3.1-lite-generate-preview', allowed: [4, 6, 8], usdPerSecond: 0.05 },
  fast: { name: 'Veo 3.1 Fast', model: 'veo-3.1-fast-generate-preview', allowed: [4, 6, 8], usdPerSecond: 0.10 },
  pro: { name: 'Veo 3.1 Pro', model: 'veo-3.1-generate-preview', allowed: [4, 6, 8], usdPerSecond: 0.40 },
};

const imageBaseCredits = imageCreditsForRequest(0).credits;
const musicMinuteCredits = musicCreditsForDurationMs(60000).credits;

let appSettings = {
  pricingVersion: PRICING_VERSION,
  siteName: 'MUNGWELE IA STUDIO',
  slogan: 'Imaginez. Générez. Créez sans limites.',
  maintenanceMode: false,
  announcementBanner: 'MUNGWELE IA STUDIO — Image, Vidéo et Musique par prompt.',
  creditCosts: {
    imageStandard: imageBaseCredits,
    imageHd: imageBaseCredits,
    video5s: VIDEO_CREDIT_COSTS.lite[4],
    video10s: VIDEO_CREDIT_COSTS.fast[8],
    musicTrack: musicMinuteCredits,
    promptEnhance: 0,
  },
};

let apiProviders: any[] = [
  { id: 'prov-openai-image', name: 'OpenAI GPT-Image-2', providerKey: 'openai', category: 'image', enabled: true, isConfigured: !!process.env.OPENAI_API_KEY, isDemoFallback: false, modelName: 'gpt-image-2', latencyAvgMs: 0, creditCost: imageBaseCredits },
  { id: 'prov-video-lite', name: 'Veo 3.1 Lite', providerKey: 'veo', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.lite.model, latencyAvgMs: 0, creditCost: VIDEO_CREDIT_COSTS.lite[4] },
  { id: 'prov-video-fast', name: 'Veo 3.1 Fast', providerKey: 'veo', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.fast.model, latencyAvgMs: 0, creditCost: VIDEO_CREDIT_COSTS.fast[4] },
  { id: 'prov-video-pro', name: 'Veo 3.1 Pro', providerKey: 'veo', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.pro.model, latencyAvgMs: 0, creditCost: VIDEO_CREDIT_COSTS.pro[4] },
  { id: 'prov-video-omni', name: 'Google Omni Références', providerKey: 'gemini', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.omni.model, latencyAvgMs: 0, creditCost: VIDEO_CREDIT_COSTS.omni[4] },
  { id: 'prov-seedance-mini', name: 'Seedance 2 Mini', providerKey: 'runway', category: 'video', enabled: false, isConfigured: runwayConfigured(), isDemoFallback: false, modelName: 'seedance2_mini', latencyAvgMs: 0, creditCost: SEEDANCE_LAUNCH_EXAMPLES.mini720[10] },
  { id: 'prov-seedance-fast', name: 'Seedance 2 Fast', providerKey: 'runway', category: 'video', enabled: false, isConfigured: runwayConfigured(), isDemoFallback: false, modelName: 'seedance2_fast', latencyAvgMs: 0, creditCost: SEEDANCE_LAUNCH_EXAMPLES.fast720[10] },
  { id: 'prov-seedance-2', name: 'Seedance 2', providerKey: 'runway', category: 'video', enabled: false, isConfigured: runwayConfigured(), isDemoFallback: false, modelName: 'seedance2', latencyAvgMs: 0, creditCost: SEEDANCE_LAUNCH_EXAMPLES.standard720[10] },
  { id: 'prov-seedance-25', name: 'Seedance 2.5', providerKey: 'runway', category: 'video', enabled: false, isConfigured: runwayConfigured(), isDemoFallback: false, modelName: 'seedance2_5', latencyAvgMs: 0, creditCost: SEEDANCE_LAUNCH_EXAMPLES.seedance25_720[10] },
  { id: 'prov-runway-act-two', name: 'Runway Act-Two', providerKey: 'runway', category: 'clips', enabled: false, isConfigured: runwayConfigured(), isDemoFallback: false, modelName: 'act_two', latencyAvgMs: 0, creditCost: CLIP_LAUNCH_EXAMPLES[10] },
  { id: 'prov-eleven-music', name: 'ElevenLabs Music', providerKey: 'elevenlabs', category: 'music', enabled: true, isConfigured: musicConfigured(), isDemoFallback: false, modelName: 'music_v2', latencyAvgMs: 0, creditCost: musicMinuteCredits },
  { id: 'prov-gemini-assistant', name: 'Gemini Prompt Assistant', providerKey: 'gemini', category: 'text', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: 'gemini-3.7-flash', latencyAvgMs: 0, creditCost: 0 },
];

function addLog(type: string, module: string, message: string) {
  technicalLogs.unshift({ id: `log-${Date.now()}-${Math.random()}`, timestamp: now(), type, module, message });
  if (technicalLogs.length > 100) technicalLogs.length = 100;
}

function quotaError(error: any) {
  const message = String(error?.message || error || '').toLowerCase();
  return error?.status === 429 || error?.code === 429 || error?.status === 'RESOURCE_EXHAUSTED' || message.includes('quota') || message.includes('rate limit') || message.includes('429');
}

function dataUrlToBinary(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;
  return { mimeType: match[1], bytes: Buffer.from(match[2], 'base64') };
}

async function openAIImage(prompt: string, referenceImages: string[] = []) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY absente.'), { status: 503 });

  if (referenceImages.length) {
    const binaries = referenceImages.map(dataUrlToBinary);
    if (binaries.some((item) => !item)) throw Object.assign(new Error("Une image de référence est invalide."), { status: 400 });
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', prompt);
    form.append('quality', 'medium');
    form.append('size', '1024x1024');
    binaries.forEach((binary, index) => {
      if (!binary) return;
      form.append('image[]', new Blob([binary.bytes], { type: binary.mimeType }), `reference-${index + 1}.png`);
    });
    const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload?.error?.message || `OpenAI image error ${response.status}`), { status: response.status });
    if (!payload?.data?.[0]?.b64_json) throw new Error("OpenAI n'a retourné aucune image modifiée.");
    return `data:image/png;base64,${payload.data[0].b64_json}`;
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, quality: 'medium', size: '1024x1024' }),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.message || `OpenAI image error ${response.status}`), { status: response.status });
  if (!payload?.data?.[0]?.b64_json) throw new Error("OpenAI n'a retourné aucune image.");
  return `data:image/png;base64,${payload.data[0].b64_json}`;
}

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  app: 'MUNGWELE IA STUDIO',
  pricingVersion: PRICING_VERSION,
  openAIImageConfigured: !!process.env.OPENAI_API_KEY,
  geminiConfigured: !!process.env.GEMINI_API_KEY,
  runwayConfigured: runwayConfigured(),
  elevenMusicConfigured: musicConfigured(),
  videoModels: Object.keys(VIDEO_MODELS),
  timestamp: now(),
}));

app.get('/api/settings', (_req, res) => {
  apiProviders = apiProviders.map((p) => {
    const configured = p.providerKey === 'openai'
      ? !!process.env.OPENAI_API_KEY
      : p.providerKey === 'runway'
        ? runwayConfigured()
        : p.providerKey === 'elevenlabs'
          ? musicConfigured()
          : p.providerKey === 'veo' || p.providerKey === 'gemini'
            ? !!process.env.GEMINI_API_KEY
            : p.isConfigured;
    return { ...p, isConfigured: configured };
  });
  res.json({
    settings: appSettings,
    providers: apiProviders,
    videoModels: VIDEO_MODELS,
    videoCreditCosts: VIDEO_CREDIT_COSTS,
    seedanceCreditExamples: SEEDANCE_LAUNCH_EXAMPLES,
    clipCreditExamples: CLIP_LAUNCH_EXAMPLES,
  });
});

app.post('/api/pricing/seedance', (req, res) => {
  try {
    const model = String(req.body?.model || 'seedance2_5') as 'seedance2_mini' | 'seedance2_fast' | 'seedance2' | 'seedance2_5';
    const resolution = String(req.body?.resolution || '720p') as '480p' | '720p' | '1080p' | '4k';
    const durationSeconds = Number(req.body?.durationSeconds || 10);
    const inputVideoSeconds = Number(req.body?.inputVideoSeconds || 0);
    const quote = seedanceCreditsForRequest(model, durationSeconds, { resolution, inputVideoSeconds });
    return res.json({ supplier: 'Runway Dev', model, ...quote, markupPercent: 33.33 });
  } catch (error: any) {
    return res.status(400).json({ error: String(error?.message || 'Devis Seedance invalide.') });
  }
});

app.post('/api/pricing/clips', (req, res) => {
  const quote = clipCreditsForDurationSeconds(Number(req.body?.durationSeconds || 15));
  return res.json({ supplier: 'Runway Dev', model: 'act_two', ...quote, markupPercent: 33.33 });
});

app.post('/api/ai/enhance-prompt', async (req, res) => {
  const { prompt, type = 'image' } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Le prompt est requis.' });
  const client = getAI();
  if (!client) return res.json({ enhancedPrompt: prompt, tags: [], explanation: 'Prompt conservé tel quel.' });
  try {
    const response = await client.models.generateContent({ model: 'gemini-3.7-flash', contents: `Réécris ce prompt pour une génération ${type} professionnelle sans changer l'intention. Prompt: ${prompt}`, config: { temperature: 0.35 } });
    return res.json({ enhancedPrompt: response.text || prompt, tags: [], explanation: 'Prompt détaillé sans modifier l’intention.' });
  } catch { return res.json({ enhancedPrompt: prompt, tags: [], explanation: 'Prompt conservé tel quel.' }); }
});

app.post('/api/ai/generate-lyrics', async (req, res) => {
  const { topic, genre, mood, isInstrumental } = req.body || {};
  if (isInstrumental) return res.json({ lyrics: '[Instrumental]' });
  const client = getAI();
  if (!client) return res.status(503).json({ error: "Gemini n'est pas configuré." });
  try {
    const response = await client.models.generateContent({ model: 'gemini-3.7-flash', contents: `Écris des paroles originales en français. Genre: ${genre || 'Afrobeat'}. Ambiance: ${mood || 'énergique'}. Thème: ${topic || 'créativité'}.` });
    return res.json({ lyrics: response.text || '' });
  } catch (error: any) { return res.status(quotaError(error) ? 429 : 500).json({ error: quotaError(error) ? 'Quota Gemini atteint.' : 'Erreur paroles.' }); }
});

app.post('/api/generate/image', async (req, res) => {
  const { prompt, enhancedPrompt, referenceImage, referenceImages, userId } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Le prompt image est requis.' });
  const finalPrompt = String(enhancedPrompt || prompt).trim();
  const refs = Array.isArray(referenceImages)
    ? referenceImages.filter((item: unknown): item is string => typeof item === 'string' && item.startsWith('data:image/')).slice(0, 8)
    : typeof referenceImage === 'string' && referenceImage.startsWith('data:image/')
      ? [referenceImage]
      : [];
  const providerPrompt = refs.length
    ? `MODIFICATION STRICTE. Utilise toutes les images fournies comme références. Préserve les identités, objets, styles ou éléments demandés et applique uniquement cette instruction : ${finalPrompt}`
    : `Crée une image en suivant précisément cette demande, sans ajouter d'éléments non demandés : ${finalPrompt}`;
  const imagePricing = imageCreditsForRequest(refs.length);
  try {
    assertImageMonetizationSafe(refs.length, imagePricing.credits);
    const imageUrl = await openAIImage(providerPrompt, refs);
    const generation = {
      id: `gen-img-${Date.now()}`,
      userId: userId || 'usr-current',
      type: 'image',
      title: prompt.slice(0, 60),
      prompt,
      enhancedPrompt: finalPrompt,
      provider: 'OpenAI',
      model: 'gpt-image-2',
      status: 'completed',
      progress: 100,
      resultUrl: imageUrl,
      thumbnailUrl: imageUrl,
      creditsUsed: imagePricing.credits,
      isPublic: false,
      settings: { style: 'prompt-only', aspectRatio: '1:1', quality: 'standard', quantity: 1, referenceImage: Boolean(refs.length), referenceImages: refs.length ? refs : undefined },
      createdAt: now(),
      updatedAt: now(),
    };
    generations.unshift(generation);
    addLog('success', 'Studio Image', refs.length ? `Image modifiée avec ${refs.length} référence(s) OpenAI pour ${imagePricing.credits} crédits.` : `Image générée avec OpenAI pour ${imagePricing.credits} crédits.`);
    return res.json({ success: true, generation, images: [imageUrl] });
  } catch (error: any) {
    addLog('error', 'Studio Image', String(error?.message || error));
    const status = Number(error?.status || 500);
    return res.status(status === 400 || status === 401 || status === 403 || status === 429 || status === 503 ? status : 500).json({ error: quotaError(error) ? 'Quota ou limite OpenAI Image atteint.' : String(error?.message || 'La génération OpenAI Image a échoué.') });
  }
});

app.post('/api/generate/video', async (req, res) => {
  const { prompt, model = 'fast', aspectRatio = '16:9', duration = 8, startImage, endImage, referenceImages, userId } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Le prompt vidéo est requis.' });
  const client = getAI();
  if (!client) return res.status(503).json({ error: 'La génération vidéo nécessite GEMINI_API_KEY.', code: 'VIDEO_NOT_CONFIGURED' });

  const safeModel: MonetizedVideoModel = model === 'omni' || model === 'lite' || model === 'pro' ? model : 'fast';
  const numeric = Number(duration);
  const safeDuration: VideoDuration = numeric === 4 || numeric === 6 ? numeric : 8;
  const safeAspectRatio: VeoAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
  const refs = Array.isArray(referenceImages)
    ? referenceImages.filter((item: unknown): item is string => typeof item === 'string' && item.startsWith('data:image/')).slice(0, 6)
    : [];
  if (endImage && !startImage) return res.status(400).json({ error: 'Une image de fin nécessite une image de départ.', code: 'START_IMAGE_REQUIRED' });
  if (refs.length > 0 && safeModel !== 'omni') return res.status(400).json({ error: 'Les références multiples utilisent le flux Google Références. Sélectionnez ce mode pour ce projet.', code: 'OMNI_REQUIRED_FOR_REFERENCES' });
  const effectiveDuration: VideoDuration = endImage ? 8 : safeDuration;
  const creditsUsed = VIDEO_CREDIT_COSTS[safeModel][effectiveDuration];

  try {
    assertMonetizationSafe(safeModel, effectiveDuration, creditsUsed);
    const startedAt = Date.now();
    const result = safeModel === 'omni'
      ? await generateOmniVideo({ prompt: prompt.trim(), aspectRatio: safeAspectRatio, duration: effectiveDuration, resolution: '720p', startImage: typeof startImage === 'string' ? startImage : null, endImage: typeof endImage === 'string' ? endImage : null, referenceImages: refs })
      : await generateVideo(client, { model: safeModel as VeoVideoModel, prompt: prompt.trim(), aspectRatio: safeAspectRatio, duration: effectiveDuration, startImage: typeof startImage === 'string' ? startImage : null, endImage: typeof endImage === 'string' ? endImage : null });

    const generation = { id: `gen-video-${Date.now()}`, userId: userId || 'usr-current', type: 'video', title: prompt.trim().slice(0, 60), prompt: prompt.trim(), enhancedPrompt: prompt.trim(), provider: 'Google', model: result.model, status: 'completed', progress: 100, resultUrl: result.resultUrl, thumbnailUrl: '', creditsUsed, isPublic: false, settings: { style: 'prompt-only', videoModel: safeModel, aspectRatio: safeAspectRatio, duration: result.duration, enableAudio: true, startImage: Boolean(startImage), endImage: Boolean(endImage), referenceImages: refs.length ? refs : undefined, resolution: '720p' }, createdAt: now(), updatedAt: now() };
    generations.unshift(generation);
    addLog('success', 'Studio Vidéo', `${VIDEO_MODELS[safeModel].name} a généré ${result.duration}s en ${Math.round((Date.now() - startedAt) / 1000)}s.`);
    return res.json({ success: true, generation });
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const message = String(error?.message || 'Erreur vidéo inconnue.');
    addLog('error', 'Studio Vidéo', message);
    return res.status(status === 400 ? 400 : status === 401 || status === 403 ? status : quotaError(error) ? 429 : status === 504 ? 504 : status === 503 ? 503 : 500).json({ error: quotaError(error) ? 'Quota ou limite vidéo Google atteinte. Vérifiez le solde et les limites Gemini API.' : message, code: error?.code || 'VIDEO_GENERATION_FAILED' });
  }
});

app.post('/api/music/quote', async (req, res) => {
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  if (!description) return res.status(400).json({ error: 'La description musicale est requise.' });
  if (!musicConfigured()) return res.status(503).json({ error: "ElevenLabs Music n'est pas encore connecté côté serveur.", code: 'ELEVEN_MUSIC_NOT_CONFIGURED' });

  try {
    const plan = await createElevenMusicPlan(description);
    const pricing = musicCreditsForDurationMs(plan.durationMs);
    assertMusicMonetizationSafe(plan.durationMs, pricing.credits);
    const quoteId = `music-quote-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    musicQuotes.set(quoteId, { description, plan, credits: pricing.credits, providerCostUsd: pricing.providerCostUsd, expiresAt: Date.now() + 10 * 60 * 1000 });
    return res.json({
      quoteId,
      creditCost: pricing.credits,
      estimatedDurationSeconds: pricing.durationSeconds,
      markupPercent: 50,
      expiresInSeconds: 600,
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const message = String(error?.message || 'Impossible de calculer le coût de cette musique.');
    addLog('error', 'Studio Musique', `Devis: ${message}`);
    return res.status(status === 400 || status === 401 || status === 402 || status === 403 || status === 422 || status === 429 || status === 503 ? status : 500).json({ error: message, code: error?.code || 'ELEVEN_MUSIC_QUOTE_FAILED' });
  }
});

app.post('/api/generate/music', async (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim().slice(0, 120) : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
  const quoteId = typeof req.body?.quoteId === 'string' ? req.body.quoteId : '';
  const userId = req.body?.userId;
  if (!title) return res.status(400).json({ error: 'Le titre du morceau est requis.' });
  if (!description) return res.status(400).json({ error: 'La description musicale est requise.' });
  if (!quoteId) return res.status(400).json({ error: 'Le devis musique est requis.', code: 'MUSIC_QUOTE_REQUIRED' });
  if (!musicConfigured()) return res.status(503).json({ error: "ElevenLabs Music n'est pas encore connecté côté serveur.", code: 'ELEVEN_MUSIC_NOT_CONFIGURED' });

  const quote = musicQuotes.get(quoteId);
  if (!quote || quote.expiresAt < Date.now() || quote.description !== description) {
    musicQuotes.delete(quoteId);
    return res.status(400).json({ error: 'Le devis musique a expiré ou ne correspond plus à la description. Relancez la génération.', code: 'MUSIC_QUOTE_INVALID' });
  }

  const creditsUsed = quote.credits;
  assertMusicMonetizationSafe(quote.plan.durationMs, creditsUsed);
  musicQuotes.delete(quoteId);

  try {
    const startedAt = Date.now();
    const result = await generateElevenMusicFromPlan(quote.plan);
    const generation = {
      id: `gen-music-${Date.now()}`,
      userId: userId || 'usr-current',
      type: 'music',
      title,
      prompt: description,
      enhancedPrompt: description,
      provider: result.provider,
      model: result.model,
      status: 'completed',
      progress: 100,
      resultUrl: result.resultUrl,
      thumbnailUrl: '',
      creditsUsed,
      isPublic: false,
      audioDuration: result.durationSeconds,
      settings: {
        genre: 'custom',
        mood: 'inspiring',
        voice: quote.plan.instrumental ? 'instrumental' : 'duet',
        isInstrumental: quote.plan.instrumental,
        durationSeconds: result.durationSeconds,
      },
      providerSongId: result.songId,
      createdAt: now(),
      updatedAt: now(),
    };

    generations.unshift(generation);
    const provider = apiProviders.find((p) => p.id === 'prov-eleven-music');
    if (provider) provider.latencyAvgMs = Date.now() - startedAt;
    addLog('success', 'Studio Musique', `Eleven Music v2 a généré ${result.durationSeconds}s pour ${creditsUsed} crédits MUNGWELE.`);
    return res.json({ success: true, generation, creditCost: creditsUsed });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    const message = String(error?.message || 'Erreur Eleven Music inconnue.');
    addLog('error', 'Studio Musique', message);
    return res.status(status === 400 || status === 401 || status === 402 || status === 403 || status === 422 || status === 429 || status === 503 ? status : 500).json({
      error: quotaError(error) ? 'Quota ou limite ElevenLabs Music atteint. Vérifiez votre abonnement et votre solde ElevenLabs.' : message,
      code: error?.code || 'ELEVEN_MUSIC_GENERATION_FAILED',
    });
  }
});

app.get('/api/generations', (_req, res) => res.json({ generations }));
app.get('/api/community', (_req, res) => {
  const published = generations
    .filter((g) => g.isPublic === true && g.status === 'completed')
    .sort((a, b) => String(b.publicAt || b.updatedAt).localeCompare(String(a.publicAt || a.updatedAt)));
  res.json({ generations: published });
});
app.post('/api/generations/:id/publish', (req, res) => {
  const generation = generations.find((g) => g.id === req.params.id);
  if (!generation) return res.status(404).json({ error: 'Création introuvable.' });
  if (!req.body?.userId || generation.userId !== req.body.userId) return res.status(403).json({ error: 'Vous ne pouvez publier que vos propres créations.' });
  const isPublic = req.body?.isPublic === true;
  generation.isPublic = isPublic;
  generation.publicAt = isPublic ? now() : undefined;
  generation.authorName = typeof req.body?.authorName === 'string' && req.body.authorName.trim() ? req.body.authorName.trim().slice(0, 80) : generation.authorName || 'Créateur MUNGWELE';
  generation.updatedAt = now();
  addLog('info', 'Communauté', isPublic ? `Publication de ${generation.id}` : `Retrait de ${generation.id}`);
  return res.json({ success: true, generation });
});
app.delete('/api/generations/:id', (req, res) => { generations = generations.filter((g) => g.id !== req.params.id); res.json({ success: true }); });
app.get('/api/admin/stats', (_req, res) => {
  const breakdown = { image: generations.filter((g) => g.type === 'image').length, video: generations.filter((g) => g.type === 'video').length, music: generations.filter((g) => g.type === 'music').length };
  res.json({ totalUsers: 0, activeUsersToday: 0, totalGenerations: generations.length, breakdown, totalCreditsConsumed: generations.reduce((sum, g) => sum + Number(g.creditsUsed || 0), 0), serverUptime: process.uptime(), activeProviders: apiProviders.filter((p) => p.enabled && p.isConfigured).length, logs: technicalLogs.slice(0, 20) });
});
app.post('/api/admin/providers/toggle', (req, res) => { const provider = apiProviders.find((p) => p.id === req.body?.providerId); if (!provider) return res.status(404).json({ error: 'Fournisseur non trouvé.' }); provider.enabled = !!req.body?.enabled; res.json({ success: true, provider }); });
app.post('/api/admin/settings', (req, res) => { const { creditCosts, announcementBanner, maintenanceMode } = req.body || {}; if (creditCosts) appSettings.creditCosts = { ...appSettings.creditCosts, ...creditCosts }; if (typeof announcementBanner === 'string') appSettings.announcementBanner = announcementBanner; if (typeof maintenanceMode === 'boolean') appSettings.maintenanceMode = maintenanceMode; res.json({ success: true, settings: appSettings }); });

async function startServer() {
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      appType: 'spa',
      server: { middlewareMode: true, hmr: { server: httpServer, protocol: 'wss', clientPort: 443, overlay: false } },
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[MUNGWELE IA STUDIO] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();