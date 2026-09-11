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

function dataUrlToSdkImage(dataUrl?: string | null) {
  if (!dataUrl) return undefined;
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) {
    throw Object.assign(new Error("L'image vidéo fournie est invalide."), {
      status: 400,
      code: 'INVALID_VIDEO_IMAGE',
    });
  }

  // Official @google/genai video API shape.
  // Do not pass inlineData directly to generateVideos: the SDK expects Image.
  return {
    imageBytes: match[2],
    mimeType: match[1],
  };
}

function normalizedApiError(error: any) {
  const message = String(
    error?.message ||
    error?.error?.message ||
    error?.response?.data?.error?.message ||
    'La génération Veo a échoué.',
  );
  const status = Number(error?.status || error?.code || error?.error?.code || 500);
  return Object.assign(new Error(message), {
    status: Number.isFinite(status) ? status : 500,
    code: error?.error?.status || error?.status || 'VEO_API_ERROR',
  });
}

export async function generateVideo(
  aiClient: GoogleGenAI,
  options: {
    model: VideoModel;
    prompt: string;
    aspectRatio: VeoAspectRatio;
    duration: VideoDuration;
    startImage?: string | null;
    endImage?: string | null;
  },
) {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error('GEMINI_API_KEY absente côté serveur.'), {
      status: 503,
      code: 'VIDEO_NOT_CONFIGURED',
    });
  }

  // MUNGWELE exposes Veo Lite as prompt-only. Block image payloads here too so
  // an old client or resumed project can never reach the provider with inline/image data.
  if (options.model === 'lite' && (options.startImage || options.endImage)) {
    throw Object.assign(new Error('Veo 3.1 Lite ne prend pas en charge l’image de référence dans MUNGWELE. Utilisez Gemini Omni Fast.'), {
      status: 400,
      code: 'LITE_REFERENCE_IMAGE_UNSUPPORTED',
    });
  }

  const first = dataUrlToSdkImage(options.startImage);
  const last = dataUrlToSdkImage(options.endImage);
  if (last && !first) {
    throw Object.assign(new Error('Une image de fin nécessite une image de départ.'), {
      status: 400,
      code: 'START_IMAGE_REQUIRED',
    });
  }

  const effectiveDuration: VideoDuration = last ? 8 : options.duration;
  const modelId = MODEL_IDS[options.model];
  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${options.model}-${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, filename);

  // Keep this typed loosely so the project remains compatible with minor
  // @google/genai releases while following the current official API shape.
  const ai = aiClient as any;

  try {
    const request: Record<string, any> = {
      model: modelId,
      prompt: options.prompt,
      config: {
        aspectRatio: options.aspectRatio,
        durationSeconds: effectiveDuration,
        resolution: '720p',
      },
    };

    if (first) request.image = first;
    if (last) request.config.lastFrame = last;

    let operation = await ai.models.generateVideos(request);
    const deadline = Date.now() + 8 * 60 * 1000;

    while (!operation?.done) {
      if (Date.now() > deadline) {
        throw Object.assign(new Error('La génération Veo a dépassé 8 minutes.'), {
          status: 504,
          code: 'VIDEO_TIMEOUT',
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (operation?.error) throw operation.error;

    const generatedVideo = operation?.response?.generatedVideos?.[0]?.video;
    if (!generatedVideo) {
      throw Object.assign(new Error("Veo n'a retourné aucune vidéo exploitable."), {
        status: 502,
        code: 'VIDEO_OUTPUT_MISSING',
      });
    }

    // Some SDK responses already contain bytes, otherwise let the official
    // Files client download the generated file. Both paths avoid hand-building
    // the REST inlineData payload that caused the production failure.
    if (generatedVideo.videoBytes) {
      await fs.writeFile(outputPath, Buffer.from(generatedVideo.videoBytes, 'base64'));
    } else {
      await ai.files.download({
        file: generatedVideo,
        downloadPath: outputPath,
      });
    }

    return {
      model: modelId,
      duration: effectiveDuration,
      resultUrl: `/generated/videos/${filename}`,
    };
  } catch (error: any) {
    throw normalizedApiError(error);
  }
}
