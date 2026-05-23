import type { Character } from '@/entities/character/types'

// Thin wrapper around the Electron IPC bridge exposed via preload.
// All store modules import from here — never from window.characterStore directly.

const CUSTOM_ITEMS_KEY = '__customItems__'

export const ipcService = {
  save: (id: string, character: Character): void => {
    window.characterStore.saveCharacter(id, character)
  },

  load: (id: string): Promise<Character | null> => {
    return window.characterStore.loadCharacter(id) as Promise<Character | null>
  },

  list: (): Promise<string[]> => {
    return window.characterStore.listCharacters()
  },

  delete: (id: string): void => {
    window.characterStore.deleteCharacter(id)
  },

  saveCustomItems: (items: Record<string, unknown>): void => {
    window.characterStore.saveCharacter(CUSTOM_ITEMS_KEY, items)
  },

  loadCustomItems: (): Promise<Record<string, unknown> | null> => {
    return window.characterStore.loadCharacter(CUSTOM_ITEMS_KEY) as Promise<Record<string, unknown> | null>
  },
}

export const equipmentIpc = {
  readFile:   (filename: string): Promise<string | null> =>
    window.equipmentStore.readFile(filename),
  writeFile:  (filename: string, content: string): Promise<{ ok: true }> =>
    window.equipmentStore.writeFile(filename, content),
  fileExists: (filename: string): Promise<boolean> =>
    window.equipmentStore.fileExists(filename),
}
