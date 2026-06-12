import { useEffect, useState } from 'react'
import { useAppStore } from '@/app/store'
import { useTheme } from '@/app/ThemeContext'
import type { Character, AbilityScores, AbilityScore } from '@/entities/character/types'
import type { Skill } from '@/shared/data/skills'
import { SKILLS, SKILL_BY_KEY } from '@/shared/data/skills'
import { RACE_LABELS, RACE_BY_ID } from '@/shared/data/raceData'
import { CLASS_LABELS, CLASS_BY_ID } from '@/shared/data/classData'
import { SUBCLASSES_BY_CLASS, SUBCLASS_BY_ID, LAND_CIRCLE_TERRAINS, type LandCircleTerrain } from '@/shared/data/subclassData'
import { weaponsForClass, type WeaponDef } from '@/shared/data/equipment/weapons'
import { FEATS, FEAT_BY_ID } from '@/shared/data/featsData'
import { FIGHTING_STYLES, FIGHTING_STYLE_CLASSES } from '@/shared/data/fightingStylesData'
import { BACKGROUNDS, BACKGROUND_BY_ID } from '@/shared/data/backgrounds'
import { GEAR_BY_ID, armorAndShields } from '@/shared/data/equipment/gear'
import {
  computeAC, computeMaxHP, computeSpeed, computeInitiative, profBonus, mod,
  rollScoreSet, POINT_BUY_COST, POINT_BUY_TOTAL
} from '@/shared/data/charCalculations'
import { defaultSpellSlots } from '@/shared/data/spellSlots'
import { SPELLS, getSelectableSpells, type SpellEntry } from '@/shared/data/spellData'
import { getResourceDefaults } from '@/shared/data/resourceDefaults'
import styles from './CharacterSelectScreen.module.css'

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

export function CharacterSelectScreen() {
  const { characters, setActiveCharacter, addCharacter, deleteCharacter } = useAppStore()
  const { theme, toggle } = useTheme()
  const [showCreate, setShowCreate] = useState(false)
  const characterList = Object.values(characters)

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Characters</h1>
        <div className={styles.headerRight}>
          <button className={styles.themeBtn} onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? '☀ Light' : '◑ Dark'}
          </button>
          <button className={styles.createBtn} onClick={() => setShowCreate(true)}>+ New Character</button>
        </div>
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
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(chars) => {
            const arr = Array.isArray(chars) ? chars : [chars]
            arr.forEach(c => addCharacter(c))
            setActiveCharacter(arr[0].id)
          }}
        />
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

interface Basics { name: string; playerName: string; alignment: string; race: string; classId: string; subclass?: string; background: string; level: number; startingGold: number }

