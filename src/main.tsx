import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './mobileOverrides.css';
import { installAuthenticatedApiFetch } from './services/installAuthenticatedApiFetch';

installAuthenticatedApiFetch();

class BootErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MUNGWELE_BOOT_ERROR]', error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', background: '#07101f', color: '#fff', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 10 }}>MUNGWELE IA</h1>
          <p style={{ color: '#aab3c5', lineHeight: 1.6 }}>Une mise à jour de l’application doit être rechargée.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 18, border: 0, borderRadius: 14, padding: '12px 18px', fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg,#7c3aed,#ec4899,#2563eb)' }}>
            Recharger l’application
          </button>
        </div>
      </div>
    );
  }
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => registration.update()).catch((error) => {
      console.warn('[PWA] Service worker registration failed:', error);
    });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('MUNGWELE root element missing.');

createRoot(rootElement).render(
  <StrictMode>
    <BootErrorBoundary>
      <App />
    </BootErrorBoundary>
  </StrictMode>,
);
