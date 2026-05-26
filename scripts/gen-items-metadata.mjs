#!/usr/bin/env node
/**
 * Copies items from sprites/origin/items/{id}/ into the organised
 * sprites/items/{category}/{subfolder}/{id}/ structure and writes items-metadata.json.
 *
 * Source  (read-only, never modified): sprites/origin/items/
 * Dest    (organised copy):            sprites/items/
 *
 * Data sources for classification (in priority order):
 *   1. osrsbox-db items-complete.json  — all items by ID, slot + weapon_type
 *   2. OSRS prices API                 — tradeable items, name + examine
 *   3. Name-based heuristics           — last resort
 *
 * Run: node scripts/gen-items-metadata.mjs
 */

import { readdir, mkdir, cp, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname  = dirname(fileURLToPath(import.meta.url))
const ROOT       = join(__dirname, '..')
const SPRITES    = join(ROOT, 'src/renderer/public/assets/equipment/sprites')
const ORIGIN_DIR = join(SPRITES, 'origin', 'items')   // flat source — never touched
const ITEMS_DIR  = join(SPRITES, 'items')              // organised destination
const OUT_FILE   = join(ITEMS_DIR, 'items-metadata.json')
const UA         = { 'User-Agent': 'CharacterSheetApp/1.0 (item metadata generator)' }

// ── Classification tables ─────────────────────────────────────────────────────

const OSRS_WEAPON_TYPE = {
  slash_sword:   'swords',
  '2h_sword':    'swords',
  stab_sword:    'daggers',
  claw:          'daggers',
  axe:           'axes',
  blunt:         'maces',
  pickaxe:       'maces',
  spear:         'spears',
  partisan:      'spears',
  halberd:       'halberds',
  scythe:        'halberds',
  polearm:       'halberds',
  polestaff:     'halberds',
  banner:        'halberds',
  staff:         'staves',
  powered_staff: 'staves',
  trident:       'staves',
  wand:          'wands',
  bow:           'bows',
  crossbow:      'crossbows',
  thrown:        'thrown',
  chinchompa:    'thrown',
  sling:         'thrown',
  gun:           'thrown',
  whip:          'whips',
  salamander:    'whips',
  unarmed:       'other',
}

const OSRS_SLOT = {
  head:   ['armor',       'head'],
  body:   ['armor',       'body'],
  legs:   ['armor',       'legs'],
  shield: ['armor',       'shields'],
  neck:   ['armor',       'amulets'],
  cape:   ['accessories', 'capes'],
  feet:   ['accessories', 'boots'],
  hands:  ['accessories', 'gloves'],
  ring:   ['accessories', 'rings'],
  ammo:   ['accessories', 'ammo'],
}

// Name-based rules — checked in order, first match wins
const NAME_RULES = [
  { cat: 'weapons', sub: 'crossbows', rx: /crossbow/i },
  { cat: 'weapons', sub: 'bows',      rx: /\bbows?\b/i,                       not: /crossbow|elbow|rainbow/i },
  { cat: 'weapons', sub: 'wands',     rx: /\bwand\b/i },
  { cat: 'weapons', sub: 'staves',    rx: /\b(staff|stave|trident|sceptre)\b/i },
  { cat: 'weapons', sub: 'swords',    rx: /\b(sword|sabre|scimitar|rapier|longsword|shortsword|blade|claymore|2h)\b/i },
  { cat: 'weapons', sub: 'daggers',   rx: /\b(dagger|knife|stiletto)\b/i },
  { cat: 'weapons', sub: 'axes',      rx: /\b(battleaxe|war axe|hatchet|axe)\b/i, not: /pickaxe/i },
  { cat: 'weapons', sub: 'maces',     rx: /\b(mace|flail|maul|morningstar|warhammer)\b/i },
  { cat: 'weapons', sub: 'spears',    rx: /\b(spear|javelin|lance|hasta|partisan)\b/i },
  { cat: 'weapons', sub: 'halberds',  rx: /\b(halberd|glaive|scythe|pike|polearm)\b/i },
  { cat: 'weapons', sub: 'thrown',    rx: /\b(chinchompa|ballista|blowpipe)\b/i },
  { cat: 'weapons', sub: 'whips',     rx: /\bwhip\b/i },
  { cat: 'armor', sub: 'shields',  rx: /\b(shield|kiteshield|sq shield|defender|ward|buckler|bulwark)\b/i },
  { cat: 'armor', sub: 'head',     rx: /\b(helm|helmet|hat|hood|coif|mask|tiara|mitre|cap|crown|headdress|beret)\b/i },
  { cat: 'armor', sub: 'body',     rx: /\b(platebody|chainbody|hauberk|chestplate|torso|brassard|cuirass)\b/i },
  { cat: 'armor', sub: 'legs',     rx: /\b(platelegs|plateskirt|legguards|chaps|skirt|kilt|breeches|tassets|greaves)\b/i },
  { cat: 'armor', sub: 'amulets',  rx: /\b(amulet|necklace|pendant|torque)\b/i },
  { cat: 'accessories', sub: 'capes',  rx: /\b(cape|cloak|wings|mantle)\b/i },
  { cat: 'accessories', sub: 'boots',  rx: /\b(boots?|shoes?|sandals?|treads|sabatons)\b/i },
  { cat: 'accessories', sub: 'gloves', rx: /\b(gloves?|gauntlets?|vambraces?|bracers?|handwraps?)\b/i },
  { cat: 'accessories', sub: 'rings',  rx: /\b(ring|band)\b/i },
  { cat: 'accessories', sub: 'ammo',   rx: /\b(arrows?|bolts?|darts?|cannonball)\b/i },
  { cat: 'others', sub: 'runes',       rx: / runes?$/i },
  { cat: 'others', sub: 'consumables', rx: /\b(potion|brew|mix|\(\d[\d/]*\)|antipoison|antidote|antifire|restore)\b/i },
  { cat: 'others', sub: 'tools',       rx: /\b(pickaxe|chisel|saw|needle|tinderbox|bucket|harpoon|rake|spade|shears|pestle|mortar)\b/i },
]

// Only used for items completely absent from osrsbox (new/unknown items).
// Items osrsbox knows about but marks non-equippable go straight to others/
// via resolveDestination — name heuristics are NOT applied to them.
function classifyByName(name) {
  for (const r of NAME_RULES) {
    if (!r.rx.test(name))          continue
    if (r.not && r.not.test(name)) continue
    return [r.cat, r.sub]
  }
  return ['others', 'misc']
}

// Classify by examine text for non-equippable items (runes, consumables, tools).
// Falls back to misc for everything else (structures, bodies, scenery, etc.)
function classifyNonEquip(name, examine) {
  const text = `${name} ${examine}`
  if (/ runes?$/i.test(name))                                                      return ['others', 'runes']
  if (/\b(potion|brew|mix|\(\d[\d/]*\)|antipoison|antidote|antifire|restore)\b/i.test(name)) return ['others', 'consumables']
  if (/restores? \d+|eat to|can be eaten/i.test(examine))                          return ['others', 'consumables']
  if (/\b(pickaxe|chisel|saw|needle|tinderbox|bucket|harpoon|rake|spade|shears|pestle|mortar)\b/i.test(name)) return ['others', 'tools']
  return ['others', 'misc']
}

function resolveDestination(rec, name, examine) {
  if (rec) {
    // osrsbox knows this item — trust its equipable flag completely.
    // Non-equippable items (fish, planks, bodies, scenery…) never touch name heuristics.
    if (rec.equipable_by_player && rec.equipment) {
      const slot = rec.equipment.slot?.toLowerCase()
      if ((slot === 'weapon' || slot === '2h') && rec.weapon?.weapon_type) {
        return ['weapons', OSRS_WEAPON_TYPE[rec.weapon.weapon_type] ?? 'other']
      }
      if (slot && OSRS_SLOT[slot]) return OSRS_SLOT[slot]
    }
    return classifyNonEquip(name, examine)
  }

  // Item not in osrsbox at all (added after 2022) — use name heuristics as last resort.
  return classifyByName(name)
}

// ── API fetches ───────────────────────────────────────────────────────────────

async function fetchOsrsbox() {
  process.stdout.write('Fetching osrsbox items-complete.json (~30 MB)… ')
  const res = await fetch(
    'https://raw.githubusercontent.com/osrsbox/osrsbox-db/master/docs/items-complete.json',
    { headers: UA },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  console.log(`${Object.keys(data).length} entries`)
  return data
}

async function fetchPrices() {
  process.stdout.write('Fetching prices API (name/examine fallback)… ')
  const res = await fetch('https://prices.runescape.wiki/api/v1/osrs/mapping', { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const items = await res.json()
  const map   = new Map()
  for (const it of items) map.set(it.id, { name: it.name, examine: it.examine ?? '' })
  console.log(`${map.size} items`)
  return map
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Collect source item IDs (top-level numeric folders in origin/items/)
  const entries = await readdir(ORIGIN_DIR, { withFileTypes: true })
  const itemIds = entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .map(e => Number(e.name))
    .sort((a, b) => a - b)

  console.log(`Found ${itemIds.length} items in origin/items/\n`)

  // Fetch classification data
  let osrsbox = null
  let prices  = new Map()
  const [r0, r1] = await Promise.allSettled([fetchOsrsbox(), fetchPrices()])
  if (r0.status === 'fulfilled') osrsbox = r0.value
  else console.warn('osrsbox unavailable:', r0.reason?.message)
  if (r1.status === 'fulfilled') prices  = r1.value
  else console.warn('prices API unavailable:', r1.reason?.message)

  // Pre-create all target directories
  await Promise.all([
    ...['body','head','legs','shields','amulets'].map(s =>
      mkdir(join(ITEMS_DIR, 'armor',       s), { recursive: true })),
    ...['swords','daggers','maces','axes','spears','halberds',
        'staves','wands','bows','crossbows','thrown','whips','other'].map(s =>
      mkdir(join(ITEMS_DIR, 'weapons',     s), { recursive: true })),
    ...['capes','boots','gloves','rings','ammo'].map(s =>
      mkdir(join(ITEMS_DIR, 'accessories', s), { recursive: true })),
    ...['consumables','runes','tools','misc'].map(s =>
      mkdir(join(ITEMS_DIR, 'others',      s), { recursive: true })),
  ])

  const metadata = {}
  const stats    = {}
  let copied = 0, skipped = 0

  for (const id of itemIds) {
    const rec     = osrsbox?.[String(id)]
    const price   = prices.get(id)
    const name    = rec?.name    ?? price?.name    ?? `item_${id}`
    const examine = rec?.examine ?? price?.examine ?? ''

    const [cat, sub] = resolveDestination(rec, name, examine)
    const src        = join(ORIGIN_DIR, String(id))
    const dest       = join(ITEMS_DIR, cat, sub, String(id))
    const pathKey    = `${cat}/${sub}`
    stats[pathKey]   = (stats[pathKey] ?? 0) + 1

    // Skip if already copied
    try {
      await access(dest)
      skipped++
    } catch {
      try {
        await cp(src, dest, { recursive: true })
        copied++
      } catch (err) {
        console.warn(`Skipping ${id}: ${err.message}`)
        continue
      }
    }

    if (name !== `item_${id}`) {
      metadata[id] = {
        id,
        name,
        category:  cat,
        subfolder: sub,
        ...(rec?.equipment?.slot     && { slot: rec.equipment.slot }),
        ...(rec?.weapon?.weapon_type && { weaponType: rec.weapon.weapon_type }),
        sprite: `items/${cat}/${sub}/${id}/0.gif`,
      }
    }
  }

  console.log(`\nCopied ${copied}, already exists ${skipped}`)
  console.log('\nDistribution:')
  for (const [path, count] of Object.entries(stats).sort()) {
    console.log(`  ${path.padEnd(30)} ${count}`)
  }

  await writeFile(OUT_FILE, JSON.stringify(metadata, null, 2) + '\n')
  console.log(`\nWritten → ${OUT_FILE}`)
}

main().catch(err => { console.error(err); process.exit(1) })
