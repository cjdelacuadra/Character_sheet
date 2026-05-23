import type { Character, AbilityScore, Equipment } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS } from '@/shared/data/skills'
import { mod } from '@/shared/data/charCalculations'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import styles from './DetailPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

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
  'bootsId', 'glovesId', 'quiverId', 'ring1Id', 'ring2Id', 'amuletId',
]

interface Source { name: string; value: number; tag?: string }

function equipSources(
  char: Character,
  abilityKey: AbilityScore,
  flatKey: { type: 'save'; ab: AbilityScore } | { type: 'skill'; skill: Skill },
): Source[] {
  const sources: Source[] = []
  let cumulativeScore = char.abilityScores[abilityKey]

  for (const slotKey of GEAR_SLOTS) {
    const itemId = char.equipment[slotKey]
    if (!itemId || typeof itemId !== 'string') continue
    const gear = GEAR_BY_ID[itemId]
    if (!gear?.stats) continue

    // Ability score bonus → compute actual modifier delta
    const abilBonus = gear.stats.abilityBonus?.[abilityKey] ?? 0
    if (abilBonus !== 0) {
      const delta = mod(cumulativeScore + abilBonus) - mod(cumulativeScore)
      cumulativeScore += abilBonus
      if (delta !== 0) sources.push({ name: gear.name, value: delta })
    }

    // Flat bonus to the specific save or skill
    const flatBonus =
      flatKey.type === 'save'
        ? (gear.stats.savingThrowBonus?.[flatKey.ab] ?? 0)
        : (gear.stats.skillBonus?.[flatKey.skill] ?? 0)
    if (flatBonus !== 0) sources.push({ name: gear.name, value: flatBonus, tag: flatKey.type })
  }

  return sources
}

interface Props {
  character: Character
  detail: { type: 'save' | 'skill'; key: string }
  onClose: () => void
}

export function SkillSaveDetailPanel({ character: char, detail, onClose }: Props) {
  const prof = char.proficiencyBonus
  const hasJoAT = char.classId === 'Bard' && char.level >= 2
  const joatBonus = hasJoAT ? Math.floor(prof / 2) : 0

  if (detail.type === 'save') {
    const ab = detail.key as AbilityScore
    const isProficient = char.savingThrowProficiencies.includes(ab)
    const baseAbilMod = mod(char.abilityScores[ab])
    const sources = equipSources(char, ab, { type: 'save', ab })
    const hasAdv = char.equipment && (() => {
      for (const s of GEAR_SLOTS) {
        const id = char.equipment[s]
        if (!id || typeof id !== 'string') continue
        const gear = GEAR_BY_ID[id]
        if (gear?.stats?.advantage?.savingThrows?.includes(ab)) return true
      }
      return false
    })()
    const equipSourceSum = sources.reduce((s, r) => s + r.value, 0)
    const total = baseAbilMod + equipSourceSum + (isProficient ? prof : 0)

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.title}>{ABILITY_LABELS[ab]} Saving Throw</span>
          <button className={styles.close} onClick={onClose}>×</button>
        </div>
        <div className={styles.formulaBlock}>
          <FormulaRow label={`${ABILITY_LABELS[ab]} mod`} value={fmtMod(baseAbilMod)} />
          {sources.map((src, i) => (
            <FormulaRow key={i} label={src.name} value={fmtMod(src.value)} tag={src.tag} />
          ))}
          {isProficient && <FormulaRow label="Proficiency" value={`+${prof}`} tag="prof" />}
          <div className={styles.formulaTotal}>Total <strong>{fmtMod(total)}</strong></div>
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
  const baseAbilMod = mod(char.abilityScores[skill.ability])
  const sources = equipSources(char, skill.ability, { type: 'skill', skill: skill.key as Skill })
  const hasAdv = (() => {
    for (const s of GEAR_SLOTS) {
      const id = char.equipment[s]
      if (!id || typeof id !== 'string') continue
      const gear = GEAR_BY_ID[id]
      if (gear?.stats?.advantage?.skills?.includes(skill.key as Skill)) return true
    }
    return false
  })()
  const profValue = state === 'expert' ? prof * 2 : state === 'proficient' ? prof : 0
  const equipSourceSum = sources.reduce((s, r) => s + r.value, 0)
  const total = baseAbilMod + equipSourceSum + (state === 'none' ? joatBonus : profValue)
  const profLabel = state === 'expert' ? 'Expertise' : state === 'proficient' ? 'Proficient' : (hasJoAT && state === 'none') ? 'Jack of All Trades' : null

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>{skill.label} <span className={styles.sub}>({ABILITY_LABELS[skill.ability]})</span></span>
        <button className={styles.close} onClick={onClose}>×</button>
      </div>
      <div className={styles.formulaBlock}>
        <FormulaRow label={`${ABILITY_LABELS[skill.ability]} mod`} value={fmtMod(baseAbilMod)} />
        {sources.map((src, i) => (
          <FormulaRow key={i} label={src.name} value={fmtMod(src.value)} tag={src.tag} />
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
