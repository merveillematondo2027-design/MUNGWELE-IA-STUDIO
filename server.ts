import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateVideo, type VideoModel, type VeoAspectRatio, type VideoDuration } from './server/veo';

dotenv.config();

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

const VIDEO_MODELS: Record<VideoModel, { name: string; model: string; allowed: VideoDuration[]; usdPerSecond: number }> = {
  lite: { name: 'Veo 3.1 Lite', model: 'veo-3.1-lite-generate-preview', allowed: [4, 6, 8], usdPerSecond: 0.05 },
  fast: { name: 'Veo 3.1 Fast', model: 'veo-3.1-fast-generate-preview', allowed: [4, 6, 8], usdPerSecond: 0.10 },
  pro: { name: 'Veo 3.1 Pro', model: 'veo-3.1-generate-preview', allowed: [4, 6, 8], usdPerSecond: 0.40 },
};

const VIDEO_CREDIT_COSTS: Record<VideoModel, Record<VideoDuration, number>> = {
  lite: { 4: 15, 6: 23, 8: 30 },
  fast: { 4: 30, 6: 45, 8: 60 },
  pro: { 4: 120, 6: 180, 8: 240 },
};

let appSettings = {
  siteName: 'MUNGWELE IA STUDIO',
  slogan: 'Imaginez. Générez. Créez sans limites.',
  maintenanceMode: false,
  announcementBanner: 'MUNGWELE IA STUDIO — Image, Vidéo et Musique par prompt.',
  creditCosts: { imageStandard: 8, imageHd: 8, video5s: 15, video10s: 25, musicTrack: 10, promptEnhance: 0 },
};

let apiProviders: any[] = [
  { id: 'prov-openai-image', name: 'OpenAI GPT-Image', providerKey: 'openai', category: 'image', enabled: true, isConfigured: !!process.env.OPENAI_API_KEY, isDemoFallback: false, modelName: 'gpt-image-2', latencyAvgMs: 0, creditCost: 8 },
  { id: 'prov-video-lite', name: 'Veo 3.1 Lite', providerKey: 'veo', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.lite.model, latencyAvgMs: 0, creditCost: 15 },
  { id: 'prov-video-fast', name: 'Veo 3.1 Fast', providerKey: 'veo', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.fast.model, latencyAvgMs: 0, creditCost: 30 },
  { id: 'prov-video-pro', name: 'Veo 3.1 Pro', providerKey: 'veo', category: 'video', enabled: true, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false, modelName: VIDEO_MODELS.pro.model, latencyAvgMs: 0, creditCost: 120 },
  { id: 'prov-suno-music', name: 'Suno AI Music', providerKey: 'suno', category: 'music', enabled: true, isConfigured: !!process.env.MUSIC_PROVIDER_API_KEY, isDemoFallback: false, modelName: 'suno-provider', latencyAvgMs: 0, creditCost: 10 },
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

async function openAIImage(prompt: string, referenceImage?: string | null) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY absente.'), { status: 503 });

  if (referenceImage) {
    const binary = dataUrlToBinary(referenceImage);
    if (!binary) throw Object.assign(new Error("L'image de référence est invalide."), { status: 400 });
    const form = new FormData();
    form.append('model', 'gpt-image-2');
    form.append('prompt', prompt);
    form.append('image', new Blob([binary.bytes], { type: binary.mimeType }), 'reference.png');
    const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(payload?.error?.message || `OpenAI image error ${response.status}`), { status: response.status });
    if (!payload?.data?.[0]?.b64_json) throw new Error("OpenAI n'a retourné aucune image modifiée.");
    return `data:image/png;base64,${payload.data[0].b64_json}`;
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-image-2', prompt }),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(payload?.error?.message || `OpenAI image error ${response.status}`), { status: response.status });
  if (!payload?.data?.[0]?.b64_json) throw new Error("OpenAI n'a retourné aucune image.");
  return `data:image/png;base64,${payload.data[0].b64_json}`;
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'MUNGWELE IA STUDIO', openAIImageConfigured: !!process.env.OPENAI_API_KEY, geminiConfigured: !!process.env.GEMINI_API_KEY, videoModels: Object.keys(VIDEO_MODELS), timestamp: now() }));

