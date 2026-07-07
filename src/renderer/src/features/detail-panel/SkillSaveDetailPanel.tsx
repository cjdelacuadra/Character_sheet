import type { Character, AbilityScore, Equipment } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import type { AccessoryStats } from '@/shared/data/equipment/types'
import { SKILLS } from '@/shared/data/skills'
import { mod, effectiveAbilityScore } from '@/shared/data/charCalculations'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { WEAPON_BY_ID } from '@/shared/data/equipment/weapons'
import { FEAT_BY_ID } from '@/shared/data/featsData'
import styles from './DetailPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

const ABILITY_DESCS: Record<AbilityScore, string> = {
  str: 'Raw physical power — melee attacks, Athletics, carrying capacity, and forcing your way through.',
  dex: 'Agility and reflexes — AC, initiative, ranged and finesse attacks, Stealth and Acrobatics.',
  con: 'Endurance and vitality — hit points, concentration saves, and resisting poison or exhaustion.',
  int: 'Reasoning and memory — Arcana, Investigation, History, and wizard spellcasting.',
  wis: 'Awareness and intuition — Perception, Insight, Survival, and cleric/druid spellcasting.',
  cha: 'Force of personality — Persuasion, Deception, Intimidation, and sorcerer/warlock/bard spellcasting.',
}

const SAVE_DESCS: Record<AbilityScore, string> = {
  str: 'Resist effects that physically force you — crushing, restraining, or shoving you away.',
  dex: 'Dodge area effects and avoid explosions, traps, and environmental hazards.',
  con: 'Endure sustained harm, illness, and maintain concentration on spells.',
  int: 'Resist effects that assault your reasoning and mental acuity.',
  wis: 'Resist charm, fear, and mind-affecting effects like Hold Person.',
  cha: 'Resist effects that sap your identity — Banishment and possession.',
}

const GEAR_SLOTS: (keyof Equipment)[] = [
  'armorId', 'shieldId',
  'helmetId', 'necklaceId', 'capeId', 'legsId',
  'bootsId', 'glovesId', 'ring1Id', 'ring2Id', 'amuletId',
]

/** Equipped stat blocks that are actually active — gear + weapons, attunement-gated. */
function equippedStatBlocks(char: Character): { name: string; stats: AccessoryStats }[] {
  const attuned = char.attunedItemIds ?? []
  const out: { name: string; stats: AccessoryStats }[] = []
  for (const slotKey of GEAR_SLOTS) {
    const itemId = char.equipment[slotKey]
    if (!itemId || typeof itemId !== 'string') continue
    const gear = GEAR_BY_ID[itemId]
    if (!gear?.stats) continue
    if (gear.requiresAttunement && !attuned.includes(itemId)) continue
    out.push({ name: gear.name, stats: gear.stats })
  }
  for (const w of char.weapons ?? []) {
    const def = WEAPON_BY_ID[w.id]
    if (!def?.stats) continue
    if (def.requiresAttunement && !attuned.includes(w.id)) continue
    out.push({ name: def.name, stats: def.stats })
  }
  return out
}

export interface AbilityBreakdownRow { label: string; delta?: number; setTo?: number }

/**
 * Score-space resume of one ability. The stored score already contains ASI
 * and feat increases, so the base is recovered by subtracting them — manual
 * score edits fold into the base line. Equipment bonuses and abilitySet
 * floors apply on top (they are never written into the stored score).
 */
export function abilityScoreBreakdown(char: Character, ab: AbilityScore): {
  rows: AbilityBreakdownRow[]; base: number; total: number; abilityMod: number
} {
  const label = ABILITY_LABELS[ab]

  const asiRows: AbilityBreakdownRow[] = []
  let asiSum = 0
  for (const [lvl, text] of Object.entries(char.completedAsiChoices ?? {})) {
    if (text.startsWith('Feat:')) continue   // feat ability bumps are counted from feats below
    const re = new RegExp(`\\+(\\d+) ${label}`, 'g')
    let m: RegExpExecArray | null
    let sum = 0
    while ((m = re.exec(text)) !== null) sum += Number(m[1])
    if (sum > 0) { asiRows.push({ label: `ASI lvl ${lvl}`, delta: sum }); asiSum += sum }
  }

  const featRows: AbilityBreakdownRow[] = []
  let featSum = 0
  for (const featId of char.feats ?? []) {
    const def = FEAT_BY_ID[featId]
    const bonus = (def?.abilityBonus?.[ab] ?? 0) + (char.featChoices?.[featId] === ab ? 1 : 0)
    if (bonus) { featRows.push({ label: def?.name ?? featId, delta: bonus }); featSum += bonus }
  }

  const equipRows: AbilityBreakdownRow[] = []
  for (const { name, stats } of equippedStatBlocks(char)) {
    const b = stats.abilityBonus?.[ab]
    if (b) equipRows.push({ label: name, delta: b })
    const setTo = stats.abilitySet?.[ab]
    if (setTo) equipRows.push({ label: name, setTo })
  }

  const base = char.abilityScores[ab] - asiSum - featSum
  const total = effectiveAbilityScore(char, ab)
  return { rows: [...asiRows, ...featRows, ...equipRows], base, total, abilityMod: mod(total) }
}

