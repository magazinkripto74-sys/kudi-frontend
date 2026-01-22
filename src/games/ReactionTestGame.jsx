import React, { useEffect, useRef, useState } from 'react'

export default function ReactionTestGame() {
  const [phase, setPhase] = useState('idle') // idle | waiting | now | tooSoon | result
  const [ms, setMs] = useState(null)
  const [howToOpen, setHowToOpen] = useState(false)
  const timeoutRef = useRef(null)
  const startTsRef = useRef(0)
  const bestRef = useRef(Number(localStorage.getItem('kudi_react_best') || 99999))
  const [best, setBest] = useState(bestRef.current === 99999 ? null : bestRef.current)

  useEffect(() => {
    if (!howToOpen) return
    const onKeyDownHowTo = (e) => {
      if (e.key === 'Escape') setHowToOpen(false)
    }
    window.addEventListener('keydown', onKeyDownHowTo)
    return () => window.removeEventListener('keydown', onKeyDownHowTo)
  }, [howToOpen])



  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function start() {
    clearTimeout(timeoutRef.current)
    setMs(null)
    setPhase('waiting')
    const delay = 1000 + Math.random() * 2500
    timeoutRef.current = setTimeout(() => {
      startTsRef.current = performance.now()
      setPhase('now')
    }, delay)
  }

  function click() {
    if (phase === 'waiting') {
      clearTimeout(timeoutRef.current)
      setPhase('tooSoon')
      return
    }
    if (phase === 'now') {
      const delta = Math.max(0, Math.round(performance.now() - startTsRef.current))
      setMs(delta)
      setPhase('result')
      if (delta < bestRef.current) {
        bestRef.current = delta
        setBest(delta)
        localStorage.setItem('kudi_react_best', String(delta))
      }
    }
  }

  function reset() {
    setPhase('idle')
    setMs(null)
  }

  return (
    <div className="kudiGameCard">
      <div className="kudiGameRow">
        <div>
          <div className="kudiGameLabel">Best</div>
          <div className="kudiGameValue">{best ? `${best} ms` : '—'}</div>
        </div>
        <div className="kudiGameActions">
          <button className="btn ghost" type="button" onClick={() => setHowToOpen(true)} title="How to Play">How to Play</button>
          <button className="btn primary" type="button" onClick={start}>
            Start
          </button>
          <button className="btn secondary" type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`kudiReactionPad phase-${phase}`}
        onClick={click}
        title="Tap here"
      >
        {phase === 'idle' && 'Press START'}
        {phase === 'waiting' && 'WAIT...'}
        {phase === 'now' && 'NOW! TAP!'}
        {phase === 'tooSoon' && 'TOO SOON — press START'}
        {phase === 'result' && `Your time: ${ms} ms (press START)`}
      </button>

      <div className="kudiGameHint">
        Simple reaction test. Later: backend save + daily reward.
      </div>
      {howToOpen && (
        <div className="reactionHowToOverlay" role="dialog" aria-modal="true">
          <button className="reactionHowToBackdrop" type="button" onClick={() => setHowToOpen(false)} aria-label="Close overlay" />
          <div className="reactionHowToModal">
            <div className="reactionHowToHeader">
              <div className="reactionHowToTitle">How to Play — Reaction Test</div>
              <button className="reactionHowToClose" type="button" onClick={() => setHowToOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="reactionHowToBody">
              <p><b>Goal:</b> Get the fastest reaction time (in milliseconds).</p>
              <ol>
                <li>Press <b>Start</b> to begin.</li>
                <li>The screen will show <b>WAIT…</b> for a random time.</li>
                <li>When it changes to <b>TAP!</b>, click/tap as fast as you can.</li>
                <li>If you tap too early, it counts as <b>Too Soon</b>. Try again.</li>
              </ol>
              <p style={{ opacity: 0.85 }}>
                Your best time is saved locally on this device.
              </p>
              <p style={{ opacity: 0.85 }}>
                <b>Note:</b> Reward is shown as 5 EP (coming soon). Real EP + daily limits will be connected later.
              </p>
            </div>

            <div className="reactionHowToFooter">
              <button className="btn primary" type="button" onClick={() => setHowToOpen(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}