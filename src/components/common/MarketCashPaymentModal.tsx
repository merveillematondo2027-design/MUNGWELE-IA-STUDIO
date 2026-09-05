import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, Info, Loader2, LockKeyhole, Nfc, ScanLine, ShieldCheck, X } from 'lucide-react';
import {
  normalizeCardNumber,
  normalizeExpiry,
  resolveMarketCashCardPayload,
  payWithMarketCashCard,
  type MarketCashPaymentTarget,
} from '../../services/marketCashPaymentService';

export type MarketCashPaymentModalProps = {
  target: MarketCashPaymentTarget;
  userId?: string;
  userEmail?: string;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

type CaptureMethod = 'manual' | 'qr' | 'nfc';
type ScannerControls = { stop: () => void };

function friendlyCaptureError(error: any, mode: 'qr' | 'nfc') {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  const joined = `${name} ${message}`.toLowerCase();

  if (joined.includes('permission denied') || joined.includes('notallowederror') || joined.includes('permission')) {
    return mode === 'qr'
      ? 'Autorisez la caméra dans le navigateur puis réessayez.'
      : 'Autorisez le NFC dans Chrome puis réessayez.';
  }
  if (joined.includes('securityerror') || joined.includes('secure context')) {
    return 'Cette fonction nécessite une page HTTPS ouverte directement dans le navigateur.';
  }
  if (joined.includes('not supported') || joined.includes('not available') || joined.includes("n'est pas disponible")) {
    return mode === 'qr'
      ? 'Le scanner QR n’est pas disponible sur ce navigateur.'
      : 'Le NFC Web n’est pas disponible sur ce navigateur.';
  }
  if (joined.includes('top-level browsing context')) {
    return 'Ouvrez MUNGWELE directement dans le navigateur pour utiliser cette fonction.';
  }
  return message || (mode === 'qr' ? 'Lecture QR impossible.' : 'Lecture NFC impossible.');
}

export const MarketCashPaymentModal: React.FC<MarketCashPaymentModalProps> = ({
  target,
  userId,
  userEmail,
  onClose,
  onSuccess,
}) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('manual');
  const [busy, setBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [scannerStatus, setScannerStatus] = useState('Cadrez le QR Market-Cash dans le carré.');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [success, setSuccess] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerControlsRef = useRef<ScannerControls | null>(null);
  const scanHandledRef = useRef(false);

  const embedded = typeof window !== 'undefined' && window.self !== window.top;

  const stopCamera = () => {
    try {
      scannerControlsRef.current?.stop();
    } catch {
      // Best-effort cleanup.
    }
    scannerControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    scanHandledRef.current = false;
  };

  const closeScanner = () => {
    stopCamera();
    setScanBusy(false);
    setScannerOpen(false);
    setScannerError('');
    setScannerStatus('Cadrez le QR Market-Cash dans le carré.');
  };

  useEffect(() => () => stopCamera(), []);

  const applyCapturedPayload = async (raw: string, method: CaptureMethod) => {
    const parsed = await resolveMarketCashCardPayload(raw);
    if (!parsed.cardNumber && !parsed.expiry && !parsed.cardHolder) {
      throw new Error('Ce QR ne contient pas une carte Market-Cash reconnue.');
    }
    if (parsed.cardNumber) setCardNumber(normalizeCardNumber(parsed.cardNumber));
    if (parsed.cardHolder) setCardHolder(parsed.cardHolder);
    if (parsed.expiry) setExpiry(parsed.expiry);
    setCvv('');
    setCaptureMethod(method);
    setInfo(
      method === 'qr'
        ? 'Carte Market-Cash reconnue. Vérifiez les informations puis saisissez le CVV.'
        : 'Carte Market-Cash reconnue par NFC. Saisissez le CVV pour confirmer.',
    );
  };

  const beginQrScanner = async () => {
    if (!scannerOpen || !videoRef.current) return;
    setError('');
    setInfo('');
    setScannerError('');
    setScannerStatus('Activation de la caméra…');
    setCaptureMethod('qr');
    setScanBusy(true);
    stopCamera();

    try {
      if (!window.isSecureContext) throw new Error('La caméra nécessite une page HTTPS.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Caméra non disponible sur cet appareil.');

      const video = videoRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setScannerStatus('Cadrez le QR Market-Cash dans le carré.');

      const NativeDetector = (window as any).BarcodeDetector;
      if (NativeDetector) {
        const detector = new NativeDetector({ formats: ['qr_code'] });
        let active = true;
        scannerControlsRef.current = { stop: () => { active = false; } };
        setScanBusy(false);

        while (active && scannerOpen && video.readyState >= 2) {
          try {
            const codes = await detector.detect(video);
            const raw = codes?.[0]?.rawValue;
            if (raw && !scanHandledRef.current) {
              scanHandledRef.current = true;
              setScannerStatus('QR détecté…');
              try {
                await applyCapturedPayload(raw, 'qr');
                closeScanner();
                return;
              } catch (scanError: any) {
                scanHandledRef.current = false;
                setScannerError(String(scanError?.message || scanError));
                setScannerStatus('Présentez un QR Market-Cash valide.');
              }
            }
          } catch {
            // Ignore transient detector errors while the camera is running.
          }
          await new Promise((resolve) => window.setTimeout(resolve, 220));
        }
        return;
      }

      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const reader = new BrowserQRCodeReader();
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        video,
        (result) => {
          if (!result || scanHandledRef.current) return;
          scanHandledRef.current = true;
          setScannerStatus('QR détecté…');
          void (async () => {
            try {
              await applyCapturedPayload(result.getText(), 'qr');
              closeScanner();
            } catch (scanError: any) {
              scanHandledRef.current = false;
              setScannerError(String(scanError?.message || scanError));
              setScannerStatus('Présentez un QR Market-Cash valide.');
            }
          })();
        },
      );
      scannerControlsRef.current = controls;
      setScanBusy(false);
    } catch (e: any) {
      stopCamera();
      setScanBusy(false);
      setScannerError(friendlyCaptureError(e, 'qr'));
      setScannerStatus('Scanner indisponible.');
    }
  };

  useEffect(() => {
    if (!scannerOpen) return;
    const timer = window.setTimeout(() => void beginQrScanner(), 80);
    return () => window.clearTimeout(timer);
    // scannerOpen intentionally controls the scanner lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen]);

  const openQrScanner = () => {
    setError('');
    setInfo('');
    setScannerError('');
    setScannerStatus('Cadrez le QR Market-Cash dans le carré.');
    setScannerOpen(true);
  };

  const openDirectly = () => {
    const opened = window.open(window.location.href, '_blank', 'noopener,noreferrer');
    if (!opened) setInfo('Ouvrez cette application dans un nouvel onglet du navigateur pour continuer.');
  };

  const readNfc = async () => {
    setError('');
    setInfo('');
    setCaptureMethod('nfc');
    closeScanner();

    if (embedded) {
      setInfo('Le NFC est bloqué dans cet aperçu. Ouvrez MUNGWELE directement dans Chrome pour l’utiliser.');
      return;
    }
    if (!window.isSecureContext) {
      setInfo('Le NFC nécessite une page HTTPS ouverte directement dans le navigateur.');
      return;
    }

    setScanBusy(true);
    try {
      const Reader = (window as any).NDEFReader;
      if (!Reader) throw new Error("Le NFC Web n'est pas disponible sur cet appareil ou navigateur.");
      const reader = new Reader();
      await reader.scan();
      setInfo('NFC actif. Approchez une carte ou un tag Market-Cash compatible du téléphone.');

      const raw = await new Promise<string>((resolve, reject) => {
        const timer = window.setTimeout(
          () => reject(new Error('Aucune carte NFC détectée. Touchez NFC pour réessayer.')),
          25000,
        );
        reader.onreadingerror = () => {
          window.clearTimeout(timer);
          reject(new Error('Lecture NFC impossible.'));
        };
        reader.onreading = (event: any) => {
          window.clearTimeout(timer);
          try {
            const decoder = new TextDecoder();
            const records: any[] = Array.from(event?.message?.records || []);
            const record = records.find(
              (item: any) =>
                item?.data &&
                (item.recordType === 'text' ||
                  item.recordType === 'url' ||
                  item.recordType === 'mime' ||
                  item.mediaType === 'application/json' ||
                  item.mediaType === 'text/plain'),
            );
            if (!record?.data) throw new Error('Carte NFC Market-Cash non reconnue.');
            const decoded = decoder.decode(record.data).replace(/^\u0002[a-z]{2}/i, '').trim();
            if (!decoded) throw new Error('Carte NFC Market-Cash vide.');
            resolve(decoded);
          } catch (e) {
            reject(e);
          }
        };
      });
      await applyCapturedPayload(raw, 'nfc');
    } catch (e: any) {
      setInfo('');
      setError(friendlyCaptureError(e, 'nfc'));
    } finally {
      setScanBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const holder = cardHolder.trim();
    const pan = cardNumber.replace(/\D/g, '');
    const cvvDigits = cvv.replace(/\D/g, '');
    if (holder.length < 2) return setError('Le nom du titulaire est obligatoire.');
    if (pan.length < 12 || pan.length > 19) return setError('Numéro de carte invalide.');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setError('Expiration attendue au format MM/AA.');
    if (cvvDigits.length < 3 || cvvDigits.length > 4) return setError('CVV requis.');

    setBusy(true);
    try {
      const result = await payWithMarketCashCard({
        target,
        card: { cardNumber: pan, cardHolder: holder, expiry, cvv: cvvDigits },
        captureMethod,
        userId,
        userEmail,
      });
      const reference = result.transactionId || result.reference;
      setSuccess(reference ? `Paiement confirmé • ${reference}` : 'Paiement confirmé par Market-Cash.');
      setInfo('');
      setCvv('');
      onSuccess?.(reference);
    } catch (e: any) {
      setError(String(e?.message || e));
      setCvv('');
    } finally {
      setBusy(false);
    }
  };

  const nfcWaiting = scanBusy && captureMethod === 'nfc';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-2.5 sm:p-4">
      <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-[22px] border border-white/10 bg-[#111318] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="border-b border-white/[0.08] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#7f8a99]">
                <span className="inline-flex h-7 items-center rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[10px] font-black tracking-[0.08em] text-white">MARKET-CASH</span>
                <span>Paiement sécurisé</span>
              </div>
              <p className="mt-4 text-[12px] font-medium text-[#8f98a5]">Paiement à MUNGWELE IA STUDIO</p>
              <h3 className="mt-1 text-[21px] font-bold text-white">{target.label}</h3>
              <p className="mt-2 text-[27px] font-black tracking-tight text-white">${target.amountUsd.toFixed(2)} <span className="text-[13px] font-bold text-[#8f98a5]">USD</span></p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-[#aab2bd] transition hover:bg-white/[0.08] hover:text-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#171a20] p-3.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#37c991]" />
            <div>
              <p className="text-sm font-semibold text-white">Carte Market-Cash</p>
              <p className="mt-1 text-[12px] leading-5 text-[#8f98a5]">Saisissez votre carte ou scannez son QR. Le CVV est toujours saisi manuellement et n’est pas enregistré.</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-[12px] font-semibold text-[#c8cdd5]">Nom du titulaire</span>
              <input
                value={cardHolder}
                onChange={(e) => { setCaptureMethod('manual'); setCardHolder(e.target.value.slice(0, 80)); }}
                autoComplete="cc-name"
                required
                placeholder="NOM DU TITULAIRE"
                className="w-full rounded-xl border border-white/10 bg-[#0d0f13] px-4 py-3.5 text-sm font-semibold uppercase text-white outline-none transition placeholder:text-[#5d6470] focus:border-[#37c991]/70 focus:ring-2 focus:ring-[#37c991]/10"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[12px] font-semibold text-[#c8cdd5]">Numéro de carte</span>
              <div className="relative">
                <CreditCard className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#707986]" />
                <input
                  value={cardNumber}
                  onChange={(e) => { setCaptureMethod('manual'); setCardNumber(normalizeCardNumber(e.target.value)); }}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  required
                  placeholder="4585 0200 02•• ••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0d0f13] py-3.5 pl-11 pr-24 text-sm font-semibold tracking-[0.04em] text-white outline-none transition placeholder:text-[#5d6470] focus:border-[#37c991]/70 focus:ring-2 focus:ring-[#37c991]/10"
                />
                <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
                  <button type="button" onClick={openQrScanner} disabled={busy || nfcWaiting} aria-label="Scanner le QR Market-Cash" title="Scanner le QR" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[#c8cdd5] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"><ScanLine className="h-4 w-4" /></button>
                  <button type="button" onClick={readNfc} disabled={busy || scannerOpen || nfcWaiting} aria-label="Lire la carte avec NFC" title="NFC" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-[#c8cdd5] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50">{nfcWaiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Nfc className="h-4 w-4" />}</button>
                </div>
              </div>
            </label>

            {scannerOpen && (
              <div className="rounded-2xl border border-white/10 bg-[#0b0d10] p-3.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-bold text-white">Scanner le QR Market-Cash</p>
                    <p className="mt-0.5 text-[11px] text-[#7f8792]">La caméra reste dans cette fenêtre.</p>
                  </div>
                  <button type="button" onClick={closeScanner} className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-[#aab2bd]" aria-label="Fermer le scanner"><X className="h-4 w-4" /></button>
                </div>

                <div className="mx-auto aspect-square w-full max-w-[270px] overflow-hidden rounded-[18px] border border-white/10 bg-black shadow-inner">
                  <div className="relative h-full w-full">
                    <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
                    <div className="pointer-events-none absolute inset-0 bg-black/10" />
                    <div className="pointer-events-none absolute inset-[12%]">
                      <span className="absolute left-0 top-0 h-10 w-10 border-l-2 border-t-2 border-white/90" />
                      <span className="absolute right-0 top-0 h-10 w-10 border-r-2 border-t-2 border-white/90" />
                      <span className="absolute bottom-0 left-0 h-10 w-10 border-b-2 border-l-2 border-white/90" />
                      <span className="absolute bottom-0 right-0 h-10 w-10 border-b-2 border-r-2 border-white/90" />
                    </div>
                    {scanBusy && <div className="absolute inset-0 grid place-items-center bg-black/45"><div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-[11px] font-semibold text-white"><Loader2 className="h-4 w-4 animate-spin" />Ouverture de la caméra…</div></div>}
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-[11px] font-medium text-[#aab2bd]">{scannerStatus}</p>
                  {scannerError && <p className="mx-auto mt-2 max-w-sm text-[11px] leading-4 text-[#f0a6a6]">{scannerError}</p>}
                  {scannerError && <button type="button" onClick={() => { closeScanner(); window.setTimeout(() => setScannerOpen(true), 80); }} className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white">Réessayer</button>}
                </div>
              </div>
            )}

            {nfcWaiting && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#171a20] px-4 py-3">
                <Nfc className="h-4 w-4 text-[#37c991]" />
                <div><p className="text-[12px] font-semibold text-white">NFC actif</p><p className="mt-0.5 text-[11px] text-[#8f98a5]">Approchez une carte ou un tag Market-Cash compatible du téléphone.</p></div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-2"><span className="text-[12px] font-semibold text-[#c8cdd5]">Expiration</span><input value={expiry} onChange={(e) => { setCaptureMethod('manual'); setExpiry(normalizeExpiry(e.target.value)); }} inputMode="numeric" autoComplete="cc-exp" required placeholder="MM/AA" className="w-full rounded-xl border border-white/10 bg-[#0d0f13] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-[#5d6470] focus:border-[#37c991]/70 focus:ring-2 focus:ring-[#37c991]/10" /></label>
              <label className="space-y-2"><span className="text-[12px] font-semibold text-[#c8cdd5]">CVV</span><div className="relative"><input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" type="password" required placeholder="•••" className="w-full rounded-xl border border-white/10 bg-[#0d0f13] px-4 py-3.5 pr-10 text-sm tracking-[0.18em] text-white outline-none transition placeholder:text-[#5d6470] focus:border-[#37c991]/70 focus:ring-2 focus:ring-[#37c991]/10" /><LockKeyhole className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#707986]" /></div></label>
            </div>
          </div>

          {info && (
            <div className="rounded-xl border border-white/10 bg-[#171a20] px-4 py-3 text-[12px] text-[#c8cdd5]">
              <div className="flex items-start gap-2.5"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[#7fa8ff]" /><div className="flex-1"><p className="leading-5">{info}</p>{embedded && captureMethod === 'nfc' && <button type="button" onClick={openDirectly} className="mt-2 inline-flex items-center gap-1.5 font-bold text-white"><ExternalLink className="h-3.5 w-3.5" />Ouvrir directement</button>}</div></div>
            </div>
          )}
          {error && <div className="rounded-xl border border-[#6a3030] bg-[#241516] px-4 py-3 text-[12px] text-[#f0b0b0]">{error}</div>}
          {success && <div className="flex items-center gap-2 rounded-xl border border-[#255942] bg-[#13221c] px-4 py-3 text-[12px] text-[#bdebd7]"><CheckCircle2 className="h-4 w-4" />{success}</div>}

          <button disabled={busy || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#37c991] py-3.5 text-sm font-black text-[#07130e] transition hover:bg-[#45d9a0] disabled:cursor-not-allowed disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Traitement…</> : success ? 'Paiement effectué' : `Payer $${target.amountUsd.toFixed(2)}`}</button>

          <div className="flex items-center justify-center gap-2 text-center text-[10px] leading-4 text-[#68717d]"><ShieldCheck className="h-3.5 w-3.5" /><span>Paiement traité par Market-Cash. Le CVV n’est jamais enregistré.</span></div>
        </form>
      </div>
    </div>
  );
};
