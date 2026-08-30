import React, { useMemo, useState } from 'react';
import { Download, Loader2, Lock, X } from 'lucide-react';
import type { GenerationRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { allDownloadOptions, downloadLevelLabel, downloadOptions } from '../../services/downloadPolicy';

export const DownloadOptionsModal: React.FC<{
  item: GenerationRecord | null;
  onClose: () => void;
  community?: boolean;
  ownerName?: string;
}> = ({ item, onClose, community = false, ownerName = '' }) => {
  const { user, addNotification, setActiveTab } = useApp();
  const [downloading, setDownloading] = useState<string | null>(null);
  const allowed = useMemo(() => item ? downloadOptions(item.type, user) : [], [item, user.plan, user.role]);
  const all = useMemo(() => item ? allDownloadOptions(item.type) : [], [item?.type]);
  if (!item) return null;
  const allowedIds = new Set(allowed.map((option) => option.id));

  const start = async (optionId: string) => {
    if (!allowedIds.has(optionId)) { setActiveTab('subscription'); onClose(); return; }
    setDownloading(optionId);
    try {
      const params = new URLSearchParams({ generationId: item.id, format: optionId, community: community ? '1' : '0' });
      const response = await fetch(`/api/media/download?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Téléchargement impossible.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = /filename="?([^";]+)"?/i.exec(disposition);
      const filename = match?.[1] || `mungwele-${item.id}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename; anchor.style.display = 'none';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      addNotification('success', 'Téléchargement lancé', community ? `Le fichier signé MUNGWELE AI • ${ownerName || 'Créateur'} est prêt.` : 'Votre fichier est prêt dans le format choisi.');
      onClose();
    } catch (error: any) { addNotification('error', 'Téléchargement impossible', error?.message || 'Réessayez dans un instant.'); }
    finally { setDownloading(null); }
  };

  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a1324] p-5 shadow-2xl" onClick={(e)=>e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black text-white">Choisir le format</h3><p className="mt-1 text-xs text-gray-500">{downloadLevelLabel(user)} • seules les qualités autorisées sont téléchargeables.</p></div><button onClick={onClose} className="rounded-xl bg-white/[0.05] p-2"><X className="h-4 w-4"/></button></div>
      {community && <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.05] p-3 text-xs leading-5 text-gray-300">Les téléchargements depuis la communauté portent automatiquement la signature MUNGWELE AI et le nom du propriétaire : <strong className="text-cyan-200">{ownerName || 'Créateur MUNGWELE'}</strong>.</div>}
      <div className="mt-4 space-y-2">{all.map((option)=>{const unlocked=allowedIds.has(option.id);return <button key={option.id} disabled={Boolean(downloading)} onClick={()=>void start(option.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${unlocked?'border-white/10 bg-white/[0.035] hover:border-purple-400/35':'border-white/5 bg-white/[0.015] opacity-55'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${unlocked?'bg-purple-500/10 text-purple-200':'bg-white/[0.04] text-gray-600'}`}>{downloading===option.id?<Loader2 className="h-4 w-4 animate-spin"/>:unlocked?<Download className="h-4 w-4"/>:<Lock className="h-4 w-4"/>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-black text-white">{option.label}</span><span className="mt-0.5 block text-[11px] text-gray-500">{option.detail}</span></span>{!unlocked&&<span className="text-[10px] font-black text-amber-300">Améliorer l’offre</span>}</button>})}</div>
      <p className="mt-4 text-[10px] leading-4 text-gray-600">MUNGWELE adapte le fichier à la qualité autorisée même lorsque le fournisseur livre uniquement une résolution supérieure.</p>
    </div>
  </div>;
};
