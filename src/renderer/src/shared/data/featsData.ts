import type { AccessoryStats } from '@/shared/data/equipment/types'
import type { AbilityScores, Character } from '@/entities/character/types'
import type { Skill } from './skills'

export type FeatTrigger =
  'passive' | 'action' | 'bonus' | 'reaction' | 'on-attack' | 'on-hit' |
  'on-damaged' | 'once-per-turn'

/** A granted resource pool size: either a fixed number, or a proficiency-scaled
 *  formula resolving to `flat + profFactor * proficiencyBonus` (min 0). */
export type GrantedResourceAmount = number | { flat?: number; profFactor?: number }

/** Resolve a {@link GrantedResourceAmount} to a concrete pool size for a given
 *  proficiency bonus. Plain numbers pass through; formulas evaluate
 *  `flat + profFactor * profBonus`, clamped to a minimum of 0. */
export function resolveGrantedResourceAmount(
  amount: GrantedResourceAmount,
  proficiencyBonus: number,
): number {
  if (typeof amount === 'number') return amount
  const flat = amount.flat ?? 0
  const factor = amount.profFactor ?? 0
  return Math.max(0, flat + factor * proficiencyBonus)
}

export interface FeatDef {
  id: string
  name: string
  description: string
  /** Rulebook this feat comes from (PHB, TCoE, ...). Unset = PHB. */
  source?: string
  trigger?: FeatTrigger
  abilityBonus?: Partial<AbilityScores>
  abilityChoice?: (keyof AbilityScores)[]
  grantedSpells?: string[]
  freeCastSpells?: string[]
  freeCastRecharge?: Record<string, 'short' | 'long'>
  grantsProficiencies?: {
    skills?: Skill[]
    savingThrows?: (keyof AbilityScores)[]
    weapons?: string[]
  }
  prerequisites?: {
    classes?: string[]
    races?: string[]
    feats?: string[]
    abilities?: Partial<AbilityScores>
  }
  grantsChoices?: Array<{
    kind: 'fighting-style' | 'maneuvers' | 'metamagic'
    count: number
  }>
  /** Resource pools this feat grants (name → amount). Added to an existing
   *  pool's total, or created; removed symmetrically when the feat is dropped.
   *  An amount is either a plain number, or a proficiency-scaled formula
   *  `{ flat, profFactor }` resolving to `flat + profFactor * proficiencyBonus`
   *  (e.g. FFXIV role actions usable "proficiency-bonus times per long rest"). */
  grantsResources?: Record<string, GrantedResourceAmount>
  /** Passive wiring (AC, initiative, skills, …) — folded by both engines (Phase 5). */
  stats?: AccessoryStats
}

