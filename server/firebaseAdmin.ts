import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const projectId = process.env.FIREBASE_PROJECT_ID || 'diablo-design-ai';
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'diablo-design-ai.firebasestorage.app';

export const firebaseAdminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });

export const adminAuth = getAuth(firebaseAdminApp);
export const adminDb = getFirestore(firebaseAdminApp);
export const adminStorage = getStorage(firebaseAdminApp);
