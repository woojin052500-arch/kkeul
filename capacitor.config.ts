import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wjedulab.kkeul',
  appName: '끌',
  webDir: 'dist',
  server: {
    hostname: 'highschool-score.com',
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#4F46E5'
    },
    Keyboard: {
      resize: 'none'
    }
  }
};

export default config;
