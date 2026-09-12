import type { StudioType, UserPlan, UserProfile } from '../types';

export type DownloadOption = { id:string; label:string; detail:string; extension:string };

function paidLevel(user: Pick<UserProfile,'plan'|'role'>) {
  if (user.role === 'admin') return 3;
  if (user.plan === 'studio') return 3;
  if (user.plan === 'pro') return 2;
  if (user.plan === 'creator') return 1;
  return 0;
}

export function downloadLevelLabel(user: Pick<UserProfile,'plan'|'role'>) {
  const level = paidLevel(user);
  if (level === 0) return 'Gratuit • filigrane MUNGWELE';
  if (user.role === 'admin') return 'Administration • sans filigrane';
  return `${user.plan === 'creator' ? 'Creator' : user.plan === 'pro' ? 'Pro' : 'Studio'} • sans filigrane`;
}

export function downloadOptions(type: StudioType, user: Pick<UserProfile,'plan'|'role'>): DownloadOption[] {
  const level = paidLevel(user);
  if (type === 'video' || type === 'clips') {
    const rows: DownloadOption[] = [
      { id:'video-480', label:'480p', detail:'Gratuit • filigrane MUNGWELE', extension:'mp4' },
      { id:'video-780', label:'720p', detail:'Creator • HD sans filigrane', extension:'mp4' },
      { id:'video-1080', label:'1080p', detail:'Pro • Full HD sans filigrane', extension:'mp4' },
      { id:'video-1440', label:'2K / 1440p', detail:'Studio • haute définition sans filigrane', extension:'mp4' },
      { id:'video-2160', label:'4K / 2160p', detail:'Studio • qualité maximale sans filigrane', extension:'mp4' },
    ];
    return rows.slice(0, level === 0 ? 1 : level === 1 ? 2 : level === 2 ? 3 : 5);
  }
  if (type === 'image') {
    const rows: DownloadOption[] = [
      { id:'image-jpg-1024', label:'JPG • 1024 px', detail:'Gratuit • léger et compatible', extension:'jpg' },
      { id:'image-webp-1600', label:'WEBP • 1600 px', detail:'Creator • qualité web HD', extension:'webp' },
      { id:'image-png-2048', label:'PNG • 2048 px', detail:'Pro • haute qualité sans perte visible', extension:'png' },
      { id:'image-png-4096', label:'PNG • 4096 px', detail:'Studio • 4K / impression', extension:'png' },
    ];
    return rows.slice(0, level + 1);
  }
  const rows: DownloadOption[] = [
    { id:'audio-mp3-128', label:'MP3 • 128 kb/s', detail:'Gratuit • fichier léger', extension:'mp3' },
    { id:'audio-mp3-192', label:'MP3 • 192 kb/s', detail:'Creator • qualité standard+', extension:'mp3' },
    { id:'audio-mp3-320', label:'MP3 • 320 kb/s', detail:'Pro • haute qualité', extension:'mp3' },
    { id:'audio-wav', label:'WAV • sans perte', detail:'Studio • master / production', extension:'wav' },
  ];
  return rows.slice(0, level + 1);
}

export function maxDownloadSummary(type: StudioType, user: Pick<UserProfile,'plan'|'role'>) {
  const options = downloadOptions(type,user);
  return options[options.length-1]?.label || '';
}

export function allDownloadOptions(type: StudioType): DownloadOption[] {
  return downloadOptions(type,{ plan:'studio' as UserPlan, role:'user' });
}
