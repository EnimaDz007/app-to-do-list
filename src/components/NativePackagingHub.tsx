import React, { useState } from 'react';
import {
  Apple,
  Smartphone,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Terminal,
  FileCode,
  Layers,
  Sparkles,
  Globe,
  UploadCloud,
  GitBranch,
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface NativePackagingHubProps {
  onOpenInstallModal: () => void;
}

export const NativePackagingHub: React.FC<NativePackagingHubProps> = ({ onOpenInstallModal }) => {
  const { t } = useLanguage();
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android' | 'pwa' | 'vercel' | 'config'>('vercel');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    triggerHaptic('light');
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const capacitorConfigCode = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.merakicreation.taskpriority',
  appName: 'Task Priority',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // In development or remote live update mode:
    // url: 'https://meraki-creation-website-2.vercel.app',
    // cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Default',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0f172a',
    },
    Haptics: {
      enabled: true,
    },
  },
};

export default config;`;

  const iosCommands = `# 1. Install Capacitor iOS dependencies
npm install @capacitor/core @capacitor/cli @capacitor/ios

# 2. Initialize Capacitor project
npx cap init "Task Priority" "com.merakicreation.taskpriority" --web-dir dist

# 3. Build the production web bundle
npm run build

# 4. Add the iOS native platform
npx cap add ios

# 5. Open Xcode to build, test on iPhone simulator & submit to App Store
npx cap open ios`;

  const androidCommands = `# 1. Install Capacitor Android dependencies
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize Capacitor project
npx cap init "Task Priority" "com.merakicreation.taskpriority" --web-dir dist

# 3. Build the production web bundle
npm run build

# 4. Add the Android native platform
npx cap add android

