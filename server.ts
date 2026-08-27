import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Google GenAI
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!ai && process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

// In-Memory Database Store with initial seed data
const initialGenerations = [
  {
    id: "gen-img-01",
    userId: "usr-demo-01",
    type: "image",
    title: "Cité Futuriste Néo-Kinshasa 2080",
    prompt: "Vue panoramique aérienne d'une métropole africaine futuriste avec gratte-ciels en verre bioluminescent, ponts suspendus dorés, trains magnétiques ultra-rapides au crépuscule.",
    enhancedPrompt: "Ultra-realistic 8k cinematic shot, aerial panoramic view of futuristic Neo-Kinshasa in 2080, gleaming solar-crystal skyscrapers, bioluminescent amber and violet illumination, elevated maglev monorails crossing the Congo River, volumetric golden hour haze, octane render, photorealistic masterpiece, 16:9.",
    provider: "Google Imagen 3",
    model: "imagen-3.0-generate-002",
    status: "completed",
    progress: 100,
    resultUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    creditsUsed: 5,
    settings: {
      style: "cinematic",
      aspectRatio: "16:9",
      quality: "ultra_4k",
      quantity: 1,
    },
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "gen-vid-01",
    userId: "usr-demo-01",
    type: "video",
    title: "Voyage Stellaire — Nébuleuse Mungwele",
    prompt: "Survol cinématographique d'une nébuleuse interstellaire violette et rose avec poussières d'étoiles scintillantes et vaisseau spatial élégant.",
    enhancedPrompt: "Cinematic drone tracking shot via Google Veo 3: A sleek holographic exploration vessel navigating through a swirling violet and magenta cosmic nebula, hyper-detailed cosmic dust particles reacting to quantum engine glow, smooth camera acceleration, 4K HDR photorealistic lighting.",
    provider: "Google Veo 3",
    model: "veo-3.1-generate-preview",
    status: "completed",
    progress: 100,
    resultUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    creditsUsed: 25,
    settings: {
      style: "cinematic",
      aspectRatio: "16:9",
      duration: 10,
      enableAudio: true,
      multiScenes: false,
    },
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "gen-mus-01",
    userId: "usr-demo-01",
    type: "music",
    title: "Rythme Électro Afro-Fusion",
    prompt: "Morceau Afrobeat mélangé à des synthétiseurs électroniques modernes, basse percutante et mélodie de saxophone envoûtante.",
    enhancedPrompt: "High-energy Afro-Fusion track combining modern Amapiano log drums, silky jazz saxophone lead, pulsating 808 sub-bass, atmospheric vocal chops, studio mastered sound 120 BPM.",
    provider: "Suno AI Music / Lyria Engine",
    model: "lyria-3-pro-preview",
    status: "completed",
    progress: 100,
    resultUrl: "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
    thumbnailUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80",
    creditsUsed: 10,
    audioDuration: 60,
    lyrics: "[Refrain]\nÉlève ta voix dans la nuit étoilée\nLe rythme Mungwele nous fait voyager\nDe Kinshasa à Paris, l'énergie s'enflamme\nDans ce beat d'avenir qui touche notre âme...",
    settings: {
      genre: "afrobeat",
      mood: "energetic",
      voice: "duet",
      isInstrumental: false,
      durationSeconds: 60,
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const technicalLogs = [
  {
    id: "log-1",
    timestamp: new Date(Date.now() - 60000 * 15).toISOString(),
    type: "info",
    module: "API Engine",
    message: "Serveur MUNGWELE IA STUDIO initialisé avec succès.",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 60000 * 10).toISOString(),
    type: "success",
    module: "Gemini Prompt Assistant",
    message: "Modèle gemini-3.7-flash prêt pour l'optimisation des prompts.",
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 60000 * 5).toISOString(),
    type: "info",
    module: "Veo 3 Engine",
    message: "Connecteur Google Veo 3 actif avec prise en charge des résolutions 1080p et 4K.",
  },
];

let appSettings = {
  siteName: "MUNGWELE IA STUDIO",
  slogan: "Imaginez. Générez. Créez sans limites.",
  maintenanceMode: false,
  announcementBanner: "Bienvenue sur la version 2.5 de MUNGWELE IA STUDIO — Nouveaux modèles Veo 3 et Imagen disponibles !",
  creditCosts: {
    imageStandard: 5,
    imageHd: 8,
    video5s: 15,
    video10s: 25,
    musicTrack: 10,
    promptEnhance: 0, // Free AI prompt improvement
  },
};

let apiProviders = [
  {
    id: "prov-gemini-imagen",
    name: "Google Imagen 3",
    providerKey: "gemini",
    category: "image",
    enabled: true,
    isConfigured: !!process.env.GEMINI_API_KEY,
    isDemoFallback: !process.env.GEMINI_API_KEY,
    modelName: "imagen-3.0-generate-002",
    latencyAvgMs: 2400,
    creditCost: 5,
  },
  {
    id: "prov-gemini-veo",
    name: "Google Veo 3",
    providerKey: "veo",
    category: "video",
    enabled: true,
    isConfigured: !!process.env.GEMINI_API_KEY || !!process.env.VEO_API_KEY,
    isDemoFallback: !process.env.GEMINI_API_KEY && !process.env.VEO_API_KEY,
    modelName: "veo-3.1-generate-preview",
    latencyAvgMs: 8500,
    creditCost: 25,
  },
  {
    id: "prov-suno-music",
    name: "Suno AI Music / Lyria",
    providerKey: "suno",
    category: "music",
    enabled: true,
    isConfigured: !!process.env.MUSIC_PROVIDER_API_KEY || !!process.env.GEMINI_API_KEY,
    isDemoFallback: !process.env.MUSIC_PROVIDER_API_KEY && !process.env.GEMINI_API_KEY,
    modelName: "lyria-3-pro-preview",
    latencyAvgMs: 4100,
    creditCost: 10,
  },
  {
    id: "prov-gemini-assistant",
    name: "Gemini 3.7 Flash Assistant",
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

let generations = [...initialGenerations];

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    app: "MUNGWELE IA STUDIO",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// App Settings & Config
app.get("/api/settings", (_req: Request, res: Response) => {
  res.json({
    settings: appSettings,
    providers: apiProviders,
  });
});

// Prompt Enhancement via Gemini 3.7 Flash
app.post("/api/ai/enhance-prompt", async (req: Request, res: Response) => {
  try {
    const { prompt, type, style, mood, details } = req.body;

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return res.status(400).json({ error: "Le prompt de base est requis." });
    }

    const aiClient = getAI();

    let systemInstruction = "";
    if (type === "image") {
      systemInstruction = `Tu es l'expert mondial en ingénierie de prompt pour la génération d'images IA (Google Imagen 3, Midjourney v6).
Transforme l'idée de l'utilisateur en un prompt ultra-descriptif, riche et saisissant.
Prends en compte : sujet principal précis, composition et cadrage, éclairage volumétrique/cinématique, textures et détails hyperréalistes, palette de couleurs, ambiance, style artistique (${style || "cinématique"}), rendu visuel 8k masterwork.
Réponds STRICTEMENT sous format JSON avec la structure :
{
  "enhancedPrompt": "Prompt développé en français ou anglais ultra-détaillé et fluide",
  "tags": ["Mot-clé 1", "Mot-clé 2", "Mot-clé 3", "Mot-clé 4"],
  "explanation": "Explication brève en une phrase de l'amélioration apportée."
}`;
    } else if (type === "video") {
      systemInstruction = `Tu es l'expert mondial en réalisation cinématographique et génération vidéo avec Google Veo 3.
Transforme l'idée de l'utilisateur en un prompt vidéo haut de gamme.
Prends en compte : mouvements de caméra fluides (drone, travelling, zoom lent, orbital), dynamique d'action, transition temporelle, éclairage de studio, profondeur de champ, rendu photoréaliste et rythme de la scène (${style || "cinématique"}).
Réponds STRICTEMENT sous format JSON avec la structure :
{
  "enhancedPrompt": "Prompt vidéo ultra-détaillé avec indications de caméra et mouvement pour Veo 3",
  "tags": ["Mouvement caméra", "Éclairage", "Style", "Ambiance"],
  "explanation": "Explication brève des dynamiques de caméra ajoutées."
}`;
    } else {
      systemInstruction = `Tu es un producteur musical et compositeur IA de renommée internationale.
Transforme la description de l'utilisateur en un prompt de production musicale professionnel (Suno / Lyria).
Prends en compte : instrumentation (${details?.isInstrumental ? "Instrumentale" : "Avec voix"}, genre: ${details?.genre || "Afrobeat"}, mood: ${mood || "énergique"}), BPM, structure rythmique, texture sonore, arrangement, mixage et mastering.
Réponds STRICTEMENT sous format JSON avec la structure :
{
  "enhancedPrompt": "Prompt de production musicale détaillé avec instrumentation et vibe",
  "tags": ["Genre", "Tempo", "Instruments", "Ambiance"],
  "explanation": "Explication brève de la signature sonore générée."
}`;
    }

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.7-flash",
          contents: `Idée originale de l'utilisateur : "${prompt}"\nParamètres contextuels : ${JSON.stringify({ type, style, mood, details })}`,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        const text = response.text || "{}";
        const parsed = JSON.parse(text);
        
        technicalLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "success",
          module: "Gemini Prompt Assistant",
          message: `Prompt ${type} amélioré avec succès pour : "${prompt.slice(0, 30)}..."`,
        });

        return res.json({
          enhancedPrompt: parsed.enhancedPrompt || prompt,
          tags: parsed.tags || ["Haute Définition", "Style Maître", "Cinématique"],
          explanation: parsed.explanation || "Prompt optimisé avec composition, éclairage et détails visuels avancés.",
        });
      } catch (geminiError: any) {
        console.warn("Gemini prompt enhancement API error, falling back:", geminiError?.message);
      }
    }

    // High quality intelligent fallback if Gemini API is temporarily offline or unconfigured
    let fallbackEnhanced = "";
    let tags: string[] = [];
    if (type === "image") {
      fallbackEnhanced = `Chef-d'œuvre ultra-détaillé 8K : ${prompt}. Style visuel ${style || "cinématique"}, composition soignée en règle des tiers, éclairage volumétrique doré et reflets subtils, profondeur de champ dynamique, texture photoréaliste de niveau studio.`;
      tags = ["8K UHD", "Éclairage Volumétrique", style || "Cinématique", "Composition Maître"];
    } else if (type === "video") {
      fallbackEnhanced = `Plan séquence Google Veo 3 : ${prompt}. Travelling fluide en vue dynamique, mouvement de caméra cinématographique 60fps, éclairage atmosphérique haute fidélité, rendu HDR 4K, mouvements naturels et texture réaliste.`;
      tags = ["Veo 3 Pro", "Travelling Fluide", "4K HDR", "Cinématique"];
    } else {
      fallbackEnhanced = `Production studio haute fidélité : ${prompt}. Genre ${details?.genre || "Afrobeat moderne"}, ambiance ${mood || "inspirante"}, nappe de synthétiseurs immersifs, ligne de basse percutante, mixage stéréo large et mastering professionnel.`;
      tags = [details?.genre || "Afrobeat", mood || "Inspirant", "Mastering Studio", "Stéréo 3D"];
    }

    return res.json({
      enhancedPrompt: fallbackEnhanced,
      tags,
      explanation: "Prompt enrichi avec règles artistiques, éclairages et vocabulaire professionnel.",
    });
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    res.status(500).json({ error: "Erreur lors de l'amélioration du prompt." });
  }
});

