import React, { useEffect, useMemo, useState } from 'react'
import './styles/slotMachine.casino.css'

// Daily Slot (backend-connected)
// - Unlimited tries per UTC day until you hit 3-of-a-kind (UTC 00:00 reset)
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
    const raw =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('sessionToken') ||
      localStorage.getItem('kudi_bearer_token') ||
      sessionStorage.getItem('token') ||
      ''

    const t = String(raw || '').trim()
    if (!t) return ''

    // If already "Bearer xxx" normalize it
    if (/^bearer\s+/i.test(t)) return t.replace(/^bearer\s+/i, '').trim()

    // Our backend session token format: "sess_..."
    if (t.startsWith('sess_')) return t

    // fallback (older tokens)
    return t
  } catch (e) {
    return ''
  }
}


function getSessionId() {
  try {
    return (
      // App.jsx uses sessionStorage as primary
      sessionStorage.getItem('kudi_session_id') ||
      localStorage.getItem('kudi_session_id') ||
      localStorage.getItem('session_id') ||
      ''
    )
  } catch (e) {
    return ''
  }
}

function getWallet() {
  try {
    return (
      localStorage.getItem('kudi_wallet') ||
      localStorage.getItem('wallet') ||
      localStorage.getItem('walletAddress') ||
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

export default function SlotMachine({
  icons = DEFAULT_ICONS,
  // Prefer App-managed auth state (more reliable on iOS/Safari)
  wallet: walletProp,
  bearerToken: bearerTokenProp,
  sessionId: sessionIdProp,
}) {
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
  const [howToOpen, setHowToOpen] = useState(false)
  const [nextResetUtc, setNextResetUtc] = useState('')

  const API_BASE = getApiBase()
  const token = (String(bearerTokenProp || '').trim() || getAuthToken()).trim()
  const sessionId = String(sessionIdProp || '').trim() || getSessionId()
  const wallet = String(walletProp || '').trim() || getWallet()

  // Fetch daily spin status
  useEffect(() => {
    const run = async () => {
      if (!API_BASE || !token) {
        // Not authenticated: keep canSpin true (UI will show CONNECT)
        setCanSpin(true)
        return
      }
      try {
        const r = await fetch(`${API_BASE}/slot/status`, {
          headers: {
          Authorization: `Bearer ${token}`,
          ...(sessionId ? { 'x-session-id': sessionId } : {}),
          ...(wallet ? { 'x-wallet': wallet } : {}),
        },
        })
        const j = await r.json()
        if (j && j.ok) {
          // Backend may incorrectly flip canSpin=false after any spin.
    // Our rule: unlimited tries per UTC day until a WIN (rewardEp > 0).
    // So we only lock DONE after a win.
    setCanSpin(typeof j.canSpin === 'boolean' ? j.canSpin : true)
          setNextResetUtc(j.nextResetUtc || '')
        }
      } catch (e) {
        // If backend unavailable, keep UX responsive (button still requires token)
        setCanSpin(true)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, token, wallet, sessionId])

  // How to Play modal: ESC to close + lock background scroll
  useEffect(() => {
    if (!howToOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setHowToOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [howToOpen])

  const spin = async () => {
    if (spinning) return
    if (!canSpin) {
      setWinToast(`Already WON today. Reset: 00:00 UTC`)
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
        ...(sessionId ? { 'x-session-id': sessionId } : {}),
        ...(wallet ? { 'x-wallet': wallet } : {}),
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
      setWinToast(null)  // silent fail
            return
    }

    // Apply final server result
    const ids = Array.isArray(j.result) ? j.result : []
    const finalKeys = ids.length === 3 ? ids.map(mapBackendIdToKey) : ['coin', 'coin', 'coin']
    const keyToIcon = (k) => iconSet.find((x) => x.key === k) || pickRandomIcon(iconSet)
    const final = [keyToIcon(finalKeys[0]), keyToIcon(finalKeys[1]), keyToIcon(finalKeys[2])]
    setReels(final)

    // Backend may incorrectly flip canSpin=false after any spin.
    // Our rule: unlimited tries per UTC day until a WIN (rewardEp > 0).
    // So we only lock DONE after a win.
    setCanSpin(typeof j.canSpin === 'boolean' ? j.canSpin : true)
    setNextResetUtc(j.nextResetUtc || nextResetUtc || '')

    const rewardEp = Number(j.rewardEp || 0)
    const isTriple = rewardEp > 0

    // Force rule: keep spinning until a win; only DONE after win
    if (isTriple) {
      setCanSpin(false)
    } else {
      setCanSpin(true)
    }

    if (isTriple) {
      setConfettiSeed(Date.now())
      window.clearTimeout(window.__slotConfettiT)
      window.__slotConfettiT = window.setTimeout(() => setConfettiSeed(0), 1400)
      setWinToast(`Congratulations! +${rewardEp} EP has been added to your account.`)
      window.clearTimeout(window.__slotToastT)
      window.__slotToastT = window.setTimeout(() => setWinToast(null), 2600)
    } else {
      setWinToast(null)  // no toast on no-match
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


      {howToOpen ? (
        <div className="slotHowtoOverlay" onMouseDown={() => setHowToOpen(false)}>
          <div className="slotHowtoModal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="slotHowtoHeader">
              <div className="slotHowtoTitle">How to Play — Daily Slot</div>
              <button className="slotHowtoClose" type="button" onClick={() => setHowToOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="slotHowtoBody">
              <div className="slotHowtoLead">
                Goal: Match <b>3 identical tiles</b> to win the daily reward.
              </div>
              <ol className="slotHowtoList">
                <li>Press <b>SPIN</b> to roll the 3 tiles.</li>
                <li>If all 3 tiles match, you win and the game becomes <b>DONE</b> for today.</li>
                <li>If they don&apos;t match, just press <b>SPIN</b> again — you can keep trying until you hit a match.</li>
                <li>Daily reset happens at <b>00:00 UTC</b>.</li>
              </ol>
              <div className="slotHowtoNote">
                Note: Rewards/limits are enforced by backend in production. Confetti appears on a win.
              </div>
            </div>
          </div>
        </div>
      ) : null}


      <div className="slotBottomRow">
        <div className="slotActionsCenter">
          <button className="slotSpinButton slotSpinPrimary" onClick={spin} disabled={spinning || !API_BASE || !token || !canSpin}>
            <span className="slotSpinText">
              {spinning ? 'SPINNING' : (!token ? 'CONNECT' : (canSpin ? 'SPIN' : 'DONE'))}
            </span>
            <span className="slotSpinGlow" />
          </button>

          <button
            className="slotHowtoDock"
            type="button"
            onClick={() => setHowToOpen(true)}
            aria-label="How to Play"
            title="How to Play"
          >
            <span className="slotHowtoDockIcon">?</span>
            <span className="slotHowtoDockText">How to Play</span>
          </button>
        </div>
      </div>
    </div>
  )
}