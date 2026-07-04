import { useState } from 'react'
import type { AbilityScore, Character } from '@/entities/character/types'
import { getClassFeatures, type FeatureEntry } from '@/shared/data/classFeaturesData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { RACE_BY_ID } from '@/shared/data/raceData'
import { FEATS, FEAT_BY_ID } from '@/shared/data/featsData'
import { SPELLS } from '@/shared/data/spellData'
import { BACKGROUNDS } from '@/shared/data/backgrounds'
import { computePreparedSpellCount } from '@/domain/rules'
import { Panel } from '@/ui/Panel'
import styles from './FeaturesPanel.module.css'

type SourcedFeature = FeatureEntry & { source: 'class' | 'race' | 'custom' | 'feat'; customIndex?: number; featId?: string }

const ABILITY_LABELS: Record<AbilityScore, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }
const FIXED_FEAT_SPELLS: Record<string, string[]> = {
  'fey-touched': ['misty-step'],
  'shadow-touched': ['invisibility'],
  telekinetic: ['mage-hand'],
  telepathic: ['detect-thoughts'],
}

const FIGHTING_STYLE_DATA: Record<string, { label: string; desc: string }> = {
  archery:             { label: 'Archery',             desc: 'You gain a +2 bonus to attack rolls you make with ranged weapons.' },
  defense:             { label: 'Defense',             desc: 'While you are wearing armor, you gain a +1 bonus to AC.' },
  dueling:             { label: 'Dueling',             desc: 'When you are wielding a melee weapon in one hand and no other weapons, you gain a +2 bonus to damage rolls with that weapon.' },
  greatWeaponFighting: { label: 'Great Weapon Fighting', desc: 'When you roll a 1 or 2 on a damage die for an attack you make with a melee weapon that you are wielding with two hands, you can reroll the die and must use the new roll.' },
  protection:          { label: 'Protection',          desc: 'When a creature you can see attacks a target other than you that is within 5 feet of you, you can use your reaction to impose disadvantage on the attack roll. You must be wielding a shield.' },
  twoWeaponFighting:   { label: 'Two-Weapon Fighting', desc: 'When you engage in two-weapon fighting, you can add your ability modifier to the damage of the second attack.' },
}

const SUBCLASS_FEATURE_NAMES = new Set([
  'Arcane Tradition', 'Otherworldly Patron', 'Divine Domain',
  'Martial Archetype', 'Primal Path', 'Bard College', 'Druid Circle',
  'Monastic Tradition', 'Sacred Oath', 'Ranger Archetype',
  'Roguish Archetype', 'Sorcerous Origin',
])

const SORCERER_ORIGIN_NOTES: Record<string, string> = {
  DraconicBloodline: 'Unarmored AC 13 + DEX; +1 HP per sorcerer level. (wired)',
  WildMagicSorcerer: 'Tides of Chaos (1/LR); roll on the Wild Magic Surge table (see 2D).',
  DivineSoul: 'Access the cleric spell list; Favored by the Gods reroll.',
  ShadowMagic: '120 ft darkvision; Hound of Ill Omen; Strength of the Grave.',
  StormSorcery: 'Tempestuous Magic: fly 10 ft (no OA) after casting a L1+ spell.',
  AberrantMind: 'Expanded spell list + telepathy/order notes.',
  ClockworkSoul: 'Expanded spell list + telepathy/order notes.',
}

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  addFeat: (featId: string, opts?: { abilityChoice?: AbilityScore; spellIds?: string[] }) => void
  removeFeat: (featId: string) => void
  selectedFeature: FeatureEntry | null
  onSelectFeature: (f: FeatureEntry | null) => void
}

