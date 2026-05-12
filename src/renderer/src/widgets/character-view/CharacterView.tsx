import { useState } from 'react'
import { useAppStore } from '@/app/store'
import type { Character, AbilityScores, AbilityScore, Skill } from '@/entities/character/types'
import { SKILLS } from '@/shared/data/skills'
import { ARMOR_BY_ID, ARMOR_LIST } from '@/shared/data/armorData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAC, computeMaxHP, mod } from '@/shared/data/charCalculations'
import styles from './CharacterView.module.css'

// ── Constants ──────────────────────────────────────────────────────────────

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious',
]

const ABILITY_KEYS: AbilityScore[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', 6: '6th', 7: '7th', 8: '8th', 9: '9th' }

interface ActionDef { name: string; type: 'Action' | 'Bonus Action' | 'Reaction'; short: string; full: string }

const ACTIONS: ActionDef[] = [
  { name: 'Attack', type: 'Action', short: 'Make one melee or ranged attack.', full: 'Make one melee weapon attack, ranged weapon attack, or unarmed strike. When you have Extra Attack, you can attack multiple times instead.' },
  { name: 'Dash', type: 'Action', short: 'Gain extra movement equal to your speed.', full: 'You gain extra movement for the current turn equal to your speed (after modifiers). With 30ft speed and Dash, you can move up to 60ft this turn.' },
  { name: 'Dodge', type: 'Action', short: 'Attackers have disadvantage; Dex saves at advantage.', full: 'Until the start of your next turn, any attack roll made against you has disadvantage if you can see the attacker, and you make Dexterity saving throws with advantage. You lose this if incapacitated or your speed drops to 0.' },
  { name: 'Help', type: 'Action', short: 'Ally gains advantage on next ability check or attack.', full: 'Lend your aid to another creature. The creature you help gains advantage on the next ability check it makes for the task you assist with, or you can aid a friendly creature attacking a creature within 5ft of you.' },
  { name: 'Hide', type: 'Action', short: 'Attempt to hide (Stealth vs passive Perception).', full: "Make a Dexterity (Stealth) check in an attempt to hide. You can't hide from a creature that can see you clearly. If successful, you gain the benefits of being hidden until you give away your position." },
  { name: 'Ready', type: 'Action', short: 'Choose a trigger and reaction to take when it occurs.', full: 'Decide what perceivable circumstance will trigger your reaction, then choose the action you will take in response. When the trigger occurs, take your reaction immediately after, or ignore it.' },
  { name: 'Search', type: 'Action', short: 'Devote attention to finding something.', full: 'You devote your attention to finding something. The DM might have you make a Wisdom (Perception) check or an Intelligence (Investigation) check depending on the nature of the search.' },
  { name: 'Use Object', type: 'Action', short: 'Use an object that requires your action.', full: 'When an object requires your action for its use, you take the Use an Object action. Normally you interact with one object for free as part of your move or action.' },
  { name: 'Opportunity Attack', type: 'Reaction', short: 'When a hostile creature moves out of your reach.', full: 'When a hostile creature that you can see moves out of your reach, you can use your reaction to make one melee attack against that creature. The attack occurs right before it leaves your reach.' },
  { name: 'Grapple', type: 'Action', short: 'Str (Athletics) vs Str (Athletics) or Dex (Acrobatics).', full: "Make a Strength (Athletics) check contested by the target's Strength (Athletics) or Dexterity (Acrobatics). If you succeed, the target is grappled — its speed becomes 0." },
  { name: 'Shove', type: 'Action', short: 'Push 5ft away or knock prone.', full: "Using the Attack action, make a Str (Athletics) check contested by the target's Str (Athletics) or Dex (Acrobatics). On success, push the target 5ft away or knock it prone." },
]

const CLASS_FEATURES: Record<string, { level: number; name: string; desc: string }[]> = {
  Fighter: [
    { level: 1, name: 'Fighting Style', desc: 'Adopt a particular style of fighting. +2 to a roll type based on style chosen.' },
    { level: 1, name: 'Second Wind', desc: 'Bonus action: regain 1d10 + fighter level HP. Recharges on short or long rest.' },
    { level: 2, name: 'Action Surge', desc: 'Take one additional action this turn. Recharges on short or long rest.' },
    { level: 3, name: 'Martial Archetype', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Wizard: [
    { level: 1, name: 'Arcane Recovery', desc: 'Short rest: recover spell slots with total level ≤ ½ wizard level (rounded up).' },
    { level: 2, name: 'Arcane Tradition', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two scores by 1. Max 20.' },
    { level: 5, name: 'Third-level Spells', desc: 'Access to 3rd-level spell slots.' },
  ],
  Rogue: [
    { level: 1, name: 'Expertise', desc: 'Double proficiency bonus on 2 chosen skills.' },
    { level: 1, name: 'Sneak Attack', desc: 'Once per turn, deal extra damage when attacking with advantage or an ally is adjacent to target.' },
    { level: 1, name: "Thieves' Cant", desc: 'Secret language and signs used by rogues.' },
    { level: 2, name: 'Cunning Action', desc: 'Bonus action: Dash, Disengage, or Hide.' },
    { level: 3, name: 'Roguish Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Uncanny Dodge', desc: 'Reaction: halve damage from an attack you can see.' },
  ],
  Barbarian: [
    { level: 1, name: 'Rage', desc: 'Bonus action: rage for 1 min. +damage, advantage on Str checks/saves, resistance to B/P/S damage. 2 uses/LR at level 1.' },
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Con mod.' },
    { level: 2, name: 'Reckless Attack', desc: 'Advantage on first Str attack roll this turn, but attacks against you have advantage until next turn.' },
    { level: 2, name: 'Danger Sense', desc: 'Advantage on Dex saving throws against effects you can see (not blinded/deafened/incapacitated).' },
    { level: 3, name: 'Primal Path', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Cleric: [
    { level: 1, name: 'Divine Domain', desc: 'Choose your subclass (domain).' },
    { level: 2, name: 'Channel Divinity (1/rest)', desc: 'Use a special divine effect (varies by domain).' },
    { level: 2, name: 'Turn Undead', desc: 'Channel Divinity: Wis save DC 8+Prof+Wis vs undead. On fail, undead flees for 1 min.' },
    { level: 5, name: 'Destroy Undead', desc: 'On a failed Turn Undead, undead of CR ½ or lower is destroyed.' },
  ],
  Paladin: [
    { level: 1, name: 'Divine Sense', desc: 'Action: detect celestials, fiends, undead within 60ft. Uses = 1 + Cha mod / LR.' },
    { level: 1, name: 'Lay on Hands', desc: 'Touch: restore HP from pool of 5×paladin level per LR. 5 HP to cure disease/poison.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 2, name: 'Divine Smite', desc: 'On hit: expend spell slot for 2d8 + 1d8/slot level above 1st radiant damage.' },
    { level: 3, name: 'Sacred Oath', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Ranger: [
    { level: 1, name: 'Favored Enemy', desc: 'Advantage on Survival to track and Int checks to recall info about your chosen enemy type.' },
    { level: 1, name: 'Natural Explorer', desc: 'Expertise in one terrain type. No difficult terrain penalty. Double foraging yields.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 3, name: 'Ranger Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Bard: [
    { level: 1, name: 'Bardic Inspiration', desc: 'Bonus action: give ally a d6 inspiration die to add to one roll. Uses = Cha mod / LR.' },
    { level: 2, name: 'Jack of All Trades', desc: 'Add half proficiency bonus (rounded down) to any non-proficient ability check.' },
    { level: 2, name: 'Song of Rest', desc: 'During short rest, ally expending HD regains extra HP (d6 at level 2).' },
    { level: 3, name: 'Bard College', desc: 'Choose your subclass.' },
    { level: 3, name: 'Expertise', desc: 'Double proficiency bonus on 2 chosen skills.' },
    { level: 5, name: 'Font of Inspiration', desc: 'Regain Bardic Inspiration on short or long rest.' },
  ],
  Druid: [
    { level: 1, name: 'Druidic', desc: 'Secret language of druids.' },
    { level: 2, name: 'Wild Shape', desc: "Action: transform into a beast you've seen. CR ≤ ¼ at level 2, CR ≤ ½ at level 4. 2 uses / SR." },
    { level: 2, name: 'Druid Circle', desc: 'Choose your subclass.' },
  ],
  Monk: [
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Wis mod.' },
    { level: 1, name: 'Martial Arts', desc: 'Use Dex for unarmed strikes. Use d4 as unarmed damage (scales with level).' },
    { level: 2, name: 'Ki', desc: 'Ki points = monk level. Recover on short rest.' },
    { level: 2, name: 'Flurry of Blows', desc: '1 Ki: After Attack action, make 2 unarmed strikes as bonus action.' },
    { level: 2, name: 'Patient Defense', desc: '1 Ki: Take Dodge as bonus action.' },
    { level: 2, name: 'Step of the Wind', desc: '1 Ki: Disengage or Dash as bonus action. Jump distance doubled.' },
    { level: 3, name: 'Monastic Tradition', desc: 'Choose your subclass.' },
    { level: 5, name: 'Stunning Strike', desc: '1 Ki: Con save DC 8+Prof+Wis on hit. On fail: stunned until your next turn.' },
  ],
  Sorcerer: [
    { level: 1, name: 'Sorcerous Origin', desc: 'Choose your subclass.' },
    { level: 2, name: 'Font of Magic', desc: 'Sorcery points = sorcerer level. Convert to spell slots or spend on Metamagic.' },
    { level: 3, name: 'Metamagic', desc: 'Choose 2 options to modify spells (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned).' },
  ],
  Warlock: [
    { level: 1, name: 'Otherworldly Patron', desc: 'Choose your subclass.' },
    { level: 2, name: 'Eldritch Invocations', desc: 'Choose 2 invocations to augment your abilities.' },
    { level: 3, name: 'Pact Boon', desc: 'Pact of the Blade / Chain / Tome.' },
    { level: 5, name: '3rd-level Pact Slots', desc: 'Pact magic slots are now 3rd level.' },
  ],
}

// ── Types ──────────────────────────────────────────────────────────────────

type EditField = 'speed' | 'initiative' | keyof AbilityScores

// ── Main component ─────────────────────────────────────────────────────────

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, updateCharacter } = useAppStore()

  const [hpEdit, setHpEdit] = useState<string | null>(null)
  const [fieldEdit, setFieldEdit] = useState<{ field: EditField; value: string } | null>(null)
  const [conditionOpen, setConditionOpen] = useState(false)
  const [armorOpen, setArmorOpen] = useState(false)
  const [expandedAction, setExpandedAction] = useState<string | null>(null)
  const [expandedFeatures, setExpandedFeatures] = useState<Set<number>>(new Set())
  const [spellSearch, setSpellSearch] = useState('')

  const charMaybe = activeCharacterId ? characters[activeCharacterId] : null
  if (!charMaybe) return null
  // Rebind as non-nullable so closures below don't need null assertions
  const char: Character = charMaybe

  const update = (patch: Partial<Character>) => updateCharacter(char.id, patch)
  const hp = char.hitPoints
  const hpPct = hp.max > 0 ? Math.max(0, Math.min(100, (hp.current / hp.max) * 100)) : 0
  const isDown = hp.current <= 0
  const eq = char.equipment ?? { armorId: null, hasShield: false }
  const classDef = CLASS_BY_ID[char.classId]
  const prof = char.proficiencyBonus

  function applyHp(delta: number) {
    update({ hitPoints: { ...hp, current: Math.min(hp.max, Math.max(0, hp.current + delta)) } })
  }

  function commitHpEdit() {
    if (hpEdit === null) return
    const v = parseInt(hpEdit, 10)
    if (!isNaN(v)) update({ hitPoints: { ...hp, current: Math.min(hp.max, Math.max(0, v)) } })
    setHpEdit(null)
  }

  function startEdit(field: EditField, val: number) {
    setFieldEdit({ field, value: String(val) })
  }

  function commitEdit() {
    if (!fieldEdit) { setFieldEdit(null); return }
    const v = parseInt(fieldEdit.value, 10)
    if (isNaN(v)) { setFieldEdit(null); return }
    const { field } = fieldEdit
    if (field === 'speed') {
      update({ speed: Math.max(0, v) })
    } else if (field === 'initiative') {
      update({ initiative: v })
    } else {
      const key = field as keyof AbilityScores
      const clamped = Math.min(30, Math.max(1, v))
      const newScores = { ...char.abilityScores, [key]: clamped }
      const newAC = computeAC({ abilityScores: newScores, equipment: eq, classId: char.classId, race: char.race })
      const newMaxHP = computeMaxHP(char.classId, char.level, newScores.con)
      const hpDiff = newMaxHP - hp.max
      update({
        abilityScores: newScores,
        initiative: Math.floor((newScores.dex - 10) / 2),
        armorClass: newAC,
        hitPoints: { ...hp, max: newMaxHP, current: Math.max(0, hp.current + hpDiff) },
      })
    }
    setFieldEdit(null)
  }

  function toggleCondition(name: string) {
    const id = name.toLowerCase()
    const has = char.conditionIds.some(c => c.conditionId === id)
    update({
      conditionIds: has
        ? char.conditionIds.filter(c => c.conditionId !== id)
        : [...char.conditionIds, { conditionId: id }],
    })
  }

  function tickSave(type: 'successes' | 'failures') {
    const cur = char.deathSaves[type]
    update({ deathSaves: { ...char.deathSaves, [type]: cur >= 3 ? 0 : cur + 1 } })
  }

  function setArmor(armorId: string | null, hasShield: boolean) {
    const newEq = { armorId, hasShield }
    const newAC = computeAC({ abilityScores: char.abilityScores, equipment: newEq, classId: char.classId, race: char.race })
    update({ equipment: newEq, armorClass: newAC })
  }

  function useSlot(level: number) {
    const slot = char.spellSlots[level]
    if (!slot || slot.used >= slot.total) return
    update({ spellSlots: { ...char.spellSlots, [level]: { ...slot, used: slot.used + 1 } } })
  }

  function recoverSlot(level: number) {
    const slot = char.spellSlots[level]
    if (!slot || slot.used === 0) return
    update({ spellSlots: { ...char.spellSlots, [level]: { ...slot, used: slot.used - 1 } } })
  }

  function cycleSkill(key: Skill) {
    const current = char.skillProficiencies?.[key] ?? 'none'
    const next: 'proficient' | 'expert' | undefined =
      current === 'none' ? 'proficient' : current === 'proficient' ? 'expert' : undefined
    const updated = { ...(char.skillProficiencies ?? {}) }
    if (next === undefined) delete updated[key]
    else updated[key] = next
    update({ skillProficiencies: updated })
  }

  function toggleFeature(i: number) {
    setExpandedFeatures(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  function fmtMod(n: number) { return n >= 0 ? `+${n}` : String(n) }

  function badgeClass(type: string) {
    if (type === 'Action') return styles.badgeAction
    if (type === 'Bonus Action') return styles.badgeBonusAction
    return styles.badgeReaction
  }

  function badgeLabel(type: string) {
    if (type === 'Action') return 'Action'
    if (type === 'Bonus Action') return 'Bonus'
    return 'Reaction'
  }

  const armorName = eq.armorId ? (ARMOR_BY_ID[eq.armorId]?.name ?? 'Unknown') : 'Unarmored'
  const allowedArmors = ARMOR_LIST.filter(a =>
    a.type === 'none' || (classDef?.armorProficiencies.includes(a.type as 'light' | 'medium' | 'heavy') ?? false)
  )
  const canShield = classDef?.armorProficiencies.includes('shields') ?? false
  const classFeatures = (CLASS_FEATURES[char.classId] ?? []).filter(f => f.level <= char.level)
  const passivePerception = 10 + mod(char.abilityScores.wis) +
    (char.skillProficiencies?.['perception'] === 'expert' ? prof * 2 :
     char.skillProficiencies?.['perception'] === 'proficient' ? prof : 0)

  return (
    <div className={styles.view}>

      {/* ── TOPBAR ── */}
      <header className={styles.topbar}>
        <div className={styles.topIdentity}>
          <span className={styles.topName}>{char.name}</span>
          <span className={styles.topSub}>
            Level {char.level} · {char.race} · {char.classId}
            {char.subclass ? ` (${char.subclass})` : ''} · {char.background}
          </span>
        </div>
        <div className={styles.topRight}>
          <button
            className={`${styles.inspirationBtn} ${char.inspiration ? styles.inspirationOn : ''}`}
            onClick={() => update({ inspiration: !char.inspiration })}
          >
            ✦ Inspiration
          </button>
          <button className={styles.backBtn} onClick={exitCharacter}>← Characters</button>
        </div>
      </header>

      {/* ── THREE COLUMNS ── */}
      <div className={styles.columns}>

        {/* ── LEFT: Vitals ── */}
        <aside className={styles.leftCol}>

          {/* HP */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Hit Points</span>
              {hp.temp > 0 && <span className={styles.tempHp}>+{hp.temp} tmp</span>}
            </div>
            <div className={styles.hpDisplay}>
              {hpEdit !== null ? (
                <input
                  className={styles.hpEditInput}
                  type="number"
                  value={hpEdit}
                  autoFocus
                  min={0} max={hp.max}
                  onChange={e => setHpEdit(e.target.value)}
                  onBlur={commitHpEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitHpEdit(); if (e.key === 'Escape') setHpEdit(null) }}
                />
              ) : (
                <span className={styles.hpCurrent} onClick={() => setHpEdit(String(hp.current))} title="Click to edit">
                  {hp.current}
                </span>
              )}
              <span className={styles.hpSlash}>/</span>
              <span className={styles.hpMaxVal}>{hp.max}</span>
            </div>
            <div className={styles.hpBar}>
              <div
                className={styles.hpFill}
                style={{ width: `${hpPct}%`, background: hpPct > 50 ? 'var(--success)' : hpPct > 25 ? 'var(--warning)' : 'var(--danger)' }}
              />
            </div>
            <div className={styles.hpBtns}>
              {[-10, -5, -1].map(d => (
                <button key={d} className={styles.dmgBtn} onClick={() => applyHp(d)}>{d}</button>
              ))}
              {[1, 5, 10].map(d => (
                <button key={d} className={styles.healBtn} onClick={() => applyHp(d)}>+{d}</button>
              ))}
            </div>
          </section>

          {/* Death saves */}
          {isDown && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Death Saves</span>
              </div>
              {(['successes', 'failures'] as const).map(type => (
                <div key={type} className={styles.deathRow}>
                  <span className={styles.deathLabel}>{type === 'successes' ? 'Success' : 'Failure'}</span>
                  <div className={styles.deathDots}>
                    {[0, 1, 2].map(i => (
                      <button
                        key={i}
                        className={`${styles.deathDot} ${i < char.deathSaves[type] ? (type === 'successes' ? styles.dotSuccess : styles.dotFail) : ''}`}
                        onClick={() => tickSave(type)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Combat Stats */}
          <section className={styles.section}>
            <div className={styles.combatGrid}>
              <div className={styles.statChip}>
                <span className={styles.statVal}>{char.armorClass}</span>
                <span className={styles.statKey}>AC</span>
                <span className={styles.statSub}>{armorName}{eq.hasShield ? ' +Sh' : ''}</span>
              </div>
              <div
                className={`${styles.statChip} ${styles.statEditable}`}
                onClick={() => fieldEdit?.field !== 'initiative' && startEdit('initiative', char.initiative)}
                title="Click to edit"
              >
                {fieldEdit?.field === 'initiative' ? (
                  <input
                    className={styles.statEditInput}
                    type="number"
                    value={fieldEdit.value}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onChange={e => setFieldEdit({ field: 'initiative', value: e.target.value })}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                  />
                ) : (
                  <span className={styles.statVal}>{fmtMod(char.initiative)}</span>
                )}
                <span className={styles.statKey}>Init.</span>
              </div>
              <div
                className={`${styles.statChip} ${styles.statEditable}`}
                onClick={() => fieldEdit?.field !== 'speed' && startEdit('speed', char.speed)}
                title="Click to edit"
              >
                {fieldEdit?.field === 'speed' ? (
                  <input
                    className={styles.statEditInput}
                    type="number"
                    value={fieldEdit.value}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                    onChange={e => setFieldEdit({ field: 'speed', value: e.target.value })}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit() }}
                  />
                ) : (
                  <span className={styles.statVal}>{char.speed}<span className={styles.statUnit}>ft</span></span>
                )}
                <span className={styles.statKey}>Speed</span>
              </div>
              <div className={styles.statChip}>
                <span className={styles.statVal}>{fmtMod(prof)}</span>
                <span className={styles.statKey}>Prof.</span>
              </div>
            </div>

            {/* Armor picker */}
            <div className={styles.armorBlock}>
              <button className={styles.armorToggle} onClick={() => setArmorOpen(v => !v)}>
                {armorName}{eq.hasShield ? ' + Shield' : ''} {armorOpen ? '▲' : '▼'}
              </button>
              {armorOpen && (
                <div className={styles.armorPicker}>
                  {allowedArmors.map(a => (
                    <button
                      key={a.id}
                      className={`${styles.armorOpt} ${(eq.armorId ?? 'none') === a.id ? styles.armorOptSel : ''}`}
                      onClick={() => { setArmor(a.id === 'none' ? null : a.id, eq.hasShield); setArmorOpen(false) }}
                    >
                      {a.name}
                    </button>
                  ))}
                  {canShield && (
                    <button
                      className={`${styles.armorOpt} ${eq.hasShield ? styles.armorOptSel : ''}`}
                      onClick={() => setArmor(eq.armorId, !eq.hasShield)}
                    >
                      {eq.hasShield ? '✓ Shield' : 'Shield'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Conditions */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Conditions</span>
              <button className={styles.addBtn} onClick={() => setConditionOpen(v => !v)}>
                {conditionOpen ? 'Done' : '+ Add'}
              </button>
            </div>
            {conditionOpen && (
              <div className={styles.conditionPicker}>
                {CONDITIONS.map(name => {
                  const active = char.conditionIds.some(c => c.conditionId === name.toLowerCase())
                  return (
                    <button
                      key={name}
                      className={`${styles.condOpt} ${active ? styles.condOptActive : ''}`}
                      onClick={() => toggleCondition(name)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className={styles.condTags}>
              {char.conditionIds.length === 0 && !conditionOpen && (
                <span className={styles.emptyNote}>None</span>
              )}
              {char.conditionIds.map(c => (
                <button key={c.conditionId} className={styles.condTag} onClick={() => toggleCondition(c.conditionId)} title="Click to remove">
                  {c.conditionId} ×
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* ── CENTER: Ability Scores + Actions + Features ── */}
        <div className={styles.centerCol}>

          {/* Ability Scores */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Ability Scores</span>
              <span className={styles.hint}>click to edit</span>
            </div>
            <div className={styles.abilityGrid}>
              {ABILITY_KEYS.map(key => {
                const val = char.abilityScores[key]
                const isEditing = fieldEdit?.field === key
                return (
                  <div
                    key={key}
                    className={styles.abilityCell}
                    onClick={() => !isEditing && startEdit(key, val)}
                    title="Click to edit"
                  >
                    <span className={styles.abilityKey}>{ABILITY_LABELS[key]}</span>
                    {isEditing ? (
                      <input
                        className={styles.abilityEditInput}
                        type="number"
                        min={1} max={30}
                        value={fieldEdit!.value}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onChange={e => setFieldEdit({ field: key, value: e.target.value })}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setFieldEdit(null) }}
                      />
                    ) : (
                      <span className={styles.abilityScore}>{val}</span>
                    )}
                    <span className={styles.abilityMod}>{fmtMod(mod(val))}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Actions */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Actions</span>
            </div>
            <div className={styles.actionList}>
              {ACTIONS.map(action => {
                const expanded = expandedAction === action.name
                return (
                  <div
                    key={action.name}
                    className={`${styles.actionRow} ${expanded ? styles.actionRowOpen : ''}`}
                    onClick={() => setExpandedAction(expanded ? null : action.name)}
                  >
                    <span className={`${styles.actionBadge} ${badgeClass(action.type)}`}>
                      {badgeLabel(action.type)}
                    </span>
                    <div className={styles.actionContent}>
                      <span className={styles.actionName}>{action.name}</span>
                      <span className={styles.actionDesc}>{expanded ? action.full : action.short}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Features */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>{char.classId} Features</span>
            </div>
            {classFeatures.length === 0
              ? <span className={styles.emptyNote}>No features at this level.</span>
              : (
                <div className={styles.featureList}>
                  {classFeatures.map((f, i) => {
                    const open = expandedFeatures.has(i)
                    return (
                      <div key={i} className={styles.featureCard}>
                        <button className={styles.featureHead} onClick={() => toggleFeature(i)}>
                          <span className={styles.featureName}>{f.name}</span>
                          <span className={styles.featureLevel}>Lvl {f.level}</span>
                          <span className={styles.featureChevron}>{open ? '▾' : '▸'}</span>
                        </button>
                        {open && <p className={styles.featureDesc}>{f.desc}</p>}
                      </div>
                    )
                  })}
                </div>
              )
            }
          </section>
        </div>

        {/* ── RIGHT: Skills + Spells ── */}
        <div className={styles.rightCol}>

          {/* Saving Throws */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Saving Throws</span>
            </div>
            <div className={styles.savesList}>
              {ABILITY_KEYS.map(ab => {
                const isProficient = char.savingThrowProficiencies?.includes(ab) ?? false
                const bonus = mod(char.abilityScores[ab]) + (isProficient ? prof : 0)
                return (
                  <div key={ab} className={styles.saveRow}>
                    <span className={`${styles.saveDot} ${isProficient ? styles.saveDotProf : ''}`} />
                    <span className={styles.saveAb}>{ab.toUpperCase()}</span>
                    <span className={styles.saveBonus}>{fmtMod(bonus)}</span>
                  </div>
                )
              })}
            </div>
            <div className={styles.passivePP}>
              Passive Perception: <strong>{passivePerception}</strong>
            </div>
          </section>

          {/* Skills */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionLabel}>Skills</span>
              <span className={styles.hint}>click to cycle</span>
            </div>
            <div className={styles.skillsList}>
              {SKILLS.map(({ key, label, ability }) => {
                const state = char.skillProficiencies?.[key] ?? 'none'
                const bonus = mod(char.abilityScores[ability]) +
                  (state === 'none' ? 0 : state === 'proficient' ? prof : prof * 2)
                return (
                  <button key={key} className={styles.skillRow} onClick={() => cycleSkill(key)}>
                    <span className={`${styles.profDot} ${state === 'expert' ? styles.dotExpert : state === 'proficient' ? styles.dotProf : ''}`} />
                    <span className={styles.skillBonus}>{fmtMod(bonus)}</span>
                    <span className={styles.skillLabel}>{label}</span>
                    <span className={styles.skillAb}>{ability.toUpperCase()}</span>
                    {state !== 'none' && (
                      <span className={`${styles.exBadge} ${state === 'expert' ? styles.exBadgeGold : ''}`}>
                        {state === 'expert' ? 'EX' : 'PR'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Spell Slots */}
          {Object.keys(char.spellSlots).length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Spell Slots</span>
              </div>
              <div className={styles.slotsList}>
                {(Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([lvl, slot]) => {
                    const remaining = slot.total - slot.used
                    return (
                      <div key={lvl} className={styles.slotRow}>
                        <span className={styles.slotLvl}>{ORDINAL[Number(lvl)] ?? `${lvl}th`}</span>
                        <div className={styles.slotPips}>
                          {Array.from({ length: slot.total }).map((_, i) => (
                            <button
                              key={i}
                              className={`${styles.slotPip} ${i < remaining ? styles.pipFull : styles.pipEmpty}`}
                              onClick={() => i < remaining ? useSlot(Number(lvl)) : recoverSlot(Number(lvl))}
                              title={i < remaining ? 'Use slot' : 'Recover slot'}
                            />
                          ))}
                        </div>
                        <span className={styles.slotCount}>{remaining}/{slot.total}</span>
                      </div>
                    )
                  })}
              </div>
            </section>
          )}

          {/* Known Spells */}
          {char.spellIds.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.sectionLabel}>Spells Known</span>
              </div>
              <input
                className={styles.spellSearch}
                type="search"
                placeholder="Search spells…"
                value={spellSearch}
                onChange={e => setSpellSearch(e.target.value)}
              />
              <div className={styles.spellList}>
                {char.spellIds
                  .filter(id => id.toLowerCase().includes(spellSearch.toLowerCase()))
                  .map(id => (
                    <div key={id} className={styles.spellEntry}>
                      <span className={styles.spellName}>{id}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
