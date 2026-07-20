/**
 * Wild Shape beast forms (MM stat blocks, abbreviated). Attacks are
 * structured so the Attack panel can render them like the weapon table;
 * `multiattack` notes how they combine per Attack action. Coverage spans
 * CR 1/4 through CR 6 so standard (CR 1/4→1) and Moon druids
 * (CR 1 at 2, floor(level/3) from 6) both keep gaining forms.
 */
export interface BeastAttack {
  name: string
  toHit: number
  dmg: string
  dmgType: string
  note?: string
}

export interface WildShapeBeast {
  id: string
  name: string
  cr: number
  hp: number
  ac: number
  speed: string
  attacks: BeastAttack[]
  multiattack?: string
  /** Rulebook this form comes from (PHB, TCoE, ...). Unset = PHB. */
  source?: string
}

export let WILD_SHAPE_BEASTS: WildShapeBeast[] = [
  // ── CR 1/4 ──────────────────────────────────────────────────────────────
  { id: 'wolf', name: 'Wolf', cr: 0.25, hp: 11, ac: 13, speed: '40 ft',
    attacks: [{ name: 'Bite', toHit: 4, dmg: '2d4+2', dmgType: 'piercing', note: 'DC 11 STR save or prone' }] },
  { id: 'panther', name: 'Panther', cr: 0.25, hp: 13, ac: 12, speed: '50 ft, climb 40',
    attacks: [
      { name: 'Bite', toHit: 4, dmg: '1d6+2', dmgType: 'piercing' },
      { name: 'Claw', toHit: 4, dmg: '1d4+2', dmgType: 'slashing', note: 'Pounce: 20 ft charge → DC 12 STR or prone + free bite' },
    ] },
  { id: 'giant-frog', name: 'Giant Frog', cr: 0.25, hp: 18, ac: 11, speed: '30 ft, swim 30',
    attacks: [{ name: 'Bite', toHit: 3, dmg: '1d6+1', dmgType: 'piercing', note: 'grapple DC 11' }] },
  // ── CR 1/2 ──────────────────────────────────────────────────────────────
  { id: 'black-bear', name: 'Black Bear', cr: 0.5, hp: 19, ac: 11, speed: '40 ft, climb 30',
    multiattack: 'Bite + Claws',
    attacks: [
      { name: 'Bite', toHit: 3, dmg: '1d6+2', dmgType: 'piercing' },
      { name: 'Claws', toHit: 3, dmg: '2d4+2', dmgType: 'slashing' },
    ] },
  { id: 'crocodile', name: 'Crocodile', cr: 0.5, hp: 19, ac: 12, speed: '20 ft, swim 30',
    attacks: [{ name: 'Bite', toHit: 4, dmg: '1d10+2', dmgType: 'piercing', note: 'grapple DC 12' }] },
  { id: 'warhorse', name: 'Warhorse', cr: 0.5, hp: 19, ac: 11, speed: '60 ft',
    attacks: [{ name: 'Hooves', toHit: 6, dmg: '2d6+4', dmgType: 'bludgeoning' }] },
  // ── CR 1 ────────────────────────────────────────────────────────────────
  { id: 'brown-bear', name: 'Brown Bear', cr: 1, hp: 34, ac: 11, speed: '40 ft, climb 30',
    multiattack: 'Bite + Claws',
    attacks: [
      { name: 'Bite', toHit: 5, dmg: '1d8+4', dmgType: 'piercing' },
      { name: 'Claws', toHit: 5, dmg: '2d6+4', dmgType: 'slashing' },
    ] },
  { id: 'dire-wolf', name: 'Dire Wolf', cr: 1, hp: 37, ac: 14, speed: '50 ft',
    attacks: [{ name: 'Bite', toHit: 5, dmg: '2d6+3', dmgType: 'piercing', note: 'DC 13 STR save or prone' }] },
  { id: 'giant-eagle', name: 'Giant Eagle', cr: 1, hp: 26, ac: 13, speed: '10 ft, fly 80',
    multiattack: 'Beak + Talons',
    attacks: [
      { name: 'Beak', toHit: 5, dmg: '1d6+3', dmgType: 'piercing' },
      { name: 'Talons', toHit: 5, dmg: '2d6+3', dmgType: 'slashing' },
    ] },
  { id: 'giant-octopus', name: 'Giant Octopus', cr: 1, hp: 52, ac: 11, speed: '10 ft, swim 60',
    attacks: [{ name: 'Tentacles', toHit: 5, dmg: '2d6+3', dmgType: 'bludgeoning', note: 'grapple DC 16, restrained' }] },
  { id: 'tiger', name: 'Tiger', cr: 1, hp: 37, ac: 12, speed: '40 ft',
    attacks: [
      { name: 'Bite', toHit: 5, dmg: '1d10+3', dmgType: 'piercing' },
      { name: 'Claw', toHit: 5, dmg: '1d8+3', dmgType: 'slashing', note: 'Pounce: 20 ft charge → DC 13 STR or prone + free bite' },
    ] },
  // ── CR 2 ────────────────────────────────────────────────────────────────
  { id: 'polar-bear', name: 'Polar Bear', cr: 2, hp: 42, ac: 12, speed: '40 ft, swim 30',
    multiattack: 'Bite + Claws',
    attacks: [
      { name: 'Bite', toHit: 7, dmg: '1d8+5', dmgType: 'piercing' },
      { name: 'Claws', toHit: 7, dmg: '2d6+5', dmgType: 'slashing' },
    ] },
  { id: 'giant-constrictor-snake', name: 'Giant Constrictor Snake', cr: 2, hp: 60, ac: 12, speed: '30 ft, swim 30',
    attacks: [
      { name: 'Bite', toHit: 6, dmg: '2d6+4', dmgType: 'piercing' },
      { name: 'Constrict', toHit: 6, dmg: '2d8+4', dmgType: 'bludgeoning', note: 'grapple DC 16, restrained' },
    ] },
  { id: 'saber-toothed-tiger', name: 'Saber-Toothed Tiger', cr: 2, hp: 52, ac: 12, speed: '40 ft',
    attacks: [
      { name: 'Bite', toHit: 6, dmg: '1d10+5', dmgType: 'piercing' },
      { name: 'Claw', toHit: 6, dmg: '2d6+5', dmgType: 'slashing', note: 'Pounce: 20 ft charge → DC 14 STR or prone + free bite' },
    ] },
  // ── CR 3 ────────────────────────────────────────────────────────────────
  { id: 'killer-whale', name: 'Killer Whale', cr: 3, hp: 90, ac: 12, speed: 'swim 60',
    attacks: [{ name: 'Bite', toHit: 6, dmg: '5d6+4', dmgType: 'piercing' }] },
  { id: 'giant-scorpion', name: 'Giant Scorpion', cr: 3, hp: 52, ac: 15, speed: '40 ft',
    multiattack: '2 Claws + Sting',
    attacks: [
      { name: 'Claw', toHit: 4, dmg: '1d8+2', dmgType: 'bludgeoning', note: 'grapple DC 12' },
      { name: 'Sting', toHit: 4, dmg: '1d10+2', dmgType: 'piercing', note: '+ DC 12 CON: 4d10 poison (half on save)' },
    ] },
  // ── CR 4-6 (high-level Moon) ────────────────────────────────────────────
  { id: 'elephant', name: 'Elephant', cr: 4, hp: 76, ac: 12, speed: '40 ft',
    attacks: [
      { name: 'Gore', toHit: 8, dmg: '3d8+6', dmgType: 'piercing', note: 'Trampling Charge: 20 ft → DC 12 STR or prone + free stomp' },
      { name: 'Stomp', toHit: 8, dmg: '3d10+6', dmgType: 'bludgeoning', note: 'prone targets only' },
    ] },
  { id: 'giant-crocodile', name: 'Giant Crocodile', cr: 5, hp: 85, ac: 14, speed: '30 ft, swim 50',
    multiattack: 'Bite + Tail',
    attacks: [
      { name: 'Bite', toHit: 8, dmg: '3d10+5', dmgType: 'piercing', note: 'grapple DC 16' },
      { name: 'Tail', toHit: 8, dmg: '2d8+5', dmgType: 'bludgeoning', note: 'DC 16 STR save or prone (targets not grappled)' },
    ] },
  { id: 'mammoth', name: 'Mammoth', cr: 6, hp: 126, ac: 13, speed: '40 ft',
    attacks: [
      { name: 'Gore', toHit: 10, dmg: '4d8+7', dmgType: 'piercing', note: 'Trampling Charge: 20 ft → DC 18 STR or prone + free stomp' },
      { name: 'Stomp', toHit: 10, dmg: '4d10+7', dmgType: 'bludgeoning', note: 'prone targets only' },
    ] },
]

export function setWildShapeBeastsData(items: WildShapeBeast[]): void {
  WILD_SHAPE_BEASTS = items
}
