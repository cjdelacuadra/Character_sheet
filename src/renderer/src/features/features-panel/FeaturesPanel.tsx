import type { Character } from '@/entities/character/types'
import { getClassFeatures, type FeatureEntry } from '@/shared/data/classFeaturesData'
import { SUBCLASS_BY_ID } from '@/shared/data/subclassData'
import { CLASS_BY_ID } from '@/shared/data/classData'
import { computePreparedSpellCount } from '@/domain/rules'
import styles from './FeaturesPanel.module.css'

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

interface Props {
  character: Character
  selectedFeature: FeatureEntry | null
  onSelectFeature: (f: FeatureEntry | null) => void
}

export function FeaturesPanel({ character: char, selectedFeature, onSelectFeature }: Props) {
  const baseFeatures = getClassFeatures(char.classId, char.level)
  const fsData = char.fightingStyle ? FIGHTING_STYLE_DATA[char.fightingStyle] : null
  const fsEntry: FeatureEntry | null = fsData
    ? { level: 1, name: `Fighting Style: ${fsData.label}`, desc: fsData.desc }
    : null
  const features: FeatureEntry[] = fsEntry ? [fsEntry, ...baseFeatures] : [...baseFeatures]

  if (char.isRaging) {
    const rageDmgBonus = char.level >= 16 ? 4 : char.level >= 9 ? 3 : 2
    features.unshift({
      level: 1,
      name: 'Rage Active',
      desc: `+${rageDmgBonus} damage on STR melee attacks. Resistance: bludgeoning, piercing, slashing. Advantage on STR checks & STR saves.`,
    })
  }

  if (char.subclass === 'Samurai' && char.level >= 3) {
    const total = 3
    const used = char.resources?.['Fighting Spirit']?.used ?? 0
    const left = Math.max(0, total - used)
    const tempHp = char.level >= 15 ? 15 : char.level >= 10 ? 10 : 5
    features.push({
      level: 3,
      name: `Fighting Spirit (${left}/${total})`,
      desc: `Bonus action: advantage on all weapon attack rolls until end of turn, plus ${tempHp} temporary HP. Recharges on long rest.`,
    })
  }

  const classDef = CLASS_BY_ID[char.classId]
  const spellcastingAbility = classDef?.spellcastingAbility
  if (classDef?.prepareSpells && spellcastingAbility) {
    const abilityScore = char.abilityScores[spellcastingAbility]
    const prepCap = computePreparedSpellCount(char.classId, char.level, abilityScore)
    features.push({
      level: 1,
      name: `Prepared Spells (${char.preparedSpellIds.length}/${prepCap})`,
      desc: `You can prepare up to ${prepCap} spells from your class list after a long rest. Currently ${char.preparedSpellIds.length} prepared.`,
    })
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>{char.classId} Features</span>
      </div>
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
                  </span>
                  <span className={styles.featureLevel}>Lvl {f.level}</span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
