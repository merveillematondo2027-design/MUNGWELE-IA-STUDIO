import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { UserProfile } from '../types';
import { db, storage } from '../lib/firebase';

export type MDigiProfile = {
  id: string;
  nickname: string;
  avatar?: string;
  bio?: string;
  isOfficial?: boolean;
  showFollowers: boolean;
  showFriends: boolean;
  showFollowing: boolean;
  createdAt: string;
  updatedAt?: string;
};

export const OFFICIAL_MDIGI_NICKNAME = 'MUNGWELE AI';

export async function getMDigiProfile(uid: string): Promise<MDigiProfile | null> {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'mdigiProfiles', uid));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<MDigiProfile, 'id'>) }) : null;
}

export async function createMDigiAccount(input: {
  user: UserProfile;
  nickname: string;
  phone: string;
}): Promise<MDigiProfile> {
  const nickname = input.nickname.trim();
  const phone = input.phone.trim();
  if (!input.user.id) throw new Error('Connexion MUNGWELE AI STUDIO requise.');
  if (nickname.length < 2) throw new Error('Le surnom doit contenir au moins 2 caractères.');
  if (phone.length < 7) throw new Error('Un numéro de téléphone valide est obligatoire.');

  const existing = await getMDigiProfile(input.user.id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const profile = {
    nickname,
    avatar: input.user.avatar || '',
    bio: '',
    isOfficial: false,
    showFollowers: true,
    showFriends: true,
    showFollowing: true,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'mdigiProfiles', input.user.id), profile);
  batch.set(doc(db, 'mdigiPrivate', input.user.id), {
    studioUserId: input.user.id,
    studioEmail: input.user.email || '',
    phone,
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();

  return { id: input.user.id, ...profile };
}

export async function ensureOfficialMDigiAccount(user: UserProfile): Promise<MDigiProfile | null> {
  if (!user.id || user.role !== 'admin') return null;
  const existing = await getMDigiProfile(user.id);
  if (existing?.isOfficial && existing.nickname === OFFICIAL_MDIGI_NICKNAME) return existing;

  const now = new Date().toISOString();
  const profile = {
    nickname: OFFICIAL_MDIGI_NICKNAME,
    avatar: existing?.avatar || user.avatar || '',
    bio: 'Compte officiel de MUNGWELE AI.',
    isOfficial: true,
    showFollowers: true,
    showFriends: false,
    showFollowing: true,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'mdigiProfiles', user.id), profile, { merge: true });
  return { id: user.id, ...profile };
}

export async function uploadMDigiAvatar(userId: string, file: File): Promise<string> {
  if (!userId) throw new Error('Connexion requise.');
  if (!file.type.startsWith('image/')) throw new Error('Sélectionnez une image JPG, PNG ou WEBP.');
  if (file.size > 5 * 1024 * 1024) throw new Error('La photo de profil ne doit pas dépasser 5 Mo.');

  const extension = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
  const target = storageRef(storage, `mdigi/${userId}/avatar/profile-${Date.now()}.${extension}`);
  await uploadBytes(target, file, { contentType: file.type });
  const avatar = await getDownloadURL(target);
  await setDoc(doc(db, 'mdigiProfiles', userId), { avatar, updatedAt: new Date().toISOString() }, { merge: true });
  return avatar;
}