export let FEATS: FeatDef[] = [
  {
    id: 'alert',
    source: 'PHB',
    name: 'Alert',
    description: '+5 bonus to initiative. You can\'t be surprised while conscious. Other creatures don\'t gain advantage on attack rolls against you from being hidden from you.',
  },
  {
    id: 'archery',
    source: 'PHB',
    name: 'Archery',
    description: 'You gain a +2 bonus to attack rolls you make with ranged weapons.',
  },
  {
    id: 'athlete',
    source: 'PHB',
    name: 'Athlete',
    description: '+1 STR or DEX (your choice). Climbing costs no extra movement. Standing up from prone uses only 5 ft of movement. Running long/high jump no longer requires a 10-ft running start.',
    abilityChoice: ['str', 'dex'],
  },
  {
    id: 'lucky',
    source: 'PHB',
    name: 'Lucky',
    description: 'You have 3 luck points. When you make an attack, ability check, or saving throw, you can spend 1 luck point to roll an extra d20 and choose which to use. You can also spend 1 point to reroll an attack targeting you.',
    grantsResources: { 'Luck Points': 3 },
  },
  {
    id: 'mobile',
    source: 'PHB',
    name: 'Mobile',
    description: 'Speed increases by 10 ft. When you Dash, difficult terrain doesn\'t cost extra movement that turn. If you make a melee attack against a creature, you don\'t provoke opportunity attacks from it for the rest of that turn.',
  },
  {
    id: 'sentinel',
    source: 'PHB',
    name: 'Sentinel',
    description: 'Opportunity attacks hit creatures even if they Disengage. When a creature makes an attack against a target other than you and within 5 ft, you can make an opportunity attack. On an opportunity attack hit, the creature\'s speed drops to 0.',
  },
  {
    id: 'tough',
    source: 'PHB',
    name: 'Tough',
    description: 'Your hit point maximum increases by an amount equal to twice your character level when you gain this feat, and every time you gain a level thereafter it increases by 2.',
  },
  {
    id: 'warCaster',
    source: 'PHB',
    name: 'War Caster',
    description: 'Advantage on Constitution saving throws to maintain concentration. You can perform somatic components even with weapons/shield in hand. When a creature provokes an opportunity attack, you can cast a spell with a casting time of 1 action as the attack.',
  },
  {
    id: 'resilient',
    source: 'PHB',
    name: 'Resilient',
    description: '+1 to one ability score of your choice. Gain proficiency in saving throws using that ability.',
    abilityChoice: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  },
  {
    id: 'sharpshooter',
    source: 'PHB',
    name: 'Sharpshooter',
    description: 'Attacking at long range doesn\'t impose disadvantage. Ranged attack rolls against targets in half or three-quarters cover ignore the cover bonus. Before a ranged attack, take −5 to the roll to deal +10 damage.',
  },
  {
    id: 'greatWeaponMaster',
    source: 'PHB',
    name: 'Great Weapon Master',
    description: 'On a critical hit or after killing a creature with a melee weapon, make one melee weapon attack as a bonus action. Before a melee attack with a heavy weapon, take −5 to the roll to deal +10 damage.',
  },
  {
    id: 'actor',
    source: 'PHB',
    name: 'Actor',
    description: '+1 CHA. Advantage on Deception/Performance when pretending to be someone else. You can mimic speech or sounds you\'ve heard (Insight DC 16 to detect).',
    abilityBonus: { cha: 1 },
  },
  {
    id: 'durable',
    source: 'PHB',
    name: 'Durable',
    description: '+1 CON. When you roll a Hit Die to regain HP, the minimum you regain equals twice your CON modifier (minimum 2).',
    abilityBonus: { con: 1 },
  },
  {
    id: 'grappler',
    source: 'PHB',
    name: 'Grappler',
    description: '+1 STR. Advantage on attack rolls against creatures you are grappling. You can use your action to try to pin a grappled creature (both are restrained until the grapple ends).',
    abilityBonus: { str: 1 },
  },
  {
    id: 'heavilyArmored',
    source: 'PHB',
    name: 'Heavily Armored',
    description: '+1 STR. Gain proficiency with heavy armor.',
    abilityBonus: { str: 1 },
  },
  {
    id: 'heavyArmorMaster',
    source: 'PHB',
    name: 'Heavy Armor Master',
    description: '+1 STR. While wearing heavy armor, bludgeoning, piercing, and slashing damage from non-magical attacks is reduced by 3.',
    abilityBonus: { str: 1 },
  },
  {
    id: 'keenMind',
    source: 'PHB',
    name: 'Keen Mind',
    description: '+1 INT. Always know which way is north, hours until sunrise/sunset, and can recall anything seen or heard within the past month.',
    abilityBonus: { int: 1 },
  },
  {
    id: 'linguist',
    source: 'PHB',
    name: 'Linguist',
    description: '+1 INT. Learn 3 languages of your choice. You can create ciphers; others need INT check vs DC (your INT score + proficiency) to decode.',
    abilityBonus: { int: 1 },
  },
  {
    id: 'charger',
    source: 'PHB',
    name: 'Charger',
    description: 'When you Dash as an action, you can use a bonus action to make one melee weapon attack or shove (+5 damage or 10 ft push if the attack hits).',
  },
  {
    id: 'crossbowExpert',
    source: 'PHB',
    name: 'Crossbow Expert',
    description: 'Ignore the loading property of crossbows. Being within 5 ft of a hostile creature doesn\'t impose disadvantage on ranged attack rolls. As a bonus action, make a one-handed ranged attack when you attack with a hand crossbow.',
  },
  {
    id: 'defensiveDuelist',
    source: 'PHB',
    name: 'Defensive Duelist',
    description: 'Prerequisite: DEX 13. When wielding a finesse weapon and hit by a melee attack, use your reaction to add your proficiency bonus to AC for that attack.',
  },
  {
    id: 'dualWielder',
    source: 'PHB',
    name: 'Dual Wielder',
    description: '+1 AC while wielding a melee weapon in each hand. You can use two-weapon fighting even when neither weapon is light. Draw or stow two one-handed weapons when normally you could only do one.',
  },
  {
    id: 'inspiringLeader',
    source: 'PHB',
    name: 'Inspiring Leader',
    description: 'Prerequisite: CHA 13. Spend 10 minutes inspiring up to 6 allies (including yourself) within 30 ft; each gains temporary HP equal to your level + CHA modifier. Usable once per short/long rest per creature.',
  },
  {
    id: 'lightlyArmored',
    source: 'PHB',
    name: 'Lightly Armored',
    description: 'Gain proficiency with light armor.',
  },
  {
    id: 'mageSlayer',
    source: 'PHB',
    name: 'Mage Slayer',
    description: 'When a creature within 5 ft casts a spell, you can use your reaction to attack it. When you damage a concentrating creature, it has disadvantage on the CON save. Advantage on saves vs. spells from creatures within 5 ft.',
  },
  {
    id: 'magicInitiate',
    source: 'PHB',
    name: 'Magic Initiate',
    description: 'Choose a class. Learn 2 cantrips and one 1st-level spell from that class\'s list. Cast the 1st-level spell once per long rest at its lowest level (or normally if you have spell slots).',
    grantedSpells: [],
    freeCastSpells: [],
  },
  {
    id: 'martialAdept',
    source: 'PHB',
    name: 'Martial Adept',
    description: 'Learn two maneuvers from the Battle Master archetype. Gain one superiority die (d6) that recharges on a short or long rest.',
    grantsResources: { 'Superiority Dice': 1 },
    grantsChoices: [{ kind: 'maneuvers', count: 2 }],
  },
  {
    id: 'mediumArmorMaster',
    source: 'PHB',
    name: 'Medium Armor Master',
    description: 'Prerequisite: medium armor proficiency. Wearing medium armor imposes no disadvantage on Stealth checks. DEX bonus to AC from medium armor increases to a maximum of +3.',
  },
  {
    id: 'moderatelyArmored',
    source: 'PHB',
    name: 'Moderately Armored',
    description: 'Prerequisite: light armor proficiency. Gain proficiency with medium armor and shields.',
  },
  {
    id: 'mountedCombatant',
    source: 'PHB',
    name: 'Mounted Combatant',
    description: 'Advantage on melee attack rolls against unmounted creatures smaller than your mount. Force attacks targeting your mount to target you instead. Your mount takes no damage on a successful DEX save (half on fail) if you aren\'t incapacitated.',
  },
  {
    id: 'observant',
    source: 'PHB',
    name: 'Observant',
    description: '+1 INT or WIS (your choice). Read lips if you can see a creature\'s mouth while it speaks. +5 bonus to passive Perception and passive Investigation.',
    abilityChoice: ['int', 'wis'],
  },
  {
    id: 'polearmMaster',
    source: 'PHB',
    name: 'Polearm Master',
    description: 'As a bonus action, make a melee attack with the butt end of a glaive, halberd, quarterstaff, or spear (1d4 bludgeoning). You can make opportunity attacks against creatures that enter your reach with these weapons.',
  },
  {
    id: 'ritualCaster',
    source: 'PHB',
    name: 'Ritual Caster',
    description: 'Prerequisite: INT or WIS 13. Acquire a ritual book with two 1st-level ritual spells from your chosen class. You can cast them as rituals (not with slots) and add new ritual spells you find.',
  },
  {
    id: 'shieldMaster',
    source: 'PHB',
    name: 'Shield Master',
    description: 'As a bonus action after attacking, you can shove a creature within 5 ft. Add your shield\'s AC bonus to DEX saves. Use your reaction to take no damage on a successful DEX save (half on fail).',
  },
  {
    id: 'skilled',
    source: 'PHB',
    name: 'Skilled',
    description: 'Gain proficiency in any combination of three skills or tools of your choice.',
  },
  {
    id: 'skulker',
    source: 'PHB',
    name: 'Skulker',
    description: 'Prerequisite: DEX 13. Hide when lightly obscured. Missing a ranged attack while hidden doesn\'t reveal your position. Dim light doesn\'t impose disadvantage on Perception checks.',
  },
  {
    id: 'spellSniper',
    source: 'PHB',
    name: 'Spell Sniper',
    description: 'When you cast a spell that requires an attack roll, double its range. Ranged spell attacks ignore half cover and three-quarters cover. Learn one cantrip that requires an attack roll from any class.',
  },
  {
    id: 'tavernBrawler',
    source: 'PHB',
    name: 'Tavern Brawler',
    description: '+1 STR or CON (your choice). Proficient with improvised weapons and unarmed strikes (1d4). On hit with an unarmed strike or improvised weapon, use a bonus action to grapple the target.',
    abilityChoice: ['str', 'con'],
  },
  {
    id: 'weaponMaster',
    source: 'PHB',
    name: 'Weapon Master',
    description: 'Gain proficiency with four weapons of your choice.',
  },
  // ── Tasha's Cauldron of Everything ──
  {
    id: 'artificer-initiate',
    source: 'TCoE',
    name: 'Artificer Initiate',
    description: 'Learn one cantrip and one 1st-level spell from the Artificer list (INT is your spellcasting ability). Cast the 1st-level spell once per long rest for free, or with a spell slot if you have one. Gain proficiency with one tool of your choice.',
    grantedSpells: [],
    freeCastSpells: [],
  },
  {
    id: 'chef',
    source: 'TCoE',
    name: 'Chef',
    description: '+1 STR or CON. Gain proficiency with cook\'s utensils if you lack it. At the end of a short rest, prepare a number of treats equal to your proficiency bonus; each heals 1d8 HP when eaten. During a long rest, cook a meal for up to 8 creatures; each creature that eats it regains extra HP equal to your proficiency bonus when it finishes the rest.',
    abilityChoice: ['str', 'con'],
  },
  {
    id: 'crusher',
    source: 'TCoE',
    name: 'Crusher',
    description: '+1 STR or CON. Once per turn on a hit with bludgeoning damage, push the target 5 ft. On a critical hit with bludgeoning damage, all attack rolls against that target have advantage until the start of your next turn.',
    abilityChoice: ['str', 'con'],
  },
  {
    id: 'eldritch-adept',
    source: 'TCoE',
    name: 'Eldritch Adept',
    description: 'Prerequisite: Spellcasting or Pact Magic feature. Learn one Eldritch Invocation option from the Warlock class. If the invocation has a prerequisite, you must meet it. You can replace this invocation with another when you gain a level.',
    grantedSpells: [],
    freeCastSpells: [],
  },
  {
    id: 'fey-touched',
    source: 'TCoE',
    name: 'Fey Touched',
    description: '+1 INT, WIS, or CHA. Learn Misty Step and one 1st-level spell from the enchantment or divination school (using the chosen ability as your spellcasting ability). Cast each spell once per long rest for free, or with a spell slot if you have one.',
    abilityChoice: ['int', 'wis', 'cha'],
    grantedSpells: ['misty-step'],
    freeCastSpells: ['misty-step'],
  },
  {
    id: 'fighting-initiate',
    source: 'TCoE',
    name: 'Fighting Initiate',
    description: 'Prerequisite: proficiency with a martial weapon. Learn one Fighting Style option from the Fighter class. Whenever you gain a level, you can replace this style with another Fighter Fighting Style.',
    grantsChoices: [{ kind: 'fighting-style', count: 1 }],
  },
  {
    id: 'gunner',
    source: 'TCoE',
    name: 'Gunner',
    description: '+1 DEX. Gain proficiency with firearms. Ignore the loading property of firearms. Being within 5 ft of a hostile creature doesn\'t impose disadvantage on your ranged attack rolls.',
    abilityChoice: ['dex'],
  },
  {
    id: 'metamagic-adept',
    source: 'TCoE',
    name: 'Metamagic Adept',
    description: 'Prerequisite: Spellcasting or Pact Magic feature. Learn two Metamagic options from the Sorcerer class. Gain 2 sorcery points to spend only on those Metamagic options; these points are regained on a long rest. (Modeled as +2 to the shared Sorcery Points pool.)',
    grantsResources: { 'Sorcery Points': 2 },
    grantsChoices: [{ kind: 'metamagic', count: 2 }],
  },
  {
    id: 'piercer',
    source: 'TCoE',
    name: 'Piercer',
    description: '+1 STR or DEX. Once per turn on a hit with piercing damage, reroll one of the damage dice and use the higher result. On a critical hit with piercing damage, roll one additional damage die.',
    abilityChoice: ['str', 'dex'],
  },
  {
    id: 'poisoner',
    source: 'TCoE',
    name: 'Poisoner',
    description: 'Ignore resistance to poison damage. As a bonus action, coat one piercing or slashing weapon with a poison that lasts for 1 minute; the next time it hits a creature, that creature must succeed on a DC 14 CON save or take 2d8 poison damage and be poisoned until the start of your next turn.',
  },
  {
    id: 'shadow-touched',
    source: 'TCoE',
    name: 'Shadow Touched',
    description: '+1 INT, WIS, or CHA. Learn Invisibility and one 1st-level spell from the illusion or necromancy school (using the chosen ability). Cast each spell once per long rest for free, or with a spell slot if you have one.',
    abilityChoice: ['int', 'wis', 'cha'],
    grantedSpells: ['invisibility'],
    freeCastSpells: ['invisibility'],
  },
  {
    id: 'slasher',
    source: 'TCoE',
    name: 'Slasher',
    description: '+1 STR or DEX. Once per turn on a hit with slashing damage, reduce the target\'s speed by 10 ft until the start of your next turn. On a critical hit with slashing damage, the target has disadvantage on attack rolls until the start of your next turn.',
    abilityChoice: ['str', 'dex'],
  },
  {
    id: 'telekinetic',
    source: 'TCoE',
    name: 'Telekinetic',
    description: '+1 INT, WIS, or CHA. Learn Mage Hand or improve its range and make it invisible. As a bonus action, telekinetically shove one creature within 30 ft (STR save DC 8 + proficiency + spellcasting modifier); on a fail, push it up to 5 ft or pull it up to 5 ft toward you.',
    abilityChoice: ['int', 'wis', 'cha'],
  },
  {
    id: 'telepathic',
    source: 'TCoE',
    name: 'Telepathic',
    description: '+1 INT, WIS, or CHA. Speak telepathically to any creature you can see within 60 ft (no common language required). Cast Detect Thoughts once per long rest without expending a spell slot (using the chosen ability as your spellcasting ability).',
    abilityChoice: ['int', 'wis', 'cha'],
    grantedSpells: ['detect-thoughts'],
    freeCastSpells: ['detect-thoughts'],
  },

  // --- Final Fantasy XIV Role Action Feats (Chapter 4). PB-scaled pools via grantsResources {profFactor}. ---
  { id: "ff-role-vanguard", source: "FFXIV", name: "Role of the Vanguard", description: "You take on the tanking role. Increase STR or CON by 1 (max 20). Provoke (bonus action, prof/long rest): challenge a creature within 30ft — it has disadvantage on attacks against others until the start of your next turn. Rampart (reaction, 1/short rest): reduce damage you take by your proficiency bonus until the start of your next turn.", abilityChoice: ["str","con"], grantsResources: {"Provoke":{"flat":0,"profFactor":1},"Rampart":1} },
  { id: "ff-heart-vanguard", source: "FFXIV", name: "Heart of the Vanguard", description: "Prerequisite: Role of the Vanguard. Increase STR or CON by 1 (max 20). Interject (reaction): when a creature casts a spell within 5ft, make a weapon attack; on a hit it makes a concentration save (DC 8 + STR/DEX mod + prof) or the spell fails. Reprisal (bonus action, prof/long rest): emit a 10ft aura reducing enemy damage by your proficiency bonus until the end of your next turn.", abilityChoice: ["str","con"], prerequisites: {"feats":["ff-role-vanguard"]}, grantsResources: {"Interject":{"flat":0,"profFactor":1},"Reprisal":{"flat":0,"profFactor":1}} },
  { id: "ff-role-soothesayer", source: "FFXIV", name: "Role of the Soothesayer", description: "You take on the healing role. Increase INT, WIS, or CHA by 1 (max 20). Cleric Stance (prof/long rest): convert a healing spell into radiant damage (+spellcasting modifier). Surecast (reaction, 1/long rest): when hit by an attack, pass on concentration checks and forced-movement saves until the start of your next turn.", abilityChoice: ["int","wis","cha"], grantsResources: {"Cleric Stance":{"flat":0,"profFactor":1},"Surecast":1} },
  { id: "ff-heart-soothesayer", source: "FFXIV", name: "Heart of the Soothesayer", description: "Prerequisite: Role of the Soothesayer. Increase INT, WIS, or CHA by 1 (max 20). Rescue (action, 1/long rest): teleport a willing creature within 60ft to within 5ft of you. Swiftcast (1/long rest): cast an action-cast spell as a bonus action.", abilityChoice: ["int","wis","cha"], prerequisites: {"feats":["ff-role-soothesayer"]}, grantsResources: {"Rescue":1,"Swiftcast":1} },
  { id: "ff-role-destroyer", source: "FFXIV", name: "Role of the Destroyer", description: "You take on the melee DPS role. Increase STR or DEX by 1 (max 20). Arm's Length (reaction, prof/long rest): when targeted by a melee attack, impose disadvantage and prevent opportunity attacks against you until the end of your next turn. Recuperate (bonus action, 1/long rest): recover 2d4 + your character level hit points.", abilityChoice: ["str","dex"], grantsResources: {"Arm's Length":{"flat":0,"profFactor":1},"Recuperate":1} },
  { id: "ff-heart-destroyer", source: "FFXIV", name: "Heart of the Destroyer", description: "Prerequisite: Role of the Destroyer. Increase STR or DEX by 1 (max 20). Feint (prof/long rest): on a melee hit, the target makes a CON save (DC 8 + prof + STR/DEX mod) or its damage is reduced by your proficiency bonus and it has disadvantage on attacks until the start of your next turn. True North (bonus action, 1/long rest): make all melee attack rolls with advantage until the start of your next turn.", abilityChoice: ["str","dex"], prerequisites: {"feats":["ff-role-destroyer"]}, grantsResources: {"Feint":{"flat":0,"profFactor":1},"True North":1} },
  { id: "ff-role-magus", source: "FFXIV", name: "Role of the Magus", description: "You take on the caster DPS role. Increase INT, WIS, or CHA by 1 (max 20). Swiftcast (1/long rest): cast an action-cast spell as a bonus action. Lucid Dreaming (1/long rest): when you cast a spell, double your proficiency bonus to that spell’s attack roll or save DC until the start of your next turn.", abilityChoice: ["int","wis","cha"], grantsResources: {"Swiftcast":1,"Lucid Dreaming":1} },
  { id: "ff-heart-magus", source: "FFXIV", name: "Heart of the Magus", description: "Prerequisite: Role of the Magus. Increase INT, WIS, or CHA by 1 (max 20). Addle (bonus action, prof/long rest): a creature within 30ft makes a WIS save (DC 8 + prof + spellcasting modifier) or its damage is reduced by your proficiency bonus and it has disadvantage on saves against your spells until the start of your next turn.", abilityChoice: ["int","wis","cha"], prerequisites: {"feats":["ff-role-magus"]}, grantsResources: {"Addle":{"flat":0,"profFactor":1}} },
  { id: "ff-role-sniper", source: "FFXIV", name: "Role of the Sniper", description: "You take on the ranged DPS role. Increase DEX by 1 (max 20). Arm's Length (reaction, prof/long rest): when targeted by a melee attack, impose disadvantage and prevent opportunity attacks against you until the end of your next turn. Peloton (bonus action, prof/long rest): you and allies within 30ft gain +10ft base movement until the start of your next turn.", abilityChoice: ["dex"], grantsResources: {"Arm's Length":{"flat":0,"profFactor":1},"Peloton":{"flat":0,"profFactor":1}} },
  { id: "ff-heart-sniper", source: "FFXIV", name: "Heart of the Sniper", description: "Prerequisite: Role of the Sniper. Increase DEX by 1 (max 20). Blunt Shot (reaction, prof/long rest): when a creature within 30ft begins casting, make a ranged attack; on a hit it makes a concentration save (DC 8 + DEX mod + prof) or the spell fails. Maiming Shot (prof/long rest): on a ranged hit, the target makes a CON save (DC 8 + prof + DEX mod) or its speed drops to 0 until the start of your next turn.", abilityChoice: ["dex"], prerequisites: {"feats":["ff-role-sniper"]}, grantsResources: {"Blunt Shot":{"flat":0,"profFactor":1},"Maiming Shot":{"flat":0,"profFactor":1}} },
]

