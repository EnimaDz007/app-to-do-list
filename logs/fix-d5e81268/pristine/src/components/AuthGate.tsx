import React, { useEffect, useRef, useState } from 'react';
import { SignIn, useUser } from 'capacitor-clerk';
import { AppLogo } from './AppLogo';

const AURORA_CSS = `
  html, body { margin: 0; padding: 0; }
  .am-wrap { position: fixed; inset: 0; background: #f8fafc; overflow-y: auto; overflow-x: hidden; z-index: 1; }
  .am-inner { position: relative; min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 40px 20px; box-sizing: border-box; }
  .am-mesh { position: absolute; inset: -20%; background: radial-gradient(circle at 20% 30%, rgba(99,102,241,0.35), transparent 40%), radial-gradient(circle at 80% 40%, rgba(139,92,246,0.30), transparent 45%), radial-gradient(circle at 30% 80%, rgba(217,70,239,0.28), transparent 40%), radial-gradient(circle at 70% 90%, rgba(56,189,248,0.25), transparent 45%), radial-gradient(circle at 50% 50%, rgba(251,191,36,0.12), transparent 50%); filter: blur(60px); animation: am-meshShift 20s ease-in-out infinite alternate; pointer-events: none; }
  @keyframes am-meshShift { 0% { transform: translate(0, 0) scale(1) rotate(0deg); } 33% { transform: translate(4%, -3%) scale(1.05) rotate(8deg); } 66% { transform: translate(-3%, 4%) scale(1.02) rotate(-6deg); } 100% { transform: translate(0, 0) scale(1.03) rotate(0deg); } }
  .am-grain { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 3px 3px; opacity: 0.5; pointer-events: none; }
  .am-particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .am-particle { position: absolute; bottom: -20px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #d946ef); box-shadow: 0 0 12px rgba(99,102,241,0.6); animation: am-rise linear infinite; }
  @keyframes am-rise { 0% { transform: translateY(0) scale(0.4); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(-110vh) scale(1); opacity: 0; } }
  .am-spotlight { position: absolute; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.55), transparent 60%); filter: blur(30px); pointer-events: none; transition: opacity 0.4s; opacity: 0; z-index: 2; top: 50%; left: 50%; transform: translate(-50%, -50%); }
  .am-inner:hover .am-spotlight { opacity: 1; }
  .am-content { position: relative; z-index: 5; width: 100%; max-width: 420px; }
  .am-card { width: 100%; padding: 32px 28px 24px; border-radius: 26px; background: rgba(255,255,255,0.55); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255,255,255,0.85); box-shadow: 0 30px 80px -30px rgba(99,102,241,0.35), 0 0 0 1px rgba(255,255,255,0.6) inset; position: relative; }
  .am-card::before { content: ''; position: absolute; inset: -1px; border-radius: 26px; padding: 1px; background: linear-gradient(135deg, rgba(99,102,241,0.45), transparent 35%, transparent 65%, rgba(217,70,239,0.45)); -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
  .am-logo-wrap { position: relative; width: 72px; height: 72px; margin: 0 auto 18px; }
  .am-logo-slot { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 16px 32px rgba(76,29,149,0.55)); z-index: 2; }
  .am-halo { position: absolute; inset: -4px; border-radius: 26px; border: 1.5px solid rgba(99,102,241,0.5); animation: am-haloPulse 2.4s ease-out infinite; pointer-events: none; }
  .am-halo.am-d1 { animation-delay: 0.8s; } .am-halo.am-d2 { animation-delay: 1.6s; }
  @keyframes am-haloPulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.35); opacity: 0; } }
  .am-orbit { position: absolute; inset: -15px; animation: am-orbitSpin 8s linear infinite; pointer-events: none; }
  .am-orbit::before, .am-orbit::after { content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #d946ef); box-shadow: 0 0 10px rgba(99,102,241,0.8); }
  .am-orbit::before { top: 0; left: 50%; margin-left: -3px; } .am-orbit::after { bottom: 0; right: 50%; margin-right: -3px; }
  @keyframes am-orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .am-title { font-size: 24px; font-weight: 900; letter-spacing: -0.035em; text-align: center; margin: 0 0 4px; background: linear-gradient(135deg, #0f172a 0%, #4f46e5 55%, #d946ef 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: am-textShimmer 5s ease-in-out infinite; }
  @keyframes am-textShimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
  .am-sub { font-size: 12px; color: #64748b; text-align: center; margin: 0 0 20px; }
  .am-trust { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; }
  .am-card { user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; -webkit-touch-callout: none; }
  .am-card input, .am-card textarea, .am-clerk-slot input, .am-clerk-slot textarea { user-select: text; -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; }
`;

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  const particleHostRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const hasCachedUser = (() => {
    try { return !!localStorage.getItem('taskflow_current_user') || !!localStorage.getItem('taskflow_tasks_list'); } catch { return false; }
  })();

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    const host = particleHostRef.current;
    if (!host || host.childElementCount > 0) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'am-particle';
      p.style.left = `${Math.random() * 100}%`;
      const size = 2 + Math.random() * 4;
      p.style.width = `${size}px`; p.style.height = `${size}px`;
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

  // 🚨 OFFLINE BYPASS: If offline and cached user exists, load app instantly.
  if (isOffline && hasCachedUser) {
    return <>{children}</>;
  }

  if (!isLoaded) {
    if (isOffline) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4"><span className="text-2xl">📡</span></div>
          <h2 className="text-white font-bold text-lg mb-2">You are offline</h2>
          <p className="text-slate-400 text-sm max-w-xs">Please connect to the internet to load the app for the first time.</p>
        </div>
      );
    }
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
          <div className="am-mesh" /><div className="am-grain" /><div className="am-particles" ref={particleHostRef} />
          <div className="am-inner">
            <div className="am-spotlight" ref={spotlightRef} />
            <div className="am-content">
              <div className="am-card">
                <div className="am-logo-wrap">
                  <div className="am-halo" /><div className="am-halo am-d1" /><div className="am-halo am-d2" /><div className="am-orbit" />
                  <div className="am-logo-slot"><AppLogo size={72} /></div>
                </div>
                <h2 className="am-title">Welcome back.</h2>
                <p className="am-sub">Sign in to sync across your devices</p>

                <div className="am-clerk-slot">
                  <SignIn
                    routing="hash"
                    redirectUrl="com.taskpriority.app://callback"
                    afterSignInUrl="com.taskpriority.app://callback"
                    afterSignUpUrl="com.taskpriority.app://callback"
                    appearance={{
                      variables: {
                        colorPrimary: '#6366f1', colorText: '#0f172a', colorTextSecondary: '#64748b', colorBackground: 'transparent',
                        colorInputBackground: '#ffffff', colorInputText: '#0f172a', borderRadius: '13px', fontSize: '13px',
                      },
                      layout: { logoPlacement: 'none', socialButtonsVariant: 'blockButton', socialButtonsPlacement: 'top', showOptionalFields: false, shimmer: false, animations: true },
                      elements: {
                        rootBox: { width: '100%', maxWidth: '100%' },
                        cardBox: { width: '100%', maxWidth: '100%', boxShadow: 'none' },
                        card: { background: 'transparent', boxShadow: 'none', border: 'none', padding: '0', margin: '0', width: '100%' },
                        header: { display: 'none !important' }, headerTitle: { display: 'none !important' }, headerSubtitle: { display: 'none !important' },
                        formFieldInput: { backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '13px', padding: '12px 16px', fontSize: '13px', color: '#0f172a', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
                        formButtonPrimary: { backgroundColor: '#6366f1', backgroundImage: 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)', color: '#ffffff', fontWeight: '800', fontSize: '13px', borderRadius: '13px', padding: '13px', boxShadow: '0 12px 32px -10px rgba(99,102,241,0.55)', textTransform: 'none' },
                        socialButtonsBlockButton: { border: '1px solid #e2e8f0', backgroundColor: '#ffffff', borderRadius: '14px', padding: '12px 16px', fontWeight: '700', fontSize: '13px', color: '#0f172a', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' },
                        socialButtonsBlockButtonText: { fontWeight: '700', color: '#0f172a', fontSize: '13px' },
                        footer: { display: 'none !important' }, footerPages: { display: 'none !important' }, badge: { display: 'none !important' },
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