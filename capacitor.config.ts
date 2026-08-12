import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chaveirorapido.app',
  appName: 'Chaveiro Rápido',
  webDir: 'www',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  plugins: {
    NativeBiometric: {},
  },
};

export default config;
