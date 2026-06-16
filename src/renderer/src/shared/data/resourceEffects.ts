export interface ResourceEffect {
  resourceKey: string
  setsFlag?: 'isRaging' | 'isBladesinging'
  grantsAdv?: 'martial' | 'spell' | 'both'
  economy?: 'action' | 'bonus' | 'reaction'
  note: string
}

export const RESOURCE_EFFECTS: ResourceEffect[] = [
  {
    resourceKey: 'Rage',
    setsFlag: 'isRaging',
    grantsAdv: 'martial',
    economy: 'bonus',
    note: 'Entering Rage: advantage on STR checks/saves; while you also use Reckless Attack, advantage on melee STR attacks.',
  },
  {
    resourceKey: 'Action Surge',
    economy: 'action',
    note: 'Grants one extra action this turn (already handled by grantEconomy).',
  },
  {
    resourceKey: 'Channel Divinity',
    economy: 'action',
    note: 'Spends an action; specific effect chosen in the feature detail.',
  },
  {
    resourceKey: 'Bardic Inspiration',
    economy: 'bonus',
    note: 'Targets an ally - buff-on-other is DEFERRED (no party model). Decrement + spend bonus action only.',
  },
]
