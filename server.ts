import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateVeoVideo, type VeoAspectRatio, type VeoDuration } from "./server/veo";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/generated", express.static(path.join(process.cwd(), "generated")));

let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }
  return ai;
}

const now = () => new Date().toISOString();

let generations: any[] = [];
const technicalLogs: any[] = [];

let appSettings = {
  siteName: "MUNGWELE IA STUDIO",
  slogan: "Imaginez. Générez. Créez sans limites.",
  maintenanceMode: false,
  announcementBanner: "MUNGWELE IA STUDIO — Image, Vidéo et Musique par prompt.",
  creditCosts: {
    imageStandard: 8,
    imageHd: 8,
    video5s: 15,
    video10s: 25,
    musicTrack: 10,
    promptEnhance: 0,
  },
};

let apiProviders = [
  {
    id: "prov-openai-image",
    name: "OpenAI GPT-Image",
    providerKey: "openai",
    category: "image",
    enabled: true,
    isConfigured: !!process.env.OPENAI_API_KEY,
    isDemoFallback: false,
    modelName: "gpt-image-2",
    latencyAvgMs: 0,
    creditCost: 8,
  },
  {
    id: "prov-gemini-veo",
    name: "Google Veo 3.1 Fast",
    providerKey: "veo",
    category: "video",
    enabled: true,
    isConfigured: !!process.env.GEMINI_API_KEY,
    isDemoFallback: false,
    modelName: "veo-3.1-fast-generate-preview",
    latencyAvgMs: 0,
    creditCost: 25,
  },
  {
    id: "prov-suno-music",
    name: "Suno AI Music",
    providerKey: "suno",
    category: "music",
    enabled: true,
    isConfigured: !!process.env.MUSIC_PROVIDER_API_KEY,
    isDemoFallback: !process.env.MUSIC_PROVIDER_API_KEY,
    modelName: "suno-provider",
    latencyAvgMs: 4100,
    creditCost: 10,
  },
  {
    id: "prov-gemini-assistant",
    name: "Gemini Prompt Assistant",
    providerKey: "gemini",
    category: "text",
    enabled: true,
    isConfigured: !!process.env.GEMINI_API_KEY,
    isDemoFallback: !process.env.GEMINI_API_KEY,
    modelName: "gemini-3.7-flash",
    latencyAvgMs: 750,
    creditCost: 0,
  },
];

function addLog(type: string, module: string, message: string) {
  technicalLogs.unshift({ id: `log-${Date.now()}-${Math.random()}`, timestamp: now(), type, module, message });
  if (technicalLogs.length > 100) technicalLogs.length = 100;
}

function dataUrlToBinary(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], bytes: Buffer.from(match[2], "base64") };
}

function quotaError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return error?.status === "RESOURCE_EXHAUSTED" || error?.status === 429 || error?.code === 429 || message.includes("429") || message.includes("quota") || message.includes("rate limit");
}

function getOpenAIErrorMessage(payload: any, status: number) {
  return payload?.error?.message || payload?.message || `OpenAI image request failed (${status}).`;
}

async function generateOpenAIImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("OPENAI_API_KEY absente."), { code: "OPENAI_NOT_CONFIGURED" });

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-2", prompt }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(getOpenAIErrorMessage(payload, response.status)), { status: response.status, code: payload?.error?.code || payload?.error?.type });
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI n'a retourné aucune image.");
  return `data:image/png;base64,${b64}`;
}

