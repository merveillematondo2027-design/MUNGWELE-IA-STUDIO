import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Download, Film, Image as ImageIcon, Loader2, Plus, Send, Settings2, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, ImageGenerationSettings } from '../../types';

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
  { id: '1:1', name: '1:1 — Carré', description: 'Idéal pour publications Instagram/Facebook, produits et profils.' },
  { id: '4:5', name: '4:5 — Social portrait', description: 'Idéal pour le fil Instagram/Facebook et les publicités sociales.', badge: 'Social' },
  { id: '3:4', name: '3:4 — Portrait', description: 'Idéal pour Facebook, mode, catalogue, affiche et portrait.' },
  { id: '9:16', name: '9:16 — Vertical plein écran', description: 'Idéal pour TikTok, Reels, Stories et YouTube Shorts.', badge: 'TikTok / Reels' },
  { id: '16:9', name: '16:9 — Paysage', description: 'Idéal pour YouTube, miniatures, présentations et écrans.' },
  { id: '3:2', name: '3:2 — Photo paysage', description: 'Idéal pour photographie, e-commerce et visuels commerciaux.' },
  { id: '2:3', name: '2:3 — Photo portrait', description: 'Idéal pour portrait, affiche verticale et photographie.' },
  { id: '4:3', name: '4:3 — Classique', description: 'Idéal pour présentation, document et paysage classique.' },
  { id: '21:9', name: '21:9 — Panoramique', description: 'Idéal pour bannière large et rendu cinématique.' },
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latest = generations.find((g) => g.type === 'image' && (!user.id || g.userId === user.id));

  const selectedEngine = ENGINES.find((item) => item.id === engine) || ENGINES[0];
  const selectedRatio = RATIOS.find((item) => item.id === ratio) || RATIOS[0];
  const creditCost = useMemo(() => 8 + Math.max(0, referenceImages.length - 1) * 2, [referenceImages.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mungwele.resume.project');
      if (!raw) return;
      const project = JSON.parse(raw) as GenerationRecord;
      if (project.type !== 'image') return;
      setPrompt(project.prompt || '');
      const settings = project.settings as ImageGenerationSettings & { engine?: ImageEngine; ratio?: ImageRatio };
      if (Array.isArray(settings?.referenceImages)) setReferenceImages(settings.referenceImages.filter((item): item is string => typeof item === 'string'));
      else if (typeof settings?.referenceImage === 'string') setReferenceImages([settings.referenceImage]);
      if (settings?.engine && ENGINES.some((item) => item.id === settings.engine)) setEngine(settings.engine);
      if (settings?.ratio && RATIOS.some((item) => item.id === settings.ratio)) setRatio(settings.ratio);
      localStorage.removeItem('mungwele.resume.project');
    } catch {
      localStorage.removeItem('mungwele.resume.project');
    }
  }, []);

  const loadImages = (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const room = Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length);
    if (!room) return addNotification('warning', 'Limite atteinte', `MUNGWELE accepte actuellement ${MAX_REFERENCE_IMAGES} images de référence par projet Image.`);
    const selected = incoming.slice(0, room);
    const valid = selected.filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (valid.length !== selected.length) addNotification('warning', 'Certaines images ignorées', 'Utilisez PNG, JPG ou WEBP, 10 Mo maximum par image.');
    valid.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setReferenceImages((prev) => prev.length >= MAX_REFERENCE_IMAGES ? prev : [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const generate = async () => {
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez ce que vous voulez créer ou modifier.');
    const reason = `Image ${selectedEngine.name} • ${selectedRatio.name}`;
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, prompt: prompt.trim(), enhancedPrompt: prompt.trim(), referenceImages, engine, ratio }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération a échoué.');
      addGeneration({ ...data.generation, creditsUsed: creditCost });
      triggerCelebration();
      setPrompt('');
      setReferenceImages([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addNotification('success', 'Image prête', 'Votre création est disponible dans vos projets.');
    } catch (error: any) {
      refundCredits(creditCost, reason);
      addNotification('error', 'Génération impossible', error?.message || 'Erreur fournisseur. Vos crédits ont été remboursés.');
    } finally {
      setIsGenerating(false);
    }
  };

  const toVideo = () => {
    if (!latest?.resultUrl) return;
    setImageToVideoTransfer(latest.resultUrl);
    setActiveStudio('video');
    setActiveTab('studio-video');
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col">
      <div className="mb-4 flex items-center justify-between px-1">
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Image</h1><p className="mt-1 text-xs text-gray-500">Création intelligente • moteur et format au choix.</p></div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-5">
          {isGenerating ? (
            <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><Loader2 className="mb-4 h-9 w-9 animate-spin text-purple-300" /><p className="text-sm font-black text-white">MUNGWELE crée votre image…</p><p className="mt-2 text-xs text-gray-500">Le moteur sélectionné traite votre prompt et vos références.</p></div>
          ) : latest ? (
            <div className="mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20"><img src={latest.resultUrl} alt={latest.title} className="max-h-[55vh] w-full object-contain" /></div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { const a=document.createElement('a'); a.href=latest.resultUrl; a.download=`mungwele-image-${latest.id}.png`; a.click(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> Télécharger</button>
                <button onClick={toVideo} className="inline-flex items-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs font-bold text-pink-200"><Film className="h-3.5 w-3.5" /> Animer en vidéo</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10"><ImageIcon className="h-5 w-5 text-purple-200" /></span><p className="text-sm font-bold text-gray-300">Commencez par votre idée.</p><p className="mt-1 max-w-md text-xs leading-5 text-gray-600">Ajoutez des références avec +, puis décrivez précisément le résultat souhaité.</p></div>
          )}
        </div>

        {referenceImages.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-gray-500"><span>Références {referenceImages.length}/{MAX_REFERENCE_IMAGES}</span><button onClick={() => setReferenceImages([])} className="font-bold text-gray-400">Tout retirer</button></div>
            <div className="flex gap-2 overflow-x-auto pb-1">{referenceImages.map((src, index) => <div key={`${index}-${src.slice(-12)}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-purple-400/30"><img src={src} alt={`Référence ${index + 1}`} className="h-full w-full object-cover" /><button onClick={() => setReferenceImages((prev) => prev.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/75 p-1"><X className="h-3 w-3" /></button></div>)}</div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl">
          <input ref={fileInputRef} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files && loadImages(e.target.files)} />
          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} disabled={isGenerating} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-40" title="Ajouter des références"><Plus className="h-5 w-5" /></button>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }} rows={2} disabled={isGenerating} placeholder={referenceImages.length ? 'Décrivez précisément ce que vous voulez obtenir avec ces références…' : 'Décrivez l’image que vous voulez créer…'} className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-gray-600 disabled:opacity-60" />
            <button onClick={() => setSettingsOpen(true)} disabled={isGenerating} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400 hover:text-white disabled:opacity-40" title="Réglages"><Settings2 className="h-4 w-4" /></button>
            <button onClick={generate} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40" title="Générer">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600"><span>{selectedEngine.name} • {selectedRatio.id === 'auto' ? 'format auto' : selectedRatio.id}</span><span>{creditCost} crédits</span></div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <aside className="h-full w-full max-w-sm overflow-y-auto border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Image</h2><p className="text-xs text-gray-500">Choisissez librement ou laissez MUNGWELE optimiser.</p></div><button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div>

            <div className="mt-7 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <button onClick={() => { setEngineOpen((v) => !v); setRatioOpen(false); }} className="flex w-full items-center justify-between p-4 text-left">
                  <div><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Moteur</p><p className="mt-1 text-sm font-black text-white">{selectedEngine.name}</p><p className="mt-1 text-[11px] leading-4 text-gray-500">{selectedEngine.description}</p></div><ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${engineOpen ? 'rotate-180' : ''}`} />
                </button>
                {engineOpen && <div className="border-t border-white/10 p-2">{ENGINES.map((item) => <button key={item.id} onClick={() => { setEngine(item.id); setEngineOpen(false); }} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-white/[0.05]"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${engine === item.id ? 'border-purple-400 bg-purple-500/20 text-purple-200' : 'border-white/15 text-transparent'}`}><Check className="h-3 w-3" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-xs font-black text-white">{item.name}{item.badge && <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[9px] text-purple-200">{item.badge}</span>}</span><span className="mt-1 block text-[10px] leading-4 text-gray-500">{item.description}</span></span></button>)}</div>}
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
                <button onClick={() => { setRatioOpen((v) => !v); setEngineOpen(false); }} className="flex w-full items-center justify-between p-4 text-left">
                  <div><p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Format</p><p className="mt-1 text-sm font-black text-white">{selectedRatio.name}</p><p className="mt-1 text-[11px] leading-4 text-gray-500">{selectedRatio.description}</p></div><ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition ${ratioOpen ? 'rotate-180' : ''}`} />
                </button>
                {ratioOpen && <div className="max-h-[48vh] overflow-y-auto border-t border-white/10 p-2">{RATIOS.map((item) => <button key={item.id} onClick={() => { setRatio(item.id); setRatioOpen(false); }} className="flex w-full items-start gap-3 rounded-xl p-3 text-left hover:bg-white/[0.05]"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${ratio === item.id ? 'border-blue-400 bg-blue-500/20 text-blue-200' : 'border-white/15 text-transparent'}`}><Check className="h-3 w-3" /></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-xs font-black text-white">{item.name}{item.badge && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] text-blue-200">{item.badge}</span>}</span><span className="mt-1 block text-[10px] leading-4 text-gray-500">{item.description}</span></span></button>)}</div>}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-500/15 bg-amber-500/[0.05] p-4"><div className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p className="text-[10px] leading-5 text-gray-400"><strong className="text-amber-200">Mode Automatique :</strong> MUNGWELE privilégie le moteur compatible le plus économique qui répond au niveau de qualité demandé. Un choix manuel peut modifier le coût final.</p></div></div>
            <button onClick={() => setSettingsOpen(false)} className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-black text-[#08101f]">Appliquer</button>
          </aside>
        </div>
      )}
    </div>
  );
};