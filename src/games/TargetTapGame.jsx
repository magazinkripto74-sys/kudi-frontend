import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_BEST = "kudi_target_best";

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export default function TargetTapGame({ onBack }) {
  const areaRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(10_000);
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ x: 40, y: 40 });
  const [best, setBest] = useState(() => Number(localStorage.getItem(LS_BEST) || "0") || 0);

  const timeLeft = useMemo(() => Math.ceil(timeLeftMs / 1000), [timeLeftMs]);

  const placeTarget = () => {
    const el = areaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const size = 56; // target size
    const x = Math.random() * (r.width - size);
    const y = Math.random() * (r.height - size);
    setPos({ x: clamp(x, 0, r.width - size), y: clamp(y, 0, r.height - size) });
  };

  useEffect(() => {
    if (!running) return;
    placeTarget();

    const started = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - started;
      const left = 10_000 - elapsed;
      setTimeLeftMs(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        setRunning(false);
      }
    }, 50);

    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running) return;
    // end -> save best
    if (score > 0) {
      const next = Math.max(best, score);
      setBest(next);
      localStorage.setItem(LS_BEST, String(next));
    }
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    setScore(0);
    setTimeLeftMs(10_000);
    setRunning(true);
  };

  const hit = () => {
    if (!running) return;
    setScore((s) => s + 1);
    placeTarget();
  };

  return (
    <div className="miniGamePage">
      <div className="miniGameHeader">
        <div>
          <div className="miniGamePageTitle">Target Tap</div>
          <div className="miniGamePageSub">10 seconds. Tap as many targets as you can. (Front-only)</div>
        </div>
        <button className="btn secondary" type="button" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="gameCard">
        <div className="gameRow">
          <div className="gameStat">
            <div className="gameStatLabel">Time</div>
            <div className="gameStatValue">{timeLeft}s</div>
          </div>
          <div className="gameStat">
            <div className="gameStatLabel">Score</div>
            <div className="gameStatValue">{score}</div>
          </div>
          <div className="gameStat">
            <div className="gameStatLabel">Best</div>
            <div className="gameStatValue">{best || "—"}</div>
          </div>
        </div>

        <div className="targetArea" ref={areaRef}>
          <button
            type="button"
            className={`targetDot ${running ? "isLive" : "isIdle"}`}
            style={{ left: pos.x, top: pos.y }}
            onClick={hit}
            aria-label="target"
          />
          {!running && (
            <div className="targetOverlay">
              <div className="targetOverlayTitle">Ready</div>
              <div className="targetOverlaySub">Press Start</div>
            </div>
          )}
        </div>

        <div className="gameActions">
          {!running ? (
            <button className="btn primary" type="button" onClick={start}>
              Start
            </button>
          ) : (
            <button className="btn ghost" type="button" onClick={() => setRunning(false)}>
              Stop
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
