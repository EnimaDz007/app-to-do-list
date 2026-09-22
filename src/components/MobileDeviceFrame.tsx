import React, { useState, useEffect } from 'react';
import { Wifi, Battery } from 'lucide-react';
import { DeviceFrameMode } from '../types';

interface MobileDeviceFrameProps {
  deviceMode: DeviceFrameMode;
  children: React.ReactNode;
}

export const MobileDeviceFrame: React.FC<MobileDeviceFrameProps> = ({ deviceMode, children }) => {
  const [time, setTime] = useState('9:41');
  const [isRealMobile, setIsRealMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // If user is on an actual mobile device or screen is narrow, adapt gracefully
      const isMobileScreen = window.innerWidth < 640 || window.matchMedia('(display-mode: standalone)').matches;
      setIsRealMobile(isMobileScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // When in responsive mode or on actual mobile device, fill the screen natively
  if (deviceMode === 'responsive' || isRealMobile) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
        {children}
      </div>
    );
  }

  const isIPhone = deviceMode === 'iphone';

  return (
    <div
      id="device-simulator-outer"
      className="min-h-screen bg-slate-200/80 dark:bg-slate-950 flex flex-col items-center justify-start p-3 sm:p-6 md:p-8 transition-colors duration-200"
    >
      {/* Device Shell (iPhone 16 Pro or Google Pixel 9) */}
      <div
        id="device-frame"
        className={`relative w-full max-w-[420px] rounded-[50px] border-[10px] sm:border-[12px] shadow-2xl transition-all overflow-hidden flex flex-col ${
          isIPhone
            ? 'border-slate-800/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-400/30 dark:ring-slate-700/50 shadow-slate-400/30 dark:shadow-indigo-950/40'
            : 'border-zinc-800/90 dark:border-zinc-800 bg-slate-50 dark:bg-slate-900 ring-1 ring-zinc-400/30 dark:ring-zinc-700/50 shadow-slate-400/30 dark:shadow-emerald-950/30'
        }`}
        style={{ minHeight: '840px', height: '90vh' }}
      >
        {/* Device Status Bar */}
        <div
          id="device-status-bar"
          className="shrink-0 h-11 px-6 flex items-center justify-between bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-medium z-30 select-none border-b border-slate-200 dark:border-slate-800/40 transition-colors"
        >
          {/* Time */}
          <span className="font-semibold text-xs tracking-tight">{time}</span>

          {/* Center: Dynamic Island (iPhone) or Hole Punch (Android) */}
          {isIPhone ? (
            <div
              id="dynamic-island"
              className="w-24 h-6 rounded-full bg-black flex items-center justify-between px-2 text-[10px] shadow-inner text-slate-400"
            >
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-950 border border-indigo-500/40" />
            </div>
          ) : (
            <div
              id="android-camera-hole"
              className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-700 shadow-inner"
            />
          )}

          {/* Right Status Icons */}
          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            {/* Cellular signal bars */}
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-1.5 bg-current rounded-xs" />
              <span className="w-0.5 h-2 bg-current rounded-xs" />
              <span className="w-0.5 h-2.5 bg-current rounded-xs" />
              <span className="w-0.5 h-3 bg-current rounded-xs" />
            </div>
            <Wifi className="w-3.5 h-3.5" />
            <div className="flex items-center gap-0.5">
              <Battery className="w-4 h-4 fill-current" />
            </div>
          </div>
        </div>

        {/* Device Screen Body */}
        <div className="flex-1 overflow-y-auto flex flex-col relative bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
          {children}
        </div>

        {/* iOS Home Indicator Bar */}
        {isIPhone && (
          <div className="shrink-0 h-5 bg-slate-100 dark:bg-slate-900 flex items-center justify-center pointer-events-none pb-1 transition-colors">
            <div className="w-32 h-1 bg-slate-400 dark:bg-slate-500/60 rounded-full" />
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-xs text-slate-600 dark:text-slate-400">
        Simulating <span className="font-semibold text-slate-800 dark:text-slate-300">{isIPhone ? 'iPhone 16 Pro (iOS)' : 'Google Pixel 9 (Android)'}</span> • Click <span className="text-indigo-600 dark:text-indigo-400 font-medium">Full</span> in the header to expand edge-to-edge
      </div>
    </div>
  );
};
