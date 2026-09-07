import type { Request, Response } from 'express';
import express from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';
import { addGoogleProviderDeposit, readGoogleProviderWallet } from './providerWallet';

let installed = false;
const attachedApps = new WeakSet<object>();

async function requireAdmin(req: Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Session administrateur requise.'), { status: 401 });
  const token = header.slice(7).trim();
  const decoded = await adminAuth.verifyIdToken(token);
  if (decoded.admin === true || decoded.email === 'merveillematondo2027@gmail.com') return decoded.uid;
  const profile = await adminDb.collection('users').doc(decoded.uid).get();
  if (profile.exists && profile.data()?.role === 'admin') return decoded.uid;
  throw Object.assign(new Error('Accès administrateur requis.'), { status: 403 });
}

function sendError(res: Response, error: any) {
  const status = Number(error?.status || 500);
  return res.status(status === 400 || status === 401 || status === 403 ? status : 500).json({ error: String(error?.message || 'Erreur magasin API.') });
}

export function installProviderWalletAdminApi() {
  if (installed) return;
  installed = true;

  // Capture the current methods when this installer runs. backgroundGenerationPersistence
  // is installed first, so POST generation wrapping remains intact.
  const currentGet = express.application.get;
  const currentPost = express.application.post;

  const attachRoutes = (app: any) => {
    if (attachedApps.has(app)) return;
    attachedApps.add(app);

    currentGet.call(app, '/api/admin/provider-wallet/google', async (req: Request, res: Response) => {
      try {
        await requireAdmin(req);
        return res.json(await readGoogleProviderWallet());
      } catch (error) {
        return sendError(res, error);
      }
    });

    currentPost.call(app, '/api/admin/provider-wallet/google/deposit', async (req: Request, res: Response) => {
      try {
        const uid = await requireAdmin(req);
        const amountUsd = Number(req.body?.amountUsd);
        return res.json(await addGoogleProviderDeposit(amountUsd, uid));
      } catch (error) {
        return sendError(res, error);
      }
    });
  };

  express.application.get = function patchedGet(path: any, ...handlers: any[]) {
    attachRoutes(this);
    return currentGet.call(this, path, ...handlers);
  } as any;

  express.application.post = function patchedPost(path: any, ...handlers: any[]) {
    attachRoutes(this);
    return currentPost.call(this, path, ...handlers);
  } as any;
}
