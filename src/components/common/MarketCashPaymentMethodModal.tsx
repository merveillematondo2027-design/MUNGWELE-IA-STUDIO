import React, { useState } from 'react';
import { CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';
import { normalizeCardNumber, normalizeExpiry } from '../../services/marketCashPaymentService';
import { registerMarketCashPaymentMethod, type SavedMarketCashPaymentMethod } from '../../services/marketCashBillingService';

export const MarketCashPaymentMethodModal: React.FC<{
  onClose: () => void;
  onSaved: (method: SavedMarketCashPaymentMethod) => void;
}> = ({ onClose, onSaved }) => {
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [makeDefault, setMakeDefault] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const pan = cardNumber.replace(/\D/g, '');
    const securityCode = cvv.replace(/\D/g, '');
    if (!/^4585020002\d{6}$/.test(pan)) return setError('Numéro de carte locale Market-Cash invalide.');
    if (cardHolder.trim().length < 2) return setError('Le nom du titulaire est obligatoire.');
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setError('Expiration attendue au format MM/AA.');
    if (!/^\d{3}$/.test(securityCode)) return setError('CVV Market-Cash invalide.');

    setBusy(true);
    try {
      const method = await registerMarketCashPaymentMethod({
        cardNumber: pan,
        cardHolder: cardHolder.trim(),
        expiry,
        cvv: securityCode,
      }, makeDefault);
      setCvv('');
      onSaved(method);
    } catch (e: any) {
      setCvv('');
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Facturation MUNGWELE</p>
            <h3 className="mt-2 text-xl font-black text-white">Ajouter un moyen de paiement</h3>
            <p className="mt-1 text-xs text-gray-400">Carte locale Market-Cash uniquement pour le moment.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/5 p-2 text-gray-300" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="flex gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" />
            <p className="text-xs leading-5 text-gray-300">MUNGWELE n’enregistre ni le numéro complet de la carte ni le CVV. Market-Cash retourne une autorisation sécurisée liée à cette carte.</p>
          </div>

          <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Nom du titulaire</span><input value={cardHolder} onChange={(e) => setCardHolder(e.target.value.slice(0, 80))} autoComplete="cc-name" required placeholder="NOM DU TITULAIRE" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm font-semibold uppercase text-white outline-none focus:border-purple-500" /></label>
          <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Numéro de carte</span><div className="relative"><input value={cardNumber} onChange={(e) => setCardNumber(normalizeCardNumber(e.target.value))} inputMode="numeric" autoComplete="cc-number" required placeholder="4585 0200 02•• ••••" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 pr-12 text-sm font-semibold tracking-wide text-white outline-none focus:border-purple-500" /><CreditCard className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /></div></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-2"><span className="text-xs font-bold text-gray-300">Expiration</span><input value={expiry} onChange={(e) => setExpiry(normalizeExpiry(e.target.value))} inputMode="numeric" autoComplete="cc-exp" required placeholder="MM/AA" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-purple-500" /></label>
            <label className="space-y-2"><span className="text-xs font-bold text-gray-300">CVV</span><input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" autoComplete="cc-csc" type="password" required placeholder="•••" className="w-full rounded-2xl border border-amber-500/30 bg-black/20 px-4 py-3.5 text-sm tracking-[0.18em] text-white outline-none focus:border-amber-400" /></label>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div><p className="text-sm font-bold text-white">Définir par défaut</p><p className="mt-1 text-[11px] text-gray-500">Utilisé en priorité pour la facturation.</p></div>
            <input type="checkbox" checked={makeDefault} onChange={(e) => setMakeDefault(e.target.checked)} className="h-5 w-5 accent-purple-500" />
          </label>

          {error && <div className="rounded-2xl border border-rose-500/20 bg-rose-950/30 px-4 py-3 text-xs text-rose-200">{error}</div>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 py-3.5 text-sm font-black text-white disabled:opacity-60">{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Enregistrement…</> : 'Enregistrer la carte'}</button>
          <p className="text-center text-[10px] leading-4 text-gray-500">L’enregistrement de la carte n’active pas le renouvellement automatique. Cette autorisation est demandée séparément.</p>
        </form>
      </div>
    </div>
  );
};
