export type SummonType = 'creature' | 'spectral' | 'undead' | 'spirit' | 'celestial' | 'homebrew' | 'structure' | 'object' | 'construct' | 'monstrosity' | 'fey' | 'aberration' | "elemental"  | "beast"  | "void" | "dragon" | 'other'

export interface SummonAttack {
  id: string
  name: string          // "Claw", "Force Ballista"
  toHit: string         // free text ("+4", "spell atk")
  damage: string        // "1d6+2"
  damageType?: string   // "piercing", "force"
  notes?: string        // "reach 10ft", "DC 15 Dex"
}

/** Slots available per the summon's own turn. */
export interface ActionEconomy {
  actions: number        // default 1
  bonusActions: number   // default 1
  reactions: number      // default 1
}

/** Catalog entry — CRUD-able template, shared across characters. */
export interface SummonTemplate {
  id: string             // crypto.randomUUID() (custom) or stable slug (built-in)
  name: string
  type: SummonType
  source?: "builtin" | "custom" | "spell" | "class-feature" | "infusion" | "homebrew" | "celestial" | "conjured" | "other"
  maxHp: number
  maxHpFormula?: string  // display-only, not auto-evaluated
  ac: number
  speed: string          // free text "30 ft", "fly 60 ft"
  initiativeMod: number
  attacks: SummonAttack[]
  actionEconomy: ActionEconomy
  spells?: string[]      // free-text spell names/notes
  resources?: { name: string; total: number }[]
  defaultNotes?: string
}

/** Locked snapshot of a template, taken when a summon is created. */
export interface SummonBase {
  name: string
  type: SummonType
  maxHp: number
  ac: number
  speed: string
  initiativeMod: number
  attacks: SummonAttack[]
  actionEconomy: ActionEconomy
  spells?: string[]
  resources?: { name: string; total: number }[]
}

/** Live instance owned by a character. `base` is locked; only runtime state changes. */
export interface ActiveSummon {
  id: string             // crypto.randomUUID() per instance
  templateId: string
  label: string          // auto "Skeleton #2", user-editable
  createdAt: string
  sourceSpellId?: string
  concentration?: boolean

  base: SummonBase       // LOCKED snapshot — never edited post-summon

  // MUTABLE runtime — the only writable surface
  hp: { current: number; max: number; temp: number }
  conditionIds: { conditionId: string }[]
  economyUsed: { actions: number; bonusActions: number; reactions: number }
  resourcesUsed: Record<string, number>
  initiativeRoll: number | null
  notes: string
}

/** The subset of an ActiveSummon that may be patched after summoning. */
export type ActiveSummonRuntime = Pick<ActiveSummon,
  'label' | 'hp' | 'conditionIds' | 'economyUsed' | 'resourcesUsed' | 'initiativeRoll' | 'notes'>
