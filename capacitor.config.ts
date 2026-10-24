import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'jp.ak2302.departurereminder',
  appName: '出発リマインダー',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      androidClientId: '370884137570-jpp7h7e0nvnaad7kbdirbvdab4sn8ds7.apps.googleusercontent.com',
      serverClientId: '370884137570-jqbd0pusldc2lbi852h9rvlb8l6gdqd7.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/calendar.events.readonly'],
      forceCodeForRefreshToken: true,
    },
  },
}

export default config
