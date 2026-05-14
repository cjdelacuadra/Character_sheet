import { useState } from 'react'
import { useAppStore } from '@/app/store'
import type { Character, AbilityScores, AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS, SKILL_BY_KEY } from '@/shared/data/skills'
import { RACE_LABELS, RACE_BY_ID } from '@/shared/data/raceData'
import { CLASS_LABELS, CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASSES_BY_CLASS, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { weaponsForClass, type WeaponDef } from '@/shared/data/weaponData'
import { BACKGROUNDS, BACKGROUND_BY_ID } from '@/shared/data/backgrounds'
import { ARMOR_LIST, ARMOR_BY_ID } from '@/shared/data/armorData'
import {
  computeAC, computeMaxHP, computeSpeed, profBonus, mod,
  rollScoreSet, POINT_BUY_COST, POINT_BUY_TOTAL
} from '@/shared/data/charCalculations'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { spellsForClass, type SpellEntry } from '@/shared/data/spellData'
import { getResourceDefaults } from '@/shared/data/resourceDefaults'
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
                  <span className={styles.cardSub}>Level {char.level} {RACE_BY_ID[char.race]?.label ?? char.race} {char.classId}{char.subclass ? ` · ${SUBCLASS_BY_ID[char.subclass]?.label ?? char.subclass}` : ''}</span>
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
//  CREATE MODAL — 4 STEPS
// ─────────────────────────────────────────────────────────────

type Step = 'basics' | 'scores' | 'equipment' | 'spells'
type ScoreMethod = 'standard' | 'pointbuy' | 'roll'

interface Basics { name: string; playerName: string; alignment: string; race: string; classId: string; subclass?: string; background: string; level: number }

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (c: Character) => void }) {
  const [step, setStep] = useState<Step>('basics')
  const [basics, setBasics] = useState<Basics>({ name: '', playerName: '', alignment: '', race: 'Human', classId: 'Fighter', subclass: undefined, background: 'Soldier', level: 1 })

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
  const [chosenWeapons, setChosenWeapons] = useState<WeaponDef[]>([])

  // Step 4 state
  const [chosenSpells, setChosenSpells] = useState<string[]>([])

  // Variant Human free +1 picks
  const [freeAbilityPicks, setFreeAbilityPicks] = useState<AbilityScore[]>([])

  const classDef = CLASS_BY_ID[basics.classId]
  const raceDef = RACE_BY_ID[basics.race]
  const bgDef = BACKGROUND_BY_ID[basics.background]
  const isSpellcaster = classDef?.isSpellcaster ?? false
  const steps: Step[] = isSpellcaster ? ['basics', 'scores', 'equipment', 'spells'] : ['basics', 'scores', 'equipment']

  function getScores(): AbilityScores {
    const base: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
    if (method === 'standard') {
      ABILITY_KEYS.forEach(k => { if (stdAssign[k] !== undefined) base[k] = stdAssign[k]! })
    } else if (method === 'pointbuy') {
      ABILITY_KEYS.forEach(k => { base[k] = pbScores[k] })
    } else {
      ABILITY_KEYS.forEach(k => { if (rollAssign[k] !== undefined) base[k] = rollAssign[k]! })
    }
    if (raceDef?.abilityBonus) {
      ABILITY_KEYS.forEach(k => { base[k] = (base[k] || 10) + (raceDef.abilityBonus[k] ?? 0) })
    }
    freeAbilityPicks.forEach(k => { base[k] = (base[k] || 10) + 1 })
    return base
  }

  function buildCharacter(): Character {
    const scores = getScores()
    const equipment = { armorId: armorId === 'none' ? null : armorId, hasShield, shieldId: hasShield ? 'shield-generic' : null }
    const charBase = { abilityScores: scores, equipment, classId: basics.classId, race: basics.race, subclass: basics.subclass }
    const ac = computeAC(charBase)
    const bonusHpPerLevel = RACE_BY_ID[basics.race]?.bonusHpPerLevel ?? 0
    const maxHp = computeMaxHP(basics.classId, basics.level, scores.con, bonusHpPerLevel)
    const speed = computeSpeed(basics.race)
    const dexMod = mod(scores.dex)
    const prof = profBonus(basics.level)

    const skillProf: Partial<Record<Skill, 'proficient' | 'expert'>> = {}
    bgDef?.skills.forEach(s => { skillProf[s] = 'proficient' })
    chosenSkills.forEach(s => { skillProf[s] = 'proficient' })

    const resources = getResourceDefaults(basics.classId, basics.level, scores)

    const weapons = chosenWeapons.map(w => ({
      id: w.id,
      name: w.name,
      atkBonus: 0,
      damage: w.damageDie,
      damageType: w.damageType,
      rangeType: w.rangeType,
      properties: w.properties,
      enchantmentBonus: w.enchantmentBonus || undefined,
      bonusDamageDie: w.bonusDamageDie,
      bonusDamageType: w.bonusDamageType,
    }))

    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      schemaVersion: 2,
      createdAt: now,
      updatedAt: now,
      name: basics.name.trim(),
      playerName: basics.playerName.trim() || undefined,
      alignment: basics.alignment || undefined,
      race: basics.race,
      classId: basics.classId,
      subclass: basics.subclass,
      background: basics.background,
      level: basics.level,
      experiencePoints: 0,
      abilityScores: scores,
      hitPoints: { current: maxHp, max: maxHp, temp: 0 },
      armorClass: ac,
      speed,
      initiative: dexMod,
      proficiencyBonus: prof,
      bonusHpPerLevel,
      equipment,
      savingThrowProficiencies: classDef ? [...classDef.savingThrows] : [],
      skillProficiencies: skillProf,
      spellIds: chosenSpells,
      preparedSpellIds: [],
      concentrationSpellId: null,
      spellSlots: defaultSpellSlots(basics.classId, basics.level),
      weapons,
      conditionIds: [],
      resources,
      deathSaves: { successes: 0, failures: 0 },
      inspiration: 0,
      hitDiceUsed: 0,
      feats: [],
      notes: '',
    }
  }

  function goToEquipment() {
    setStep('equipment')
    // Reset spell choices if class changed to non-caster
    if (!CLASS_BY_ID[basics.classId]?.isSpellcaster) setChosenSpells([])
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Character</h2>
          <StepPips current={step} steps={steps} />
        </div>

        {step === 'basics' && (
          <StepBasics
            value={basics}
            onChange={(v) => { setBasics(v); if (v.classId !== basics.classId) setChosenSpells([]); if (v.race !== basics.race) setFreeAbilityPicks([]) }}
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
            freeAbilityPicks={freeAbilityPicks}
            setFreeAbilityPicks={setFreeAbilityPicks}
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
            chosenWeapons={chosenWeapons} setChosenWeapons={setChosenWeapons}
            onBack={() => setStep('scores')}
            onNext={isSpellcaster ? () => setStep('spells') : undefined}
            onCreate={isSpellcaster ? undefined : () => onCreate(buildCharacter())}
          />
        )}

        {step === 'spells' && (
          <StepSpells
            basics={basics}
            scores={getScores()}
            chosenSpells={chosenSpells}
            setChosenSpells={setChosenSpells}
            onBack={goToEquipment}
            onCreate={() => onCreate(buildCharacter())}
          />
        )}
      </div>
    </div>
  )
}

