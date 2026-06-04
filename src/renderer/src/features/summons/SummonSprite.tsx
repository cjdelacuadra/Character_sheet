import { useEffect, useMemo, useState } from 'react'
import {
  PORTAL_FRAMES,
  SUMMON_FRAMES,
  resolvePortalFrames,
  resolveSummonSprite,
} from '@/features/spells/animationAssets'
import styles from './SummonSprite.module.css'

interface Props {
  templateId: string
  type: string
  size?: number
  /** Play the arcane-portal opener once before the idle loop (PNG-sequence summons only). */
  playPortal?: boolean
}

const FRAME_MS = 110

/**
 * Renders a summon's sprite. GIF idle loops (Mage Hand, Spiritual Weapon, Unseen Servant)
 * self-animate and never play a portal. PNG-sequence summons optionally play the shared
 * portal opener once, then loop their 4-frame idle. The frame index is derived from a single
 * monotonic tick so there's no setState-in-updater and the portal→idle handoff is seamless.
 */
export function SummonSprite({ templateId, type, size = 22, playPortal = false }: Props) {
  const asset = useMemo(() => resolveSummonSprite(templateId, type), [templateId, type])
  const portalFrames = useMemo(() => resolvePortalFrames(), [])
  const portalLen = playPortal && asset.usesPortal && asset.kind === 'png-seq' ? PORTAL_FRAMES : 0

  const [tick, setTick] = useState(0)

  // Restart the timeline whenever the summon identity changes.
  useEffect(() => { setTick(0) }, [templateId, type])

  // Advance the tick once per frame. GIFs animate themselves, so they need no ticker.
  useEffect(() => {
    if (asset.kind === 'gif') return
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      if (now - last >= FRAME_MS) { last = now; setTick(t => t + 1) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [asset.kind, templateId, type])

  let src: string
  if (asset.kind === 'gif') {
    src = asset.frames[0]
  } else if (tick < portalLen) {
    src = portalFrames[tick]
  } else {
    src = asset.frames[(tick - portalLen) % SUMMON_FRAMES]
  }

  return (
    <img
      className={styles.summonSprite}
      src={src}
      alt=""
      style={{ width: size, height: size }}
      onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
    />
  )
}
