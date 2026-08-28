export interface FirebaseAdminEnv {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getFirebaseAdminEnv(): FirebaseAdminEnv | null {
  const projectId = process.env.FIREBASE_PROJECT_ID || '';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || '';
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function isFirebaseAdminConfigured(): boolean {
  return getFirebaseAdminEnv() !== null;
}
