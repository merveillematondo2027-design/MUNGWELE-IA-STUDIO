import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Globe2, Landmark, Smartphone, WalletCards, X } from 'lucide-react';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import { MarketCashLocalCardPaymentModal } from './MarketCashLocalCardPaymentModal';
import { MobileMoneyPaymentModal } from './MobileMoneyPaymentModal';

type CheckoutMode = 'chooser' | 'local-card' | 'mobile-money';

type MarketCashCheckoutModalProps = {
  target: MarketCashPaymentTarget;
  userId?: string;
  userEmail?: string;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

const MethodCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  enabled: boolean;
  onClick?: () => void;
}> = ({ icon, title, description, badge, enabled, onClick }) => (
  <button
    type="button"
    disabled={!enabled}
    onClick={onClick}
    className={`group flex min-h-[132px] flex-col rounded-2xl border p-4 text-left transition ${
      enabled
        ? 'border-white/10 bg-white/[0.035] hover:border-purple-400/40 hover:bg-purple-950/20'
        : 'cursor-not-allowed border-white/[0.06] bg-white/[0.018] opacity-55'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-purple-200">{icon}</span>
      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/[0.05] text-gray-500'}`}>{badge}</span>
    </div>
    <p className="mt-4 text-sm font-black text-white">{title}</p>
    <p className="mt-1 text-[11px] leading-5 text-gray-400">{description}</p>
  </button>
);

export const MarketCashCheckoutModal: React.FC<MarketCashCheckoutModalProps> = ({
  target,
  userId,
  userEmail,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<CheckoutMode>('chooser');

  if (mode === 'local-card') {
    return (
      <MarketCashLocalCardPaymentModal
        target={target}
        userId={userId}
        userEmail={userEmail}
        onClose={() => setMode('chooser')}
        onSuccess={onSuccess}
      />
    );
  }

  if (mode === 'mobile-money') {
    return (
      <MobileMoneyPaymentModal
        target={target}
        onClose={() => setMode('chooser')}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div className="max-h-[96vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-white/10 bg-[#0d1420] shadow-2xl">
        <div className="border-b border-white/10 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-950/25 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-purple-200">
                <WalletCards className="h-3.5 w-3.5" /> Market-Cash Checkout
              </div>
              <p className="mt-4 text-xs text-gray-400">Paiement à MUNGWELE IA STUDIO</p>
              <h3 className="mt-1 text-xl font-black text-white">{target.label}</h3>
              <p className="mt-2 text-3xl font-black text-white">${target.amountUsd.toFixed(2)} <span className="text-xs text-gray-400">USD</span></p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] p-2.5 text-gray-400 hover:text-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-2 text-xs text-gray-400">
            <ArrowLeft className="h-4 w-4 text-purple-300" />
            <span>Choisissez comment régler ce paiement Market-Cash.</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MethodCard
              icon={<Landmark className="h-5 w-5" />}
              title="Market-Cash Locale"
              description="Carte locale Market-Cash. Saisie manuelle, QR ou NFC, puis CVV saisi par le client."
              badge="Actif"
              enabled
              onClick={() => setMode('local-card')}
            />
            <MethodCard
              icon={<Smartphone className="h-5 w-5" />}
              title="Mobile Money"
              description="Paiement Mobile Money RDC. M-Pesa C2B est déjà connecté ; Airtel Money et Orange Money restent préparés."
              badge="M-Pesa actif"
              enabled
              onClick={() => setMode('mobile-money')}
            />
            <MethodCard
              icon={<CreditCard className="h-5 w-5" />}
              title="Market-Cash Visa"
              description="Cartes Visa Market-Cash Standard / Gold. Le parcours est réservé ici et sera activé dès que l’API Visa Market-Cash sera disponible."
              badge="Préparé"
              enabled={false}
            />
            <MethodCard
              icon={<Globe2 className="h-5 w-5" />}
              title="PayPal"
              description="Paiement PayPal hébergé dans le checkout Market-Cash. Activation dès disponibilité de l’endpoint PayPal côté Market-Cash."
              badge="Préparé"
              enabled={false}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-950/10 p-4 text-[11px] leading-5 text-gray-400">
            MUNGWELE affiche uniquement les moyens réellement utilisables. Visa et PayPal restent visibles comme parcours préparés, mais aucun débit n’est simulé tant que Market-Cash n’expose pas leurs endpoints de paiement.
          </div>
        </div>
      </div>
    </div>
  );
};