/** Default starting gold for a given level: 10 + 10 per level (campaigns can override). */
function defaultStartingGold(level: number): number { return 10 + 10 * level }

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (c: Character | Character[]) => void }) {
  const [step, setStep] = useState<Step>('basics')
  const [basics, setBasics] = useState<Basics>({ name: '', playerName: '', alignment: '', race: 'Human', classId: 'Fighter', subclass: undefined, background: 'Soldier', level: 1, startingGold: defaultStartingGold(1) })

  // Step 2 state
  const [method, setMethod] = useState<ScoreMethod>('standard')
  const [stdAssign, setStdAssign] = useState<Partial<Record<AbilityScore, number>>>({})
  const [pbScores, setPbScores] = useState<Record<AbilityScore, number>>({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })
  const [rolled, setRolled] = useState<number[]>([])
  const [rollAssign, setRollAssign] = useState<Partial<Record<AbilityScore, number>>>({})

  // Step 3 state
  const [armorId, setArmorId] = useState<string>('none')
  const [shieldId, setShieldId] = useState<string | null>(null)
  const [chosenSkills, setChosenSkills] = useState<Skill[]>([])
  const [chosenExpertise, setChosenExpertise] = useState<Skill[]>([])
  const [chosenSubclassSkills, setChosenSubclassSkills] = useState<Skill[]>([])
  const [chosenLandTerrain, setChosenLandTerrain] = useState<LandCircleTerrain | undefined>(undefined)
  const [chosenWeapons, setChosenWeapons] = useState<WeaponDef[]>([])

  // Step 4 state
  const [chosenSpells, setChosenSpells] = useState<string[]>([])

  // Variant Human free +1 picks
  const [freeAbilityPicks, setFreeAbilityPicks] = useState<AbilityScore[]>([])
  const [chosenFeat, setChosenFeat] = useState<string | undefined>()
  const [chosenFeatAbility, setChosenFeatAbility] = useState<AbilityScore | null>(null)
  const [chosenFightingStyle, setChosenFightingStyle] = useState<string | undefined>()

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
      ABILITY_KEYS.forEach(k => { if (rollAssign[k] !== undefined) base[k] = rolled[rollAssign[k]!] })
    }
    if (raceDef?.abilityBonus) {
      ABILITY_KEYS.forEach(k => { base[k] = (base[k] || 10) + (raceDef.abilityBonus[k] ?? 0) })
    }
    freeAbilityPicks.forEach(k => { base[k] = (base[k] || 10) + 1 })
    if (chosenFeat) {
      const featDef = FEAT_BY_ID[chosenFeat]
      if (featDef?.abilityBonus) {
        ABILITY_KEYS.forEach(k => { base[k] = (base[k] || 10) + (featDef.abilityBonus![k] ?? 0) })
      }
      if (featDef?.abilityChoice && chosenFeatAbility) {
        base[chosenFeatAbility] = Math.min(20, (base[chosenFeatAbility] || 10) + 1)
      }
    }
    return base
  }

  function buildCharacter(): Character {
    const testName = basics.name.trim().toLowerCase()
    const isTestSpells  = testName.includes('test spells')
    const isTestActions = testName.includes('test actions')
    const isTestMode    = isTestSpells || isTestActions

    const scores = isTestMode
      ? { str: 20, dex: 20, con: 20, int: 20, wis: 20, cha: 20 }
      : getScores()
    const equipment = {
      armorId: armorId === 'none' ? null : armorId,
      hasShield: !!shieldId,
      shieldId,
      helmetId: null, necklaceId: null, capeId: null,
      legsId: null, bootsId: null, glovesId: null, quiverId: null,
      ring1Id: null, ring2Id: null, amuletId: null,
    }
    const charBase = { abilityScores: scores, equipment, classId: basics.classId, race: basics.race, subclass: basics.subclass }
    const ac = computeAC(charBase)
    const raceBonusHp = RACE_BY_ID[basics.race]?.bonusHpPerLevel ?? 0
    const toughBonus = chosenFeat === 'tough' ? 2 : 0
    const bonusHpPerLevel = raceBonusHp + toughBonus
    const mobileBonus = chosenFeat === 'mobile' ? 10 : 0
    const maxHp = computeMaxHP(basics.classId, basics.level, scores.con, bonusHpPerLevel)
    const speed = computeSpeed(basics.race) + mobileBonus
    const prof = profBonus(basics.level)
    const allFeats = chosenFeat ? [chosenFeat] : []
    const initiative = computeInitiative(scores, basics.classId, basics.level, prof, allFeats, basics.subclass)

    const skillProf: Partial<Record<Skill, 'proficient' | 'expert'>> = {}
    bgDef?.skills.forEach(s => { skillProf[s] = 'proficient' })
    chosenSkills.forEach(s => { skillProf[s] = 'proficient' })
    // Subclass-granted skill proficiencies (fixed grants + player choice picks).
    const subclassDefForBuild = basics.subclass ? SUBCLASS_BY_ID[basics.subclass] : undefined
    subclassDefForBuild?.extraSkillProficiencies?.forEach(s => { skillProf[s] = 'proficient' })
    chosenSubclassSkills.forEach(s => { skillProf[s] = 'proficient' })
    // Only promote expertise for skills the character is actually proficient in
    chosenExpertise.forEach(s => { if (skillProf[s]) skillProf[s] = 'expert' })

    const resources = getResourceDefaults(basics.classId, basics.level, scores)

    // Sort chosen weapons by average damage so the highest-damage weapon
    // lands at slot 0 (main hand). Parse "NdM" then NdM-style damage dice;
    // average per die = (M+1)/2. Bonus dice contribute too.
    function avgDamage(w: WeaponDef): number {
      const parse = (expr?: string): number => {
        if (!expr) return 0
        const m = expr.match(/^(\d+)d(\d+)$/)
        if (!m) return 0
        const count = parseInt(m[1], 10)
        const face = parseInt(m[2], 10)
        return count * (face + 1) / 2
      }
      return parse(w.damageDie) + parse(w.bonusDamageDie) + (w.enchantmentBonus ?? 0)
    }
    const sortedWeapons = [...chosenWeapons].sort((a, b) => avgDamage(b) - avgDamage(a))
    const weapons = sortedWeapons.map(w => ({
      id: w.id,
      name: w.name,
      atkBonus: 0,
      damage: w.damageDie,
      damageType: w.damageType,
      rangeType: w.rangeType,
      properties: w.properties,
      enchantmentBonus: w.enchantmentBonus || undefined,
      enchantment: w.enchantment,
      bonusDamageDie: w.bonusDamageDie ?? (w.enchantment ? '1d6' : undefined),
      bonusDamageType: w.bonusDamageType ?? w.enchantment ?? undefined,
    }))

    // Creation equipment is a free starting kit — starting gold comes from the selector.

    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      schemaVersion: 10,
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
      initiative,
      proficiencyBonus: prof,
      bonusHpPerLevel,
      equipment,
      savingThrowProficiencies: classDef ? [...classDef.savingThrows] : [],
      skillProficiencies: skillProf,
      spellIds: (() => {
        const raceDef = RACE_BY_ID[basics.race]
        const allRacialSpells: string[] = []
        if (raceDef?.racialSpells) {
          for (const [lvl, ids] of Object.entries(raceDef.racialSpells)) {
            if (Number(lvl) <= basics.level) allRacialSpells.push(...(ids ?? []))
          }
        }
        if (isTestSpells) {
          return [...new Set([...SPELLS.map(s => s.id), ...allRacialSpells])]
        }
        return [...new Set([...chosenSpells, ...allRacialSpells])]
      })(),
      preparedSpellIds: [],
      concentrationSpellId: null,
      spellSlots: isTestSpells
        ? Object.fromEntries([1,2,3,4,5,6,7,8,9].map(lvl => [lvl, { used: 0, total: 4 }]))
        : defaultSpellSlots(basics.classId, basics.level, basics.subclass ?? undefined),
      weapons,
      conditionIds: [],
      resources,
      deathSaves: { successes: 0, failures: 0 },
      inspiration: 0,
      hitDiceUsed: 0,
      feats: chosenFeat ? [chosenFeat] : [],
      fightingStyle: chosenFightingStyle,
      completedAsiLevels: [],
      gold: isTestMode ? 10000 : basics.startingGold,
      ownedItemIds: [],
      activeSummons: [],
      circleOfLandTerrain: basics.subclass === 'CircleOfTheLand' && basics.level >= 3 ? chosenLandTerrain : undefined,
      notes: '',
    }
  }

  function buildTestClassBatch(base: Character): Character[] {
    const subclasses = SUBCLASSES_BY_CLASS[base.classId] ?? []
    const now = new Date().toISOString()
    const level = 3
    const prof = profBonus(level)
    return subclasses.map(sc => {
      const maxHp = computeMaxHP(base.classId, level, base.abilityScores.con, base.bonusHpPerLevel)
      return {
        ...base,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        name: `${base.name} — ${sc.label}`,
        subclass: sc.id,
        level,
        proficiencyBonus: prof,
        hitPoints: { current: maxHp, max: maxHp, temp: 0 },
        resources: getResourceDefaults(base.classId, level, base.abilityScores),
        spellSlots: defaultSpellSlots(base.classId, level, sc.id),
      }
    })
  }

  function isTestClassMode(): boolean {
    const n = basics.name.trim().toLowerCase()
    return n.startsWith('test') && !n.includes('test spells') && !n.includes('test actions')
  }

  function submit() {
    const base = buildCharacter()
    onCreate(isTestClassMode() ? buildTestClassBatch(base) : base)
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
            onChange={(v) => { setBasics(v); if (v.classId !== basics.classId) { setChosenSpells([]); setChosenFightingStyle(undefined) } if (v.race !== basics.race) { setFreeAbilityPicks([]); setChosenFeat(undefined) } }}
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
            chosenFeat={chosenFeat}
            setChosenFeat={setChosenFeat}
            chosenFeatAbility={chosenFeatAbility}
            setChosenFeatAbility={setChosenFeatAbility}
            onBack={() => setStep('basics')}
            onNext={() => setStep('equipment')}
          />
        )}

        {step === 'equipment' && (
          <StepEquipment
            basics={basics}
            scores={getScores()}
            armorId={armorId} setArmorId={setArmorId}
            shieldId={shieldId} setShieldId={setShieldId}
            chosenSkills={chosenSkills} setChosenSkills={setChosenSkills}
            chosenExpertise={chosenExpertise} setChosenExpertise={setChosenExpertise}
            chosenSubclassSkills={chosenSubclassSkills} setChosenSubclassSkills={setChosenSubclassSkills}
            chosenLandTerrain={chosenLandTerrain} setChosenLandTerrain={setChosenLandTerrain}
            chosenWeapons={chosenWeapons} setChosenWeapons={setChosenWeapons}
            chosenFightingStyle={chosenFightingStyle} setChosenFightingStyle={setChosenFightingStyle}
            onBack={() => setStep('scores')}
            onNext={isSpellcaster ? () => setStep('spells') : undefined}
            onCreate={isSpellcaster ? undefined : submit}
          />
        )}

        {step === 'spells' && (
          <StepSpells
            basics={basics}
            scores={getScores()}
            chosenSpells={chosenSpells}
            setChosenSpells={setChosenSpells}
            onBack={goToEquipment}
            onCreate={submit}
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
                // Resync the starting-gold default to the new level (override it afterward if desired).
                onChange({ ...value, level: newLevel, subclass: newSubclass, startingGold: defaultStartingGold(newLevel) })
              }} />
          </label>
          <label className={styles.field}>
            <span>Starting Gold</span>
            <input className={styles.input} type="number" min={0} value={value.startingGold}
              onChange={e => set('startingGold', Math.max(0, Number(e.target.value)))} />
          </label>
        </div>
        {/* Race preview */}
        {RACE_BY_ID[value.race] && (() => {
          const raceDef = RACE_BY_ID[value.race]
          const bonusEntries = ABILITY_KEYS.filter(k => raceDef.abilityBonus[k])
          return (
            <div className={styles.infoBox}>
              <span className={styles.infoLabel}>{raceDef.label}</span>
              {bonusEntries.length > 0 && (
                <span className={styles.infoValue}>
                  Ability bonuses: {bonusEntries.map(k => `${ABILITY_LABELS[k]} +${raceDef.abilityBonus[k]}`).join(', ')}
                </span>
              )}
              {raceDef.freeAbilityPoints && (
                <span className={styles.infoValue}>
                  + {raceDef.freeAbilityPoints} free ability point{raceDef.freeAbilityPoints > 1 ? 's' : ''} (chosen in Step 2)
                </span>
              )}
              <span className={styles.infoValue} style={{ marginTop: 4 }}>
                Speed {raceDef.speed} ft · Size {raceDef.size}
              </span>
              {raceDef.traits.length > 0 && (
                <span className={styles.infoValue} style={{ marginTop: 4, fontStyle: 'italic' }}>
                  {raceDef.traits.join(' · ')}
                </span>
              )}
            </div>
          )
        })()}
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
  chosenFeat, setChosenFeat,
  chosenFeatAbility, setChosenFeatAbility,
  onBack, onNext,
}: {
  method: ScoreMethod; setMethod: (m: ScoreMethod) => void
  stdAssign: Partial<Record<AbilityScore, number>>; setStdAssign: (v: Partial<Record<AbilityScore, number>>) => void
  pbScores: Record<AbilityScore, number>; setPbScores: (v: Record<AbilityScore, number>) => void
  rolled: number[]; setRolled: (v: number[]) => void
  rollAssign: Partial<Record<AbilityScore, number>>; setRollAssign: (v: Partial<Record<AbilityScore, number>>) => void
  raceDef?: typeof RACE_BY_ID[string]
  freeAbilityPicks: AbilityScore[]; setFreeAbilityPicks: (v: AbilityScore[]) => void
  chosenFeat: string | undefined; setChosenFeat: (id: string | undefined) => void
  chosenFeatAbility: AbilityScore | null; setChosenFeatAbility: (v: AbilityScore | null) => void
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
    setRolled(rollScoreSet().sort((a, b) => b - a))
    setRollAssign({})
  }

  function assignRoll(key: AbilityScore, idx: number | undefined) {
    const next = { ...rollAssign }
    if (idx === undefined) { delete next[key]; setRollAssign(next); return }
    for (const k of ABILITY_KEYS) if (next[k] === idx) delete next[k]
    next[key] = idx
    setRollAssign(next)
  }

  const rollUsedIndices = new Set(Object.values(rollAssign).filter((v): v is number => v !== undefined))
  const rollComplete = rolled.length === 6 && ABILITY_KEYS.every(k => rollAssign[k] !== undefined)

  const freePointsDone = !raceDef?.freeAbilityPoints || freeAbilityPicks.length >= raceDef.freeAbilityPoints
  const featDone = !raceDef?.freeFeat || !!chosenFeat
  const featAbilityDone = !chosenFeat || !FEAT_BY_ID[chosenFeat]?.abilityChoice || !!chosenFeatAbility
  const canContinue = (method === 'standard' ? stdComplete : method === 'pointbuy' ? true : rollComplete) && freePointsDone && featDone && featAbilityDone

  function getPreview(k: AbilityScore): number | null {
    // Base score for the chosen method
    let base: number | null
    if (method === 'standard') base = stdAssign[k] !== undefined ? stdAssign[k]! : null
    else if (method === 'pointbuy') base = pbScores[k]
    else base = rollAssign[k] !== undefined ? rolled[rollAssign[k]!] : null
    if (base === null) return null
    // Mirror getScores(): fixed racial bonus + free racial picks (Half-Elf +1×2) + feat bonuses
    let score = base + racialBonus(k)
    if (freeAbilityPicks.includes(k)) score += 1
    const featDef = chosenFeat ? FEAT_BY_ID[chosenFeat] : undefined
    if (featDef?.abilityBonus?.[k]) score += featDef.abilityBonus[k]!
    if (featDef?.abilityChoice && chosenFeatAbility === k) score = Math.min(20, score + 1)
    return score
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
                  const used = rollUsedIndices.has(i)
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
                  const assigned = rollAssign[key] === i
                  const taken = rollUsedIndices.has(i) && !assigned
                  return (
                    <button key={i}
                      className={`${styles.scorePip} ${assigned ? styles.scorePipSelected : ''} ${taken ? styles.scorePipTaken : ''}`}
                      disabled={taken}
                      onClick={() => assignRoll(key, assigned ? undefined : i)}
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

      {raceDef?.freeFeat && (
        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>
            {raceDef.label}: choose one feat
            {chosenFeat ? ' ✓' : ' (required)'}
          </span>
          <select
            className={styles.input}
            value={chosenFeat ?? ''}
            onChange={e => { setChosenFeat(e.target.value || undefined); setChosenFeatAbility(null) }}
            style={{ marginTop: 6 }}
          >
            <option value="">— Choose a feat —</option>
            {FEATS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {chosenFeat && FEAT_BY_ID[chosenFeat] && (
            <span className={styles.infoValue} style={{ marginTop: 4, fontStyle: 'italic' }}>
              {FEAT_BY_ID[chosenFeat].description}
            </span>
          )}
          {chosenFeat && FEAT_BY_ID[chosenFeat]?.abilityChoice && (
            <div style={{ marginTop: 8 }}>
              <span className={styles.infoLabel}>Choose ability to gain +1{chosenFeatAbility ? ' ✓' : ' (required)'}:</span>
              <div className={styles.scorePips} style={{ marginTop: 6 }}>
                {FEAT_BY_ID[chosenFeat]!.abilityChoice!.map(ab => (
                  <button
                    key={ab}
                    className={`${styles.scorePip} ${chosenFeatAbility === ab ? styles.scorePipSelected : ''}`}
                    onClick={() => setChosenFeatAbility(ab)}
                  >{ABILITY_LABELS[ab]}</button>
                ))}
              </div>
            </div>
          )}
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
  basics, scores, armorId, setArmorId, shieldId, setShieldId,
  chosenSkills, setChosenSkills, chosenExpertise, setChosenExpertise,
  chosenSubclassSkills, setChosenSubclassSkills,
  chosenLandTerrain, setChosenLandTerrain,
  chosenWeapons, setChosenWeapons,
  chosenFightingStyle, setChosenFightingStyle,
  onBack, onNext, onCreate,
}: {
  basics: Basics; scores: AbilityScores
  armorId: string; setArmorId: (v: string) => void
  shieldId: string | null; setShieldId: (v: string | null) => void
  chosenSkills: Skill[]; setChosenSkills: (v: Skill[]) => void
  chosenExpertise: Skill[]; setChosenExpertise: (v: Skill[]) => void
  chosenSubclassSkills: Skill[]; setChosenSubclassSkills: (v: Skill[]) => void
  chosenLandTerrain: LandCircleTerrain | undefined; setChosenLandTerrain: (v: LandCircleTerrain | undefined) => void
  chosenWeapons: WeaponDef[]; setChosenWeapons: (v: WeaponDef[]) => void
  chosenFightingStyle: string | undefined; setChosenFightingStyle: (v: string | undefined) => void
  onBack: () => void; onNext?: () => void; onCreate?: () => void
}) {
  const classDef = CLASS_BY_ID[basics.classId]
  const bgDef = BACKGROUND_BY_ID[basics.background]
  const equipment = { armorId: armorId === 'none' ? null : armorId, hasShield: !!shieldId, shieldId }
  const bonusHpPerLevel = RACE_BY_ID[basics.race]?.bonusHpPerLevel ?? 0
  const ac = computeAC({ abilityScores: scores, equipment, classId: basics.classId, race: basics.race, subclass: basics.subclass })
  const maxHp = computeMaxHP(basics.classId, basics.level, scores.con, bonusHpPerLevel)
  const speed = computeSpeed(basics.race)
  // computeInitiative already returns the modifier — format the sign directly. (Wrapping it in
  // modStr() re-applied the score→mod formula, turning DEX 11's +0 into mod(0) = -5.)
  const initiativeMod = computeInitiative(scores, basics.classId, basics.level, profBonus(basics.level), [], basics.subclass)
  const raceDef = RACE_BY_ID[basics.race]
  const subclassDef = basics.subclass ? SUBCLASS_BY_ID[basics.subclass] : undefined

  const effectiveArmorProfs = [
    ...(classDef?.armorProficiencies ?? []),
    ...(subclassDef?.extraArmorProficiencies ?? []),
  ]
  const allowedArmor = armorAndShields().filter(a => {
    if (a.kind === 'shield') return false  // shields handled separately in off-hand section
    if (a.type === 'none') return true
    if (a.enchantmentBonus) return false  // magic items are DM-granted, not chosen at creation
    return effectiveArmorProfs.includes(a.type as 'light' | 'medium' | 'heavy')
  })
  const canShield = effectiveArmorProfs.includes('shields')
  const availableShields = canShield ? armorAndShields().filter(a => a.kind === 'shield' && !a.enchantmentBonus) : []

  const availableWeapons = weaponsForClass(classDef?.weaponProficiencies ?? []).filter(w => !w.enchantmentBonus)
  const MELEE_CAP = 3
  const RANGED_CAP = 2
  const meleeChosenCount = chosenWeapons.filter(w => w.rangeType !== 'Ranged').length
  const rangedChosenCount = chosenWeapons.filter(w => w.rangeType === 'Ranged').length
  function toggleWeapon(w: WeaponDef) {
    const exists = chosenWeapons.find(cw => cw.id === w.id)
    if (exists) {
      setChosenWeapons(chosenWeapons.filter(cw => cw.id !== w.id))
    } else {
      const isRanged = w.rangeType === 'Ranged'
      if (isRanged && rangedChosenCount >= RANGED_CAP) return
      if (!isRanged && meleeChosenCount >= MELEE_CAP) return
      setChosenWeapons([...chosenWeapons, w])
    }
  }
  function weaponCapped(w: WeaponDef): boolean {
    const isChosen = !!chosenWeapons.find(cw => cw.id === w.id)
    if (isChosen) return false
    const isRanged = w.rangeType === 'Ranged'
    return isRanged ? rangedChosenCount >= RANGED_CAP : meleeChosenCount >= MELEE_CAP
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

  // Subclass skill grants: fixed (extraSkillProficiencies) auto-applied at build time;
  // choice (extraSkillChoice) requires a picker. Skills already covered by background
  // or class picks are excluded from the choice options to avoid double-counting.
  // Reset picks when the subclass changes so stale options don't carry over.
  useEffect(() => { setChosenSubclassSkills([]) }, [basics.subclass]) // eslint-disable-line react-hooks/exhaustive-deps
  const subclassSkillChoice = subclassDef?.extraSkillChoice
  const alreadyProficient = new Set<Skill>([...bgSkills, ...chosenSkills])
  const subclassSkillOptions: Skill[] = subclassSkillChoice
    ? subclassSkillChoice.options.filter(s => !alreadyProficient.has(s))
    : []
  const subclassSkillsNeeded = subclassSkillChoice?.count ?? 0
  function toggleSubclassSkill(s: Skill) {
    if (chosenSubclassSkills.includes(s)) {
      setChosenSubclassSkills(chosenSubclassSkills.filter(k => k !== s))
    } else if (chosenSubclassSkills.length < subclassSkillsNeeded) {
      setChosenSubclassSkills([...chosenSubclassSkills, s])
    }
  }

  const fightingStyleLevel = FIGHTING_STYLE_CLASSES[basics.classId]
  const needsFightingStyle = fightingStyleLevel !== undefined && basics.level >= fightingStyleLevel
  const availableMeleeWeapons = availableWeapons.filter(w => w.rangeType !== 'Ranged')
  const availableRangedWeapons = availableWeapons.filter(w => w.rangeType === 'Ranged')
  const hasMelee = chosenWeapons.some(w => w.rangeType !== 'Ranged')
  const hasRanged = chosenWeapons.some(w => w.rangeType === 'Ranged')
  const needsMelee = availableMeleeWeapons.length > 0
  const needsRanged = availableRangedWeapons.length > 0

  // Expertise: Rogue gets 2 at level 1, Bard gets 2 at level 3
  const expertiseCount =
    (basics.classId === 'Rogue' && basics.level >= 1) ? 2 :
    (basics.classId === 'Bard'  && basics.level >= 3) ? 2 : 0
  const proficientSkills: Skill[] = Array.from(new Set([...chosenSkills, ...(bgDef?.skills ?? [])])) as Skill[]
  const validExpertise = chosenExpertise.filter(s => proficientSkills.includes(s))
  function toggleExpertise(s: Skill) {
    if (chosenExpertise.includes(s)) {
      setChosenExpertise(chosenExpertise.filter(k => k !== s))
    } else if (chosenExpertise.length < expertiseCount) {
      setChosenExpertise([...chosenExpertise, s])
    }
  }

  const needsLandTerrain = basics.subclass === 'CircleOfTheLand' && basics.level >= 3
  // Reset terrain when subclass changes so a previous Land Druid's terrain doesn't leak.
  useEffect(() => { if (!needsLandTerrain) setChosenLandTerrain(undefined) }, [needsLandTerrain]) // eslint-disable-line react-hooks/exhaustive-deps
  const ready = (chosenSkills.length === skillsNeeded || skillsNeeded === 0) && (subclassSkillsNeeded === 0 || chosenSubclassSkills.length === subclassSkillsNeeded) && (!needsFightingStyle || !!chosenFightingStyle) && (!needsMelee || hasMelee) && (!needsRanged || hasRanged) && (expertiseCount === 0 || validExpertise.length === expertiseCount) && (!needsLandTerrain || !!chosenLandTerrain)

  return (
    <div className={styles.stepContent}>
      {/* Calculated stats preview */}
      <div className={styles.statPreview}>
        <StatPreviewChip label="Max HP" value={maxHp} sub={bonusHpPerLevel ? `d${classDef?.hitDie} + CON + ${bonusHpPerLevel}/lvl` : `d${classDef?.hitDie} + CON×${basics.level}`} />
        <StatPreviewChip label="AC" value={ac} sub={armorId === 'none' ? 'unarmored' : (GEAR_BY_ID[armorId]?.name ?? '')} />
        <StatPreviewChip label="Speed" value={`${speed}ft`} sub={raceDef?.label ?? basics.race} />
        <StatPreviewChip label="Initiative" value={initiativeMod >= 0 ? `+${initiativeMod}` : `${initiativeMod}`} sub="Initiative" />
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
        {availableShields.length > 0 && (
          <div className={styles.shieldRow}>
            <span className={styles.shieldLabel}>Off-hand / Shield</span>
            <div className={styles.armorGrid}>
              <button
                className={`${styles.armorOption} ${shieldId === null ? styles.armorOptionSelected : ''}`}
                onClick={() => setShieldId(null)}
              >
                <span className={styles.armorName}>None</span>
              </button>
              {availableShields.map(s => (
                <button
                  key={s.id}
                  className={`${styles.armorOption} ${shieldId === s.id ? styles.armorOptionSelected : ''}`}
                  onClick={() => setShieldId(s.id)}
                >
                  <span className={styles.armorName}>{s.name}</span>
                  <span className={styles.armorAc}>+2 AC</span>
                </button>
              ))}
            </div>
          </div>
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

      {/* Subclass skill choice (Order Cleric, Knowledge Cleric, College of Lore, etc.) */}
      {subclassSkillChoice && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            {subclassDef?.label ?? 'Subclass'} Skills — choose {subclassSkillsNeeded - chosenSubclassSkills.length > 0 ? `${subclassSkillsNeeded - chosenSubclassSkills.length} more` : '✓ done'}
          </div>
          <div className={styles.skillChoices}>
            {subclassSkillOptions.map(s => (
              <button key={s}
                className={`${styles.skillChoice} ${chosenSubclassSkills.includes(s) ? styles.skillChoiceSelected : ''} ${chosenSubclassSkills.length >= subclassSkillsNeeded && !chosenSubclassSkills.includes(s) ? styles.skillChoiceDisabled : ''}`}
                onClick={() => toggleSubclassSkill(s)}
              >
                {SKILL_BY_KEY[s]?.label}
              </button>
            ))}
          </div>
          {subclassDef?.extraSkillProficiencies && subclassDef.extraSkillProficiencies.length > 0 && (
            <div className={styles.infoBox}>
              <span className={styles.infoLabel}>Granted by {subclassDef.label}:</span>
              <span className={styles.infoValue}>{subclassDef.extraSkillProficiencies.map(s => SKILL_BY_KEY[s]?.label).join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Circle of the Land Druid: pick a terrain to determine Circle Spells */}
      {needsLandTerrain && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            Circle Terrain — {chosenLandTerrain ? `✓ ${chosenLandTerrain}` : 'choose one'}
          </div>
          <div className={styles.skillChoices}>
            {LAND_CIRCLE_TERRAINS.map(t => (
              <button key={t}
                className={`${styles.skillChoice} ${chosenLandTerrain === t ? styles.skillChoiceSelected : ''}`}
                onClick={() => setChosenLandTerrain(chosenLandTerrain === t ? undefined : t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Expertise (Rogue lvl 1+, Bard lvl 3+) */}
      {expertiseCount > 0 && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            Expertise — choose {expertiseCount - validExpertise.length > 0 ? `${expertiseCount - validExpertise.length} more` : '✓ done'} (double proficiency bonus)
            {proficientSkills.length === 0 && <span className={styles.validationHint}> — pick class skills first</span>}
          </div>
          <div className={styles.skillChoices}>
            {proficientSkills.map(s => (
              <button key={s}
                className={`${styles.skillChoice} ${validExpertise.includes(s) ? styles.skillChoiceSelected : ''} ${validExpertise.length >= expertiseCount && !validExpertise.includes(s) ? styles.skillChoiceDisabled : ''}`}
                onClick={() => toggleExpertise(s)}
              >
                {SKILL_BY_KEY[s]?.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fighting Style */}
      {needsFightingStyle && (
        <div className={styles.equipSection}>
          <div className={styles.equipLabel}>
            Fighting Style — choose {chosenFightingStyle ? '✓ done' : '1'}
          </div>
          <div className={styles.skillChoices}>
            {FIGHTING_STYLES.map(s => (
              <button
                key={s.id}
                className={`${styles.skillChoice} ${chosenFightingStyle === s.id ? styles.skillChoiceSelected : ''}`}
                onClick={() => setChosenFightingStyle(chosenFightingStyle === s.id ? undefined : s.id)}
                title={s.description}
              >
                {s.name}
              </button>
            ))}
          </div>
          {chosenFightingStyle && (
            <div className={styles.infoBox}>
              <span className={styles.infoValue}>
                {FIGHTING_STYLES.find(s => s.id === chosenFightingStyle)?.description}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Weapons */}
      <div className={styles.equipSection}>
        <div className={styles.equipLabel}>
          Starting Weapons — select at least one melee{needsRanged ? ' and one ranged' : ''}
          {(!hasMelee && needsMelee) || (!hasRanged && needsRanged) ? <span className={styles.validationHint}> (required)</span> : ` (${chosenWeapons.length} chosen)`}
        </div>
        {(() => {
          const meleeWeapons = availableWeapons.filter(w => w.rangeType !== 'Ranged')
          const rangedWeapons = availableWeapons.filter(w => w.rangeType === 'Ranged')
          function WeaponBtn({ w }: { w: WeaponDef }) {
            const chosen = !!chosenWeapons.find(cw => cw.id === w.id)
            const capped = weaponCapped(w)
            return (
              <button
                className={`${styles.weaponOption} ${chosen ? styles.weaponOptionSelected : ''} ${capped ? styles.skillChoiceDisabled : ''}`}
                disabled={capped}
                onClick={() => toggleWeapon(w)}
                title={capped ? 'Reached the maximum for this weapon range' : undefined}
              >
                <span className={styles.weaponName}>{w.name}</span>
                <span className={styles.weaponDmg}>{w.damageDie} {w.damageType}</span>
                <span className={styles.weaponRange}>{w.rangeType}</span>
              </button>
            )
          }
          return (
            <>
              {meleeWeapons.length > 0 && (
                <>
                  <div className={styles.weaponRangeLabel}>
                    Melee <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 11 }}>({meleeChosenCount}/{MELEE_CAP})</span>
                  </div>
                  <div className={styles.weaponGrid}>
                    {meleeWeapons.map(w => <WeaponBtn key={w.id} w={w} />)}
                  </div>
                </>
              )}
              {rangedWeapons.length > 0 && (
                <>
                  <div className={styles.weaponRangeLabel}>
                    Ranged <span style={{ opacity: 0.6, fontWeight: 400, fontSize: 11 }}>({rangedChosenCount}/{RANGED_CAP})</span>
                  </div>
                  <div className={styles.weaponGrid}>
                    {rangedWeapons.map(w => <WeaponBtn key={w.id} w={w} />)}
                  </div>
                </>
              )}
            </>
          )
        })()}
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
  const rawSlots = defaultSpellSlots(basics.classId, basics.level, basics.subclass ?? undefined)
  const maxSlotLevel = Object.keys(rawSlots).length > 0 ? Math.max(...Object.keys(rawSlots).map(Number)) : 1
  const availableSpells = getSelectableSpells(basics.classId, maxSlotLevel)

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
      const aboveSlots = s.level > 0 && s.level > maxSlotLevel
      return (
        <button
          key={s.id}
          className={`${styles.spellChoice} ${selected ? styles.spellChoiceSelected : ''} ${full ? styles.spellChoiceDisabled : ''}`}
          onClick={() => toggleSpell(s)}
          disabled={full}
        >
          <span className={styles.spellChoiceName}>
            {s.name}
            {aboveSlots && (
              <span className={styles.spellAboveSlotNote} title={`Requires a level ${s.level} spell slot to cast`}>
                {' '}▲ lvl {s.level}
              </span>
            )}
          </span>
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