async function editOpenAIImage(prompt: string, referenceImage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw Object.assign(new Error("OPENAI_API_KEY absente."), { code: "OPENAI_NOT_CONFIGURED" });
  const binary = dataUrlToBinary(referenceImage);
  if (!binary) throw Object.assign(new Error("L'image de référence est invalide."), { code: "INVALID_REFERENCE_IMAGE" });

  const form = new FormData();
  form.append("model", "gpt-image-2");
  form.append("prompt", prompt);
  form.append("image", new Blob([binary.bytes], { type: binary.mimeType }), "reference.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(getOpenAIErrorMessage(payload, response.status)), { status: response.status, code: payload?.error?.code || payload?.error?.type });
  const b64 = payload?.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI n'a retourné aucune image modifiée.");
  return `data:image/png;base64,${b64}`;
}

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", app: "MUNGWELE IA STUDIO", openAIImageConfigured: !!process.env.OPENAI_API_KEY, geminiConfigured: !!process.env.GEMINI_API_KEY, veoConfigured: !!process.env.GEMINI_API_KEY, timestamp: now() });
});

app.get("/api/settings", (_req: Request, res: Response) => {
  apiProviders = apiProviders.map((provider) => {
    if (provider.id === "prov-openai-image") return { ...provider, isConfigured: !!process.env.OPENAI_API_KEY };
    if (provider.id === "prov-gemini-veo") return { ...provider, isConfigured: !!process.env.GEMINI_API_KEY, isDemoFallback: false };
    return provider;
  });
  res.json({ settings: appSettings, providers: apiProviders });
});

app.post("/api/ai/enhance-prompt", async (req: Request, res: Response) => {
  const { prompt, type = "image" } = req.body || {};
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Le prompt est requis." });
  const client = getAI();
  if (!client) return res.json({ enhancedPrompt: prompt, tags: [], explanation: "Assistant de prompt indisponible : prompt conservé tel quel." });
  try {
    const response = await client.models.generateContent({
      model: "gemini-3.7-flash",
      contents: `Réécris ce prompt pour une génération ${type} professionnelle. Ne change jamais l'intention de l'utilisateur. Si le prompt décrit une retouche d'une image fournie, conserve explicitement l'image, les personnes, la composition et modifie uniquement ce qui est demandé. Prompt: ${prompt}`,
      config: { temperature: 0.35 },
    });
    res.json({ enhancedPrompt: response.text || prompt, tags: [], explanation: "Prompt détaillé sans modifier l'intention." });
  } catch (error: any) {
    addLog("warn", "Prompt Assistant", error?.message || "Erreur assistant");
    res.json({ enhancedPrompt: prompt, tags: [], explanation: "Prompt conservé tel quel." });
  }
});

app.post("/api/ai/generate-lyrics", async (req: Request, res: Response) => {
  const { topic, genre, mood, isInstrumental } = req.body || {};
  if (isInstrumental) return res.json({ lyrics: "[Instrumental]" });
  const client = getAI();
  if (!client) return res.status(503).json({ error: "Gemini n'est pas configuré pour générer les paroles." });
  try {
    const response = await client.models.generateContent({ model: "gemini-3.7-flash", contents: `Écris des paroles originales en français. Genre: ${genre || "Afrobeat"}. Ambiance: ${mood || "énergique"}. Thème: ${topic || "créativité"}. Structure: couplet 1, refrain, couplet 2, pont, refrain final.` });
    return res.json({ lyrics: response.text || "" });
  } catch (error: any) {
    return res.status(quotaError(error) ? 429 : 500).json({ error: quotaError(error) ? "Quota Gemini atteint." : "Erreur lors de la génération des paroles." });
  }
});

