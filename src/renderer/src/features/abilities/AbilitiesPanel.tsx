import { useState } from 'react'
import type { Character, AbilityScore, AbilityScores } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS } from '@/shared/data/skills'
import { mod, computeAC, computeMaxHP } from '@/shared/data/charCalculations'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { FEAT_BY_ID } from '@/shared/data/featsData'
import styles from './AbilitiesPanel.module.css'

function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
}

const SAVE_DESCS: Record<AbilityScore, string> = {
  str: 'Resist effects that physically force you — crushing, restraining, or shoving you away.',
  dex: 'Dodge area effects and avoid explosions, traps, and environmental hazards.',
  con: 'Endure sustained harm, illness, and maintain concentration on spells.',
  int: 'Resist effects that assault your reasoning and mental acuity.',
  wis: 'Resist charm, fear, and mind-affecting effects like Hold Person.',
  cha: 'Resist effects that sap your identity — Banishment and possession.',
}

export function AbilitiesPanel({ character: char, update }: Props) {
  const [fieldEdit, setFieldEdit] = useState<{ key: AbilityScore; value: string } | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<{ type: 'save' | 'skill'; key: string } | null>(null)
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

  const passivePerception = 10 + mod(char.abilityScores.wis) +
    (char.skillProficiencies['perception'] === 'expert' ? prof * 2 :
     char.skillProficiencies['perception'] === 'proficient' ? prof : joatBonus)

  return (
    <>
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
          const bonus = mod(char.abilityScores[ab]) + (isProficient ? prof : 0)
          const isSel = selectedDetail?.type === 'save' && selectedDetail.key === ab
          return (
            <div
              key={ab}
              className={`${styles.saveRow} ${isSel ? styles.saveRowSel : ''}`}
              onClick={() => setSelectedDetail(d => d?.type === 'save' && d.key === ab ? null : { type: 'save', key: ab })}
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
              <span className={styles.saveAb}>{ab.toUpperCase()}</span>
              <span className={styles.saveFormula}>
                d20{fmtMod(mod(char.abilityScores[ab]))}{isProficient ? `+${prof}p` : ''}
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
            const bonus = mod(char.abilityScores[ability]) +
              (state === 'none' ? joatBonus : state === 'proficient' ? prof : prof * 2)
            const isSel = selectedDetail?.type === 'skill' && selectedDetail.key === key
            return (
              <div
                key={key}
                className={`${styles.skillRow} ${isSel ? styles.skillRowSel : ''}`}
                onClick={() => setSelectedDetail(d => d?.type === 'skill' && d.key === key ? null : { type: 'skill', key })}
              >
                <button
                  className={`${styles.skillCircle} ${state === 'expert' ? styles.skillCircleExpert : state === 'proficient' ? styles.skillCircleProf : ''}`}
                  onClick={e => { e.stopPropagation(); cycleSkill(key) }}
                />
                <span className={styles.skillBonus}>{fmtMod(bonus)}</span>
                <span className={styles.skillLabel}>{label}</span>
                <span className={styles.skillAb}>{ability.toUpperCase()}</span>
                <span className={styles.skillFormula}>
                  d20{fmtMod(mod(char.abilityScores[ability]))}{state !== 'none' ? `+${state === 'expert' ? prof * 2 : prof}${state === 'expert' ? 'e' : 'p'}` : (hasJoAT ? `+${joatBonus}j` : '')}
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

    {selectedDetail && (() => {
      if (selectedDetail.type === 'save') {
        const ab = selectedDetail.key as AbilityScore
        const isProficient = char.savingThrowProficiencies.includes(ab)
        const abilMod = mod(char.abilityScores[ab])
        const bonus = abilMod + (isProficient ? prof : 0)
        return (
          <div className={styles.detailOverlay} onClick={() => setSelectedDetail(null)}>
            <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
              <div className={styles.detailModalTitle}>{ABILITY_LABELS[ab]} Saving Throw</div>
              <div className={styles.detailModalFormula}>
                d20 {fmtMod(abilMod)}{isProficient ? ` + ${prof} (prof)` : ''} = <strong>{fmtMod(bonus)}</strong>
              </div>
              <div className={styles.detailModalDesc}>{SAVE_DESCS[ab]}</div>
              {isProficient && <div className={styles.detailModalProf}>Proficient</div>}
            </div>
          </div>
        )
      } else {
        const skill = SKILLS.find(s => s.key === selectedDetail.key)!
        const state = char.skillProficiencies[skill.key] ?? 'none'
        const abilMod = mod(char.abilityScores[skill.ability])
        const bonus = abilMod + (state === 'none' ? joatBonus : state === 'proficient' ? prof : prof * 2)
        const profLabel = state === 'expert' ? 'Expertise' : state === 'proficient' ? 'Proficient' : (hasJoAT && state === 'none') ? 'Jack of All Trades' : null
        return (
          <div className={styles.detailOverlay} onClick={() => setSelectedDetail(null)}>
            <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
              <div className={styles.detailModalTitle}>{skill.label} ({ABILITY_LABELS[skill.ability]})</div>
              <div className={styles.detailModalFormula}>
                d20 {fmtMod(abilMod)}{state !== 'none' ? ` + ${state === 'expert' ? prof * 2 : prof} (${state === 'expert' ? 'expertise' : 'prof'})` : (hasJoAT ? ` + ${joatBonus} (JoAT)` : '')} = <strong>{fmtMod(bonus)}</strong>
              </div>
              <div className={styles.detailModalDesc}>{skill.description}</div>
              {profLabel && <div className={styles.detailModalProf}>{profLabel}</div>}
            </div>
          </div>
        )
      }
    })()}
    </>
  )
}