app.get('/api/settings', (_req, res) => {
  apiProviders = apiProviders.map((p) => ({ ...p, isConfigured: p.category === 'image' ? !!process.env.OPENAI_API_KEY : p.category === 'video' || p.category === 'text' ? !!process.env.GEMINI_API_KEY : p.isConfigured }));
  res.json({ settings: appSettings, providers: apiProviders, videoModels: VIDEO_MODELS, videoCreditCosts: VIDEO_CREDIT_COSTS });
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
  const { prompt, enhancedPrompt, referenceImage, userId } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Le prompt image est requis.' });
  const finalPrompt = String(enhancedPrompt || prompt).trim();
  const hasReference = typeof referenceImage === 'string' && referenceImage.startsWith('data:image/');
  const providerPrompt = hasReference
    ? `MODIFICATION STRICTE. Utilise l'image fournie comme base, préserve tout ce qui n'est pas explicitement demandé et applique uniquement cette instruction : ${finalPrompt}`
    : `Crée une image en suivant précisément cette demande, sans ajouter d'éléments non demandés : ${finalPrompt}`;
  try {
    const imageUrl = await openAIImage(providerPrompt, hasReference ? referenceImage : null);
    const generation = { id: `gen-img-${Date.now()}`, userId: userId || 'usr-current', type: 'image', title: prompt.slice(0, 60), prompt, enhancedPrompt: finalPrompt, provider: 'OpenAI', model: 'gpt-image-2', status: 'completed', progress: 100, resultUrl: imageUrl, thumbnailUrl: imageUrl, creditsUsed: 8, settings: { style: 'prompt-only', aspectRatio: 'auto', quality: 'high', quantity: 1, referenceImage: hasReference }, createdAt: now(), updatedAt: now() };
    generations.unshift(generation);
    addLog('success', 'Studio Image', hasReference ? 'Image modifiée avec OpenAI.' : 'Image générée avec OpenAI.');
    return res.json({ success: true, generation, images: [imageUrl] });
  } catch (error: any) {
    addLog('error', 'Studio Image', String(error?.message || error));
    const status = Number(error?.status || 500);
    return res.status(status === 401 || status === 403 || status === 429 ? status : 500).json({ error: quotaError(error) ? 'Quota ou limite OpenAI Image atteint.' : String(error?.message || 'La génération OpenAI Image a échoué.') });
  }
});

