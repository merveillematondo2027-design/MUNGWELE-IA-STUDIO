import express, { type NextFunction, type Request, type Response } from 'express';
import { adminAuth, adminDb } from './firebaseAdmin';

const originalPost = express.application.post;
let installed = false;

const PLAN_LEVEL: Record<string, number> = {
  free: 0,
  creator: 1,
  pro: 2,
  studio: 3,
};

const MODEL_MIN_LEVEL: Record<string, number> = {
  lite: 0,
  fast: 0,
  omni: 1,
};

const MODEL_MAX_SECONDS: Record<string, number> = {
  lite: 8,
  fast: 8,
  omni: 10,
};

function planName(level: number) {
  if (level >= 3) return 'Studio';
  if (level >= 2) return 'Pro';
  if (level >= 1) return 'Creator';
  return 'Gratuit';
}

function requiredPlanForModel(model: string) {
  const level = MODEL_MIN_LEVEL[model] ?? 0;
  return planName(level);
}

async function resolveRequester(req: Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) {
    throw Object.assign(new Error('Connexion requise pour générer une vidéo.'), { status: 401, code: 'AUTH_REQUIRED' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw Object.assign(new Error('Session Firebase invalide.'), { status: 401, code: 'AUTH_REQUIRED' });
  }

  let decoded: any;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw Object.assign(new Error('Session Firebase invalide ou expirée.'), { status: 401, code: 'AUTH_INVALID' });
  }

  const requestedUserId = String(req.body?.userId || '').trim();
  if (requestedUserId && requestedUserId !== decoded.uid) {
    throw Object.assign(new Error('Le compte de génération ne correspond pas à la session active.'), { status: 403, code: 'USER_MISMATCH' });
  }

  const snap = await adminDb.doc(`users/${decoded.uid}`).get();
  const data: any = snap.data() || {};
  const role = data.role === 'admin' || decoded.admin === true ? 'admin' : 'user';
  const storedPlan = ['creator', 'pro', 'studio'].includes(String(data.plan)) ? String(data.plan) : 'free';
  const endsAt = String(data.subscriptionEndsAt || '');
  const expired = role !== 'admin' && storedPlan !== 'free' && endsAt && Number.isFinite(Date.parse(endsAt)) && Date.parse(endsAt) <= Date.now();
  const plan = role === 'admin' ? 'studio' : expired ? 'free' : storedPlan;
  const level = role === 'admin' ? 3 : PLAN_LEVEL[plan] || 0;

  // Never trust the userId sent by the browser. Downstream generation always uses
  // the authenticated Firebase account.
  req.body = { ...(req.body || {}), userId: decoded.uid };
  return { uid: decoded.uid, role, plan, level, expired };
}

async function videoEntitlementMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const requester = await resolveRequester(req);
    const model = String(req.body?.model || 'lite').toLowerCase();
    const duration = Math.round(Number(req.body?.duration || 8));

    if (model === 'pro') {
      return res.status(403).json({
        error: 'Veo 3.1 Pro a été retiré de l’offre MUNGWELE. Utilisez Veo 3.1 Fast, Gemini Omni Fast, MiniMax H3 Max ou Seedance selon votre formule.',
        code: 'VIDEO_MODEL_RETIRED',
      });
    }

    if (!(model in MODEL_MIN_LEVEL)) {
      return res.status(400).json({ error: 'Moteur vidéo non autorisé.', code: 'VIDEO_MODEL_NOT_ALLOWED' });
    }

    const requiredLevel = MODEL_MIN_LEVEL[model];
    if (requester.level < requiredLevel) {
      return res.status(403).json({
        error: `${requiredPlanForModel(model)} est requis pour utiliser ce moteur. Votre formule actuelle est ${planName(requester.level)}.`,
        code: 'VIDEO_PLAN_REQUIRED',
        requiredPlan: requiredPlanForModel(model),
      });
    }

    const maxSeconds = MODEL_MAX_SECONDS[model];
    if (!Number.isFinite(duration) || duration < 1 || duration > maxSeconds) {
      return res.status(400).json({
        error: `${model === 'omni' ? 'Gemini Omni Fast' : model === 'fast' ? 'Veo 3.1 Fast' : 'Veo 3.1 Lite'} est limité à ${maxSeconds} secondes dans MUNGWELE.`,
        code: 'VIDEO_DURATION_NOT_ALLOWED',
      });
    }

    return next();
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: String(error?.message || 'Impossible de vérifier votre formule vidéo.'),
      code: String(error?.code || 'VIDEO_ENTITLEMENT_CHECK_FAILED'),
    });
  }
}

export function installVideoEntitlements() {
  if (installed) return;
  installed = true;

  express.application.post = function patchedPost(route: any, ...handlers: any[]) {
    const isRealRouteDeclaration = typeof route === 'string' && route.startsWith('/') && handlers.length > 0;
    if (!isRealRouteDeclaration) return originalPost.call(this, route, ...handlers);

    if (route === '/api/generate/video') {
      return originalPost.call(this, route, videoEntitlementMiddleware, ...handlers);
    }

    return originalPost.call(this, route, ...handlers);
  } as any;
}
