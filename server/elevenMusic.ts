import { promises as fs } from 'fs';
import path from 'path';

export type MusicDurationSeconds = 30 | 60 | 120;

export interface ElevenMusicOptions {
  prompt: string;
  genre?: string;
  mood?: string;
  durationSeconds: MusicDurationSeconds;
  instrumental?: boolean;
  lyrics?: string;
}

function apiKey() {
  return process.env.ELEVENLABS_API_KEY || process.env.MUSIC_PROVIDER_API_KEY || '';
}

function buildPrompt(options: ElevenMusicOptions) {
  const description = options.prompt.trim();
  const parts = [
    'Create one original, production-ready music track from the following user description.',
    description,
    `Target duration: ${options.durationSeconds} seconds.`,
  ];

  if (options.instrumental) {
    parts.push('The user explicitly requests an instrumental track. Do not add singing, spoken words, or vocal ad-libs.');
  }

  if (options.lyrics?.trim()) {
    parts.push('Use these original lyrics when appropriate:');
    parts.push(options.lyrics.trim());
  }

  return parts.join('\n').slice(0, 4100);
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

export async function generateElevenMusic(options: ElevenMusicOptions) {
  const key = apiKey();
  if (!key) {
    throw Object.assign(new Error('Clé ElevenLabs Music absente côté serveur.'), {
      status: 503,
      code: 'ELEVEN_MUSIC_NOT_CONFIGURED',
    });
  }

  const prompt = buildPrompt(options);
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
      prompt,
      music_length_ms: options.durationSeconds * 1000,
      model_id: 'music_v2',
      force_instrumental: options.instrumental === true,
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
    durationSeconds: options.durationSeconds,
    resultUrl: `/generated/music/${filename}`,
  };
}
