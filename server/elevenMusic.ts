import { promises as fs } from 'fs';
import path from 'path';

export interface ElevenMusicPlan {
  compositionPlan: Record<string, unknown>;
  durationMs: number;
  instrumental: boolean;
}

function apiKey() {
  return process.env.ELEVENLABS_API_KEY || process.env.MUSIC_PROVIDER_API_KEY || '';
}

function requireApiKey() {
  const key = apiKey();
  if (!key) {
    throw Object.assign(new Error('Clé ElevenLabs Music absente côté serveur.'), {
      status: 503,
      code: 'ELEVEN_MUSIC_NOT_CONFIGURED',
    });
  }
  return key;
}

async function providerError(response: Response) {
  const text = await response.text().catch(() => '');
  try {
    const payload = JSON.parse(text);
    return String(payload?.detail?.message || payload?.detail || payload?.error?.message || payload?.message || text || `ElevenLabs error ${response.status}`);
  } catch {
    return text || `ElevenLabs error ${response.status}`;
  }
}

function durationFromPlan(plan: any) {
  if (Array.isArray(plan?.chunks)) {
    return plan.chunks.reduce((total: number, chunk: any) => total + Math.max(0, Number(chunk?.duration_ms || 0)), 0);
  }
  if (Array.isArray(plan?.sections)) {
    return plan.sections.reduce((total: number, section: any) => total + Math.max(0, Number(section?.duration_ms || 0)), 0);
  }
  return 0;
}

function detectsInstrumental(description: string) {
  return /\b(instrumental|sans\s+voix|no\s+vocals?|beat\s+only|instrumentale?)\b/i.test(description);
}

export async function createElevenMusicPlan(description: string): Promise<ElevenMusicPlan> {
  const key = requireApiKey();
  const prompt = description.trim().slice(0, 4100);
  if (!prompt) throw Object.assign(new Error('La description musicale est requise.'), { status: 400 });

  const response = await fetch('https://api.elevenlabs.io/v1/music/plan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': key,
      'User-Agent': 'mungwele-ia-studio/1.0',
    },
    body: JSON.stringify({ prompt, model_id: 'music_v2' }),
  });

  if (!response.ok) {
    const message = await providerError(response);
    throw Object.assign(new Error(message), {
      status: response.status,
      code: response.status === 429 ? 'ELEVEN_MUSIC_RATE_LIMIT' : 'ELEVEN_MUSIC_PLAN_ERROR',
    });
  }

  const compositionPlan = await response.json() as Record<string, unknown>;
  const durationMs = durationFromPlan(compositionPlan);
  if (!durationMs) {
    throw Object.assign(new Error("Eleven Music n'a pas pu déterminer la structure du morceau."), {
      status: 502,
      code: 'ELEVEN_MUSIC_INVALID_PLAN',
    });
  }

  return {
    compositionPlan,
    durationMs,
    instrumental: detectsInstrumental(prompt),
  };
}

export async function generateElevenMusicFromPlan(plan: ElevenMusicPlan) {
  const key = requireApiKey();
  const url = new URL('https://api.elevenlabs.io/v1/music');
  url.searchParams.set('output_format', 'mp3_48000_192');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': key,
      'User-Agent': 'mungwele-ia-studio/1.0',
    },
    body: JSON.stringify({
      composition_plan: plan.compositionPlan,
      model_id: 'music_v2',
      store_for_inpainting: false,
      sign_with_c2pa: true,
    }),
  });

  if (!response.ok) {
    const message = await providerError(response);
    throw Object.assign(new Error(message), {
      status: response.status,
      code: response.status === 429 ? 'ELEVEN_MUSIC_RATE_LIMIT' : 'ELEVEN_MUSIC_API_ERROR',
    });
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) {
    throw Object.assign(new Error("Eleven Music n'a retourné aucun fichier audio."), {
      status: 502,
      code: 'ELEVEN_MUSIC_EMPTY_OUTPUT',
    });
  }

  const outputDir = path.join(process.cwd(), 'generated', 'music');
  await fs.mkdir(outputDir, { recursive: true });
  const filename = `eleven-music-${Date.now()}.mp3`;
  await fs.writeFile(path.join(outputDir, filename), bytes);

  return {
    provider: 'ElevenLabs',
    model: 'music_v2',
    songId: response.headers.get('song-id') || undefined,
    durationSeconds: Math.max(1, Math.round(plan.durationMs / 1000)),
    resultUrl: `/generated/music/${filename}`,
  };
}
