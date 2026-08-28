import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
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

function mapProfile(user: User, data: Record<string, any>): UserProfile {
  const admin = isGeneralAdmin(user);
  return {
    id: user.uid,
    name: data.name || user.displayName || user.email?.split('@')[0] || 'Utilisateur',
    email: user.email || data.email || '',
    avatar: data.avatar || user.photoURL || DEFAULT_AVATAR,
    role: admin ? 'admin' : 'user',
    status: data.status === 'blocked' ? 'blocked' : 'active',
    credits: typeof data.credits === 'number' ? data.credits : 50,
    plan: ['free', 'creator', 'pro'].includes(data.plan) ? data.plan : 'free',
    totalGenerations: typeof data.totalGenerations === 'number' ? data.totalGenerations : 0,
    createdAt: data.createdAt || user.metadata.creationTime || new Date().toISOString(),
  };
}

export async function ensureUserProfile(user: User, preferredName?: string): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  const admin = isGeneralAdmin(user);

  if (!snapshot.exists()) {
    const initial = {
      name: preferredName || user.displayName || user.email?.split('@')[0] || 'Nouveau Créateur',
      email: user.email || '',
      avatar: user.photoURL || DEFAULT_AVATAR,
      role: 'user',
      status: 'active',
      credits: 50,
      plan: 'free',
      totalGenerations: 0,
      welcomeBonusGranted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(ref, initial);

    if (admin) {
      await setDoc(
        ref,
        {
          role: 'admin',
          adminLevel: 'general',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      return mapProfile(user, { ...initial, role: 'admin', adminLevel: 'general' });
    }

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
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return ensureUserProfile(credential.user, name.trim());
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return ensureUserProfile(credential.user);
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return ensureUserProfile(credential.user);
}

export async function requestPasswordReset(email: string) {
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
      return 'Cette adresse e-mail possède déjà un compte.';
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
      return 'Le navigateur a bloqué la fenêtre Google. Autorisez les pop-ups puis réessayez.';
    case 'auth/network-request-failed':
      return 'Connexion réseau indisponible. Vérifiez Internet puis réessayez.';
    default:
      return 'Une erreur Firebase est survenue. Réessayez dans quelques instants.';
  }
}