app.post('/api/generate/video', async (req, res) => {
  const { prompt, model = 'fast', aspectRatio = '16:9', duration = 8, startImage, endImage, userId } = req.body || {};
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({ error: 'Le prompt vidéo est requis.' });
  const client = getAI();
  if (!client) return res.status(503).json({ error: 'La génération vidéo nécessite GEMINI_API_KEY.', code: 'VIDEO_NOT_CONFIGURED' });

  const safeModel: VideoModel = model === 'lite' || model === 'pro' ? model : 'fast';
  const numeric = Number(duration);
  const safeDuration: VideoDuration = numeric === 4 || numeric === 6 ? numeric : 8;
  const safeAspectRatio: VeoAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
  if (endImage && !startImage) return res.status(400).json({ error: 'Une image de fin nécessite une image de départ.', code: 'START_IMAGE_REQUIRED' });
  const effectiveDuration: VideoDuration = endImage ? 8 : safeDuration;
  const creditsUsed = VIDEO_CREDIT_COSTS[safeModel][effectiveDuration];

  try {
    const startedAt = Date.now();
    const result = await generateVideo(client, { model: safeModel, prompt: prompt.trim(), aspectRatio: safeAspectRatio, duration: effectiveDuration, startImage: typeof startImage === 'string' ? startImage : null, endImage: typeof endImage === 'string' ? endImage : null });
    const generation = { id: `gen-video-${Date.now()}`, userId: userId || 'usr-current', type: 'video', title: prompt.trim().slice(0, 60), prompt: prompt.trim(), enhancedPrompt: prompt.trim(), provider: 'Google', model: result.model, status: 'completed', progress: 100, resultUrl: result.resultUrl, thumbnailUrl: '', creditsUsed, settings: { style: 'prompt-only', videoModel: safeModel, aspectRatio: safeAspectRatio, duration: result.duration, enableAudio: true, startImage: Boolean(startImage), endImage: Boolean(endImage), resolution: '720p' }, createdAt: now(), updatedAt: now() };
    generations.unshift(generation);
    addLog('success', 'Studio Vidéo', `${VIDEO_MODELS[safeModel].name} a généré ${result.duration}s en ${Math.round((Date.now() - startedAt) / 1000)}s.`);
    return res.json({ success: true, generation });
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const message = String(error?.message || 'Erreur vidéo inconnue.');
    addLog('error', 'Studio Vidéo', message);
    return res.status(status === 400 ? 400 : status === 401 || status === 403 ? status : quotaError(error) ? 429 : status === 504 ? 504 : 500).json({ error: quotaError(error) ? 'Quota ou limite vidéo Google atteinte. Vérifiez le solde et les limites Gemini API.' : message, code: error?.code || 'VIDEO_GENERATION_FAILED' });
  }
});

app.post('/api/generate/music', (req, res) => {
  if (!req.body?.prompt) return res.status(400).json({ error: 'La description musicale est requise.' });
  if (!process.env.MUSIC_PROVIDER_API_KEY) return res.status(503).json({ error: "Le fournisseur musical n'est pas encore connecté.", code: 'MUSIC_PROVIDER_NOT_CONFIGURED' });
  return res.status(501).json({ error: 'Le pipeline musical doit encore être connecté.', code: 'MUSIC_PROVIDER_NOT_IMPLEMENTED' });
});

app.get('/api/generations', (_req, res) => res.json({ generations }));
app.delete('/api/generations/:id', (req, res) => { generations = generations.filter((g) => g.id !== req.params.id); res.json({ success: true }); });
app.get('/api/admin/stats', (_req, res) => {
  const breakdown = { image: generations.filter((g) => g.type === 'image').length, video: generations.filter((g) => g.type === 'video').length, music: generations.filter((g) => g.type === 'music').length };
  res.json({ totalUsers: 0, activeUsersToday: 0, totalGenerations: generations.length, breakdown, totalCreditsConsumed: generations.reduce((sum, g) => sum + Number(g.creditsUsed || 0), 0), serverUptime: process.uptime(), activeProviders: apiProviders.filter((p) => p.enabled && p.isConfigured).length, logs: technicalLogs.slice(0, 20) });
});
app.post('/api/admin/providers/toggle', (req, res) => { const provider = apiProviders.find((p) => p.id === req.body?.providerId); if (!provider) return res.status(404).json({ error: 'Fournisseur non trouvé.' }); provider.enabled = !!req.body?.enabled; res.json({ success: true, provider }); });
app.post('/api/admin/settings', (req, res) => { const { creditCosts, announcementBanner, maintenanceMode } = req.body || {}; if (creditCosts) appSettings.creditCosts = { ...appSettings.creditCosts, ...creditCosts }; if (typeof announcementBanner === 'string') appSettings.announcementBanner = announcementBanner; if (typeof maintenanceMode === 'boolean') appSettings.maintenanceMode = maintenanceMode; res.json({ success: true, settings: appSettings }); });

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ appType: 'spa', server: { middlewareMode: true, hmr: false } });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => console.log(`[MUNGWELE IA STUDIO] Server running on http://0.0.0.0:${PORT}`));
}

startServer();
