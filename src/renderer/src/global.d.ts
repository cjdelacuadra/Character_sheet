/**
 * Typed contract for the IPC bridges exposed by electron/preload/index.ts.
 * On iOS (Capacitor) these are absent — services/storageAdapter falls back to
 * the filesystem plugin — hence every bridge is optional.
 */
export {}

declare global {
  interface Window {
    characterStore?: {
      saveCharacter: (id: string, data: unknown) => Promise<void>
      loadCharacter: (id: string) => Promise<unknown | null>
      listCharacters: () => Promise<string[]>
      deleteCharacter: (id: string) => Promise<void>
    }
    appLogger?: {
      logError: (source: string, message: string) => Promise<void>
    }
    equipmentStore?: {
      readFile: (filename: string) => Promise<string | null>
      writeFile: (filename: string, content: string) => Promise<void>
      fileExists: (filename: string) => Promise<boolean>
    }
    assetStore?: {
      listFiles: (folderPath: string) => Promise<string[]>
    }
  }
}
