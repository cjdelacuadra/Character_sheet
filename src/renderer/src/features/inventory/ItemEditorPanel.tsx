import { useState, useEffect } from 'react'
import type { GearEquipmentItem, AccessoryStats, ShopItemKind, WeaponEquipmentItem } from '@/shared/data/equipment/types'
import type { AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { getShopItemById } from '@/shared/data/equipment/catalogue'
import { GEAR_BY_ID, isArmorKind } from '@/shared/data/equipment/gear'
import { WEAPON_BY_ID } from '@/shared/data/equipment/weapons'
import { saveWeaponDef, saveGearDef, deleteWeaponDef, deleteGearDef } from '@/shared/data/equipment/equipmentLoader'
import { useAppStore } from '@/app/store'
import styles from './ItemEditorPanel.module.css'

// ── Stat encoding ────────────────────────────────────────────────────────────

interface StatRow { key: string; value: number }

const STAT_OPTIONS: { key: string; label: string; adv: boolean; complex?: boolean }[] = [
  { key: 'toHitBonus',       label: 'To-Hit Bonus',      adv: false, complex: true },
  { key: 'speedBonus',       label: 'Speed Bonus',       adv: false },
  { key: 'bonusDamage',      label: 'Bonus Damage',      adv: false, complex: true },
  { key: 'critMod',          label: 'Crit Range',        adv: false, complex: true },
  { key: 'critDamage',       label: 'Crit Damage',       adv: false, complex: true },
  { key: 'abset_str',        label: 'Set STR (floor)',   adv: false },
  { key: 'abset_dex',        label: 'Set DEX (floor)',   adv: false },
  { key: 'abset_con',        label: 'Set CON (floor)',   adv: false },
  { key: 'abset_int',        label: 'Set INT (floor)',   adv: false },
  { key: 'abset_wis',        label: 'Set WIS (floor)',   adv: false },
  { key: 'abset_cha',        label: 'Set CHA (floor)',   adv: false },
  { key: 'ab_str',           label: 'STR Bonus',         adv: false },
  { key: 'ab_dex',           label: 'DEX Bonus',         adv: false },
  { key: 'ab_con',           label: 'CON Bonus',         adv: false },
  { key: 'ab_int',           label: 'INT Bonus',         adv: false },
  { key: 'ab_wis',           label: 'WIS Bonus',         adv: false },
  { key: 'ab_cha',           label: 'CHA Bonus',         adv: false },
  { key: 'str_save',         label: 'STR Save',          adv: false },
  { key: 'dex_save',         label: 'DEX Save',          adv: false },
  { key: 'con_save',         label: 'CON Save',          adv: false },
  { key: 'int_save',         label: 'INT Save',          adv: false },
  { key: 'wis_save',         label: 'WIS Save',          adv: false },
  { key: 'cha_save',         label: 'CHA Save',          adv: false },
  { key: 'athletics',        label: 'Athletics',         adv: false },
  { key: 'acrobatics',       label: 'Acrobatics',        adv: false },
  { key: 'stealth',          label: 'Stealth',           adv: false },
  { key: 'perception',       label: 'Perception',        adv: false },
  { key: 'arcana',           label: 'Arcana',            adv: false },
  { key: 'sleightOfHand',    label: 'Sleight of Hand',   adv: false },
  { key: 'persuasion',       label: 'Persuasion',        adv: false },
  { key: 'history',          label: 'History',           adv: false },
  { key: 'insight',          label: 'Insight',           adv: false },
  { key: 'intimidation',     label: 'Intimidation',      adv: false },
  { key: 'investigation',    label: 'Investigation',     adv: false },
  { key: 'medicine',         label: 'Medicine',          adv: false },
  { key: 'nature',           label: 'Nature',            adv: false },
  { key: 'religion',         label: 'Religion',          adv: false },
  { key: 'animalHandling',   label: 'Animal Handling',   adv: false },
  { key: 'deception',        label: 'Deception',         adv: false },
  { key: 'performance',      label: 'Performance',       adv: false },
  { key: 'survival',         label: 'Survival',          adv: false },
  { key: 'adv:str_save',     label: 'Adv STR Save',      adv: true  },
  { key: 'adv:dex_save',     label: 'Adv DEX Save',      adv: true  },
  { key: 'adv:con_save',     label: 'Adv CON Save',      adv: true  },
  { key: 'adv:int_save',     label: 'Adv INT Save',      adv: true  },
  { key: 'adv:wis_save',     label: 'Adv WIS Save',      adv: true  },
  { key: 'adv:cha_save',     label: 'Adv CHA Save',      adv: true  },
  { key: 'adv:perception',   label: 'Adv Perception',    adv: true  },
  { key: 'adv:stealth',      label: 'Adv Stealth',       adv: true  },
  { key: 'adv:athletics',    label: 'Adv Athletics',     adv: true  },
  { key: 'adv:death',        label: 'Adv Death Saves',   adv: true  },
]

function labelOf(key: string): string {
  return STAT_OPTIONS.find(o => o.key === key)?.label ?? key
}

function statsToRows(stats: AccessoryStats | undefined): StatRow[] {
  if (!stats) return []
  const rows: StatRow[] = []
  if (stats.toHitBonus || stats.toHitDice) rows.push({ key: 'toHitBonus', value: 0 })
  if (stats.speedBonus) rows.push({ key: 'speedBonus', value: stats.speedBonus })
  for (const [ab, v] of Object.entries(stats.abilityBonus ?? {}))
    if (v) rows.push({ key: `ab_${ab}`, value: v })
  for (const [ab, v] of Object.entries(stats.abilitySet ?? {}))
    if (v) rows.push({ key: `abset_${ab}`, value: v })
  if (stats.bonusDamage) rows.push({ key: 'bonusDamage', value: 0 })
  if (stats.critModifier) rows.push({ key: 'critMod', value: Object.values(stats.critModifier)[0] ?? 0 })
  if (stats.critBonusDamage) rows.push({ key: 'critDamage', value: 0 })
  for (const [ab, v] of Object.entries(stats.savingThrowBonus ?? {}))
    if (v) rows.push({ key: `${ab}_save`, value: v })
  for (const [sk, v] of Object.entries(stats.skillBonus ?? {}))
    if (v) rows.push({ key: sk, value: v })
  for (const ab of stats.advantage?.savingThrows ?? [])
    rows.push({ key: `adv:${ab}_save`, value: 1 })
  for (const sk of stats.advantage?.skills ?? [])
    rows.push({ key: `adv:${sk}`, value: 1 })
  if (stats.advantage?.deathSaves) rows.push({ key: 'adv:death', value: 1 })
  return rows
}

function rowsToStats(rows: StatRow[]): AccessoryStats {
  const s: AccessoryStats = {}
  for (const row of rows) {
    if (row.key === 'toHitBonus') {
      // Complex row — dice/flat/applies merged by the caller.
    } else if (row.key === 'speedBonus') {
      s.speedBonus = row.value
    } else if (row.key.startsWith('abset_')) {
      const ab = row.key.slice(6) as AbilityScore
      s.abilitySet = { ...s.abilitySet, [ab]: row.value }
    } else if (row.key.startsWith('ab_')) {
      const ab = row.key.slice(3) as AbilityScore
      s.abilityBonus = { ...s.abilityBonus, [ab]: row.value }
    } else if (row.key === 'bonusDamage' || row.key === 'critMod' || row.key === 'critDamage') {
      // Complex stats carry no simple value; their fields are merged in the caller.
    } else if (row.key === 'adv:death') {
      s.advantage = { ...s.advantage, deathSaves: true }
    } else if (row.key.startsWith('adv:')) {
      const rest = row.key.slice(4)
      if (rest.endsWith('_save')) {
        const ab = rest.slice(0, -5) as AbilityScore
        s.advantage = { ...s.advantage, savingThrows: [...(s.advantage?.savingThrows ?? []), ab] }
      } else {
        s.advantage = { ...s.advantage, skills: [...(s.advantage?.skills ?? []), rest as Skill] }
      }
    } else if (row.key.endsWith('_save')) {
      const ab = row.key.slice(0, -5) as AbilityScore
      s.savingThrowBonus = { ...s.savingThrowBonus, [ab]: row.value }
    } else {
      s.skillBonus = { ...s.skillBonus, [row.key]: row.value }
    }
  }
  return s
}

// ── Weapon helpers ────────────────────────────────────────────────────────────

const DIE_SIDES = ['4', '6', '8', '10', '12', '20'] as const

const DAMAGE_TYPES = [
  'slashing', 'piercing', 'bludgeoning',
  'fire', 'cold', 'lightning', 'thunder',
  'acid', 'poison', 'necrotic', 'radiant', 'psychic', 'force',
] as const

function parseDie(die: string): { count: number; sides: string } {
  const m = die.match(/^(\d+)d(\d+)$/)
  return m ? { count: Number(m[1]), sides: m[2] } : { count: 1, sides: '8' }
}

function enchantToRarity(bonus: number): string {
  if (bonus <= 0) return 'common'
  if (bonus === 1) return 'uncommon'
  if (bonus === 2) return 'rare'
  if (bonus === 3) return 'very rare'
  if (bonus === 4) return 'legendary'
  return 'legendary'
}

// ── Sprite helper ────────────────────────────────────────────────────────────

const SPRITE_PREFIX = '/assets/'
const SPRITE_FOLDERS = [
  // Weapons (including subfolders)
  // todo: update
  'weapons/', 'weapons/swords/', 'weapons/axes/', 'weapons/clubs/',
  'weapons/throwables/', 'weapons/wands and rods/',
  // Armor and accessories
  'armors/', 'helmets/', 'shields/', 'boots/', 'legs/',
  'rings/', 'amulets/', 'none/', 'arrows/', 'backpacks/'
]

function spriteDir(kind: string): string {
  if (kind === 'weapon') return `${SPRITE_PREFIX}weapons/`
  if (kind === 'helmet') return `${SPRITE_PREFIX}helmets/`
  if (kind === 'shield') return `${SPRITE_PREFIX}shields/`
  if (kind === 'boots') return `${SPRITE_PREFIX}boots/`
  if (kind === 'legs') return `${SPRITE_PREFIX}legs/`
  if (kind === 'armor') return `${SPRITE_PREFIX}armors/`
  if (kind === 'ring') return `${SPRITE_PREFIX}rings/`
  if (kind === 'amulet') return `${SPRITE_PREFIX}amulets/`
  return `${SPRITE_PREFIX}none/`
}

/** Splits an existing sprite URL into a folder (relative to the sprites root) and filename. */
function parseSprite(sprite: string | undefined, kind: string, name: string): { folder: string; file: string } {
  if (sprite && sprite.startsWith(SPRITE_PREFIX)) {
    const rest = sprite.slice(SPRITE_PREFIX.length)
    const slash = rest.lastIndexOf('/')
    return slash >= 0
      ? { folder: rest.slice(0, slash + 1), file: rest.slice(slash + 1) }
      : { folder: '', file: rest }
  }
  return { folder: spriteDir(kind).slice(SPRITE_PREFIX.length), file: `${name.toLowerCase()}.png` }
}

function nameFromId(id: string): string {
  return id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// ── Rarity color ─────────────────────────────────────────────────────────────
const RARITY_COLOR: Record<string, string> = {
  common: 'var(--text-muted)', uncommon: '#1eff00', rare: '#0070dd',
  'very rare': '#a335ee', legendary: '#ff8000',
}
const RARITIES = ['common', 'uncommon', 'rare', 'very rare', 'legendary'] as const

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  itemId: string
  onClose: () => void
  readOnly?: boolean
  onEquip?: () => void
}

export function ItemEditorPanel({ itemId, onClose, readOnly, onEquip }: Props) {
  const customItems   = useAppStore(s => s.customItems)
  const addCustomItem = useAppStore(s => s.addCustomItem)

  const [editMode,    setEditMode]    = useState(!readOnly)
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const shopItem = getShopItemById(itemId, customItems)
  const fullDef = customItems[itemId] ?? GEAR_BY_ID[itemId] ?? WEAPON_BY_ID[itemId]

  const isWeapon = !!fullDef && 'damageDie' in fullDef
  const isGear   = !!fullDef && !isWeapon
  const gearDef  = isGear   ? (fullDef as GearEquipmentItem)   : undefined
  const weapDef  = isWeapon ? (fullDef as WeaponEquipmentItem) : undefined
  const kind     = fullDef?.kind ?? shopItem?.kind ?? 'ring'

  // ── Common edit state ────────────────────────────────────────────────────
  const [editId,     setEditId]     = useState(itemId)
  const [editName,   setEditName]   = useState(fullDef?.name ?? shopItem?.name ?? nameFromId(itemId))
  const [editCost,   setEditCost]   = useState(fullDef?.cost ?? shopItem?.cost ?? 0)
  const [editRarity, setEditRarity] = useState<string>(fullDef?.rarity ?? shopItem?.rarity ?? 'common')
  const [enchant,    setEnchant]    = useState(fullDef?.enchantmentBonus ?? 0)
  const [statRows,   setStatRows]   = useState<StatRow[]>(() => {
    const rows = statsToRows(fullDef && 'stats' in fullDef ? fullDef.stats : undefined)
    // Weapons keep to-hit / bonus-damage / crit-range on the def itself —
    // surface those native fields as selector rows so there is ONE editing
    // path and no duplicated sections.
    if (weapDef?.critModifier && !rows.some(r => r.key === 'critMod')) {
      rows.push({ key: 'critMod', value: Object.values(weapDef.critModifier)[0] ?? 0 })
    }
    if ((weapDef?.toHitFlat || weapDef?.toHitDiceCount) && !rows.some(r => r.key === 'toHitBonus')) {
      rows.push({ key: 'toHitBonus', value: 0 })
    }
    if ((weapDef?.dmgBonusCount || weapDef?.dmgBonusFlat) && !rows.some(r => r.key === 'bonusDamage')) {
      rows.push({ key: 'bonusDamage', value: 0 })
    }
    return rows
  })
  const [addKey,     setAddKey]     = useState('')

  const initSprite = parseSprite(fullDef?.sprite, kind, fullDef?.name ?? shopItem?.name ?? nameFromId(itemId))
  const [spriteFolder, setSpriteFolder] = useState(initSprite.folder)
  const [spriteFile,   setSpriteFile]   = useState(initSprite.file)
  const [spriteFiles,  setSpriteFiles]  = useState<string[]>([])

  useEffect(() => {
    const loadFiles = async () => {
      try {
        const files = await (window as any).assetStore?.listFiles(spriteFolder.slice(0, -1))
        const validFiles = files ?? []
        setSpriteFiles(validFiles)
        // Reset file if it doesn't exist in the loaded files
        if (!spriteFile || !validFiles.includes(spriteFile)) {
          setSpriteFile(validFiles[0] ?? '')
        }
      } catch (err) {
        console.warn('[ItemEditor] Failed to load sprite files:', err)
        setSpriteFiles([])
        setSpriteFile('')
      }
    }
    loadFiles()
  }, [spriteFolder])

  // ── Weapon edit state ────────────────────────────────────────────────────
  const initDmg   = parseDie(weapDef?.damageDie     ?? '1d8')
  const [dmgCount,     setDmgCount]     = useState(initDmg.count)
  const [dmgSides,     setDmgSides]     = useState(initDmg.sides)
  const [dmgType,      setDmgType]      = useState(weapDef?.damageType ?? 'slashing')
  const [propsText,    setPropsText]    = useState((weapDef?.properties ?? []).join(', '))
  const initGearThDice = parseDie(gearDef?.stats?.toHitDice ?? '0d4')
  const [toHitCount,   setToHitCount]   = useState(weapDef?.toHitDiceCount ?? (gearDef?.stats?.toHitDice ? initGearThDice.count : 0))
  const [toHitDie,     setToHitDie]     = useState(String(weapDef?.toHitDieType ?? (gearDef?.stats?.toHitDice ? initGearThDice.sides : '4')))
  const [toHitFlat,    setToHitFlat]    = useState(weapDef?.toHitFlat ?? gearDef?.stats?.toHitBonus ?? 0)
  const [dmgBonusCount,  setDmgBonusCount]  = useState(weapDef?.dmgBonusCount ?? 1)
  const [dmgBonusDie,    setDmgBonusDie]    = useState(String(weapDef?.dmgBonusDieType ?? '6'))
  const [dmgBonusFlat,   setDmgBonusFlat]   = useState(weapDef?.dmgBonusFlat ?? 0)
  const [dmgBonusType2,  setDmgBonusType2]  = useState(weapDef?.dmgBonusType ?? '')
  const [hasDmgBonus2,   setHasDmgBonus2]   = useState(!!weapDef?.dmgBonusCount || !!weapDef?.dmgBonusFlat || !!weapDef?.dmgBonusType)

  const [requiresAttunement, setRequiresAttunement] = useState(fullDef?.requiresAttunement ?? false)

  // ── Crit modifier edit state ─────────────────────────────────────────────
  const initCritMod = fullDef
    ? (('critModifier' in fullDef && fullDef.critModifier)
      || ('stats' in fullDef && fullDef.stats?.critModifier))
    : null
  const hasCritMod = initCritMod ? Object.keys(initCritMod).length > 0 : false
  const initCritModValue = hasCritMod && initCritMod ? (Object.values(initCritMod)[0] ?? 0) : 0
  const initCritModApplies = hasCritMod && initCritMod ? (Object.keys(initCritMod)[0] ?? 'all') : 'all'
  const [critModValue,     setCritModValue]     = useState<number>(initCritModValue)
  const [critModAppliesTo, setCritModAppliesTo] = useState<'melee' | 'ranged' | 'spells' | 'martial' | 'all'>(initCritModApplies as any)

  // ── Defense edit state (base AC + bonus AC) ──────────────────────────────
  const [baseAC,  setBaseAC]  = useState(gearDef?.baseAC ?? 10)
  const [acBonus, setAcBonus] = useState(gearDef?.stats?.acBonus ?? 0)

  // ── Gear bonus-damage edit state ─────────────────────────────────────────
  const accBd     = gearDef?.stats?.bonusDamage
  const initAccBd = parseDie(accBd?.dice ?? (weapDef?.dmgBonusCount ? `${weapDef.dmgBonusCount}d${weapDef.dmgBonusDieType ?? 6}` : '1d6'))
  const [accBdCount,     setAccBdCount]     = useState(accBd?.dice || weapDef?.dmgBonusCount ? initAccBd.count : 0)
  const [accBdSides,     setAccBdSides]     = useState(initAccBd.sides)
  const [accBdFlat,      setAccBdFlat]      = useState(accBd?.flat ?? weapDef?.dmgBonusFlat ?? 0)
  const [accBdType,      setAccBdType]      = useState<string>(accBd?.dmgType ?? weapDef?.dmgBonusType ?? 'fire')
  const [accBdAppliesTo, setAccBdAppliesTo] = useState<'melee' | 'ranged' | 'all'>(accBd?.appliesTo ?? 'all')
  const [toHitAppliesTo, setToHitAppliesTo] = useState<'melee' | 'ranged' | 'both'>(gearDef?.stats?.toHitBonusAppliesTo ?? 'both')

  // ── Crit bonus damage (extra damage only on crits) ───────────────────────
  const initCritDmg = (fullDef && 'stats' in fullDef ? fullDef.stats?.critBonusDamage : undefined)
  const initCritDmgDie = parseDie(initCritDmg?.dice ?? '1d6')
  const [critDmgCount, setCritDmgCount] = useState(initCritDmg?.dice ? initCritDmgDie.count : 1)
  const [critDmgSides, setCritDmgSides] = useState(initCritDmgDie.sides)
  const [critDmgFlat,  setCritDmgFlat]  = useState(initCritDmg?.flat ?? 0)
  const [critDmgType,  setCritDmgType]  = useState<string>(initCritDmg?.dmgType ?? 'fire')

  const computedSprite = `${SPRITE_PREFIX}${spriteFolder}${spriteFile}`
  const rarityColor    = RARITY_COLOR[editRarity] ?? 'var(--text-muted)'

  function handleIdChange(newId: string) {
    setEditId(newId)
    setEditName(nameFromId(newId))
  }

  function handleEnchantBonus(v: number) {
    setEnchant(v)
    if (v <= 4) setEditRarity(enchantToRarity(v))
  }

  function addStat() {
    if (!addKey || statRows.some(r => r.key === addKey)) return
    // Ability floors start at a meaningful value (13); plain bonuses at +1.
    setStatRows(prev => [...prev, { key: addKey, value: addKey.startsWith('abset_') ? 13 : 1 }])
    setAddKey('')
  }

  function removeStat(key: string) {
    setStatRows(prev => prev.filter(r => r.key !== key))
  }

  function updateStatVal(key: string, value: number) {
    setStatRows(prev => prev.map(r => r.key === key ? { ...r, value } : r))
  }

  /** Complex stats live in the same selector; their fields render inline. */
  function buildSelectorStats(): AccessoryStats {
    const stats: AccessoryStats = rowsToStats(statRows)
    if (statRows.some(r => r.key === 'toHitBonus')) {
      stats.toHitBonus = toHitFlat || undefined
      stats.toHitDice = toHitCount > 0 ? `${toHitCount}d${toHitDie}` : undefined
      if (stats.toHitBonus || stats.toHitDice) stats.toHitBonusAppliesTo = toHitAppliesTo
    }
    if (statRows.some(r => r.key === 'bonusDamage')) {
      stats.bonusDamage = {
        dice:      accBdCount > 0 ? `${accBdCount}d${accBdSides}` : undefined,
        flat:      accBdFlat || undefined,
        dmgType:   accBdType,
        appliesTo: accBdAppliesTo,
      }
    }
    if (statRows.some(r => r.key === 'critDamage')) {
      stats.critBonusDamage = {
        dice:    critDmgCount > 0 ? `${critDmgCount}d${critDmgSides}` : undefined,
        flat:    critDmgFlat || undefined,
        dmgType: critDmgType,
      }
    }
    return stats
  }

  function buildGearDef(overrideId?: string): GearEquipmentItem {
    const stats: AccessoryStats = buildSelectorStats()
    if (acBonus) stats.acBonus = acBonus
    const critModifier: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>> = {}
    if (statRows.some(r => r.key === 'critMod') && critModValue !== 0) {
      critModifier[critModAppliesTo] = critModValue
    }
    if (Object.keys(critModifier).length > 0) stats.critModifier = critModifier
    const gear: GearEquipmentItem = {
      id:                 overrideId ?? editId,
      name:               editName,
      kind:               kind as ShopItemKind,
      cost:               editCost,
      rarity:             editRarity as GearEquipmentItem['rarity'],
      sprite:             computedSprite,
      requiresAttunement: requiresAttunement || undefined,
      enchantmentBonus:   enchant || undefined,
      stats:              Object.keys(stats).length > 0 ? stats : undefined,
    }
    if (isArmorKind(kind)) {
      gear.type                = gearDef?.type
      gear.baseAC              = baseAC
      gear.dexCap              = gearDef?.dexCap
      gear.stealthDisadvantage = gearDef?.stealthDisadvantage
      gear.strRequirement      = gearDef?.strRequirement
    }
    return gear
  }

  function buildWeaponDef(overrideId?: string): WeaponEquipmentItem {
    const critModifier: Partial<Record<'melee' | 'ranged' | 'spells' | 'martial' | 'all', number>> = {}
    if (statRows.some(r => r.key === 'critMod') && critModValue !== 0) {
      critModifier[critModAppliesTo] = critModValue
    }
    // Weapons carry the same selector stats as gear (AC, abilities, skills, …),
    // but to-hit, bonus damage, and crit range write the weapon's NATIVE
    // fields (they fold into the weapon's own attack math) — stripped from
    // the stats block so nothing applies twice.
    const selectorStats = buildSelectorStats()
    delete selectorStats.critModifier
    delete selectorStats.bonusDamage
    delete selectorStats.toHitBonus
    delete selectorStats.toHitDice
    delete selectorStats.toHitBonusAppliesTo
    const hasBd = statRows.some(r => r.key === 'bonusDamage')
    const hasToHit = statRows.some(r => r.key === 'toHitBonus')

    return {
      stats:              Object.keys(selectorStats).length > 0 ? selectorStats : undefined,
      ...weapDef!,
      id:                 overrideId ?? weapDef!.id,
      name:               editName,
      cost:               editCost,
      rarity:             editRarity as WeaponEquipmentItem['rarity'],
      sprite:             computedSprite,
      requiresAttunement: requiresAttunement || undefined,
      critModifier:       Object.keys(critModifier).length > 0 ? critModifier : undefined,
      damageDie:        `${dmgCount}d${dmgSides}`,
      damageType:       dmgType,
      properties:       propsText.split(',').map(s => s.trim()).filter(Boolean),
      enchantmentBonus: enchant || undefined,
      bonusDamageDie:   undefined,
      bonusDamageType:  undefined,
      toHitDiceCount:   hasToHit && toHitCount > 0 ? toHitCount : undefined,
      toHitDieType:     hasToHit && toHitCount > 0 ? Number(toHitDie) : undefined,
      toHitFlat:        hasToHit ? (toHitFlat || undefined) : undefined,
      dmgBonusCount:    hasBd && accBdCount > 0 ? accBdCount : undefined,
      dmgBonusDieType:  hasBd && accBdCount > 0 ? Number(accBdSides) : undefined,
      dmgBonusFlat:     hasBd ? (accBdFlat || undefined) : undefined,
      dmgBonusType:     hasBd ? (accBdType || undefined) : undefined,
    }
  }

  async function handleSave() {
    if (!spriteFile.trim()) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }
    setSaveStatus('saving')
    try {
      if (isWeapon) {
        await saveWeaponDef(buildWeaponDef())
      } else if (isGear) {
        if (customItems[itemId]) {
          addCustomItem(buildGearDef())
        } else {
          await saveGearDef(buildGearDef())
        }
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('[ItemEditorPanel] save failed', err)
      setSaveStatus('error')
    }
  }

  async function handleSaveAs() {
    if (!spriteFile.trim()) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }
    const baseId = editId.trim() || itemId
    const newId  = baseId !== itemId ? baseId : `${baseId}-copy`
    setSaveStatus('saving')
    try {
      if (isWeapon) {
        await saveWeaponDef(buildWeaponDef(newId))
      } else if (isGear) {
        if (customItems[itemId]) addCustomItem(buildGearDef(newId))
        else await saveGearDef(buildGearDef(newId))
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('[ItemEditorPanel] save-as failed', err)
      setSaveStatus('error')
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Delete "${editName}" (${itemId})?\n\nThis will remove it from all data.`)
    if (!confirmed) return

    setSaveStatus('saving')
    try {
      if (isWeapon) {
        await deleteWeaponDef(itemId)
      } else if (isGear && !customItems[itemId]) {
        await deleteGearDef(itemId)
      }
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        onClose()
      }, 500)
    } catch (err) {
      console.error('[ItemEditorPanel] delete failed', err)
      setSaveStatus('error')
    }
  }

  const availableToAdd = STAT_OPTIONS.filter(o => !statRows.some(r => r.key === o.key))

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        {spriteFile.trim()
          ? <img src={computedSprite} alt={editName} className={styles.sprite} />
          : <div className={styles.spriteFallback}>{editName[0]}</div>
        }
        <div className={styles.headerInfo}>
          <span className={styles.headerName} style={{ color: rarityColor }}>{editName}</span>
          <span className={styles.headerSub}>{kind}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.scrollBody}>
      {/* Common fields */}
      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <label className={styles.label}>ID</label>
          {editMode
            ? <input className={styles.input} value={editId} onChange={e => handleIdChange(e.target.value)} />
            : <span className={styles.value}>{editId}</span>
          }
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label}>Name</label>
          {editMode
            ? <input className={styles.input} value={editName} onChange={e => setEditName(e.target.value)} />
            : <span className={styles.value}>{editName}</span>
          }
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label}>Kind</label>
          <span className={styles.value}>{kind}</span>
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label}>Rarity</label>
          {editMode
            ? <select className={styles.select} value={editRarity} onChange={e => setEditRarity(e.target.value)}>
                {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            : <span className={styles.value} style={{ color: rarityColor }}>{editRarity}</span>
          }
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label}>Cost</label>
          {editMode
            ? <input className={styles.inputSmall} type="number" value={editCost} min={0}
                onChange={e => setEditCost(Number(e.target.value))} />
            : <span className={styles.value}>{editCost} gp</span>
          }
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label}>Enchant</label>
          {editMode
            ? <input className={styles.inputSmall} type="number" min={0} max={20} value={enchant}
                onChange={e => handleEnchantBonus(Number(e.target.value))} />
            : <span className={styles.value} style={{ color: enchant > 0 ? 'var(--accent)' : undefined }}>
                {enchant > 0 ? `+${enchant}` : '—'}
              </span>
          }
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.label}>Attunement</label>
          {editMode
            ? <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={requiresAttunement}
                  onChange={e => setRequiresAttunement(e.target.checked)}
                />
                <span>Requires attunement</span>
              </label>
            : <span className={styles.value}>{requiresAttunement ? 'Required' : '—'}</span>
          }
        </div>

        <div className={`${styles.fieldRow} ${styles.fullRow}`}>
          <label className={styles.label}>Sprite</label>
          {editMode ? (
            <div className={styles.diceRow}>
              <select className={styles.diceSelect} value={spriteFolder}
                onChange={e => setSpriteFolder(e.target.value)}>
                {SPRITE_FOLDERS.map(f => {
                  const label = f.endsWith('/') ? f.slice(0, -1) : f
                  const display = label.replace('weapons/', 'weapons → ') || '(root)'
                  return <option key={f} value={f}>{display}</option>
                })}
              </select>
              <select className={styles.input} value={spriteFile}
                onChange={e => setSpriteFile(e.target.value)}>
                <option value="">{spriteFiles.length > 0 ? '— Select file —' : '(no files)'}</option>
                {spriteFiles.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          ) : (
            <span className={styles.spriteHint} title={computedSprite}>
              {computedSprite.replace(SPRITE_PREFIX, '…/')}
            </span>
          )}
        </div>
      </div>

      {/* Defense — base AC (armor/shield) + bonus AC (all gear) */}
      {isGear && (
        <div className={styles.fields}>
          {isArmorKind(kind) && (
            <div className={styles.fieldRow}>
              <label className={styles.label}>AC</label>
              {editMode
                ? <input className={styles.inputSmall} type="number" min={0} max={30} value={baseAC}
                    onChange={e => setBaseAC(Number(e.target.value))} />
                : <span className={styles.value}>{baseAC}</span>
              }
            </div>
          )}
          <div className={styles.fieldRow}>
            <label className={styles.label}>Bonus AC</label>
            {editMode
              ? <input className={styles.inputSmall} type="number" min={-10} max={20} value={acBonus}
                  onChange={e => setAcBonus(Number(e.target.value))} />
              : <span className={styles.value} style={{ color: acBonus > 0 ? 'var(--accent)' : undefined }}>
                  {acBonus > 0 ? `+${acBonus}` : acBonus < 0 ? String(acBonus) : '—'}
                </span>
            }
          </div>
        </div>
      )}

      {/* Weapon fields */}
      {isWeapon && (
        <div className={styles.weaponSection}>
          <span className={`${styles.sectionTitle} ${styles.fullRow}`}>Weapon</span>

          {/* Damage dice */}
          <div className={styles.fieldRow}>
            <label className={styles.label}>Damage</label>
            {editMode ? (
              <div className={styles.diceRow}>
                <input
                  type="number" min={1} max={20} value={dmgCount}
                  onChange={e => setDmgCount(Math.max(1, Number(e.target.value)))}
                  className={styles.diceCount}
                />
                <span className={styles.diceSep}>d</span>
                <select value={dmgSides} onChange={e => setDmgSides(e.target.value)} className={styles.diceSelect}>
                  {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ) : (
              <span className={styles.value}>{dmgCount}d{dmgSides}</span>
            )}
          </div>

          {/* Damage type */}
          <div className={styles.fieldRow}>
            <label className={styles.label}>Dmg Type</label>
            {editMode ? (
              <select value={dmgType} onChange={e => setDmgType(e.target.value)} className={styles.select}>
                {DAMAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className={styles.value}>{dmgType}</span>
            )}
          </div>

          {/* Properties */}
          <div className={`${styles.fieldRow} ${styles.fullRow}`}>
            <label className={styles.label}>Props</label>
            {editMode ? (
              <input
                className={styles.input}
                value={propsText}
                placeholder="Finesse, Light, Versatile (1d10)"
                onChange={e => setPropsText(e.target.value)}
              />
            ) : (
              <span className={styles.value}>{propsText || '—'}</span>
            )}
          </div>

        </div>
      )}

      {/* Stats — every item (gear AND weapons) */}
      {(isGear || isWeapon) && (
        <div className={styles.statsSection}>
          <div className={styles.statsHead}>
            <span className={styles.statsTitle}>Stats</span>
            {editMode && (
              <div className={styles.addStatRow}>
                <select
                  className={styles.addStatSel}
                  value={addKey}
                  onChange={e => setAddKey(e.target.value)}
                >
                  <option value="">+ stat</option>
                  {availableToAdd.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
                {addKey && (
                  <button className={styles.addStatBtn} onClick={addStat}>Add</button>
                )}
              </div>
            )}
          </div>

          <div className={styles.statsList}>
            {statRows.length === 0 && <span className={styles.statsEmpty}>No stats</span>}
            {statRows.map(row => {
              const isAdv = row.key.startsWith('adv:')
              if (row.key === 'bonusDamage') {
                return (
                  <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
                    <label className={styles.label}>Bonus DMG</label>
                    {editMode ? (
                      <div className={styles.diceRow}>
                        <input type="number" min={0} max={20} value={accBdCount} onChange={e => setAccBdCount(Math.max(0, Number(e.target.value)))} className={styles.diceCount} />
                        <span className={styles.diceSep}>d</span>
                        <select value={accBdSides} onChange={e => setAccBdSides(e.target.value)} className={styles.diceSelect}>
                          {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className={styles.diceSep}>+</span>
                        <input type="number" min={-20} max={20} value={accBdFlat} onChange={e => setAccBdFlat(Number(e.target.value))} className={styles.diceCount} title="Flat bonus" />
                        <select value={accBdType} onChange={e => setAccBdType(e.target.value)} className={styles.diceSelect}>
                          {DAMAGE_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                        </select>
                        {isGear && (
                          <select value={accBdAppliesTo} onChange={e => setAccBdAppliesTo(e.target.value as 'melee' | 'ranged' | 'all')} className={styles.diceSelect}>
                            <option value="all">all</option>
                            <option value="melee">melee</option>
                            <option value="ranged">ranged</option>
                          </select>
                        )}
                        <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
                      </div>
                    ) : (
                      <span className={styles.value}>
                        {[accBdCount > 0 ? `${accBdCount}d${accBdSides}` : null, accBdFlat || null].filter(Boolean).join('+') || '0'} {accBdType}{isGear ? ` (${accBdAppliesTo})` : ''}
                      </span>
                    )}
                  </div>
                )
              }
              if (row.key === 'toHitBonus') {
                return (
                  <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
                    <label className={styles.label}>To-Hit Bonus</label>
                    {editMode ? (
                      <div className={styles.diceRow}>
                        <input type="number" min={0} max={20} value={toHitCount} onChange={e => setToHitCount(Math.max(0, Number(e.target.value)))} className={styles.diceCount} />
                        <span className={styles.diceSep}>d</span>
                        <select value={toHitDie} onChange={e => setToHitDie(e.target.value)} className={styles.diceSelect}>
                          {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className={styles.diceSep}>+</span>
                        <input type="number" min={-20} max={20} value={toHitFlat} onChange={e => setToHitFlat(Number(e.target.value))} className={styles.diceCount} title="Flat bonus" />
                        {isGear && (
                          <>
                            <span className={styles.diceSep}>Applies</span>
                            <select value={toHitAppliesTo} onChange={e => setToHitAppliesTo(e.target.value as 'melee' | 'ranged' | 'both')} className={styles.diceSelect}>
                              <option value="both">both</option>
                              <option value="melee">melee</option>
                              <option value="ranged">ranged</option>
                            </select>
                          </>
                        )}
                        <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
                      </div>
                    ) : (
                      <span className={styles.value}>
                        {[toHitCount > 0 ? `${toHitCount}d${toHitDie}` : null, toHitFlat || null].filter(Boolean).join(' + ') || '0'} to hit{isGear ? ` (${toHitAppliesTo})` : ''}
                      </span>
                    )}
                  </div>
                )
              }
              if (row.key === 'critMod') {
                return (
                  <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
                    <label className={styles.label} title="Crit threshold reduction (1 = crit on 19+)">Crit Range</label>
                    {editMode ? (
                      <div className={styles.diceRow}>
                        <input type="number" min={-20} max={20} value={critModValue} onChange={e => setCritModValue(Number(e.target.value))} className={styles.diceCount} />
                        <select value={critModAppliesTo} onChange={e => setCritModAppliesTo(e.target.value as 'melee' | 'ranged' | 'spells' | 'martial' | 'all')} className={styles.diceSelect}>
                          <option value="all">all</option>
                          <option value="martial">martial</option>
                          <option value="melee">melee</option>
                          <option value="ranged">ranged</option>
                          <option value="spells">spells</option>
                        </select>
                        <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
                      </div>
                    ) : (
                      <span className={styles.value}>{critModValue !== 0 ? `crit ${20 - critModValue}+ (${critModAppliesTo})` : '—'}</span>
                    )}
                  </div>
                )
              }
              if (row.key === 'critDamage') {
                return (
                  <div key={row.key} className={`${styles.fieldRow} ${styles.fullRow}`}>
                    <label className={styles.label} title="Extra damage dealt only on a critical hit">Crit DMG</label>
                    {editMode ? (
                      <div className={styles.diceRow}>
                        <input type="number" min={0} max={20} value={critDmgCount} onChange={e => setCritDmgCount(Math.max(0, Number(e.target.value)))} className={styles.diceCount} />
                        <span className={styles.diceSep}>d</span>
                        <select value={critDmgSides} onChange={e => setCritDmgSides(e.target.value)} className={styles.diceSelect}>
                          {DIE_SIDES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <span className={styles.diceSep}>+</span>
                        <input type="number" min={-20} max={20} value={critDmgFlat} onChange={e => setCritDmgFlat(Number(e.target.value))} className={styles.diceCount} title="Flat bonus" />
                        <select value={critDmgType} onChange={e => setCritDmgType(e.target.value)} className={styles.diceSelect}>
                          {DAMAGE_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                        </select>
                        <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
                      </div>
                    ) : (
                      <span className={styles.value}>
                        {[critDmgCount > 0 ? `${critDmgCount}d${critDmgSides}` : null, critDmgFlat || null].filter(Boolean).join('+') || '0'} {critDmgType} on crit
                      </span>
                    )}
                  </div>
                )
              }
              return (
                <div key={row.key} className={styles.statRow}>
                  <span className={styles.statLabel}>{labelOf(row.key)}</span>
                  {isAdv
                    ? <span className={styles.statAdv}>Adv</span>
                    : editMode
                      ? <input
                          className={styles.statInput}
                          type="number"
                          value={row.value}
                          onChange={e => updateStatVal(row.key, Number(e.target.value))}
                        />
                      : <span className={styles.statVal}>{row.value > 0 ? `+${row.value}` : row.value}</span>
                  }
                  {editMode && (
                    <button className={styles.statRemove} onClick={() => removeStat(row.key)}>×</button>
                  )}
                </div>
              )
            })}

          </div>
        </div>
      )}

      </div>{/* scrollBody */}

      {/* Actions */}
      <div className={styles.actions}>
        {readOnly && (
          <button className={styles.editBtn} onClick={() => setEditMode(e => !e)}>
            {editMode ? 'Preview' : 'Edit'}
          </button>
        )}
        {editMode && !!fullDef && (
          <>
            <button
              className={styles.duplicateBtn}
              onClick={handleSaveAs}
              disabled={saveStatus === 'saving'}
            >
              Save As
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              style={{ color: saveStatus === 'error' ? 'var(--danger, red)' : saveStatus === 'saved' ? 'var(--accent)' : undefined }}
            >
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error!' : 'Save'}
            </button>
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              disabled={saveStatus === 'saving'}
              title="Delete this item from all data"
            >
              Delete
            </button>
          </>
        )}
        {onEquip && (
          <button className={styles.equipBtn} onClick={onEquip}>Add to list</button>
        )}
      </div>
    </div>
  )
}