app.post("/api/generate/image", async (req: Request, res: Response) => {
  const { prompt, enhancedPrompt, referenceImage, userId } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "Le prompt image est requis." });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "La génération d'image nécessite OPENAI_API_KEY.", code: "OPENAI_IMAGE_PROVIDER_NOT_CONFIGURED" });

  const finalPrompt = String(enhancedPrompt || prompt).trim();
  const hasReference = typeof referenceImage === "string" && referenceImage.startsWith("data:image/");
  const imagePrompt = hasReference
    ? `MODIFICATION D'IMAGE. Utilise l'image fournie comme base. Préserve les personnes, visages, objets, cadrage, couleurs, décor et composition sauf si l'utilisateur demande explicitement de les changer. N'effectue que la modification demandée. Respecte exactement tous les textes, noms et orthographes demandés. Instruction utilisateur : ${finalPrompt}`
    : `Crée une image en suivant précisément cette demande. Respecte exactement les textes, noms, orthographes, composition et contraintes indiquées. N'ajoute pas d'éléments non demandés. Instruction utilisateur : ${finalPrompt}`;

  try {
    const imageUrl = hasReference ? await editOpenAIImage(imagePrompt, referenceImage) : await generateOpenAIImage(imagePrompt);
    const newGen = {
      id: `gen-img-${Date.now()}`, userId: userId || "usr-current", type: "image", title: prompt.slice(0, 60), prompt,
      enhancedPrompt: finalPrompt, provider: "OpenAI", model: "gpt-image-2", status: "completed", progress: 100,
      resultUrl: imageUrl, thumbnailUrl: imageUrl, creditsUsed: 8,
      settings: { style: "prompt-only", aspectRatio: "auto", quality: "high", quantity: 1, referenceImage: hasReference },
      createdAt: now(), updatedAt: now(),
    };
    generations.unshift(newGen);
    addLog("success", "Studio Image", hasReference ? "Image modifiée avec OpenAI GPT-Image-2." : "Image générée avec OpenAI GPT-Image-2.");
    return res.json({ success: true, generation: newGen, images: [imageUrl] });
  } catch (error: any) {
    const isQuota = quotaError(error);
    const status = Number(error?.status || 0);
    const unauthorized = status === 401;
    const forbidden = status === 403;
    addLog("error", "Studio Image", String(error?.message || error));
    return res.status(unauthorized ? 401 : forbidden ? 403 : isQuota ? 429 : 500).json({
      error: unauthorized ? "Clé OpenAI invalide ou non autorisée. Vérifiez OPENAI_API_KEY." : forbidden ? "Le projet OpenAI n'a pas accès au modèle d'image demandé." : isQuota ? "Quota ou limite OpenAI Image atteint. Vérifiez la facturation et les limites de votre projet OpenAI." : `La génération OpenAI Image a échoué : ${String(error?.message || "erreur inconnue")}`,
      code: unauthorized ? "OPENAI_INVALID_API_KEY" : forbidden ? "OPENAI_MODEL_ACCESS_DENIED" : isQuota ? "OPENAI_QUOTA_EXHAUSTED" : "OPENAI_IMAGE_GENERATION_FAILED",
    });
  }
});

app.post("/api/generate/video", async (req: Request, res: Response) => {
  const { prompt, aspectRatio = "16:9", duration = 8, startImage, endImage, userId } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "Le prompt vidéo est requis." });

  const client = getAI();
  if (!client) return res.status(503).json({ error: "Veo 3.1 nécessite GEMINI_API_KEY.", code: "VEO_NOT_CONFIGURED" });

  const safeAspectRatio: VeoAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
  const numericDuration = Number(duration);
  const safeDuration: VeoDuration = numericDuration === 4 || numericDuration === 6 ? numericDuration : 8;
  const creditCost = safeDuration === 4 ? 15 : safeDuration === 6 ? 20 : 25;

  try {
    const startedAt = Date.now();
    const result = await generateVeoVideo(client, {
      prompt: prompt.trim(),
      aspectRatio: safeAspectRatio,
      duration: safeDuration,
      startImage: typeof startImage === "string" ? startImage : null,
      endImage: typeof endImage === "string" ? endImage : null,
    });

    const newGen = {
      id: `gen-video-${Date.now()}`,
      userId: userId || "usr-current",
      type: "video",
      title: prompt.trim().slice(0, 60),
      prompt: prompt.trim(),
      enhancedPrompt: prompt.trim(),
      provider: "Google",
      model: result.model,
      status: "completed",
      progress: 100,
      resultUrl: result.resultUrl,
      thumbnailUrl: "",
      creditsUsed: result.duration === 4 ? 15 : result.duration === 6 ? 20 : 25,
      settings: {
        style: "prompt-only",
        aspectRatio: safeAspectRatio,
        duration: result.duration,
        enableAudio: true,
        startImage: Boolean(startImage),
        endImage: Boolean(endImage),
        resolution: "720p",
      },
      createdAt: now(),
      updatedAt: now(),
    };

    generations.unshift(newGen);
    const elapsed = Date.now() - startedAt;
    apiProviders = apiProviders.map((provider) => provider.id === "prov-gemini-veo" ? { ...provider, latencyAvgMs: elapsed } : provider);
    addLog("success", "Studio Vidéo", `Vidéo Veo 3.1 Fast générée en ${Math.round(elapsed / 1000)}s.`);
    return res.json({ success: true, generation: newGen });
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const isQuota = quotaError(error);
    const message = String(error?.message || "Erreur Veo inconnue.");
    addLog("error", "Studio Vidéo", message);
    return res.status(status === 400 ? 400 : status === 401 || status === 403 ? status : isQuota ? 429 : status === 504 ? 504 : 500).json({
      error: status === 401 || status === 403
        ? "La clé Gemini n'a pas accès à Veo 3.1. Vérifiez le projet, la facturation et les autorisations."
        : isQuota
          ? "Quota ou limite Veo atteinte. Vérifiez la facturation et les limites Gemini API."
          : message,
      code: error?.code || (isQuota ? "VEO_QUOTA_EXHAUSTED" : "VEO_GENERATION_FAILED"),
    });
  }
});

