import { promises as fs } from 'node:fs';
import path from 'node:path';

export type LoadedMediaSource = {
  bytes: Buffer;
  mime: string;
};

function mimeFromPath(value: string) {
  const ext = path.extname(value).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  return 'application/octet-stream';
}

function localGeneratedPath(source: string) {
  const normalized = source.replace(/\\/g, '/');
  if (!normalized.startsWith('/generated/') && !normalized.startsWith('generated/')) return null;
  const relative = normalized.replace(/^\/?generated\//, '');
  const root = path.resolve(process.cwd(), 'generated');
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error('Chemin média local invalide.');
  }
  return candidate;
}

export async function loadMediaSource(source: string): Promise<LoadedMediaSource> {
  const value = String(source || '').trim();
  if (!value) throw new Error('Source média vide.');

  if (value.startsWith('data:')) {
    const match = /^data:([^;]+);base64,(.+)$/s.exec(value);
    if (!match) throw new Error('Source média data URL invalide.');
    return { mime: match[1], bytes: Buffer.from(match[2], 'base64') };
  }

  const localPath = localGeneratedPath(value);
  if (localPath) {
    return { bytes: await fs.readFile(localPath), mime: mimeFromPath(localPath) };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`URL média invalide: ${value.slice(0, 120)}`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Protocole média non autorisé.');

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Source média inaccessible (${response.status}).`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    mime: response.headers.get('content-type') || mimeFromPath(url.pathname),
  };
}
