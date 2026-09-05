import { installBackgroundGenerationPersistence } from './server/backgroundGenerationPersistence';
import { installMediaDownload } from './server/installMediaDownload';
import { installMarketCashPaymentProxy } from './server/marketCashPaymentProxy';

installBackgroundGenerationPersistence();
installMediaDownload();
installMarketCashPaymentProxy();
void import('./server');
