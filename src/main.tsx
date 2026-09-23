import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import  OneSignal  from '@onesignal/capacitor-plugin';
import './index.css';

// Initialize OneSignal (works for native Android + web)
const ONESIGNAL_APP_ID = 'd9c1a8b5-5164-4bc3-bfea-6e870770913b';

try {
  const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();

  // Show on-screen debug info
  setTimeout(() => {
    if (typeof window !== 'undefined') {
      const msg = `Capacitor: ${typeof (window as any).Capacitor}\n` +
                  `isNative: ${isNative}\n` +
                  `OneSignal: ${typeof OneSignal}`;
      console.log(msg);
      if (isNative) alert(msg);
    }
  }, 1000);

  OneSignal.initialize(ONESIGNAL_APP_ID);

  if (isNative) {
    OneSignal.Notifications.requestPermission(true);
  }
} catch (err) {
  if (typeof window !== 'undefined') {
    alert('OneSignal error: ' + String(err));
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
);