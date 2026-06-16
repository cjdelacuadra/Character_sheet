export interface WildShapeBeast {
  id: string
  name: string
  cr: number
  hp: number
  ac: number
  speed: string
  attack: string
}

export const WILD_SHAPE_BEASTS: WildShapeBeast[] = [
  { id: 'wolf', name: 'Wolf', cr: 0.25, hp: 11, ac: 13, speed: '40 ft', attack: 'Bite +4, 2d4+2 piercing (DC 11 STR or prone)' },
  { id: 'panther', name: 'Panther', cr: 0.25, hp: 13, ac: 12, speed: '50 ft, climb 40', attack: 'Claw +4, 1d4+2 slashing (Pounce)' },
  { id: 'giant-frog', name: 'Giant Frog', cr: 0.25, hp: 18, ac: 11, speed: '30 ft, swim 30', attack: 'Bite +3, 1d6+1 bludgeoning (grab)' },
  { id: 'black-bear', name: 'Black Bear', cr: 0.5, hp: 19, ac: 11, speed: '40 ft, climb 30', attack: 'Claws +3, 2d4+2 slashing' },
  { id: 'crocodile', name: 'Crocodile', cr: 0.5, hp: 19, ac: 12, speed: '20 ft, swim 30', attack: 'Bite +4, 1d10+2 piercing (grapple DC 12)' },
  { id: 'warhorse', name: 'Warhorse', cr: 0.5, hp: 19, ac: 11, speed: '60 ft', attack: 'Hooves +6, 2d6+4 bludgeoning' },
  { id: 'brown-bear', name: 'Brown Bear', cr: 1, hp: 34, ac: 11, speed: '40 ft, climb 30', attack: 'Claws +5, 2d6+4 slashing' },
  { id: 'dire-wolf', name: 'Dire Wolf', cr: 1, hp: 37, ac: 14, speed: '50 ft', attack: 'Bite +5, 2d6+3 piercing (DC 13 STR prone)' },
  { id: 'giant-eagle', name: 'Giant Eagle', cr: 1, hp: 26, ac: 13, speed: '10 ft, fly 80 ft', attack: 'Talons +5, 2d6+3 slashing' },
  { id: 'giant-octopus', name: 'Giant Octopus', cr: 1, hp: 52, ac: 11, speed: '10 ft, swim 60', attack: 'Tentacles +5, 2d6+3 (grapple DC 16)' },
]
