export interface PsiWarriorAbility {
  id: string
  name: string
  diceCost: number
  unlockLevel: number
  description: string
}

export const psiWarriorAbilities: PsiWarriorAbility[] = [
  {
    id: 'psionic-strike',
    name: 'Psionic Strike',
    diceCost: 1,
    unlockLevel: 3,
    description: 'Once per turn, after hitting with a weapon attack, expend one Psionic Energy die to add extra force damage equal to the die roll + INT mod',
  },
  {
    id: 'protective-field',
    name: 'Protective Field',
    diceCost: 1,
    unlockLevel: 3,
    description: 'Reaction; when you or another creature you can see within 30ft takes damage, expend one die; reduce damage by the die roll + INT mod',
  },
  {
    id: 'telekinetic-movement',
    name: 'Telekinetic Movement',
    diceCost: 1,
    unlockLevel: 3,
    description: 'Move one Large or smaller creature or object within 30ft by 30ft; if creature, it must succeed on a Str save or be moved',
  },
  {
    id: 'telekinetic-adept-shove',
    name: 'Telekinetic Adept Shove',
    diceCost: 1,
    unlockLevel: 7,
    description: 'As bonus action, try to shove one creature within 30ft; Str save or pushed 10ft and knocked prone',
  },
  {
    id: 'telekinetic-adept-move',
    name: 'Telekinetic Adept Move',
    diceCost: 1,
    unlockLevel: 7,
    description: 'As bonus action, move up to 30ft; expend one die; add die roll to your movement',
  },
  {
    id: 'guarded-mind',
    name: 'Guarded Mind',
    diceCost: 0,
    unlockLevel: 10,
    description: 'Passive; resistance to psychic damage; immunity to frightened condition while you have Psionic Energy dice remaining',
  },
]
