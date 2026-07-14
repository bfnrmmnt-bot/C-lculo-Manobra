import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calculadoramanobra.app',
  appName: 'Calculadora Manobra',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
