import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wjedulab.kkeul',
  appName: '끌',
  webDir: 'dist',
  server: {
    // 앱 안에서만 쓰는 내부 주소(저장소 출처). 바꾸면 앱 사용자의 저장된 로그인·데이터가 사라지므로
    // 실제 웹 주소(kkeul.telosix.co.kr)로 바뀌어도 그대로 둔다.
    hostname: 'kkeul.vercel.app',
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
