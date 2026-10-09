// ─────────────────────────────────────────────────────────────
//  FILE: src/components/AuthGate.tsx
//  Shows a loading spinner while Clerk initializes, the sign-in
//  screen if no user is signed in, and the app otherwise.
// ─────────────────────────────────────────────────────────────

import React from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();

  // ── Loading: Clerk is still checking the current session ──
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Signed out: show Clerk's sign-in card ──
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 text-amber-400 font-extrabold text-2xl flex items-center justify-center ring-2 ring-amber-400/30 shadow-md">
              TP
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-3">Task Priority</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sign in to sync across your devices</p>
          </div>
          <SignIn
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-2xl rounded-2xl',
              },
            }}
          />
        </div>
      </div>
    );
  }

  // ── Signed in: render the app ──
  return <>{children}</>;
};