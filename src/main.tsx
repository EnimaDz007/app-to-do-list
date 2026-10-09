import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// Clerk publishable key — safe to be public (starts with "pk_").
const PUBLISHABLE_KEY = 'pk_test_Y2l2aWwtYm94ZXItODk4OS5jbGVyay5hY2NvdW50cy5kZXYk';

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <ThemeProvider>
        <LanguageProvider>
          <AuthGate>
            <App />
          </AuthGate>
        </LanguageProvider>
      </ThemeProvider>
    </ClerkProvider>
  </StrictMode>
);