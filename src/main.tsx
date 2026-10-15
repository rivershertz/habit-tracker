import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme, loadTheme } from './store/theme';
import { App } from './ui/App';
import './styles.css';
import './themes/varsity.css';
import './themes/nothing.css';

// before the first paint, so a saved theme never flashes the default one
applyTheme(loadTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is a bonus, never fatal */
    });
  });
}