export function FeaturesPanel({ character: char, update, addFeat, removeFeat, selectedFeature, onSelectFeature }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [featOpen, setFeatOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [featSearch, setFeatSearch] = useState('')
  const [selectedFeatId, setSelectedFeatId] = useState('')
  const [featAbilityChoice, setFeatAbilityChoice] = useState<AbilityScore | ''>('')
  const [featSpellIdsText, setFeatSpellIdsText] = useState('')
  const [featSpellClass, setFeatSpellClass] = useState('')

  const customFeatures = char.customFeatures ?? []
  const selectedFeat = selectedFeatId ? FEAT_BY_ID[selectedFeatId] : undefined
  const fixedFeatSpellIds = selectedFeat
    ? [...new Set([...(selectedFeat.grantedSpells ?? []), ...(FIXED_FEAT_SPELLS[selectedFeatId] ?? [])])]
    : []
  const chosenSpellIds = featSpellIdsText.split(',').map(s => s.trim()).filter(Boolean)
  const featSpellPicks = chosenSpellIds
  const magicInitiateClasses = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard']
  const spellOptions = {
    fey: SPELLS.filter(s => s.level === 1 && ['Enchantment', 'Divination'].includes(s.school)),
    shadow: SPELLS.filter(s => s.level === 1 && ['Illusion', 'Necromancy'].includes(s.school)),
    artificerCantrips: SPELLS.filter(s => s.level === 0 && s.classes.includes('Artificer')),
    artificerFirst: SPELLS.filter(s => s.level === 1 && s.classes.includes('Artificer')),
    magicCantrips: featSpellClass ? SPELLS.filter(s => s.level === 0 && s.classes.includes(featSpellClass)) : [],
    magicFirst: featSpellClass ? SPELLS.filter(s => s.level === 1 && s.classes.includes(featSpellClass)) : [],
  }
  const featCanSave = !!selectedFeat && (!selectedFeat.abilityChoice || !!featAbilityChoice)

  function addFeature() {
    const name = newName.trim()
    if (!name) return
    update({ customFeatures: [...customFeatures, { name, desc: newDesc.trim() }] })
    setNewName(''); setNewDesc(''); setAddOpen(false)
  }
  function removeFeature(index: number) {
    update({ customFeatures: customFeatures.filter((_, i) => i !== index) })
  }
  function commitFeat() {
    if (!selectedFeat || !featCanSave) return
    addFeat(selectedFeat.id, {
      abilityChoice: featAbilityChoice || undefined,
      spellIds: [...new Set([...fixedFeatSpellIds, ...chosenSpellIds])],
    })
    setSelectedFeatId('')
    setFeatAbilityChoice('')
    setFeatSpellIdsText('')
    setFeatSpellClass('')
    setFeatSearch('')
    setFeatOpen(false)
  }

  // ── Class features ──────────────────────────────────────────────────────
  const baseFeatures = getClassFeatures(char.classId, char.level)
  const fsData = char.fightingStyle ? FIGHTING_STYLE_DATA[char.fightingStyle] : null
  const fsEntry: FeatureEntry | null = fsData
    ? { level: 1, name: `Fighting Style: ${fsData.label}`, desc: fsData.desc }
    : null
  const classFeatures: SourcedFeature[] = (fsEntry ? [fsEntry, ...baseFeatures] : [...baseFeatures])
    .map(f => ({ ...f, source: 'class' as const }))

  if (char.isRaging) {
    const rageDmgBonus = char.level >= 16 ? 4 : char.level >= 9 ? 3 : 2
    classFeatures.unshift({
      level: 1, source: 'class',
      name: 'Rage Active',
      desc: `+${rageDmgBonus} damage on STR melee attacks. Resistance: bludgeoning, piercing, slashing. Advantage on STR checks & STR saves.`,
    })
  }

  if (char.subclass === 'Samurai' && char.level >= 3) {
    const total = 3
    const used = char.resources?.['Fighting Spirit']?.used ?? 0
    const left = Math.max(0, total - used)
    const tempHp = char.level >= 15 ? 15 : char.level >= 10 ? 10 : 5
    classFeatures.push({
      level: 3, source: 'class',
      name: `Fighting Spirit (${left}/${total})`,
      desc: `Bonus action: advantage on all weapon attack rolls until end of turn, plus ${tempHp} temporary HP. Recharges on long rest.`,
    })
  }

  // Subclass-defined features (per SubclassDef.subclassFeatures)
  if (char.subclass) {
    const subclassDef = SUBCLASS_BY_ID[char.subclass]
    for (const f of subclassDef?.subclassFeatures ?? []) {
      if (f.level <= char.level) {
        classFeatures.push({ ...f, source: 'class' })
      }
    }
    if (char.classId === 'Sorcerer' && SORCERER_ORIGIN_NOTES[char.subclass]) {
      classFeatures.push({
        level: 1,
        source: 'class',
        name: 'Sorcerous Origin Note',
        desc: SORCERER_ORIGIN_NOTES[char.subclass],
      })
    }
  }

  function setFeatSpellPick(index: number, spellId: string) {
    const next = [...featSpellPicks]
    next[index] = spellId
    setFeatSpellIdsText(next.filter(Boolean).join(','))
  }

  const classDef = CLASS_BY_ID[char.classId]
  const spellcastingAbility = classDef?.spellcastingAbility
  if (classDef?.prepareSpells && spellcastingAbility) {
    const abilityScore = char.abilityScores[spellcastingAbility]
    const prepCap = computePreparedSpellCount(char.classId, char.level, abilityScore)
    classFeatures.push({
      level: 1, source: 'class',
      name: `Prepared Spells (${char.preparedSpellIds.length}/${prepCap})`,
      desc: `You can prepare up to ${prepCap} spells from your class list after a long rest. Currently ${char.preparedSpellIds.length} prepared.`,
    })
  }

  if (char.classId === 'Wizard') {
    classFeatures.push({
      level: 1,
      source: 'class',
      name: 'Reaction Options',
      desc: 'Shield / Counterspell reaction options.',
    })
  }

  // ── Race traits ─────────────────────────────────────────────────────────
  const raceDef = RACE_BY_ID[char.race]
  const raceFeatures: SourcedFeature[] = (raceDef?.traits ?? []).map(t => ({
    level: 0, source: 'race' as const, name: t, desc: '',
  }))

  // Feat chosen at creation (Variant Human or any race with freeFeat)
  const raceFeat = raceDef?.freeFeat ? char.feats[0] : undefined
  if (raceFeat) {
    const featDef = FEAT_BY_ID[raceFeat]
    if (featDef) {
      raceFeatures.push({ level: 0, source: 'race', name: featDef.name, desc: featDef.description })
    }
  }

  // ── Background feature ──────────────────────────────────────────────────
  const bgDef = BACKGROUNDS.find(b => b.id === char.background)
  if (bgDef?.feature) {
    raceFeatures.unshift({ level: 0, source: 'race' as const, name: bgDef.feature, desc: `Background: ${bgDef.label}` })
  }

  // ── Custom (user-added) features ────────────────────────────────────────
  const customSourced: SourcedFeature[] = customFeatures.map((f, i) => ({
    level: 0, source: 'custom' as const, name: f.name, desc: f.desc, customIndex: i,
  }))
  const featSourced: SourcedFeature[] = char.feats
    .map(featId => {
      const feat = FEAT_BY_ID[featId]
      if (!feat) return null
      const mountedNote = featId === 'mountedCombatant' && char.mountedCombatantFlags
        ? ' Mounted Combatant flags: advantage vs smaller unmounted creatures, redirect attacks from your mount to you, and mount damage protection on DEX saves.'
        : ''
      return { level: 0, source: 'feat' as const, name: feat.name, desc: `${feat.description}${mountedNote}`, featId }
    })
    .filter(Boolean) as SourcedFeature[]

  // ── Merge: race traits first (level 0), then class by level, then custom ──
  const features: SourcedFeature[] = [
    ...raceFeatures,
    ...classFeatures.sort((a, b) => a.level - b.level),
    ...customSourced,
    ...featSourced,
  ]
  const featMatches = FEATS
    .filter(f => !char.feats.includes(f.id))
    .filter(f => f.name.toLowerCase().includes(featSearch.toLowerCase()))

  return (
    <Panel
      label="Features"
      actions={[
        { label: featOpen ? 'Cancel' : '+ Add Feat', onClick: () => { setFeatOpen(v => !v); setAddOpen(false) } },
        { label: addOpen ? 'Cancel' : '+ Add Feature', onClick: () => { setAddOpen(v => !v); setFeatOpen(false) } },
      ]}
    >
      {featOpen && (
        <div className={styles.addForm}>
          <input
            className={styles.addInput}
            type="search"
            placeholder="Search feats"
            value={featSearch}
            autoFocus
            onChange={e => setFeatSearch(e.target.value)}
          />
          <select
            className={styles.addInput}
            value={selectedFeatId}
            onChange={e => { setSelectedFeatId(e.target.value); setFeatAbilityChoice(''); setFeatSpellIdsText(''); setFeatSpellClass('') }}
          >
            <option value="">Choose feat</option>
            {featMatches.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {selectedFeat && (
            <span className={styles.featPickerDesc}>{selectedFeat.description}</span>
          )}
          {selectedFeat?.abilityChoice && (
            <select
              className={styles.addInput}
              value={featAbilityChoice}
              onChange={e => setFeatAbilityChoice(e.target.value as AbilityScore)}
            >
              <option value="">Choose ability</option>
              {selectedFeat.abilityChoice.map(ab => (
                <option key={ab} value={ab}>{ABILITY_LABELS[ab]}</option>
              ))}
            </select>
          )}
          {fixedFeatSpellIds.length > 0 && (
            <span className={styles.featPickerDesc}>Granted spell IDs: {fixedFeatSpellIds.join(', ')}</span>
          )}
          {selectedFeat?.id === 'fey-touched' && (
            <select
              className={styles.addInput}
              value={featSpellPicks[0] ?? ''}
              onChange={e => setFeatSpellPick(0, e.target.value)}
            >
              <option value="">Choose 1st-level enchantment/divination spell</option>
              {spellOptions.fey.map(spell => (
                <option key={spell.id} value={spell.id}>{spell.name}</option>
              ))}
            </select>
          )}
          {selectedFeat?.id === 'shadow-touched' && (
            <select
              className={styles.addInput}
              value={featSpellPicks[0] ?? ''}
              onChange={e => setFeatSpellPick(0, e.target.value)}
            >
              <option value="">Choose 1st-level illusion/necromancy spell</option>
              {spellOptions.shadow.map(spell => (
                <option key={spell.id} value={spell.id}>{spell.name}</option>
              ))}
            </select>
          )}
          {selectedFeat?.id === 'magicInitiate' && (
            <>
              <select
                className={styles.addInput}
                value={featSpellClass}
                onChange={e => { setFeatSpellClass(e.target.value); setFeatSpellIdsText('') }}
              >
                <option value="">Choose class spell list</option>
                {magicInitiateClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              {[0, 1].map(index => (
                <select
                  key={index}
                  className={styles.addInput}
                  value={featSpellPicks[index] ?? ''}
                  onChange={e => setFeatSpellPick(index, e.target.value)}
                  disabled={!featSpellClass}
                >
                  <option value="">Choose cantrip {index + 1}</option>
                  {spellOptions.magicCantrips.map(spell => (
                    <option key={spell.id} value={spell.id}>{spell.name}</option>
                  ))}
                </select>
              ))}
              <select
                className={styles.addInput}
                value={featSpellPicks[2] ?? ''}
                onChange={e => setFeatSpellPick(2, e.target.value)}
                disabled={!featSpellClass}
              >
                <option value="">Choose 1st-level spell</option>
                {spellOptions.magicFirst.map(spell => (
                  <option key={spell.id} value={spell.id}>{spell.name}</option>
                ))}
              </select>
            </>
          )}
          {selectedFeat?.id === 'artificer-initiate' && (
            <>
              <select
                className={styles.addInput}
                value={featSpellPicks[0] ?? ''}
                onChange={e => setFeatSpellPick(0, e.target.value)}
              >
                <option value="">Choose Artificer cantrip</option>
                {spellOptions.artificerCantrips.map(spell => (
                  <option key={spell.id} value={spell.id}>{spell.name}</option>
                ))}
              </select>
              <select
                className={styles.addInput}
                value={featSpellPicks[1] ?? ''}
                onChange={e => setFeatSpellPick(1, e.target.value)}
              >
                <option value="">Choose Artificer 1st-level spell</option>
                {spellOptions.artificerFirst.map(spell => (
                  <option key={spell.id} value={spell.id}>{spell.name}</option>
                ))}
              </select>
            </>
          )}
          {selectedFeat?.id === 'spellSniper' && (
            <input
              className={styles.addInput}
              placeholder="Additional granted spell IDs (comma-separated)"
              value={featSpellIdsText}
              onChange={e => setFeatSpellIdsText(e.target.value)}
            />
          )}
          <button className={styles.addSave} onClick={commitFeat} disabled={!featCanSave}>Save Feat</button>
        </div>
      )}
      {addOpen && (
        <div className={styles.addForm}>
          <input
            className={styles.addInput}
            placeholder="Feature name"
            value={newName}
            autoFocus
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addFeature() }}
          />
          <textarea
            className={styles.addTextarea}
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <button className={styles.addSave} onClick={addFeature} disabled={!newName.trim()}>Save Feature</button>
        </div>
      )}
      {features.length === 0 ? (
        <span className={styles.emptyNote}>No features at this level.</span>
      ) : (
        <div className={styles.featureList}>
          {features.map((f, i) => {
            const isSelected = selectedFeature?.name === f.name && selectedFeature?.level === f.level
            return (
              <div key={i} className={`${styles.featureCard} ${isSelected ? styles.featureCardSel : ''}`}>
                <button className={styles.featureHead} onClick={() => onSelectFeature(isSelected ? null : f)}>
                  <span className={styles.featureName}>
                    {f.name}
                    {SUBCLASS_FEATURE_NAMES.has(f.name) && char.subclass && (
                      <span className={styles.featureSub}>{SUBCLASS_BY_ID[char.subclass]?.label}</span>
                    )}
                    {f.name === 'Rage' && char.isRaging && (
                      <span className={styles.featureSubRaging}>Raging</span>
                    )}
                    {f.name === 'Bladesong' && char.isBladesinging && (
                      <span className={styles.featureSubRaging}>Singing</span>
                    )}
                  </span>
                  <span className={styles.featureLevel}>
                    <span className={f.source === 'race' ? styles.badgeRace : f.source === 'custom' ? styles.badgeCustom : f.source === 'feat' ? styles.badgeFeat : styles.badgeClass}>
                      {f.source === 'race' ? 'RACE' : f.source === 'custom' ? 'CUSTOM' : f.source === 'feat' ? 'FEAT' : 'CLASS'}
                    </span>
                    {f.level > 0 && <span>Lvl {f.level}</span>}
                  </span>
                </button>
                {f.source === 'custom' && f.customIndex !== undefined && (
                  <button
                    className={styles.featureRemove}
                    title="Remove feature"
                    onClick={() => removeFeature(f.customIndex!)}
                  >×</button>
                )}
                {f.source === 'feat' && f.featId && (
                  <button
                    className={styles.featureRemove}
                    title="Remove feat"
                    onClick={() => removeFeat(f.featId!)}
                  >×</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
