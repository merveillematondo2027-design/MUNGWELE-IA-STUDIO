import express, { type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { adminAuth, adminDb } from './firebaseAdmin';

const originalUse = express.application.use;
let installed = false;

const WELCOME_CREDITS = 100;
const WELCOME_BONUS_VERSION = 2;
const GENERAL_ADMIN_EMAIL = 'merveillematondo2027@gmail.com';

function httpError(message: string, status = 400, code = 'DEVICE_BINDING_INVALID') {
  return Object.assign(new Error(message), { status, code });
}

function normalizeDeviceId(value: unknown) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{20,160}$/.test(id)) {
    throw httpError('Identifiant de cet appareil invalide.', 400, 'DEVICE_ID_INVALID');
  }
  return id;
}

function deviceHash(deviceId: string) {
  return createHash('sha256').update(deviceId).digest('hex');
}

async function authenticatedUser(req: Request) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw httpError('Connexion requise.', 401, 'AUTH_REQUIRED');
  const token = header.slice(7).trim();
  if (!token) throw httpError('Session Firebase invalide.', 401, 'AUTH_REQUIRED');
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    throw httpError('Session Firebase invalide ou expirée.', 401, 'AUTH_INVALID');
  }
}

async function deviceSessionHandler(req: Request, res: Response) {
  try {
    const decoded = await authenticatedUser(req);
    const uid = decoded.uid;
    const email = String(decoded.email || '').trim().toLowerCase();
    const deviceId = normalizeDeviceId(req.body?.deviceId);
    const key = deviceHash(deviceId);
    const deviceRef = adminDb.doc(`deviceBindings/${key}`);
    const userRef = adminDb.doc(`users/${uid}`);
    const now = new Date().toISOString();
    const isAdmin = email === GENERAL_ADMIN_EMAIL;

    const result = await adminDb.runTransaction(async (tx) => {
      const [bindingSnap, userSnap] = await Promise.all([tx.get(deviceRef), tx.get(userRef)]);
      const binding: any = bindingSnap.data() || {};

      if (bindingSnap.exists && String(binding.userId || '') !== uid) {
        throw httpError(
          'Ce téléphone ou navigateur est déjà lié au premier compte MUNGWELE utilisé sur cet appareil.',
          409,
          'DEVICE_ACCOUNT_LOCKED',
        );
      }

      if (!bindingSnap.exists) {
        tx.create(deviceRef, {
          deviceHash: key,
          userId: uid,
          firstEmail: email,
          createdAt: now,
          lastSeenAt: now,
          platform: String(req.body?.platform || '').slice(0, 120),
        });
      } else {
        tx.set(deviceRef, { lastSeenAt: now }, { merge: true });
      }

      if (!userSnap.exists) {
        const name = String(decoded.name || email.split('@')[0] || 'Nouveau Créateur').slice(0, 120);
        const referralCode = `MGL-${uid.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`;
        tx.create(userRef, {
          uid,
          name,
          email,
          avatar: String(decoded.picture || ''),
          role: isAdmin ? 'admin' : 'user',
          adminLevel: isAdmin ? 'general' : null,
          status: 'active',
          credits: WELCOME_CREDITS,
          plan: isAdmin ? 'studio' : 'free',
          totalGenerations: 0,
          referralCode,
          referralRewardsCount: 0,
          welcomeBonusGranted: true,
          welcomeBonusAmount: WELCOME_CREDITS,
          welcomeBonusVersion: WELCOME_BONUS_VERSION,
          firstDeviceHash: key,
          createdAt: now,
          updatedAt: now,
        });
        return { created: true };
      }

      tx.set(userRef, {
        lastDeviceHash: key,
        lastLoginAt: now,
        updatedAt: now,
      }, { merge: true });
      return { created: false };
    });

    return res.json({
      success: true,
      created: result.created,
      deviceBound: true,
      autoLoginPersistence: true,
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: String(error?.message || 'Impossible de sécuriser cette session.'),
      code: String(error?.code || 'DEVICE_SESSION_FAILED'),
    });
  }
}

export function installDeviceBinding() {
  if (installed) return;
  installed = true;

  express.application.use = function patchedUse(...args: any[]) {
    express.application.use = originalUse;
    express.application.post.call(this, '/api/auth/device-session', deviceSessionHandler);
    return originalUse.call(this, ...args);
  } as any;
}
