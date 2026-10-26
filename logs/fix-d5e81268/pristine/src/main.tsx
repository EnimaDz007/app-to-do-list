import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { ClerkProvider } from 'capacitor-clerk';
import App from './App.tsx';
import { AuthGate } from './components/AuthGate';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import './index.css';

Sentry.init({
  dsn: 'https://ca8a011fe6caec841fbf66d87b3ce510@o4512227221700608.ingest.de.sentry.io/4512227244179536',
  environment: import.meta.env.PROD ? 'production' : 'development',
  tracesSampleRate: 0.1,
  ignoreErrors: ['ResizeObserver loop limit exceeded', 'Non-Error promise rejection captured'],
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
if (!PUBLISHABLE_KEY) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

function CrashScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 20 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', background: '#fff', borderRadius: 24, padding: 32 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>Something went wrong</h1>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, marginTop: 16 }}>Reload</button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashScreen />}>
      <ClerkProvider 
        publishableKey={PUBLISHABLE_KEY} 
        afterSignOutUrl="/"
        signInForceRedirectUrl="com.taskpriority.app://callback"
        signUpForceRedirectUrl="com.taskpriority.app://callback"
        allowedRedirectOrigins={['capacitor://localhost', 'http://localhost']}
        allowedRedirectProtocols={['com.taskpriority.app']}
      >
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