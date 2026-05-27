# Assets needed: effects/heal/

Sprites for HP restoration, condition cleanse, and resurrection spells.
All files share a unified green/gold palette.

## Files

| Filename | Format | Frames | Style notes |
|---|---|---|---|
| `heal_pulse.gif` | gif | 6 one-shot, ~500ms | Green/gold sparkle blooming on a single tile; gentle upward particles. |
| `heal_wave.gif` | gif | 8 looped | Green/gold wave radiating outward; same palette as pulse. Per-tile loop for AOE heal. |
| `restoration_cleanse.gif` | gif | 6 one-shot | White/gold flash with falling condition icons (suggesting "afflictions removed"). |
| `revive_beam.gif` | gif | 8 one-shot, ~700ms | Vertical golden beam coming down from off-grid, lifting silhouette. |

All files target **22×22 px** (revive_beam may be **22×44 px tall** to read as a vertical beam), image-rendering: pixelated.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| cure-wounds | heal_pulse.gif | `vizCategory: 'heal-single'` (needs ally-tile) |
| healing-word | heal_pulse.gif | `vizCategory: 'heal-single'` (needs ally-tile) |
| spare-the-dying | heal_pulse.gif (on downed-ally tile) | `vizCategory: 'heal-single'` |
| prayer-of-healing | heal_wave.gif | `vizCategory: 'heal-aoe'` (needs ally-tile) |
| mass-healing-word | heal_wave.gif | `vizCategory: 'heal-aoe'` (needs ally-tile) |
| mass-cure-wounds | heal_wave.gif | `vizCategory: 'heal-aoe'` (needs ally-tile) |
| lesser-restoration | restoration_cleanse.gif | `vizCategory: 'heal-single'` |
| revivify | revive_beam.gif | `vizCategory: 'resurrect'` |
| raise-dead | revive_beam.gif | `vizCategory: 'resurrect'` |

## Reuse rules

- **Single-target heals** use `heal_pulse`. **Multi-target / AOE heals** use `heal_wave`. Don't add per-spell heal variants.
- The resurrection beam (`revive_beam`) covers both Revivify and Raise Dead — the only difference is the cast-time context, not the visual.
- `restoration_cleanse` is conceptually a heal but communicates "condition removed" specifically — kept separate so it doesn't get conflated with HP-restore visuals.
- Heal effects assume an **ally-tile concept** in the grid that doesn't exist yet; add `allyPositions` to `SpellGridLayout` when implementing.
