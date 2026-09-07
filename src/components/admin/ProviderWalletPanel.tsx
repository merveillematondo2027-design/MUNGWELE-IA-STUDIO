import React, { useCallback, useMemo, useState } from 'react';
import { CircleDollarSign, Plus, RefreshCw, Video } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const GOOGLE_CREDITS_PER_USD = 150;
const VEO_LITE_4S_USD = 0.20;
const VEO_LITE_8S_USD = 0.40;

type ProviderWallet = {
  providerId: 'google';
  label: string;
  balanceUsd: number;
  totalDepositedUsd: number;
  totalSpentUsd: number;
  creditsPerUsd: number;
  equivalentCreditsRemaining: number;
  createdAt?: string;
  updatedAt?: string;
};

type ProviderWalletTransaction = {
  id: string;
  providerId: 'google';
  type: 'deposit' | 'generation' | 'adjustment';
  amountUsd: number;
  equivalentCredits: number;
  balanceAfterUsd: number;
  description: string;
  generationId?: string;
  model?: string;
  userId?: string;
  createdAt: string;
};

type WalletPayload = { wallet?: Partial<ProviderWallet>; transactions?: ProviderWalletTransaction[]; error?: string };

const emptyWallet: ProviderWallet = {
  providerId: 'google',
  label: 'Google Gemini / Veo',
  balanceUsd: 0,
  totalDepositedUsd: 0,
  totalSpentUsd: 0,
  creditsPerUsd: GOOGLE_CREDITS_PER_USD,
  equivalentCreditsRemaining: 0,
};

const roundUsd = (value: number) => Math.round((Number(value) || 0) * 10000) / 10000;
const capacityCredits = (balanceUsd: number) => Math.max(0, Math.floor((Math.max(0, balanceUsd) * GOOGLE_CREDITS_PER_USD) / 5) * 5);
const fmtUsd = (value: number) => `$${Math.max(0, Number(value) || 0).toFixed(2)}`;

