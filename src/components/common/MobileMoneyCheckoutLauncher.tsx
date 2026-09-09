import React from 'react';

// Mobile Money is now part of the unified MUNGWELE payment sheet.
// Keep this component as a no-op for older callers while avoiding a second
// payment interface in the subscription page.
export const MobileMoneyCheckoutLauncher: React.FC = () => null;
