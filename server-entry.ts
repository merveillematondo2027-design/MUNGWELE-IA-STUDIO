import { installBackgroundGenerationPersistence } from './server/backgroundGenerationPersistence';
import { installMediaDownload } from './server/installMediaDownload';

installBackgroundGenerationPersistence();
installMediaDownload();
void import('./server');