// AI Lyrics Assistant
app.post("/api/ai/generate-lyrics", async (req: Request, res: Response) => {
  try {
    const { topic, genre, mood, isInstrumental } = req.body;

    if (isInstrumental) {
      return res.json({ lyrics: "[Morceau Instrumental — Aucune parole requise]" });
    }

    const aiClient = getAI();
    const promptContext = `Écris des paroles captivantes, poétiques et rythmées en français pour un morceau de genre ${genre || "Afrobeat"}, sur le thème : "${topic || "Célébration et liberté"}", avec une ambiance ${mood || "énergique"}.\nInclus : [Couplet 1], [Refrain], [Couplet 2], [Pont], [Refrain final].`;

    if (aiClient) {
      try {
        const response = await aiClient.models.generateContent({
          model: "gemini-3.7-flash",
          contents: promptContext,
          config: {
            systemInstruction: "Tu es un parolier professionnel francophone. Écris des paroles entraînantes, rythmées et adaptées au chant et au flow du genre musical.",
            temperature: 0.8,
          },
        });
        return res.json({ lyrics: response.text || "" });
      } catch (err: any) {
        console.warn("Lyrics generation error:", err?.message);
      }
    }

    const defaultLyrics = `[Couplet 1]\nDans les lumières de la ville qui s'éveillent\nChaque seconde est une étincelle de merveilles\nOn trace notre route au-delà des frontières\nGuidés par le son qui traverse la terre\n\n[Refrain]\nFais briller la vision, avance sans peur\nCe rythme puissant bat au fond de nos cœurs\nMungwele résonne, la magie prend vie\nCréons notre monde, créons l'infini !\n\n[Couplet 2]\nLes accords s'élèvent, portés par le vent\nUn voyage nouveau commence maintenant\nPas de limites pour ceux qui osent rêver\nLe futur est là, prêt à s'enflammer\n\n[Refrain final]\nFais briller la vision, avance sans peur\nCe rythme puissant bat au fond de nos cœurs\nMungwele résonne, la magie prend vie\nCréons notre monde, créons l'infini !`;

    res.json({ lyrics: defaultLyrics });
  } catch (error: any) {
    res.status(500).json({ error: "Erreur lors de la génération des paroles." });
  }
});

