import { create } from 'zustand'
import type { Character } from '@/entities/character/types'

interface AppState {
  activeCharacterId: string | null
  characters: Record<string, Character>
  loaded: boolean
  setActiveCharacter: (id: string) => void
  exitCharacter: () => void
  addCharacter: (character: Character) => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  loadFromDisk: () => Promise<void>
}

const ipc = window.characterStore

export const useAppStore = create<AppState>((set, get) => ({
  activeCharacterId: null,
  characters: {},
  loaded: false,

  setActiveCharacter: (id) => set({ activeCharacterId: id }),

  exitCharacter: () => set({ activeCharacterId: null }),

  addCharacter: (character) => {
    set((state) => ({
      characters: { ...state.characters, [character.id]: character }
    }))
    ipc.saveCharacter(character.id, character)
  },

  updateCharacter: (id, patch) => {
    set((state) => {
      const updated = { ...state.characters[id], ...patch }
      ipc.saveCharacter(id, updated)
      return { characters: { ...state.characters, [id]: updated } }
    })
  },

  deleteCharacter: (id) => {
    ipc.deleteCharacter(id)
    set((state) => {
      const { [id]: _, ...rest } = state.characters
      return {
        characters: rest,
        activeCharacterId: state.activeCharacterId === id ? null : state.activeCharacterId
      }
    })
  },

  loadFromDisk: async () => {
    if (get().loaded) return
    try {
      const ids = await ipc.listCharacters()
      const entries = await Promise.all(
        ids.map(async (id) => {
          const data = await ipc.loadCharacter(id)
          return [id, data] as const
        })
      )
      const characters = Object.fromEntries(entries.filter(([, v]) => v != null)) as Record<string, Character>
      set({ characters, loaded: true })
    } catch {
      set({ loaded: true })
    }
  }
}))
