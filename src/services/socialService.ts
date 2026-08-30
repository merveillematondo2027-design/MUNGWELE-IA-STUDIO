import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const OFFICIAL_MUNGWELE_ID = 'mungwele-ai-official';
export const OFFICIAL_MUNGWELE_NAME = 'MUNGWELE AI';

export interface CommunityPost {
  id: string;
  userId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isOfficial?: boolean;
  title: string;
  caption?: string;
  type: 'image' | 'video' | 'clips' | 'music';
  mediaUrl: string;
  thumbnailUrl?: string;
  generationId: string;
  createdAt: string;
}

export async function publishGeneration(input: {
  generation: any;
  user: { id: string; name: string; avatar?: string; role: 'user' | 'admin' };
  caption: string;
}) {
  const { generation, user } = input;
  const now = new Date().toISOString();
  const official = user.role === 'admin';
  const authorId = official ? OFFICIAL_MUNGWELE_ID : user.id;
  const authorName = official ? OFFICIAL_MUNGWELE_NAME : (user.name || 'Créateur MUNGWELE');
  const post = {
    id: generation.id,
    userId: user.id,
    authorId,
    authorName,
    authorAvatar: official ? '' : (user.avatar || ''),
    isOfficial: official,
    title: generation.title || 'Création MUNGWELE',
    caption: input.caption.trim(),
    type: generation.type,
    mediaUrl: generation.resultUrl,
    thumbnailUrl: generation.thumbnailUrl || generation.resultUrl,
    generationId: generation.id,
    createdAt: now,
  };
  await setDoc(doc(db, 'generations', generation.id), {
    isPublic: true,
    publicAt: now,
    authorName,
    publicationCaption: input.caption.trim(),
    publicationAuthorId: authorId,
    isOfficialPublication: official,
    updatedAt: now,
  }, { merge: true });
  await setDoc(doc(db, 'communityPosts', generation.id), post, { merge: true });
}

export async function unpublishGeneration(generationId: string) {
  await setDoc(doc(db, 'generations', generationId), { isPublic: false, updatedAt: new Date().toISOString() }, { merge: true });
  await deleteDoc(doc(db, 'communityPosts', generationId)).catch(() => undefined);
}

export async function toggleLike(postId: string, user: { id: string; name: string }, liked: boolean) {
  const likeRef = doc(db, 'communityPosts', postId, 'likes', user.id);
  if (liked) await deleteDoc(likeRef);
  else await setDoc(likeRef, { userId: user.id, userName: user.name, createdAt: new Date().toISOString() });
}

export async function addComment(postId: string, user: { id: string; name: string; avatar?: string }, text: string) {
  const value = text.trim();
  if (!value) return;
  await addDoc(collection(db, 'communityPosts', postId, 'comments'), {
    userId: user.id,
    userName: user.name || 'Utilisateur',
    userAvatar: user.avatar || '',
    text: value.slice(0, 1000),
    createdAt: new Date().toISOString(),
  });
}

export async function toggleFollow(followerId: string, targetId: string, followerName: string, following: boolean) {
  if (!followerId || !targetId || followerId === targetId) return;
  const ref = doc(db, 'follows', `${followerId}_${targetId}`);
  if (following) await deleteDoc(ref);
  else await setDoc(ref, { userId: followerId, followerId, targetId, followerName, createdAt: new Date().toISOString() });
}

export async function notifyUser(userId: string, actor: { id: string; name: string }, type: string, message: string, postId?: string) {
  if (!userId || userId === actor.id) return;
  await addDoc(collection(db, 'notifications'), {
    userId,
    actorId: actor.id,
    actorName: actor.name,
    type,
    message,
    postId: postId || null,
    read: false,
    createdAt: new Date().toISOString(),
  }).catch(() => undefined);
}

export function subscribeLikes(postId: string, callback: (userIds: string[]) => void) {
  return onSnapshot(collection(db, 'communityPosts', postId, 'likes'), (snap) => callback(snap.docs.map((d) => d.id)));
}

export function subscribeComments(postId: string, callback: (rows: any[]) => void) {
  return onSnapshot(collection(db, 'communityPosts', postId, 'comments'), (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
    callback(rows);
  });
}

export function subscribeFollow(followerId: string, targetId: string, callback: (value: boolean) => void) {
  const ref = doc(db, 'follows', `${followerId}_${targetId}`);
  return onSnapshot(ref, (snap) => callback(snap.exists()));
}

export async function sharePost(post: CommunityPost) {
  const url = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(post.id)}`;
  if (navigator.share) {
    await navigator.share({ title: post.title, text: post.caption || post.title, url }).catch(() => undefined);
  } else {
    await navigator.clipboard.writeText(url);
  }
  return url;
}

export async function sendMessage(sender: { id: string; name: string }, recipientId: string, recipientName: string, text: string) {
  const value = text.trim();
  if (!value || !recipientId || recipientId === sender.id) return;
  const members = [sender.id, recipientId].sort();
  const conversationId = members.join('_');
  const now = new Date().toISOString();
  await setDoc(doc(db, 'conversations', conversationId), {
    userId: sender.id,
    members,
    memberNames: { [sender.id]: sender.name, [recipientId]: recipientName },
    lastMessage: value.slice(0, 500),
    updatedAt: now,
  }, { merge: true });
  await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
    userId: sender.id,
    senderId: sender.id,
    senderName: sender.name,
    recipientId,
    text: value.slice(0, 2000),
    createdAt: now,
    read: false,
  });
}
