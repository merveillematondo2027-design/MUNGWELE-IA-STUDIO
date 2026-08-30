import express, { type Request, type Response } from 'express';

const originalGet = express.application.get;
let installed = false;

function safeFirebaseMediaUrl(raw: unknown) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com') return null;
    return url;
  } catch { return null; }
}

export function installMediaDownload() {
  if (installed) return;
  installed = true;
  express.application.get = function patchedGet(path: any, ...handlers: any[]) {
    if (path === '/api/media/download') {
      return originalGet.call(this, path, async (req: Request, res: Response) => {
        const source = safeFirebaseMediaUrl(req.query.url);
        if (!source) return res.status(400).json({ error: 'URL média non autorisée.' });
        try {
          const upstream = await fetch(source);
          if (!upstream.ok) return res.status(upstream.status).json({ error: 'Média indisponible.' });
          const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
          if (!contentType.startsWith('image/') && !contentType.startsWith('video/') && !contentType.startsWith('audio/')) return res.status(415).json({ error: 'Type de média non autorisé.' });
          const bytes = Buffer.from(await upstream.arrayBuffer());
          const requested = typeof req.query.name === 'string' ? req.query.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120) : 'mungwele-media';
          const ext = contentType.includes('png') ? '.png' : contentType.includes('jpeg') ? '.jpg' : contentType.includes('webp') ? '.webp' : contentType.includes('mp4') ? '.mp4' : contentType.includes('mpeg') ? '.mp3' : '';
          const filename = requested.includes('.') ? requested : `${requested}${ext}`;
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Length', String(bytes.length));
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Cache-Control', 'private, max-age=3600');
          return res.send(bytes);
        } catch (error) {
          console.warn('[MEDIA_DOWNLOAD_WARNING]', error);
          return res.status(502).json({ error: 'Téléchargement du média impossible.' });
        }
      }, ...handlers);
    }
    return originalGet.call(this, path, ...handlers);
  } as any;
}
