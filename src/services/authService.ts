import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { UserProfile } from '../types';

export const GENERAL_ADMIN_EMAIL = 'merveillematondo2027@gmail.com';
const DEFAULT_AVATAR = '';
const WELCOME_CREDITS = 100;
const REFERRAL_BONUS = 100;
const WELCOME_BONUS_VERSION = 2;
const REF_STORAGE_KEY = 'mungwele.pending.referral';

function isGeneralAdmin(user: User) { return user.email?.toLowerCase() === GENERAL_ADMIN_EMAIL; }
function referralCodeFor(uid: string) { return `MGL-${uid.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}`; }

export function captureReferralFromUrl() {
  if (typeof window === 'undefined') return;
  const code = new URLSearchParams(window.location.search).get('ref')?.trim().toUpperCase();
  if (code) localStorage.setItem(REF_STORAGE_KEY, code);
}

function mapProfile(user: User, data: Record<string, any>): UserProfile {
  const admin = isGeneralAdmin(user);
  return {
    id: user.uid,
    name: data.name || user.displayName || user.email?.split('@')[0] || 'Créateur',
    email: user.email || data.email || '',
    avatar: data.avatar || user.photoURL || DEFAULT_AVATAR,
    role: admin ? 'admin' : 'user',
    status: data.status === 'blocked' ? 'blocked' : 'active',
    credits: typeof data.credits === 'number' ? data.credits : 0,
    plan: admin ? 'studio' : (['free', 'creator', 'pro', 'studio'].includes(data.plan) ? data.plan : 'free'),
    totalGenerations: typeof data.totalGenerations === 'number' ? data.totalGenerations : 0,
    createdAt: data.createdAt || user.metadata.creationTime || new Date().toISOString(),
    referralCode: data.referralCode || referralCodeFor(user.uid),
    referredBy: data.referredBy || undefined,
    referralRewardsCount: Number(data.referralRewardsCount || 0),
  };
}

async function preparePersistence() { await setPersistence(auth, browserLocalPersistence); }

async function ensureReferralIndex(user: User, name: string) {
  const code = referralCodeFor(user.uid);
  await setDoc(doc(db, 'referralCodes', code), { userId: user.uid, name, code, createdAt: new Date().toISOString() }, { merge: true });
  return code;
}

async function redeemPendingReferral(user: User) {
  if (typeof window === 'undefined') return;
  const code = localStorage.getItem(REF_STORAGE_KEY)?.trim().toUpperCase();
  if (!code) return;
  const codeSnap = await getDoc(doc(db, 'referralCodes', code));
  if (!codeSnap.exists()) { localStorage.removeItem(REF_STORAGE_KEY); return; }
  const inviterId = String(codeSnap.data().userId || '');
  if (!inviterId || inviterId === user.uid) { localStorage.removeItem(REF_STORAGE_KEY); return; }

  const referralRef = doc(db, 'referrals', user.uid);
  const inviterRef = doc(db, 'users', inviterId);
  const referredRef = doc(db, 'users', user.uid);

  await setDoc(referralRef, { userId: user.uid, referredUserId: user.uid, inviterId, code, bonus: REFERRAL_BONUS, rewardApplied: false, createdAt: new Date().toISOString() }, { merge: false }).catch(() => undefined);

  await runTransaction(db, async (tx) => {
    const referralSnap = await tx.get(referralRef);
    const inviterSnap = await tx.get(inviterRef);
    const referredSnap = await tx.get(referredRef);
    if (!referralSnap.exists() || !inviterSnap.exists() || !referredSnap.exists()) return;
    const referral = referralSnap.data();
    if (referral.rewardApplied === true || referral.inviterId !== inviterId || Number(referral.bonus) !== REFERRAL_BONUS) return;
    const inviter = inviterSnap.data();
    tx.update(inviterRef, {
      credits: Math.max(0, Number(inviter.credits || 0)) + REFERRAL_BONUS,
      referralRewardsCount: Math.max(0, Number(inviter.referralRewardsCount || 0)) + 1,
      updatedAt: new Date().toISOString(),
    });
    tx.update(referralRef, { rewardApplied: true, rewardedAt: new Date().toISOString() });
    tx.update(referredRef, { referredBy: inviterId, referralCodeUsed: code, updatedAt: new Date().toISOString() });
  });
  localStorage.removeItem(REF_STORAGE_KEY);
}

