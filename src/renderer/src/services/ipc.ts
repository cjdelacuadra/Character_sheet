import type { Character } from '@/entities/character/types'

// Thin wrapper around the Electron IPC bridge exposed via preload.
// All store modules import from here — never from window.characterStore directly.

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
}
