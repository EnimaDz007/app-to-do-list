// ─────────────────────────────────────────────────────────────
//  FILE: src/components/AuthGate.tsx
//  Aurora Mesh sign-in — animated premium design
//  Clerk's <SignIn> embedded with deep appearance customization
//  Google + Apple buttons appear automatically if enabled in
//  your Clerk dashboard → User & Authentication → SSO connections
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';

/* ═════════════════════════════════════════════════════════════
   Aurora Mesh CSS — scoped to the sign-in screen.
   All class names prefixed `am-` to avoid collisions.
   ═════════════════════════════════════════════════════════════ */
const AURORA_CSS = `
  .am-wrap {
    position: fixed;
    inset: 0;
    background: #f8fafc;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 1;
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
  }
  @keyframes am-meshShift {
    0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
    33%  { transform: translate(4%, -3%) scale(1.05) rotate(8deg); }
    66%  { transform: translate(-3%, 4%) scale(1.02) rotate(-6deg); }
    100% { transform: translate(0, 0) scale(1.03) rotate(0deg); }
  }

  /* ── Grain overlay ── */
  .am-grain {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px);
    background-size: 3px 3px;
    opacity: 0.5;
    pointer-events: none;
  }

  /* ── Floating particles ── */
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

  /* ── Cursor-follow spotlight ── */
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
  }
  .am-wrap:hover .am-spotlight { opacity: 1; }

  /* ── Content wrapper ── */
  .am-content {
    position: relative;
    z-index: 5;
    width: 100%;
    max-width: 440px;
  }

  /* ── Card ── */
  .am-card {
    width: 100%;
    padding: 36px 32px 32px;
    border-radius: 28px;
    background: rgba(255,255,255,0.72);
    backdrop-filter: blur(30px) saturate(180%);
    -webkit-backdrop-filter: blur(30px) saturate(180%);
    border: 1px solid rgba(255,255,255,0.9);
    box-shadow:
      0 40px 90px -30px rgba(99,102,241,0.35),
      0 0 0 1px rgba(255,255,255,0.8) inset;
    position: relative;
    animation: am-cardFloat 6s ease-in-out infinite;
  }
  @keyframes am-cardFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .am-card::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 28px;
    padding: 1px;
    background: linear-gradient(135deg, rgba(99,102,241,0.4), transparent 30%, transparent 70%, rgba(217,70,239,0.4));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /* ── Logo with halos + orbit ── */
  .am-logo-wrap {
    position: relative;
    width: 72px;
    height: 72px;
    margin: 0 auto 20px;
  }
  .am-logo {
    position: absolute;
    inset: 0;
    border-radius: 22px;
    background: linear-gradient(135deg, #0f172a, #1e1b4b 60%, #4c1d95);
    color: #fbbf24;
    font-weight: 900;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 20px 40px -12px rgba(76,29,149,0.55);
    z-index: 2;
  }
  .am-halo {
    position: absolute;
    inset: -6px;
    border-radius: 28px;
    border: 1.5px solid rgba(99,102,241,0.5);
    animation: am-haloPulse 2.4s ease-out infinite;
    pointer-events: none;
  }
  .am-halo.am-d1 { animation-delay: 0.8s; }
  .am-halo.am-d2 { animation-delay: 1.6s; }
  @keyframes am-haloPulse {
    0%   { transform: scale(1); opacity: 0.9; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  .am-orbit {
    position: absolute;
    inset: -22px;
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

  /* ── Title with gradient shimmer ── */
  .am-title {
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.035em;
    text-align: center;
    margin: 0 0 4px;
    background: linear-gradient(135deg, #0f172a 0%, #4f46e5 60%, #d946ef 100%);
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
    margin: 0 0 24px;
  }

  /* ── Trust row ── */
  .am-trust {
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    animation: am-fadeIn 1s 0.7s backwards;
  }
  @keyframes am-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  /* ═══════════════════════════════════════════════════════════
     Clerk <SignIn> overrides — everything inside .am-clerk-slot
     ═══════════════════════════════════════════════════════════ */
  .am-clerk-slot .cl-rootBox,
  .am-clerk-slot .cl-cardBox {
    width: 100%;
  }
  .am-clerk-slot .cl-card {
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .am-clerk-slot .cl-header,
  .am-clerk-slot .cl-headerTitle,
  .am-clerk-slot .cl-headerSubtitle,
  .am-clerk-slot .cl-logoBox,
  .am-clerk-slot .cl-logoImage {
    display: none !important;
  }
  .am-clerk-slot .cl-main { margin: 0 !important; }
  .am-clerk-slot .cl-formFieldLabel {
    display: none !important;
  }
  .am-clerk-slot .cl-formFieldInput {
    background: #ffffff !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 13px !important;
    padding: 13px 16px !important;
    font-size: 13px !important;
    color: #0f172a !important;
    transition: all 0.25s !important;
    height: auto !important;
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
    animation: am-gradientSlide 4s ease infinite !important;
    color: #ffffff !important;
    font-weight: 800 !important;
    font-size: 13px !important;
    border-radius: 13px !important;
    padding: 14px !important;
    box-shadow: 0 12px 32px -10px rgba(99,102,241,0.55) !important;
    letter-spacing: 0.2px !important;
    height: auto !important;
    transition: transform 0.2s !important;
  }
  .am-clerk-slot .cl-formButtonPrimary:hover {
    transform: translateY(-1px) !important;
  }
  @keyframes am-gradientSlide {
    0%, 100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
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
    padding: 13px 16px !important;
    font-weight: 700 !important;
    font-size: 13px !important;
    color: #0f172a !important;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    box-shadow: 0 1px 2px rgba(15,23,42,0.04) !important;
    height: auto !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButton:hover {
    transform: translateY(-2px) scale(1.01) !important;
    border-color: #c7d2fe !important;
    box-shadow: 0 12px 32px -12px rgba(99,102,241,0.35) !important;
    background: #ffffff !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButtonText {
    font-weight: 700 !important;
    color: #0f172a !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButton__apple,
  .am-clerk-slot .cl-socialButtonsBlockButton__apple:hover {
    background: #0f172a !important;
    border-color: #0f172a !important;
    color: #ffffff !important;
    box-shadow: 0 1px 2px rgba(15,23,42,0.15) !important;
  }
  .am-clerk-slot .cl-socialButtonsBlockButton__apple .cl-socialButtonsBlockButtonText {
    color: #ffffff !important;
  }
  .am-clerk-slot .cl-dividerRow {
    margin: 18px 0 !important;
    gap: 12px !important;
  }
  .am-clerk-slot .cl-dividerLine {
    background: linear-gradient(90deg, transparent, #e2e8f0 40%, #e2e8f0 60%, transparent) !important;
    height: 1px !important;
  }
  .am-clerk-slot .cl-dividerText {
    color: #94a3b8 !important;
    font-size: 10px !important;
    font-weight: 800 !important;
    letter-spacing: 1.5px !important;
    text-transform: uppercase !important;
  }
  .am-clerk-slot .cl-footer {
    background: transparent !important;
    padding: 0 !important;
    margin-top: 16px !important;
  }
  .am-clerk-slot .cl-footerAction {
    background: transparent !important;
  }
  .am-clerk-slot .cl-footerActionText {
    color: #64748b !important;
    font-size: 11px !important;
  }
  .am-clerk-slot .cl-footerActionLink {
    color: #6366f1 !important;
    font-weight: 700 !important;
    font-size: 11px !important;
  }
  .am-clerk-slot .cl-formFieldRow { margin: 0 !important; }
  .am-clerk-slot .cl-formField { margin-bottom: 10px !important; }
  .am-clerk-slot .cl-form { gap: 10px !important; display: flex !important; flex-direction: column !important; }
  .am-clerk-slot .cl-alert,
  .am-clerk-slot .cl-alertText {
    font-size: 11px !important;
    border-radius: 12px !important;
  }
  .am-clerk-slot .cl-formResendCodeLink,
  .am-clerk-slot .cl-otpCodeFieldInput {
    border-radius: 12px !important;
  }
`;

