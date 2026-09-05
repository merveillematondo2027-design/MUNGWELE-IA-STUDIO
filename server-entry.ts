import { installBackgroundGenerationPersistence } from './server/backgroundGenerationPersistence';
import { installMediaDownload } from './server/installMediaDownload';
import { installMarketCashPaymentProxy } from './server/marketCashPaymentProxy';
import { installMarketCashBilling } from './server/installMarketCashBilling';

installBackgroundGenerationPersistence();
installMediaDownload();
installMarketCashPaymentProxy();
installMarketCashBilling();
void import('./server');
