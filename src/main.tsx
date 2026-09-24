import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import OneSignal from '@onesignal/capacitor-plugin';
import './index.css';

// OneSignal App ID
const ONESIGNAL_APP_ID = 'd9c1a8b5-5164-4bc3-bfea-6e870770913b';

// --- USER ID MANAGEMENT ---
// Generate a unique, stable user ID once per device (persisted in localStorage)
const USER_ID_KEY = 'taskflow_user_id';

function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'unknown';
  try {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
      // Generate a random ID: timestamp + random string
      userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(USER_ID_KEY, userId);
      console.log('🆔 Generated new user ID:', userId);
    }
    return userId;
  } catch {
    return `user_${Date.now()}`;
  }
}

// --- ONESIGNAL INITIALIZATION ---
try {
  const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
  const userId = getOrCreateUserId();

  OneSignal.initialize(ONESIGNAL_APP_ID);

  // Login the user so the backend can target this specific device
  OneSignal.login(userId)
    .then(() => console.log('✅ OneSignal logged in as:', userId))
    .catch((err: any) => console.warn('⚠️ OneSignal login failed:', err));

  // Request permission on native Android/iOS
  if (isNative) {
    OneSignal.Notifications.requestPermission(true);
  }
} catch (err) {
  console.error('OneSignal init error:', err);
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