export async function ensureUserProfile(user: User, preferredName?: string): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  const admin = isGeneralAdmin(user);
  const displayName = preferredName || user.displayName || user.email?.split('@')[0] || 'Nouveau Créateur';
  const referralCode = referralCodeFor(user.uid);

  if (!snapshot.exists()) {
    const now = new Date().toISOString();
    const initial = {
      uid: user.uid,
      name: displayName,
      email: user.email || '',
      avatar: user.photoURL || DEFAULT_AVATAR,
      role: admin ? 'admin' : 'user',
      adminLevel: admin ? 'general' : null,
      status: 'active',
      credits: WELCOME_CREDITS,
      plan: admin ? 'studio' : 'free',
      totalGenerations: 0,
      referralCode,
      referralRewardsCount: 0,
      welcomeBonusGranted: true,
      welcomeBonusAmount: WELCOME_CREDITS,
      welcomeBonusVersion: WELCOME_BONUS_VERSION,
      createdAt: now,
      updatedAt: now,
    };

    // Le document users est obligatoire : aucune session "fantôme" ne doit être créée.
    await setDoc(ref, initial);
    await ensureReferralIndex(user, displayName).catch((error) => console.warn('Referral index warning:', error));
    await redeemPendingReferral(user).catch((error) => console.warn('Referral reward warning:', error));
    const fresh = await getDoc(ref).catch(() => null);
    return mapProfile(user, fresh?.exists() ? fresh.data() : initial);
  }

  let data = snapshot.data();
  if (!data.referralCode) {
    await setDoc(ref, { referralCode, referralRewardsCount: Number(data.referralRewardsCount || 0), updatedAt: new Date().toISOString() }, { merge: true });
    data = { ...data, referralCode };
  }
  await ensureReferralIndex(user, data.name || displayName).catch((error) => console.warn('Referral index warning:', error));

  if (Number(data.welcomeBonusVersion || 0) < WELCOME_BONUS_VERSION && data.welcomeBonusGranted === true) {
    const migrated = { credits: Math.max(0, Number(data.credits || 0)) + 50, welcomeBonusAmount: WELCOME_CREDITS, welcomeBonusVersion: WELCOME_BONUS_VERSION, updatedAt: new Date().toISOString() };
    await setDoc(ref, migrated, { merge: true });
    data = { ...data, ...migrated };
  }

  if (admin) {
    const adminPatch = {
      uid: user.uid,
      email: user.email || data.email || GENERAL_ADMIN_EMAIL,
      role: 'admin',
      adminLevel: 'general',
      plan: 'studio',
      updatedAt: new Date().toISOString(),
    };
    if (data.role !== 'admin' || data.adminLevel !== 'general' || data.plan !== 'studio') {
      await setDoc(ref, adminPatch, { merge: true });
      data = { ...data, ...adminPatch };
    }
  }

  await redeemPendingReferral(user).catch((error) => console.warn('Referral reward warning:', error));
  const refreshed = await getDoc(ref);
  if (!refreshed.exists()) throw new Error('Le profil Firestore est introuvable.');
  return mapProfile(user, refreshed.data());
}

async function finalizeCredential(user: User, preferredName?: string) {
  try {
    return await ensureUserProfile(user, preferredName);
  } catch (error) {
    await signOut(auth).catch(() => undefined);
    throw error;
  }
}

export async function registerWithEmail(name: string, email: string, password: string) {
  await preparePersistence();
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: name.trim() });
  return finalizeCredential(credential.user, name.trim());
}

export async function loginWithEmail(email: string, password: string) {
  await preparePersistence();
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return finalizeCredential(credential.user);
}

export async function loginWithGoogle(): Promise<UserProfile> {
  await preparePersistence();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  return finalizeCredential(credential.user);
}

export async function requestPasswordReset(email: string) { await preparePersistence(); await sendPasswordResetEmail(auth, email.trim()); }
export async function logoutFirebase() { await signOut(auth); }

export function subscribeToFirebaseUser(onProfile: (profile: UserProfile | null) => void, onError?: (error: Error) => void) {
  captureReferralFromUrl();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) { onProfile(null); return; }
    try {
      onProfile(await ensureUserProfile(user));
    } catch (error) {
      // Ne jamais fabriquer un compte local "Invité" ou un profil à 0 crédit.
      onProfile(null);
      onError?.(error as Error);
    }
  }, (error) => onError?.(error));
}

export function getCurrentAuthHostname() { return typeof window !== 'undefined' ? window.location.hostname : ''; }
export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  const hostname = getCurrentAuthHostname();
  switch (code) {
    case 'auth/email-already-in-use': return 'Cette adresse e-mail possède déjà un compte. Utilisez « Se connecter » ou « Mot de passe oublié ».';
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': return 'E-mail ou mot de passe incorrect.';
    case 'auth/weak-password': return 'Le mot de passe doit contenir au moins 6 caractères.';
    case 'auth/invalid-email': return 'Adresse e-mail invalide.';
    case 'auth/popup-closed-by-user': return 'La fenêtre Google a été fermée avant la fin de la connexion.';
    case 'auth/popup-blocked': return 'Le navigateur a bloqué la fenêtre Google. Autorisez les pop-ups puis réessayez.';
    case 'auth/cancelled-popup-request': return 'Une autre tentative Google est déjà en cours.';
    case 'auth/unauthorized-domain': return `Le domaine « ${hostname || 'actuel'} » n'est pas autorisé dans Firebase Authentication.`;
    case 'auth/operation-not-allowed': return 'La connexion Google n’est pas activée dans Firebase Authentication.';
    case 'auth/operation-not-supported-in-this-environment': return 'Ce navigateur intégré bloque le mécanisme Google. Testez la version publiée.';
    case 'auth/network-request-failed': return 'Connexion réseau indisponible. Vérifiez Internet puis réessayez.';
    case 'permission-denied': case 'firestore/permission-denied': return 'Connexion réussie, mais Firestore refuse la création ou la lecture du profil. Publiez les dernières règles Firestore puis reconnectez-vous.';
    default: return (error as Error)?.message || 'Une erreur Firebase est survenue. Réessayez.';
  }
}
