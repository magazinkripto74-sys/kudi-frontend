import React, { useMemo, useState } from "react"
import { ENERGY_AVATAR_SERIES, ENERGY_AVATAR_SERIES_GROUPS } from "./energyAvatarSeriesData"
import "./energySkunkAvatarSeries.css"

export default function EnergySkunkAvatarSeriesPage({ onBack }) {
  const [selectedSeries, setSelectedSeries] = useState("all")

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const items = useMemo(() => {
    if (selectedSeries === "all") return ENERGY_AVATAR_SERIES
    return ENERGY_AVATAR_SERIES.filter((x) => x.series === selectedSeries)
  }, [selectedSeries])

  const baba = ENERGY_AVATAR_SERIES.find((x) => x.series === "baba-the-first-energy") || null
  const groups = ENERGY_AVATAR_SERIES_GROUPS.filter((g) => g.key !== "baba-the-first-energy")

  return (
    <div className="energySeriesPage">
      <div className="energySeriesTopbar">
        <button className="btn secondary energySeriesBack" type="button" onClick={onBack}>
          Back
        </button>

        <div className="energySeriesTitleWrap">
          <div className="energySeriesTitle">ENERGY SKUNK AVATAR SERIES</div>
          <div className="energySeriesSub">101 NFTs • visual preview (Buy/Sell coming soon)</div>
        </div>

        <div className="energySeriesFilter">
          <label className="energySeriesFilterLabel">Series</label>
          <select
            className="energySeriesSelect"
            value={selectedSeries}
            onChange={(e) => setSelectedSeries(e.target.value)}
          >
            <option value="all">All</option>
            {ENERGY_AVATAR_SERIES_GROUPS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {baba && (selectedSeries === "all" || selectedSeries === "baba-the-first-energy") && (
        <div className="energySeriesSection">
          <div className="energySeriesSectionHeader">
            <div className="energySeriesSectionTitle">BABA: The First Energy</div>
            <div className="energySeriesSectionMeta">1/1 • Price: {baba.price}</div>
          </div>

          <div className="energySeriesBabaCard">
            <div className="energySeriesBabaMedia">
              <img src={baba.src} alt={baba.id} loading="eager" decoding="async" />
            </div>
            <div className="energySeriesBabaInfo">
              <div className="energySeriesBabaName">{baba.id}</div>
              <div className="energySeriesBabaDesc">
                God-tier collectible. (Visual only for now — marketplace later.)
              </div>
              <div className="energySeriesPriceRow">
                <div className="energySeriesPrice">Price: {baba.price}</div>
                <div className="energySeriesActions">
                  <button className="btn ghost energySeriesAction" type="button" disabled title="Coming soon">
                    BUY
                  </button>
                  <button className="btn ghost energySeriesAction" type="button" disabled title="Coming soon">
                    SELL
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="energySeriesGridSections">
        {groups.map((g) => {
          const groupItems = items.filter((x) => x.series === g.key)
          if (groupItems.length === 0) return null

          return (
            <div className="energySeriesSection" key={g.key}>
              <div className="energySeriesSectionHeader">
                <div className="energySeriesSectionTitle">{g.title}</div>
                <div className="energySeriesSectionMeta">
                  {groupItems.length} items • Price: {g.price}
                </div>
              </div>

              <div className="energySeriesGrid">
                {groupItems.map((it) => (
                  <div className="energySeriesCard" key={it.id}>
                    <div className="energySeriesCardMedia">
                      <img src={it.src} alt={it.id} loading="lazy" decoding="async" onError={(e)=>{e.currentTarget.style.opacity="0.15"; e.currentTarget.style.filter="grayscale(1)";}} />
                    </div>
                    <div className="energySeriesCardInfo">
                      <div className="energySeriesCardName">{it.id}</div>
                      <div className="energySeriesCardPrice">{it.price}</div>
                      <div className="energySeriesCardActions">
                        <button className="btn ghost energySeriesActionSm" type="button" disabled title="Coming soon">
                          BUY
                        </button>
                        <button className="btn ghost energySeriesActionSm" type="button" disabled title="Coming soon">
                          SELL
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {groupItems.length % 4 !== 0 && (
                  <div
                    className="energySeriesScrollTopPanel"
                    style={{ gridColumn: `${(groupItems.length % 4) + 1} / 5` }}
                  >
                    <button className="btn ghost energySeriesScrollTopBtn" type="button" onClick={scrollToTop}>
                      ↑ Back to Top
                    </button>
                  </div>
                )}

              </div>
            </div>
          )
        })}
      </div>

      <div className="energySeriesFooterNote">
        Note: This page is <b>visual-only</b> for now. We’ll connect real buy/sell + on-chain metadata later.
      </div>
    </div>
  )
}