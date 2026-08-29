import { promises as fs } from 'fs';
import path from 'path';
import type { GoogleGenAI } from '@google/genai';

export type VideoModel = 'lite' | 'fast' | 'pro';
export type VeoAspectRatio = '16:9' | '9:16';
export type VideoDuration = 4 | 6 | 8;

const MODEL_IDS: Record<VideoModel, string> = {
  lite: 'veo-3.1-lite-generate-preview',
  fast: 'veo-3.1-fast-generate-preview',
  pro: 'veo-3.1-generate-preview',
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function dataUrlToImage(dataUrl?: string | null) {
  if (!dataUrl) return undefined;
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    throw Object.assign(new Error("L'image vidéo fournie est invalide."), {
      status: 400,
      code: 'INVALID_VIDEO_IMAGE',
    });
  }
  return { mimeType: match[1], data: match[2] };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function apiError(payload: any, fallback: string, status: number) {
  const message =
    payload?.error?.message ||
    payload?.message ||
    payload?.raw ||
    fallback;
  return Object.assign(new Error(String(message)), {
    status,
    code: payload?.error?.status || payload?.error?.code || 'VEO_API_ERROR',
  });
}

export async function generateVideo(
  _ai: GoogleGenAI,
  options: {
    model: VideoModel;
    prompt: string;
    aspectRatio: VeoAspectRatio;
    duration: VideoDuration;
    startImage?: string | null;
    endImage?: string | null;
  },
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('GEMINI_API_KEY absente côté serveur.'), {
      status: 503,
      code: 'VIDEO_NOT_CONFIGURED',
    });
  }

  const first = dataUrlToImage(options.startImage);
  const last = dataUrlToImage(options.endImage);
  if (last && !first) {
    throw Object.assign(new Error('Une image de fin nécessite une image de départ.'), {
      status: 400,
      code: 'START_IMAGE_REQUIRED',
    });
  }

  const effectiveDuration: VideoDuration = last ? 8 : options.duration;
  const instance: Record<string, any> = {
    prompt: options.prompt,
  };

  if (first) {
    instance.image = {
      imageBytes: first.data,
      mimeType: first.mimeType,
    };
  }

  const parameters: Record<string, any> = {
    aspectRatio: options.aspectRatio,
    durationSeconds: effectiveDuration,
    resolution: '720p',
    generateAudio: true,
    numberOfVideos: 1,
  };

  if (last) {
    parameters.lastFrame = {
      imageBytes: last.data,
      mimeType: last.mimeType,
    };
  }

  const modelId = MODEL_IDS[options.model];
  const startResponse = await fetch(`${GEMINI_BASE_URL}/models/${modelId}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      instances: [instance],
      parameters,
    }),
  });

  const startPayload: any = await readJson(startResponse);
  if (!startResponse.ok) {
    throw apiError(startPayload, `Veo a refusé la requête (${startResponse.status}).`, startResponse.status);
  }

  const operationName = startPayload?.name;
  if (!operationName || typeof operationName !== 'string') {
    throw Object.assign(new Error("Veo n'a retourné aucun identifiant d'opération."), {
      status: 502,
      code: 'VEO_OPERATION_MISSING',
    });
  }

  const deadline = Date.now() + 8 * 60 * 1000;
  let operation: any = startPayload;

  while (!operation?.done) {
    if (Date.now() > deadline) {
      throw Object.assign(new Error('La génération Veo a dépassé 8 minutes.'), {
        status: 504,
        code: 'VIDEO_TIMEOUT',
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 10000));

    const statusResponse = await fetch(`${GEMINI_BASE_URL}/${operationName}`, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    const statusPayload: any = await readJson(statusResponse);
    if (!statusResponse.ok) {
      throw apiError(statusPayload, `Impossible de vérifier l'état Veo (${statusResponse.status}).`, statusResponse.status);
    }

    operation = statusPayload;
  }

  if (operation?.error) {
    throw apiError({ error: operation.error }, 'La génération Veo a échoué.', Number(operation?.error?.code || 500));
  }

  const videoUri = operation?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!videoUri || typeof videoUri !== 'string') {
    throw Object.assign(new Error("Veo n'a retourné aucune vidéo exploitable."), {
      status: 502,
      code: 'VIDEO_OUTPUT_MISSING',
    });
  }

  const downloadResponse = await fetch(videoUri, {
    redirect: 'follow',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!downloadResponse.ok) {
    const payload = await readJson(downloadResponse);
    throw apiError(payload, `Téléchargement Veo impossible (${downloadResponse.status}).`, downloadResponse.status);
  }

  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${options.model}-${Date.now()}.mp4`;
  const bytes = Buffer.from(await downloadResponse.arrayBuffer());
  await fs.writeFile(path.join(outputDir, filename), bytes);

  return {
    model: modelId,
    duration: effectiveDuration,
    resultUrl: `/generated/videos/${filename}`,
  };
}
