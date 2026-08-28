import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types';

export const GENERAL_ADMIN_EMAIL = 'merveillematondo2027@gmail.com';
const DEFAULT_AVATAR = '';

function isGeneralAdmin(user: User) {
  return user.email?.toLowerCase() === GENERAL_ADMIN_EMAIL;
}

function fallbackProfileFromAuth(user: User): UserProfile {
  return {
    id: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
    email: user.email || '',
    avatar: user.photoURL || DEFAULT_AVATAR,
    role: isGeneralAdmin(user) ? 'admin' : 'user',
    status: 'active',
    credits: 0,
    plan: 'free',
    totalGenerations: 0,
    createdAt: user.metadata.creationTime || new Date().toISOString(),
  };
}

function mapProfile(user: User, data: Record<string, any>): UserProfile {
  const admin = isGeneralAdmin(user);
  return {
    id: user.uid,
    name: data.name || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
    email: user.email || data.email || '',
    avatar: data.avatar || user.photoURL || DEFAULT_AVATAR,
    role: admin ? 'admin' : 'user',
    status: data.status === 'blocked' ? 'blocked' : 'active',
    credits: typeof data.credits === 'number' ? data.credits : 0,
    plan: ['free', 'creator', 'pro'].includes(data.plan) ? data.plan : 'free',
    totalGenerations: typeof data.totalGenerations === 'number' ? data.totalGenerations : 0,
    createdAt: data.createdAt || user.metadata.creationTime || new Date().toISOString(),
  };
}

async function preparePersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

export async function ensureUserProfile(user: User, preferredName?: string): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  const admin = isGeneralAdmin(user);

  if (!snapshot.exists()) {
    const initial = {
      uid: user.uid,
      name: preferredName || user.displayName || user.email?.split('@')[0] || 'Nouveau Créateur',
      email: user.email || '',
      avatar: user.photoURL || DEFAULT_AVATAR,
      role: admin ? 'admin' : 'user',
      adminLevel: admin ? 'general' : null,
      status: 'active',
      credits: 50,
      plan: 'free',
      totalGenerations: 0,
      welcomeBonusGranted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(ref, initial);
    return mapProfile(user, initial);
  }

  const data = snapshot.data();
  if (admin && (data.role !== 'admin' || data.adminLevel !== 'general')) {
    await setDoc(
      ref,
      {
        role: 'admin',
        adminLevel: 'general',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return mapProfile(user, admin ? { ...data, role: 'admin', adminLevel: 'general' } : data);
}

export async function registerWithEmail(name: string, email: string, password: string) {
  await preparePersistence();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return ensureUserProfile(credential.user, name.trim());
}

export async function loginWithEmail(email: string, password: string) {
  await preparePersistence();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return ensureUserProfile(credential.user);
}

export function isEmbeddedAuthContext() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export async function loginWithGoogle(): Promise<UserProfile | null> {
  await preparePersistence();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (isEmbeddedAuthContext()) {
    const error = new Error('Google sign-in cannot complete inside the embedded preview.');
    (error as any).code = 'auth/embedded-preview';
    throw error;
  }

  try {
    const credential = await signInWithPopup(auth, provider);
    return ensureUserProfile(credential.user);
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function completeRedirectLogin(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    return ensureUserProfile(result.user);
  } catch (error: any) {
    if (error?.code === 'auth/no-auth-event') return null;
    throw error;
  }
}

export async function requestPasswordReset(email: string) {
  await preparePersistence();
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutFirebase() {
  await signOut(auth);
}

export function subscribeToFirebaseUser(
  onProfile: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
) {
  return onAuthStateChanged(
    auth,
    async (user) => {
      if (!user) {
        onProfile(null);
        return;
      }

      try {
        onProfile(await ensureUserProfile(user));
      } catch (error) {
        // Authentication remains valid even if Firestore profile synchronization fails.
        // Keep the user signed in with a zero-credit fallback and surface the data error.
        onProfile(fallbackProfileFromAuth(user));
        onError?.(error as Error);
      }
    },
    (error) => onError?.(error),
  );
}

export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse e-mail possède déjà un compte. Utilisez « Se connecter » ou « Mot de passe oublié ».';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou mot de passe incorrect.';
    case 'auth/weak-password':
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.';
    case 'auth/popup-closed-by-user':
      return 'Connexion Google annulée.';
    case 'auth/popup-blocked':
      return 'Le navigateur a bloqué la fenêtre Google.';
    case 'auth/unauthorized-domain':
      return 'Ce domaine n’est pas encore autorisé dans Firebase Authentication.';
    case 'auth/embedded-preview':
      return 'Google ne peut pas terminer la connexion dans le cadre intégré de Google AI Studio. Ouvrez le preview dans un nouvel onglet, puis utilisez « Continuer avec Google ». La connexion e-mail/mot de passe fonctionne dans le preview.';
    case 'auth/network-request-failed':
      return 'Connexion réseau indisponible. Vérifiez Internet puis réessayez.';
    case 'permission-denied':
    case 'firestore/permission-denied':
      return 'Connexion réussie, mais Firestore refuse encore le profil. Publiez les dernières règles Firestore du dépôt.';
    default:
      return (error as Error)?.message || 'Une erreur Firebase est survenue. Réessayez dans quelques instants.';
  }
}
