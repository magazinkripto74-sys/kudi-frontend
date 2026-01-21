import React, { useEffect, useRef, useState } from "react";

const LS_BEST = "kudi_reaction_best_ms";

export default function ReactionTestGame({ onBack }) {
  const [phase, setPhase] = useState("idle"); // idle | waiting | now | done | false
  const [message, setMessage] = useState("Press Start");
  const [ms, setMs] = useState(null);
  const [best, setBest] = useState(() => Number(localStorage.getItem(LS_BEST) || "0") || 0);

  const timerRef = useRef(null);
  const startAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPhase("idle");
    setMessage("Press Start");
    setMs(null);
  };

  const start = () => {
    reset();
    setPhase("waiting");
    setMessage("WAIT...");
    const delay = 800 + Math.random() * 2600; // 0.8s - 3.4s
    timerRef.current = setTimeout(() => {
      startAtRef.current = performance.now();
      setPhase("now");
      setMessage("NOW!");
    }, delay);
  };

  const click = () => {
    if (phase === "waiting") {
      // false start
      setPhase("false");
      setMessage("Too early ❌");
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    if (phase === "now") {
      const t = performance.now() - startAtRef.current;
      setMs(Math.round(t));
      setPhase("done");
      setMessage("Nice ✅");

      const next = best === 0 ? t : Math.min(best, t);
      setBest(next);
      localStorage.setItem(LS_BEST, String(Math.round(next)));
      return;
    }
    if (phase === "done" || phase === "false") {
      start();
    }
  };

  return (
    <div className="miniGamePage">
      <div className="miniGameHeader">
        <div>
          <div className="miniGamePageTitle">Reaction Test</div>
          <div className="miniGamePageSub">Wait for NOW, then tap fast. (Front-only)</div>
        </div>
        <button className="btn secondary" type="button" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="gameCard">
        <button className={`reactionPad ${phase}`} type="button" onClick={click}>
          <div className="reactionMsg">{message}</div>
          <div className="reactionMs">{ms != null ? `${ms} ms` : ""}</div>
          <div className="reactionHint">
            {phase === "idle" ? "Tap to Start" : phase === "waiting" ? "Don't tap yet" : phase === "now" ? "TAP!" : "Tap to retry"}
          </div>
        </button>

        <div className="gameRow">
          <div className="gameStat">
            <div className="gameStatLabel">Best</div>
            <div className="gameStatValue">{best ? `${Math.round(best)} ms` : "—"}</div>
          </div>
          <div className="gameStat">
            <div className="gameStatLabel">Last</div>
            <div className="gameStatValue">{ms != null ? `${ms} ms` : "—"}</div>
          </div>
          <div className="gameStat">
            <div className="gameStatLabel">Tip</div>
            <div className="gameStatValue">Try under 250ms</div>
          </div>
        </div>

        <div className="gameActions">
          <button className="btn primary" type="button" onClick={start}>
            Start
          </button>
          <button className="btn ghost" type="button" onClick={reset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
