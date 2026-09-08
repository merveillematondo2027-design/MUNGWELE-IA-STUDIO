import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, FlaskConical, Loader2, RadioTower, ShieldCheck, Smartphone, X } from 'lucide-react';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import {
  getMobileMoneyStatus,
  getMpesaSandboxStatus,
  payWithMobileMoney,
  verifyMpesaSandbox,
  type MobileMoneyProvider,
  type MobileMoneyStatus,
  type MpesaSandboxStatus,
} from '../../services/mobileMoneyPaymentService';

export type MobileMoneyPaymentModalProps = {
  target: MarketCashPaymentTarget;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

export const MobileMoneyPaymentModal: React.FC<MobileMoneyPaymentModalProps> = ({ target, onClose, onSuccess }) => {
  const [provider, setProvider] = useState<MobileMoneyProvider>('mpesa');
  const [status, setStatus] = useState<MobileMoneyStatus | null>(null);
  const [sandboxStatus, setSandboxStatus] = useState<MpesaSandboxStatus | null>(null);
  const [statusError, setStatusError] = useState('');
  const [msisdn, setMsisdn] = useState('');
  const [busy, setBusy] = useState(false);
  const [sandboxBusy, setSandboxBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState('');
  const [sandboxResult, setSandboxResult] = useState('');
  const attemptIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    let active = true;
    void getMobileMoneyStatus()
      .then((next) => {
        if (!active) return;
        setStatus(next);
      })
      .catch((reason: any) => {
        if (!active) return;
        setStatusError(String(reason?.message || reason));
      });

    void getMpesaSandboxStatus()
      .then((next) => {
        if (!active) return;
        setSandboxStatus(next);
      })
      .catch(() => {
        // Sandbox verification is intentionally admin-only. Regular customers
        // simply do not see this development tool.
      });

    return () => { active = false; };
  }, []);

  const providerConfigured = useMemo(() => {
    if (!status) return false;
    return provider === 'mpesa' ? status.providers.mpesa.configured : false;
  }, [provider, status]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setPending('');
    if (!providerConfigured) {
      setError('M-Pesa Live est prêt dans MUNGWELE, mais les identifiants de production ne sont pas encore renseignés.');
      return;
    }
    if (!msisdn.trim()) {
      setError('Saisissez le numéro M-Pesa du client.');
      return;
    }

    setBusy(true);
    try {
      const result = await payWithMobileMoney({
        provider,
        target,
        msisdn,
        attemptId: attemptIdRef.current,
      });
      if (result.status === 'settled') {
        const reference = result.transactionId || result.conversationId;
        setSuccess(reference ? `Paiement confirmé • ${reference}` : 'Paiement M-Pesa confirmé.');
        onSuccess?.(reference);
        return;
      }
      setPending(result.message || 'Paiement initié. Confirmation M-Pesa en attente.');
    } catch (reason: any) {
      setError(String(reason?.message || reason));
    } finally {
      setBusy(false);
    }
  };

  const runSandboxTest = async () => {
    setSandboxResult('');
    setError('');
    setSandboxBusy(true);
    try {
      const result = await verifyMpesaSandbox();
      if (!result.ok || result.responseCode !== 'INS-0') {
        throw new Error(result.responseDesc || result.error || 'Le test Sandbox n’a pas retourné INS-0.');
      }
      const reference = result.conversationId ? ` • ${result.conversationId}` : '';
      setSandboxResult(`Test réussi : INS-0${reference}. Aucun argent réel n’a été déplacé.`);
    } catch (reason: any) {
      setError(String(reason?.message || reason));
    } finally {
      setSandboxBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300"><RadioTower className="h-3.5 w-3.5" /> M-Pesa · RDC</div>
              <p className="mt-4 text-xs text-gray-400">Paiement à MUNGWELE IA STUDIO</p>
              <h3 className="mt-1 text-xl font-black text-white">{target.label}</h3>
              <p className="mt-2 text-3xl font-black text-white">${target.amountUsd.toFixed(2)} <span className="text-xs text-gray-400">USD</span></p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400 hover:text-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setProvider('mpesa')} className={`rounded-2xl border p-3 text-left ${provider === 'mpesa' ? 'border-red-500/50 bg-red-950/25' : 'border-white/10 bg-white/[0.03]'}`}><Smartphone className="h-5 w-5 text-red-300" /><p className="mt-2 text-xs font-black text-white">M-Pesa</p><p className="mt-1 text-[10px] text-emerald-400">C2B RDC</p></button>
            <button type="button" disabled className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left opacity-55"><Smartphone className="h-5 w-5 text-red-200" /><p className="mt-2 text-xs font-black text-white">Airtel Money</p><p className="mt-1 text-[10px] text-gray-500">Préparé</p></button>
            <button type="button" disabled className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-left opacity-55"><Smartphone className="h-5 w-5 text-orange-300" /><p className="mt-2 text-xs font-black text-white">Orange Money</p><p className="mt-1 text-[10px] text-gray-500">Préparé</p></button>
          </div>

          {sandboxStatus && (
            <div className="rounded-2xl border border-violet-500/25 bg-violet-950/15 p-4">
              <div className="flex items-start gap-3">
                <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-white">M-Pesa Sandbox</p>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${sandboxStatus.configured ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200'}`}>{sandboxStatus.configured ? 'Clé détectée' : 'Clé manquante'}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-gray-400">Test technique sans argent réel avec le numéro Sandbox {sandboxStatus.testMsisdn}. Le test peut prendre environ 30 secondes.</p>
                  <button
                    type="button"
                    onClick={runSandboxTest}
                    disabled={sandboxBusy || !sandboxStatus.configured}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-black text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {sandboxBusy ? <><Loader2 className="h-4 w-4 animate-spin" /> Test Sandbox en cours (~30 s)…</> : 'Tester avec M-Pesa Sandbox'}
                  </button>
                  {sandboxResult && <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-[11px] leading-5 text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{sandboxResult}</div>}
                </div>
              </div>
            </div>
          )}

          {statusError && <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-200">{statusError}</div>}

          <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Numéro M-Pesa réel</span><input value={msisdn} onChange={(event) => { setMsisdn(event.target.value); attemptIdRef.current = crypto.randomUUID(); }} inputMode="tel" autoComplete="tel" placeholder="+243 8XX XXX XXX" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-red-500/50" /></label>

          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><p className="text-sm font-black text-white">Paiement M-Pesa Production</p><p className="mt-1 text-[11px] leading-5 text-gray-400">Après l’envoi de la demande C2B, le client confirme dans le canal sécurisé M-Pesa. MUNGWELE ne demande, ne reçoit et ne conserve jamais le PIN M-Pesa.</p></div></div>
          </div>

          {!status ? <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Vérification du connecteur M-Pesa Production…</div> : !providerConfigured ? <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-3 text-xs leading-5 text-cyan-100">Le mode Production reste verrouillé jusqu’à l’approbation Vodacom et l’ajout des vrais <strong>MPESA_API_KEY</strong> et <strong>MPESA_SERVICE_PROVIDER_CODE</strong>. La clé RSA publique est déjà intégrée.</div> : <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-3 text-xs text-emerald-100">M-Pesa C2B Production est configuré côté serveur.</div>}

          {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-200">{error}</div>}
          {pending && <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-950/15 p-3 text-xs text-amber-100"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />{pending}</div>}
          {success && <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3 text-xs text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</div>}

          <button type="submit" disabled={busy || !status || !providerConfigured} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-xs font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Demande M-Pesa en cours…</> : 'Payer avec M-Pesa Production'}</button>
        </form>
      </div>
    </div>
  );
};
