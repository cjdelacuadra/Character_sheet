import { create } from 'zustand'
import { createCharacterSlice } from './characterSlice'
import type { CharacterSlice } from './characterSlice'
import { createTurnSlice } from './turnSlice'
import type { TurnSlice } from './turnSlice'

export type AppState = CharacterSlice & TurnSlice

export const useAppStore = create<AppState>()((...args) => ({
  ...createCharacterSlice(...args),
  ...createTurnSlice(...args),
}))
