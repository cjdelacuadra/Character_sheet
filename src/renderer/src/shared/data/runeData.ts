export interface Rune {
  id: string
  name: string
  passiveBonus: string
  activatedEffect: string
  activationType: string
  recharge: string
}

export const runes: Rune[] = [
  {
    id: 'cloud-rune',
    name: 'Cloud Rune',
    passiveBonus: 'Advantage on Sleight of Hand and Deception checks',
    activatedEffect: 'Redirect an attack that hits you or ally within 30ft to another creature within 30ft',
    activationType: 'reaction',
    recharge: '1/short rest',
  },
  {
    id: 'stone-rune',
    name: 'Stone Rune',
    passiveBonus: 'Advantage on Insight checks; darkvision 120ft',
    activatedEffect: 'Force creature within 30ft to make Wis save or be stunned until end of your next turn',
    activationType: 'reaction',
    recharge: '1/short rest',
  },
  {
    id: 'hill-rune',
    name: 'Hill Rune',
    passiveBonus: 'Advantage on saves vs being poisoned; resistance to poison damage',
    activatedEffect: 'Resistance to bludgeoning/piercing/slashing for 1 minute',
    activationType: 'bonus action',
    recharge: '1/short rest',
  },
  {
    id: 'fire-rune',
    name: 'Fire Rune',
    passiveBonus: "Proficiency with artisan's tools of your choice (x2)",
    activatedEffect: 'When you hit with attack, deal extra 2d6 fire damage and trap creature in flaming shackles',
    activationType: 'reaction',
    recharge: '1/short rest',
  },
  {
    id: 'frost-rune',
    name: 'Frost Rune',
    passiveBonus: '+2 bonus to Str and Con ability checks (not saves)',
    activatedEffect: "Grant yourself or one creature within 10ft the rune's +2 benefit for 10 minutes",
    activationType: 'bonus action',
    recharge: '1/short rest',
  },
  {
    id: 'storm-rune',
    name: 'Storm Rune',
    passiveBonus: "Advantage on Arcana checks; can't be surprised",
    activatedEffect: 'When you or another creature you can see within 60ft makes an attack roll/ability check/save, roll d6 and apply result as bonus or penalty',
    activationType: 'reaction',
    recharge: '1/short rest',
  },
]
