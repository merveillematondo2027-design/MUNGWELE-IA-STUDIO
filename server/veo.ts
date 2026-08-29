import { promises as fs } from 'fs';
import path from 'path';
import type { GoogleGenAI } from '@google/genai';

export type VideoModel = 'lite' | 'omni' | 'pro';
export type VeoAspectRatio = '16:9' | '9:16';
export type VideoDuration = 4 | 6 | 8 | 10;

const MODEL_IDS: Record<VideoModel, string> = {
  lite: 'veo-3.1-lite-generate-preview',
  omni: 'gemini-omni-1.1-flash',
  pro: 'veo-3.1-generate-preview',
};

function dataUrlToImage(dataUrl?: string | null) {
  if (!dataUrl) return undefined;
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw Object.assign(new Error("L'image vidéo fournie est invalide."), { status: 400, code: 'INVALID_VIDEO_IMAGE' });
  return { mimeType: match[1], data: match[2] };
}

async function saveVideoBytes(bytes: Buffer, prefix: string) {
  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${prefix}-${Date.now()}.mp4`;
  await fs.writeFile(path.join(outputDir, filename), bytes);
  return `/generated/videos/${filename}`;
}

async function generateWithVeo(
  ai: GoogleGenAI,
  options: {
    model: 'lite' | 'pro';
    prompt: string;
    aspectRatio: VeoAspectRatio;
    duration: VideoDuration;
    startImage?: string | null;
    endImage?: string | null;
  },
) {
  if (options.duration === 10) {
    throw Object.assign(new Error('Veo 3.1 Lite et Veo 3.1 Pro acceptent actuellement 4, 6 ou 8 secondes, pas 10 secondes.'), {
      status: 400,
      code: 'VIDEO_DURATION_UNSUPPORTED',
    });
  }

  const first = dataUrlToImage(options.startImage);
  const last = dataUrlToImage(options.endImage);
  if (last && !first) {
    throw Object.assign(new Error('Une image de fin nécessite une image de départ.'), { status: 400, code: 'START_IMAGE_REQUIRED' });
  }

  const effectiveDuration: 4 | 6 | 8 = last ? 8 : options.duration;
  const modelId = MODEL_IDS[options.model];

  let operation = await ai.models.generateVideos({
    model: modelId,
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
    if (Date.now() > deadline) {
      throw Object.assign(new Error('La génération vidéo Google a dépassé le délai maximal de 8 minutes.'), { status: 504, code: 'VIDEO_TIMEOUT' });
    }
    await new Promise((resolve) => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const video = operation.response?.generatedVideos?.[0]?.video;
  if (!video) throw new Error("Google n'a retourné aucune vidéo exploitable.");

  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `${options.model}-${Date.now()}.mp4`;
  const downloadPath = path.join(outputDir, filename);
  await ai.files.download({ file: video, downloadPath });

  return { model: modelId, duration: effectiveDuration, resultUrl: `/generated/videos/${filename}` };
}

async function generateWithOmni(
  ai: GoogleGenAI,
  options: {
    prompt: string;
    aspectRatio: VeoAspectRatio;
    duration: VideoDuration;
    startImage?: string | null;
    endImage?: string | null;
  },
) {
  const first = dataUrlToImage(options.startImage);
  const last = dataUrlToImage(options.endImage);
  if (last && !first) {
    throw Object.assign(new Error('Une image de fin nécessite une image de départ.'), { status: 400, code: 'START_IMAGE_REQUIRED' });
  }

  const durationInstruction = `Durée cible: exactement ${options.duration} secondes.`;
  let input: any = `${options.prompt}\n${durationInstruction}`;
  let task = 'text_to_video';

  if (first || last) {
    const media: any[] = [];
    if (first) media.push({ type: 'image', data: first.data, mime_type: first.mimeType });
    if (last) media.push({ type: 'image', data: last.data, mime_type: last.mimeType });
    const roleTags = last ? '<FIRST_FRAME> <LAST_FRAME>' : '<FIRST_FRAME>';
    media.push({ type: 'text', text: `${roleTags} ${options.prompt}\n${durationInstruction}` });
    input = media;
    task = 'image_to_video';
  }

  const interaction: any = await (ai as any).interactions.create({
    model: MODEL_IDS.omni,
    input,
    response_format: {
      type: 'video',
      aspect_ratio: options.aspectRatio,
      resolution: '720p',
    },
    generationConfig: {
      videoConfig: { task },
    },
  });

  const outputVideo = interaction?.output_video || interaction?.outputVideo;
  if (outputVideo?.data) {
    return {
      model: MODEL_IDS.omni,
      duration: options.duration,
      resultUrl: await saveVideoBytes(Buffer.from(outputVideo.data, 'base64'), 'omni'),
    };
  }

  if (outputVideo?.uri) {
    const match = String(outputVideo.uri).match(/files\/([^/?]+)/);
    if (!match) throw new Error("Omni a retourné une URI vidéo invalide.");
    const name = `files/${match[1]}`;
    const deadline = Date.now() + 8 * 60 * 1000;
    while (Date.now() < deadline) {
      const info: any = await ai.files.get({ name });
      const state = String(info?.state?.name || info?.state || '');
      if (state === 'ACTIVE') break;
      if (state === 'FAILED') throw new Error('La génération Gemini Omni Flash a échoué.');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    const outputDir = path.join(process.cwd(), 'generated', 'videos');
    await fs.mkdir(outputDir, { recursive: true });
    const filename = `omni-${Date.now()}.mp4`;
    await ai.files.download({ file: outputVideo, downloadPath: path.join(outputDir, filename) });
    return { model: MODEL_IDS.omni, duration: options.duration, resultUrl: `/generated/videos/${filename}` };
  }

  throw new Error("Gemini Omni Flash n'a retourné aucune vidéo exploitable.");
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
  if (options.model === 'omni') return generateWithOmni(ai, options);
  return generateWithVeo(ai, { ...options, model: options.model });
}
