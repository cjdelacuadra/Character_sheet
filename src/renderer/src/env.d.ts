/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

interface Window {
  characterStore: {
    saveCharacter: (id: string, data: unknown) => Promise<{ ok: boolean }>
    loadCharacter: (id: string) => Promise<unknown>
    listCharacters: () => Promise<string[]>
    deleteCharacter: (id: string) => Promise<{ ok: boolean }>
  }
  appLogger?: {
    logError: (source: string, message: string) => Promise<void>
  }
  equipmentStore: {
    readFile:   (filename: string) => Promise<string | null>
    writeFile:  (filename: string, content: string) => Promise<{ ok: true }>
    fileExists: (filename: string) => Promise<boolean>
  }
}
