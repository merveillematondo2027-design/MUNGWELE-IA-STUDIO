import express, { type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';
import { adminAuth, adminDb } from './firebaseAdmin';

const originalGet = express.application.get;
let installed = false;

type Kind = 'image'|'video'|'clips'|'music';
type OutputInfo = { ext:string; mime:string; height?:number; width?:number; bitrate?:string };
type Requester = { uid:string; role:string; plan:string; level:number };
type DownloadTicket = {
  requester: Requester;
  generationId: string;
  format: string;
  community: boolean;
  expiresAt: number;
};

const FORMAT_LEVEL: Record<string, number> = {
  'video-480':0,'video-780':1,'video-1080':2,'video-1440':3,'video-2160':3,
  'image-jpg-1024':0,'image-webp-1600':1,'image-png-2048':2,'image-png-4096':3,
  'audio-mp3-128':0,'audio-mp3-192':1,'audio-mp3-320':2,'audio-wav':3,
};

const downloadTickets = new Map<string, DownloadTicket>();
const DOWNLOAD_TICKET_TTL_MS = 2 * 60 * 1000;

function pruneTickets() {
  const now = Date.now();
  for (const [ticket, value] of downloadTickets.entries()) {
    if (value.expiresAt <= now) downloadTickets.delete(ticket);
  }
}

function queryValue(req: Request, key: string) {
  const query = (req as Request & { query?: Record<string, unknown> }).query || {};
  const value = query[key];
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '');
}

async function authenticatedUser(req: Request): Promise<Requester | null> {
  const header = String(req.headers?.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const decoded = await adminAuth.verifyIdToken(token);
  const snap = await adminDb.collection('users').doc(decoded.uid).get();
  const data = snap.data() || {};
  const role = data.role === 'admin' || decoded.admin === true ? 'admin' : 'user';
  const plan = String(data.plan || 'free');
  const level = role === 'admin' || plan === 'studio' ? 3 : plan === 'pro' ? 2 : plan === 'creator' ? 1 : 0;
  return { uid: decoded.uid, role, plan, level };
}

function outputInfo(format: string): OutputInfo | null {
  if (format === 'video-480') return { ext:'mp4', mime:'video/mp4', height:480 };
  if (format === 'video-780') return { ext:'mp4', mime:'video/mp4', height:780 };
  if (format === 'video-1080') return { ext:'mp4', mime:'video/mp4', height:1080 };
  if (format === 'video-1440') return { ext:'mp4', mime:'video/mp4', height:1440 };
  if (format === 'video-2160') return { ext:'mp4', mime:'video/mp4', height:2160 };
  if (format === 'image-jpg-1024') return { ext:'jpg', mime:'image/jpeg', width:1024 };
  if (format === 'image-webp-1600') return { ext:'webp', mime:'image/webp', width:1600 };
  if (format === 'image-png-2048') return { ext:'png', mime:'image/png', width:2048 };
  if (format === 'image-png-4096') return { ext:'png', mime:'image/png', width:4096 };
  if (format === 'audio-mp3-128') return { ext:'mp3', mime:'audio/mpeg', bitrate:'128k' };
  if (format === 'audio-mp3-192') return { ext:'mp3', mime:'audio/mpeg', bitrate:'192k' };
  if (format === 'audio-mp3-320') return { ext:'mp3', mime:'audio/mpeg', bitrate:'320k' };
  if (format === 'audio-wav') return { ext:'wav', mime:'audio/wav', bitrate:'' };
  return null;
}

function xml(value: string) {
  return value.replace(/[<>&"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c] || c));
}

function cleanPublicName(value: unknown) {
  return String(value || '')
    .replace(/^@+/, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28);
}

async function resolveOwnerName(generation: any) {
  const explicit = cleanPublicName(
    generation.authorName
    || generation.userNickname
    || generation.ownerName
    || generation.nickname
    || generation.username
    || generation.displayName,
  );
  if (explicit) return explicit;

  const userId = String(generation.userId || '').trim();
  if (!userId) return 'Créateur MUNGWELE';

  try {
    const [mdigiSnap, userSnap] = await Promise.all([
      adminDb.collection('mdigiProfiles').doc(userId).get(),
      adminDb.collection('users').doc(userId).get(),
    ]);

    const mdigi = mdigiSnap.data() || {};
    const user = userSnap.data() || {};
    const nickname = cleanPublicName(mdigi.nickname);
    if (nickname) return nickname;

    const fallbackName = cleanPublicName(
      user.nickname
      || user.displayName
      || user.name
      || user.fullName,
    );
    if (fallbackName) return fallbackName;
  } catch (error) {
    console.warn('[MEDIA_DOWNLOAD_OWNER_NAME_WARNING]', error);
  }

  return 'Créateur MUNGWELE';
}

async function watermarkBuffer(ownerName: string) {
  const markPath = path.join(process.cwd(), 'src/assets/mungwele-ai-official-mark.svg');
  let mark = '';
  try {
    mark = await fs.readFile(markPath, 'utf8');
  } catch {
    mark = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="5" y="65" font-size="60" fill="white">M</text></svg>';
  }

  const encoded = Buffer.from(mark).toString('base64');
  const nickname = cleanPublicName(ownerName) || 'Créateur MUNGWELE';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="430" height="120">
      <defs>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#ff39d0"/>
          <stop offset=".48" stop-color="#6c57ff"/>
          <stop offset="1" stop-color="#18e86a"/>
        </linearGradient>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".85"/>
        </filter>
      </defs>
      <g filter="url(#shadow)" opacity=".96">
        <image href="data:image/svg+xml;base64,${encoded}" x="0" y="12" width="82" height="82" preserveAspectRatio="xMidYMid meet"/>
        <text x="92" y="48" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="800" fill="#fff">MUNGWELE AI</text>
        <text x="92" y="83" font-family="Arial,Helvetica,sans-serif" font-size="25" font-weight="700" fill="#fff">@${xml(nickname)}</text>
        <rect x="92" y="95" width="184" height="5" rx="2.5" fill="url(#accent)"/>
      </g>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function runFfmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error('Convertisseur vidéo/audio indisponible.');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio:['ignore','ignore','pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); if (stderr.length > 12000) stderr = stderr.slice(-12000); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve();
      console.warn('[MEDIA_FFMPEG_ERROR]', { code, args: args.filter((value) => !value.includes('comment=')), stderr: stderr.slice(-4000) });
      reject(new Error('La conversion du média a échoué. Réessayez avec une autre qualité ou dans quelques instants.'));
    });
  });
}

