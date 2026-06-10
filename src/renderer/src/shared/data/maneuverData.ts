export interface Maneuver {
  id: string
  name: string
  superiorityDieFormula: string
  effect: string
}

export const maneuvers: Maneuver[] = [
  { id: 'precision-attack', name: 'Precision Attack', superiorityDieFormula: '+1dX to attack roll', effect: 'Add Superiority Die to one attack roll you make' },
  { id: 'disarming-strike', name: 'Disarming Strike', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; target drops one item it holds (Str or Dex save DC = your maneuver save DC)' },
  { id: 'distracting-strike', name: 'Distracting Strike', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; next attack roll against target before start of your next turn has advantage' },
  { id: 'evasive-footwork', name: 'Evasive Footwork', superiorityDieFormula: '+1dX to AC', effect: 'Add die to your AC until end of your move' },
  { id: 'feinting-attack', name: 'Feinting Attack', superiorityDieFormula: '+1dX to damage', effect: 'Bonus action to feint; advantage on next attack roll against chosen creature this turn; add die to damage' },
  { id: 'goading-attack', name: 'Goading Attack', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; target has disadvantage on attack rolls vs creatures other than you until end of your next turn (Wis save)' },
  { id: 'lunging-attack', name: 'Lunging Attack', superiorityDieFormula: '+1dX to damage', effect: 'Add 5ft to reach; add die to damage' },
  { id: 'maneuvering-attack', name: 'Maneuvering Attack', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; one friendly creature can use reaction to move half speed without provoking opportunity attacks' },
  { id: 'menacing-attack', name: 'Menacing Attack', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; target is frightened of you until end of your next turn (Wis save)' },
  { id: 'parry', name: 'Parry', superiorityDieFormula: 'reduce damage by 1dX + Dex mod', effect: 'Reaction when you take damage from a creature; reduce that damage by die result + Dex modifier' },
  { id: 'pushing-attack', name: 'Pushing Attack', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; push target up to 15ft away (Str save)' },
  { id: 'rally', name: 'Rally', superiorityDieFormula: 'temp HP = 1dX + Cha mod', effect: 'Bonus action; choose one friendly creature within 60ft; grants temp HP equal to die + Cha modifier' },
  { id: 'riposte', name: 'Riposte', superiorityDieFormula: '+1dX to damage', effect: 'Reaction when creature misses you; make one melee attack; add die to damage' },
  { id: 'sweeping-attack', name: 'Sweeping Attack', superiorityDieFormula: '1dX to second creature', effect: 'Damage one creature; if another creature is within 5ft and within reach, deal die result of same damage type to it (no attack roll)' },
  { id: 'trip-attack', name: 'Trip Attack', superiorityDieFormula: '+1dX to damage', effect: 'Add die to damage; knock target prone if Large or smaller (Str save)' },
]