/* ═════════════════════════════════════════════════════════════
   COMPONENT
   ═════════════════════════════════════════════════════════════ */

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  const particleHostRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);

  // Spawn particles once on mount
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

  // Cursor spotlight
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const spot = spotlightRef.current;
    if (!spot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    spot.style.left = `${e.clientX - rect.left - 250}px`;
    spot.style.top = `${e.clientY - rect.top - 250}px`;
  };

  /* ── Loading ── */
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  /* ── Signed out: Aurora Mesh sign-in ── */
  if (!isSignedIn) {
    return (
      <>
        <style>{AURORA_CSS}</style>

        <div className="am-wrap" onMouseMove={handleMouseMove}>
          <div className="am-mesh" />
          <div className="am-grain" />
          <div className="am-particles" ref={particleHostRef} />
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
                    },
                    layout: {
                      logoPlacement: 'none',
                      socialButtonsVariant: 'blockButton',
                      socialButtonsPlacement: 'top',
                      showOptionalFields: false,
                      shimmer: true,
                      animations: true,
                    },
                    elements: {
                      rootBox: 'w-full',
                      cardBox: 'w-full',
                    },
                  }}
                />
              </div>

              <div className="am-trust">🔒 Encrypted · No ads</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /* ── Signed in ── */
  return <>{children}</>;
};