function AbilityResume({ char, ab }: { char: Character; ab: AbilityScore }) {
  const { rows, base, total, abilityMod } = abilityScoreBreakdown(char, ab)
  return (
    <div className={styles.formulaBlock}>
      <FormulaRow label="Base" value={String(base)} />
      {rows.map((r, i) => (
        <FormulaRow key={i} label={r.label} value={r.setTo !== undefined ? `set ${r.setTo}` : fmtMod(r.delta!)} tag={r.setTo !== undefined ? 'floor' : undefined} />
      ))}
      <div className={styles.formulaTotal}>Total <strong>{total}</strong></div>
      <div className={styles.formulaTotal}>Ability mod <strong>{fmtMod(abilityMod)}</strong></div>
    </div>
  )
}

interface Props {
  character: Character
  detail: { type: 'save' | 'skill' | 'ability'; key: string }
  onClose: () => void
}

export function SkillSaveDetailPanel({ character: char, detail, onClose }: Props) {
  const prof = char.proficiencyBonus
  const hasJoAT = char.classId === 'Bard' && char.level >= 2
  const joatBonus = hasJoAT ? Math.floor(prof / 2) : 0
  const blocks = equippedStatBlocks(char)

  if (detail.type === 'ability') {
    const ab = detail.key as AbilityScore
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{ABILITY_LABELS[ab]} Ability</span>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <AbilityResume char={char} ab={ab} />
        <p className={styles.desc}>{ABILITY_DESCS[ab]}</p>
      </div>
    )
  }

  if (detail.type === 'save') {
    const ab = detail.key as AbilityScore
    const isProficient = char.savingThrowProficiencies.includes(ab)
    const abilMod = mod(effectiveAbilityScore(char, ab))
    const flatSources = blocks
      .map(b => ({ name: b.name, value: b.stats.savingThrowBonus?.[ab] ?? 0 }))
      .filter(s => s.value !== 0)
    const hasAdv = blocks.some(b => b.stats.advantage?.savingThrows?.includes(ab))
    const auraMod = char.classId === 'Paladin' && char.level >= 6 ? Math.max(1, mod(effectiveAbilityScore(char, 'cha'))) : 0
    const flatSum = flatSources.reduce((s, r) => s + r.value, 0)
    const total = abilMod + flatSum + (isProficient ? prof : 0) + auraMod

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{ABILITY_LABELS[ab]} Saving Throw</span>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <AbilityResume char={char} ab={ab} />
        <div className={styles.formulaBlock}>
          <FormulaRow label={`${ABILITY_LABELS[ab]} mod`} value={fmtMod(abilMod)} />
          {flatSources.map((src, i) => (
            <FormulaRow key={i} label={src.name} value={fmtMod(src.value)} tag="save" />
          ))}
          {isProficient && <FormulaRow label="Proficiency" value={`+${prof}`} tag="prof" />}
          {auraMod > 0 && <FormulaRow label="Aura of Protection" value={`+${auraMod}`} tag="aura" />}
          <div className={styles.formulaTotal}>Total {ABILITY_LABELS[ab]} saving throw <strong>{fmtMod(total)}</strong></div>
        </div>
        <p className={styles.desc}>{SAVE_DESCS[ab]}</p>
        <div className={styles.tags}>
          {isProficient && <span className={styles.tag}>Proficient</span>}
          {hasAdv && <span className={styles.tagAdv}>Advantage (equipment)</span>}
        </div>
      </div>
    )
  }

  const skill = SKILLS.find(s => s.key === (detail.key as Skill))!
  const state = char.skillProficiencies[skill.key] ?? 'none'
  const abilMod = mod(effectiveAbilityScore(char, skill.ability))
  const flatSources = blocks
    .map(b => ({ name: b.name, value: b.stats.skillBonus?.[skill.key as Skill] ?? 0 }))
    .filter(s => s.value !== 0)
  const hasAdv = blocks.some(b => b.stats.advantage?.skills?.includes(skill.key as Skill))
  const profValue = state === 'expert' ? prof * 2 : state === 'proficient' ? prof : 0
  const flatSum = flatSources.reduce((s, r) => s + r.value, 0)
  const total = abilMod + flatSum + (state === 'none' ? joatBonus : profValue)
  const profLabel = state === 'expert' ? 'Expertise' : state === 'proficient' ? 'Proficient' : (hasJoAT && state === 'none') ? 'Jack of All Trades' : null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{skill.label} <span className={styles.sub}>({ABILITY_LABELS[skill.ability]})</span></span>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>
      <div className={styles.formulaBlock}>
        <FormulaRow label={`${ABILITY_LABELS[skill.ability]} mod`} value={fmtMod(abilMod)} />
        {flatSources.map((src, i) => (
          <FormulaRow key={i} label={src.name} value={fmtMod(src.value)} tag="skill" />
        ))}
        {state !== 'none' && <FormulaRow label={state === 'expert' ? 'Expertise' : 'Proficiency'} value={fmtMod(profValue)} tag={state === 'expert' ? 'exp' : 'prof'} />}
        {state === 'none' && hasJoAT && <FormulaRow label="Jack of All Trades" value={fmtMod(joatBonus)} tag="joat" />}
        <div className={styles.formulaTotal}>Total <strong>{fmtMod(total)}</strong></div>
      </div>
      <p className={styles.desc}>{skill.description}</p>
      <div className={styles.tags}>
        {profLabel && <span className={styles.tag}>{profLabel}</span>}
        {hasAdv && <span className={styles.tagAdv}>Advantage (equipment)</span>}
      </div>
    </div>
  )
}

function FormulaRow({ label, value, tag }: { label: string; value: string; tag?: string }) {
  return (
    <div className={styles.formulaRow}>
      <span className={styles.formulaLabel}>{label}</span>
      {tag && <span className={styles.formulaTag}>{tag}</span>}
      <span className={styles.formulaValue}>{value}</span>
    </div>
  )
}
