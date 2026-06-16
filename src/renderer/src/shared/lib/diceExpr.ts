interface DieTerm { count: number; face: number }

function parseDiceExpr(expr: string): { dice: DieTerm[]; flat: number } {
  const dice: DieTerm[] = []
  let flat = 0
  // Normalise: remove spaces, handle subtraction as negative addition
  const normalised = expr.replace(/\s+/g, '').replace(/-/g, '+-')
  for (const token of normalised.split('+').filter(Boolean)) {
    const dieMatch = token.match(/^(-?\d+)d(\d+)$/)
    if (dieMatch) {
      const count = parseInt(dieMatch[1], 10)
      const face  = parseInt(dieMatch[2], 10)
      if (count !== 0) dice.push({ count, face })
    } else {
      const n = parseInt(token, 10)
      if (!isNaN(n)) flat += n
    }
  }
  return { dice, flat }
}

function combineDiceTerms(terms: DieTerm[]): DieTerm[] {
  const byFace = new Map<number, number>()
  for (const { count, face } of terms) {
    byFace.set(face, (byFace.get(face) ?? 0) + count)
  }
  return Array.from(byFace.entries())
    .filter(([, count]) => count !== 0)
    .map(([face, count]) => ({ count, face }))
    .sort((a, b) => b.face - a.face)
}

/** Rolls a dice expression (e.g. "1d4+4", "2d6-1") and returns the total (minimum 0). */
export function rollDiceExpr(expr: string): number {
  const { dice, flat } = parseDiceExpr(expr)
  let total = flat
  for (const { count, face } of dice) {
    const sign = count < 0 ? -1 : 1
    for (let i = 0; i < Math.abs(count); i++) {
      total += sign * (Math.floor(Math.random() * face) + 1)
    }
  }
  return Math.max(0, total)
}

export function formatToHit(bonus: number, adv: 'n' | 'a' | 'd' = 'n'): string {
  const mod = bonus === 0 ? '' : bonus > 0 ? ` + ${bonus}` : ` - ${Math.abs(bonus)}`
  if (adv === 'a') return `max(1d20, 1d20)${mod}`
  if (adv === 'd') return `min(1d20, 1d20)${mod}`
  return `1d20${mod}`
}

export function combineDiceExpr(expr: string): string {
  if (!expr || expr === '—') return expr
  const { dice, flat } = parseDiceExpr(expr)
  const combined = combineDiceTerms(dice)

  const parts: string[] = combined.map(({ count, face }) =>
    count === 1 ? `1d${face}` : `${count}d${face}`,
  )

  if (flat > 0)       parts.push(String(flat))
  else if (flat < 0)  parts.push(`${flat}`)

  return parts.join(' + ').replace(/\+ -/g, '- ')  || '0'
}

/** Doubles every die COUNT (crit), leaving flat modifiers unchanged.
 *  "2d6 + 14" -> "4d6 + 14"; "1d8" -> "2d8". */
export function critDiceExpr(expr: string): string {
  if (!expr || expr === 'â€”') return expr
  const { dice, flat } = parseDiceExpr(expr)
  const doubled = combineDiceTerms(dice.map(term => ({ ...term, count: term.count * 2 })))
  const diceExpr = doubled.map(({ count, face }) =>
    count === 1 ? `1d${face}` : `${count}d${face}`,
  ).join('+')
  return combineDiceExpr([diceExpr, flat !== 0 ? String(flat) : null].filter(Boolean).join('+'))
}
