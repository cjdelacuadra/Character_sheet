import { useState } from 'react'
import type { Character, AbilityScore, AbilityScores } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS } from '@/shared/data/skills'
import { mod, computeAC, computeMaxHP } from '@/shared/data/charCalculations'
import { RACE_BY_ID } from '@/shared/data/raceData'
import styles from './AbilitiesPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

export function AbilitiesPanel({ character: char, update }: Props) {
  const [fieldEdit, setFieldEdit] = useState<{ key: AbilityScore; value: string } | null>(null)
  const hp = char.hitPoints
  const prof = char.proficiencyBonus

  function commitEdit() {
    if (!fieldEdit) { setFieldEdit(null); return }
    const v = parseInt(fieldEdit.value, 10)
    if (isNaN(v)) { setFieldEdit(null); return }
    const clamped = Math.min(30, Math.max(1, v))
    const newScores: AbilityScores = { ...char.abilityScores, [fieldEdit.key]: clamped }
    const newAC = computeAC({ abilityScores: newScores, equipment: char.equipment, classId: char.classId, race: char.race, subclass: char.subclass })
    const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
    const toughBonusHp = char.feats.includes('tough') ? 2 : 0
    const alertBonus = char.feats.includes('alert') ? 5 : 0
    const newMaxHP = computeMaxHP(char.classId, char.level, newScores.con, raceBonusHp + toughBonusHp)
    const hpDiff = newMaxHP - hp.max
    update({
      abilityScores: newScores,
      initiative: mod(newScores.dex) + alertBonus,
      armorClass: newAC,
      hitPoints: { ...hp, max: newMaxHP, current: Math.max(0, hp.current + hpDiff) },
    })
    setFieldEdit(null)
  }

  function cycleSkill(key: Skill) {
    const current = char.skillProficiencies[key] ?? 'none'
    const next: 'proficient' | 'expert' | undefined =
      current === 'none' ? 'proficient' : current === 'proficient' ? 'expert' : undefined
    const updated = { ...char.skillProficiencies }
    if (next === undefined) delete updated[key]
    else updated[key] = next
    update({ skillProficiencies: updated })
  }

  const passivePerception = 10 + mod(char.abilityScores.wis) +
    (char.skillProficiencies['perception'] === 'expert' ? prof * 2 :
     char.skillProficiencies['perception'] === 'proficient' ? prof : 0)

  return (
    <div className={styles.statsSubGrid}>
      {/* Ability score blocks */}
      <div className={styles.statsSubLeft}>
        {ABILITY_KEYS.map(key => {
          const val = char.abilityScores[key]
          const isEditing = fieldEdit?.key === key
          return (
            <div key={key} className={styles.abilityBlock}>
              <div className={styles.abilityModCircle}>{fmtMod(mod(val))}</div>
              <div
                className={styles.abilityScoreBox}
                onClick={() => !isEditing && setFieldEdit({ key, value: String(val) })}
                title="Click to edit"
              >
                {isEditing ? (
                  <input
                    className={styles.abilityEditInput}
                    type="number"
                    min={1} max={30}
                    value={fieldEdit!.value}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onChange={e => setFieldEdit({ key, value: e.target.value })}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setFieldEdit(null) }}
                  />
                ) : (
                  <span className={styles.abilityScoreNum}>{val}</span>
                )}
              </div>
              <span className={styles.abilityName}>{ABILITY_LABELS[key]}</span>
            </div>
          )
        })}
      </div>

      {/* Saves + Skills */}
      <div className={styles.statsSubRight}>
        <div className={styles.savesHeader}>
          <span className={styles.sectionLabel}>Saving Throws</span>
          <span className={styles.profBadge}>Prof {fmtMod(prof)}</span>
        </div>
        {ABILITY_KEYS.map(ab => {
          const isProficient = char.savingThrowProficiencies.includes(ab)
          const bonus = mod(char.abilityScores[ab]) + (isProficient ? prof : 0)
          return (
            <div key={ab} className={styles.saveRow}>
              <button
                className={`${styles.saveCircle} ${isProficient ? styles.saveCircleFilled : ''}`}
                onClick={() => {
                  const current = char.savingThrowProficiencies
                  update({ savingThrowProficiencies: isProficient ? current.filter(x => x !== ab) : [...current, ab] })
                }}
              />
              <span className={styles.saveBonus}>{fmtMod(bonus)}</span>
              <span className={styles.saveAb}>{ab.toUpperCase()}</span>
            </div>
          )
        })}

        <div className={styles.skillsHeader}>
          <span className={styles.sectionLabel}>Skills</span>
        </div>
        <div className={styles.skillsList}>
          {SKILLS.map(({ key, label, ability }) => {
            const state = char.skillProficiencies[key] ?? 'none'
            const bonus = mod(char.abilityScores[ability]) +
              (state === 'none' ? 0 : state === 'proficient' ? prof : prof * 2)
            return (
              <button key={key} className={styles.skillRow} onClick={() => cycleSkill(key)}>
                <span className={`${styles.skillCircle} ${state === 'expert' ? styles.skillCircleExpert : state === 'proficient' ? styles.skillCircleProf : ''}`} />
                <span className={styles.skillBonus}>{fmtMod(bonus)}</span>
                <span className={styles.skillLabel}>{label}</span>
                <span className={styles.skillAb}>{ability.toUpperCase()}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.passivePP}>
          Passive Perception: <strong>{passivePerception}</strong>
        </div>
      </div>
    </div>
  )
}