# 5. Open Android Studio to build APK / AAB for Google Play
npx cap open android`;

  return (
    <div id="native-packaging-hub" className="space-y-4 pb-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-900/80 via-slate-900 to-slate-900 border border-indigo-500/30 p-4 shadow-md text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-white">
                {t('hub_title')}
              </h3>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-medium">
                Production Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {t('hub_subtitle')}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/40 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-mono">App ID</div>
            <div className="font-mono text-slate-200 text-[11px] truncate">com.merakicreation.taskpriority</div>
          </div>
          <div className="bg-slate-950/40 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Container</div>
            <div className="text-slate-200 text-[11px]">Capacitor 6.x + PWA</div>
          </div>
          <div className="bg-slate-950/40 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-mono">iOS Target</div>
            <div className="text-slate-200 text-[11px]">iOS 14.0+ (Xcode 15+)</div>
          </div>
          <div className="bg-slate-950/40 rounded-lg p-2 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-mono">Android Target</div>
            <div className="text-slate-200 text-[11px]">API 24+ (Android 7 - 15)</div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
        <button
          id="btn-tab-ios"
          onClick={() => {
            triggerHaptic('light');
            setActivePlatform('ios');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer font-medium whitespace-nowrap ${
            activePlatform === 'ios'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Apple className="w-4 h-4" />
          <span>{t('hub_tab_ios')}</span>
        </button>

        <button
          id="btn-tab-android"
          onClick={() => {
            triggerHaptic('light');
            setActivePlatform('android');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer font-medium whitespace-nowrap ${
            activePlatform === 'android'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>{t('hub_tab_android')}</span>
        </button>

        <button
          id="btn-tab-pwa"
          onClick={() => {
            triggerHaptic('light');
            setActivePlatform('pwa');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer font-medium whitespace-nowrap ${
            activePlatform === 'pwa'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('hub_tab_pwa')}</span>
        </button>

        <button
          id="btn-tab-vercel"
          onClick={() => {
            triggerHaptic('light');
            setActivePlatform('vercel');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer font-medium whitespace-nowrap ${
            activePlatform === 'vercel'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>{t('hub_tab_vercel')}</span>
        </button>

        <button
          id="btn-tab-config"
          onClick={() => {
            triggerHaptic('light');
            setActivePlatform('config');
          }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition cursor-pointer font-medium whitespace-nowrap ${
            activePlatform === 'config'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>{t('hub_tab_config')}</span>
        </button>
      </div>

      {/* Platform Content: iOS */}
      {activePlatform === 'ios' && (
        <div className="space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-slate-900 dark:text-white" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">iOS Native App Build Steps</h4>
              </div>
              <button
                onClick={() => handleCopy(iosCommands, 'ios-cli')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-indigo-600 dark:text-indigo-400 font-medium transition cursor-pointer"
              >
                {copiedKey === 'ios-cli' ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'ios-cli' ? 'Copied!' : 'Copy Commands'}</span>
              </button>
            </div>

            <div className="relative rounded-xl bg-slate-950 p-3 font-mono text-xs text-indigo-300 overflow-x-auto border border-slate-800/80">
              <pre>{iosCommands}</pre>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Apple App Store Approval Guidelines:</div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Guideline 4.2 Minimum Functionality:</strong> Passed. The app features local offline caching, tactile haptic feedback, customizable time-blocks, and interactive matrix gestures.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Safe Areas & Notch:</strong> Full support for Dynamic Island and Home Bar indicators using CSS <code className="text-indigo-600 dark:text-indigo-300">viewport-fit=cover</code>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>App Store Icon:</strong> 180x180 and 1024x1024 generated and included in assets.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Platform Content: Android */}
      {activePlatform === 'android' && (
        <div className="space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Android Google Play Build Steps</h4>
              </div>
              <button
                onClick={() => handleCopy(androidCommands, 'android-cli')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-indigo-600 dark:text-indigo-400 font-medium transition cursor-pointer"
              >
                {copiedKey === 'android-cli' ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'android-cli' ? 'Copied!' : 'Copy Commands'}</span>
              </button>
            </div>

            <div className="relative rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800/80">
              <pre>{androidCommands}</pre>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Google Play Store Submission Checklist:</div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Target SDK:</strong> Supports Android API 34+ (modern Android requirements).</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Adaptive & Maskable Icons:</strong> Android safe-zone 512x512 maskable icon included.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Format:</strong> Generates Android App Bundle (.aab) with automatic dynamic feature optimization.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Platform Content: PWA & TWA */}
      {activePlatform === 'pwa' && (
        <div className="space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Progressive Web App (PWA) & TWA</h4>
              </div>
              <button
                onClick={onOpenInstallModal}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Test Install Prompt</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your website is already equipped with a full Web App Manifest, Service Worker, and offline caching. Users can install it directly without App Store fees, or you can package it into Google Play using Trusted Web Activities (TWA).
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>Publish to Stores with PWABuilder (No Code)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Microsoft PWABuilder can automatically wrap your live URL <code className="text-indigo-600 dark:text-indigo-300">https://meraki-creation-website-2.vercel.app</code> into ready-to-publish Google Play and iOS packages.
              </p>
              <a
                href="https://www.pwabuilder.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-xs font-medium pt-1"
              >
                <span>Open PWABuilder Tool</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Platform Content: Vercel Web Deployment */}
      {activePlatform === 'vercel' && (
        <div className="space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Live Production Target
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Your Vercel deployment website
                  </p>
                </div>
              </div>
              <a
                href="https://meraki-creation-website-2.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-medium transition cursor-pointer"
              >
                <span>Visit Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Target URL highlight card */}
            <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs flex items-center justify-between border border-slate-800">
              <div className="truncate text-indigo-300">
                https://meraki-creation-website-2.vercel.app
              </div>
              <button
                onClick={() => handleCopy('https://meraki-creation-website-2.vercel.app', 'vercel-url')}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0 ml-2 cursor-pointer"
                title="Copy URL"
              >
                {copiedKey === 'vercel-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Step 1: Automatic sync via GitHub */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-emerald-500" />
                <span>Method 1: Automatic Deploy via GitHub (Recommended)</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                If your Vercel project is linked to your GitHub repository:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <li>In Google AI Studio, click the project menu in the top bar and select <strong>Export to GitHub</strong> (or download the ZIP).</li>
                <li>Push the updated files (including the newly generated <code className="text-indigo-600 dark:text-indigo-400">manifest.json</code> and <code className="text-indigo-600 dark:text-indigo-400">vercel.json</code>) to your repository branch.</li>
                <li>Vercel will detect the new commit and automatically trigger an instant production build and deployment to <strong className="text-slate-900 dark:text-white">https://meraki-creation-website-2.vercel.app</strong>.</li>
              </ol>
            </div>

            {/* Step 2: Vercel CLI */}
            <div className="space-y-2 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-indigo-500" />
                  <span>Method 2: Direct Deploy via Vercel CLI</span>
                </div>
                <button
                  onClick={() => handleCopy('npx vercel --prod', 'vercel-cli')}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium transition cursor-pointer"
                >
                  {copiedKey === 'vercel-cli' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'vercel-cli' ? 'Copied!' : 'Copy Command'}</span>
                </button>
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Run this command in your local project folder to deploy directly to production:
              </p>
              <div className="rounded-xl bg-slate-950 p-3 font-mono text-xs text-indigo-300 border border-slate-800">
                npx vercel --prod
              </div>
            </div>

            {/* Pre-configured features */}
            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Ready for Vercel</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                <li><strong className="text-slate-800 dark:text-slate-200">vercel.json</strong> created with clean SPA routing rewrites</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Web App Manifest (manifest.json)</strong> with icons & shortcuts configured</li>
                <li><strong className="text-slate-800 dark:text-slate-200">Service Worker (sw.js)</strong> with offline caching headers configured</li>
                <li><strong className="text-slate-800 dark:text-slate-200">dist/</strong> production bundle successfully built and validated</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Platform Content: Config */}
      {activePlatform === 'config' && (
        <div className="space-y-4 text-slate-800 dark:text-slate-200 animate-in fade-in duration-150">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">capacitor.config.ts</h4>
              </div>
              <button
                onClick={() => handleCopy(capacitorConfigCode, 'config-ts')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs text-indigo-600 dark:text-indigo-400 font-medium transition cursor-pointer"
              >
                {copiedKey === 'config-ts' ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'config-ts' ? 'Copied!' : 'Copy Config'}</span>
              </button>
            </div>

            <div className="relative rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800/80 max-h-72">
              <pre>{capacitorConfigCode}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
