// Generates equipment_data/*.csv from the TypeScript source arrays.
// Run: npx tsx scripts/gen-equipment-csv.mts

import { writeFileSync } from 'fs'
import { join } from 'path'

// Direct file imports — path aliases are type-only so tsx resolves fine
import { WEAPONS }             from '../src/renderer/src/shared/data/equipment/weapons.ts'
import { ARMOR_LIST, ACCESSORIES } from '../src/renderer/src/shared/data/equipment/accessories.ts'
import { weaponsToCsv, armorToCsv, accessoriesToCsv } from '../src/renderer/src/shared/data/equipment/csvCodec.ts'

const OUT = join(import.meta.dirname, '../src/renderer/public/equipment_data')

writeFileSync(join(OUT, 'weapons.csv'),     weaponsToCsv(WEAPONS),          'utf-8')
writeFileSync(join(OUT, 'armor.csv'),       armorToCsv(ARMOR_LIST),         'utf-8')
writeFileSync(join(OUT, 'accessories.csv'), accessoriesToCsv(ACCESSORIES),  'utf-8')

console.log(`Written to ${OUT}`)
console.log(`  weapons.csv     — ${WEAPONS.length} rows`)
console.log(`  armor.csv       — ${ARMOR_LIST.length} rows`)
console.log(`  accessories.csv — ${ACCESSORIES.length} rows`)
