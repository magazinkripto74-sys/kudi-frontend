import React, { useEffect, useMemo, useState } from 'react'

function todayKeyUTC() {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export default function MysteryBoxGame() {
  const storageKey = useMemo(() => `kudi_mystery_${todayKeyUTC()}`, [])

  const [opened, setOpened] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || 'null')
    } catch {
      return null
    }
  })

  const reward = opened?.ep ?? 0
  const [confettiKey, setConfettiKey] = useState(0)
  const [showRewardFx, setShowRewardFx] = useState(false)

  useEffect(() => {
    if (!showRewardFx) return
    const t = window.setTimeout(() => setShowRewardFx(false), 1400)
    return () => window.clearTimeout(t)
  }, [showRewardFx])

  const openBox = () => {
    if (opened) return

    // Demo reward for now (backend later): 0-8 EP
    const ep = randInt(0, 8)
    const payload = { ep, ts: Date.now() }

    setOpened(payload)
    try {
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {}

    setConfettiKey((k) => k + 1)
    setShowRewardFx(true)
  }

  return (
    <div className="kudiGameCard">
      <div className="mysteryProdHeader">
        <div>
          <div className="mysteryProdTitle">Mystery Box</div>
          <div className="mysteryProdSub">
            1 open per day (UTC). Reward shown is demo. (Backend EP later)
          </div>
        </div>
      </div>

      <div className="mysteryProdPanel">
        <div className="mysteryProdPanelTitle">MYSTERY BOX</div>

        <div className="mysteryProdPanelText">
          {opened ? (
            <>
              Opened — you got <b>{reward} EP</b>. Come back tomorrow (UTC reset).
            </>
          ) : (
            <>
              Tap <b>Open</b> to reveal your reward. Resets at <b>00:00 UTC</b>.
            </>
          )}
        </div>

        {/* Reward FX (confetti + big EP) */}
        {showRewardFx && (
          <div className="kudiRewardFx" key={confettiKey} aria-hidden="true">
            <div className="kudiRewardText">+{opened?.ep ?? 0} EP</div>
            <div className="kudiConfettiBurst">
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="kudiConfettiPiece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.12}s`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mysteryProdActions">
        <button
          className="btn primary mysteryProdOpenBtn"
          type="button"
          onClick={openBox}
          disabled={!!opened}
        >
          {opened ? 'Opened' : 'Open'}
        </button>
      </div>

      {opened && (
        <div className="kudiGameHint" style={{ marginTop: 10 }}>
          <b>Reward (demo):</b> {reward} EP
        </div>
      )}
    </div>
  )
}
