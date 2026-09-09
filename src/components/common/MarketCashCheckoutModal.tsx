import React, { useState } from 'react';
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

export const MarketCashCheckoutModal: React.FC<MarketCashCheckoutModalProps> = ({ target, userId, userEmail, onClose, onSuccess }) => {
  const [mobileMoneyOpen, setMobileMoneyOpen] = useState(false);

  if (mobileMoneyOpen) {
    return <MobileMoneyPaymentModal target={target} onClose={() => setMobileMoneyOpen(false)} onSuccess={onSuccess} />;
  }

  return <MarketCashLocalCardPaymentModal
    target={target}
    userId={userId}
    userEmail={userEmail}
    onClose={onClose}
    onSuccess={onSuccess}
    onMobileMoney={() => setMobileMoneyOpen(true)}
  />;
};
