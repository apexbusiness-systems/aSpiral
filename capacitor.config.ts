import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.4035fec3baf74e84a1437c695f1090e2',
  appName: 'aspiral-ai',
  webDir: 'dist',
  server: {
    url: 'https://4035fec3-baf7-4e84-a143-7c695f1090e2.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
