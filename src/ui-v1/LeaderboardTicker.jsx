import React, { useMemo } from 'react'

/**
 * LeaderboardTicker
 * - Safe add-on component (no dependencies on existing layout)
 * - Place between Leaderboard and First Task
 *
 * Props:
 *  - direction: 'rtl' (default) or 'ltr'
 *  - includeWelcome: boolean (default false)
 *  - speedSec: number (default 28)
 */
export default function LeaderboardTicker({
  direction = 'rtl',
  includeWelcome = false,
  speedSec = 28,
}) {
  const items = useMemo(() => {
    const base = [
      '🔥 Elite package gives 25% direct referral bonus',
      '⚡ Daily tasks reset at 00:00 (UTC+6)',
      '🎁 Invite friends → earn L1 5% + L2 2%',
      '👑 Reach KUDI BABA to unlock perks',
    ]
    if (includeWelcome) base.push('🦨 Welcome to KUDI SKUNK — Powered by 4T Ecosystem')
    return base
  }, [includeWelcome])

  // Duplicate items for seamless loop
  const loop = useMemo(() => [...items, ...items], [items])

  return (
    <div className="kudiTickerWrap" data-dir={direction} aria-label="KUDI announcements">
      <div className="kudiTickerTrack" style={{ ['--tickerSpeed']: `${speedSec}s` }}>
        {loop.map((t, i) => (
          <span className="kudiTickerItem" key={`${i}-${t}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
