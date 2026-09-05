import express from 'express';
import { mountMarketCashBillingRoutes, startMarketCashBillingWorker } from './marketCashBilling';

const INSTALL_FLAG = Symbol.for('mungwele.marketCashBillingInstalled');
const APP_FLAG = Symbol.for('mungwele.marketCashBillingRoutesMounted');

export function installMarketCashBilling() {
  const expressAny = express as any;
  if (expressAny[INSTALL_FLAG]) return;
  expressAny[INSTALL_FLAG] = true;

  const originalUse = (express.application as any).use;
  (express.application as any).use = function patchedBillingUse(this: any, ...args: any[]) {
    const result = originalUse.apply(this, args);
    if (!this[APP_FLAG]) {
      this[APP_FLAG] = true;
      mountMarketCashBillingRoutes(this);
    }
    return result;
  };

  startMarketCashBillingWorker();
}
