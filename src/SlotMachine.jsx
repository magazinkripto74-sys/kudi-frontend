import React, { useEffect, useMemo, useState } from 'react'
import './styles/slotMachine.casino.css'

// Daily Slot (backend-connected)
// - 1 spin per UTC day (UTC 00:00 reset)
// - Result + EP award are server-side (anti-cheat)

// Keep this list aligned with files in:
//   public/media/slot/
// Expected default filenames:
//   - kudi-baba.png
//   - skunk.png
//   - 4t-coin.png

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
      const dist = 95 + r2 * 150
      const x = Math.cos(angle) * dist
      const y = -Math.sin(Math.abs(angle)) * dist - (80 + r3 * 120)

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

function getApiBase() {
  // Vite env
  // eslint-disable-next-line no-undef
  const base = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) ? import.meta.env.VITE_API_BASE : ''
  return String(base || '').replace(/\/$/, '')
}

function getAuthToken() {
  try {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('sessionToken') ||
      sessionStorage.getItem('token') ||
      ''
    )
  } catch (e) {
    return ''
  }
}

function mapBackendIdToKey(id) {
  const s = String(id || '').toLowerCase()
  if (s === 'kudi_baba' || s === 'kudi-baba' || s === 'baba') return 'baba'
  if (s === '4t_coin' || s === '4t-coin' || s === 'coin') return 'coin'
  if (s === 'skunk') return 'skunk'
  return 'coin'
}

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
  const [winToast, setWinToast] = useState(null)
  const [confettiSeed, setConfettiSeed] = useState(0)
  const [canSpin, setCanSpin] = useState(true)
  const [nextResetUtc, setNextResetUtc] = useState('')

  const API_BASE = getApiBase()
  const token = getAuthToken()

  // Fetch daily spin status
  useEffect(() => {
    const run = async () => {
      if (!API_BASE || !token) {
        setCanSpin(false)
        return
      }
      try {
        const r = await fetch(`${API_BASE}/slot/status`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const j = await r.json()
        if (j && j.ok) {
          setCanSpin(!!j.canSpin)
          setNextResetUtc(j.nextResetUtc || '')
        }
      } catch (e) {
        // If backend unavailable, keep UX safe
        setCanSpin(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, token])


  const spin = async () => {
    if (spinning) return
    if (!canSpin) {
      setWinToast(`Daily spin already used. Reset: 00:00 UTC`)
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2200)
      return
    }
    if (!API_BASE || !token) {
      setWinToast('Connect wallet to spin.')
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2200)
      return
    }

    setSpinning(true)

    // Kick off backend spin in parallel with the animation
    const spinReq = fetch(`${API_BASE}/slot/spin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    }).then((r) => r.json())

    // Animation
    for (let i = 0; i < 16; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 65))
      setReels([pickRandomIcon(iconSet), pickRandomIcon(iconSet), pickRandomIcon(iconSet)])
    }

    let j = null
    try {
      j = await spinReq
    } catch (e) {
      j = null
    }

    if (!j || !j.ok) {
      setSpinning(false)
      setWinToast('Spin failed. Try again later.')
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2400)
      return
    }

    // Apply final server result
    const ids = Array.isArray(j.result) ? j.result : []
    const finalKeys = ids.length === 3 ? ids.map(mapBackendIdToKey) : ['coin', 'coin', 'coin']
    const keyToIcon = (k) => iconSet.find((x) => x.key === k) || pickRandomIcon(iconSet)
    const final = [keyToIcon(finalKeys[0]), keyToIcon(finalKeys[1]), keyToIcon(finalKeys[2])]
    setReels(final)

    setCanSpin(false)
    setNextResetUtc(j.nextResetUtc || nextResetUtc || '')

    const rewardEp = Number(j.rewardEp || 0)
    const isTriple = rewardEp > 0

    if (isTriple) {
      setConfettiSeed(Date.now())
      window.clearTimeout(window.__slotConfettiT)
      window.__slotConfettiT = window.setTimeout(() => setConfettiSeed(0), 1400)
      setWinToast(`Congratulations! +${rewardEp} EP has been added to your account.`)
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2600)
    } else {
      setWinToast('Spin used. Come back tomorrow!')
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2200)
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

      {confettiSeed ? <ConfettiBurst key={confettiSeed} seed={confettiSeed} /> : null}
      {winToast ? <div className="slotToastWin">{winToast}</div> : null}

      <div className="slotBottomRow">
        <button className="slotSpinButton" onClick={spin} disabled={spinning || !canSpin || !API_BASE || !token}>
          <span className="slotSpinText">
            {spinning ? 'SPINNING' : canSpin ? 'SPIN' : 'DONE'}
          </span>
          <span className="slotSpinGlow" />
        </button>
      </div>
    </div>
  )
}
