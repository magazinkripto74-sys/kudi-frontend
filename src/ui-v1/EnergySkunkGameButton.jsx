// src/ui-v1/EnergySkunkGameButton.jsx
import React from "react";
import "./energyGameBtn.css";

/**
 * EnergySkunkGameButton (SAFE)
 * - Only affects this button.
 * - Keeps existing .btn base styles intact.
 */
export default function EnergySkunkGameButton() {
  return (
    <button className="btn energyGameBtn energyGameBtnSoon" type="button" disabled aria-disabled="true">
      <span className="energyGameBtnMain">ENERGY SKUNK GAME</span>
      <span className="energyGameBtnBadge" aria-hidden="true">COMING SOON</span>
    </button>
  );
}