async function transcode(input: Buffer, kind: Kind, format: string, community: boolean, ownerName: string) {
  const info = outputInfo(format);
  if (!info) throw new Error('Format de téléchargement invalide.');

  if (kind === 'image') {
    let pipeline = sharp(input).resize({ width: info.width || 1024, withoutEnlargement: false, fit:'inside' });
    if (community) {
      const wm = await watermarkBuffer(ownerName);
      const meta = await pipeline.metadata();
      const targetWidth = Math.min(460, Math.max(200, Math.round((meta.width || info.width || 1024) * 0.38)));
      const resized = await sharp(wm).resize({ width: targetWidth }).png().toBuffer();
      pipeline = pipeline.composite([{ input: resized, gravity:'southeast', blend:'over' }]);
    }
    if (info.ext === 'jpg') return { bytes: await pipeline.jpeg({ quality:90 }).toBuffer(), ...info };
    if (info.ext === 'webp') return { bytes: await pipeline.webp({ quality:92 }).toBuffer(), ...info };
    return { bytes: await pipeline.png().toBuffer(), ...info };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mungwele-download-'));
  const inputPath = path.join(dir, kind === 'music' ? 'input.audio' : 'input.video');
  const outputPath = path.join(dir, `output.${info.ext}`);

  try {
    await fs.writeFile(inputPath, input);

    if (kind === 'music') {
      const args = ['-y', '-i', inputPath];
      if (info.ext === 'wav') args.push('-c:a', 'pcm_s16le', '-f', 'wav');
      else args.push('-c:a', 'libmp3lame', '-b:a', info.bitrate || '192k', '-f', 'mp3');
      if (community) {
        args.push(
          '-metadata', `artist=MUNGWELE AI • ${ownerName}`,
          '-metadata', `comment=Téléchargé depuis la communauté MUNGWELE AI • Propriétaire: ${ownerName}`,
        );
      }
      args.push(outputPath);
      await runFfmpeg(args);
    } else {
      const height = info.height || 480;
      const wmHeight = Math.max(40, Math.min(92, Math.round(height * 0.09)));
      const padding = Math.max(10, Math.min(30, Math.round(height * 0.025)));
      const wmPath = path.join(dir, 'watermark.png');

      await fs.writeFile(wmPath, await watermarkBuffer(ownerName));

      const args = [
        '-y',
        '-i', inputPath,
        '-i', wmPath,
        '-filter_complex',
        `[0:v]scale=-2:${height}:flags=lanczos[base];[1:v]scale=-1:${wmHeight}[wm];[base][wm]overlay=${padding}:H-h-${padding}:format=auto[outv]`,
        '-map', '[outv]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-metadata', `artist=MUNGWELE AI • ${ownerName}`,
        '-metadata', `comment=Vidéo signée automatiquement par MUNGWELE AI • @${ownerName}`,
        '-movflags', '+faststart',
        '-f', 'mp4',
        outputPath,
      ];

      await runFfmpeg(args);
    }

    return { bytes: await fs.readFile(outputPath), ...info };
  } finally {
    await fs.rm(dir, { recursive:true, force:true }).catch(() => undefined);
  }
}

async function loadAuthorizedGeneration(requester: Requester, generationId: string, format: string, community: boolean) {
  if (!generationId || !(format in FORMAT_LEVEL)) {
    throw Object.assign(new Error('Paramètres de téléchargement invalides.'), { status: 400 });
  }

  const requiredLevel = FORMAT_LEVEL[format];
  if (requiredLevel > requester.level) {
    throw Object.assign(new Error(`Ce format nécessite un abonnement niveau ${requiredLevel}.`), { status: 403 });
  }

  const snap = await adminDb.collection('generations').doc(generationId).get();
  if (!snap.exists) throw Object.assign(new Error('Création introuvable.'), { status: 404 });

  const generation:any = { id:snap.id, ...snap.data() };
  const kind = generation.type as Kind;
  if (!['image','video','clips','music'].includes(kind)) {
    throw Object.assign(new Error('Type de création non téléchargeable.'), { status: 415 });
  }

  if (community) {
    if (generation.isPublic !== true || generation.allowCommunityDownload !== true) {
      throw Object.assign(new Error('Le propriétaire n’autorise pas le téléchargement de cette publication.'), { status: 403 });
    }
  } else if (generation.userId !== requester.uid && requester.role !== 'admin') {
    throw Object.assign(new Error('Cette création ne vous appartient pas.'), { status: 403 });
  }

  return { generation, kind };
}

async function sendMedia(requester: Requester, generationId: string, format: string, community: boolean, res: Response) {
  const { generation, kind } = await loadAuthorizedGeneration(requester, generationId, format, community);
  const source = String(generation.resultUrl || '');
  if (!source) throw Object.assign(new Error('Fichier source indisponible.'), { status: 404 });

  const upstream = await fetch(source);
  if (!upstream.ok) throw Object.assign(new Error('Impossible de récupérer le fichier source.'), { status: 502 });

  const input = Buffer.from(await upstream.arrayBuffer());
  const ownerName = await resolveOwnerName(generation);
  const output = await transcode(input, kind, format, community, ownerName);
  const safeTitle = String(generation.title || 'creation').replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 60) || 'creation';
  const filename = `${community ? 'mungwele-community' : 'mungwele'}-${safeTitle}.${output.ext}`;

  res.setHeader('Content-Type', output.mime);
  res.setHeader('Content-Length', String(output.bytes.length));
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Transfer-Encoding', 'binary');
  return res.send(output.bytes);
}

