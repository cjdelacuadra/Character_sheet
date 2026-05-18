# Character Sheet — TODO

## Goals
- Let players manage a full D&D 5e character sheet (equipment, actions, spells, resources)
- Drag-and-drop inventory and equipment management
- Combat actions derived from equipped weapons and class features
- Shop for buying/selling items with gold economy

## Minimum Application
- Character creation with class, race, level, ability scores
- Equipment slots (armor, weapons, accessories) with equip/unequip
- Persistent inventory (items remain when unequipped)
- Shop to buy/sell items
- Action list showing available actions (Action / Bonus Action / Reaction) based on class + weapons

## Success Conditions

Tests live in `src/renderer/src/__tests__/equipment.test.ts`

### SC1 — Item Persistence on Unequip
Items that were given to the character at creation (not bought) must not disappear when unequipped.
- Unequipping an item not in `ownedItemIds` adds it there
- Unequipping starting armor leaves it visible in the armoury
- Re-equipping after unequip works correctly
- Unequipping a weapon keeps its id in `ownedItemIds`

### SC2 — Weapon Equip from "All Items" view
Weapons must be equippable when clicking "Equip" without a slot filter active.
- `equipWeaponFromId` slots a weapon into index 0
- Equipping via handleEquipAll with a weapon works (no silent no-op)
- Two-handed weapon in slot 0 removes any off-hand weapon
- Equipping a second light weapon fills slot 1

### SC3 — Shop Transactions
Gold and owned items must update correctly on buy/sell.
- `buyItem` deducts gold and adds item to `ownedItemIds`
- Cannot buy when gold is insufficient (state unchanged)
- `sellItem` adds gold and removes from `ownedItemIds`
- `sellItem` also unequips the item from its equipment slot

### SC4 — Unequip via Drag (to armoury or inventory)
Dragging an equipped item to the armoury grid or inventory grid must unequip it and keep it accessible.
- `unequipSlot` sets the equipment slot to null
- `unequipSlot` adds the item to `ownedItemIds` when missing
- `unequipWeapon` removes weapon from the weapons array
- `unequipWeapon` adds weapon id to `ownedItemIds` when missing

### SC5 — Weapon-Derived Action List
The action list must reflect what weapons are equipped.
- No weapons equipped → "Unarmed Strike" appears as an Action
- One melee weapon → weapon name appears as an Action
- Two light weapons → off-hand weapon appears as a Bonus Action
- Removing weapons → off-hand Bonus Action disappears
