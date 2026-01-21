import React, { useMemo, useState } from "react";

const LS_LAST = "kudi_mystery_last_utc";
const LS_LAST_REWARD = "kudi_mystery_last_reward";

function utcDayKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MysteryBoxGame({ onBack }) {
  const todayKey = useMemo(() => utcDayKey(), []);
  const lastKey = localStorage.getItem(LS_LAST) || "";
  const already = lastKey === todayKey;

  const [opened, setOpened] = useState(already);
  const [reward, setReward] = useState(() => {
    const v = localStorage.getItem(LS_LAST_REWARD);
    return v ? Number(v) : null;
  });

  const open = () => {
    if (opened) return;
    // Weighted reward 0-8
    const r = Math.random();
    let val = 0;
    if (r < 0.15) val = 0;
    else if (r < 0.30) val = 1;
    else if (r < 0.45) val = 2;
    else if (r < 0.60) val = 3;
    else if (r < 0.72) val = 4;
    else if (r < 0.82) val = 5;
    else if (r < 0.90) val = 6;
    else if (r < 0.96) val = 7;
    else val = 8;

    setReward(val);
    setOpened(true);
    localStorage.setItem(LS_LAST, todayKey);
    localStorage.setItem(LS_LAST_REWARD, String(val));
  };

  const resetLocal = () => {
    localStorage.removeItem(LS_LAST);
    localStorage.removeItem(LS_LAST_REWARD);
    setOpened(false);
    setReward(null);
  };

  return (
    <div className="miniGamePage">
      <div className="miniGameHeader">
        <div>
          <div className="miniGamePageTitle">Mystery Box</div>
          <div className="miniGamePageSub">
            1 open per day (UTC). Reward shown is demo. (Backend EP later)
          </div>
        </div>
        <button className="btn secondary" type="button" onClick={onBack}>
          Back
        </button>
      </div>

      <div className="gameCard">
        <div className="mysteryBox">
          <div className="mysteryTitle">{opened ? "BOX OPENED" : "MYSTERY BOX"}</div>
          <div className="mysteryReward">
            {opened ? (
              <span>
                Reward: <b>{reward ?? 0} EP</b>
              </span>
            ) : (
              <span>Open to reveal your reward</span>
            )}
          </div>
          <div className="mysterySub">Resets at 00:00 UTC</div>
        </div>

        <div className="gameActions">
          <button className="btn primary" type="button" onClick={open} disabled={opened}>
            {opened ? "Done" : "Open"}
          </button>
          <button className="btn ghost" type="button" onClick={resetLocal}>
            Reset (local)
          </button>
        </div>
      </div>
    </div>
  );
}
