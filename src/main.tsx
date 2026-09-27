import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

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

// Ensure the user ID is generated on startup
getOrCreateUserId();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
);