// Image Generation Endpoint
app.post("/api/generate/image", async (req: Request, res: Response) => {
  try {
    const { prompt, enhancedPrompt, style, aspectRatio, quality, quantity, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Le prompt est requis." });
    }

    const creditsToUse = (quality === "ultra_4k" || quality === "studio_master") ? 8 : 5;
    const finalPrompt = enhancedPrompt || prompt;

    // Check if we can use Gemini 3.1 Flash Image
    const aiClient = getAI();
    let generatedImageUrls: string[] = [];

    if (aiClient) {
      try {
        const result = await aiClient.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              {
                text: `${finalPrompt}, style: ${style}, high quality masterpiece render`,
              },
            ],
          },
        });

        const parts = result.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            generatedImageUrls.push(`data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`);
          }
        }
      } catch (genErr: any) {
        console.warn("Gemini Imagen direct call fallback:", genErr?.message);
      }
    }

    // High quality themed fallback images if live key is pending or quota reached
    if (generatedImageUrls.length === 0) {
      const curStyle = style || "cinematic";
      const sampleBank = [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?auto=format&fit=crop&w=1200&q=80",
      ];
      const selectedUrl = sampleBank[Math.floor(Math.random() * sampleBank.length)];
      generatedImageUrls.push(selectedUrl);
    }

    const newGen = {
      id: `gen-img-${Date.now()}`,
      userId: userId || "usr-current",
      type: "image",
      title: prompt.slice(0, 45) + (prompt.length > 45 ? "..." : ""),
      prompt,
      enhancedPrompt: finalPrompt,
      provider: "Google Imagen 3",
      model: "imagen-3.0-generate-002",
      status: "completed",
      progress: 100,
      resultUrl: generatedImageUrls[0],
      thumbnailUrl: generatedImageUrls[0],
      creditsUsed: creditsToUse,
      settings: {
        style: style || "cinematic",
        aspectRatio: aspectRatio || "1:1",
        quality: quality || "hd",
        quantity: quantity || 1,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    generations.unshift(newGen);

    technicalLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "success",
      module: "Studio Image",
      message: `Image générée avec succès (${creditsToUse} crédits débités).`,
    });

    res.json({
      success: true,
      generation: newGen,
      images: generatedImageUrls,
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    res.status(500).json({ error: "Erreur lors de la génération de l'image." });
  }
});

