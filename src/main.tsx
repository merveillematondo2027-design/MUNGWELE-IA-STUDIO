import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './mobileOverrides.css';
import { installAuthenticatedApiFetch } from './services/installAuthenticatedApiFetch';

installAuthenticatedApiFetch();

function showBootFailure(message = 'Une mise à jour de l’application doit être rechargée.') {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="min-height:100vh;background:#07101f;color:#fff;display:grid;place-items:center;padding:24px;font-family:system-ui,sans-serif">
      <div style="max-width:420px;text-align:center">
        <h1 style="font-size:24px;margin:0 0 10px">MUNGWELE IA</h1>
        <p style="color:#aab3c5;line-height:1.6;margin:0">${message}</p>
        <button id="mungwele-reload" style="margin-top:18px;border:0;border-radius:14px;padding:12px 18px;font-weight:800;color:#fff;background:linear-gradient(90deg,#7c3aed,#ec4899,#2563eb)">Recharger l’application</button>
      </div>
    </div>`;
  document.getElementById('mungwele-reload')?.addEventListener('click', () => window.location.reload());
}

window.addEventListener('error', (event) => {
  console.error('[MUNGWELE_BOOT_ERROR]', event.error || event.message);
  showBootFailure();
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('[MUNGWELE_UNHANDLED_REJECTION]', event.reason);
});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch((error) => console.warn('[PWA] Service worker registration failed:', error));
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('MUNGWELE root element missing.');

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error('[MUNGWELE_RENDER_ERROR]', error);
  showBootFailure();
}
