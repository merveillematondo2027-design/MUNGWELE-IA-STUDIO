import React, { useState } from 'react';
import { CreditCard, Landmark, Smartphone, WalletCards, X } from 'lucide-react';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import { MarketCashLocalCardPaymentModal } from './MarketCashLocalCardPaymentModal';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';

type MarketCashCheckoutModalProps = {
  target: MarketCashPaymentTarget;
  userId?: string;
  userEmail?: string;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

type CheckoutMode = 'chooser' | 'mobile-money' | 'market-cash' | 'bank-card' | 'paypal';

const shell = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm';
const panel = 'max-h-[96vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl';

function CheckoutHeader({ target, title, subtitle, onBack, onClose }: {
  target: MarketCashPaymentTarget;
  title: string;
  subtitle: string;
  onBack?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
      <div>
        {onBack && <button type="button" onClick={onBack} className="mb-3 text-xs font-bold text-cyan-300">← Modes de paiement</button>}
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-300">MUNGWELE IA STUDIO</p>
        <h3 className="mt-1 text-xl font-black text-white">{title}</h3>
        <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
        <p className="mt-3 text-3xl font-black text-white">${target.amountUsd.toFixed(2)} <span className="text-xs text-gray-400">USD</span></p>
        <p className="mt-1 text-xs font-semibold text-gray-300">{target.label}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400" aria-label="Fermer"><X className="h-5 w-5" /></button>
    </div>
  );
}

function BankCardWindow({ target, onBack, onClose }: { target: MarketCashPaymentTarget; onBack: () => void; onClose: () => void }) {
  const [holder, setHolder] = useState('');
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  return <div className={shell}><div className={panel}>
    <CheckoutHeader target={target} title="Visa / Mastercard" subtitle="Paiement par carte bancaire internationale." onBack={onBack} onClose={onClose} />
    <div className="space-y-4 p-5">
      <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Nom du titulaire</span><input value={holder} onChange={(e) => setHolder(e.target.value.slice(0, 80))} autoComplete="cc-name" placeholder="NOM DU TITULAIRE" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm uppercase text-white outline-none focus:border-purple-500" /></label>
      <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Numéro de carte</span><input value={number} onChange={(e) => setNumber(e.target.value.replace(/[^\d ]/g, '').slice(0, 23))} inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-purple-500" /></label>
      <div className="grid grid-cols-2 gap-3"><label className="space-y-2"><span className="text-xs font-bold text-gray-300">Expiration</span><input value={expiry} onChange={(e) => setExpiry(e.target.value.replace(/[^\d/]/g, '').slice(0, 5))} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none" /></label><label className="space-y-2"><span className="text-xs font-bold text-gray-300">CVV</span><input value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" autoComplete="cc-csc" placeholder="•••" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none" /></label></div>
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs leading-5 text-amber-100">L’interface Visa / Mastercard est prête. Le débit sera activé dès que la passerelle bancaire correspondante sera connectée au backend MUNGWELE.</div>
      <button type="button" disabled className="w-full rounded-2xl bg-white/10 py-3.5 text-sm font-black text-gray-500">Paiement Visa / Mastercard bientôt disponible</button>
    </div>
  </div></div>;
}

function PaypalWindow({ target, onBack, onClose }: { target: MarketCashPaymentTarget; onBack: () => void; onClose: () => void }) {
  const [email, setEmail] = useState('');
  return <div className={shell}><div className={panel}>
    <CheckoutHeader target={target} title="PayPal" subtitle="Connexion et paiement depuis votre compte PayPal." onBack={onBack} onClose={onClose} />
    <div className="space-y-4 p-5">
      <label className="block space-y-2"><span className="text-xs font-bold text-gray-300">Adresse e-mail PayPal</span><input value={email} onChange={(e) => setEmail(e.target.value.slice(0, 120))} type="email" autoComplete="email" placeholder="vous@exemple.com" className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500" /></label>
      <div className="rounded-2xl border border-blue-500/20 bg-blue-950/20 p-4 text-xs leading-5 text-blue-100">Le paiement PayPal s’ouvrira dans sa propre étape sécurisée. Aucun champ Market-Cash n’est mélangé à ce mode.</div>
      <button type="button" disabled className="w-full rounded-2xl bg-white/10 py-3.5 text-sm font-black text-gray-500">Continuer avec PayPal · bientôt disponible</button>
    </div>
  </div></div>;
}

export const MarketCashCheckoutModal: React.FC<MarketCashCheckoutModalProps> = ({ target, userId, userEmail, onClose, onSuccess }) => {
  const [mode, setMode] = useState<CheckoutMode>('chooser');

  if (mode === 'mobile-money') return <MobileMoneyPaymentModal target={target} onClose={() => setMode('chooser')} onSuccess={onSuccess} />;
  if (mode === 'market-cash') return <MarketCashLocalCardPaymentModal target={target} userId={userId} userEmail={userEmail} onClose={() => setMode('chooser')} onSuccess={onSuccess} />;
  if (mode === 'bank-card') return <BankCardWindow target={target} onBack={() => setMode('chooser')} onClose={onClose} />;
  if (mode === 'paypal') return <PaypalWindow target={target} onBack={() => setMode('chooser')} onClose={onClose} />;

  const choices = [
    { id: 'mobile-money' as const, title: 'Mobile Money', subtitle: 'M-Pesa, Airtel Money, Orange Money, Afrimoney', icon: Smartphone, active: true },
    { id: 'market-cash' as const, title: 'Market-Cash', subtitle: 'Carte locale Market-Cash, QR ou NFC', icon: WalletCards, active: true },
    { id: 'bank-card' as const, title: 'Visa / Mastercard', subtitle: 'Carte bancaire internationale', icon: CreditCard, active: false },
    { id: 'paypal' as const, title: 'PayPal', subtitle: 'Paiement avec votre compte PayPal', icon: Landmark, active: false },
  ];

  return <div className={shell}><div className={panel}>
    <CheckoutHeader target={target} title="Choisir le mode de paiement" subtitle="Chaque moyen de paiement s’ouvre dans son propre écran." onClose={onClose} />
    <div className="grid grid-cols-2 gap-3 p-5">
      {choices.map(({ id, title, subtitle, icon: Icon, active }) => (
        <button key={id} type="button" onClick={() => setMode(id)} className="group min-h-[150px] rounded-[24px] border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-purple-400/60 hover:bg-white/[0.06]">
          <div className="flex items-start justify-between gap-2"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-cyan-300"><Icon className="h-5 w-5" /></div><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{active ? 'Disponible' : 'Bientôt'}</span></div>
          <h4 className="mt-4 text-sm font-black text-white">{title}</h4>
          <p className="mt-1 text-[11px] leading-4 text-gray-500">{subtitle}</p>
        </button>
      ))}
    </div>
  </div></div>;
};
