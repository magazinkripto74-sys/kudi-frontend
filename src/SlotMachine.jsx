import React, { useEffect, useMemo, useState } from 'react'
import './styles/slotMachine.casino.css'

// Daily Slot (UI-only demo)
// - 3 reels
// - No EP payout yet (Step-2 later)
// - Images live in /public/media/slot/*.png

// Keep this list aligned with files in:
//   public/media/slot/
// Expected default filenames:
//   - kudi-baba.png
//   - skunk.png
//   - 4t-coin.png

// --- Confetti + Toast (MP4 removed) ---
const REWARD_MAP = {
  baba: 15,
  skunk: 10,
  coin: 5,
}

function ConfettiBurst({ seed }) {
  // Re-generate pieces each time seed changes
  const pieces = useMemo(() => {
    const rng = (n) => {
      const x = Math.sin(seed * (n + 1)) * 10000
      return x - Math.floor(x)
    }

    const count = 42
    return Array.from({ length: count }).map((_, i) => {
      const r1 = rng(i * 3 + 0)
      const r2 = rng(i * 3 + 1)
      const r3 = rng(i * 3 + 2)

      const angle = (-70 + r1 * 140) * (Math.PI / 180)
      const dist = 160 + r2 * 220
      const x = Math.cos(angle) * dist
      const y = -Math.sin(Math.abs(angle)) * dist - (120 + r3 * 180)

      return {
        id: i,
        x: `${x.toFixed(1)}px`,
        y: `${y.toFixed(1)}px`,
        rot: `${(r2 * 720).toFixed(0)}deg`,
        delay: `${(r1 * 0.12).toFixed(2)}s`,
        dur: `${(0.85 + r3 * 0.55).toFixed(2)}s`,
        size: `${(6 + r2 * 8).toFixed(1)}px`,
        hue: `${Math.floor(r1 * 360)}`,
      }
    })
  }, [seed])

  return (
    <div className="slotConfettiLayer" aria-hidden="true">
      <div className="slotConfettiOrigin">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="slotConfettiPiece"
            style={{
              "--x": p.x,
              "--y": p.y,
              "--rot": p.rot,
              "--delay": p.delay,
              "--dur": p.dur,
              "--size": p.size,
              "--h": p.hue,
            }}
          />
        ))}
      </div>
    </div>
  )
}
const DEFAULT_ICONS = [
  { key: 'baba', label: 'KUDI BABA', src: '/media/slot/kudi-baba.png', fallback: '👑' },
  { key: 'coin', label: '4T COIN', src: '/media/slot/4t-coin.png', fallback: '🪙' },
  { key: 'skunk', label: 'SKUNK', src: '/media/slot/skunk.png', fallback: '🦨' },
]

function pickRandomIcon(icons) {
  return icons[Math.floor(Math.random() * icons.length)]
}

function SlotSymbol({ symbol, spinning }) {
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    setBroken(false)
  }, [symbol.key])

  return (
    <div className={`slotSymbol ${spinning ? 'isSpinningSymbol' : ''}`}>
      {!broken ? (
        <img
          className="slotSymbolImg"
          src={symbol.src}
          alt={symbol.label}
          draggable={false}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="slotEmojiFallback" aria-label={symbol.label}>
          {symbol.fallback}
        </div>
      )}
      <div className="slotSymbolScan" />
    </div>
  )
}

export default function SlotMachine({ icons = DEFAULT_ICONS }) {
  const iconSet = useMemo(() => {
    const safe = Array.isArray(icons) ? icons.filter(Boolean) : []
    return safe.length ? safe : DEFAULT_ICONS
  }, [icons])

  const [spinning, setSpinning] = useState(false)
  const [reels, setReels] = useState(() => [
    pickRandomIcon(iconSet),
    pickRandomIcon(iconSet),
    pickRandomIcon(iconSet),
  ])
  const [message, setMessage] = useState('Daily Spin (demo) — no EP yet.')
  const [winToast, setWinToast] = useState(null)
  const [confettiSeed, setConfettiSeed] = useState(0)


  const spin = async () => {
    if (spinning) return

    setSpinning(true)
    setMessage('Spinning...')

    // Fast spin animation
    for (let i = 0; i < 16; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 65))
      setReels([pickRandomIcon(iconSet), pickRandomIcon(iconSet), pickRandomIcon(iconSet)])
    }

    // Final result
    const final = [pickRandomIcon(iconSet), pickRandomIcon(iconSet), pickRandomIcon(iconSet)]
    setReels(final)

    const isTriple = final.every((x) => x.key === final[0].key)
    const reward = REWARD_MAP[final[0].key] || 0

    const isJackpot = final.every((x) => x.key === 'baba')
    setMessage(isJackpot ? 'JACKPOT! (EP step-2’de bağlayacağız)' : 'Nice! (EP step-2’de bağlayacağız)')

    if (isTriple && reward > 0) {
      setConfettiSeed(Date.now())
      setWinToast(`Congratulations! +${reward} EP has been added to your account.`)
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2600)
    }

    setSpinning(false)
  }

  return (
    <div className={`slotCard ${spinning ? 'isSpinning' : ''}`}>
      <div className="slotCardHeader">
        <div className="slotTitle">
          <span className="slotTitleIcon">🎰</span>
          <span>Daily Slot</span>
        </div>
        <div className="slotHint">3x KUDI BABA = EP (step-2)</div>
      </div>

      <div className="slotMachine" aria-label="Daily slot machine">
        <div className="slotOverlayGlow" />

        {reels.map((r, idx) => (
          <div className="slotReel" key={`${idx}-${r.key}`}>
            <SlotSymbol symbol={r} spinning={spinning} />
            <div className="slotLabel">{r.label}</div>
          </div>
        ))}
      </div>

      {confettiSeed ? <ConfettiBurst seed={confettiSeed} /> : null}
      {winToast ? <div className="slotToastWin">{winToast}</div> : null}

      <div className="slotBottomRow">
        <div className="slotMessage">{message}</div>
        <button className="slotSpinButton" onClick={spin} disabled={spinning}>
          <span className="slotSpinText">{spinning ? 'SPINNING' : 'SPIN'}</span>
          <span className="slotSpinGlow" />
        </button>
      </div>
    </div>
  )
}
