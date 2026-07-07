# scripts/ — build, dev, and asset generation

Node and Python tooling that runs outside the app. Nothing here ships in the bundle.

| File | Role |
|------|------|
| `dev.mjs` | Dev launcher (`npm run dev`). Strips `ELECTRON_RUN_AS_NODE` and starts electron-vite so the window opens correctly. |
| `download-equipment-sprites.mjs` | Fetches source equipment sprites. |
| `gen-items-metadata.mjs` | Generates item metadata from source data. |
| `gen-gear-sprites.py`, `gen-weapon-sprites.py`, `gen-summon-sprites.py` | Render sprite sheets for gear, weapons, and summons. |
| `gen-damage-vfx.py`, `gen-spell-gifs.py` | Render damage-type VFX and spell animation GIFs. |
| `spritelib.py` | Shared Python helpers for the sprite/VFX generators. |
| `__pycache__/` | Python bytecode cache (ignored). |

**Note:** the committed CSVs under `src/renderer/public/equipment_data/` are the authoritative
equipment catalog. The generators produce *art*, not catalog data — regenerate sprites on demand,
edit items through the in-app item editor (which writes user CSVs).
