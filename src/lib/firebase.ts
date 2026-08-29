import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  getAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { firebasePublicConfig } from '../config/firebase';

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebasePublicConfig);

// Explicit Auth initialization makes popup/redirect handling and session
// persistence predictable across normal browsers and embedded previews.
export const auth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // initializeAuth throws if Auth was already initialized during HMR.
    return getAuth(firebaseApp);
  }
})();

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
