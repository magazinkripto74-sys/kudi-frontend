import React, { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Frontend-only demo.
 * Later we will connect to backend for provably-fair outcomes + daily caps.
 */
export default function CrashGame() {
  const [status, setStatus] = useState('idle') // idle | running | ended
  const [mult, setMult] = useState(1.0)
  const [result, setResult] = useState(null)
  const [howToOpen, setHowToOpen] = useState(false)


  useEffect(() => {
    if (!howToOpen) return
    const onKeyDownHowTo = (e) => {
      if (e.key === 'Escape') setHowToOpen(false)
    }
    window.addEventListener('keydown', onKeyDownHowTo)
    return () => window.removeEventListener('keydown', onKeyDownHowTo)
  }, [howToOpen])

  const rafRef = useRef(null)
  const startTsRef = useRef(0)
  const crashAtRef = useRef(0)

  const last = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('kudi_crash_last') || 'null') } catch { return null }
  }, [])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function tick(ts) {
    if (!startTsRef.current) startTsRef.current = ts
    const t = (ts - startTsRef.current) / 1000
    // smooth-ish growth: 1.0 -> ~3.0 in ~10s
    const next = Math.max(1, 1 + t * 0.22 + (t * t) * 0.02)
    if (next >= crashAtRef.current) {
      setMult(crashAtRef.current)
      end('crash')
      return
    }
    setMult(next)
    rafRef.current = requestAnimationFrame(tick)
  }

  function start() {
    if (status === 'running') return
    setResult(null)
    setMult(1.0)
    setStatus('running')
    startTsRef.current = 0
    // crash point 1.2 - 6.0 (biased low)
    const r = Math.random()
    const crashAt = 1.2 + Math.pow(r, 0.65) * 4.8
    crashAtRef.current = Number(crashAt.toFixed(2))
    rafRef.current = requestAnimationFrame(tick)
  }

  function end(type) {
    cancelAnimationFrame(rafRef.current)
    setStatus('ended')
    const payload = {
      endedAt: Date.now(),
      crashAt: crashAtRef.current,
      final: Number(mult.toFixed(2)),
      type,
    }
    localStorage.setItem('kudi_crash_last', JSON.stringify(payload))
    setResult(payload)
  }

  function cashOut() {
    if (status !== 'running') return
    end('cashout')
  }

  return (
    <div className="kudiGameCard">
      <div className="kudiGameRow">
        <div>
          <div className="kudiGameLabel">Multiplier</div>
          <div className="kudiGameValue">{mult.toFixed(2)}x</div>
        </div>
        <div className="kudiGameActions">
          <button
              className="btn ghost"
              type="button"
              onClick={() => setHowToOpen(true)}
              title="How to Play"
            >
              How to Play
            </button>
            <button className="btn primary" type="button" onClick={start} disabled={status === 'running'}>
            Start
          </button>
          <button className="btn secondary" type="button" onClick={cashOut} disabled={status !== 'running'}>
            Cash Out
          </button>
        </div>
      </div>

      <div className="kudiGameHint">
        Demo logic only. Later: backend caps (max 10 EP/day), anti-spam, provably fair.
      </div>

      {result && (
        <div className="kudiGameResult">
          <div><b>Result:</b> {result.type === 'cashout' ? 'CASH OUT' : 'CRASH'}</div>
          <div><b>Crash at:</b> {result.crashAt}x</div>
          <div><b>Final:</b> {result.final}x</div>
        </div>
      )}

      {last && !result && (
        <div className="kudiGameResult">
          <div><b>Last run:</b> {new Date(last.endedAt).toLocaleString()}</div>
          <div><b>Type:</b> {last.type}</div>
          <div><b>Crash:</b> {last.crashAt}x</div>
        </div>
      )}
      {howToOpen && (
        <div className="crashHowToOverlay" role="dialog" aria-modal="true">
          <div className="crashHowToModal">
            <div className="crashHowToHeader">
              <div className="crashHowToTitle">How to Play — Crash</div>
              <button className="crashHowToClose" type="button" onClick={() => setHowToOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="crashHowToBody">
              <p>
                <b>Goal:</b> Start the round and cash out before the multiplier crashes.
              </p>
              <ol>
                <li>Press <b>Start</b> to begin the round.</li>
                <li>The multiplier will increase from <b>1.00×</b> upward.</li>
                <li>Press <b>Cash Out</b> at any time to lock your result.</li>
                <li>If the round crashes before you cash out, you get <b>0</b> for that round.</li>
              </ol>
              <p style={{ opacity: 0.85 }}>
                <b>Note:</b> This is a demo UI now. Later we’ll connect it to the backend with daily caps and anti-spam rules.
              </p>
              <p style={{ opacity: 0.85 }}>
                <b>Tip:</b> Small cash-outs are safer; waiting longer is riskier but can pay more.
              </p>
            </div>

            <div className="crashHowToFooter">
              <button className="btn primary" type="button" onClick={() => setHowToOpen(false)}>
                Got it
              </button>
            </div>
          </div>

          <button className="crashHowToBackdrop" type="button" onClick={() => setHowToOpen(false)} aria-label="Close overlay" />
        </div>
      )}


    </div>
  )
}