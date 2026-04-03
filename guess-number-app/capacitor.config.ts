import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.flamebots.guessnumber',
  appName: 'guessnumber',
  webDir: 'dist/guess-number-app/browser',
  server: {
    url: 'https://guessnumber.flamebots.org',
    cleartext: false
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '579215986794-raiafh5g06p6tq07l9rn2nbpio42q6ob.apps.googleusercontent.com',
      forceCodeForRefreshToken: false
    }
  }
};

export default config;
