import { installBackgroundGenerationPersistence } from './server/backgroundGenerationPersistence';

installBackgroundGenerationPersistence();
await import('./server');