export let FEAT_BY_ID = Object.fromEntries(FEATS.map(f => [f.id, f])) as Record<string, FeatDef>

export type GrantedSpellMode = 'none' | 'short' | 'long'

export function setGrantedSpellMode(feat: FeatDef, spellId: string, mode: GrantedSpellMode): FeatDef {
  const grantedSpells = [...new Set([...(feat.grantedSpells ?? []), spellId])]
  const freeCastSpells = new Set(feat.freeCastSpells ?? [])
  const freeCastRecharge = { ...(feat.freeCastRecharge ?? {}) }

  if (mode === 'none') {
    freeCastSpells.delete(spellId)
    delete freeCastRecharge[spellId]
  } else {
    freeCastSpells.add(spellId)
    if (mode === 'short') freeCastRecharge[spellId] = 'short'
    else delete freeCastRecharge[spellId]
  }

  return {
    ...feat,
    grantedSpells,
    freeCastSpells: freeCastSpells.size ? [...freeCastSpells] : undefined,
    freeCastRecharge: Object.keys(freeCastRecharge).length ? freeCastRecharge : undefined,
  }
}

const ABILITY_LABELS: Record<keyof AbilityScores, string> = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' }

export function featPrerequisitesMet(
  char: Pick<Character, 'classId' | 'race' | 'feats' | 'abilityScores'>,
  feat: FeatDef,
): { met: boolean; missing: string[] } {
  const missing: string[] = []
  const prerequisites = feat.prerequisites
  if (!prerequisites) return { met: true, missing }

  if (prerequisites.classes?.length && !prerequisites.classes.includes(char.classId)) {
    missing.push(...prerequisites.classes.map(classId => `class ${classId}`))
  }
  if (prerequisites.races?.length && !prerequisites.races.includes(char.race)) {
    missing.push(...prerequisites.races.map(race => `race ${race}`))
  }
  for (const featId of prerequisites.feats ?? []) {
    if (!char.feats.includes(featId)) missing.push(`feat ${FEAT_BY_ID[featId]?.name ?? featId}`)
  }
  for (const [ability, minimum] of Object.entries(prerequisites.abilities ?? {}) as [keyof AbilityScores, number][]) {
    if (char.abilityScores[ability] < minimum) missing.push(`${ABILITY_LABELS[ability]} ${minimum}`)
  }

  return { met: missing.length === 0, missing }
}

export function featChoiceCount(feats: string[], kind: 'fighting-style' | 'maneuvers' | 'metamagic'): number {
  return feats.reduce((sum, featId) => {
    const choices = FEAT_BY_ID[featId]?.grantsChoices ?? []
    return sum + choices
      .filter(choice => choice.kind === kind)
      .reduce((inner, choice) => inner + choice.count, 0)
  }, 0)
}

export function setFeatsData(items: FeatDef[]): void {
  FEATS = items
  FEAT_BY_ID = Object.fromEntries(items.map(f => [f.id, f])) as Record<string, FeatDef>
}
