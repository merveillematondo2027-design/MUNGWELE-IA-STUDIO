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

function dataUrlToImage(dataUrl?: string | null) {
  if (!dataUrl) return undefined;
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw Object.assign(new Error("L'image vidéo fournie est invalide."), { status: 400, code: 'INVALID_VIDEO_IMAGE' });
  return { mimeType: match[1], data: match[2] };
}

export async function generateVideo(
  ai: GoogleGenAI,
  options: {
    model: VideoModel;
    prompt: string;
    aspectRatio: VeoAspectRatio;
    duration: VideoDuration;
    startImage?: string | null;
    endImage?: string | null;
  },
) {
  const first = dataUrlToImage(options.startImage);
  const last = dataUrlToImage(options.endImage);
  if (last && !first) throw Object.assign(new Error('Une image de fin nécessite une image de départ.'), { status: 400, code: 'START_IMAGE_REQUIRED' });

  const effectiveDuration: VideoDuration = last ? 8 : options.duration;
  let operation = await ai.models.generateVideos({
    model: MODEL_IDS[options.model],
    prompt: options.prompt,
    ...(first ? { image: { imageBytes: first.data, mimeType: first.mimeType } } : {}),
    config: {
      aspectRatio: options.aspectRatio,
      durationSeconds: String(effectiveDuration),
      resolution: '720p',
      ...(last ? { lastFrame: { imageBytes: last.data, mimeType: last.mimeType } } : {}),
    },
  });

  const deadline = Date.now() + 8 * 60 * 1000;
  while (!operation.done) {
    if (Date.now() > deadline) throw Object.assign(new Error('La génération Veo a dépassé 8 minutes.'), { status: 504, code: 'VIDEO_TIMEOUT' });
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("Veo n'a retourné aucune vidéo exploitable.");
  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${options.model}-${Date.now()}.mp4`;
  await ai.files.download({ file: video, downloadPath: path.join(outputDir, filename) });
  return { model: MODEL_IDS[options.model], duration: effectiveDuration, resultUrl: `/generated/videos/${filename}` };
}
