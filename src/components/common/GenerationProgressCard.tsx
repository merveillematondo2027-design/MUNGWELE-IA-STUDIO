import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import brandMark from '../../assets/mungwele-ai-official-mark.svg';

type GenerationKind = 'image' | 'video';

const STAGES: Record<GenerationKind, Array<{ at: number; label: string; detail: string }>> = {
  image: [
    { at: 3, label: 'Préparation de la demande', detail: 'Analyse du prompt, du format et des réglages.' },
    { at: 14, label: 'Préparation des références', detail: 'Vérification et envoi sécurisé des images de référence.' },
    { at: 28, label: 'Connexion au moteur IA', detail: 'MUNGWELE transmet la création au moteur sélectionné.' },
    { at: 45, label: 'Composition en cours', detail: 'Le moteur construit la scène, les détails et la lumière.' },
    { at: 68, label: 'Rendu de l’image', detail: 'Calcul du résultat dans le format demandé.' },
    { at: 84, label: 'Contrôle du résultat', detail: 'Vérification du fichier reçu et préparation de l’aperçu.' },
    { at: 93, label: 'Finalisation', detail: 'Enregistrement de la création dans votre projet.' },
    { at: 100, label: 'Création terminée', detail: 'Le fournisseur a renvoyé le résultat. Ouverture de votre création…' },
  ],
  video: [
    { at: 3, label: 'Préparation de la demande', detail: 'Analyse du prompt, du type, de la durée et du format.' },
    { at: 12, label: 'Préparation des médias', detail: 'Vérification des images de départ et références.' },
    { at: 24, label: 'Connexion au moteur vidéo', detail: 'Transmission sécurisée au moteur vidéo sélectionné.' },
    { at: 39, label: 'Interprétation de la scène', detail: 'Le moteur analyse mouvements, caméra, sujets et audio.' },
    { at: 57, label: 'Génération des séquences', detail: 'Création progressive des plans et des mouvements.' },
    { at: 73, label: 'Rendu vidéo', detail: 'Assemblage des images, mouvements et audio natif.' },
    { at: 86, label: 'Encodage du résultat', detail: 'Préparation du fichier vidéo final.' },
    { at: 94, label: 'Finalisation', detail: 'Enregistrement de la vidéo dans votre projet.' },
    { at: 100, label: 'Vidéo terminée', detail: 'Le fournisseur a renvoyé le fichier. Ouverture du rendu…' },
  ],
};

export const GenerationProgressCard: React.FC<{
  kind: GenerationKind;
  title?: string;
  subtitle?: string;
  completed?: boolean;
}> = ({ kind, title, subtitle, completed = false }) => {
  const [progress, setProgress] = useState(3);
  const maxBeforeResponse = kind === 'video' ? 94 : 93;

  useEffect(() => {
    setProgress(3);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const speed = kind === 'video' ? 1.35 : 3.1;
      const target = Math.min(maxBeforeResponse, 3 + elapsed * speed);
      setProgress((current) => Math.max(current, Math.round(target)));
    }, 700);
    return () => window.clearInterval(timer);
  }, [kind, maxBeforeResponse]);

  useEffect(() => {
    if (completed) setProgress(100);
  }, [completed]);

  const stage = useMemo(() => {
    const stages = STAGES[kind];
    return [...stages].reverse().find((item) => progress >= item.at) || stages[0];
  }, [kind, progress]);

  return (
    <div className="mx-auto flex min-h-[36vh] w-full max-w-3xl items-center justify-center py-3">
      <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-[#111827] shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.18),transparent_42%),radial-gradient(circle_at_75%_80%,rgba(14,165,233,0.12),transparent_38%)]" />
        <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,.9) 0.7px, transparent 0.7px)', backgroundSize: '16px 16px' }} />
        <img src={brandMark} alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 w-[62%] max-w-[390px] -translate-x-1/2 -translate-y-1/2 opacity-[0.07] blur-[0.2px]" />

        <div className="relative z-10 flex min-h-[330px] flex-col p-5 sm:min-h-[390px] sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-300">{kind === 'image' ? 'Création de l’image' : 'Création de la vidéo'}</p>
              <h3 className="mt-1 text-base font-black text-white sm:text-lg">{title || 'MUNGWELE AI travaille sur votre création'}</h3>
            </div>
            {completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /> : <Loader2 className="h-5 w-5 shrink-0 animate-spin text-cyan-300" />}
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-black/20 shadow-[0_0_60px_rgba(124,58,237,0.18)] sm:h-36 sm:w-36">
              <div className="absolute inset-2 rounded-full border border-purple-400/20" />
              <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">{progress}<span className="text-lg text-gray-400">%</span></div>
            </div>
            <div key={stage.label} className={`mt-6 ${completed ? '' : 'animate-pulse'}`}>
              <p className="text-sm font-black text-white sm:text-base">{stage.label}</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-gray-400">{stage.detail}</p>
            </div>
            {subtitle && <p className="mt-3 text-[10px] font-semibold text-gray-600">{subtitle}</p>}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-semibold text-gray-500"><span>Progression</span><span className="text-right">{completed ? 'Résultat reçu' : 'Le compteur reste sous 100% jusqu’au retour du fournisseur'}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-cyan-400 transition-all duration-700 ease-out" style={{ width: `${progress}%` }} /></div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-300/80"><CheckCircle2 className="h-3.5 w-3.5" /> Vos crédits seront remboursés automatiquement si le fournisseur échoue.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
