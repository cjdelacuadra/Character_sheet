import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cjdelacuadra.charactersheet',
  appName: 'DnD Character Companion',
  webDir: 'out/renderer',
  ios: {
    contentInset: 'automatic',
  },
}

export default config
