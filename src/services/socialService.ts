import { addDoc, collection, deleteDoc, doc, getDoc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const OFFICIAL_MUNGWELE_ID = 'mungwele-ai-official';
export const OFFICIAL_MUNGWELE_NAME = 'MUNGWELE AI';
export interface CommunityPost { id:string; userId:string; authorId:string; authorName:string; authorAvatar?:string; isOfficial?:boolean; title:string; caption?:string; type:'image'|'video'|'clips'|'music'; mediaUrl:string; thumbnailUrl?:string; generationId:string; createdAt:string; allowCommunityDownload?:boolean; }

type SocialIdentity = { nickname:string; avatar:string };
async function requireMDigiIdentity(userId:string):Promise<SocialIdentity>{
  const snap=await getDoc(doc(db,'mdigiProfiles',userId));
  if(!snap.exists()) throw new Error('Créez d’abord votre compte M.Digi pour utiliser les fonctions sociales.');
  const data=snap.data();
  const nickname=String(data.nickname||'').trim();
  if(!nickname) throw new Error('Votre compte M.Digi doit avoir un surnom public.');
  return {nickname,avatar:String(data.avatar||'')};
}

export async function publishGeneration(input:{generation:any;user:{id:string;name:string;avatar?:string;role:'user'|'admin'};caption:string;allowCommunityDownload:boolean}) {
  const {generation,user}=input; const now=new Date().toISOString(); const official=user.role==='admin';
  const identity=official?null:await requireMDigiIdentity(user.id);
  const authorId=official?OFFICIAL_MUNGWELE_ID:user.id;
  const authorName=official?OFFICIAL_MUNGWELE_NAME:identity!.nickname;
  const authorAvatar=official?'':identity!.avatar;
  const post={id:generation.id,userId:user.id,authorId,authorName,authorAvatar,isOfficial:official,title:generation.title||'Création MUNGWELE',caption:input.caption.trim(),type:generation.type,mediaUrl:generation.resultUrl,thumbnailUrl:generation.thumbnailUrl||generation.resultUrl,generationId:generation.id,createdAt:now,allowCommunityDownload:input.allowCommunityDownload};
  await setDoc(doc(db,'generations',generation.id),{isPublic:true,publicAt:now,authorName,publicationCaption:input.caption.trim(),publicationAuthorId:authorId,isOfficialPublication:official,allowCommunityDownload:input.allowCommunityDownload,updatedAt:now},{merge:true});
  try { await setDoc(doc(db,'communityPosts',generation.id),post,{merge:true}); }
  catch(error){ console.warn('Community post mirror pending Firestore permissions; public generation remains published:',error); }
}
export async function unpublishGeneration(generationId:string){await setDoc(doc(db,'generations',generationId),{isPublic:false,updatedAt:new Date().toISOString()},{merge:true});await deleteDoc(doc(db,'communityPosts',generationId)).catch(()=>undefined);}
export async function toggleLike(postId:string,user:{id:string;name:string},liked:boolean){const ref=doc(db,'generations',postId,'likes',user.id);if(liked)await deleteDoc(ref);else{const identity=await requireMDigiIdentity(user.id);await setDoc(ref,{userId:user.id,userName:identity.nickname,createdAt:new Date().toISOString()});}}
export async function addComment(postId:string,user:{id:string;name:string;avatar?:string},text:string){const value=text.trim();if(!value)return;const identity=await requireMDigiIdentity(user.id);await addDoc(collection(db,'generations',postId,'comments'),{userId:user.id,userName:identity.nickname,userAvatar:identity.avatar,text:value.slice(0,1000),createdAt:new Date().toISOString()});}
export async function toggleFollow(followerId:string,targetId:string,followerName:string,following:boolean){if(!followerId||!targetId||followerId===targetId)return;const ref=doc(db,'follows',`${followerId}_${targetId}`);if(following)await deleteDoc(ref);else{const identity=await requireMDigiIdentity(followerId);await setDoc(ref,{userId:followerId,followerId,targetId,followerName:identity.nickname,createdAt:new Date().toISOString()});}}
export async function notifyUser(userId:string,actor:{id:string;name:string},type:string,message:string,postId?:string){if(!userId||userId===actor.id)return;const identity=await requireMDigiIdentity(actor.id).catch(()=>({nickname:actor.name,avatar:''}));await addDoc(collection(db,'notifications'),{userId,actorId:actor.id,actorName:identity.nickname,type,message,postId:postId||null,read:false,createdAt:new Date().toISOString()}).catch(()=>undefined);}
export function subscribeLikes(postId:string,callback:(userIds:string[])=>void){return onSnapshot(collection(db,'generations',postId,'likes'),snap=>callback(snap.docs.map(d=>d.id)),()=>callback([]));}
export function subscribeComments(postId:string,callback:(rows:any[])=>void){return onSnapshot(collection(db,'generations',postId,'comments'),snap=>{const rows=snap.docs.map(d=>({id:d.id,...d.data()}));rows.sort((a:any,b:any)=>String(a.createdAt).localeCompare(String(b.createdAt)));callback(rows);},()=>callback([]));}
export function subscribeFollow(followerId:string,targetId:string,callback:(value:boolean)=>void){return onSnapshot(doc(db,'follows',`${followerId}_${targetId}`),snap=>callback(snap.exists()),()=>callback(false));}
export async function sharePost(post:CommunityPost){const url=`${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(post.id)}`;if(navigator.share)await navigator.share({title:post.title,text:post.caption||post.title,url}).catch(()=>undefined);else await navigator.clipboard.writeText(url);return url;}
export async function reportPost(post:CommunityPost, reporter:{id:string;name:string}, reason='Contenu signalé par un membre'){
  if(!reporter.id) throw new Error('Connexion requise pour signaler une publication.');
  const identity=await requireMDigiIdentity(reporter.id).catch(()=>({nickname:reporter.name,avatar:''}));
  await addDoc(collection(db,'reports'),{userId:reporter.id,reporterId:reporter.id,reporterName:identity.nickname||reporter.name||'Utilisateur',postId:post.id,generationId:post.generationId||post.id,ownerId:post.userId,ownerName:post.authorName,reason,status:'open',createdAt:new Date().toISOString()});
}
export async function sendMessage(sender:{id:string;name:string},recipientId:string,recipientName:string,text:string){
  const value=text.trim();
  if(!value||!recipientId||recipientId===sender.id)return;
  const identity=await requireMDigiIdentity(sender.id);
  const members=[sender.id,recipientId].sort();
  const conversationId=members.join('_');
  const now=new Date().toISOString();
  const conversationRef=doc(db,'conversations',conversationId);
  await setDoc(conversationRef,{userId:sender.id,members,memberNames:{[sender.id]:identity.nickname,[recipientId]:recipientName},lastMessage:value.slice(0,500),lastSenderId:sender.id,updatedAt:now},{merge:true});
  await updateDoc(conversationRef,{[`unreadBy.${recipientId}`]:increment(1)}).catch(()=>undefined);
  await addDoc(collection(db,'conversations',conversationId,'messages'),{userId:sender.id,senderId:sender.id,senderName:identity.nickname,recipientId,text:value.slice(0,2000),createdAt:now,read:false});
}
