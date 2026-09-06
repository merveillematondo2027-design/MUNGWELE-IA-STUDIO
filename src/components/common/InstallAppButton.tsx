import React, { useEffect, useMemo, useState } from 'react';
import { Download, MoreVertical, Share2, X } from 'lucide-react';

type InstallChoice = { outcome: 'accepted' | 'dismissed'; platform: string };

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosDevice() {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isMobileDevice() {
  return window.matchMedia('(max-width: 900px)').matches || /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export const InstallAppButton: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const ios = useMemo(() => typeof navigator !== 'undefined' && isIosDevice(), []);

  useEffect(() => {
    setInstalled(isStandaloneMode());

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    const displayMode = window.matchMedia('(display-mode: standalone)');
    const onDisplayModeChange = () => setInstalled(isStandaloneMode());

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    displayMode.addEventListener?.('change', onDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      displayMode.removeEventListener?.('change', onDisplayModeChange);
    };
  }, []);

  if (installed || dismissed) return null;

  const canNativeInstall = Boolean(installPrompt);
  const shouldShow = canNativeInstall || ios || isMobileDevice();
  if (!shouldShow) return null;

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
      }
      setInstallPrompt(null);
      return;
    }

    setShowHelp(true);
  };

  return (
    <>
      <div
        className="fixed right-4 z-[90] flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1424]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#07101f] transition active:scale-[0.98]"
          aria-label="Installer MUNGWELE IA STUDIO"
        >
          <Download className="h-4 w-4" />
          <span>Installer l’app</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Masquer le bouton d’installation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center" onClick={() => setShowHelp(false)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b1424] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-extrabold text-white">Installer MUNGWELE IA</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">Votre navigateur demande une confirmation avant d’ajouter l’application au téléphone.</p>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-slate-300" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {ios ? (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="flex gap-3 rounded-2xl bg-white/5 p-4"><Share2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300"/><span>Dans Safari, touchez <strong>Partager</strong>.</span></div>
                <div className="flex gap-3 rounded-2xl bg-white/5 p-4"><Download className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300"/><span>Choisissez <strong>Sur l’écran d’accueil</strong>, puis confirmez <strong>Ajouter</strong>.</span></div>
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="flex gap-3 rounded-2xl bg-white/5 p-4"><MoreVertical className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300"/><span>Ouvrez le menu du navigateur.</span></div>
                <div className="flex gap-3 rounded-2xl bg-white/5 p-4"><Download className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300"/><span>Choisissez <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
