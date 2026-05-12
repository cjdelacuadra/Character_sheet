import { useState } from 'react'
import { useAppStore } from '@/app/store'
import type { Character, AbilityScores, AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS, SKILL_BY_KEY } from '@/shared/data/skills'
import { RACE_LABELS, RACE_BY_ID } from '@/shared/data/raceData'
import { CLASS_LABELS, CLASS_BY_ID } from '@/shared/data/classData'
import { BACKGROUNDS, BACKGROUND_BY_ID } from '@/shared/data/backgrounds'
import { ARMOR_LIST, ARMOR_BY_ID } from '@/shared/data/armorData'
import {
  computeAC, computeMaxHP, computeSpeed, profBonus, mod,
  rollScoreSet, POINT_BUY_COST, POINT_BUY_TOTAL
} from '@/shared/data/charCalculations'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import styles from './CharacterSelectScreen.module.css'

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export function CharacterSelectScreen() {
  const { characters, setActiveCharacter, addCharacter, deleteCharacter } = useAppStore()
  const [showCreate, setShowCreate] = useState(false)
  const characterList = Object.values(characters)

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Characters</h1>
        <button className={styles.createBtn} onClick={() => setShowCreate(true)}>+ New Character</button>
      </header>

      {characterList.length === 0 ? (
        <div className={styles.empty}>
          <p>No characters yet.</p>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>Create your first character</button>
        </div>
      ) : (
        <ul className={styles.list}>
          {characterList.map((char) => (
            <li key={char.id} className={styles.listItem}>
              <button className={styles.card} onClick={() => setActiveCharacter(char.id)}>
                <div className={styles.cardLeft}>
                  <span className={styles.cardName}>{char.name}</span>
                  <span className={styles.cardSub}>Level {char.level} {RACE_BY_ID[char.race]?.label ?? char.race} {char.classId}{char.subclass ? ` · ${char.subclass}` : ''}</span>
                </div>
                <div className={styles.cardStats}>
                  <span className={styles.cardStat}>
                    <span className={styles.cardStatLabel}>HP</span>
                    <span className={styles.cardStatValue} style={{ color: hpColor(char.hitPoints.current, char.hitPoints.max) }}>
                      {char.hitPoints.current}/{char.hitPoints.max}
                    </span>
                  </span>
                  <span className={styles.cardStat}>
                    <span className={styles.cardStatLabel}>AC</span>
                    <span className={styles.cardStatValue}>{char.armorClass}</span>
                  </span>
                  <span className={styles.cardStat}>
                    <span className={styles.cardStatLabel}>Bg</span>
                    <span className={styles.cardStatValue} style={{ fontSize: 11 }}>{BACKGROUND_BY_ID[char.background]?.label ?? char.background}</span>
                  </span>
                </div>
              </button>
              <button className={styles.deleteBtn}
                onClick={() => { if (confirm(`Delete ${char.name}?`)) deleteCharacter(char.id) }}
                title="Delete character">×</button>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={(char) => { addCharacter(char); setActiveCharacter(char.id) }} />
      )}
    </div>
  )
}

function hpColor(current: number, max: number) {
  const pct = current / max
  return pct > 0.5 ? 'var(--success)' : pct > 0.25 ? 'var(--warning)' : 'var(--danger)'
}

// ─────────────────────────────────────────────────────────────
//  CREATE MODAL — 3 STEPS
// ─────────────────────────────────────────────────────────────

type Step = 'basics' | 'scores' | 'equipment'
type ScoreMethod = 'standard' | 'pointbuy' | 'roll'

interface Basics { name: string; race: string; classId: string; background: string; level: number }

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (c: Character) => void }) {
  const [step, setStep] = useState<Step>('basics')
  const [basics, setBasics] = useState<Basics>({ name: '', race: 'Human', classId: 'Fighter', background: 'Soldier', level: 1 })

  // Step 2 state
  const [method, setMethod] = useState<ScoreMethod>('standard')
  const [stdAssign, setStdAssign] = useState<Partial<Record<AbilityScore, number>>>({})
  const [pbScores, setPbScores] = useState<Record<AbilityScore, number>>({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })
  const [rolled, setRolled] = useState<number[]>([])
  const [rollAssign, setRollAssign] = useState<Partial<Record<AbilityScore, number>>>({})

  // Step 3 state
  const [armorId, setArmorId] = useState<string>('none')
  const [hasShield, setHasShield] = useState(false)
  const [chosenSkills, setChosenSkills] = useState<Skill[]>([])

  const classDef = CLASS_BY_ID[basics.classId]
  const raceDef = RACE_BY_ID[basics.race]
  const bgDef = BACKGROUND_BY_ID[basics.background]

  function getScores(): AbilityScores {
    const base: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    if (method === 'standard') {
      ABILITY_KEYS.forEach(k => { if (stdAssign[k] !== undefined) base[k] = stdAssign[k]! })
    } else if (method === 'pointbuy') {
      ABILITY_KEYS.forEach(k => { base[k] = pbScores[k] })
    } else {
      ABILITY_KEYS.forEach(k => { if (rollAssign[k] !== undefined) base[k] = rollAssign[k]! })
    }
    // Apply racial bonuses
    if (raceDef?.abilityBonus) {
      ABILITY_KEYS.forEach(k => { base[k] = (base[k] || 10) + (raceDef.abilityBonus[k] ?? 0) })
    }
    return base
  }

  function buildCharacter(): Character {
    const scores = getScores()
    const equipment = { armorId: armorId === 'none' ? null : armorId, hasShield }
    const charBase = { abilityScores: scores, equipment, classId: basics.classId, race: basics.race }
    const ac = computeAC(charBase)
    const maxHp = computeMaxHP(basics.classId, basics.level, scores.con)
    const speed = computeSpeed(basics.race)
    const dexMod = mod(scores.dex)
    const prof = profBonus(basics.level)

    // Skill proficiencies: background + chosen class skills (no duplicates)
    const skillProf: Partial<Record<Skill, 'proficient' | 'expert'>> = {}
    bgDef?.skills.forEach(s => { skillProf[s] = 'proficient' })
    chosenSkills.forEach(s => { skillProf[s] = 'proficient' })

    return {
      id: crypto.randomUUID(),
      name: basics.name.trim(),
      race: basics.race,
      classId: basics.classId,
      background: basics.background,
      level: basics.level,
      experiencePoints: 0,
      abilityScores: scores,
      hitPoints: { current: maxHp, max: maxHp, temp: 0 },
      armorClass: ac,
      speed,
      initiative: dexMod,
      proficiencyBonus: prof,
      equipment,
      savingThrowProficiencies: classDef ? [...classDef.savingThrows] : [],
      skillProficiencies: skillProf,
      spellIds: [],
      spellSlots: defaultSpellSlots(basics.classId, basics.level),
      conditionIds: [],
      resources: {},
      deathSaves: { successes: 0, failures: 0 },
      inspiration: false,
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Character</h2>
          <StepPips current={step} />
        </div>

        {step === 'basics' && (
          <StepBasics
            value={basics}
            onChange={setBasics}
            onNext={() => setStep('scores')}
            onCancel={onClose}
          />
        )}

        {step === 'scores' && (
          <StepScores
            method={method} setMethod={setMethod}
            stdAssign={stdAssign} setStdAssign={setStdAssign}
            pbScores={pbScores} setPbScores={setPbScores}
            rolled={rolled} setRolled={setRolled}
            rollAssign={rollAssign} setRollAssign={setRollAssign}
            raceDef={raceDef}
            onBack={() => setStep('basics')}
            onNext={() => setStep('equipment')}
          />
        )}

        {step === 'equipment' && (
          <StepEquipment
            basics={basics}
            scores={getScores()}
            armorId={armorId} setArmorId={setArmorId}
            hasShield={hasShield} setHasShield={setHasShield}
            chosenSkills={chosenSkills} setChosenSkills={setChosenSkills}
            onBack={() => setStep('scores')}
            onCreate={() => onCreate(buildCharacter())}
          />
        )}
      </div>
    </div>
  )
}

function StepPips({ current }: { current: Step }) {
  const steps: Step[] = ['basics', 'scores', 'equipment']
  return (
    <div className={styles.stepIndicator}>
      {steps.map((s, i) => (
        <>
          <span key={s} className={`${styles.stepDot} ${current === s ? styles.stepDotActive : steps.indexOf(current) > i ? styles.stepDotDone : ''}`} />
          {i < steps.length - 1 && <span key={`line-${i}`} className={styles.stepLine} />}
        </>
      ))}
    </div>
  )
}

// ── STEP 1: BASICS ──

function StepBasics({ value, onChange, onNext, onCancel }: {
  value: Basics; onChange: (v: Basics) => void; onNext: () => void; onCancel: () => void
}) {
  const set = (k: keyof Basics, v: string | number) => onChange({ ...value, [k]: v })
  return (
    <div className={styles.stepContent}>
      <div className={styles.form}>
        <label className={styles.field}>
          <span>Name</span>
          <input className={styles.input} value={value.name} onChange={e => set('name', e.target.value)} placeholder="Character name" autoFocus />
        </label>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Race</span>
            <select className={styles.input} value={value.race} onChange={e => set('race', e.target.value)}>
              {RACE_LABELS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Class</span>
            <select className={styles.input} value={value.classId} onChange={e => set('classId', e.target.value)}>
              {CLASS_LABELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Background</span>
            <select className={styles.input} value={value.background} onChange={e => set('background', e.target.value)}>
              {BACKGROUNDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Level</span>
            <input className={styles.input} type="number" min={1} max={20} value={value.level}
              onChange={e => set('level', Math.min(20, Math.max(1, Number(e.target.value))))} />
          </label>
        </div>
        {/* Background preview */}
        {BACKGROUND_BY_ID[value.background] && (
          <div className={styles.infoBox}>
            <span className={styles.infoLabel}>Background skills:</span>
            <span className={styles.infoValue}>
              {BACKGROUND_BY_ID[value.background].skills.map(s => SKILL_BY_KEY[s]?.label).join(', ')}
            </span>
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="button" className={styles.nextBtn} disabled={!value.name.trim()} onClick={onNext}>
          Ability Scores →
        </button>
      </div>
    </div>
  )
}

// ── STEP 2: ABILITY SCORES ──

function StepScores({
  method, setMethod,
  stdAssign, setStdAssign,
  pbScores, setPbScores,
  rolled, setRolled,
  rollAssign, setRollAssign,
  raceDef,
  onBack, onNext,
}: {
  method: ScoreMethod; setMethod: (m: ScoreMethod) => void
  stdAssign: Partial<Record<AbilityScore, number>>; setStdAssign: (v: Partial<Record<AbilityScore, number>>) => void
  pbScores: Record<AbilityScore, number>; setPbScores: (v: Record<AbilityScore, number>) => void
  rolled: number[]; setRolled: (v: number[]) => void
  rollAssign: Partial<Record<AbilityScore, number>>; setRollAssign: (v: Partial<Record<AbilityScore, number>>) => void
  raceDef?: typeof RACE_BY_ID[string]
  onBack: () => void; onNext: () => void
}) {
  const racialBonus = (k: AbilityScore) => raceDef?.abilityBonus?.[k] ?? 0

  // Standard array
  const usedStd = Object.values(stdAssign)
  const availStd = STANDARD_ARRAY.filter(v => !usedStd.includes(v))
  const stdComplete = ABILITY_KEYS.every(k => stdAssign[k] !== undefined)

  function assignStd(key: AbilityScore, value: number | undefined) {
    const next = { ...stdAssign }
    if (value === undefined) { delete next[key]; setStdAssign(next); return }
    for (const k of ABILITY_KEYS) if (next[k] === value) delete next[k]
    next[key] = value
    setStdAssign(next)
  }

  // Point buy
  const pbSpent = ABILITY_KEYS.reduce((sum, k) => sum + (POINT_BUY_COST[pbScores[k]] ?? 0), 0)
  const pbLeft = POINT_BUY_TOTAL - pbSpent

  function adjustPb(key: AbilityScore, delta: number) {
    const next = pbScores[key] + delta
    if (next < 8 || next > 15) return
    const newCost = (POINT_BUY_COST[next] ?? 0) - (POINT_BUY_COST[pbScores[key]] ?? 0)
    if (pbLeft - newCost < 0) return
    setPbScores({ ...pbScores, [key]: next })
  }

  // Roll
  function doRoll() {
    setRolled(rollScoreSet())
    setRollAssign({})
  }

  function assignRoll(key: AbilityScore, value: number | undefined) {
    const next = { ...rollAssign }
    if (value === undefined) { delete next[key]; setRollAssign(next); return }
    for (const k of ABILITY_KEYS) if (next[k] === value) delete next[k]
    next[key] = value
    setRollAssign(next)
  }

  const rollUsed = Object.values(rollAssign)
  const rollComplete = rolled.length === 6 && ABILITY_KEYS.every(k => rollAssign[k] !== undefined)

  const canContinue = method === 'standard' ? stdComplete : method === 'pointbuy' ? true : rollComplete

  function getPreview(k: AbilityScore): number | null {
    const bonus = racialBonus(k)
    if (method === 'standard') return stdAssign[k] !== undefined ? stdAssign[k]! + bonus : null
    if (method === 'pointbuy') return pbScores[k] + bonus
    return rollAssign[k] !== undefined ? rollAssign[k]! + bonus : null
  }

  return (
    <div className={styles.stepContent}>
      <div className={styles.methodTabs}>
        {(['standard', 'pointbuy', 'roll'] as ScoreMethod[]).map(m => (
          <button key={m} className={`${styles.methodTab} ${method === m ? styles.methodTabActive : ''}`} onClick={() => setMethod(m)}>
            {m === 'standard' ? 'Standard Array' : m === 'pointbuy' ? 'Point Buy' : 'Roll (4d6)'}
          </button>
        ))}
      </div>

      {method === 'standard' && (
        <div className={styles.scoresGrid}>
          {ABILITY_KEYS.map(key => (
            <div key={key} className={styles.scoreRow}>
              <span className={styles.scoreKey}>{ABILITY_LABELS[key]}</span>
              <div className={styles.scorePips}>
                {STANDARD_ARRAY.map(val => {
                  const assigned = stdAssign[key] === val
                  const taken = usedStd.includes(val) && !assigned
                  return (
                    <button key={val}
                      className={`${styles.scorePip} ${assigned ? styles.scorePipSelected : ''} ${taken ? styles.scorePipTaken : ''}`}
                      disabled={taken}
                      onClick={() => assignStd(key, assigned ? undefined : val)}
                    >{val}</button>
                  )
                })}
              </div>
              <span className={styles.scoreValue}>{stdAssign[key] !== undefined ? getPreview(key) : '—'}</span>
              <span className={styles.scoreMod}>{stdAssign[key] !== undefined && getPreview(key) !== null ? modStr(getPreview(key)!) : ''}</span>
            </div>
          ))}
          <div className={styles.scoresNote}>Available: {availStd.length > 0 ? availStd.join(', ') : 'all assigned ✓'}</div>
        </div>
      )}

      {method === 'pointbuy' && (
        <div className={styles.scoresGrid}>
          <div className={styles.pbBudget}>
            <span>Points remaining: </span>
            <strong style={{ color: pbLeft === 0 ? 'var(--success)' : pbLeft < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{pbLeft}</strong>
            <span> / {POINT_BUY_TOTAL}</span>
          </div>
          {ABILITY_KEYS.map(key => (
            <div key={key} className={styles.scoreRow}>
              <span className={styles.scoreKey}>{ABILITY_LABELS[key]}</span>
              <div className={styles.pbControls}>
                <button className={styles.pbBtn} onClick={() => adjustPb(key, -1)} disabled={pbScores[key] <= 8}>−</button>
                <span className={styles.pbValue}>{pbScores[key]}</span>
                <button className={styles.pbBtn} onClick={() => adjustPb(key, 1)} disabled={pbScores[key] >= 15 || pbLeft < (POINT_BUY_COST[pbScores[key] + 1] ?? 99) - (POINT_BUY_COST[pbScores[key]] ?? 0)}>+</button>
              </div>
              <span className={styles.scoreValue}>{getPreview(key)}</span>
              <span className={styles.scoreMod}>{modStr(getPreview(key)!)}</span>
            </div>
          ))}
        </div>
      )}

      {method === 'roll' && (
        <div className={styles.scoresGrid}>
          <div className={styles.rollActions}>
            <button className={styles.rollBtn} onClick={doRoll}>
              {rolled.length === 0 ? '🎲 Roll Scores' : '🎲 Reroll'}
            </button>
            {rolled.length > 0 && (
              <div className={styles.rolledValues}>
                {rolled.map((v, i) => {
                  const used = rollUsed.includes(v) && Object.values(rollAssign).indexOf(v) === rollUsed.indexOf(v)
                  return (
                    <span key={i} className={`${styles.rolledVal} ${used ? styles.rolledValUsed : ''}`}>{v}</span>
                  )
                })}
              </div>
            )}
          </div>
          {rolled.length > 0 && ABILITY_KEYS.map(key => (
            <div key={key} className={styles.scoreRow}>
              <span className={styles.scoreKey}>{ABILITY_LABELS[key]}</span>
              <div className={styles.scorePips}>
                {rolled.map((val, i) => {
                  const assigned = rollAssign[key] === val && Object.keys(rollAssign).find(k => rollAssign[k as AbilityScore] === val) === key
                  const taken = rollUsed.includes(val) && !assigned
                  return (
                    <button key={i}
                      className={`${styles.scorePip} ${assigned ? styles.scorePipSelected : ''} ${taken ? styles.scorePipTaken : ''}`}
                      disabled={taken}
                      onClick={() => assignRoll(key, assigned ? undefined : val)}
                    >{val}</button>
                  )
                })}
              </div>
              <span className={styles.scoreValue}>{rollAssign[key] !== undefined ? getPreview(key) : '—'}</span>
              <span className={styles.scoreMod}>{rollAssign[key] !== undefined && getPreview(key) !== null ? modStr(getPreview(key)!) : ''}</span>
            </div>
          ))}
        </div>
      )}

      {raceDef && Object.values(raceDef.abilityBonus).some(v => v) && (
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>Racial bonuses applied:</span>
          <span className={styles.infoValue}>
            {ABILITY_KEYS.filter(k => raceDef.abilityBonus[k]).map(k => `${ABILITY_LABELS[k]} +${raceDef.abilityBonus[k]}`).join(', ')}
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onBack}>← Back</button>
        <button type="button" className={styles.nextBtn} disabled={!canContinue} onClick={onNext}>Equipment →</button>
      </div>
    </div>
  )
}

// ── STEP 3: EQUIPMENT & SKILLS ──

function StepEquipment({
  basics, scores, armorId, setArmorId, hasShield, setHasShield,
  chosenSkills, setChosenSkills, onBack, onCreate,
}: {
  basics: Basics; scores: AbilityScores
  armorId: string; setArmorId: (v: string) => void
  hasShield: boolean; setHasShield: (v: boolean) => void
  chosenSkills: Skill[]; setChosenSkills: (v: Skill[]) => void
  onBack: () => void; onCreate: () => void
}) {
  const classDef = CLASS_BY_ID[basics.classId]
  const bgDef = BACKGROUND_BY_ID[basics.background]
  const equipment = { armorId: armorId === 'none' ? null : armorId, hasShield }
  const ac = computeAC({ abilityScores: scores, equipment, classId: basics.classId, race: basics.race })
  const maxHp = computeMaxHP(basics.classId, basics.level, scores.con)
  const speed = computeSpeed(basics.race)
  const raceDef = RACE_BY_ID[basics.race]

  const allowedArmor = ARMOR_LIST.filter(a => {
    if (a.type === 'none') return true
    return classDef?.armorProficiencies.includes(a.type as 'light' | 'medium' | 'heavy') ?? false
  })
  const canShield = classDef?.armorProficiencies.includes('shields') ?? false

  const bgSkills = new Set(bgDef?.skills ?? [])
  const classSkills = classDef?.skillOptions ?? []
  const skillsNeeded = classDef?.skillCount ?? 0
  const availableClassSkills = classSkills.filter(s => !bgSkills.has(s))

  function toggleSkill(s: Skill) {
    if (chosenSkills.includes(s)) {
      setChosenSkills(chosenSkills.filter(k => k !== s))
    } else if (chosenSkills.length < skillsNeeded) {
      setChosenSkills([...chosenSkills, s])
    }
  }

  const ready = chosenSkills.length === skillsNeeded || skillsNeeded === 0

  return (
    <div className={styles.stepContent}>
      {/* Calculated stats preview */}
      <div className={styles.statPreview}>
        <StatPreviewChip label="Max HP" value={maxHp} sub={`d${classDef?.hitDie} + CON×${basics.level}`} />
        <StatPreviewChip label="AC" value={ac} sub={armorId === 'none' ? 'unarmored' : (ARMOR_BY_ID[armorId]?.name ?? '')} />
        <StatPreviewChip label="Speed" value={`${speed}ft`} sub={raceDef?.label ?? basics.race} />
        <StatPreviewChip label="Initiative" value={modStr(mod(scores.dex))} sub="DEX mod" />
        <StatPreviewChip label="Prof." value={`+${profBonus(basics.level)}`} sub={`level ${basics.level}`} />
      </div>

      {/* Armor */}
      <div className={styles.equipSection}>
        <div className={styles.equipLabel}>Armor</div>
        <div className={styles.armorGrid}>
          {allowedArmor.map(a => (
            <button key={a.id}
              className={`${styles.armorOption} ${armorId === a.id ? styles.armorOptionSelected : ''}`}
              onClick={() => setArmorId(a.id)}
            >
              <span className={styles.armorName}>{a.name}</span>
              <span className={styles.armorAc}>AC {computeAC({ abilityScores: scores, equipment: { armorId: a.id === 'none' ? null : a.id, hasShield: false }, classId: basics.classId, race: basics.race })}</span>
              {a.type !== 'none' && <span className={styles.armorType}>{a.type}</span>}
            </button>
          ))}
        </div>
        {canShield && (
          <label className={styles.shieldToggle}>
            <input type="checkbox" checked={hasShield} onChange={e => setHasShield(e.target.checked)} />
            <span>Shield (+2 AC)</span>
          </label>
        )}
      </div>

      {/* Class skill choices */}
      {skillsNeeded > 0 && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            Class Skills — choose {skillsNeeded - chosenSkills.length > 0 ? `${skillsNeeded - chosenSkills.length} more` : '✓ done'}
          </div>
          <div className={styles.skillChoices}>
            {availableClassSkills.map(s => (
              <button key={s}
                className={`${styles.skillChoice} ${chosenSkills.includes(s) ? styles.skillChoiceSelected : ''} ${chosenSkills.length >= skillsNeeded && !chosenSkills.includes(s) ? styles.skillChoiceDisabled : ''}`}
                onClick={() => toggleSkill(s)}
              >
                {SKILL_BY_KEY[s]?.label}
              </button>
            ))}
          </div>
          {bgDef && (
            <div className={styles.infoBox}>
              <span className={styles.infoLabel}>Background ({bgDef.label}):</span>
              <span className={styles.infoValue}>{bgDef.skills.map(s => SKILL_BY_KEY[s]?.label).join(', ')}</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onBack}>← Back</button>
        <button type="button" className={styles.createBtn} disabled={!ready} onClick={onCreate}>
          Create Character
        </button>
      </div>
    </div>
  )
}

function StatPreviewChip({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className={styles.statPreviewChip}>
      <span className={styles.statPreviewLabel}>{label}</span>
      <span className={styles.statPreviewValue}>{value}</span>
      <span className={styles.statPreviewSub}>{sub}</span>
    </div>
  )
}

function modStr(score: number): string {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

// unused but keep for future
export { SKILLS }