export const ProviderWalletPanel: React.FC = () => {
  const { addNotification } = useApp();
  const [wallet, setWallet] = useState<ProviderWallet>(emptyWallet);
  const [transactions, setTransactions] = useState<ProviderWalletTransaction[]>([]);
  const [amount, setAmount] = useState('10');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const applyPayload = useCallback((payload: WalletPayload) => {
    setWallet({ ...emptyWallet, ...(payload.wallet || {}) } as ProviderWallet);
    setTransactions(Array.isArray(payload.transactions) ? payload.transactions.slice(0, 12) : []);
  }, []);

  const loadWallet = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/admin/provider-wallet/google', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({})) as WalletPayload;
      if (!response.ok) throw new Error(payload.error || 'Impossible de lire le magasin API.');
      applyPayload(payload);
    } catch (error: any) {
      if (!quiet) addNotification('error', 'Magasin API indisponible', error?.message || 'Impossible de charger le solde fournisseur.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [addNotification, applyPayload]);

  React.useEffect(() => {
    void loadWallet();
    const timer = window.setInterval(() => void loadWallet(true), 15000);
    return () => window.clearInterval(timer);
  }, [loadWallet]);

  const remaining4s = useMemo(() => Math.max(0, Math.floor(Math.max(0, wallet.balanceUsd) / VEO_LITE_4S_USD)), [wallet.balanceUsd]);
  const remaining8s = useMemo(() => Math.max(0, Math.floor(Math.max(0, wallet.balanceUsd) / VEO_LITE_8S_USD)), [wallet.balanceUsd]);

  const addDeposit = async () => {
    const amountUsd = roundUsd(Number(amount));
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      addNotification('error', 'Montant invalide', 'Entrez le montant réellement ajouté chez Google, par exemple 10.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/provider-wallet/google/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd }),
      });
      const payload = await response.json().catch(() => ({})) as WalletPayload;
      if (!response.ok) throw new Error(payload.error || 'Impossible de mettre à jour le magasin API.');
      applyPayload(payload);
      addNotification('success', 'Dépôt API enregistré', `$${amountUsd.toFixed(2)} ajoutés, soit environ ${Math.round(amountUsd * GOOGLE_CREDITS_PER_USD)} crédits de capacité.`);
      setAmount('');
    } catch (error: any) {
      addNotification('error', 'Dépôt non enregistré', error?.message || 'Impossible de mettre à jour le magasin API.');
    } finally {
      setSaving(false);
    }
  };

  const low = wallet.balanceUsd > 0 && wallet.balanceUsd < 1;

  return (
    <section className="mb-7 rounded-3xl border border-blue-500/20 bg-blue-500/[0.035] p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-black text-blue-200"><CircleDollarSign className="h-4 w-4" /> MAGASIN API</div>
          <h2 className="mt-3 text-xl font-black text-white">Google Gemini / Veo</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">Ajoutez ici le montant réellement rechargé chez Google. MUNGWELE le convertit avec notre référence commerciale actuelle : 1 $ de coût fournisseur ≈ 150 crédits de capacité.</p>
        </div>
        <div className={`rounded-2xl border px-4 py-3 text-right ${low ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/20 bg-emerald-500/[0.06]'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Solde API estimé</p>
          <p className="mt-1 text-3xl font-black text-white">{loading ? '…' : fmtUsd(wallet.balanceUsd)}</p>
          <p className="mt-1 text-[10px] text-gray-500">{capacityCredits(wallet.balanceUsd).toLocaleString('fr-FR')} crédits de capacité</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><p className="text-[10px] uppercase tracking-wider text-gray-600">Total déposé</p><p className="mt-1 text-lg font-black text-emerald-300">{fmtUsd(wallet.totalDepositedUsd)}</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><p className="text-[10px] uppercase tracking-wider text-gray-600">Consommé par MUNGWELE</p><p className="mt-1 text-lg font-black text-rose-300">{fmtUsd(wallet.totalSpentUsd)}</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-2"><Video className="h-4 w-4 text-purple-300"/><p className="text-[10px] uppercase tracking-wider text-gray-600">Veo Lite 4 s</p></div><p className="mt-1 text-lg font-black text-white">≈ {remaining4s} vidéos</p><p className="text-[10px] text-gray-600">$0,20 fournisseur / vidéo</p></div>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4"><div className="flex items-center gap-2"><Video className="h-4 w-4 text-pink-300"/><p className="text-[10px] uppercase tracking-wider text-gray-600">Veo Lite 8 s</p></div><p className="mt-1 text-lg font-black text-white">≈ {remaining8s} vidéos</p><p className="text-[10px] text-gray-600">$0,40 fournisseur / vidéo</p></div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-[#081226] p-4">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-white">Ajouter un dépôt Google API</p><button onClick={() => void loadWallet()} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-400"><RefreshCw className="h-3.5 w-3.5" /></button></div>
        <div className="mt-3 flex gap-2">
          <div className="flex min-w-0 flex-1 items-center rounded-xl border border-white/10 bg-black/20 px-3"><span className="mr-2 font-black text-emerald-300">$</span><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" step="0.01" placeholder="10.00" className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-white outline-none" /></div>
          <button onClick={addDeposit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? 'Ajout…' : 'Ajouter'}</button>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-gray-600">Exemple : un dépôt de 10 $ devient environ 1 500 crédits de capacité fournisseur. Une génération Veo Lite 4 s retire environ 0,20 $ et 30 crédits de cette capacité.</p>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-black text-white">Derniers mouvements API</p>
        <div className="space-y-2">
          {transactions.length ? transactions.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/10 p-3 text-xs">
              <div className="min-w-0"><p className="truncate font-bold text-gray-200">{item.description}</p><p className="mt-0.5 text-[10px] text-gray-600">{new Date(item.createdAt).toLocaleString('fr-FR')}{item.model ? ` • ${item.model}` : ''}</p></div>
              <div className="shrink-0 text-right"><p className={item.amountUsd >= 0 ? 'font-black text-emerald-300' : 'font-black text-rose-300'}>{item.amountUsd >= 0 ? '+' : ''}${item.amountUsd.toFixed(2)}</p><p className="text-[10px] text-gray-600">solde ${Math.max(0, item.balanceAfterUsd).toFixed(2)}</p></div>
            </div>
          )) : <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-gray-600">Aucun mouvement API enregistré.</p>}
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-4 text-gray-600">Ce solde est un suivi interne MUNGWELE. Il diminue automatiquement après les générations Google réussies. Les dépenses faites directement hors de MUNGWELE ne peuvent pas être connues automatiquement et doivent être réconciliées avec Google AI Studio.</p>
    </section>
  );
};
