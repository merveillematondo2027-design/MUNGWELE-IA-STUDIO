import express, { type Request, type Response } from 'express';
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
const FORMAT_LEVEL: Record<string, number> = {
  'video-480':0,'video-780':1,'video-1080':2,'video-1440':3,'video-2160':3,
  'image-jpg-1024':0,'image-webp-1600':1,'image-png-2048':2,'image-png-4096':3,
  'audio-mp3-128':0,'audio-mp3-192':1,'audio-mp3-320':2,'audio-wav':3,
};

async function authenticatedUser(req: Request) {
  const header = String(req.headers.authorization || '');
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

function outputInfo(format: string) {
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

function xml(value: string) { return value.replace(/[<>&"']/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c] || c)); }

async function watermarkBuffer(ownerName: string) {
  const markPath = path.join(process.cwd(), 'src/assets/mungwele-ai-official-mark.svg');
  let mark = '';
  try { mark = await fs.readFile(markPath, 'utf8'); } catch { mark = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><text x="5" y="65" font-size="60" fill="white">M</text></svg>'; }
  const encoded = Buffer.from(mark).toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="110"><rect width="640" height="110" rx="20" fill="rgba(0,0,0,.50)"/><image href="data:image/svg+xml;base64,${encoded}" x="14" y="15" width="78" height="78"/><text x="108" y="48" font-family="Arial,sans-serif" font-size="27" font-weight="700" fill="white">MUNGWELE AI</text><text x="108" y="80" font-family="Arial,sans-serif" font-size="22" fill="white">@${xml(ownerName || 'Créateur MUNGWELE')}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function runFfmpeg(args: string[]) {
  if (!ffmpegPath) throw new Error('Convertisseur vidéo/audio indisponible.');
  await new Promise<void>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio:['ignore','ignore','pipe'] });
    let stderr=''; child.stderr.on('data',(chunk)=>{stderr += String(chunk).slice(-4000);});
    child.on('error',reject); child.on('close',(code)=>code===0?resolve():reject(new Error(`Conversion média échouée (${code}). ${stderr.slice(-900)}`)));
  });
}

async function transcode(input: Buffer, kind: Kind, format: string, community: boolean, ownerName: string) {
  const info = outputInfo(format); if (!info) throw new Error('Format de téléchargement invalide.');
  if (kind === 'image') {
    let pipeline = sharp(input).resize({ width: info.width, withoutEnlargement: false, fit:'inside' });
    if (community) {
      const wm = await watermarkBuffer(ownerName);
      const meta = await pipeline.metadata();
      const targetWidth = Math.min(560, Math.max(220, Math.round((meta.width || info.width || 1024) * 0.42)));
      const resized = await sharp(wm).resize({ width: targetWidth }).png().toBuffer();
      pipeline = pipeline.composite([{ input: resized, gravity:'southeast', blend:'over' }]);
    }
    if (info.ext === 'jpg') return { bytes: await pipeline.jpeg({ quality:90 }).toBuffer(), ...info };
    if (info.ext === 'webp') return { bytes: await pipeline.webp({ quality:92 }).toBuffer(), ...info };
    return { bytes: await pipeline.png().toBuffer(), ...info };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'mungwele-download-'));
  const inputPath = path.join(dir, kind === 'music' ? 'input.audio' : 'input.video');
  const outputPath = path.join(dir, `output.${info.ext}`);
  try {
    await fs.writeFile(inputPath,input);
    if (kind === 'music') {
      const args = ['-y','-i',inputPath];
      if (info.ext === 'wav') args.push('-c:a','pcm_s16le'); else args.push('-c:a','libmp3lame','-b:a',info.bitrate || '192k');
      if (community) args.push('-metadata','artist',`MUNGWELE AI • ${ownerName}`,'-metadata','comment',`Téléchargé depuis la communauté MUNGWELE AI • Propriétaire: ${ownerName}`);
      args.push(outputPath); await runFfmpeg(args);
    } else {
      const args = ['-y','-i',inputPath];
      let filter = `scale=-2:${info.height}:flags=lanczos`;
      if (community) {
        const wmPath = path.join(dir,'watermark.png'); await fs.writeFile(wmPath,await watermarkBuffer(ownerName));
        args.push('-i',wmPath);
        filter = `[0:v]scale=-2:${info.height}:flags=lanczos[base];[1:v]scale='min(560,iw)':'-1'[wm];[base][wm]overlay=W-w-24:H-h-24`;
        args.push('-filter_complex',filter,'-map','0:a?');
      } else args.push('-vf',filter);
      args.push('-c:v','libx264','-preset','veryfast','-crf','20','-c:a','aac','-b:a','160k','-movflags','+faststart',outputPath);
      await runFfmpeg(args);
    }
    return { bytes: await fs.readFile(outputPath), ...info };
  } finally { await fs.rm(dir,{recursive:true,force:true}).catch(()=>undefined); }
}

export function installMediaDownload() {
  if (installed) return; installed = true;
  express.application.get = function patchedGet(route: any, ...handlers: any[]) {
    if (route !== '/api/media/download') return originalGet.call(this, route, ...handlers);
    return originalGet.call(this, route, async (req: Request, res: Response) => {
      try {
        const requester = await authenticatedUser(req);
        if (!requester) return res.status(401).json({ error:'Connexion requise pour télécharger.' });
        const generationId = String(req.query.generationId || ''); const format = String(req.query.format || ''); const community = String(req.query.community || '') === '1';
        if (!generationId || !(format in FORMAT_LEVEL)) return res.status(400).json({ error:'Paramètres de téléchargement invalides.' });
        const requiredLevel = FORMAT_LEVEL[format]; if (requiredLevel > requester.level) return res.status(403).json({ error:`Ce format nécessite un abonnement niveau ${requiredLevel}.` });
        const snap = await adminDb.collection('generations').doc(generationId).get(); if (!snap.exists) return res.status(404).json({ error:'Création introuvable.' });
        const generation:any = { id:snap.id, ...snap.data() }; const kind = generation.type as Kind;
        if (!['image','video','clips','music'].includes(kind)) return res.status(415).json({ error:'Type de création non téléchargeable.' });
        if (community) {
          if (generation.isPublic !== true || generation.allowCommunityDownload !== true) return res.status(403).json({ error:'Le propriétaire n’autorise pas le téléchargement de cette publication.' });
        } else if (generation.userId !== requester.uid && requester.role !== 'admin') return res.status(403).json({ error:'Cette création ne vous appartient pas.' });
        const source = String(generation.resultUrl || ''); if (!source) return res.status(404).json({ error:'Fichier source indisponible.' });
        const upstream = await fetch(source); if (!upstream.ok) return res.status(502).json({ error:'Impossible de récupérer le fichier source.' });
        const input = Buffer.from(await upstream.arrayBuffer());
        const ownerName = String(generation.authorName || generation.ownerName || 'Créateur MUNGWELE');
        const output = await transcode(input, kind, format, community, ownerName);
        const safeTitle = String(generation.title || 'creation').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,60);
        const filename = `${community?'mungwele-community':'mungwele'}-${safeTitle}.${output.ext}`;
        res.setHeader('Content-Type',output.mime); res.setHeader('Content-Length',String(output.bytes.length)); res.setHeader('Content-Disposition',`attachment; filename="${filename}"`); res.setHeader('Cache-Control','private, no-store');
        return res.send(output.bytes);
      } catch (error:any) { console.warn('[MEDIA_DOWNLOAD_WARNING]',error); return res.status(500).json({ error:error?.message || 'Téléchargement impossible.' }); }
    }, ...handlers);
  } as any;
}
