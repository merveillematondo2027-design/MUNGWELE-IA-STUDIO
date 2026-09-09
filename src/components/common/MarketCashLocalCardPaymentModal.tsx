import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, LockKeyhole, Nfc, ScanLine, Smartphone, X } from 'lucide-react';
import {
  cardNetworkLabel,
  detectCardNetwork,
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
  onMobileMoney?: () => void;
};

type CaptureMethod = 'manual' | 'qr' | 'nfc';
const rails = [
  { id: 'visa', text: 'VISA' }, { id: 'mastercard', text: 'MC' }, { id: 'google-pay', text: 'G' },
  { id: 'other', text: '•••' }, { id: 'market-cash', text: 'M-C' },
];

export const MarketCashLocalCardPaymentModal: React.FC<MarketCashLocalCardPaymentModalProps> = ({ target, userId, userEmail, onClose, onSuccess, onMobileMoney }) => {
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

  const network = useMemo(() => detectCardNetwork(cardNumber), [cardNumber]);
  const networkLabel = cardNumber.replace(/\D/g, '').length >= 4 ? cardNetworkLabel(network) : 'Détection automatique';

  const stopScanner = () => {
    scannerStopRef.current?.(); scannerStopRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanBusy(false);
  };
  useEffect(() => () => stopScanner(), []);

  const applyPayload = async (raw: string, method: CaptureMethod) => {
    const parsed = await resolveMarketCashCardPayload(raw);
    if (!parsed.cardNumber) throw new Error('Carte non reconnue.');
    setCardNumber(normalizeCardNumber(parsed.cardNumber));
    if (parsed.cardHolder) setCardHolder(parsed.cardHolder);
    if (parsed.expiry) setExpiry(parsed.expiry);
    setCvv(''); setCaptureMethod(method); setScannerOpen(false); stopScanner();
  };

  const openScanner = async () => {
    setError(''); setScannerOpen(true); setScanBusy(true); stopScanner();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Le scan nécessite HTTPS et l’accès caméra.');
      await new Promise((resolve) => setTimeout(resolve, 80));
      const video = videoRef.current;
      if (!video) throw new Error('Caméra indisponible.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream; await video.play();
      const NativeDetector = (window as any).BarcodeDetector;
      if (NativeDetector) {
        const detector = new NativeDetector({ formats: ['qr_code'] }); let active = true;
        scannerStopRef.current = () => { active = false; }; setScanBusy(false);
        while (active) {
          const codes = await detector.detect(video).catch(() => []);
          const raw = codes?.[0]?.rawValue;
          if (raw) { await applyPayload(raw, 'qr'); return; }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } else {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => { if (result) void applyPayload(result.getText(), 'qr').catch((e) => setError(String(e?.message || e))); });
        scannerStopRef.current = () => controls.stop(); setScanBusy(false);
      }
    } catch (e: any) { stopScanner(); setError(String(e?.message || e)); }
  };

  const readNfc = async () => {
    setError(''); setCaptureMethod('nfc');
    try {
      const Reader = (window as any).NDEFReader;
      if (!Reader || !window.isSecureContext) throw new Error('NFC indisponible sur ce navigateur.');
      const reader = new Reader(); await reader.scan();
      const raw = await new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Aucune carte NFC détectée.')), 25000);
        reader.onreadingerror = () => { clearTimeout(timer); reject(new Error('Lecture NFC impossible.')); };
        reader.onreading = (event: any) => {
          clearTimeout(timer);
          const record = Array.from(event?.message?.records || []).find((r: any) => r?.data) as any;
          if (!record?.data) return reject(new Error('Carte NFC non reconnue.'));
          resolve(new TextDecoder().decode(record.data).replace(/^\u0002[a-z]{2}/i, '').trim());
        };
      });
      await applyPayload(raw, 'nfc');
    } catch (e: any) { setError(String(e?.message || e)); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    const pan = cardNumber.replace(/\D/g, ''); const code = cvv.replace(/\D/g, '');
    if (cardHolder.trim().length < 2) return setError('Nom du titulaire requis.');
    if (pan.length < 12 || pan.length > 19) return setError('Numéro de carte invalide.');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setError('Date attendue au format MM/AA.');
    if (!/^\d{3,4}$/.test(code)) return setError('CVV invalide.');
    setBusy(true);
    try {
      const result = await payWithMarketCashCard({ target, card: { cardNumber: pan, cardHolder, expiry, cvv: code }, captureMethod, userId, userEmail });
      const ref = result.transactionId || result.reference;
      setSuccess(ref ? `Paiement confirmé • ${ref}` : 'Paiement confirmé.'); setCvv(''); onSuccess?.(ref);
    } catch (e: any) { setCvv(''); setError(String(e?.message || e)); }
    finally { setBusy(false); }
  };

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
    <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
      <div className="flex items-start justify-between border-b border-white/10 p-5"><div><p className="text-xs text-gray-400">Paiement à MUNGWELE IA STUDIO</p><h3 className="mt-1 text-xl font-black text-white">{target.label}</h3><p className="mt-2 text-3xl font-black text-white">${target.amountUsd.toFixed(2)} <span className="text-xs text-gray-400">USD</span></p></div><button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400"><X className="h-5 w-5"/></button></div>
      <form onSubmit={submit} className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">{rails.map((rail)=><div key={rail.id} title={rail.id} className={`grid h-11 min-w-11 place-items-center rounded-xl border text-[10px] font-black ${rail.id===network?'border-cyan-400/60 bg-cyan-500/10 text-cyan-200':'border-white/10 bg-white/[0.03] text-gray-400'}`}>{rail.text}</div>)}</div>
        <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Nom du titulaire</span><input value={cardHolder} onChange={(e)=>setCardHolder(e.target.value.slice(0,80))} autoComplete="cc-name" placeholder="NOM DU TITULAIRE" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm uppercase text-white outline-none focus:border-purple-500"/></label>
        <label className="block space-y-2"><span className="flex items-center justify-between text-xs font-bold text-gray-300"><span>Numéro de carte</span><span className="text-cyan-300">{networkLabel}</span></span><div className="relative"><CreditCard className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"/><input value={cardNumber} onChange={(e)=>{setCaptureMethod('manual');setCardNumber(normalizeCardNumber(e.target.value));setError('')}} inputMode="numeric" autoComplete="cc-number" placeholder="5585 0200 02•• ••••" className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-24 text-sm text-white outline-none focus:border-purple-500"/><div className="absolute inset-y-0 right-2 flex items-center gap-1"><button type="button" onClick={()=>void openScanner()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"><ScanLine className="h-4 w-4"/></button><button type="button" onClick={()=>void readNfc()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.04]"><Nfc className="h-4 w-4"/></button></div></div></label>
        {scannerOpen&&<div className="rounded-2xl border border-white/10 bg-black/30 p-3"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-white">Scanner la carte</span><button type="button" onClick={()=>{setScannerOpen(false);stopScanner()}}><X className="h-4 w-4"/></button></div><div className="mx-auto aspect-square max-w-[260px] overflow-hidden rounded-xl bg-black"><video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover"/></div>{scanBusy&&<p className="mt-2 text-center text-xs text-gray-400">Ouverture de la caméra…</p>}</div>}
        <div className="grid grid-cols-2 gap-3"><label className="space-y-2"><span className="text-xs font-bold text-gray-300">Date</span><input value={expiry} onChange={(e)=>setExpiry(normalizeExpiry(e.target.value))} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none"/></label><label className="space-y-2"><span className="text-xs font-bold text-gray-300">CVV</span><div className="relative"><input value={cvv} onChange={(e)=>setCvv(e.target.value.replace(/\D/g,'').slice(0,4))} type="password" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 pr-10 text-sm text-white outline-none"/><LockKeyhole className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"/></div></label></div>
        {error&&<div className="rounded-xl border border-rose-500/20 bg-rose-950/25 p-3 text-xs text-rose-200">{error}</div>}{success&&<div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4"/>{success}</div>}
        <button disabled={busy||Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 py-3.5 text-sm font-black text-white disabled:opacity-50">{busy?<><Loader2 className="h-4 w-4 animate-spin"/>Traitement…</>:`Payer • ${networkLabel}`}</button>
        <div className="border-t border-white/10 pt-4"><button type="button" onClick={()=>setError('API PayPal absente.')} className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-black text-white">PayPal</button></div>
        <div><p className="mb-2 text-xs font-black uppercase tracking-[.14em] text-gray-500">Mobile Money</p><button type="button" onClick={onMobileMoney} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-black text-white"><Smartphone className="h-4 w-4"/>M-Pesa · Airtel Money · Orange Money · Afrimoney</button></div>
      </form>
    </div>
  </div>;
};
