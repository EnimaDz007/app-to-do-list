// ─────────────────────────────────────────────────────────────
//  FILE: src/components/AuthGate.tsx
//  Aurora Mesh sign-in — v2 (fixed overflow + Clerk transparency)
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';

const AURORA_CSS = `
  html, body { margin: 0; padding: 0; }

  .am-wrap {
    position: fixed;
    inset: 0;
    background: #f8fafc;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 1;
  }

  /* Inner wrapper holds min-height for centering */
  .am-inner {
    position: relative;
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    box-sizing: border-box;
  }

  /* ── Animated gradient mesh ── */
  .am-mesh {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(circle at 20% 30%, rgba(99,102,241,0.35), transparent 40%),
      radial-gradient(circle at 80% 40%, rgba(139,92,246,0.30), transparent 45%),
      radial-gradient(circle at 30% 80%, rgba(217,70,239,0.28), transparent 40%),
      radial-gradient(circle at 70% 90%, rgba(56,189,248,0.25), transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(251,191,36,0.12), transparent 50%);
    filter: blur(60px);
    animation: am-meshShift 20s ease-in-out infinite alternate;
    pointer-events: none;
  }
  @keyframes am-meshShift {
    0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
    33%  { transform: translate(4%, -3%) scale(1.05) rotate(8deg); }
    66%  { transform: translate(-3%, 4%) scale(1.02) rotate(-6deg); }
    100% { transform: translate(0, 0) scale(1.03) rotate(0deg); }
  }

  .am-grain {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px);
    background-size: 3px 3px;
    opacity: 0.5;
    pointer-events: none;
  }

  .am-particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .am-particle {
    position: absolute;
    bottom: -20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #d946ef);
    box-shadow: 0 0 12px rgba(99,102,241,0.6);
    animation: am-rise linear infinite;
  }
  @keyframes am-rise {
    0%   { transform: translateY(0) scale(0.4); opacity: 0; }
    10%  { opacity: 0.8; }
    90%  { opacity: 0.8; }
    100% { transform: translateY(-110vh) scale(1); opacity: 0; }
  }

  .am-spotlight {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,255,255,0.55), transparent 60%);
    filter: blur(30px);
    pointer-events: none;
    transition: opacity 0.4s;
    opacity: 0;
    z-index: 2;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .am-inner:hover .am-spotlight { opacity: 1; }

  /* ── Content ── */
  .am-content {
    position: relative;
    z-index: 5;
    width: 100%;
    max-width: 420px;
  }

  /* ── Glass card ── */
  .am-card {
    width: 100%;
    padding: 32px 28px 24px;
    border-radius: 26px;
    background: rgba(255,255,255,0.55);
    backdrop-filter: blur(28px) saturate(180%);
    -webkit-backdrop-filter: blur(28px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.85);
    box-shadow:
      0 30px 80px -30px rgba(99,102,241,0.35),
      0 0 0 1px rgba(255,255,255,0.6) inset;
    position: relative;
  }
  .am-card::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 26px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(99,102,241,0.45), transparent 35%, transparent 65%, rgba(217,70,239,0.45));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /* ── Logo ── */
  .am-logo-wrap {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
  }
  .am-logo {
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: linear-gradient(135deg, #0f172a, #1e1b4b 60%, #4c1d95);
    color: #fbbf24;
    font-weight: 900;
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 16px 32px -10px rgba(76,29,149,0.55);
    z-index: 2;
  }
  .am-halo {
    position: absolute;
    inset: -5px;
    border-radius: 25px;
    border: 1.5px solid rgba(99,102,241,0.5);
    animation: am-haloPulse 2.4s ease-out infinite;
    pointer-events: none;
  }
  .am-halo.am-d1 { animation-delay: 0.8s; }
  .am-halo.am-d2 { animation-delay: 1.6s; }
  @keyframes am-haloPulse {
    0%   { transform: scale(1); opacity: 0.9; }
    100% { transform: scale(1.35); opacity: 0; }
  }
  .am-orbit {
    position: absolute;
    inset: -18px;
    animation: am-orbitSpin 8s linear infinite;
    pointer-events: none;
  }
  .am-orbit::before,
  .am-orbit::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #d946ef);
    box-shadow: 0 0 10px rgba(99,102,241,0.8);
  }
  .am-orbit::before { top: 0; left: 50%; margin-left: -3px; }
  .am-orbit::after  { bottom: 0; right: 50%; margin-right: -3px; }
  @keyframes am-orbitSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  /* ── Title ── */
  .am-title {
    font-size: 24px;
    font-weight: 900;
    letter-spacing: -0.035em;
    text-align: center;
    margin: 0 0 4px;
    background: linear-gradient(135deg, #0f172a 0%, #4f46e5 55%, #d946ef 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: am-textShimmer 5s ease-in-out infinite;
  }
  @keyframes am-textShimmer {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  .am-sub {
    font-size: 12px;
    color: #64748b;
    text-align: center;
    margin: 0 0 20px;
  }

  .am-trust {
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    margin-top: 16px;
  }

  /* ═══════════════════════════════════════════════════════════
     CLERK OVERRIDES — aggressive
     ═══════════════════════════════════════════════════════════ */
  .am-clerk-slot .cl-rootBox,
  .am-clerk-slot .cl-cardBox {
    width: 100% !important;
    max-width: 100% !important;
  }
  .am-clerk-slot .cl-card {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
    min-height: 0 !important;
    max-height: none !important;
    width: 100% !important;
  }
  .am-clerk-slot .cl-main {
    margin: 0 !important;
    padding: 0 !important;
    gap: 10px !important;
  }
  .am-clerk-slot .cl-header,
  .am-clerk-slot .cl-headerTitle,
  .am-clerk-slot .cl-headerSubtitle,
  .am-clerk-slot .cl-logoBox,
  .am-clerk-slot .cl-logoImage,
  .am-clerk-slot .cl-headerTitle__signIn {
    display: none !important;
  }
  .am-clerk-slot .cl-formFieldLabel {
    display: none !important;
  }
  .am-clerk-slot .cl-formFieldRow,
  .am-clerk-slot .cl-formField {
    margin: 0 0 10px !important;
  }
  .am-clerk-slot .cl-formFieldInput {
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 13px !important;
    padding: 12px 16px !important;
    font-size: 13px !important;
    color: #0f172a !important;
    transition: all 0.25s !important;
    height: auto !important;
    min-height: 0 !important;
    box-shadow: 0 1px 2px rgba(15,23,42,0.04) !important;
  }
  .am-clerk-slot .cl-formFieldInput:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 4px rgba(99,102,241,0.12) !important;
    outline: none !important;
  }
  .am-clerk-slot .cl-formFieldInput::placeholder {
    color: #94a3b8 !important;
  }
  .am-clerk-slot .cl-formButtonPrimary {
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef) !important;
    background-size: 200% 200% !important;
    color: #ffffff !important;
    font-weight: 800 !important;
    font-size: 13px !important;
    border-radius: 13px !important;
    padding: 13px !important;
    box-shadow: 0 12px 32px -10px rgba(99,102,241,0.55) !important;
    letter-spacing: 0.2px !important;
    height: auto !important;
    min-height: 0 !important;
    transition: transform 0.15s !important;
    text-transform: none !important;
  }
  .am-clerk-slot .cl-formButtonPrimary:hover {
    transform: translateY(-1px) !important;
  }
  .am-clerk-slot .cl-socialButtons {
    display: flex !important;
    flex-direction: column !important;
    gap: 10px !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButton {
    border: 1px solid #e2e8f0 !important;
    background: #ffffff !important;
    border-radius: 14px !important;
    padding: 12px 16px !important;
    font-weight: 700 !important;
    font-size: 13px !important;
    color: #0f172a !important;
    transition: all 0.25s !important;
    box-shadow: 0 1px 2px rgba(15,23,42,0.04) !important;
    height: auto !important;
    min-height: 0 !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButton:hover {
    transform: translateY(-1px) !important;
    border-color: #c7d2fe !important;
    box-shadow: 0 10px 24px -10px rgba(99,102,241,0.3) !important;
    background: #ffffff !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButtonText {
    font-weight: 700 !important;
    color: #0f172a !important;
    font-size: 13px !important;
  }
  /* Apple button dark style — Clerk uses data-provider attribute */
  .am-clerk-slot .cl-socialButtonsBlockButton[data-provider="apple"],
  .am-clerk-slot .cl-socialButtonsBlockButton[data-provider="apple"]:hover {
    background: #0f172a !important;
    border-color: #0f172a !important;
    box-shadow: 0 1px 2px rgba(15,23,42,0.15) !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButton[data-provider="apple"] .cl-socialButtonsBlockButtonText {
    color: #ffffff !important;
  }
  .am-clerk-slot .cl-dividerRow {
    margin: 14px 0 !important;
    gap: 12px !important;
  }
  .am-clerk-slot .cl-dividerLine {
    background: linear-gradient(90deg, transparent, #cbd5e1 40%, #cbd5e1 60%, transparent) !important;
    height: 1px !important;
  }
  .am-clerk-slot .cl-dividerText {
    color: #94a3b8 !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: 1.5px !important;
    text-transform: uppercase !important;
    background: transparent !important;
    padding: 0 4px !important;
  }
  /* Hide "Secured by Clerk" + "Development mode" footer */
  .am-clerk-slot .cl-footer {
    display: none !important;
  }
  /* But keep sign-up link visible — it lives in footerAction in some versions */
  .am-clerk-slot .cl-footerAction {
    display: block !important;
    background: transparent !important;
    margin-top: 12px !important;
    text-align: center !important;
  }
  .am-clerk-slot .cl-footerActionText {
    color: #64748b !important;
    font-size: 11px !important;
  }
  .am-clerk-slot .cl-footerActionLink {
    color: #6366f1 !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    text-decoration: none !important;
  }
  .am-clerk-slot .cl-form { gap: 10px !important; display: flex !important; flex-direction: column !important; }
  .am-clerk-slot .cl-alert,
  .am-clerk-slot .cl-alertText {
    font-size: 11px !important;
    border-radius: 12px !important;
  }
`;

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  const particleHostRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = particleHostRef.current;
    if (!host) return;
    if (host.childElementCount > 0) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'am-particle';
      p.style.left = `${Math.random() * 100}%`;
      const size = 2 + Math.random() * 4;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.animationDuration = `${8 + Math.random() * 10}s`;
      p.style.animationDelay = `-${Math.random() * 15}s`;
      p.style.opacity = `${0.3 + Math.random() * 0.5}`;
      frag.appendChild(p);
    }
    host.appendChild(frag);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const spot = spotlightRef.current;
    if (!spot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    spot.style.left = `${e.clientX - rect.left - 250}px`;
    spot.style.top = `${e.clientY - rect.top - 250}px`;
    spot.style.transform = 'none';
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <style>{AURORA_CSS}</style>

        <div className="am-wrap" onMouseMove={handleMouseMove}>
          <div className="am-mesh" />
          <div className="am-grain" />
          <div className="am-particles" ref={particleHostRef} />

          <div className="am-inner">
            <div className="am-spotlight" ref={spotlightRef} />

            <div className="am-content">
              <div className="am-card">
                <div className="am-logo-wrap">
                  <div className="am-halo" />
                  <div className="am-halo am-d1" />
                  <div className="am-halo am-d2" />
                  <div className="am-orbit" />
                  <div className="am-logo">TP</div>
                </div>

                <h2 className="am-title">Welcome back.</h2>
                <p className="am-sub">Sign in to sync across your devices</p>

                <div className="am-clerk-slot">
                  <SignIn
                    routing="hash"
                    appearance={{
                      variables: {
                        colorPrimary: '#6366f1',
                        colorText: '#0f172a',
                        colorTextSecondary: '#64748b',
                        colorBackground: 'transparent',
                        colorInputBackground: '#ffffff',
                        colorInputText: '#0f172a',
                        borderRadius: '14px',
                        fontFamily:
                          '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
                        fontSize: '13px',
                      },
                      layout: {
                        logoPlacement: 'none',
                        socialButtonsVariant: 'blockButton',
                        socialButtonsPlacement: 'top',
                        showOptionalFields: false,
                        shimmer: false,
                        animations: true,
                      },
                      elements: {
                        rootBox: { width: '100%', maxWidth: '100%' },
                        cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none' },
                        card: {
                          background: 'transparent',
                          boxShadow: 'none',
                          border: 'none',
                          padding: '0',
                          margin: '0',
                          width: '100%',
                        },
                      },
                    }}
                  />
                </div>

                <div className="am-trust">🔒 Encrypted · No ads</div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
};