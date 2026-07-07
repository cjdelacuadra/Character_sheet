# shared/lib/ — framework-agnostic utilities

Pure helpers with no React and no game-domain knowledge.

| File | Role |
|------|------|
| `diceExpr.ts` | Parse, combine (`combineDiceExpr` — same-size dice merge, canonical ordering), and crit-double (`critDiceExpr`) dice expressions. Used everywhere attacks/damage are formatted. |
| `rendererLogger.ts` | Renderer-side logging (`logError`, …) routed to the console/main logger. |
