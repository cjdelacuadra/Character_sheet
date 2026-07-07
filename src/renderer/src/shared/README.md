# shared/ — data, helpers, and small components

Cross-cutting building blocks used across features and the domain.

| Folder | Role |
|--------|------|
| `data/` | Static SRD catalogs (classes, races, spells, feats, subclass features, martial catalogs), the equipment catalog + CSV codecs, and `charCalculations.ts` (the older calculation path). → [data/README.md](data/README.md) |
| `lib/` | Framework-agnostic utilities — dice expressions, logging. → [lib/README.md](lib/README.md) |
| `components/` | Tiny shared presentational components. → [components/README.md](components/README.md) |

`shared/data` is depended on by both `domain/` and `features/`; keep it free of React (except nothing —
data and calc only). The `ui/` primitives (Panel, Modal) live separately since they are React.
