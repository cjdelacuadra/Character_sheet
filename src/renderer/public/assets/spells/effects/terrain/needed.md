# Assets needed: effects/terrain/

8-frame looped sprites for persistent ground-affecting zones whose visual doesn't map to a damage type.
The renderer treats this folder the same as `/animation/[damage_type]/` (per-tile looped frames) but routes via `vizCategory: 'terrain'` + a `vizDamageType` key matching the filename stem.

## Spell coverage

| Spell | File used | Render template |
|---|---|---|
| entangle | vines_grasping.gif | `vizCategory: 'terrain'`, `vizDamageType: 'vines_grasping'` |
| spike-growth | spikes_thorns.gif | `vizCategory: 'terrain'`, `vizDamageType: 'spikes_thorns'` |
| fog-cloud | fog_cloud.gif | `vizCategory: 'terrain'`, `vizDamageType: 'fog_cloud'` |
| darkness | darkness_sphere.gif | `vizCategory: 'terrain'`, `vizDamageType: 'darkness_sphere'` |
| silence | silence_dome.gif | `vizCategory: 'terrain'`, `vizDamageType: 'silence_dome'` |
| hypnotic-pattern | hypnotic_swirl.gif | `vizCategory: 'terrain'`, `vizDamageType: 'hypnotic_swirl'` |
| minor-illusion | illusion_shimmer.gif | `vizCategory: 'terrain'`, `vizDamageType: 'illusion_shimmer'` |

## Reuse rules

- Any **new zone-of-effect spell that doesn't fit a damage type** (cold, fire, lightning, etc.) drops in here.
- The 8-frame loop convention matches the existing `/animation/[damage_type]/` folder so the same render code can read both — only the lookup path differs.
- Prefer **single files** (one GIF) over per-frame PNG sequences here to keep the folder small. Use PNG sequences only if the renderer needs frame-level control.
- If a new spell needs a sprite that's visually close to an existing one, **reuse it** rather than adding a new file (e.g., a "stinking cloud" spell uses `fog_cloud.gif` with a green tint applied via CSS filter).
