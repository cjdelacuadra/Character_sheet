import { useState } from 'react'
import { useAppStore } from '@/app/store'
import styles from './CharacterView.module.css'
import type { Character, AbilityScores } from '@/entities/character/types'

const CONDITIONS = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened',
  'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified',
  'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'
]

type Tab = 'actions' | 'spells' | 'features'
type EditableField = 'ac' | 'speed' | 'initiative' | keyof AbilityScores | null

export function CharacterView() {
  const { characters, activeCharacterId, exitCharacter, updateCharacter } = useAppStore()
  const char = activeCharacterId ? characters[activeCharacterId] : null
  const [tab, setTab] = useState<Tab>('actions')
  const [showConditionPicker, setShowConditionPicker] = useState(false)
  const [hpEdit, setHpEdit] = useState<string | null>(null)
  const [fieldEdit, setFieldEdit] = useState<{ field: EditableField; value: string } | null>(null)

  if (!char) return null

  const update = (patch: Partial<Character>) => updateCharacter(char.id, patch)
  const hpPercent = Math.max(0, (char.hitPoints.current / char.hitPoints.max) * 100)
  const isUnconscious = char.hitPoints.current <= 0

  function applyHpDelta(delta: number) {
    const next = Math.min(char!.hitPoints.max, Math.max(0, char!.hitPoints.current + delta))
    update({ hitPoints: { ...char!.hitPoints, current: next } })
  }

  function commitHpEdit() {
    if (hpEdit === null) return
    const val = parseInt(hpEdit, 10)
    if (!isNaN(val)) {
      update({ hitPoints: { ...char!.hitPoints, current: Math.min(char!.hitPoints.max, Math.max(0, val)) } })
    }
    setHpEdit(null)
  }

  function toggleCondition(name: string) {
    const id = name.toLowerCase()
    const has = char!.conditionIds.some(c => c.conditionId === id)
    if (has) {
      update({ conditionIds: char!.conditionIds.filter(c => c.conditionId !== id) })
    } else {
      update({ conditionIds: [...char!.conditionIds, { conditionId: id }] })
    }
  }

  function tickDeathSave(type: 'successes' | 'failures') {
    const current = char!.deathSaves[type]
    const next = current >= 3 ? 0 : current + 1
    update({ deathSaves: { ...char!.deathSaves, [type]: next } })
  }

  function startFieldEdit(field: EditableField, current: number) {
    setFieldEdit({ field, value: String(current) })
  }

  function commitFieldEdit() {
    if (!fieldEdit || fieldEdit.field === null) return
    const val = parseInt(fieldEdit.value, 10)
    if (isNaN(val)) { setFieldEdit(null); return }
    const { field } = fieldEdit
    if (field === 'ac') update({ armorClass: Math.max(0, val) })
    else if (field === 'speed') update({ speed: Math.max(0, val) })
    else if (field === 'initiative') update({ initiative: val })
    else {
      // ability score
      const key = field as keyof AbilityScores
      const clamped = Math.min(30, Math.max(1, val))
      const newScores = { ...char!.abilityScores, [key]: clamped }
      const dexMod = Math.floor((newScores.dex - 10) / 2)
      update({ abilityScores: newScores, initiative: dexMod })
    }
    setFieldEdit(null)
  }

  function useSpellSlot(level: number) {
    const slot = char!.spellSlots[level]
    if (!slot || slot.used >= slot.total) return
    update({ spellSlots: { ...char!.spellSlots, [level]: { ...slot, used: slot.used + 1 } } })
  }

  function recoverSpellSlot(level: number) {
    const slot = char!.spellSlots[level]
    if (!slot || slot.used === 0) return
    update({ spellSlots: { ...char!.spellSlots, [level]: { ...slot, used: slot.used - 1 } } })
  }

  return (
    <div className={styles.view}>
      <header className={styles.topbar}>
        <div className={styles.identity}>
          <h1 className={styles.name}>{char.name}</h1>
          <span className={styles.subtitle}>
            Level {char.level} {char.race} {char.classId}
          </span>
        </div>
        <div className={styles.topActions}>
          <button
            className={`${styles.inspirationBtn} ${char.inspiration ? styles.inspirationActive : ''}`}
            onClick={() => update({ inspiration: !char.inspiration })}
            title="Inspiration"
          >
            ✦ Inspiration
          </button>
          <button className={styles.exitBtn} onClick={exitCharacter}>
            ← Characters
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          {/* HP Block */}
          <section className={styles.block}>
            <div className={styles.blockLabel}>Hit Points</div>
            <div className={styles.hpRow}>
              {hpEdit !== null ? (
                <input
                  className={styles.hpInput}
                  type="number"
                  value={hpEdit}
                  autoFocus
                  min={0}
                  max={char.hitPoints.max}
                  onChange={e => setHpEdit(e.target.value)}
                  onBlur={commitHpEdit}
                  onKeyDown={e => { if (e.key === 'Enter') commitHpEdit(); if (e.key === 'Escape') setHpEdit(null) }}
                />
              ) : (
                <span
                  className={styles.hpValue}
                  onClick={() => setHpEdit(String(char.hitPoints.current))}
                  title="Click to edit"
                >
                  {char.hitPoints.current}
                  <span className={styles.hpMax}>/ {char.hitPoints.max}</span>
                </span>
              )}
              {char.hitPoints.temp > 0 && (
                <span className={styles.hpTemp}>+{char.hitPoints.temp} temp</span>
              )}
            </div>
            <div className={styles.hpBar}>
              <div
                className={styles.hpFill}
                style={{
                  width: `${hpPercent}%`,
                  background: hpPercent > 50 ? 'var(--success)' : hpPercent > 25 ? 'var(--warning)' : 'var(--danger)'
                }}
              />
            </div>
            <div className={styles.hpButtons}>
              <button className={styles.hpBtn} onClick={() => applyHpDelta(-1)} title="Take 1 damage">−1</button>
              <button className={styles.hpBtn} onClick={() => applyHpDelta(-5)} title="Take 5 damage">−5</button>
              <button className={styles.hpBtnHeal} onClick={() => applyHpDelta(1)} title="Heal 1">+1</button>
              <button className={styles.hpBtnHeal} onClick={() => applyHpDelta(5)} title="Heal 5">+5</button>
            </div>
          </section>

          {/* Death Saves — only when at 0 HP */}
          {isUnconscious && (
            <section className={styles.block}>
              <div className={styles.blockLabel}>Death Saves</div>
              <div className={styles.deathRow}>
                <span className={styles.deathLabel}>Successes</span>
                <div className={styles.deathDots}>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      className={`${styles.deathDot} ${i < char.deathSaves.successes ? styles.deathSuccess : ''}`}
                      onClick={() => tickDeathSave('successes')}
                    />
                  ))}
                </div>
              </div>
              <div className={styles.deathRow}>
                <span className={styles.deathLabel}>Failures</span>
                <div className={styles.deathDots}>
                  {[0, 1, 2].map(i => (
                    <button
                      key={i}
                      className={`${styles.deathDot} ${i < char.deathSaves.failures ? styles.deathFailure : ''}`}
                      onClick={() => tickDeathSave('failures')}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Core Stats */}
          <section className={styles.block}>
            <div className={styles.statGrid}>
              <EditableStatChip
                label="AC"
                value={char.armorClass}
                fieldKey="ac"
                editState={fieldEdit}
                onStartEdit={startFieldEdit}
                onCommit={commitFieldEdit}
                onChangeEdit={v => setFieldEdit(prev => prev ? { ...prev, value: v } : null)}
              />
              <EditableStatChip
                label="Initiative"
                value={char.initiative}
                displayValue={char.initiative >= 0 ? `+${char.initiative}` : String(char.initiative)}
                fieldKey="initiative"
                editState={fieldEdit}
                onStartEdit={startFieldEdit}
                onCommit={commitFieldEdit}
                onChangeEdit={v => setFieldEdit(prev => prev ? { ...prev, value: v } : null)}
              />
              <EditableStatChip
                label="Speed"
                value={char.speed}
                displayValue={`${char.speed}ft`}
                fieldKey="speed"
                editState={fieldEdit}
                onStartEdit={startFieldEdit}
                onCommit={commitFieldEdit}
                onChangeEdit={v => setFieldEdit(prev => prev ? { ...prev, value: v } : null)}
              />
              <StatChip label="Prof." value={`+${char.proficiencyBonus}`} />
            </div>
          </section>

          {/* Ability Scores */}
          <section className={styles.block}>
            <div className={styles.blockLabel}>Abilities <span className={styles.editHint}>(click to edit)</span></div>
            <div className={styles.abilityGrid}>
              {(Object.entries(char.abilityScores) as [keyof AbilityScores, number][]).map(([key, val]) => {
                const isEditing = fieldEdit?.field === key
                return (
                  <div
                    key={key}
                    className={`${styles.ability} ${styles.abilityEditable}`}
                    onClick={() => !isEditing && startFieldEdit(key, val)}
                    title="Click to edit"
                  >
                    <span className={styles.abilityLabel}>{key.toUpperCase()}</span>
                    {isEditing ? (
                      <input
                        className={styles.abilityInput}
                        type="number"
                        min={1} max={30}
                        value={fieldEdit!.value}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                        onChange={e => setFieldEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                        onBlur={commitFieldEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitFieldEdit(); if (e.key === 'Escape') setFieldEdit(null) }}
                      />
                    ) : (
                      <span className={styles.abilityScore}>{val}</span>
                    )}
                    <span className={styles.abilityMod}>{modifier(val)}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Conditions */}
          <section className={styles.block}>
            <div className={styles.blockLabelRow}>
              <span className={styles.blockLabel}>Conditions</span>
              <button
                className={styles.addSmall}
                onClick={() => setShowConditionPicker(v => !v)}
              >
                {showConditionPicker ? 'Done' : '+ Add'}
              </button>
            </div>
            {showConditionPicker && (
              <div className={styles.conditionPicker}>
                {CONDITIONS.map(name => {
                  const active = char.conditionIds.some(c => c.conditionId === name.toLowerCase())
                  return (
                    <button
                      key={name}
                      className={`${styles.conditionOption} ${active ? styles.conditionOptionActive : ''}`}
                      onClick={() => toggleCondition(name)}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
            {char.conditionIds.length > 0 ? (
              <div className={styles.conditionList}>
                {char.conditionIds.map((c) => (
                  <button
                    key={c.conditionId}
                    className={styles.conditionTag}
                    onClick={() => toggleCondition(c.conditionId)}
                    title="Click to remove"
                  >
                    {c.conditionId} ×
                  </button>
                ))}
              </div>
            ) : (
              !showConditionPicker && <span className={styles.emptyNote}>None</span>
            )}
          </section>
        </aside>

        {/* MAIN */}
        <main className={styles.main}>
          <div className={styles.tabs}>
            {(['actions', 'spells', 'features'] as Tab[]).map(t => (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'actions' && <ActionsPanel />}
          {tab === 'spells' && (
            <SpellsPanel
              char={char}
              onUseSlot={useSpellSlot}
              onRecoverSlot={recoverSpellSlot}
            />
          )}
          {tab === 'features' && <FeaturesPanel classId={char.classId} level={char.level} />}
        </main>
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.statChip}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

interface EditableStatChipProps {
  label: string
  value: number
  displayValue?: string
  fieldKey: EditableField
  editState: { field: EditableField; value: string } | null
  onStartEdit: (field: EditableField, current: number) => void
  onCommit: () => void
  onChangeEdit: (v: string) => void
}

function EditableStatChip({ label, value, displayValue, fieldKey, editState, onStartEdit, onCommit, onChangeEdit }: EditableStatChipProps) {
  const isEditing = editState?.field === fieldKey
  return (
    <div
      className={`${styles.statChip} ${styles.statChipEditable}`}
      onClick={() => !isEditing && onStartEdit(fieldKey, value)}
      title="Click to edit"
    >
      {isEditing ? (
        <input
          className={styles.statInput}
          type="number"
          value={editState!.value}
          autoFocus
          onClick={e => e.stopPropagation()}
          onChange={e => onChangeEdit(e.target.value)}
          onBlur={onCommit}
          onKeyDown={e => { if (e.key === 'Enter') onCommit() }}
        />
      ) : (
        <span className={styles.statValue}>{displayValue ?? value}</span>
      )}
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}

function modifier(score: number) {
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

/* ── Actions Panel ── */
const STANDARD_ACTIONS = [
  { name: 'Attack', type: 'Action', desc: 'Make one melee or ranged attack.' },
  { name: 'Dodge', type: 'Action', desc: 'Until start of your next turn, attackers have disadvantage on attacks against you. Dex saves = advantage.' },
  { name: 'Dash', type: 'Action', desc: 'Gain extra movement equal to your speed.' },
  { name: 'Help', type: 'Action', desc: 'Ally you help gains advantage on next ability check or attack.' },
  { name: 'Hide', type: 'Action', desc: 'Attempt to hide (Stealth check vs passive Perception).' },
  { name: 'Ready', type: 'Action', desc: 'Choose a trigger and a reaction to take when it occurs.' },
  { name: 'Search', type: 'Action', desc: 'Perception or Investigation check to find something.' },
  { name: 'Use Object', type: 'Action', desc: 'Use an object in your environment.' },
  { name: 'Opportunity Attack', type: 'Reaction', desc: 'When a hostile creature moves out of your reach.' },
  { name: 'Grapple', type: 'Action', desc: 'Str (Athletics) vs Str (Athletics) or Dex (Acrobatics). On success target is grappled.' },
  { name: 'Shove', type: 'Action', desc: 'Str (Athletics) vs Str (Athletics) or Dex (Acrobatics). Push 5ft or knock prone.' },
]

function ActionsPanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.actionGrid}>
        {STANDARD_ACTIONS.map(a => (
          <div key={a.name} className={styles.actionCard}>
            <div className={styles.actionHeader}>
              <span className={styles.actionName}>{a.name}</span>
              <span className={styles.actionType}>{a.type}</span>
            </div>
            <p className={styles.actionDesc}>{a.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Spells Panel ── */
interface SpellsPanelProps {
  char: Character
  onUseSlot: (level: number) => void
  onRecoverSlot: (level: number) => void
}

function SpellsPanel({ char, onUseSlot, onRecoverSlot }: SpellsPanelProps) {
  const hasSlots = Object.keys(char.spellSlots).length > 0

  return (
    <div className={styles.panel}>
      {hasSlots ? (
        <section className={styles.spellSlotsSection}>
          <h3 className={styles.sectionTitle}>Spell Slots</h3>
          <div className={styles.slotGrid}>
            {(Object.entries(char.spellSlots) as [string, { used: number; total: number }][])
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([lvl, slot]) => {
                const remaining = slot.total - slot.used
                return (
                  <div key={lvl} className={styles.slotRow}>
                    <span className={styles.slotLevel}>Level {lvl}</span>
                    <div className={styles.slotPips}>
                      {Array.from({ length: slot.total }).map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.slotPip} ${i < remaining ? styles.slotPipFull : styles.slotPipEmpty}`}
                          onClick={() => i < remaining ? onUseSlot(Number(lvl)) : onRecoverSlot(Number(lvl))}
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
      ) : (
        <div className={styles.emptyPanel}>
          <p>No spell slots configured.</p>
          <p className={styles.emptyPanelSub}>Spellcasters will have slot counts set during character creation.</p>
        </div>
      )}

      {char.spellIds.length > 0 && (
        <section className={styles.spellListSection}>
          <h3 className={styles.sectionTitle}>Known Spells</h3>
          <div className={styles.spellList}>
            {char.spellIds.map(id => (
              <div key={id} className={styles.spellEntry}>
                <span className={styles.spellName}>{id}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ── Features Panel ── */
const CLASS_FEATURES: Record<string, { level: number; name: string; desc: string }[]> = {
  Fighter: [
    { level: 1, name: 'Fighting Style', desc: 'Adopt a particular style of fighting (+2 to a roll type based on style chosen).' },
    { level: 1, name: 'Second Wind', desc: 'Bonus action: regain 1d10 + fighter level HP. Recharges on short/long rest.' },
    { level: 2, name: 'Action Surge', desc: 'Take one additional action this turn. Recharges on short/long rest.' },
    { level: 3, name: 'Martial Archetype', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two by 1. Max 20.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Wizard: [
    { level: 1, name: 'Arcane Recovery', desc: 'Short rest: recover spell slots with total level ≤ ½ wizard level (rounded up).' },
    { level: 2, name: 'Arcane Tradition', desc: 'Choose your subclass.' },
    { level: 4, name: 'ASI', desc: 'Increase one ability score by 2, or two by 1. Max 20.' },
    { level: 5, name: 'Third-level Spells', desc: 'Access to 3rd-level spell slots.' },
  ],
  Rogue: [
    { level: 1, name: 'Expertise', desc: 'Double proficiency on 2 chosen skills.' },
    { level: 1, name: 'Sneak Attack', desc: 'Once per turn, deal extra damage when attacking with advantage or with an ally adjacent to target.' },
    { level: 1, name: 'Thieves\' Cant', desc: 'Secret language and signs used by rogues.' },
    { level: 2, name: 'Cunning Action', desc: 'Bonus action: Dash, Disengage, or Hide.' },
    { level: 3, name: 'Roguish Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Uncanny Dodge', desc: 'Reaction: halve damage from an attack you can see.' },
  ],
  Barbarian: [
    { level: 1, name: 'Rage', desc: 'Bonus action: enter rage for 1 min. +damage, advantage on Str checks/saves, resistance to B/P/S damage. 2/LR at level 1.' },
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Con mod.' },
    { level: 2, name: 'Reckless Attack', desc: 'Advantage on first Str attack, but attacks against you have advantage until next turn.' },
    { level: 2, name: 'Danger Sense', desc: 'Advantage on Dex saves against effects you can see.' },
    { level: 3, name: 'Primal Path', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Cleric: [
    { level: 1, name: 'Divine Domain', desc: 'Choose your subclass (domain).' },
    { level: 2, name: 'Channel Divinity (1/rest)', desc: 'Use a special divine effect (varies by domain).' },
    { level: 2, name: 'Turn Undead', desc: 'Channel Divinity: Wisdom save DC 8+Prof+Wis vs undead. On fail, undead flees for 1 min.' },
    { level: 5, name: 'Destroy Undead', desc: 'On a failed Turn, undead of CR ½ or lower is destroyed.' },
  ],
  Paladin: [
    { level: 1, name: 'Divine Sense', desc: 'Action: detect celestials, fiends, and undead within 60ft. Uses = 1 + Cha mod / LR.' },
    { level: 1, name: 'Lay on Hands', desc: 'Touch: restore HP from a pool of 5×paladin level per LR. Can cure diseases/poisons (5 HP each).' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 2, name: 'Divine Smite', desc: 'On hit: expend a spell slot to deal 2d8 + 1d8/slot level above 1st radiant damage.' },
    { level: 3, name: 'Sacred Oath', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Ranger: [
    { level: 1, name: 'Favored Enemy', desc: 'Advantage on survival checks to track, and on Int checks to recall info about enemy type.' },
    { level: 1, name: 'Natural Explorer', desc: 'Expertise in one terrain type. No difficulty from difficult terrain. Foraging double yields.' },
    { level: 2, name: 'Fighting Style', desc: 'Adopt a particular style of fighting.' },
    { level: 3, name: 'Ranger Archetype', desc: 'Choose your subclass.' },
    { level: 5, name: 'Extra Attack', desc: 'Attack twice when you take the Attack action.' },
  ],
  Bard: [
    { level: 1, name: 'Bardic Inspiration', desc: 'Bonus action: give ally a d6 inspiration die to add to one roll. Uses = Cha mod / LR.' },
    { level: 2, name: 'Jack of All Trades', desc: 'Add half proficiency (rounded down) to any non-proficient ability check.' },
    { level: 2, name: 'Song of Rest', desc: 'During a short rest, ally expending HD regains extra HP (d6 at level 2).' },
    { level: 3, name: 'Bard College', desc: 'Choose your subclass.' },
    { level: 3, name: 'Expertise', desc: 'Double proficiency on 2 chosen skills.' },
    { level: 5, name: 'Font of Inspiration', desc: 'Regain Bardic Inspiration uses on short or long rest.' },
  ],
  Druid: [
    { level: 1, name: 'Druidic', desc: 'Secret language of druids.' },
    { level: 2, name: 'Wild Shape', desc: 'Action: transform into a beast you\'ve seen. CR ≤ ¼ at level 2, CR ≤ ½ at level 4. 2 uses / SR.' },
    { level: 2, name: 'Druid Circle', desc: 'Choose your subclass.' },
  ],
  Monk: [
    { level: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + Dex mod + Wis mod.' },
    { level: 1, name: 'Martial Arts', desc: 'Use Dex for unarmed strikes. Use d4 as unarmed damage (scales with level).' },
    { level: 2, name: 'Ki', desc: 'Spend Ki points (= monk level / SR) on special abilities.' },
    { level: 2, name: 'Flurry of Blows', desc: '1 Ki: After Attack action, make 2 unarmed strikes as bonus action.' },
    { level: 2, name: 'Patient Defense', desc: '1 Ki: Take Dodge as bonus action.' },
    { level: 2, name: 'Step of the Wind', desc: '1 Ki: Take Disengage or Dash as bonus action. Jump distance doubled.' },
    { level: 3, name: 'Monastic Tradition', desc: 'Choose your subclass.' },
    { level: 5, name: 'Stunning Strike', desc: '1 Ki: Con save DC 8+Prof+Wis on a hit. On fail: stunned until your next turn.' },
  ],
  Sorcerer: [
    { level: 1, name: 'Sorcerous Origin', desc: 'Choose your subclass.' },
    { level: 2, name: 'Font of Magic', desc: 'Sorcery points pool (= sorcerer level). Convert to spell slots or spend on Metamagic.' },
    { level: 3, name: 'Metamagic', desc: 'Choose 2 options to modify spells (Careful, Distant, Empowered, Extended, Heightened, Quickened, Subtle, Twinned).' },
  ],
  Warlock: [
    { level: 1, name: 'Otherworldly Patron', desc: 'Choose your subclass.' },
    { level: 2, name: 'Eldritch Invocations', desc: 'Choose 2 invocations to augment your abilities.' },
    { level: 3, name: 'Pact Boon', desc: 'Pact of the Blade / Chain / Tome.' },
    { level: 5, name: '3rd-level Pact Slots', desc: 'Pact slots are now 3rd level.' },
  ],
}

function FeaturesPanel({ classId, level }: { classId: string; level: number }) {
  const features = CLASS_FEATURES[classId] ?? []
  const available = features.filter(f => f.level <= level)

  if (available.length === 0) {
    return (
      <div className={styles.emptyPanel}>
        <p>No class features found for {classId}.</p>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.featureList}>
        {available.map((f, i) => (
          <div key={i} className={styles.featureCard}>
            <div className={styles.featureHeader}>
              <span className={styles.featureName}>{f.name}</span>
              <span className={styles.featureLevel}>Lvl {f.level}</span>
            </div>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
