import React from 'react';
import type { MarketCashPaymentTarget } from '../../services/marketCashPaymentService';
import { MarketCashCheckoutModal } from './MarketCashCheckoutModal';

export type MarketCashPaymentModalProps = {
  target: MarketCashPaymentTarget;
  userId?: string;
  userEmail?: string;
  onClose: () => void;
  onSuccess?: (transactionId?: string) => void;
};

/**
 * Backward-compatible entry point used by SubscriptionView.
 * The first screen is now the Market-Cash checkout method chooser, then the
 * selected provider-specific form is opened.
 */
export const MarketCashPaymentModal: React.FC<MarketCashPaymentModalProps> = (props) => (
  <MarketCashCheckoutModal {...props} />
);
