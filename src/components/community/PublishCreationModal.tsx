import React, { useState } from 'react';
import { Globe2, Loader2, Send, X } from 'lucide-react';
import type { GenerationRecord } from '../../types';
import { useApp } from '../../context/AppContext';
import { publishGeneration } from '../../services/socialService';

export const PublishCreationModal: React.FC<{ item: GenerationRecord | null; onClose: () => void }> = ({ item, onClose }) => {
  const { user, addNotification } = useApp();
  const [caption, setCaption] = useState(item?.publicationCaption || '');
  const [saving, setSaving] = useState(false);
  if (!item) return null;

  const publish = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await publishGeneration({ generation: item, user, caption });
      addNotification('success', 'Publication réussie', user.role === 'admin' ? 'La création est publiée par le compte officiel MUNGWELE AI.' : 'Votre création est maintenant visible dans la communauté.');
      onClose();
    } catch (error: any) {
      addNotification('error', 'Publication impossible', error?.message || 'Vérifiez les règles Firestore puis réessayez.');
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
    <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a1324] shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-white/10 p-4"><div><h3 className="text-base font-black text-white">Publier dans la communauté</h3><p className="mt-1 text-[11px] text-gray-500">Ajoutez un message avant de rendre la création publique.</p></div><button onClick={onClose} className="rounded-xl bg-white/[0.05] p-2"><X className="h-4 w-4" /></button></div>
      <div className="p-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">{item.type === 'video' || item.type === 'clips' ? <video src={item.resultUrl} muted playsInline className="max-h-64 w-full object-contain" /> : item.type === 'music' ? <div className="flex h-40 items-center justify-center text-sm font-bold text-blue-200">Création musicale</div> : <img src={item.thumbnailUrl || item.resultUrl} alt={item.title} className="max-h-64 w-full object-contain" />}</div>
        <div className="mt-4 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 text-[11px] text-gray-400"><Globe2 className="mr-2 inline h-4 w-4 text-cyan-300" />{user.role === 'admin' ? 'Cette publication apparaîtra officiellement sous « MUNGWELE AI ».' : `La publication apparaîtra sous votre compte « ${user.name || 'Utilisateur'} ».`}</div>
        <label className="mt-4 block text-[11px] font-black uppercase tracking-wider text-gray-500">Description / message</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={1500} rows={5} placeholder="Présentez cette création à la communauté…" className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#07101f] p-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-purple-500/40" />
        <div className="mt-2 flex justify-between text-[10px] text-gray-600"><span>La description sera affichée avant le média.</span><span>{caption.length}/1500</span></div>
        <button onClick={publish} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publier maintenant</button>
      </div>
    </div>
  </div>;
};
