import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Download, Film, Globe2, Image as ImageIcon, Loader2, Plus, Send, Settings2, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, ImageGenerationSettings } from '../../types';
import { PublishCreationModal } from '../community/PublishCreationModal';

const MAX_REFERENCE_IMAGES = 8;
type ImageEngine = 'auto' | 'gpt-image' | 'nano-banana-2' | 'nano-banana-pro';
type ImageRatio = 'auto' | '1:1' | '4:5' | '3:4' | '9:16' | '16:9' | '3:2' | '2:3' | '4:3' | '21:9';

const ENGINES: Array<{ id: ImageEngine; name: string; description: string; badge?: string }> = [
  { id: 'auto', name: 'Automatique', description: 'MUNGWELE choisit le moteur idéal selon le prompt, les références et le coût.', badge: 'Recommandé' },
  { id: 'gpt-image', name: 'GPT Image', description: 'Excellent pour création, retouche, texte dans l’image et respect des instructions.' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', description: 'Équilibre Google entre qualité, rapidité, références et coût.' },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', description: 'Créations premium, compositions complexes et besoins haute qualité.' },
];
const RATIOS: Array<{ id: ImageRatio; name: string; description: string; badge?: string }> = [
  { id: 'auto', name: 'Automatique', description: 'MUNGWELE déduit le format le plus adapté à votre demande.', badge: 'Recommandé' },
  { id: '1:1', name: '1:1 — Carré', description: 'Publications, produits et profils.' },
  { id: '4:5', name: '4:5 — Social portrait', description: 'Instagram, Facebook et publicités sociales.', badge: 'Social' },
  { id: '3:4', name: '3:4 — Portrait', description: 'Mode, catalogue, affiche et portrait.' },
  { id: '9:16', name: '9:16 — Vertical plein écran', description: 'TikTok, Reels, Stories et Shorts.', badge: 'TikTok / Reels' },
  { id: '16:9', name: '16:9 — Paysage', description: 'YouTube, miniatures, présentations et écrans.' },
  { id: '3:2', name: '3:2 — Photo paysage', description: 'Photographie et e-commerce.' },
  { id: '2:3', name: '2:3 — Photo portrait', description: 'Portrait et affiche verticale.' },
  { id: '4:3', name: '4:3 — Classique', description: 'Présentation et paysage classique.' },
  { id: '21:9', name: '21:9 — Panoramique', description: 'Bannière large et rendu cinématique.' },
];