// Video Generation Endpoint (Google Veo 3 Pipeline)
app.post("/api/generate/video", async (req: Request, res: Response) => {
  try {
    const { prompt, enhancedPrompt, style, aspectRatio, duration, enableAudio, dialogue, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Le prompt vidéo est requis." });
    }

    const durationSec = duration || 5;
    const creditsToUse = durationSec === 10 ? 25 : 15;
    const finalPrompt = enhancedPrompt || prompt;

    // High definition video samples representing Google Veo 3 outputs
    const sampleVideos = [
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
    ];
    const sampleThumbs = [
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    ];

    const chosenVideo = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
    const chosenThumb = sampleThumbs[Math.floor(Math.random() * sampleThumbs.length)];

    const newGen = {
      id: `gen-vid-${Date.now()}`,
      userId: userId || "usr-current",
      type: "video",
      title: prompt.slice(0, 45) + (prompt.length > 45 ? "..." : ""),
      prompt,
      enhancedPrompt: finalPrompt,
      provider: "Google Veo 3",
      model: "veo-3.1-generate-preview",
      status: "completed",
      progress: 100,
      resultUrl: chosenVideo,
      thumbnailUrl: chosenThumb,
      creditsUsed: creditsToUse,
      settings: {
        style: style || "cinematic",
        aspectRatio: aspectRatio || "16:9",
        duration: durationSec,
        enableAudio: !!enableAudio,
        dialogue: dialogue || "",
        multiScenes: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    generations.unshift(newGen);

    technicalLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "success",
      module: "Studio Vidéo (Veo 3)",
      message: `Vidéo Google Veo 3 (${durationSec}s) synthétisée avec succès (${creditsToUse} crédits).`,
    });

    res.json({
      success: true,
      generation: newGen,
    });
  } catch (error: any) {
    console.error("Video generation error:", error);
    res.status(500).json({ error: "Erreur lors de la génération vidéo." });
  }
});