async function mediaDownloadHandler(req: Request, res: Response) {
  try {
    pruneTickets();

    const ticketId = queryValue(req, 'ticket');
    if (ticketId) {
      const ticket = downloadTickets.get(ticketId);
      downloadTickets.delete(ticketId);
      if (!ticket || ticket.expiresAt <= Date.now()) {
        return res.status(410).json({ error:'Le lien de téléchargement a expiré. Relancez le téléchargement depuis MUNGWELE IA STUDIO.' });
      }
      return await sendMedia(ticket.requester, ticket.generationId, ticket.format, ticket.community, res);
    }

    const requester = await authenticatedUser(req);
    if (!requester) return res.status(401).json({ error:'Connexion requise pour télécharger.' });

    const generationId = queryValue(req, 'generationId');
    const format = queryValue(req, 'format');
    const community = queryValue(req, 'community') === '1';

    if (queryValue(req, 'prepare') === '1') {
      await loadAuthorizedGeneration(requester, generationId, format, community);
      const ticket = randomUUID();
      downloadTickets.set(ticket, {
        requester,
        generationId,
        format,
        community,
        expiresAt: Date.now() + DOWNLOAD_TICKET_TTL_MS,
      });
      return res.json({
        downloadUrl: `/api/media/download?ticket=${encodeURIComponent(ticket)}`,
        expiresInSeconds: Math.round(DOWNLOAD_TICKET_TTL_MS / 1000),
      });
    }

    return await sendMedia(requester, generationId, format, community, res);
  } catch (error:any) {
    console.warn('[MEDIA_DOWNLOAD_WARNING]', error);
    const status = Number(error?.status || 500);
    if (res && typeof (res as Response).status === 'function') {
      return res.status(status >= 400 && status < 600 ? status : 500).json({ error:error?.message || 'Téléchargement impossible.' });
    }
    throw error;
  }
}

export function installMediaDownload() {
  if (installed) return;
  installed = true;

  express.application.get = function patchedGet(route: any, ...handlers: any[]) {
    const isRealRouteDeclaration = typeof route === 'string' && route.startsWith('/') && handlers.length > 0;

    if (!isRealRouteDeclaration) {
      return originalGet.call(this, route, ...handlers);
    }

    express.application.get = originalGet;
    originalGet.call(this, '/api/media/download', mediaDownloadHandler);
    return originalGet.call(this, route, ...handlers);
  } as any;
}
