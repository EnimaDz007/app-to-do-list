import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.taskpriority.app',
  appName: 'Task Priority',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    App: {
      urlScheme: 'native',
    },
  },
};

export default config;