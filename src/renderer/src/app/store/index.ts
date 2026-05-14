import { create } from 'zustand'
import { createCharacterSlice } from './characterSlice'
import type { CharacterSlice } from './characterSlice'

export type AppState = CharacterSlice

export const useAppStore = create<AppState>()((...args) => ({
  ...createCharacterSlice(...args),
}))
