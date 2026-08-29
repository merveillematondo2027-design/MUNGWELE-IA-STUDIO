export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// @ts-ignore
const env = (import.meta as any).env;

// Firebase Web configuration is public by design. Environment variables can
// override these defaults for staging or another Firebase project.
export const firebasePublicConfig: FirebasePublicConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCqY3gtNKX62oFAwdSibtihDA1ifj8SxXs',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'diablo-design-ai.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'diablo-design-ai',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'diablo-design-ai.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '582509216306',
  appId: env.VITE_FIREBASE_APP_ID || '1:582509216306:web:61337d7a38ff9aa4abf22b',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-77CWBPF23Q',
};

export const isFirebaseClientConfigured = Boolean(
  firebasePublicConfig.apiKey &&
  firebasePublicConfig.authDomain &&
  firebasePublicConfig.projectId &&
  firebasePublicConfig.storageBucket &&
  firebasePublicConfig.messagingSenderId &&
  firebasePublicConfig.appId
);

export const missingFirebaseClientEnv = Object.entries(firebasePublicConfig)
  .filter(([key, value]) => key !== 'measurementId' && !value)
  .map(([key]) => key);
