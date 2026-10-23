import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.necopart.storage',
  appName: 'N.ECO PART STORAGE',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false
    },
    CapacitorUpdater: {
      autoUpdate: false,
      resetWhenUpdate: false
    }
  }
}

export default config
