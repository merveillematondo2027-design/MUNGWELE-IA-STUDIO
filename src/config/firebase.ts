export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const env = import.meta.env;

export const firebasePublicConfig: FirebasePublicConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
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
