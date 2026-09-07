import { installBackgroundGenerationPersistence } from './server/backgroundGenerationPersistence';
import { installMediaDownload } from './server/installMediaDownload';
import { installMarketCashPaymentProxy } from './server/marketCashPaymentProxy';
import { installMobileMoneyLivePaymentProxy } from './server/mobileMoneyLivePaymentProxy';
import { installMarketCashBilling } from './server/installMarketCashBilling';
import { installLaunchPricingSync } from './server/installLaunchPricing';
import { installProviderWalletAdminApi } from './server/installProviderWalletAdmin';

installBackgroundGenerationPersistence();
installProviderWalletAdminApi();
installMediaDownload();
installMarketCashPaymentProxy();
installMobileMoneyLivePaymentProxy();
installMarketCashBilling();
installLaunchPricingSync();
void import('./server');
