import { promises as fs } from 'fs';
import path from 'path';
import type { GoogleGenAI } from '@google/genai';

export type VeoAspectRatio = '16:9' | '9:16';
export type VeoDuration = 4 | 6 | 8;

function dataUrlToVeoImage(dataUrl?: string | null) {
  if (!dataUrl) return undefined;
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error("L'image Veo fournie est invalide.");
  return {
    imageBytes: match[2],
    mimeType: match[1],
  };
}

export async function generateVeoVideo(
  ai: GoogleGenAI,
  options: {
    prompt: string;
    aspectRatio: VeoAspectRatio;
    duration: VeoDuration;
    startImage?: string | null;
    endImage?: string | null;
  },
) {
  const firstImage = dataUrlToVeoImage(options.startImage);
  const lastImage = dataUrlToVeoImage(options.endImage);

  if (lastImage && !firstImage) {
    throw new Error('Une image de fin nécessite une image de départ.');
  }

  const effectiveDuration: VeoDuration = lastImage ? 8 : options.duration;

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: options.prompt,
    ...(firstImage ? { image: firstImage } : {}),
    config: {
      aspectRatio: options.aspectRatio,
      durationSeconds: String(effectiveDuration),
      resolution: '720p',
      ...(lastImage ? { lastFrame: lastImage } : {}),
    },
  });

  const deadline = Date.now() + 7 * 60 * 1000;
  while (!operation.done) {
    if (Date.now() > deadline) {
      throw new Error('La génération Veo a dépassé le délai maximal de 7 minutes.');
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("Veo n'a retourné aucune vidéo exploitable.");

  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `veo-${Date.now()}.mp4`;
  const downloadPath = path.join(outputDir, filename);

  await ai.files.download({
    file: video,
    downloadPath,
  });

  return {
    model: 'veo-3.1-fast-generate-preview',
    duration: effectiveDuration,
    resultUrl: `/generated/videos/${filename}`,
  };
}
