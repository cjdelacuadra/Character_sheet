/**
 * Rich feature details — the interactive per-feature panels (Wild Shape,
 * Channel Divinity, Metamagic, Portent, Rage/Bladesong toggles, invocation/
 * infusion/rune/pact-boon/expertise pickers…). Extracted verbatim from
 * ActionDetailPanel's feature branch (decomposition step 2).
 */
import { useState } from 'react'
import type { Character, Weapon } from '@/entities/character/types'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computeAttackCount, getAvailableActions } from '@/domain/rules'
import { channelDivinityOptionsFor } from '@/domain/data/channelDivinityData'
import { METAMAGIC_OPTIONS, metamagicKnownCount } from '@/domain/data/metamagicData'
import { portentDiceCount, wildShapeLimit } from '@/domain/rules/casterFeatures'
import { rollDie } from '@/domain/dice'
import { mod, effectiveAbilityScore, computeSpeedFull } from '@/shared/data/charCalculations'
import { SPELL_BY_ID } from '@/shared/data/spellData'
import { FEATS } from '@/shared/data/featsData'
import { FIGHTING_STYLES, FIGHTING_STYLE_BY_ID } from '@/shared/data/fightingStylesData'
import { SUBCLASSES, SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { INVOCATIONS, maxInvocations } from '@/shared/data/invocationsData'
import { INFUSIONS, maxInfusionsKnown, maxInfusionsActive } from '@/shared/data/infusionsData'
import { MANEUVERS, MANEUVER_BY_ID, MANEUVER_PROGRESSION, maneuversKnown } from '@/shared/data/maneuversData'
import { ARCANE_SHOTS, ARCANE_SHOT_BY_ID, ARCANE_SHOT_PROGRESSION, arcaneShotsKnown } from '@/shared/data/arcaneShotsData'
import { psiWarriorAbilities } from '@/shared/data/psiWarriorData'
import { runes } from '@/shared/data/runeData'
import { wildSurgeTable } from '@/shared/data/wildSurgeTable'
import { WILD_MAGIC_SURGE_TABLE } from '@/shared/data/wildMagicSurgeTable'
import { WILD_SHAPE_BEASTS } from '@/shared/data/wildShapeBeasts'
import { SKILLS } from '@/shared/data/skills'
import { ResourcesPanel } from '@/features/resources/ResourcesPanel'
import { SpellsPanel } from '@/features/spells/SpellsPanel'
import { GEAR_BY_ID } from '@/shared/data/equipment/gear'
import { useAppStore } from '@/app/store'
import type { FeatureEntry } from '@/shared/data/classFeaturesData'
import { ArcaneRecoveryDetail } from './ArcaneRecoveryDetail'
import {
  activeInfusionsOf, activeRunesOf, chainFamiliarOf, fightingStyleLocked, fightingStyleOf,
  infusionsKnownOf, invocationsOf, isBladesinging, isRaging, masterySpellsOf,
  pactBoonLockedOf, pactBoonOf, runesKnownOf, tomeCantripsOf, wildShapeFormOf,
} from '@/domain/character/compat'
import styles from './ActionDetailPanel.module.css'

const SUBCLASS_FEATURE_NAMES = new Set([
  'Arcane Tradition', 'Otherworldly Patron', 'Divine Domain',
  'Martial Archetype', 'Primal Path', 'Bard College', 'Druid Circle',
  'Monastic Tradition', 'Sacred Oath', 'Ranger Archetype',
  'Roguish Archetype', 'Sorcerous Origin',
])

interface Props {
  character: Character
  update: (patch: Partial<Character>) => void
  feature: FeatureEntry
  onSummon?: (templateId: string, count?: number, source?: { spellId?: string }) => void
  onConcentrationBroken?: () => void
}

export function FeatureDetails({ character: char, update, feature: selectedFeature, onSummon, onConcentrationBroken }: Props) {
  const [pendingStyle, setPendingStyle] = useState<string | null>(null)
  const [pendingSubclass, setPendingSubclass] = useState<string | null>(null)
  const [pendingBoon, setPendingBoon] = useState<string | null>(null)
  const [selectedWildShapeBeastId, setSelectedWildShapeBeastId] = useState('wolf')
  const [wildMagicRoll, setWildMagicRoll] = useState<number | null>(null)
  const [barbarianWildSurgeRoll, setBarbarianWildSurgeRoll] = useState<number | null>(null)
  const spendEconomy = useAppStore(s => s.spendEconomy)
  // In feature context there is no selected action, so the legacy
  // use-action button never rendered; kept as a no-op for the ported markup.
  const renderActionUseButton = () => null

  const isAsi = selectedFeature.name === 'ASI'
  const isSpellbook = selectedFeature.name === 'Spellbook'
  const isFightingStyle = selectedFeature.name === 'Fighting Style'
  const asiChoiceLabel = isAsi ? char.completedAsiChoices?.[selectedFeature.level] : undefined
  const asiDone = isAsi ? (char.completedAsiLevels ?? []).includes(selectedFeature.level) : false

  if (isFightingStyle) {
    const classDef = CLASS_BY_ID[char.classId]
    const hasPendingAsi = (classDef?.asiLevels ?? []).includes(char.level) &&
      !(char.completedAsiLevels ?? []).includes(char.level)
    const isLocked = fightingStyleLocked(char) && !hasPendingAsi
    const chosen = fightingStyleOf(char) ? FIGHTING_STYLE_BY_ID[fightingStyleOf(char)!] : null
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Fighting Style</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          {isLocked ? (
            <>
              {chosen && (
                <>
                  <p className={styles.detailFull}><strong>{chosen.name}</strong></p>
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{chosen.description}</p>
                </>
              )}
              <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                Style locked — can retrain at next ASI level.
              </p>
            </>
          ) : (
            <>
              {hasPendingAsi && chosen && (
                <p className={styles.detailFull} style={{ color: 'var(--accent)', fontSize: 11, marginBottom: 6 }}>
                  Retraining available at this level.
                </p>
              )}
              {!chosen && !pendingStyle && (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your fighting style:</p>
              )}
              <div className={styles.fightingStyleList}>
                {FIGHTING_STYLES.map(s => (
                  <button
                    key={s.id}
                    className={`${styles.fightingStyleOption} ${(pendingStyle ?? fightingStyleOf(char)) === s.id ? styles.fightingStyleOptionActive : ''}`}
                    onClick={() => setPendingStyle(s.id)}
                  >
                    <span className={styles.fightingStyleName}>{s.name}</span>
                    <span className={styles.fightingStyleDesc}>{s.description}</span>
                  </button>
                ))}
              </div>
              {(pendingStyle || fightingStyleOf(char)) && (
                <button
                  className={styles.armoryAddBtn}
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    update({ fightingStyle: pendingStyle ?? fightingStyleOf(char) ?? undefined, fightingStyleLocked: true })
                    setPendingStyle(null)
                  }}
                >
                  Confirm Style
                </button>
              )}
            </>
          )}
        </div>
      </>
    )
  }

  if (isSpellbook) {
    return (
      <>
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedFeature.name}</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
        </div>
        <div className={styles.spellsWrapper}>
          <SpellsPanel
            character={char}
            update={update}
            onLearnSpell={(id) => update({ spellIds: [...new Set([...char.spellIds, id])] })}
            onSummon={onSummon}
            onConcentrationBroken={onConcentrationBroken}
          />
        </div>
      </>
    )
  }

  if (isAsi && asiChoiceLabel) {
    const isFeat = asiChoiceLabel.startsWith('Feat: ')
    if (isFeat) {
      const raw = asiChoiceLabel.slice(6)
      const featName = raw.replace(/\s*\([^)]*\)$/, '')
      const abilitySuffix = raw.match(/\(([^)]+)\)$/)?.[1] ?? null
      const featDef = FEATS.find(f => f.name === featName)
      return (
        <>
          <ResourcesPanel character={char} update={update} />
          <div className={styles.detailPane}>
            <div className={styles.detailHeader}>
              <span className={styles.detailName}>{selectedFeature.name}</span>
              <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
              {renderActionUseButton()}
            </div>
            <p className={styles.detailFull}>
              <strong>Feat — {featName}</strong>{abilitySuffix ? ` · ${abilitySuffix}` : ''}
            </p>
            {featDef && <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{featDef.description}</p>}
          </div>
        </>
      )
    }
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedFeature.name}</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}><strong>{asiChoiceLabel}</strong></p>
        </div>
      </>
    )
  }

  const isSpellMastery = selectedFeature.name === 'Spell Mastery'
  if (isSpellMastery) {
    const level1Spells = char.spellIds.filter(id => SPELL_BY_ID[id]?.level === 1)
    const level2Spells = char.spellIds.filter(id => SPELL_BY_ID[id]?.level === 2)
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Spell Mastery</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
          <div className={styles.masterySlotPicker}>
            <span className={styles.masterySpellLabel}>1st-level mastered spell</span>
            <div className={styles.masterySpellGrid}>
              {level1Spells.map(id => (
                <button
                  key={id}
                  className={`${styles.masterySpellChip} ${masterySpellsOf(char).level1 === id ? styles.masterySpellChipActive : ''}`}
                  onClick={() => update({ masterySpells: { ...masterySpellsOf(char), level1: id } })}
                >
                  {SPELL_BY_ID[id]?.name ?? id}
                </button>
              ))}
              {level1Spells.length === 0 && <span className={styles.masterySpellEmpty}>No 1st-level spells in spellbook.</span>}
            </div>
            <span className={styles.masterySpellLabel}>2nd-level mastered spell</span>
            <div className={styles.masterySpellGrid}>
              {level2Spells.map(id => (
                <button
                  key={id}
                  className={`${styles.masterySpellChip} ${masterySpellsOf(char).level2 === id ? styles.masterySpellChipActive : ''}`}
                  onClick={() => update({ masterySpells: { ...masterySpellsOf(char), level2: id } })}
                >
                  {SPELL_BY_ID[id]?.name ?? id}
                </button>
              ))}
              {level2Spells.length === 0 && <span className={styles.masterySpellEmpty}>No 2nd-level spells in spellbook.</span>}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Generic subclass picker (Arcane Tradition, Otherworldly Patron, Divine Domain, etc.) ──
  const isSubclassPicker = SUBCLASS_FEATURE_NAMES.has(selectedFeature.name)
  if (isSubclassPicker) {
    const candidates = SUBCLASSES.filter(s => s.classId === char.classId)
    const chosen = char.subclass ? SUBCLASS_BY_ID[char.subclass] : null
    const isLocked = char.subclassLocked ?? false
    const featureName = selectedFeature.name
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{featureName}</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          {isLocked ? (
            <>
              {chosen && (
                <>
                  <p className={styles.detailFull}><strong>{chosen.label}</strong></p>
                  {chosen.description && <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{chosen.description}</p>}
                </>
              )}
              <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                Subclass locked — this choice is permanent.
              </p>
            </>
          ) : (
            <>
              {!chosen && !pendingSubclass && (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your {featureName.toLowerCase()}:</p>
              )}
              <div className={styles.fightingStyleList}>
                {candidates.map(s => (
                  <button
                    key={s.id}
                    className={`${styles.fightingStyleOption} ${(pendingSubclass ?? char.subclass) === s.id ? styles.fightingStyleOptionActive : ''}`}
                    onClick={() => setPendingSubclass(s.id)}
                  >
                    <span className={styles.fightingStyleName}>{s.label}</span>
                    {s.description && <span className={styles.fightingStyleDesc}>{s.description}</span>}
                  </button>
                ))}
              </div>
              {(pendingSubclass || char.subclass) && (
                <button
                  className={styles.armoryAddBtn}
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    update({ subclass: pendingSubclass ?? char.subclass ?? undefined, subclassLocked: true })
                    setPendingSubclass(null)
                  }}
                >
                  Confirm {featureName}
                </button>
              )}
            </>
          )}
        </div>
      </>
    )
  }

  // ── Eldritch Invocations ──────────────────────────────────────────
  const isEldritchInvocations = selectedFeature.name === 'Eldritch Invocations'
  if (isEldritchInvocations) {
    const known = invocationsOf(char)
    const maxKnown = maxInvocations(char.level)
    const eligible = INVOCATIONS.filter(inv =>
      (inv.prerequisiteLevel ?? 2) <= char.level &&
      (!inv.prerequisite || inv.prerequisite === 'Pact of the Blade' ? pactBoonOf(char) === 'blade' :
        inv.prerequisite === 'Pact of the Tome' ? pactBoonOf(char) === 'tome' : true)
    )
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Eldritch Invocations</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>{known.length} / {maxKnown} invocations known</div>
          <div className={styles.fightingStyleList}>
            {INVOCATIONS.map(inv => {
              const isKnown = known.includes(inv.id)
              const levelOk = (inv.prerequisiteLevel ?? 2) <= char.level
              const prereqOk = !inv.prerequisite ||
                (inv.prerequisite === 'Pact of the Blade' && pactBoonOf(char) === 'blade') ||
                (inv.prerequisite === 'Pact of the Tome' && pactBoonOf(char) === 'tome')
              const canAdd = !isKnown && known.length < maxKnown && levelOk && prereqOk
              const isDisabled = !isKnown && !canAdd
              return (
                <button
                  key={inv.id}
                  className={`${styles.fightingStyleOption} ${isKnown ? styles.fightingStyleOptionActive : ''}`}
                  style={isDisabled ? { opacity: 0.4 } : undefined}
                  disabled={isDisabled && !isKnown}
                  onClick={() => {
                    if (!levelOk || !prereqOk) return
                    const updated = isKnown
                      ? known.filter(id => id !== inv.id)
                      : known.length < maxKnown ? [...known, inv.id] : known
                    update({ warlockInvocations: updated })
                  }}
                >
                  <span className={styles.fightingStyleName}>
                    {inv.name}
                    {inv.prerequisite && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {inv.prerequisite}</span>}
                    {(inv.prerequisiteLevel ?? 2) > 2 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · Level {inv.prerequisiteLevel}+</span>}
                  </span>
                  <span className={styles.fightingStyleDesc}>{inv.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  // ── Artificer Infusions ───────────────────────────────────────────
  const isInfuseItem = selectedFeature.name === 'Infuse Item'
  if (isInfuseItem) {
    const known = infusionsKnownOf(char)
    const active = activeInfusionsOf(char)
    const maxKnown = maxInfusionsKnown(char.level)
    const maxActive = maxInfusionsActive(char.level)
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Infuse Item</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>
            {known.length} / {maxKnown} infusions known · {active.length} / {maxActive} active
          </div>
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
          <div className={styles.fightingStyleList}>
            {INFUSIONS.map(inf => {
              const isKnown = known.includes(inf.id)
              const isActive = active.includes(inf.id)
              const levelOk = (inf.prerequisiteLevel ?? 2) <= char.level
              const canLearn = !isKnown && known.length < maxKnown && levelOk
              const canActivate = isKnown && !isActive && active.length < maxActive
              return (
                <div
                  key={inf.id}
                  className={`${styles.fightingStyleOption} ${isKnown ? styles.fightingStyleOptionActive : ''}`}
                  style={!isKnown && !levelOk ? { opacity: 0.4 } : undefined}
                >
                  <span className={styles.fightingStyleName}>
                    {inf.name}
                    {inf.appliesTo && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {inf.appliesTo}</span>}
                    {(inf.prerequisiteLevel ?? 2) > 2 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · Level {inf.prerequisiteLevel}+</span>}
                  </span>
                  <span className={styles.fightingStyleDesc}>{inf.description}</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <button
                      className={styles.detailChipBtn}
                      disabled={!isKnown && !canLearn}
                      onClick={() => {
                        if (isKnown) {
                          update({
                            artificerInfusions: known.filter(id => id !== inf.id),
                            activeArtificerInfusions: active.filter(id => id !== inf.id),
                          })
                        } else if (canLearn) {
                          update({ artificerInfusions: [...known, inf.id] })
                        }
                      }}
                    >
                      {isKnown ? '− Forget' : '+ Learn'}
                    </button>
                    {isKnown && (
                      <button
                        className={styles.detailChipBtn}
                        disabled={!isActive && !canActivate}
                        onClick={() => {
                          update({
                            activeArtificerInfusions: isActive
                              ? active.filter(id => id !== inf.id)
                              : [...active, inf.id],
                          })
                        }}
                      >
                        {isActive ? '◉ Active' : '○ Activate'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  // ── Pact Boon ─────────────────────────────────────────────────────
  const isRuneCarver = selectedFeature.name === 'Rune Carver' && char.subclass === 'RuneKnight'
  if (isRuneCarver) {
    const known = runesKnownOf(char)
    const active = activeRunesOf(char)
    const maxKnown = char.level >= 15 ? 5 : char.level >= 10 ? 4 : char.level >= 7 ? 3 : 2
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Rune Carver</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>
            {known.length} / {maxKnown} runes known · {active.length} active
          </div>
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
          <div className={styles.fightingStyleList}>
            {runes.map(rune => {
              const isKnown = known.includes(rune.id)
              const isActive = active.includes(rune.id)
              const resourceKey = `Rune:${rune.id}`
              const resource = char.resources[resourceKey] ?? { used: 0, total: 1 }
              const canLearn = !isKnown && known.length < maxKnown
              const canActivate = isKnown && resource.used < resource.total
              return (
                <div
                  key={rune.id}
                  className={`${styles.fightingStyleOption} ${isKnown ? styles.fightingStyleOptionActive : ''}`}
                >
                  <span className={styles.fightingStyleName}>
                    {rune.name}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {rune.activationType}</span>
                  </span>
                  <span className={styles.fightingStyleDesc}>Passive: {rune.passiveBonus}</span>
                  <span className={styles.fightingStyleDesc}>Activate: {rune.activatedEffect}</span>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    <button
                      className={styles.detailChipBtn}
                      disabled={!isKnown && !canLearn}
                      onClick={() => {
                        const resources = { ...char.resources }
                        if (isKnown) {
                          delete resources[resourceKey]
                          update({
                            knownRunes: known.filter(id => id !== rune.id),
                            activeRunes: active.filter(id => id !== rune.id),
                            resources,
                          })
                        } else if (canLearn) {
                          resources[resourceKey] = resources[resourceKey] ?? { used: 0, total: 1 }
                          update({ knownRunes: [...known, rune.id], resources })
                        }
                      }}
                    >
                      {isKnown ? '− Forget' : '+ Learn'}
                    </button>
                    {isKnown && (
                      <button
                        className={styles.detailChipBtn}
                        disabled={!isActive && !canActivate}
                        onClick={() => {
                          if (isActive) {
                            update({ activeRunes: active.filter(id => id !== rune.id) })
                            return
                          }
                          if (!canActivate) return
                          update({
                            activeRunes: [...active, rune.id],
                            resources: {
                              ...char.resources,
                              [resourceKey]: { total: resource.total, used: Math.min(resource.total, resource.used + 1) },
                            },
                          })
                        }}
                      >
                        {isActive ? '◉ Active' : resource.used >= resource.total ? 'Used' : '○ Activate'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  const isPactBoon = selectedFeature.name === 'Pact Boon'
  if (isPactBoon) {
    const PACT_OPTIONS = [
      { id: 'blade', name: 'Pact of the Blade', description: 'Use your action to create a pact weapon in your empty hand. You can choose its form. It counts as magical and you are proficient with it. Disappears if it is more than 5 ft from you for 1 minute.' },
      { id: 'chain', name: 'Pact of the Chain', description: 'Learn Find Familiar. Your familiar can take one of the following forms: imp, pseudodragon, quasit, or sprite. It can attack as a reaction while you cast a spell.' },
      { id: 'tome', name: 'Pact of the Tome', description: 'Your patron gives you a grimoire called a Book of Shadows. It contains 3 cantrips of your choice from any class. These count as warlock spells for you.' },
    ]
    const isLocked = pactBoonLockedOf(char)
    const chosen = pactBoonOf(char) ? PACT_OPTIONS.find(p => p.id === pactBoonOf(char)) : null

    // Pact of the Blade: add weapon on confirm
    const handleConfirmBlade = () => {
      const PACT_WEAPON: Weapon = {
        id: 'pact-weapon',
        name: 'Pact Weapon',
        atkBonus: 0,
        damage: '1d8',
        damageType: 'slashing',
        rangeType: 'Melee',
        properties: ['versatile (1d10)'],
      }
      update({
        pactBoon: 'blade',
        pactBoonLocked: true,
        weapons: [...char.weapons, PACT_WEAPON],
        hexWarriorWeaponId: 'pact-weapon',
      })
      setPendingBoon(null)
    }

    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Pact Boon</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          {isLocked ? (
            <>
              {chosen && (
                <>
                  <p className={styles.detailFull}><strong>{chosen.name}</strong></p>
                  <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>{chosen.description}</p>
                </>
              )}
              {chosen?.id === 'blade' && (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                  Your Pact Weapon appears in your weapons list and uses CHA for attacks/damage (Hex Warrior).
                </p>
              )}
              {chosen?.id === 'tome' && tomeCantripsOf(char).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p className={styles.detailFull} style={{ fontWeight: 600, marginBottom: 4 }}>Cantrips Known:</p>
                  {tomeCantripsOf(char).map(cid => {
                    const spell = SPELL_BY_ID[cid]
                    return <p key={cid} className={styles.detailFull} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{spell?.name || cid}</p>
                  })}
                </div>
              )}
              {chosen?.id === 'chain' && chainFamiliarOf(char) && (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>
                  Familiar: <strong>{chainFamiliarOf(char)}</strong>
                </p>
              )}
              <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 8, fontStyle: 'italic' }}>
                Pact Boon locked — this choice is permanent.
              </p>
            </>
          ) : (
            <>
              {!chosen && !pendingBoon && (
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>Choose your Pact Boon:</p>
              )}
              <div className={styles.fightingStyleList}>
                {PACT_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    className={`${styles.fightingStyleOption} ${(pendingBoon ?? pactBoonOf(char)) === p.id ? styles.fightingStyleOptionActive : ''}`}
                    onClick={() => setPendingBoon(p.id)}
                  >
                    <span className={styles.fightingStyleName}>{p.name}</span>
                    <span className={styles.fightingStyleDesc}>{p.description}</span>
                  </button>
                ))}
              </div>
              {(pendingBoon || pactBoonOf(char)) && (
                <button
                  className={styles.armoryAddBtn}
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const boonId = pendingBoon ?? pactBoonOf(char)
                    if (boonId === 'blade') {
                      handleConfirmBlade()
                    } else if (boonId === 'tome') {
                      update({ pactBoon: 'tome', pactBoonLocked: true, tomeCantrips: [] })
                      setPendingBoon(null)
                    } else if (boonId === 'chain') {
                      update({ pactBoon: 'chain', pactBoonLocked: true })
                      setPendingBoon(null)
                    }
                  }}
                >
                  Confirm Pact Boon
                </button>
              )}
            </>
          )}
        </div>
      </>
    )
  }

  // ── Channel Divinity ──────────────────────────────────────────────
  const isChannelDivinity = selectedFeature.name.startsWith('Channel Divinity')
  if (isChannelDivinity) {
    const cdRes = char.resources['Channel Divinity']
    const cdRemaining = cdRes ? cdRes.total - cdRes.used : 0
    const cdOptions = channelDivinityOptionsFor(char.subclass, char.level)
    const spendChannelDivinity = (optionAction: 'action' | 'bonus' | 'reaction' | 'special') => {
      if (!cdRes || cdRemaining <= 0) return
      update({ resources: { ...char.resources, 'Channel Divinity': { ...cdRes, used: cdRes.used + 1 } } })
      if (optionAction === 'action' || optionAction === 'bonus' || optionAction === 'reaction') {
        spendEconomy(char.id, optionAction)
      }
    }
    const cdFormula = (formula: string) =>
      formula.replace('<level*2>', String(char.level * 2)).replace('<level>', String(char.level))
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Channel Divinity</span>
            <span className={`${styles.detailBadge} ${styles.badgeAction}`}>Short Rest</span>
          </div>
          {cdRes && (
            <div className={styles.detailResource}>
              {cdRemaining} / {cdRes.total} uses remaining
            </div>
          )}
          {cdOptions.map(opt => {
            const mech = opt.mechanics
            const mechLine =
              mech?.kind === 'healPool' && mech.amountPerLevel > 0 ? `Heal pool: ${mech.amountPerLevel * char.level} HP` :
              mech?.kind === 'damage' ? `Damage: ${cdFormula(mech.formula)} ${mech.damageType}${mech.save ? ` (${mech.save.toUpperCase()} save)` : ''}` :
              mech?.kind === 'tempHp' ? `Temp HP: ${cdFormula(mech.formula)}` :
              mech?.kind === 'attackBonus' ? `+${mech.value} to the attack roll` :
              null
            return (
              <div key={opt.id} style={{ marginTop: 8 }}>
                <div className={styles.detailHeader}>
                  <span className={styles.detailName} style={{ fontSize: 12 }}>{opt.name}</span>
                  <span className={`${styles.detailBadge} ${styles.badgeAction}`}>
                    {opt.action === 'bonus' ? 'Bonus' : opt.action === 'reaction' ? 'Reaction' : opt.action === 'special' ? 'Special' : 'Action'}
                  </span>
                  <button
                    type="button"
                    className={styles.actionUseBtn}
                    disabled={cdRemaining <= 0}
                    onClick={() => spendChannelDivinity(opt.action)}
                    title={cdRemaining <= 0 ? 'No Channel Divinity uses remaining' : 'Spend 1 Channel Divinity use'}
                  >
                    Use
                  </button>
                </div>
                {mechLine && <p className={styles.detailFull} style={{ fontWeight: 600, marginBottom: 2 }}>{mechLine}</p>}
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ── Metamagic ─────────────────────────────────────────────────────
  const isMetamagic = selectedFeature.name === 'Metamagic'
  if (isMetamagic) {
    const metaState = char.featureState?.['metamagic'] ?? {}
    const known = metaState.known ?? []
    const limit = metamagicKnownCount(char.level)
    const spRes = char.resources['Sorcery Points']
    const spRemaining = spRes ? spRes.total - spRes.used : 0
    const toggleKnown = (id: string) => {
      const next = known.includes(id)
        ? known.filter(x => x !== id)
        : known.length < limit ? [...known, id] : known
      update({ featureState: { ...(char.featureState ?? {}), metamagic: { ...metaState, known: next } } })
    }
    const spendMetamagic = (cost: number) => {
      if (!spRes || spRemaining < cost) return
      update({ resources: { ...char.resources, 'Sorcery Points': { ...spRes, used: spRes.used + cost } } })
    }
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Metamagic</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>{known.length}/{limit} known</span>
          </div>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
            Choose your known options ({limit} at your level), then spend sorcery points when you apply one to a spell.
          </p>
          {METAMAGIC_OPTIONS.map(opt => {
            const isKnown = known.includes(opt.id)
            const costLabel = opt.costsSpellLevel ? 'spell level' : `${opt.cost} pt`
            return (
              <div key={opt.id} style={{ marginTop: 8 }}>
                <div className={styles.detailHeader}>
                  <span className={styles.detailName} style={{ fontSize: 12 }}>{opt.name}</span>
                  <span className={`${styles.detailBadge} ${styles.badgeBonus}`}>{costLabel}</span>
                  <button
                    type="button"
                    className={styles.actionUseBtn}
                    disabled={!isKnown && known.length >= limit}
                    onClick={() => toggleKnown(opt.id)}
                  >
                    {isKnown ? 'Forget' : 'Learn'}
                  </button>
                  {isKnown && !opt.costsSpellLevel && (
                    <button
                      type="button"
                      className={styles.actionUseBtn}
                      disabled={spRemaining < opt.cost}
                      onClick={() => spendMetamagic(opt.cost)}
                      title={spRemaining < opt.cost ? 'Not enough sorcery points' : `Spend ${opt.cost} sorcery point${opt.cost > 1 ? 's' : ''}`}
                    >
                      Spend {opt.cost}pt
                    </button>
                  )}
                  {isKnown && opt.costsSpellLevel && (
                    <span className={styles.detailResource} title="Cost equals the spell's level (minimum 1) — spend from the Sorcery Points pool above">
                      cost = spell level
                    </span>
                  )}
                </div>
                <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
              </div>
            )
          })}
        </div>
      </>
    )
  }

  // ── Portent (Divination) ──────────────────────────────────────────
  const isPortent = selectedFeature.name === 'Portent' || selectedFeature.name === 'Greater Portent'
  if (isPortent) {
    const portentState = char.featureState?.['portent'] ?? {}
    const rolls = (portentState.data?.rolls as number[] | undefined) ?? []
    const diceCount = portentDiceCount(char.level)
    const setRolls = (next: number[]) =>
      update({ featureState: { ...(char.featureState ?? {}), portent: { ...portentState, data: { ...portentState.data, rolls: next } } } })
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Portent</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>{diceCount} dice / long rest</span>
            <button
              type="button"
              className={styles.actionUseBtn}
              onClick={() => setRolls(Array.from({ length: diceCount }, () => rollDie(20)))}
              title="Roll your foretelling dice (after a long rest)"
            >
              Roll {diceCount}d20
            </button>
          </div>
          {rolls.length > 0 ? (
            <div className={styles.detailResource} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              Foretold:
              {rolls.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.actionUseBtn}
                  onClick={() => setRolls(rolls.filter((_, j) => j !== i))}
                  title="Spend this foretelling roll (replaces any attack roll, save, or ability check)"
                >
                  {r} ✕
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>No foretelling dice recorded — roll after a long rest.</p>
          )}
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
        </div>
      </>
    )
  }

  // ── Rage ──────────────────────────────────────────────────────────
  const isWildMagicSurge = selectedFeature.name === 'Wild Magic Surge' && char.subclass === 'WildMagicSorcerer'
  if (isWildMagicSurge) {
    const result = wildMagicRoll
      ? WILD_MAGIC_SURGE_TABLE.find(row => row.min <= wildMagicRoll && wildMagicRoll <= row.max)
      : null
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Wild Magic Surge</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>d100</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
          <button
            className={styles.armoryAddBtn}
            style={{ marginTop: 8 }}
            onClick={() => setWildMagicRoll(Math.floor(Math.random() * 100) + 1)}
          >
            Roll d100
          </button>
          {result && (
            <div className={styles.detailResource} style={{ marginTop: 10 }}>
              Roll {wildMagicRoll}: {result.effect}
            </div>
          )}
        </div>
      </>
    )
  }

  const isTidesOfChaos = selectedFeature.name === 'Tides of Chaos' && char.subclass === 'WildMagicSorcerer'
  if (isTidesOfChaos) {
    const res = char.resources['Tides of Chaos'] ?? { used: 0, total: 1 }
    const remaining = Math.max(0, res.total - res.used)
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Tides of Chaos</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Long Rest</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>{remaining} / {res.total} uses remaining</div>
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
          <button
            className={styles.armoryAddBtn}
            style={{ marginTop: 8 }}
            disabled={remaining <= 0}
            onClick={() => update({
              resources: {
                ...char.resources,
                'Tides of Chaos': { total: res.total, used: Math.min(res.total, res.used + 1) },
              },
            })}
          >
            Use Tides of Chaos
          </button>
        </div>
      </>
    )
  }

  const isPsionicPower = selectedFeature.name === 'Psionic Power' && char.subclass === 'PsiWarrior'
  if (isPsionicPower) {
    const res = char.resources['Psionic Energy']
    const total = res?.total ?? char.proficiencyBonus * 2
    const used = res?.used ?? 0
    const remaining = Math.max(0, total - used)
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Psionic Power</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Subclass</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>{remaining} / {total} Psionic Energy dice remaining</div>
          <p className={styles.detailFull} style={{ marginTop: 6 }}>{selectedFeature.desc}</p>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {psiWarriorAbilities.map(ability => {
              const locked = char.level < ability.unlockLevel
              const canSpend = ability.diceCost > 0 && !locked && remaining >= ability.diceCost
              return (
                <div key={ability.id} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <strong style={{ fontSize: 12 }}>{ability.name}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      L{ability.unlockLevel} · {ability.diceCost === 0 ? 'No cost' : `${ability.diceCost} die`}
                    </span>
                  </div>
                  <p className={styles.detailFull} style={{ marginTop: 4, color: locked ? 'var(--text-muted)' : undefined }}>
                    {ability.description}
                  </p>
                  {ability.diceCost > 0 && (
                    <button
                      className={styles.armoryAddBtn}
                      style={{ marginTop: 6 }}
                      disabled={!canSpend}
                      onClick={() => {
                        if (!canSpend) return
                        update({
                          resources: {
                            ...char.resources,
                            'Psionic Energy': { total, used: Math.min(total, used + ability.diceCost) },
                          },
                        })
                      }}
                    >
                      Spend Psionic Energy
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </>
    )
  }

  const isRage = selectedFeature.name === 'Rage'
  if (isRage) {
    const rageRes = char.resources['Rage']
    const canRage = rageRes ? rageRes.used < rageRes.total : false
    const wildSurgeResult = barbarianWildSurgeRoll
      ? wildSurgeTable.find(row => row.roll === barbarianWildSurgeRoll)
      : null
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Rage</span>
            <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
            {renderActionUseButton()}
          </div>
          {char.subclass === 'WildMagicBarbarian' && (
            <div style={{ marginTop: 8 }}>
              <button
                className={styles.detailChipBtn}
                onClick={() => setBarbarianWildSurgeRoll(Math.floor(Math.random() * 8) + 1)}
              >
                Wild Surge (roll d8)
              </button>
              {wildSurgeResult && (
                <div className={styles.detailResource} style={{ marginTop: 8 }}>
                  Roll {wildSurgeResult.roll}: {wildSurgeResult.name} - {wildSurgeResult.description}
                </div>
              )}
            </div>
          )}
          {isRaging(char) ? (
            <div className={styles.detailResource} style={{ color: 'var(--danger, #ef4444)' }}>Currently Raging</div>
          ) : (
            rageRes && <div className={styles.detailResource}>{rageRes.total - rageRes.used} / {rageRes.total} rages remaining</div>
          )}
          <p className={styles.detailFull} style={{ marginTop: 6 }}>While raging:</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +2 damage on STR-based weapon attacks</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• Advantage on STR checks and STR saving throws</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• Resistance to bludgeoning, piercing, and slashing damage</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Rage ends if you don't attack or take damage since your last turn, or you fall unconscious.</p>
          {isRaging(char) ? (
            <button
              className={styles.armoryAddBtn}
              style={{ marginTop: 8, background: 'var(--danger, #ef4444)' }}
              onClick={() => update({ isRaging: false })}
            >
              End Rage
            </button>
          ) : (
            <button
              className={styles.armoryAddBtn}
              style={{ marginTop: 8 }}
              disabled={!canRage}
              onClick={() => {
                if (!canRage) return
                const newResources = { ...char.resources }
                if (newResources['Rage']) newResources['Rage'] = { ...newResources['Rage'], used: newResources['Rage'].used + 1 }
                if (char.subclass === 'WildMagicBarbarian') setBarbarianWildSurgeRoll(Math.floor(Math.random() * 8) + 1)
                update({ isRaging: true, resources: newResources })
              }}
            >
              Begin Raging
            </button>
          )}
        </div>
      </>
    )
  }

  // ── Bladesong ─────────────────────────────────────────────────────
  const isBladesongFeature = selectedFeature.name === 'Bladesong'
  if (isBladesongFeature) {
    const bsRes = char.resources['Bladesong']
    const total = 2
    const used = bsRes?.used ?? 0
    const canActivate = used < total
    const hasShield = !!(char.equipment.shieldId || char.equipment.hasShield)
    const hasTwoHanded = char.weapons.some(w => w.twoHanded)
    const armorId = char.equipment.armorId
    const armorDef = armorId ? GEAR_BY_ID[armorId] : null
    const isMedHeavy = armorDef?.type === 'medium' || armorDef?.type === 'heavy'
    const blocked = hasShield || hasTwoHanded || isMedHeavy
    const intMod = mod(char.abilityScores.int)
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Bladesong</span>
            <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
            {renderActionUseButton()}
          </div>
          {isBladesinging(char) ? (
            <div className={styles.detailResource} style={{ color: 'var(--accent)' }}>Bladesong Active</div>
          ) : (
            <div className={styles.detailResource}>{total - used} / {total} uses · Long rest recharge</div>
          )}
          <p className={styles.detailFull} style={{ marginTop: 6 }}>While active (1 minute):</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +{Math.max(1, intMod)} to AC (INT modifier, min +1)</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +10 ft movement speed</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• Advantage on Acrobatics checks</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>• +{Math.max(1, intMod)} to Constitution saves (concentration)</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>Requires: light or no armor, no shield, no two-handed weapon. Ends if you don armor or a shield, wield a two-handed weapon, or are incapacitated.</p>
          {blocked && !isBladesinging(char) && (
            <p className={styles.detailFull} style={{ color: 'var(--danger, #ef4444)', fontSize: 11, marginTop: 4 }}>
              {isMedHeavy ? 'Remove medium/heavy armor first.' : hasShield ? 'Unequip shield first.' : 'Unequip two-handed weapon first.'}
            </p>
          )}
          {isBladesinging(char) ? (
            <button
              className={styles.armoryAddBtn}
              style={{ marginTop: 8, background: 'var(--danger, #ef4444)' }}
              onClick={() => update({ isBladesinging: false })}
            >
              End Bladesong
            </button>
          ) : (
            <button
              className={styles.armoryAddBtn}
              style={{ marginTop: 8 }}
              disabled={!canActivate || blocked}
              onClick={() => {
                if (!canActivate || blocked) return
                const newResources = { ...char.resources }
                newResources['Bladesong'] = { total, used: used + 1 }
                update({ isBladesinging: true, resources: newResources })
              }}
            >
              Activate Bladesong
            </button>
          )}
        </div>
      </>
    )
  }

  // ── Unarmored Defense ─────────────────────────────────────────────
  const isUnarmoredDefense = selectedFeature.name === 'Unarmored Defense'
  if (isUnarmoredDefense) {
    const dexMod = Math.floor((char.abilityScores.dex - 10) / 2)
    const conMod = Math.floor((char.abilityScores.con - 10) / 2)
    const wisMod = Math.floor((char.abilityScores.wis - 10) / 2)
    const formula = char.classId === 'Barbarian'
      ? `10 + DEX (${dexMod >= 0 ? '+' : ''}${dexMod}) + CON (${conMod >= 0 ? '+' : ''}${conMod}) = ${10 + dexMod + conMod}`
      : `10 + DEX (${dexMod >= 0 ? '+' : ''}${dexMod}) + WIS (${wisMod >= 0 ? '+' : ''}${wisMod}) = ${10 + dexMod + wisMod}`
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Unarmored Defense</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>Current AC: {char.armorClass}</div>
          <p className={styles.detailFull}>Formula: {formula}</p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            Only applies when not wearing armor. A shield is still allowed.
          </p>
        </div>
      </>
    )
  }

  // ── Wild Shape ────────────────────────────────────────────────────
  const isWildShape = selectedFeature.name === 'Wild Shape'
  if (isWildShape) {
    const wsRes = char.resources['Wild Shape']
    const isMoon = char.subclass === 'CircleOfTheMoon'
    // Moon-aware limits from the rules engine: CR cap, movement modes, and
    // bonus-action economy. (Previously the beast filter used the standard
    // cap even for Moon druids, hiding their CR-1 forms at level 2.)
    const wsLimit = wildShapeLimit(char.level, isMoon) ?? { maxCR: 0.25, canSwim: false, canFly: false, economy: 'action' as const }
    const crLabel = wsLimit.maxCR === 0.25 ? 'CR 1/4' : wsLimit.maxCR === 0.5 ? 'CR 1/2' : `CR ${wsLimit.maxCR}`
    const eligibleBeasts = WILD_SHAPE_BEASTS.filter(beast => beast.cr <= wsLimit.maxCR)
    const selectedBeast = eligibleBeasts.find(beast => beast.id === selectedWildShapeBeastId) ?? eligibleBeasts[0]
    const currentForm = wildShapeFormOf(char)
    const canShape = !!wsRes && wsRes.used < wsRes.total && !!selectedBeast && !currentForm
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Wild Shape</span>
            <span className={`${styles.detailBadge} ${styles.badgeAction}`}>
              {wsLimit.economy === 'bonus' ? 'Bonus · SR' : 'Action · SR'}
            </span>
            {renderActionUseButton()}
          </div>
          {wsRes && (
            <div className={styles.detailResource}>{wsRes.total - wsRes.used} / {wsRes.total} uses remaining</div>
          )}
          {currentForm && (
            <div className={styles.detailResource}>
              Current form: {currentForm.name} · {currentForm.hp.current}/{currentForm.hp.max} HP
            </div>
          )}
          <p className={styles.detailFull} style={{ marginTop: 6 }}>
            CR limit: <strong>{crLabel}</strong>
            {isMoon && <span style={{ color: 'var(--accent)', marginLeft: 6, fontSize: 11 }}>Circle of the Moon{wsLimit.economy === 'bonus' ? ' · bonus action' : ''}</span>}
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
            {!wsLimit.canSwim ? '• No fly or swim speed' : !wsLimit.canFly ? '• No fly speed' : '• Fly and swim speeds allowed'}
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            You retain your personality, memories, and mental ability scores. You revert when reduced to 0 HP, you choose to, or the duration ends (hours = ½ druid level).
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            Modeling: Wild Shape uses an inline form object on the character, so beast HP can absorb damage before overflow reaches druid HP.
          </p>
          {char.concentrationSpellId && (
            <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
              Concentration persists on the druid while shaped.
            </p>
          )}
          <select
            className={styles.armoryInput}
            style={{ marginTop: 10 }}
            value={selectedBeast?.id ?? ''}
            onChange={e => setSelectedWildShapeBeastId(e.target.value)}
          >
            {eligibleBeasts.map(beast => (
              <option key={beast.id} value={beast.id}>
                {beast.name} · CR {beast.cr} · HP {beast.hp} · AC {beast.ac}
              </option>
            ))}
          </select>
          {selectedBeast && (
            <div className={styles.detailResource} style={{ marginTop: 8 }}>
              {selectedBeast.speed} · {selectedBeast.attack}
              {selectedBeast.speed.includes('fly') && char.level < 8 ? ' · flying speed restricted before L8' : ''}
              {selectedBeast.speed.includes('swim') && char.level < 4 ? ' · swimming speed restricted before L4' : ''}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              className={styles.armoryAddBtn}
              disabled={!canShape}
              onClick={() => {
                if (!canShape || !selectedBeast || !wsRes) return
                update({
                  resources: {
                    ...char.resources,
                    'Wild Shape': { total: wsRes.total, used: Math.min(wsRes.total, wsRes.used + 1) },
                  },
                  wildShapeForm: {
                    name: selectedBeast.name,
                    hp: { current: selectedBeast.hp, max: selectedBeast.hp },
                    ac: selectedBeast.ac,
                    cr: selectedBeast.cr,
                    speed: selectedBeast.speed,
                  },
                })
              }}
            >
              Enter Wild Shape
            </button>
            {currentForm && (
              <button
                className={styles.detailChipBtn}
                onClick={() => update({ wildShapeForm: undefined })}
              >
                Leave Form
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Martial Arts ──────────────────────────────────────────────────
  const isMartialArts = selectedFeature.name === 'Martial Arts'
  if (isMartialArts) {
    const die = char.level >= 17 ? 'd10' : char.level >= 11 ? 'd8' : char.level >= 5 ? 'd6' : 'd4'
    const dexMod = Math.floor((char.abilityScores.dex - 10) / 2)
    const strMod = Math.floor((char.abilityScores.str - 10) / 2)
    const atkMod = Math.max(strMod, dexMod) + char.proficiencyBonus
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Martial Arts</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>Unarmed die: <strong>{die}</strong> · Attack: {atkMod >= 0 ? '+' : ''}{atkMod}</div>
          <p className={styles.detailFull} style={{ marginTop: 6 }}>
            You can use DEX instead of STR for unarmed strikes and monk weapons. Your unarmed strikes use the {die} damage die.
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            Die scales: d4 (1–4) → d6 (5–10) → d8 (11–16) → d10 (17–20)
          </p>
        </div>
      </>
    )
  }

  // ── Ki abilities (Flurry, Patient Defense, Step of the Wind) ─────
  const isKiAbility = ['Flurry of Blows', 'Patient Defense', 'Step of the Wind'].includes(selectedFeature.name)
  if (isKiAbility) {
    const kiRes = char.resources['Ki']
    const desc: Record<string, string> = {
      'Flurry of Blows': 'Immediately after you take the Attack action on your turn, make two unarmed strikes as a bonus action.',
      'Patient Defense': 'Take the Dodge action as a bonus action. Until the start of your next turn, attack rolls against you have disadvantage, and you make DEX saves with advantage.',
      'Step of the Wind': 'Take the Disengage or Dash action as a bonus action. Your jump distance is also doubled for the turn.',
    }
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>{selectedFeature.name}</span>
            <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus · 1 Ki</span>
            {renderActionUseButton()}
          </div>
          {kiRes && (
            <div className={styles.detailResource}>{kiRes.total - kiRes.used} / {kiRes.total} Ki remaining</div>
          )}
          <p className={styles.detailFull} style={{ marginTop: 6 }}>{desc[selectedFeature.name]}</p>
        </div>
      </>
    )
  }

  // ── Bardic Inspiration ────────────────────────────────────────────
  const isBardicInspiration = selectedFeature.name === 'Bardic Inspiration'
  if (isBardicInspiration) {
    const die = char.level >= 15 ? 'd12' : char.level >= 10 ? 'd10' : char.level >= 5 ? 'd8' : 'd6'
    const biRes = char.resources['Bardic Inspiration']
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Bardic Inspiration</span>
            <span className={`${styles.detailBadge} ${styles.badgeBonusAction}`}>Bonus</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>
            Inspiration die: <strong>{die}</strong>
            {biRes && ` · ${biRes.total - biRes.used} / ${biRes.total} uses`}
          </div>
          <p className={styles.detailFull} style={{ marginTop: 6 }}>
            Choose one creature other than yourself within 60 ft that can hear you. That creature gains one Bardic Inspiration die ({die}).
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)' }}>
            The creature can add the die to one ability check, attack roll, or saving throw within the next 10 minutes. Only one die at a time.
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
            Die scales: d6 (1–4) → d8 (5–9) → d10 (10–14) → d12 (15+)
          </p>
        </div>
      </>
    )
  }

  // ── Reckless Attack ───────────────────────────────────────────────
  const isRecklessAttack = selectedFeature.name === 'Reckless Attack'
  if (isRecklessAttack) {
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Reckless Attack</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>
            When you make your first attack on your turn, you can choose to attack recklessly. Doing so gives you advantage on melee weapon attack rolls using Strength this turn.
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            Until the start of your next turn, attack rolls against you also have advantage.
          </p>
        </div>
      </>
    )
  }

  // ── Danger Sense ─────────────────────────────────────────────────
  const isDangerSense = selectedFeature.name === 'Danger Sense'
  if (isDangerSense) {
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Danger Sense</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Passive</span>
            {renderActionUseButton()}
          </div>
          <p className={styles.detailFull}>
            You have advantage on Dexterity saving throws against effects that you can see, such as traps and spells.
          </p>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            Does not apply if you are blinded, deafened, or incapacitated.
          </p>
        </div>
      </>
    )
  }

  // ── Expertise ─────────────────────────────────────────────────────
  const isExpertise = selectedFeature.name === 'Expertise'
  if (isExpertise) {
    const maxExpertise = char.classId === 'Rogue'
      ? (char.level >= 6 ? 4 : 2)
      : char.classId === 'Bard'
      ? (char.level >= 10 ? 4 : 2)
      : 2
    const currentExpertCount = Object.values(char.skillProficiencies).filter(v => v === 'expert').length
    const proficientSkills = SKILLS.filter(s => char.skillProficiencies[s.key])
    return (
      <>
        <ResourcesPanel character={char} update={update} />
        <div className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <span className={styles.detailName}>Expertise</span>
            <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
            {renderActionUseButton()}
          </div>
          <div className={styles.detailResource}>{currentExpertCount} / {maxExpertise} expertise slots used</div>
          <p className={styles.detailFull} style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
            Click a proficient skill to upgrade it to expertise (double proficiency). Click an expert skill to revert.
          </p>
          <div className={styles.masterySpellGrid}>
            {proficientSkills.map(s => {
              const state = char.skillProficiencies[s.key]
              const isExpert = state === 'expert'
              const canUpgrade = !isExpert && currentExpertCount < maxExpertise
              return (
                <button
                  key={s.key}
                  className={`${styles.masterySpellChip} ${isExpert ? styles.masterySpellChipActive : ''}`}
                  disabled={!isExpert && !canUpgrade}
                  style={!isExpert && !canUpgrade ? { opacity: 0.4 } : undefined}
                  onClick={() => {
                    const newProfs = { ...char.skillProficiencies }
                    newProfs[s.key] = isExpert ? 'proficient' : 'expert'
                    update({ skillProficiencies: newProfs })
                  }}
                >
                  {s.label}{isExpert ? ' ★' : ''}
                </button>
              )
            })}
            {proficientSkills.length === 0 && (
              <span className={styles.masterySpellEmpty}>No proficient skills yet.</span>
            )}
          </div>
        </div>
      </>
    )
  }

  const isArcaneRecovery = selectedFeature.name === 'Arcane Recovery'
  if (isArcaneRecovery) return <ArcaneRecoveryDetail character={char} update={update} desc={selectedFeature.desc} />

  return (
    <>
      <ResourcesPanel character={char} update={update} />
      <div className={styles.detailPane}>
        <div className={styles.detailHeader}>
          <span className={styles.detailName}>{selectedFeature.name}</span>
          <span className={`${styles.detailBadge} ${styles.badgeFree}`}>Level {selectedFeature.level}</span>
          {renderActionUseButton()}
        </div>
        {isAsi && asiDone ? (
          <p className={styles.detailFull}>✓ Completed</p>
        ) : (
          <p className={styles.detailFull}>{selectedFeature.desc}</p>
        )}
      </div>
    </>
  )
}
