import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID || 'diablo-design-ai';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'diablo-design-ai.firebasestorage.app';

function resolveCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return applicationDefault();

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return cert(parsed);
  } catch (error) {
    console.error('[FIREBASE_ADMIN_CONFIG_ERROR] FIREBASE_SERVICE_ACCOUNT_JSON invalide.', error);
    throw error;
  }
}

export const firebaseAdminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: resolveCredential(),
      projectId,
      storageBucket,
    });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
adminDb.settings({ ignoreUndefinedProperties: true });
export const adminStorage = getStorage(firebaseAdminApp);
