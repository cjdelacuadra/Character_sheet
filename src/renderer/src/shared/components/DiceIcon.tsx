const SHAPES: Record<string, string> = {
  d4:  '14,3 25,24 3,24',
  d6:  '4,4 24,4 24,24 4,24',
  d8:  '14,2 26,14 14,26 2,14',
  d10: '14,2 25,10 21,24 7,24 3,10',
  d12: '10,2 18,2 25,9 25,19 18,26 10,26 3,19 3,9',
  d20: '14,2 24,8 24,20 14,26 4,20 4,8',
}

interface DiceIconProps {
  die: string
  size?: number
}

export function DiceIcon({ die, size = 16 }: DiceIconProps) {
  const pts = SHAPES[die] ?? SHAPES['d6']
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      <polygon points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="14" y="17" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">{die}</text>
    </svg>
  )
}

export function parseDieType(damage: string): string | null {
  const m = damage.match(/\bd(\d+)\b/)
  return m ? `d${m[1]}` : null
}
