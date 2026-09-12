import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, LockKeyhole, Nfc, ScanLine, ShieldCheck, X } from 'lucide-react';
import {
  normalizeCardNumber,
  normalizeExpiry,
  payWithMarketCashCard,
  resolveMarketCashCardPayload,
  type MarketCashPaymentTarget,
} from '../../services/marketCashPaymentService';

export type MarketCashLocalCardPaymentModalProps = {
  target: MarketCashPaymentTarget;
  userId?: string;
  userEmail?: string;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

type CaptureMethod = 'manual' | 'qr' | 'nfc';

export const MarketCashLocalCardPaymentModal: React.FC<MarketCashLocalCardPaymentModalProps> = ({ target, userId, userEmail, onClose, onSuccess }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [captureMethod, setCaptureMethod] = useState<CaptureMethod>('manual');
  const [busy, setBusy] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStopRef = useRef<(() => void) | null>(null);

  const pan = cardNumber.replace(/\D/g, '');
  const securityCode = cvv.replace(/\D/g, '');
  const cardNumberComplete = /^\d{16}$/.test(pan);
  const formComplete = cardHolder.trim().length >= 2 && cardNumberComplete && /^\d{2}\/\d{2}$/.test(expiry) && /^\d{3}$/.test(securityCode);

  const stopScanner = () => {
    scannerStopRef.current?.();
    scannerStopRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanBusy(false);
  };

  useEffect(() => () => stopScanner(), []);

  const applyPayload = async (raw: string, method: CaptureMethod) => {
    const parsed = await resolveMarketCashCardPayload(raw);
    if (!parsed.cardNumber) throw new Error('Numéro de carte introuvable dans les données lues.');
    setCardNumber(normalizeCardNumber(parsed.cardNumber));
    if (parsed.cardHolder) setCardHolder(parsed.cardHolder);
    if (parsed.expiry) setExpiry(parsed.expiry);
    setCvv('');
    setError('');
    setCaptureMethod(method);
    setScannerOpen(false);
    stopScanner();
  };

  const openScanner = async () => {
    setError('');
    setScannerOpen(true);
    setScanBusy(true);
    stopScanner();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Le scan QR nécessite HTTPS et l’accès à la caméra.');
      await new Promise((resolve) => setTimeout(resolve, 80));
      const video = videoRef.current;
      if (!video) throw new Error('Caméra indisponible.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream;
      await video.play();
      const NativeDetector = (window as any).BarcodeDetector;
      if (NativeDetector) {
        const detector = new NativeDetector({ formats: ['qr_code'] });
        let active = true;
        scannerStopRef.current = () => { active = false; };
        setScanBusy(false);
        while (active) {
          const codes = await detector.detect(video).catch(() => []);
          const raw = codes?.[0]?.rawValue;
          if (raw) { await applyPayload(raw, 'qr'); return; }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } else {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) void applyPayload(result.getText(), 'qr').catch((e) => setError(String(e?.message || e)));
        });
        scannerStopRef.current = () => controls.stop();
        setScanBusy(false);
      }
    } catch (e: any) {
      stopScanner();
      setError(String(e?.message || e));
    }
  };

  const readNfc = async () => {
    setError('');
    setCaptureMethod('nfc');
    try {
      const Reader = (window as any).NDEFReader;
      if (!Reader || !window.isSecureContext) throw new Error('NFC indisponible sur ce navigateur.');
      const reader = new Reader();
      await reader.scan();
      const raw = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Aucune carte NFC détectée.')), 25000);
        reader.onreadingerror = () => { clearTimeout(timer); reject(new Error('Lecture NFC impossible.')); };
        reader.onreading = (event: any) => {
          clearTimeout(timer);
          const record = Array.from(event?.message?.records || []).find((r: any) => r?.data) as any;
          if (!record?.data) return reject(new Error('Données NFC illisibles.'));
          resolve(new TextDecoder().decode(record.data).replace(/^\u0002[a-z]{2}/i, '').trim());
        };
      });
      await applyPayload(raw, 'nfc');
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (cardHolder.trim().length < 2) return setError('Nom du titulaire requis.');
    if (!cardNumberComplete) return setError('Le numéro de carte doit contenir 16 chiffres.');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setError('Date attendue au format MM/AA.');
    if (!/^\d{3}$/.test(securityCode)) return setError('Le CVV doit contenir 3 chiffres.');

    setBusy(true);
    try {
      const result = await payWithMarketCashCard({
        target,
        card: { cardNumber: pan, cardHolder: cardHolder.trim(), expiry, cvv: securityCode },
        captureMethod,
        userId,
        userEmail,
      });
      const ref = result.transactionId || result.reference;
      setSuccess(ref ? `Paiement confirmé • ${ref}` : 'Paiement confirmé.');
      setCvv('');
      onSuccess?.(ref);
    } catch (e: any) {
      setCvv('');
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
    <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/10 p-5">
        <div>
          <button type="button" onClick={onClose} className="mb-3 text-xs font-bold text-cyan-300">← Modes de paiement</button>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">MARKET-CASH</p>
          <h3 className="mt-1 text-xl font-black text-white">Carte locale Market-Cash</h3>
          <p className="mt-1 text-xs text-gray-400">{target.label}</p>
          <p className="mt-3 text-3xl font-black text-white">${target.amountUsd.toFixed(2)} <span className="text-xs text-gray-400">USD</span></p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400" aria-label="Retour"><X className="h-5 w-5" /></button>
      </div>

      <form onSubmit={submit} className="space-y-5 p-5">
        <div className="flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4"><ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" /><p className="text-xs leading-5 text-gray-300">Saisissez les informations de votre carte Market-Cash, scannez son QR ou utilisez NFC. Market-Cash vérifie ensuite la carte et autorise ou refuse le paiement.</p></div>

        <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Nom du titulaire</span><input value={cardHolder} onChange={(e) => { setCardHolder(e.target.value.slice(0, 80)); setError(''); }} autoComplete="cc-name" placeholder="NOM DU TITULAIRE" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm uppercase text-white outline-none focus:border-purple-500" /></label>

        <label className="block space-y-2">
          <span className="flex items-center justify-between text-xs font-bold text-gray-300"><span>Numéro de carte</span><span className="text-cyan-300">Paiement Market-Cash</span></span>
          <div className="relative"><CreditCard className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={cardNumber} onChange={(e) => { setCaptureMethod('manual'); setCardNumber(normalizeCardNumber(e.target.value)); setError(''); }} inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-24 text-sm text-white outline-none focus:border-purple-500" /><div className="absolute inset-y-0 right-2 flex items-center gap-1"><button type="button" onClick={() => void openScanner()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]" aria-label="Scanner le QR"><ScanLine className="h-4 w-4" /></button><button type="button" onClick={() => void readNfc()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]" aria-label="Lire par NFC"><Nfc className="h-4 w-4" /></button></div></div>
        </label>

        {scannerOpen && <div className="rounded-2xl border border-white/10 bg-black/30 p-3"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-white">Scanner le QR Market-Cash</span><button type="button" onClick={() => { setScannerOpen(false); stopScanner(); }}><X className="h-4 w-4" /></button></div><div className="mx-auto aspect-square max-w-[260px] overflow-hidden rounded-xl bg-black"><video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" /></div>{scanBusy && <p className="mt-2 text-center text-xs text-gray-400">Ouverture de la caméra…</p>}</div>}

        <div className="grid grid-cols-2 gap-3"><label className="space-y-2"><span className="text-xs font-bold text-gray-300">Expiration</span><input value={expiry} onChange={(e) => { setExpiry(normalizeExpiry(e.target.value)); setError(''); }} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none" /></label><label className="space-y-2"><span className="text-xs font-bold text-gray-300">CVV</span><div className="relative"><input value={cvv} onChange={(e) => { setCvv(e.target.value.replace(/\D/g, '').slice(0, 3)); setError(''); }} type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" className="w-full rounded-2xl border border-amber-500/30 bg-black/20 px-4 py-3.5 pr-10 text-sm text-white outline-none" /><LockKeyhole className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-300" /></div></label></div>

        {error && <div className="rounded-xl border border-rose-500/20 bg-rose-950/25 p-3 text-xs text-rose-200">{error}</div>}
        {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</div>}

        <button disabled={!formComplete || busy || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Traitement…' : formComplete ? 'Payer avec Market-Cash' : 'Complétez les informations'}</button>
      </form>
    </div>
  </div>;
};
