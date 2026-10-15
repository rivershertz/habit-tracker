import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { todayKey } from './logic/dates';
import { loadState } from './store/storage';
import { applyTheme, loadTheme } from './store/theme';
import { optedOut, trackDailyUsage } from './store/usage';
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

// anonymous daily usage ping (see src/store/usage.ts); runs again when the app comes back to the foreground
// so an installed app left open overnight still counts the new day
const LOCAL_HOST = /^(localhost|127\.|\[::1\]$)/;
function track() {
  try {
    if (document.visibilityState !== 'visible' || optedOut(navigator as Navigator & { globalPrivacyControl?: boolean })) return;
    const state = loadState();
    trackDailyUsage({
      storage: localStorage,
      today: todayKey(Date.now()),
      installed: matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
      seedFirst: state ? Object.values(state.checkins).flat().sort()[0] : undefined,
      send: (url) => navigator.sendBeacon(url),
    });
  } catch {
    /* analytics must never break the app */
  }
}
if (import.meta.env.PROD && !LOCAL_HOST.test(location.hostname)) {
  track();
  document.addEventListener('visibilitychange', track);
}
