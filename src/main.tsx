// ─────────────────────────────────────────────────────────────
//  FILE: src/main.tsx
//  Clerk auth + Sentry error tracking + theme/language providers.
// ─────────────────────────────────────────────────────────────

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

// ── Sentry ────────────────────────────────────────────────────
Sentry.init({
  dsn: 'https://ca8a011fe6caec841fbf66d87b3ce510@o4512227221700608.ingest.de.sentry.io/4512227244179536',
  environment: import.meta.env.PROD ? 'production' : 'development',
  tracesSampleRate: 0.1,
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
});

// ── Clerk publishable key ─────────────────────────────────────
// Read from the build-time env var (VITE_ prefix is required by Vite).
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

if (!PUBLISHABLE_KEY) {
  throw new Error(
    'Missing VITE_CLERK_PUBLISHABLE_KEY. Set it in .env.local for dev and in Vercel → Project → Settings → Environment Variables for Production/Preview.'
  );
}

// ── Fallback UI if the whole app crashes ─────────────────────
function CrashScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f1f5f9',
      padding: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: 420,
        textAlign: 'center',
        background: '#fff',
        borderRadius: 24,
        padding: 32,
        boxShadow: '0 20px 60px rgba(15,23,42,0.1)',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>😵</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
          We've been notified and are looking into it. Try reloading the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            borderRadius: 12,
            border: 'none',
            background: '#4F46E5',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Reload
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashScreen />}>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <ThemeProvider>
          <LanguageProvider>
            <AuthGate>
              <App />
            </AuthGate>
          </LanguageProvider>
        </ThemeProvider>
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
);