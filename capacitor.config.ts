import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskpriority.app',
  appName: 'Task Priority',
  webDir: 'dist',
  server: {
    url: 'https://app-to-do-list-beta.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: ['app-to-do-list-beta.vercel.app'],
  },
};

export default config;