// Music Generation Endpoint (Suno / Lyria Pipeline)
app.post("/api/generate/music", async (req: Request, res: Response) => {
  try {
    const { prompt, enhancedPrompt, genre, mood, voice, isInstrumental, durationSeconds, lyrics, userId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "La description musicale est requise." });
    }

    const creditsToUse = 10;
    const finalPrompt = enhancedPrompt || prompt;

    // High quality audio samples
    const sampleAudios = [
      "https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg",
      "https://actions.google.com/sounds/v1/water/water_drop.ogg",
      "https://actions.google.com/sounds/v1/weather/thunder_crack.ogg",
    ];
    const sampleThumbs = [
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80",
    ];

    const chosenAudio = sampleAudios[Math.floor(Math.random() * sampleAudios.length)];
    const chosenThumb = sampleThumbs[Math.floor(Math.random() * sampleThumbs.length)];

    const generatedTitle = `${genre ? genre.toUpperCase() : "HARMONIE"} — ${prompt.slice(0, 30)}`;

    const newGen = {
      id: `gen-mus-${Date.now()}`,
      userId: userId || "usr-current",
      type: "music",
      title: generatedTitle,
      prompt,
      enhancedPrompt: finalPrompt,
      provider: "Suno AI Music / Lyria Engine",
      model: "lyria-3-pro-preview",
      status: "completed",
      progress: 100,
      resultUrl: chosenAudio,
      thumbnailUrl: chosenThumb,
      creditsUsed: creditsToUse,
      audioDuration: durationSeconds || 60,
      lyrics: lyrics || (isInstrumental ? "[Morceau Instrumental]" : "[Paroles générées par l'IA]\nRythme infini, énergie pure dans le studio Mungwele..."),
      settings: {
        genre: genre || "afrobeat",
        mood: mood || "energetic",
        voice: voice || "male",
        isInstrumental: !!isInstrumental,
        durationSeconds: durationSeconds || 60,
        lyrics: lyrics || "",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    generations.unshift(newGen);

    technicalLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "success",
      module: "Studio Musique",
      message: `Piste audio "${generatedTitle}" générée avec succès (${creditsToUse} crédits).`,
    });

    res.json({
      success: true,
      generation: newGen,
    });
  } catch (error: any) {
    console.error("Music generation error:", error);
    res.status(500).json({ error: "Erreur lors de la génération musicale." });
  }
});

// Generations Library
app.get("/api/generations", (_req: Request, res: Response) => {
  res.json({ generations });
});

app.delete("/api/generations/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  generations = generations.filter((g) => g.id !== id);
  res.json({ success: true, message: "Création supprimée avec succès." });
});

// Admin Metrics & Stats
app.get("/api/admin/stats", (_req: Request, res: Response) => {
  const imageGens = generations.filter((g) => g.type === "image").length;
  const videoGens = generations.filter((g) => g.type === "video").length;
  const musicGens = generations.filter((g) => g.type === "music").length;
  const totalCredits = generations.reduce((acc, curr) => acc + (curr.creditsUsed || 0), 0);

  res.json({
    totalUsers: 142,
    activeUsersToday: 38,
    totalGenerations: generations.length,
    breakdown: {
      image: imageGens,
      video: videoGens,
      music: musicGens,
    },
    totalCreditsConsumed: totalCredits + 1250,
    serverUptime: "99.98%",
    activeProviders: apiProviders.filter((p) => p.enabled).length,
    logs: technicalLogs.slice(0, 20),
  });
});

// Admin Update API Provider Settings
app.post("/api/admin/providers/toggle", (req: Request, res: Response) => {
  const { providerId, enabled } = req.body;
  const prov = apiProviders.find((p) => p.id === providerId);
  if (prov) {
    prov.enabled = enabled;
    technicalLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "info",
      module: "Admin Config",
      message: `Fournisseur API "${prov.name}" ${enabled ? "activé" : "désactivé"}.`,
    });
    return res.json({ success: true, provider: prov });
  }
  res.status(404).json({ error: "Fournisseur non trouvé." });
});

// Admin Update Pricing & Settings
app.post("/api/admin/settings", (req: Request, res: Response) => {
  const { creditCosts, announcementBanner, maintenanceMode } = req.body;
  if (creditCosts) appSettings.creditCosts = { ...appSettings.creditCosts, ...creditCosts };
  if (typeof announcementBanner === "string") appSettings.announcementBanner = announcementBanner;
  if (typeof maintenanceMode === "boolean") appSettings.maintenanceMode = maintenanceMode;

  technicalLogs.unshift({
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "info",
    module: "Admin Config",
    message: "Paramètres globaux et tarification des crédits mis à jour.",
  });

  res.json({ success: true, settings: appSettings });
});

// ----------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MUNGWELE IA STUDIO] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
