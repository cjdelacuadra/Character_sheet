#!/usr/bin/env node
/**
 * Downloads OSRS wiki sprites for all accessories and slot placeholders.
 * Output: src/renderer/public/assets/equipment/sprites/
 *         src/renderer/public/assets/equipment/placeholders/
 *
 * Run: node scripts/download-equipment-sprites.mjs
 */

import { mkdir, writeFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const SPRITES_DIR      = join(ROOT, 'src/renderer/public/assets/equipment/sprites')
const PLACEHOLDERS_DIR = join(ROOT, 'src/renderer/public/assets/equipment/placeholders')

const W = 'https://oldschool.runescape.wiki/images/'

const SPRITE_URLS = [
  // Helmets
  `${W}Iron_med_helm.png`,
  `${W}Steel_med_helm.png`,
  `${W}Mithril_full_helm.png`,
  `${W}Rune_full_helm.png`,
  `${W}Bandos_helmet.png`,
  // Capes
  `${W}Obsidian_cape.png`,
  `${W}Fire_cape.png`,
  `${W}Infernal_cape.png`,
  // Amulets
  `${W}Amulet_of_power.png`,
  `${W}Amulet_of_strength.png`,
  `${W}Amulet_of_glory.png`,
  `${W}Amulet_of_torture.png`,
  `${W}Necklace_of_anguish.png`,
  // Gloves
  `${W}Leather_gloves.png`,
  `${W}Rune_gloves.png`,
  `${W}Barrows_gloves.png`,
  `${W}Void_mage_gloves.png`,
  `${W}Void_ranger_gloves.png`,
  // Boots
  `${W}Leather_boots.png`,
  `${W}Snakeskin_boots.png`,
  `${W}Dragon_boots.png`,
  `${W}Primordial_boots.png`,
  // Legs
  `${W}Leather_chaps.png`,
  `${W}Black_d%27hide_chaps.png`,
  `${W}Bandos_tassets.png`,
  `${W}Justiciar_legguards.png`,
  // Rings
  `${W}Ring_of_recoil.png`,
  `${W}Ring_of_life.png`,
  `${W}Berserker_ring.png`,
  `${W}Archers_ring.png`,
  `${W}Seers_ring.png`,
  `${W}Berserker_ring_(i).png`,
  // Quiver
  `${W}Ava%27s_accumulator.png`,
  `${W}Ava%27s_assembler.png`,
]

const PLACEHOLDER_URLS = [
  `${W}Empty_helm_slot.png`,
  `${W}Empty_amulet_slot.png`,
  `${W}Empty_cape_slot.png`,
  `${W}Empty_weapon_slot.png`,
  `${W}Empty_torso_slot.png`,
  `${W}Empty_shield_slot.png`,
  `${W}Empty_legs_slot.png`,
  `${W}Empty_gloves_slot.png`,
  `${W}Empty_boots_slot.png`,
  `${W}Empty_ammo_slot.png`,
  `${W}Empty_ring_slot.png`,
]

async function fileExists(path) {
  try { await access(path); return true }
  catch { return false }
}

async function download(url, destDir) {
  const filename = decodeURIComponent(url.split('/').pop())
  const dest = join(destDir, filename)
  if (await fileExists(dest)) {
    return { status: 'skipped', filename }
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CharacterSheetApp/1.0 (sprite downloader)' }
    })
    if (!res.ok) return { status: 'failed', filename, reason: `HTTP ${res.status}` }
    const buf = await res.arrayBuffer()
    await writeFile(dest, Buffer.from(buf))
    return { status: 'downloaded', filename }
  } catch (err) {
    return { status: 'failed', filename, reason: err.message }
  }
}

async function main() {
  await mkdir(SPRITES_DIR,      { recursive: true })
  await mkdir(PLACEHOLDERS_DIR, { recursive: true })

  let downloaded = 0, skipped = 0, failed = 0

  console.log('Downloading sprites…')
  for (const url of SPRITE_URLS) {
    const r = await download(url, SPRITES_DIR)
    if (r.status === 'downloaded') { downloaded++; console.log(`  ✓ ${r.filename}`) }
    else if (r.status === 'skipped') { skipped++; console.log(`  - ${r.filename} (exists)`) }
    else { failed++; console.error(`  ✗ ${r.filename}: ${r.reason}`) }
  }

  console.log('\nDownloading placeholders…')
  for (const url of PLACEHOLDER_URLS) {
    const r = await download(url, PLACEHOLDERS_DIR)
    if (r.status === 'downloaded') { downloaded++; console.log(`  ✓ ${r.filename}`) }
    else if (r.status === 'skipped') { skipped++; console.log(`  - ${r.filename} (exists)`) }
    else { failed++; console.error(`  ✗ ${r.filename}: ${r.reason}`) }
  }

  console.log(`\nDone — ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main()
