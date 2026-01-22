import React, { useEffect, useRef, useState } from 'react'

export default function TargetTapGame() {
  const [running, setRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(10)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem('kudi_target_best') || 0))
  const [target, setTarget] = useState({ x: 50, y: 50, id: 0 })
  const [howToOpen, setHowToOpen] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!howToOpen) return
    const onKeyDownHowTo = (e) => {
      if (e.key === 'Escape') setHowToOpen(false)
    }
    window.addEventListener('keydown', onKeyDownHowTo)
    return () => window.removeEventListener('keydown', onKeyDownHowTo)
  }, [howToOpen])



  useEffect(() => () => clearInterval(timerRef.current), [])

  function randomTarget() {
    // keep inside safe bounds
    const x = 10 + Math.random() * 80
    const y = 10 + Math.random() * 80
    setTarget((t) => ({ x, y, id: t.id + 1 }))
  }

  function start() {
    clearInterval(timerRef.current)
    setRunning(true)
    setTimeLeft(10)
    setScore(0)
    randomTarget()
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setRunning(false)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function hit() {
    if (!running) return
    setScore((s) => s + 1)
    randomTarget()
  }

  useEffect(() => {
    if (!running && timeLeft === 0) {
      const nextBest = Math.max(best, score)
      setBest(nextBest)
      localStorage.setItem('kudi_target_best', String(nextBest))
    }
  }, [running, timeLeft, score, best])

  return (
    <div className="kudiGameCard">
      <div className="kudiGameRow">
        <div className="kudiGameStats">
          <div><span className="kudiGameLabel">Time</span> <b>{timeLeft}s</b></div>
          <div><span className="kudiGameLabel">Score</span> <b>{score}</b></div>
          <div><span className="kudiGameLabel">Best</span> <b>{best}</b></div>
        </div>
        <div className="kudiGameActions">
          <button className="btn ghost" type="button" onClick={() => setHowToOpen(true)} title="How to Play">How to Play</button>
          <button className="btn primary" type="button" onClick={start}>
            {running ? 'Restart' : 'Start'}
          </button>
        </div>
      </div>

      <div className="kudiTargetBoard" aria-label="Target board">
        <button
          type="button"
          className="kudiTargetDot"
          style={{ left: `${target.x}%`, top: `${target.y}%` }}
          onClick={hit}
          disabled={!running}
          title={running ? 'Tap!' : 'Start the game'}
        />
      </div>

      <div className="kudiGameHint">
        Tap as many targets as you can in 10 seconds (mobile-friendly).
      </div>
      {howToOpen && (
        <div className="targetHowToOverlay" role="dialog" aria-modal="true">
          <button className="targetHowToBackdrop" type="button" onClick={() => setHowToOpen(false)} aria-label="Close overlay" />
          <div className="targetHowToModal">
            <div className="targetHowToHeader">
              <div className="targetHowToTitle">How to Play — Target Tap</div>
              <button className="targetHowToClose" type="button" onClick={() => setHowToOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="targetHowToBody">
              <p><b>Goal:</b> Tap as many targets as you can before the timer ends.</p>
              <ol>
                <li>Press <b>Start</b> (or <b>Restart</b>) to begin a new round (10 seconds).</li>
                <li>A circle target appears inside the box.</li>
                <li>Tap the target to score points — each hit spawns a new target.</li>
                <li>When time reaches <b>0</b>, the round ends and your best score is saved.</li>
              </ol>
              <p style={{ opacity: 0.85 }}>
                <b>Tip:</b> Use quick, short taps. On mobile, keep your finger near the center to react faster.
              </p>
              <p style={{ opacity: 0.85 }}>
                <b>Note:</b> Reward is shown as 5 EP (coming soon). We’ll connect real EP & daily limits later.
              </p>
            </div>

            <div className="targetHowToFooter">
              <button className="btn primary" type="button" onClick={() => setHowToOpen(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}