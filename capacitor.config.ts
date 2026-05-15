import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amanah.app',
  appName: 'Umaroh Business Platform',
  webDir: 'dist',
  server: {
    url: 'https://umaroh-business-platform.vercel.app/',
    allowNavigation: ['*'],
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '946501391782-6jl5dp7mng28813tkpuc5airaqtadrs2.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
