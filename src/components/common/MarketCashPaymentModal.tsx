import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ExternalLink, Info, Loader2, Nfc, ScanLine, ShieldCheck, X } from 'lucide-react';
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

function friendlyCaptureError(error: any, mode: 'qr' | 'nfc') {
  const name = String(error?.name || '');
  const message = String(error?.message || error || '');
  const joined = `${name} ${message}`.toLowerCase();
  if (joined.includes('top-level browsing context')) return 'Le NFC doit être lancé dans MUNGWELE ouvert directement, pas dans l’aperçu intégré.';
  if (joined.includes('permission denied') || joined.includes('notallowederror') || joined.includes('permission')) {
    return mode === 'qr'
      ? 'La caméra n’est pas autorisée dans cet aperçu. Utilisez la prise de photo du QR ou ouvrez MUNGWELE directement.'
      : 'L’accès NFC a été refusé. Ouvrez MUNGWELE directement dans Chrome et autorisez le NFC.';
  }
  if (joined.includes('securityerror') || joined.includes('secure context')) return 'Cette fonction nécessite une page HTTPS ouverte directement.';
  if (joined.includes('not supported') || joined.includes('not available') || joined.includes("n'est pas disponible")) {
    return mode === 'qr' ? 'Le lecteur QR n’est pas disponible sur ce navigateur.' : 'Le NFC Web n’est pas disponible sur ce navigateur.';
  }
  return message || (mode === 'qr' ? 'Lecture QR impossible.' : 'Lecture NFC impossible.');
}