function StepPips({ current, steps }: { current: Step; steps: Step[] }) {
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
  const set = (k: keyof Basics, v: string | number | undefined) => onChange({ ...value, [k]: v })
  const subclassOptions = SUBCLASSES_BY_CLASS[value.classId] ?? []
  const subclassRequired = subclassOptions.length > 0 && subclassOptions[0].unlocksAtLevel <= value.level
  const canAdvance = !!value.name.trim() && (!subclassRequired || !!value.subclass)
  return (
    <div className={styles.stepContent}>
      <div className={styles.form}>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Character Name</span>
            <input className={styles.input} value={value.name} onChange={e => set('name', e.target.value)} placeholder="Character name" autoFocus />
          </label>
          <label className={styles.field}>
            <span>Player Name</span>
            <input className={styles.input} value={value.playerName} onChange={e => set('playerName', e.target.value)} placeholder="Your name (optional)" />
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Alignment</span>
            <select className={styles.input} value={value.alignment} onChange={e => set('alignment', e.target.value)}>
              <option value="">— None —</option>
              {['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','True Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Race</span>
            <select className={styles.input} value={value.race} onChange={e => set('race', e.target.value)}>
              {RACE_LABELS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Class</span>
            <select className={styles.input} value={value.classId} onChange={e => {
              const newClassId = e.target.value
              const opts = SUBCLASSES_BY_CLASS[newClassId] ?? []
              const required = opts.length > 0 && opts[0].unlocksAtLevel <= value.level
              onChange({ ...value, classId: newClassId, subclass: required ? opts[0].id : undefined })
            }}>
              {CLASS_LABELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        {subclassOptions.length > 0 && (
          <label className={styles.field}>
            <span>
              Subclass
              {subclassRequired
                ? ' (required)'
                : ` (unlocks at level ${subclassOptions[0].unlocksAtLevel})`}
            </span>
            <select className={styles.input} value={value.subclass ?? ''} onChange={e => set('subclass', e.target.value || undefined)}>
              {!subclassRequired && <option value="">— None —</option>}
              {subclassOptions.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
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
              onChange={e => {
                const newLevel = Math.min(20, Math.max(1, Number(e.target.value)))
                const opts = SUBCLASSES_BY_CLASS[value.classId] ?? []
                const required = opts.length > 0 && opts[0].unlocksAtLevel <= newLevel
                const newSubclass = required && !value.subclass ? opts[0].id : value.subclass
                onChange({ ...value, level: newLevel, subclass: newSubclass })
              }} />
          </label>
        </div>
        {/* Background preview */}
        {BACKGROUND_BY_ID[value.background] && (
          <div className={styles.infoBox}>
            <span className={styles.infoLabel}>Background skills:</span>
            <span className={styles.infoValue}>
              {BACKGROUND_BY_ID[value.background].skills.map(s => SKILL_BY_KEY[s]?.label).join(', ')}
            </span>
            {BACKGROUND_BY_ID[value.background].feat && (
              <>
                <span className={styles.infoLabel} style={{ marginTop: 4 }}>Background feat:</span>
                <span className={styles.infoValue}>{BACKGROUND_BY_ID[value.background].feat}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button type="button" className={styles.nextBtn} disabled={!canAdvance} onClick={onNext}>
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
  freeAbilityPicks, setFreeAbilityPicks,
  onBack, onNext,
}: {
  method: ScoreMethod; setMethod: (m: ScoreMethod) => void
  stdAssign: Partial<Record<AbilityScore, number>>; setStdAssign: (v: Partial<Record<AbilityScore, number>>) => void
  pbScores: Record<AbilityScore, number>; setPbScores: (v: Record<AbilityScore, number>) => void
  rolled: number[]; setRolled: (v: number[]) => void
  rollAssign: Partial<Record<AbilityScore, number>>; setRollAssign: (v: Partial<Record<AbilityScore, number>>) => void
  raceDef?: typeof RACE_BY_ID[string]
  freeAbilityPicks: AbilityScore[]; setFreeAbilityPicks: (v: AbilityScore[]) => void
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

  const freePointsDone = !raceDef?.freeAbilityPoints || freeAbilityPicks.length >= raceDef.freeAbilityPoints
  const canContinue = (method === 'standard' ? stdComplete : method === 'pointbuy' ? true : rollComplete) && freePointsDone

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

      {raceDef?.freeAbilityPoints && (
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>
            {raceDef.label}: choose {raceDef.freeAbilityPoints} abilities to gain +1
            ({freeAbilityPicks.length}/{raceDef.freeAbilityPoints} chosen)
          </span>
          <div className={styles.scorePips} style={{ marginTop: 6 }}>
            {ABILITY_KEYS.map(k => {
              if (raceDef.id === 'HalfElf' && k === 'cha') return null
              const picked = freeAbilityPicks.includes(k)
              const maxReached = freeAbilityPicks.length >= raceDef.freeAbilityPoints! && !picked
              return (
                <button
                  key={k}
                  className={`${styles.scorePip} ${picked ? styles.scorePipSelected : ''} ${maxReached ? styles.scorePipTaken : ''}`}
                  disabled={maxReached}
                  onClick={() => {
                    if (picked) setFreeAbilityPicks(freeAbilityPicks.filter(x => x !== k))
                    else setFreeAbilityPicks([...freeAbilityPicks, k])
                  }}
                >{ABILITY_LABELS[k]}</button>
              )
            })}
          </div>
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
  chosenSkills, setChosenSkills, chosenWeapons, setChosenWeapons,
  onBack, onNext, onCreate,
}: {
  basics: Basics; scores: AbilityScores
  armorId: string; setArmorId: (v: string) => void
  hasShield: boolean; setHasShield: (v: boolean) => void
  chosenSkills: Skill[]; setChosenSkills: (v: Skill[]) => void
  chosenWeapons: WeaponDef[]; setChosenWeapons: (v: WeaponDef[]) => void
  onBack: () => void; onNext?: () => void; onCreate?: () => void
}) {
  const classDef = CLASS_BY_ID[basics.classId]
  const bgDef = BACKGROUND_BY_ID[basics.background]
  const equipment = { armorId: armorId === 'none' ? null : armorId, hasShield, shieldId: hasShield ? 'shield-generic' : null }
  const bonusHpPerLevel = RACE_BY_ID[basics.race]?.bonusHpPerLevel ?? 0
  const ac = computeAC({ abilityScores: scores, equipment, classId: basics.classId, race: basics.race, subclass: basics.subclass })
  const maxHp = computeMaxHP(basics.classId, basics.level, scores.con, bonusHpPerLevel)
  const speed = computeSpeed(basics.race)
  const raceDef = RACE_BY_ID[basics.race]
  const subclassDef = basics.subclass ? SUBCLASS_BY_ID[basics.subclass] : undefined

  const effectiveArmorProfs = [
    ...(classDef?.armorProficiencies ?? []),
    ...(subclassDef?.extraArmorProficiencies ?? []),
  ]
  const allowedArmor = ARMOR_LIST.filter(a => {
    if (a.type === 'none') return true
    if (a.enchantmentBonus) return false  // magic items are DM-granted, not chosen at creation
    return effectiveArmorProfs.includes(a.type as 'light' | 'medium' | 'heavy')
  })
  const canShield = effectiveArmorProfs.includes('shields')

  const availableWeapons = weaponsForClass(classDef?.weaponProficiencies ?? [])
  function toggleWeapon(w: WeaponDef) {
    if (chosenWeapons.find(cw => cw.id === w.id)) {
      setChosenWeapons(chosenWeapons.filter(cw => cw.id !== w.id))
    } else {
      setChosenWeapons([...chosenWeapons, w])
    }
  }

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
        <StatPreviewChip label="Max HP" value={maxHp} sub={bonusHpPerLevel ? `d${classDef?.hitDie} + CON + ${bonusHpPerLevel}/lvl` : `d${classDef?.hitDie} + CON×${basics.level}`} />
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
              <span className={styles.armorAc}>AC {computeAC({ abilityScores: scores, equipment: { armorId: a.id === 'none' ? null : a.id, hasShield: false, shieldId: null }, classId: basics.classId, race: basics.race, subclass: basics.subclass })}</span>
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

      {/* Weapons */}
      <div className={styles.equipSection}>
        <div className={styles.equipLabel}>Starting Weapons — choose any (can add more later)</div>
        <div className={styles.weaponGrid}>
          {availableWeapons.map(w => {
            const chosen = !!chosenWeapons.find(cw => cw.id === w.id)
            return (
              <button key={w.id}
                className={`${styles.weaponOption} ${chosen ? styles.weaponOptionSelected : ''}`}
                onClick={() => toggleWeapon(w)}
              >
                <span className={styles.weaponName}>{w.name}</span>
                <span className={styles.weaponDmg}>{w.damageDie} {w.damageType}</span>
                <span className={styles.weaponRange}>{w.rangeType}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.cancelBtn} onClick={onBack}>← Back</button>
        {onNext && (
          <button type="button" className={styles.nextBtn} disabled={!ready} onClick={onNext}>
            Spells →
          </button>
        )}
        {onCreate && (
          <button type="button" className={styles.createBtn} disabled={!ready} onClick={onCreate}>
            Create Character
          </button>
        )}
      </div>
    </div>
  )
}

// ── STEP 4: SPELLS ──

function StepSpells({
  basics, scores, chosenSpells, setChosenSpells, onBack, onCreate,
}: {
  basics: Basics; scores: AbilityScores
  chosenSpells: string[]; setChosenSpells: (v: string[]) => void
  onBack: () => void; onCreate: () => void
}) {
  const [search, setSearch] = useState('')
  const cls = CLASS_BY_ID[basics.classId]
  const availableSpells = spellsForClass(basics.classId)

  // Determine how many cantrips and spells the player can pick
  const cantripsKnownTable = cls?.cantripsKnownTable ?? {}
  let cantripsAllowed = 0
  for (let l = 1; l <= basics.level; l++) {
    if (cantripsKnownTable[l] !== undefined) cantripsAllowed = cantripsKnownTable[l]!
  }

  const spellsKnownTable = cls?.spellsKnownTable ?? {}
  let spellsAllowed = 0
  if (cls?.prepareSpells) {
    // Prepared casters: WIS/INT mod + level (approximate)
    const abilityKey = cls.spellcastingAbility
    const abilityMod = abilityKey ? mod(scores[abilityKey]) : 0
    spellsAllowed = Math.max(1, basics.level + abilityMod)
  } else {
    for (let l = 1; l <= basics.level; l++) {
      if (spellsKnownTable[l] !== undefined) spellsAllowed = spellsKnownTable[l]!
    }
  }

  const chosenCantrips = chosenSpells.filter(id => availableSpells.find(s => s.id === id)?.level === 0)
  const chosenLeveled = chosenSpells.filter(id => (availableSpells.find(s => s.id === id)?.level ?? 0) > 0)

  function toggleSpell(spell: SpellEntry) {
    const isChosen = chosenSpells.includes(spell.id)
    if (isChosen) {
      setChosenSpells(chosenSpells.filter(id => id !== spell.id))
      return
    }
    if (spell.level === 0) {
      if (chosenCantrips.length >= cantripsAllowed) return
    } else {
      if (chosenLeveled.length >= spellsAllowed) return
    }
    setChosenSpells([...chosenSpells, spell.id])
  }

  const filtered = availableSpells.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))

  const cantrips = filtered.filter(s => s.level === 0)
  const leveled = filtered.filter(s => s.level > 0)

  function renderSpellList(list: SpellEntry[], limit: number, chosen: string[]) {
    return list.map(s => {
      const selected = chosenSpells.includes(s.id)
      const full = !selected && chosen.length >= limit
      return (
        <button
          key={s.id}
          className={`${styles.spellChoice} ${selected ? styles.spellChoiceSelected : ''} ${full ? styles.spellChoiceDisabled : ''}`}
          onClick={() => toggleSpell(s)}
          disabled={full}
        >
          <span className={styles.spellChoiceName}>{s.name}</span>
          <span className={styles.spellChoiceMeta}>{s.school} · {s.castingTime}{s.concentration ? ' · C' : ''}</span>
        </button>
      )
    })
  }

  const ready = true // always can create (spells optional)

  return (
    <div className={styles.stepContent}>
      <input
        className={styles.input}
        type="search"
        placeholder="Search spells…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      {cantripsAllowed > 0 && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            Cantrips — choose {cantripsAllowed - chosenCantrips.length > 0
              ? `${cantripsAllowed - chosenCantrips.length} more`
              : `✓ ${chosenCantrips.length}/${cantripsAllowed}`}
          </div>
          <div className={styles.skillChoices}>
            {renderSpellList(cantrips, cantripsAllowed, chosenCantrips)}
          </div>
        </div>
      )}

      {spellsAllowed > 0 && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            {cls?.prepareSpells ? 'Prepared Spells' : 'Known Spells'} — choose {spellsAllowed - chosenLeveled.length > 0
              ? `${spellsAllowed - chosenLeveled.length} more`
              : `✓ ${chosenLeveled.length}/${spellsAllowed}`}
          </div>
          <div className={styles.skillChoices}>
            {renderSpellList(leveled, spellsAllowed, chosenLeveled)}
          </div>
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