export const ImageStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, generations, setImageToVideoTransfer, setActiveStudio, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [ratioOpen, setRatioOpen] = useState(false);
  const [engine, setEngine] = useState<ImageEngine>('auto');
  const [ratio, setRatio] = useState<ImageRatio>('auto');
  const [currentGeneration, setCurrentGeneration] = useState<GenerationRecord | null>(null);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latest = currentGeneration || generations.find((g) => g.type === 'image' && (!user.id || g.userId === user.id)) || null;
  const selectedEngine = ENGINES.find((item) => item.id === engine) || ENGINES[0];
  const selectedRatio = RATIOS.find((item) => item.id === ratio) || RATIOS[0];
  const creditCost = useMemo(() => 8 + Math.max(0, referenceImages.length - 1) * 2, [referenceImages.length]);

  useEffect(() => {
    const isNew = sessionStorage.getItem('mungwele.new.project') === 'image';
    if (isNew) {
      sessionStorage.removeItem('mungwele.new.project');
      localStorage.removeItem('mungwele.resume.project');
      setCurrentGeneration(null); setPrompt(''); setReferenceImages([]); setEngine('auto'); setRatio('auto');
      return;
    }
    try {
      const raw = localStorage.getItem('mungwele.resume.project');
      if (!raw) return;
      const project = JSON.parse(raw) as GenerationRecord;
      if (project.type !== 'image') return;
      setCurrentGeneration(project); setPrompt(project.prompt || '');
      const settings = project.settings as ImageGenerationSettings & { engine?: ImageEngine; ratio?: ImageRatio };
      if (Array.isArray(settings?.referenceImages)) setReferenceImages(settings.referenceImages.filter((item): item is string => typeof item === 'string'));
      else if (typeof settings?.referenceImage === 'string') setReferenceImages([settings.referenceImage]);
      if (settings?.engine && ENGINES.some((item) => item.id === settings.engine)) setEngine(settings.engine);
      if (settings?.ratio && RATIOS.some((item) => item.id === settings.ratio)) setRatio(settings.ratio);
    } finally { localStorage.removeItem('mungwele.resume.project'); }
  }, []);

  const loadImages = (files: FileList | File[]) => {
    const selected = Array.from(files).slice(0, Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length));
    const valid = selected.filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (valid.length !== selected.length) addNotification('warning', 'Certaines images ignorées', 'Utilisez PNG, JPG ou WEBP, 10 Mo maximum par image.');
    valid.forEach((file) => { const reader = new FileReader(); reader.onload = () => setReferenceImages((prev) => prev.length >= MAX_REFERENCE_IMAGES ? prev : [...prev, reader.result as string]); reader.readAsDataURL(file); });
  };

  const generate = async () => {
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez ce que vous voulez créer ou modifier.');
    const reason = `Image ${selectedEngine.name} • ${selectedRatio.name}`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, prompt: prompt.trim(), enhancedPrompt: prompt.trim(), referenceImages, engine, ratio }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération a échoué.');
      const generation = { ...data.generation, creditsUsed: creditCost } as GenerationRecord;
      addGeneration(generation); setCurrentGeneration(generation); triggerCelebration(); setPrompt(''); setReferenceImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addNotification('success', 'Image prête', 'Téléchargez-la, animez-la ou publiez-la dans la communauté.');
    } catch (error: any) { refundCredits(creditCost, reason); addNotification('error', 'Génération impossible', error?.message || 'Erreur fournisseur. Vos crédits ont été remboursés.'); }
    finally { setIsGenerating(false); }
  };

  const download = async () => {
    if (!latest?.resultUrl) return;
    try {
      const response = await fetch(latest.resultUrl); if (!response.ok) throw new Error('Image indisponible.');
      const blob = await response.blob(); const url = URL.createObjectURL(blob);
      const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('jpeg') ? 'jpg' : 'png';
      const a = document.createElement('a'); a.href = url; a.download = `mungwele-image-${latest.id}.${ext}`; a.style.display = 'none'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500); addNotification('success', 'Téléchargement lancé', 'L’image est téléchargée directement sur votre appareil.');
    } catch (error: any) { addNotification('error', 'Téléchargement impossible', error?.message || 'Impossible de télécharger cette image.'); }
  };
  const toVideo = () => { if (!latest?.resultUrl) return; setImageToVideoTransfer(latest.resultUrl); setActiveStudio('video'); setActiveTab('studio-video'); };

  return <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
    <div className="mb-4 flex items-center justify-between px-1"><div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Image</h1><p className="mt-1 text-xs text-gray-500">Création intelligente • moteur et format au choix.</p></div><span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span></div>
    <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
      <div className="flex-1 overflow-y-auto pb-5">{isGenerating ? <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><Loader2 className="mb-4 h-9 w-9 animate-spin text-purple-300"/><p className="text-sm font-black text-white">MUNGWELE crée votre image…</p></div> : latest ? <div className="mx-auto max-w-3xl"><div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20"><img src={latest.resultUrl} alt={latest.title} className="max-h-[55vh] w-full object-contain"/></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void download()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5"/> Télécharger</button><button onClick={toVideo} className="inline-flex items-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs font-bold text-pink-200"><Film className="h-3.5 w-3.5"/> Animer en vidéo</button>{!latest.isPublic && <button onClick={() => setPublishing(true)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200"><Globe2 className="h-3.5 w-3.5"/> Publier</button>}</div></div> : <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><ImageIcon className="mb-4 h-8 w-8 text-purple-300"/><p className="text-sm font-bold text-gray-300">Commencez un nouveau projet.</p><p className="mt-1 text-xs text-gray-600">Le bouton + ajoute uniquement des images de référence.</p></div>}</div>
      {referenceImages.length > 0 && <div className="mb-2"><div className="mb-1 flex justify-between px-1 text-[10px] text-gray-500"><span>Références {referenceImages.length}/{MAX_REFERENCE_IMAGES}</span><button onClick={() => setReferenceImages([])}>Tout retirer</button></div><div className="flex gap-2 overflow-x-auto">{referenceImages.map((src,index)=><div key={index} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-purple-400/30"><img src={src} className="h-full w-full object-cover"/><button onClick={()=>setReferenceImages((prev)=>prev.filter((_,i)=>i!==index))} className="absolute right-1 top-1 rounded-full bg-black/75 p-1"><X className="h-3 w-3"/></button></div>)}</div></div>}
      <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2"><input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e)=>e.target.files&&loadImages(e.target.files)}/><div className="flex items-end gap-2"><button onClick={()=>fileInputRef.current?.click()} disabled={isGenerating} className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]" title="Ajouter des images de référence"><Plus className="h-5 w-5"/></button><textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void generate();}}} rows={2} placeholder="Décrivez l’image que vous voulez créer…" className="min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none"/><button onClick={()=>setSettingsOpen(true)} className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06]"><Settings2 className="h-4 w-4"/></button><button onClick={()=>void generate()} disabled={isGenerating||!prompt.trim()} className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 disabled:opacity-40"><Send className="h-4 w-4"/></button></div></div>
    </div>
    {settingsOpen && <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={()=>setSettingsOpen(false)}><aside className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={(e)=>e.stopPropagation()}><div className="flex justify-between"><div><h2 className="text-lg font-black">Réglages Image</h2><p className="text-xs text-gray-500">Moteur et format.</p></div><button onClick={()=>setSettingsOpen(false)}><X/></button></div><div className="mt-7 space-y-3"><div className="rounded-2xl border border-white/10"><button onClick={()=>setEngineOpen(!engineOpen)} className="flex w-full justify-between p-4 text-left"><div><p className="text-xs text-gray-500">Moteur</p><p className="font-black">{selectedEngine.name}</p></div><ChevronDown/></button>{engineOpen&&<div className="p-2">{ENGINES.map(item=><button key={item.id} onClick={()=>{setEngine(item.id);setEngineOpen(false)}} className="flex w-full gap-2 rounded-xl p-3 text-left hover:bg-white/5"><Check className={engine===item.id?'text-purple-300':'text-transparent'}/><span><b>{item.name}</b><small className="block text-gray-500">{item.description}</small></span></button>)}</div>}</div><div className="rounded-2xl border border-white/10"><button onClick={()=>setRatioOpen(!ratioOpen)} className="flex w-full justify-between p-4 text-left"><div><p className="text-xs text-gray-500">Format</p><p className="font-black">{selectedRatio.name}</p></div><ChevronDown/></button>{ratioOpen&&<div className="p-2">{RATIOS.map(item=><button key={item.id} onClick={()=>{setRatio(item.id);setRatioOpen(false)}} className="flex w-full gap-2 rounded-xl p-3 text-left hover:bg-white/5"><Check className={ratio===item.id?'text-blue-300':'text-transparent'}/><span><b>{item.name}</b><small className="block text-gray-500">{item.description}</small></span></button>)}</div>}</div></div><div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-4 text-xs text-gray-400"><Sparkles className="mr-2 inline h-4 w-4 text-amber-300"/>Le mode Automatique privilégie le moteur compatible le plus économique.</div><button onClick={()=>setSettingsOpen(false)} className="mt-6 w-full rounded-2xl bg-white py-3 font-black text-[#08101f]">Appliquer</button></aside></div>}
    <PublishCreationModal item={publishing ? latest : null} onClose={()=>setPublishing(false)}/>
  </div>;
};
