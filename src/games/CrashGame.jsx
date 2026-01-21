import React, { useEffect, useRef, useState } from "react";

const LS_BEST = "kudi_crash_best_mult";

function formatMult(x) {
  return `${x.toFixed(2)}x`;
}

/**
 * Front-only Crash (demo)
 * - Start -> multiplier increases
 * - Random crash chance increases with multiplier
 * - Cashout before crash -> score
 * - Stores best cashout in localStorage
 */
export default function CrashGame({ onBack }) {
  const [running, setRunning] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [mult, setMult] = useState(1.0);
  const [cashoutMult, setCashoutMult] = useState(null);
  const [best, setBest] = useState(() => {
    const v = Number(localStorage.getItem(LS_BEST) || "0");
    return Number.isFinite(v) ? v : 0;
  });

  const rafRef = useRef(null);
  const tickRef = useRef({ last: 0 });

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const reset = () => {
    setRunning(false);
    setCrashed(false);
    setMult(1.0);
    setCashoutMult(null);
  };

  const start = () => {
    reset();
    setRunning(true);
    tickRef.current.last = performance.now();

    const loop = (t) => {
      if (!tickRef.current.last) tickRef.current.last = t;
      const dt = Math.min(0.05, (t - tickRef.current.last) / 1000);
      tickRef.current.last = t;

      // growth curve: faster early, slower later
      setMult((prev) => {
        const next = prev + (0.55 + prev * 0.18) * dt;
        return Math.min(next, 50);
      });

      // crash probability increases with multiplier
      // (lightweight, not "rigged" - just a demo)
      const p = Math.min(0.35, 0.005 + Math.max(0, mult - 1) * 0.012);
      if (Math.random() < p * dt * 10) {
        // crash
        setRunning(false);
        setCrashed(true);
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const cashout = () => {
    if (!running) return;
    setRunning(false);
    setCashoutMult(mult);
    setCrashed(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    const nextBest = Math.max(best, mult);
    setBest(nextBest);
    localStorage.setItem(LS_BEST, String(nextBest.toFixed(4)));
  };

  return (
    <div className="miniGamePage">
      <div className="miniGameHeader">
        <div>
          <div className="miniGamePageTitle">Crash</div>
          <div className="miniGamePageSub">
            Demo (front-only). Cash out before crash. (Backend EP later)
          </div>
        </div>
        <button className="btn secondary" type="button" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="gameCard">
        <div className={`crashScreen ${running ? "isRunning" : ""} ${crashed ? "isCrashed" : ""}`}>
          <div className="crashMult">{formatMult(mult)}</div>
          <div className="crashStatus">
            {running ? "RUNNING..." : crashed ? "CRASHED 💥" : cashoutMult ? `CASHED OUT ✅ (${formatMult(cashoutMult)})` : "READY"}
          </div>
        </div>

        <div className="gameRow">
          <div className="gameStat">
            <div className="gameStatLabel">Best</div>
            <div className="gameStatValue">{best > 0 ? formatMult(best) : "—"}</div>
          </div>
          <div className="gameStat">
            <div className="gameStatLabel">Tip</div>
            <div className="gameStatValue">Early cashout is safer</div>
          </div>
        </div>

        <div className="gameActions">
          {!running ? (
            <button className="btn primary" type="button" onClick={start}>
              Start
            </button>
          ) : (
            <button className="btn primary" type="button" onClick={cashout}>
              Cash Out
            </button>
          )}
          <button className="btn ghost" type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
