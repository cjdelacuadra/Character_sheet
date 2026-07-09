import { useState } from 'react'
import type { Character, AbilityScore, AbilityScores } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS } from '@/shared/data/skills'
import { mod, computeACFull, computeInitiativeFull, computeMaxHP, computeEquipmentStats, computeConditionModifiers, effectiveAbilityBonus } from '@/shared/data/charCalculations'
import { RACE_BY_ID, raceSaveAdvantagesOf } from '@/shared/data/raceData'
import { FEAT_BY_ID } from '@/shared/data/featsData'
import styles from './AbilitiesPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  selectedDetail: { type: 'save' | 'skill' | 'ability'; key: string } | null
  onSelectDetail: (d: { type: 'save' | 'skill' | 'ability'; key: string } | null) => void
}


export function AbilitiesPanel({ character: char, update, selectedDetail, onSelectDetail }: Props) {
  const [fieldEdit, setFieldEdit] = useState<{ key: AbilityScore; value: string } | null>(null)
  const hp = char.hitPoints
  const prof = char.proficiencyBonus

  function commitEdit() {
    if (!fieldEdit) { setFieldEdit(null); return }
    const v = parseInt(fieldEdit.value, 10)
    if (isNaN(v)) { setFieldEdit(null); return }
    const clamped = Math.min(30, Math.max(1, v))
    const newScores: AbilityScores = { ...char.abilityScores, [fieldEdit.key]: clamped }
    const newAC = computeACFull({ ...char, abilityScores: newScores })
    const raceBonusHp = RACE_BY_ID[char.race]?.bonusHpPerLevel ?? 0
    const toughBonusHp = char.feats.includes('tough') ? 2 : 0
    const newMaxHP = computeMaxHP(char.classId, char.level, newScores.con, raceBonusHp + toughBonusHp)
    const hpDiff = newMaxHP - hp.max
    update({
      abilityScores: newScores,
      initiative: computeInitiativeFull({ ...char, abilityScores: newScores }),
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

  const featAsiMap: Partial<Record<AbilityScore, string[]>> = {}
  for (const featId of char.feats) {
    const def = FEAT_BY_ID[featId]
    if (def?.abilityBonus) {
      for (const [ab, bonus] of Object.entries(def.abilityBonus) as [AbilityScore, number][]) {
        if (bonus) {
          if (!featAsiMap[ab]) featAsiMap[ab] = []
          featAsiMap[ab]!.push(`+${bonus} ${def.name}`)
        }
      }
    }
  }

  const hasJoAT = char.classId === 'Bard' && char.level >= 2
  const joatBonus = hasJoAT ? Math.floor(prof / 2) : 0

  const equipStats = computeEquipmentStats(char)
  // Bonuses AND abilitySet floors, as a per-ability delta over the base score.
  const abilityDelta = effectiveAbilityBonus(char)
  const condMods = computeConditionModifiers(char)

  const passivePerception = 10 + mod(char.abilityScores.wis + (abilityDelta.wis ?? 0)) +
    (char.skillProficiencies['perception'] === 'expert' ? prof * 2 :
     char.skillProficiencies['perception'] === 'proficient' ? prof : joatBonus) +
    (equipStats.skillBonus['perception'] ?? 0)

  return (
    <>
    <div className={styles.statsSubGrid}>
      {/* Ability score blocks */}
      <div className={styles.statsSubLeft}>
        {ABILITY_KEYS.map(key => {
          const val = char.abilityScores[key]
          const equipAbilBonus = abilityDelta[key] ?? 0
          const isEditing = fieldEdit?.key === key
          const isSelAbility = selectedDetail?.type === 'ability' && selectedDetail.key === key
          return (
            <div key={key} className={`${styles.abilityBlock} ${equipAbilBonus ? styles.abilityBlockBoosted : ''}`}>
              <div
                className={styles.abilityModCircle}
                style={{ cursor: 'pointer', ...(isSelAbility ? { boxShadow: '0 0 0 2px var(--accent)' } : {}) }}
                title="Click for the ability breakdown"
                onClick={() => onSelectDetail(isSelAbility ? null : { type: 'ability', key })}
              >{fmtMod(mod(val + equipAbilBonus))}</div>
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
              {equipAbilBonus !== 0 && (
                <span className={styles.abilityEquipBadge}>{equipAbilBonus > 0 ? `+${equipAbilBonus}` : equipAbilBonus} eq</span>
              )}
              {featAsiMap[key]?.map((note, i) => (
                <span key={i} className={styles.featAsiBadge}>{note}</span>
              ))}
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
          const equipBonus = equipStats.savingThrowBonus[ab] ?? 0
          const abilBonus = abilityDelta[ab] ?? 0
          const hasEquipAdv = equipStats.advantage.savingThrows.includes(ab)
          const racialAdv = raceSaveAdvantagesOf(char.race).filter(adv => adv.saves.includes(ab))
          const hasAdv = hasEquipAdv || racialAdv.length > 0
          const condDelta = condMods.saveDeltas[ab] ?? 0
          const advTooltip = [
            ...(hasEquipAdv ? ['Equipment'] : []),
            ...racialAdv.map(a => `${a.source} (${a.vs})`),
          ].join(' · ')
          const abilMod = mod(char.abilityScores[ab] + abilBonus)
          const auraMod = char.classId === 'Paladin' && char.level >= 6 ? Math.max(1, mod(char.abilityScores.cha)) : 0
          const bonus = abilMod + (isProficient ? prof : 0) + equipBonus + auraMod + condDelta
          const isSel = selectedDetail?.type === 'save' && selectedDetail.key === ab
          return (
            <div
              key={ab}
              className={`${styles.saveRow} ${isSel ? styles.saveRowSel : ''}`}
              onClick={() => onSelectDetail(selectedDetail?.type === 'save' && selectedDetail.key === ab ? null : { type: 'save', key: ab })}
            >
              <button
                className={`${styles.saveCircle} ${isProficient ? styles.saveCircleFilled : ''}`}
                onClick={e => {
                  e.stopPropagation()
                  const current = char.savingThrowProficiencies
                  update({ savingThrowProficiencies: isProficient ? current.filter(x => x !== ab) : [...current, ab] })
                }}
              />
              <span className={styles.saveBonus}>{fmtMod(bonus)}</span>
              {equipBonus !== 0 && <span className={styles.equipBadge}>★</span>}
              {auraMod > 0 && <span className={styles.equipBadge} title="Aura of Protection">✦</span>}
              {condDelta !== 0 && <span className={styles.conditionBadge}>{fmtMod(condDelta)}</span>}
              {hasAdv && <span className={styles.advBadge} title={advTooltip}>ADV</span>}
              <span className={styles.saveAb}>{ab.toUpperCase()}</span>
              <span className={styles.saveFormula}>
                d20{fmtMod(abilMod)}{isProficient ? `+${prof}p` : ''}{equipBonus !== 0 ? `+${equipBonus}eq` : ''}{auraMod > 0 ? `+${auraMod}aura` : ''}{condDelta !== 0 ? `${fmtMod(condDelta)}c` : ''}
              </span>
            </div>
          )
        })}

        <div className={styles.skillsHeader}>
          <span className={styles.sectionLabel}>Skills</span>
        </div>
        <div className={styles.skillsList}>
          {SKILLS.map(({ key, label, ability }) => {
            const state = char.skillProficiencies[key] ?? 'none'
            const equipBonus = equipStats.skillBonus[key] ?? 0
            const abilBonus = abilityDelta[ability] ?? 0
            const hasAdv = equipStats.advantage.skills.includes(key)
            const abilMod = mod(char.abilityScores[ability] + abilBonus)
            const bonus = abilMod +
              (state === 'none' ? joatBonus : state === 'proficient' ? prof : prof * 2) + equipBonus
            const isSel = selectedDetail?.type === 'skill' && selectedDetail.key === key
            return (
              <div
                key={key}
                className={`${styles.skillRow} ${isSel ? styles.skillRowSel : ''}`}
                onClick={() => onSelectDetail(selectedDetail?.type === 'skill' && selectedDetail.key === key ? null : { type: 'skill', key })}
              >
                <button
                  className={`${styles.skillCircle} ${state === 'expert' ? styles.skillCircleExpert : state === 'proficient' ? styles.skillCircleProf : ''}`}
                  onClick={e => { e.stopPropagation(); cycleSkill(key) }}
                />
                <span className={styles.skillBonus}>{fmtMod(bonus)}</span>
                {equipBonus !== 0 && <span className={styles.equipBadge}>★</span>}
                {hasAdv && <span className={styles.advBadge}>ADV</span>}
                <span className={styles.skillLabel}>{label}</span>
                <span className={styles.skillAb}>{ability.toUpperCase()}</span>
                <span className={styles.skillFormula}>
                  d20{fmtMod(abilMod)}{state !== 'none' ? `+${state === 'expert' ? prof * 2 : prof}${state === 'expert' ? 'e' : 'p'}` : (hasJoAT ? `+${joatBonus}j` : '')}{equipBonus !== 0 ? `+${equipBonus}eq` : ''}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.passivePP}>
          Passive Perception: <strong>{passivePerception}</strong>
        </div>
      </div>
    </div>

</>
  )
}
