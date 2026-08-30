import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './mobileOverrides.css';
import { installAuthenticatedApiFetch } from './services/installAuthenticatedApiFetch';

installAuthenticatedApiFetch();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