export const MarketCashPaymentModal: React.FC<MarketCashPaymentModalProps> = ({ target, userId, userEmail, onClose, onSuccess }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('manual');
  const [busy, setBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showQrPhotoAction, setShowQrPhotoAction] = useState(false);
  const [success, setSuccess] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrFileRef = useRef<HTMLInputElement | null>(null);

  const embedded = typeof window !== 'undefined' && window.self !== window.top;

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => () => stopCamera(), []);

  const applyCapturedPayload = async (raw: string, method: CaptureMethod) => {
    const parsed = await resolveMarketCashCardPayload(raw);
    if (!parsed.cardNumber && !parsed.expiry && !parsed.cardHolder) throw new Error('Aucune information de carte Market-Cash reconnue.');
    if (parsed.cardNumber) setCardNumber(normalizeCardNumber(parsed.cardNumber));
    if (parsed.cardHolder) setCardHolder(parsed.cardHolder);
    if (parsed.expiry) setExpiry(parsed.expiry);
    setCvv('');
    setCaptureMethod(method);
    setInfo(method === 'qr' ? 'Carte Market-Cash reconnue par QR. Saisissez uniquement le CVV pour confirmer.' : 'Carte Market-Cash reconnue par NFC. Saisissez uniquement le CVV pour confirmer.');
  };

  const decodeQrImage = async (file: File) => {
    const Detector = (window as any).BarcodeDetector;
    if (!Detector) throw new Error("Le lecteur QR n'est pas disponible dans ce navigateur.");
    const detector = new Detector({ formats: ['qr_code'] });
    let source: ImageBitmap | HTMLImageElement | null = null;
    let objectUrl = '';
    try {
      if ('createImageBitmap' in window) {
        source = await createImageBitmap(file);
      } else {
        objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        source = image;
      }
      const codes = await detector.detect(source as any);
      const raw = codes?.[0]?.rawValue;
      if (!raw) throw new Error('Aucun QR Market-Cash détecté sur cette image.');
      await applyCapturedPayload(raw, 'qr');
    } finally {
      if (source && 'close' in source && typeof (source as ImageBitmap).close === 'function') (source as ImageBitmap).close();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };

  const readQrFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setInfo('Lecture du QR Market-Cash…');
    setCaptureMethod('qr');
    setScanBusy(true);
    try {
      await decodeQrImage(file);
      setShowQrPhotoAction(false);
    } catch (e: any) {
      setInfo('');
      setError(friendlyCaptureError(e, 'qr'));
      setShowQrPhotoAction(true);
    } finally {
      setScanBusy(false);
    }
  };

  const openQrCameraFile = () => {
    setError('');
    setInfo('Prenez une photo nette du QR Market-Cash.');
    setShowQrPhotoAction(false);
    qrFileRef.current?.click();
  };

  const scanQr = async () => {
    setError('');
    setInfo('');
    setShowQrPhotoAction(false);
    setCaptureMethod('qr');
    stopCamera();

    // Google AI Studio Preview est un iframe : le sélecteur photo reste fiable
    // même lorsque getUserMedia est bloqué par la politique de l'iframe.
    if (embedded) {
      openQrCameraFile();
      return;
    }

    setScanBusy(true);
    try {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector) throw new Error("Le lecteur QR n'est pas disponible dans ce navigateur.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Caméra non disponible.');
      const detector = new Detector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error('Caméra indisponible.');
      video.srcObject = stream;
      await video.play();
      const deadline = Date.now() + 20000;
      while (Date.now() < deadline) {
        const codes = await detector.detect(video);
        if (codes?.[0]?.rawValue) {
          await applyCapturedPayload(codes[0].rawValue, 'qr');
          stopCamera();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      throw new Error('QR non détecté. Réessayez avec une photo nette.');
    } catch (e: any) {
      setInfo('');
      setError(friendlyCaptureError(e, 'qr'));
      setShowQrPhotoAction(true);
      stopCamera();
    } finally {
      setScanBusy(false);
    }
  };

  const openDirectly = () => {
    const opened = window.open(window.location.href, '_blank', 'noopener,noreferrer');
    if (!opened) setInfo('Ouvrez cette application dans un nouvel onglet du navigateur pour utiliser le NFC.');
  };

  const readNfc = async () => {
    setError('');
    setInfo('');
    setShowQrPhotoAction(false);
    setCaptureMethod('nfc');
    stopCamera();

    if (embedded) {
      setInfo('Le NFC est bloqué par l’aperçu intégré de Google AI Studio. Ouvrez MUNGWELE directement pour activer la lecture NFC.');
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
      setInfo('NFC actif. Approchez maintenant une carte ou un tag Market-Cash compatible NFC du téléphone.');
      const raw = await new Promise<string>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error('Aucune carte NFC détectée. Touchez de nouveau le symbole NFC pour réessayer.')), 25000);
        reader.onreadingerror = () => {
          window.clearTimeout(timer);
          reject(new Error('Lecture NFC impossible.'));
        };
        reader.onreading = (event: any) => {
          window.clearTimeout(timer);
          try {
            const decoder = new TextDecoder();
            const records: any[] = Array.from(event?.message?.records || []);
            const record = records.find((item: any) => item?.data && (item.recordType === 'text' || item.recordType === 'url' || item.recordType === 'mime' || item.mediaType === 'application/json' || item.mediaType === 'text/plain'));
            if (!record?.data) throw new Error('Carte NFC Market-Cash non reconnue.');
            const decoded = decoder.decode(record.data).replace(/^\u0002[a-z]{2}/i, '').trim();
            if (!decoded) throw new Error('Carte NFC Market-Cash vide.');
            resolve(decoded);
          } catch (e) { reject(e); }
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
      onSuccess?.(result.transactionId || result.reference);
    } catch (e: any) {
      setError(String(e?.message || e));
      setCvv('');
    } finally {
      setBusy(false);
    }
  };

  const nfcWaiting = scanBusy && captureMethod === 'nfc';
  const qrWaiting = scanBusy && captureMethod === 'qr';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
          <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Paiement sécurisé Market-Cash</p><h3 className="mt-2 text-xl font-black text-white">{target.label}</h3><p className="mt-1 text-sm font-black text-amber-300">${target.amountUsd.toFixed(2)} USD</p></div>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/5 p-2 text-gray-300 hover:bg-white/10" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" /><div><p className="text-sm font-black text-white">Carte Market-Cash</p><p className="mt-1 text-xs leading-5 text-gray-400">Saisissez les informations ou utilisez le QR/NFC Market-Cash. Le CVV reste toujours à saisir manuellement.</p></div></div></div>

          <div className="space-y-4">
            <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Nom du titulaire</span><input value={cardHolder} onChange={(e)=>{setCaptureMethod('manual');setCardHolder(e.target.value.slice(0,80));}} autoComplete="cc-name" required placeholder="NOM DU TITULAIRE" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm font-semibold uppercase text-white outline-none focus:border-purple-500"/></label>

            <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Numéro de carte</span><div className="relative"><input value={cardNumber} onChange={(e)=>{setCaptureMethod('manual');setCardNumber(normalizeCardNumber(e.target.value));}} inputMode="numeric" autoComplete="cc-number" required placeholder="0000 0000 0000 0000" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3.5 pl-4 pr-24 text-sm font-semibold tracking-wide text-white outline-none focus:border-purple-500"/><div className="absolute inset-y-0 right-2 flex items-center gap-1.5"><button type="button" onClick={scanQr} disabled={scanBusy||busy} aria-label="Scanner le QR Market-Cash" title="Scanner le QR" className={`grid h-9 w-9 place-items-center rounded-xl border ${qrWaiting?'border-cyan-400 bg-cyan-400/15 text-cyan-200':'border-white/10 bg-white/5 text-gray-300'}`}>{qrWaiting?<Loader2 className="h-4 w-4 animate-spin"/>:<ScanLine className="h-4 w-4"/>}</button><button type="button" onClick={readNfc} disabled={scanBusy||busy} aria-label="Activer le NFC Market-Cash" title="Activer le NFC" className={`grid h-9 w-9 place-items-center rounded-xl border ${nfcWaiting?'border-emerald-300 bg-emerald-400/20 text-emerald-200 shadow-[0_0_0_4px_rgba(52,211,153,0.08)]':'border-white/10 bg-white/5 text-gray-300'}`}><Nfc className={`h-4 w-4 ${nfcWaiting?'animate-pulse':''}`}/></button></div></div></label>

            <input ref={qrFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={readQrFile}/>
            {qrWaiting&&streamRef.current&&<video ref={videoRef} className="w-full rounded-2xl border border-cyan-500/20 bg-black" muted playsInline />}
            {(!qrWaiting||!streamRef.current)&&<video ref={videoRef} className="hidden" muted playsInline />}
            {nfcWaiting&&<div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-emerald-100"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-50"/><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-300"/></span><div><p className="text-xs font-black">NFC actif</p><p className="text-[11px] text-emerald-200/80">Approchez une carte/tag Market-Cash NFC du téléphone.</p></div></div>}

            <div className="grid grid-cols-2 gap-3"><label className="space-y-2"><span className="text-xs font-bold text-gray-300">Expiration</span><input value={expiry} onChange={(e)=>{setCaptureMethod('manual');setExpiry(normalizeExpiry(e.target.value));}} inputMode="numeric" autoComplete="cc-exp" required placeholder="MM/AA" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-purple-500"/></label><label className="space-y-2"><span className="text-xs font-bold text-gray-300">CVV</span><input value={cvv} onChange={(e)=>setCvv(e.target.value.replace(/\D/g,'').slice(0,4))} inputMode="numeric" autoComplete="cc-csc" type="password" required placeholder="•••" className="w-full rounded-2xl border border-amber-500/30 bg-black/20 px-4 py-3.5 text-sm tracking-[0.18em] text-white outline-none focus:border-amber-400"/></label></div>
          </div>

          {info && <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/25 px-4 py-3 text-xs text-cyan-100"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300"/><div className="flex-1"><p>{info}</p>{embedded&&captureMethod==='nfc'&&<button type="button" onClick={openDirectly} className="mt-2 inline-flex items-center gap-1.5 font-black text-cyan-300"><ExternalLink className="h-3.5 w-3.5"/>Ouvrir directement</button>}</div></div></div>}
          {showQrPhotoAction&&<button type="button" onClick={openQrCameraFile} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 py-3 text-xs font-black text-cyan-200"><Camera className="h-4 w-4"/>Prendre une photo du QR</button>}
          {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">{error}</div>}
          {success && <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4"/>{success}</div>}
          <button disabled={busy || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-emerald-600 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">{busy?<><Loader2 className="h-4 w-4 animate-spin"/>Traitement Market-Cash…</>:success?'Paiement effectué':`Payer $${target.amountUsd.toFixed(2)}`}</button>
          <p className="text-center text-[10px] leading-4 text-gray-500">Le QR/NFC ne transmet jamais le CVV. Les données carte servent uniquement au paiement en cours.</p>
        </form>
      </div>
    </div>
  );
};
