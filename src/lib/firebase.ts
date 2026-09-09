import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  getAuth,
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
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

// Generation settings are assembled from optional media inputs. Firestore must
// omit absent optional fields instead of rejecting the whole generation write.
export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
  } catch {
    // During HMR Firestore can already be initialized.
    return getFirestore(firebaseApp);
  }
})();

export const storage = getStorage(firebaseApp);
