import React, { useEffect, useState } from 'react';
import { CheckCircle2, FlaskConical, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useApp } from '../../context/AppContext';

type SandboxStatus = {
  enabled: boolean;
  configured: boolean;
  environment: 'sandbox';
  market: string;
  country: string;
  currency: string;
  testMsisdn: string;
};

type VerifyResult = {
  ok: boolean;
  httpStatus?: number;
  responseCode?: string;
  responseDesc?: string;
  conversationId?: string;
  environment: 'sandbox';
  moneyMoved: false;
  error?: string;
};

async function authHeaders() {
  const current = auth.currentUser;
  if (!current) throw new Error('Connexion administrateur requise.');
  return { Authorization: `Bearer ${await current.getIdToken()}`, 'Content-Type': 'application/json' };
}

export const MpesaSandboxAdminPanel: React.FC = () => {
  const { user } = useApp();
  const [status, setStatus] = useState<SandboxStatus | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user.role !== 'admin') return;
    let active = true;
    void authHeaders()
      .then((headers) => fetch('/api/mobile-money/mpesa/sandbox/status', { headers }))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Statut Sandbox indisponible.');
        if (active) setStatus(payload as SandboxStatus);
      })
      .catch((reason: any) => active && setError(String(reason?.message || reason)));
    return () => { active = false; };
  }, [user.role]);

  if (user.role !== 'admin') return null;

  const verify = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const headers = await authHeaders();
      const response = await fetch('/api/mobile-money/mpesa/sandbox/verify', { method: 'POST', headers, body: '{}' });
      const payload = await response.json().catch(() => ({}));
      setResult(payload as VerifyResult);
      if (!response.ok && !payload?.responseCode) throw new Error(payload?.error || 'Test Sandbox M-Pesa échoué.');
    } catch (reason: any) {
      setError(String(reason?.message || reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-5 rounded-[24px] border border-cyan-500/20 bg-cyan-950/10 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-300"><FlaskConical className="h-5 w-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white">M-Pesa RDC · Sandbox administrateur</h3>
              <span className="rounded-full border border-cyan-500/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-cyan-200">Aucun argent réel</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-400">Ce test remplace Postman/PowerShell. Il vérifie la SessionKey puis le C2B avec le numéro de test Vodacom, sans créditer un client.</p>
            {status && <p className="mt-2 text-[10px] text-gray-500">{status.market} · {status.country} · {status.currency} · test {status.testMsisdn}</p>}
          </div>
        </div>
        <button type="button" onClick={() => void verify()} disabled={busy || !status?.configured} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-xs font-black text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-45">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Test en cours…</> : <><ShieldCheck className="h-4 w-4" /> Tester M-Pesa Sandbox</>}
        </button>
      </div>

      {status && !status.configured && <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/15 p-3 text-xs text-amber-100">Ajoutez les secrets Sandbox côté serveur avant de lancer le test.</div>}
      {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-950/15 p-3 text-xs text-rose-100"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {result?.ok && <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3 text-xs text-emerald-100"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Test réussi.</strong> {result.responseCode} · {result.responseDesc || 'M-Pesa Sandbox répond correctement.'}{result.conversationId ? ` · Réf. ${result.conversationId}` : ''}</span></div>}
      {result && !result.ok && result.responseCode && <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-950/15 p-3 text-xs text-rose-100"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{result.responseCode} · {result.responseDesc || 'Réponse Sandbox non conforme.'}</span></div>}
    </section>
  );
};