app.post("/api/generate/music", async (req: Request, res: Response) => {
  const { prompt } = req.body || {};
  if (!prompt) return res.status(400).json({ error: "La description musicale est requise." });
  if (!process.env.MUSIC_PROVIDER_API_KEY) return res.status(503).json({ error: "Le fournisseur musical n'est pas encore connecté.", code: "MUSIC_PROVIDER_NOT_CONFIGURED" });
  return res.status(501).json({ error: "Le pipeline musical de production est prêt à être branché, mais n'est pas encore implémenté.", code: "MUSIC_PROVIDER_NOT_IMPLEMENTED" });
});

app.get("/api/generations", (_req: Request, res: Response) => res.json({ generations }));
app.delete("/api/generations/:id", (req: Request, res: Response) => {
  generations = generations.filter((g) => g.id !== req.params.id);
  res.json({ success: true });
});

app.get("/api/admin/stats", (_req: Request, res: Response) => {
  const breakdown = { image: generations.filter((g) => g.type === "image").length, video: generations.filter((g) => g.type === "video").length, music: generations.filter((g) => g.type === "music").length };
  res.json({ totalUsers: 0, activeUsersToday: 0, totalGenerations: generations.length, breakdown, totalCreditsConsumed: generations.reduce((sum, g) => sum + Number(g.creditsUsed || 0), 0), serverUptime: process.uptime(), activeProviders: apiProviders.filter((p) => p.enabled && p.isConfigured).length, logs: technicalLogs.slice(0, 20) });
});

app.post("/api/admin/providers/toggle", (req: Request, res: Response) => {
  const provider = apiProviders.find((p) => p.id === req.body?.providerId);
  if (!provider) return res.status(404).json({ error: "Fournisseur non trouvé." });
  provider.enabled = !!req.body?.enabled;
  return res.json({ success: true, provider });
});

app.post("/api/admin/settings", (req: Request, res: Response) => {
  const { creditCosts, announcementBanner, maintenanceMode } = req.body || {};
  if (creditCosts) appSettings.creditCosts = { ...appSettings.creditCosts, ...creditCosts };
  if (typeof announcementBanner === "string") appSettings.announcementBanner = announcementBanner;
  if (typeof maintenanceMode === "boolean") appSettings.maintenanceMode = maintenanceMode;
  res.json({ success: true, settings: appSettings });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      appType: "spa",
      server: {
        middlewareMode: true,
        hmr: false,
      },
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MUNGWELE IA STUDIO] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
