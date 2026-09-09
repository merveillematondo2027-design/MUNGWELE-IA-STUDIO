import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, Smartphone, X } from 'lucide-react';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import {
  getMobileMoneyStatus,
  payWithMobileMoney,
  type MobileMoneyProvider,
  type MobileMoneyStatus,
} from '../../services/mobileMoneyPaymentService';

export type MobileMoneyPaymentModalProps = {
  target: MarketCashPaymentTarget;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

const PROVIDERS: Array<{ id: MobileMoneyProvider; label: string; short: string }> = [
  { id: 'mpesa', label: 'M-Pesa', short: 'M' },
  { id: 'airtel', label: 'Airtel Money', short: 'A' },
  { id: 'orange', label: 'Orange Money', short: 'O' },
  { id: 'afrimoney', label: 'Afrimoney', short: 'AF' },
];

export const MobileMoneyPaymentModal: React.FC<MobileMoneyPaymentModalProps> = ({ target, onClose, onSuccess }) => {
  const [provider, setProvider] = useState<MobileMoneyProvider>('mpesa');
  const [status, setStatus] = useState<MobileMoneyStatus | null>(null);
  const [msisdn, setMsisdn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState('');
  const attemptIdRef = useRef(crypto.randomUUID());

  const refreshStatus = async () => {
    setError('');
    try { setStatus(await getMobileMoneyStatus()); }
    catch (reason: any) { setError(String(reason?.message || reason)); }
  };

  useEffect(() => { void refreshStatus(); }, []);

  const chooseProvider = async (next: MobileMoneyProvider) => {
    setProvider(next);
    setError(''); setSuccess(''); setPending('');
    try {
      const nextStatus = await getMobileMoneyStatus();
      setStatus(nextStatus);
      if (!nextStatus.providers[next]?.configured) setError(`API ${PROVIDERS.find((item) => item.id === next)?.label || next} absente.`);
    } catch (reason: any) { setError(String(reason?.message || reason)); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setSuccess(''); setPending('');
    if (!status?.providers?.[provider]?.configured) {
      setError(`API ${PROVIDERS.find((item) => item.id === provider)?.label || provider} absente.`);
      return;
    }
    if (!msisdn.trim()) return setError('Saisissez le numéro Mobile Money.');
    setBusy(true);
    try {
      const result = await payWithMobileMoney({ provider, target, msisdn, attemptId: attemptIdRef.current });
      if (result.status === 'settled') {
        const reference = result.transactionId || result.conversationId;
        setSuccess(reference ? `Paiement confirmé • ${reference}` : 'Paiement confirmé.');
        onSuccess?.(reference);
      } else setPending(result.message || 'Paiement envoyé. Confirmation en attente.');
    } catch (reason: any) { setError(String(reason?.message || reason)); }
    finally { setBusy(false); }
  };

  const selectedLabel = PROVIDERS.find((item) => item.id === provider)?.label || 'Mobile Money';

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs text-gray-400">Paiement à MUNGWELE IA STUDIO</p><h3 className="mt-1 text-xl font-black text-white">{target.label}</h3><p className="mt-2 text-3xl font-black text-white">${target.amountUsd.toFixed(2)} <span className="text-xs text-gray-400">USD</span></p></div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400 hover:text-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="mb-3 text-xs font-black uppercase tracking-[.14em] text-gray-500">Mobile Money</p>
            <div className="grid grid-cols-4 gap-2">
              {PROVIDERS.map((item) => {
                const selected = item.id === provider;
                const configured = status?.providers?.[item.id]?.configured === true;
                return <button key={item.id} type="button" onClick={() => void chooseProvider(item.id)} className={`rounded-2xl border p-2.5 text-center transition ${selected ? 'border-purple-400/50 bg-purple-500/10' : 'border-white/10 bg-white/[0.025]'}`}>
                  <span className="mx-auto grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-[10px] font-black text-white">{item.short}</span>
                  <span className="mt-2 block truncate text-[10px] font-black text-white">{item.label}</span>
                  <span className={`mt-1 block text-[8px] font-bold ${configured ? 'text-emerald-300' : 'text-gray-600'}`}>{configured ? 'Disponible' : 'API absente'}</span>
                </button>;
              })}
            </div>
          </div>

          <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Numéro {selectedLabel}</span><div className="relative"><Smartphone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"/><input value={msisdn} onChange={(event) => { setMsisdn(event.target.value); attemptIdRef.current = crypto.randomUUID(); }} inputMode="tel" autoComplete="tel" placeholder="+243 8XX XXX XXX" className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none focus:border-purple-500/50" /></div></label>

          {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
          {pending && <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-950/15 p-3 text-xs text-amber-100"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />{pending}</div>}
          {success && <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

          <button type="submit" disabled={busy || Boolean(success)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 py-3.5 text-xs font-black text-white disabled:opacity-45">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement…</> : `Payer avec ${selectedLabel}`}</button>
        </form>
      </div>
    </div>
  );
};
