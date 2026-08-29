import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Plus, Send, Settings2, X, Loader2, Film, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ImageStudio: React.FC = () => {
  const { user, useCredits, refundCredits, addGeneration, addNotification, triggerCelebration, generations, setImageToVideoTransfer, setActiveStudio, setActiveTab } = useApp();
  const [prompt, setPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const creditCost = 8;
  const latest = generations.find((g) => g.type === 'image' && (!user.id || g.userId === user.id));

  const loadImage = (file: File) => {
    if (!file.type.startsWith('image/')) return addNotification('error', 'Format invalide', 'Utilisez PNG, JPG ou WEBP.');
    if (file.size > 10 * 1024 * 1024) return addNotification('error', 'Fichier trop lourd', '10 Mo maximum.');
    const reader = new FileReader();
    reader.onload = () => setReferenceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!prompt.trim()) return addNotification('warning', 'Prompt requis', 'Décrivez ce que vous voulez créer ou modifier.');
    const reason = referenceImage ? 'Retouche image par prompt' : 'Génération image par prompt';
    if (!useCredits(creditCost, reason)) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, prompt: prompt.trim(), enhancedPrompt: prompt.trim(), referenceImage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.generation) throw new Error(data.error || 'La génération a échoué.');
      addGeneration(data.generation);
      triggerCelebration();
      setPrompt('');
      setReferenceImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      addNotification('success', 'Image prête', 'Votre création est disponible.');
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
      <div className="mb-5 flex items-center justify-between px-1">
        <div><h1 className="text-xl font-black text-white sm:text-2xl">Studio Image</h1><p className="mt-1 text-xs text-gray-500">Écrivez, joignez une référence si nécessaire, générez.</p></div>
        <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-amber-300">{creditCost} crédits</span>
      </div>

      <div className="flex flex-1 flex-col justify-end rounded-[28px] border border-white/10 bg-white/[0.025] p-3 sm:p-5">
        <div className="flex-1 overflow-y-auto pb-6">
          {latest ? (
            <div className="mx-auto max-w-3xl">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                <img src={latest.resultUrl} alt={latest.title} className="max-h-[58vh] w-full object-contain" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { const a=document.createElement('a'); a.href=latest.resultUrl; a.download=`mungwele-image-${latest.id}.png`; a.click(); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-gray-200"><Download className="h-3.5 w-3.5" /> Télécharger</button>
                <button onClick={toVideo} className="inline-flex items-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/10 px-3 py-2 text-xs font-bold text-pink-200"><Film className="h-3.5 w-3.5" /> Animer avec Veo</button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[42vh] flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10"><ImageIcon className="h-5 w-5 text-purple-200" /></span>
              <p className="text-sm font-bold text-gray-300">Votre prochaine image commence par un prompt.</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-gray-600">Pour une retouche, ajoutez simplement l’image avec + puis décrivez uniquement la modification.</p>
            </div>
          )}
        </div>

        {referenceImage && (
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-purple-400/30 bg-black/20"><img src={referenceImage} alt="Référence" className="h-full w-full object-cover" /><button onClick={() => setReferenceImage(null)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1"><X className="h-3 w-3" /></button></div>
            <span className="text-[11px] text-gray-500">Image de référence ajoutée</span>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-[#0b1426]/95 p-2 shadow-2xl">
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && loadImage(e.target.files[0])} />
          <div className="flex items-end gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]" title="Ajouter une image"><Plus className="h-5 w-5" /></button>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate(); } }} rows={2} placeholder={referenceImage ? 'Décrivez uniquement la modification à appliquer…' : 'Décrivez l’image que vous voulez créer…'} className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-gray-600" />
            <button onClick={() => setSettingsOpen(true)} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-gray-400 hover:text-white" title="Réglages"><Settings2 className="h-4 w-4" /></button>
            <button onClick={generate} disabled={isGenerating || !prompt.trim()} className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-blue-600 text-white disabled:opacity-40" title="Générer">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}>
          <aside className="h-full w-full max-w-sm border-l border-white/10 bg-[#09111f] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-white">Réglages Image</h2><p className="text-xs text-gray-500">Le prompt reste le contrôle créatif principal.</p></div><button onClick={() => setSettingsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"><X className="h-4 w-4" /></button></div>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs font-bold text-white">Coût actuel</p><p className="mt-2 text-2xl font-black text-amber-300">{creditCost} crédits</p><p className="mt-2 text-[11px] leading-5 text-gray-500">Les styles, textes, couleurs et détails se décrivent directement dans le prompt. Aucun preset n’est imposé.</p></div>
            <button onClick={() => setSettingsOpen(false)} className="mt-6 w-full rounded-2xl bg-white text-sm font-black text-[#08101f] py-3">Appliquer</button>
          </aside>
        </div>
      )}
    </div>
  );
};
