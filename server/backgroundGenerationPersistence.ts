import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { adminAuth, adminDb, adminStorage } from './firebaseAdmin';

const TARGETS = new Map([
  ['/api/generate/image', 'image'],
  ['/api/generate/video', 'video'],
]);

const originalPost = express.application.post;
let installed = false;

function iso() { return new Date().toISOString(); }

function extensionFor(type: string, mime = '') {
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  return type === 'image' ? 'png' : 'mp4';
}

async function authenticatedUid(req: Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const decoded = await adminAuth.verifyIdToken(token);
  return decoded.uid;
}

async function persistMedia(userId: string, generation: any) {
  const source = String(generation?.resultUrl || '');
  if (!source || source.includes('firebasestorage.googleapis.com')) return generation;
  try {
    let bytes: Buffer;
    let mime = '';
    if (source.startsWith('data:')) {
      const match = /^data:([^;]+);base64,(.+)$/s.exec(source);
      if (!match) return generation;
      mime = match[1];
      bytes = Buffer.from(match[2], 'base64');
    } else {
      const response = await fetch(source);
      if (!response.ok) return generation;
      mime = response.headers.get('content-type') || '';
      bytes = Buffer.from(await response.arrayBuffer());
    }
    const ext = extensionFor(generation.type, mime);
    const token = randomUUID();
    const objectPath = `users/${userId}/generations/${generation.id}/result.${ext}`;
    const file = adminStorage.bucket().file(objectPath);
    await file.save(bytes, { resumable: false, contentType: mime || undefined, metadata: { metadata: { firebaseStorageDownloadTokens: token } } });
    const bucket = adminStorage.bucket().name;
    const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
    return { ...generation, resultUrl: url, thumbnailUrl: generation.type === 'image' ? url : (generation.thumbnailUrl || url) };
  } catch (error) {
    console.warn('[BACKGROUND_MEDIA_PERSISTENCE_WARNING]', error);
    return generation;
  }
}

async function settleBilling(userId: string, generation: any) {
  if (!userId || !generation?.id) return;
  const cost = Math.max(0, Number(generation.creditsUsed || 0));
  if (!cost) return;
  const userRef = adminDb.collection('users').doc(userId);
  const txRef = adminDb.collection('creditTransactions').doc(`tx-${generation.id}`);
  const genRef = adminDb.collection('generations').doc(generation.id);
  await adminDb.runTransaction(async (transaction) => {
    const [userSnap, txSnap] = await Promise.all([transaction.get(userRef), transaction.get(txRef)]);
    if (txSnap.exists) {
      transaction.set(genRef, { billingPending: false, updatedAt: iso() }, { merge: true });
      return;
    }
    if (!userSnap.exists) return;
    const data = userSnap.data() || {};
    const current = Math.max(0, Number(data.credits || 0));
    const next = Math.max(0, current - cost);
    const total = Math.max(0, Number(data.totalGenerations || 0)) + 1;
    transaction.set(userRef, { credits: next, totalGenerations: total, updatedAt: iso() }, { merge: true });
    transaction.set(txRef, { userId, amount: -Math.min(cost, current), type: 'generation', description: `${generation.type} — ${generation.title || generation.model || 'génération IA'}`, balanceAfter: next, createdAt: iso(), source: 'background-server' });
    transaction.set(genRef, { billingPending: false, updatedAt: iso() }, { merge: true });
  });
}

async function reconcilePendingBilling() {
  try {
    const cutoff = Date.now() - 2 * 60 * 1000;
    const snapshot = await adminDb.collection('generations').where('billingPending', '==', true).limit(30).get();
    for (const doc of snapshot.docs) {
      const data: any = doc.data();
      const created = new Date(data.createdAt || data.updatedAt || 0).getTime();
      if (created && created > cutoff) continue;
      await settleBilling(String(data.userId || ''), { id: doc.id, ...data }).catch((error) => console.warn('[BACKGROUND_BILLING_RECONCILE_WARNING]', error));
    }
  } catch (error) {
    console.warn('[BACKGROUND_RECONCILE_SKIPPED]', error);
  }
}

function backgroundGenerationMiddleware(kind: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let uid: string | null = null;
    try {
      uid = await authenticatedUid(req);
      if (!uid) return res.status(401).json({ error: 'Session Firebase requise pour lancer une génération en arrière-plan.', code: 'AUTH_REQUIRED' });
      if (req.body?.userId && req.body.userId !== uid) return res.status(403).json({ error: 'Identité utilisateur incohérente.', code: 'USER_MISMATCH' });
      req.body = { ...(req.body || {}), userId: uid };
    } catch {
      return res.status(401).json({ error: 'Session Firebase invalide ou expirée.', code: 'INVALID_AUTH' });
    }

    const jobId = `job-${kind}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const jobRef = adminDb.collection('generationJobs').doc(jobId);
    try {
      await jobRef.set({ id: jobId, userId: uid, type: kind, status: 'processing', progress: 5, promptPreview: String(req.body?.prompt || '').slice(0, 160), createdAt: iso(), updatedAt: iso() });
    } catch (error) {
      console.warn('[BACKGROUND_JOB_CREATE_WARNING]', error);
    }

    const originalJson = res.json.bind(res);
    let sent = false;
    res.json = ((body: any) => {
      if (sent) return res;
      sent = true;
      void (async () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300 && body?.generation) {
            const persisted = await persistMedia(uid!, { ...body.generation, userId: uid, billingPending: true, backgroundJobId: jobId });
            await adminDb.collection('generations').doc(persisted.id).set({ ...persisted, userId: uid, billingPending: true, backgroundJobId: jobId, updatedAt: iso() }, { merge: true });
            await jobRef.set({ status: 'completed', progress: 100, generationId: persisted.id, resultUrl: persisted.resultUrl, completedAt: iso(), updatedAt: iso() }, { merge: true });
            body = { ...body, generation: persisted, backgroundJobId: jobId, backgroundAccepted: true };
            setTimeout(() => void settleBilling(uid!, persisted).catch((error) => console.warn('[BACKGROUND_BILLING_WARNING]', error)), 120_000);
          } else {
            await jobRef.set({ status: 'failed', progress: 100, error: String(body?.error || 'Génération échouée'), updatedAt: iso() }, { merge: true });
          }
        } catch (error) {
          console.warn('[BACKGROUND_PERSISTENCE_WARNING]', error);
        } finally {
          originalJson(body);
        }
      })();
      return res;
    }) as any;
    next();
  };
}

export function installBackgroundGenerationPersistence() {
  if (installed) return;
  installed = true;
  express.application.post = function patchedPost(path: any, ...handlers: any[]) {
    const kind = typeof path === 'string' ? TARGETS.get(path) : undefined;
    if (kind) return originalPost.call(this, path, backgroundGenerationMiddleware(kind), ...handlers);
    return originalPost.call(this, path, ...handlers);
  } as any;
  setTimeout(() => void reconcilePendingBilling(), 5000);
  const timer = setInterval(() => void reconcilePendingBilling(), 60_000);
  timer.unref?.();
}
