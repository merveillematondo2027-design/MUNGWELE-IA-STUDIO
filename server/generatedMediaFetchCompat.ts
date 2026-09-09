import { promises as fs } from 'node:fs';
import path from 'node:path';

let installed = false;

function contentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  return 'application/octet-stream';
}

function generatedPath(value: string) {
  const normalized = value.replace(/\\/g, '/');
  if (!normalized.startsWith('/generated/')) return null;
  const relative = normalized.slice('/generated/'.length);
  const root = path.resolve(process.cwd(), 'generated');
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return null;
  return candidate;
}

export function installGeneratedMediaFetchCompat() {
  if (installed) return;
  installed = true;
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const localPath = generatedPath(raw);
    if (!localPath) return nativeFetch(input, init);

    try {
      const bytes = await fs.readFile(localPath);
      return new Response(bytes, {
        status: 200,
        headers: {
          'content-type': contentType(localPath),
          'content-length': String(bytes.length),
          'cache-control': 'private, no-store',
        },
      });
    } catch {
      return new Response('Generated media not found', { status: 404 });
    }
  }) as typeof fetch;
}
