import React, { useEffect, useRef, useState } from 'react';
import { useUser, useSSO } from 'capacitor-clerk';
import { AppLogo } from './AppLogo';

const CLERK_REDIRECT_URL = 'native://callback';

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
  
  .am-google-btn, .am-apple-btn, .am-email-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid #e2e8f0; background-color: #ffffff; border-radius: 14px; padding: 12px 16px; font-weight: 700; font-size: 13px; color: #0f172a; box-shadow: 0 1px 2px rgba(15,23,42,0.04); cursor: pointer; transition: background 0.2s; margin-top: 10px; }
  .am-google-btn:active, .am-apple-btn:active, .am-email-btn:active { background-color: #f1f5f9; }
  .am-apple-btn { background-color: #000; color: #fff; border: none; }
  .am-apple-btn:active { background-color: #333; }
  .am-divider { display: flex; align-items: center; text-align: center; margin: 16px 0; color: #94a3b8; font-size: 12px; }
  .am-divider::before, .am-divider::after { content: ''; flex: 1; border-bottom: 1px solid #e2e8f0; }
  .am-divider::before { margin-right: 10px; } .am-divider::after { margin-left: 10px; }
  .am-input { width: 100%; border: 1px solid #e2e8f0; border-radius: 13px; padding: 12px 16px; font-size: 13px; color: #0f172a; box-shadow: 0 1px 2px rgba(15,23,42,0.04); box-sizing: border-box; margin-bottom: 10px; }
`;

export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useUser();
  const { startSSOFlow } = useSSO(); 
  
  const particleHostRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  
  const [email, setEmail] = useState('');

  const hasCachedUser = (() => {
    try { return !!localStorage.getItem('taskflow_current_user') || !!localStorage.getItem('taskflow_tasks_list'); } catch { return false; }
  })();

  useEffect(() => {
    const goOnline = () => { setIsOffline(false); if (!isLoaded && hasCachedUser) window.location.reload(); };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [isLoaded, hasCachedUser]);

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

  const handleGoogleLogin = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: CLERK_REDIRECT_URL,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google OAuth error', err);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: 'oauth_apple',
        redirectUrl: CLERK_REDIRECT_URL,
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Apple OAuth error', err);
    }
  };

  const handleEmailLogin = async () => {
    if (!email) return alert("Please enter an email");
    alert("Email login requires additional setup. Please use Google/Apple for now.");
  };

  if (hasCachedUser && (!isLoaded || isOffline)) return <>{children}</>;

  if (!isLoaded) {
    if (isOffline) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4"><span className="text-2xl">📡</span></div>
        <h2 className="text-white font-bold text-lg mb-2">You are offline</h2>
        <p className="text-slate-400 text-sm max-w-xs">Please connect to the internet to load the app for the first time.</p>
      </div>
    );
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;
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
                  <button className="am-google-btn" onClick={handleGoogleLogin}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>

                  <button className="am-apple-btn" onClick={handleAppleLogin}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702"/></svg>
                    Continue with Apple
                  </button>

                  <div className="am-divider">or</div>

                  <input 
                    type="email" 
                    className="am-input" 
                    placeholder="Enter your email address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <button className="am-email-btn" onClick={handleEmailLogin}>
                    Send Code
                  </button>
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