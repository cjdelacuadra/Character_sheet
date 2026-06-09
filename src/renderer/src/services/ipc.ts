import { getStorageAdapter } from './storageAdapter'
import type { Character } from '@/entities/character/types'

const CUSTOM_ITEMS_KEY = '__customItems__'

export const ipcService = {
  save: (id: string, character: Character): void => {
    getStorageAdapter().saveCharacter(id, character)
  },

  load: (id: string): Promise<Character | null> => {
    return getStorageAdapter().loadCharacter(id) as Promise<Character | null>
  },

  list: (): Promise<string[]> => {
    return getStorageAdapter().listCharacters()
  },

  delete: (id: string): void => {
    getStorageAdapter().deleteCharacter(id)
  },

  saveCustomItems: (items: Record<string, unknown>): void => {
    getStorageAdapter().saveCharacter(CUSTOM_ITEMS_KEY, items)
  },

  loadCustomItems: (): Promise<Record<string, unknown> | null> => {
    return getStorageAdapter().loadCharacter(CUSTOM_ITEMS_KEY) as Promise<Record<string, unknown> | null>
  },
}

export const equipmentIpc = {
  readFile: (filename: string): Promise<string | null> =>
    getStorageAdapter().readFile(filename),

  writeFile: (filename: string, content: string): Promise<{ ok: true }> =>
    getStorageAdapter().writeFile(filename, content).then(() => ({ ok: true as const })),

  fileExists: (filename: string): Promise<boolean> =>
    getStorageAdapter().fileExists(filename),
}
