import React, { useEffect, useRef, useState } from 'react';
import { Download, Film, Image as ImageIcon, Loader2, Plus, Send, Settings2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { GenerationRecord, ImageGenerationSettings } from '../../types';

const MAX_REFERENCE_IMAGES = 8; // MUNGWELE operational cap; provider capability is validated server-side.

export const ImageStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, generations, setImageToVideoTransfer, setActiveStudio, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latest = generations.find((g) => g.type === 'image' && (!user.id || g.userId === user.id));
  const creditCost = 8 + Math.max(0, referenceImages.length - 1) * 2;

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mungwele.resume.project');
      if (!raw) return;
      const project = JSON.parse(raw) as GenerationRecord;
      if (project.type !== 'image') return;
      setPrompt(project.prompt || '');
      const settings = project.settings as ImageGenerationSettings;
      if (Array.isArray(settings?.referenceImages)) setReferenceImages(settings.referenceImages.filter((item): item is string => typeof item === 'string'));
      else if (typeof settings?.referenceImage === 'string') setReferenceImages([settings.referenceImage]);
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
    const reason = referenceImages.length ? `Retouche OpenAI avec ${referenceImages.length} référence(s)` : 'Génération image OpenAI';
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, prompt: prompt.trim(), enhancedPrompt: prompt.trim(), referenceImages }),
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
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Image</h1><p className="mt-1 text-xs text-gray-500">GPT-Image-2 • génération et édition avec plusieurs références.</p></div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-5">
          {isGenerating ? (
            <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><Loader2 className="mb-4 h-9 w-9 animate-spin text-purple-300" /><p className="text-sm font-black text-white">OpenAI crée votre image…</p><p className="mt-2 text-xs text-gray-500">Les références sont envoyées ensemble pour préserver les éléments demandés.</p></div>
          ) : latest ? (
            <div className="mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20"><img src={latest.resultUrl} alt={latest.title} className="max-h-[55vh] w-full object-contain" /></div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { const a=document.createElement('a'); a.href=latest.resultUrl; a.download=`mungwele-image-${latest.id}.png`; a.click(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> Télécharger</button>
                <button onClick={toVideo} className="inline-flex items-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs font-bold text-pink-200"><Film className="h-3.5 w-3.5" /> Animer en vidéo</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[36vh] flex-col items-center justify-center text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10"><ImageIcon className="h-5 w-5 text-purple-200" /></span><p className="text-sm font-bold text-gray-300">Commencez par votre idée.</p><p className="mt-1 max-w-md text-xs leading-5 text-gray-600">Ajoutez une ou plusieurs références avec + si vous souhaitez conserver un visage, un produit, une tenue, une composition ou un style.</p></div>
          )}
        </div>

        {referenceImages.length > 0 && (
          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] text-gray-500"><span>Références {referenceImages.length}/{MAX_REFERENCE_IMAGES}</span><button onClick={() => setReferenceImages([])} className="font-bold text-gray-400">Tout retirer</button></div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {referenceImages.map((src, index) => <div key={`${index}-${src.slice(-12)}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-purple-400/30"><img src={src} alt={`Référence ${index + 1}`} className="h-full w-full object-cover" /><button onClick={() => setReferenceImages((prev) => prev.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-black/75 p-1"><X className="h-3 w-3" /></button></div>)}
            </div>
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
          <div className="flex items-center justify-between px-3 pb-1 pt-2 text-[10px] text-gray-600"><span>GPT-Image-2 • {referenceImages.length ? `${referenceImages.length} réf.` : 'texte'}</span><span>{creditCost} crédits</span></div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}><aside className="h-full w-full max-w-sm border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Image</h2><p className="text-xs text-gray-500">La tarification augmente avec les références pour protéger les coûts API.</p></div><button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div><div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-bold text-white">Références multiples</p><p className="mt-2 text-[11px] leading-5 text-gray-500">Limite opérationnelle MUNGWELE : {MAX_REFERENCE_IMAGES}. Le serveur refuse les formats ou volumes non supportés au lieu de facturer une génération impossible.</p></div><button onClick={() => setSettingsOpen(false)} className="mt-6 w-full rounded-2xl bg-white py-3 text-sm font-black text-[#08101f]">Appliquer</button></aside></div>
      )}
    </div>
  );
};