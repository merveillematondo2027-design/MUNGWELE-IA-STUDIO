import { promises as fs } from 'fs';
import path from 'path';

export type OmniAspectRatio = '16:9' | '9:16';
export type OmniResolution = '720p' | '1080p' | '4k';

function parseDataUrl(dataUrl: string) {
  const match = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) {
    throw Object.assign(new Error("Une image de référence Omni est invalide."), { status: 400, code: 'INVALID_OMNI_IMAGE' });
  }
  return { mimeType: match[1], data: match[2] };
}

function readOutputVideo(payload: any) {
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  for (const step of steps) {
    if (step?.type !== 'model_output' || !Array.isArray(step?.content)) continue;
    const video = step.content.find((item: any) => item?.type === 'video' && typeof item?.data === 'string');
    if (video?.data) return { data: video.data, mimeType: video.mime_type || 'video/mp4' };
  }
  return null;
}

export async function generateOmniVideo(options: {
  prompt: string;
  aspectRatio: OmniAspectRatio;
  duration: 4 | 6 | 8;
  resolution?: OmniResolution;
  startImage?: string | null;
  endImage?: string | null;
  referenceImages?: string[];
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw Object.assign(new Error('GEMINI_API_KEY absente côté serveur.'), { status: 503, code: 'VIDEO_NOT_CONFIGURED' });

  const refs = (options.referenceImages || []).filter(Boolean).slice(0, 6);
  const first = options.startImage ? parseDataUrl(options.startImage) : null;
  const last = options.endImage ? parseDataUrl(options.endImage) : null;
  if (last && !first) throw Object.assign(new Error('Une image de fin nécessite une image de départ.'), { status: 400, code: 'START_IMAGE_REQUIRED' });

  const input: any[] = [];
  if (first) input.push({ type: 'image', data: first.data, mime_type: first.mimeType });
  if (last) input.push({ type: 'image', data: last.data, mime_type: last.mimeType });
  for (const ref of refs) {
    const parsed = parseDataUrl(ref);
    input.push({ type: 'image', data: parsed.data, mime_type: parsed.mimeType });
  }

  const timedPrompt = `[0-${options.duration}s] ${options.prompt.trim()}\nCreate exactly one coherent video lasting ${options.duration} seconds with native synchronized audio when appropriate.`;
  input.push({ type: 'text', text: timedPrompt });

  const task = refs.length ? 'reference_to_video' : first || last ? 'image_to_video' : 'text_to_video';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      model: 'gemini-omni-1.1-flash',
      input: input.length === 1 ? timedPrompt : input,
      response_format: { type: 'video', aspect_ratio: options.aspectRatio, resolution: options.resolution || '720p', duration: `${options.duration}s` },
      generation_config: { video_config: { task } },
    }),
  });

  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(payload?.error?.message || `Omni a refusé la requête (${response.status}).`), {
      status: response.status,
      code: payload?.error?.status || 'OMNI_API_ERROR',
    });
  }

  const output = readOutputVideo(payload);
  if (!output) {
    throw Object.assign(new Error("Gemini Omni n'a retourné aucune vidéo exploitable."), { status: 502, code: 'OMNI_OUTPUT_MISSING' });
  }

  const outputDir = path.join(process.cwd(), 'generated', 'videos');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `omni-${Date.now()}.mp4`;
  await fs.writeFile(path.join(outputDir, filename), Buffer.from(output.data, 'base64'));

  return { model: 'gemini-omni-1.1-flash', duration: options.duration, resultUrl: `/generated/videos/${filename}` };
}
