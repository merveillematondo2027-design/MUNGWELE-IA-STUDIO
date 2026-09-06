import { installBackgroundGenerationPersistence } from './server/backgroundGenerationPersistence';
import { installMediaDownload } from './server/installMediaDownload';
import { installMarketCashPaymentProxy } from './server/marketCashPaymentProxy';
import { installMarketCashBilling } from './server/installMarketCashBilling';
import { installLaunchPricingSync } from './server/installLaunchPricing';

installBackgroundGenerationPersistence();
installMediaDownload();
installMarketCashPaymentProxy();
installMarketCashBilling();
installLaunchPricingSync();
void import('./server');
