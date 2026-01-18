import React, { useEffect, useMemo, useState } from 'react'
import './styles/teamReport.casino.css'

function safeJsonParse(s) {
  try { return JSON.parse(s) } catch { return null }
}

export default function TeamReport({ open, onClose, apiBase, bearerToken }) {
  const [mode, setMode] = useState('team') // team | global
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState(null)

  const dateKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const canFetch = Boolean(open && bearerToken)

  async function fetchJson(path) {
    const url = `${(apiBase || '').replace(/\/$/, '')}${path}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })
    const bodyText = await res.text()
    const body = safeJsonParse(bodyText) || { raw: bodyText }
    return { ok: res.ok, status: res.status, body }
  }

  useEffect(() => {
    if (!canFetch) return
    let alive = true

    ;(async () => {
      setLoading(true)
      setErr('')
      setData(null)

      // Try GLOBAL first (master wallets only). If forbidden, fallback to TEAM.
      const globalRes = await fetchJson(`/report/global/daily?date=${encodeURIComponent(dateKey)}`)
      if (!alive) return

      if (globalRes.ok) {
        setMode('global')
        setData(globalRes.body)
        setLoading(false)
        return
      }

      const teamRes = await fetchJson(`/report/team/daily?date=${encodeURIComponent(dateKey)}`)
      if (!alive) return

      if (teamRes.ok) {
        setMode('team')
        setData(teamRes.body)
        setLoading(false)
        return
      }

      setErr(teamRes.body?.error || 'report_fetch_failed')
      setLoading(false)
    })()

    return () => { alive = false }
  }, [canFetch, bearerToken, apiBase, dateKey])

  if (!open) return null

  const kpi = data?.kpi || {}
  const team = data?.team || {}
  const bd = data?.taskBreakdown || {}

  return (
    <div className="kudiReportBg" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="kudiReportModal" onClick={(e) => e.stopPropagation()}>
        <div className="kudiReportTop">
          <div>
            <div className="kudiReportTitle">
              {mode === 'global' ? '📊 Global Report' : '📊 Team Report'}
              <span className="kudiReportPill">{dateKey} • 00:00 UTC reset</span>
            </div>
            <div className="kudiReportSub">
              {mode === 'global'
                ? 'Master wallet view — total game stats.'
                : 'Your network performance (L1 + L2) via referral code.'}
            </div>
          </div>
          <button className="iconBtn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Casino video header */}
        <div className="kudiReportVideoWrap">
          <video
            className="kudiReportVideo"
            src="/media/report.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="kudiReportVideoOverlay" />
          <div className="kudiReportMarquee">
            <div className="kudiReportMarqueeInner">
              <span>🔥 Elite gives 25% direct referral bonus • </span>
              <span>⚡ Daily reset at 00:00 UTC • </span>
              <span>🎁 Invite friends → L1 5% + L2 2% • </span>
              <span>👑 Reach KUDI BABA to unlock perks • </span>
              <span>🦨 KUDI SKUNK — Powered by 4T Ecosystem • </span>
              <span>🔥 Elite gives 25% direct referral bonus • </span>
              <span>⚡ Daily reset at 00:00 UTC • </span>
              <span>🎁 Invite friends → L1 5% + L2 2% • </span>
              <span>👑 Reach KUDI BABA to unlock perks • </span>
              <span>🦨 KUDI SKUNK — Powered by 4T Ecosystem • </span>
            </div>
          </div>
        </div>

        <div className="kudiReportBody">
          {!bearerToken ? (
            <div className="kudiReportEmpty">
              Connect wallet to view your report.
            </div>
          ) : loading ? (
            <div className="kudiReportEmpty">
              Loading report…
            </div>
          ) : err ? (
            <div className="kudiReportEmpty kudiReportError">
              Report error: {String(err)}
            </div>
          ) : (
            <>
              <div className="kudiReportGrid">
                <div className="kudiCard">
                  <div className="kudiCardLabel">Active Today</div>
                  <div className="kudiCardValue">{kpi.activeToday ?? 0}</div>
                </div>
                <div className="kudiCard">
                  <div className="kudiCardLabel">EP Earners</div>
                  <div className="kudiCardValue">{kpi.epEarners ?? 0}</div>
                </div>
                <div className="kudiCard">
                  <div className="kudiCardLabel">Tasks Completed</div>
                  <div className="kudiCardValue">{kpi.tasksCompleted ?? 0}</div>
                </div>
                <div className="kudiCard">
                  <div className="kudiCardLabel">{mode === 'global' ? 'Total EP Awarded' : 'Total Team EP'}</div>
                  <div className="kudiCardValue">{(kpi.totalEpAwarded ?? kpi.totalTeamEp ?? 0)}</div>
                </div>

                {/* L1/L2 only meaningful for team view */}
                {mode === 'team' ? (
                  <>
                    <div className="kudiCard">
                      <div className="kudiCardLabel">L1 Members</div>
                      <div className="kudiCardValue">{team.l1Count ?? 0}</div>
                    </div>
                    <div className="kudiCard">
                      <div className="kudiCardLabel">L2 Members</div>
                      <div className="kudiCardValue">{team.l2Count ?? 0}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="kudiCard">
                      <div className="kudiCardLabel">Tap Count</div>
                      <div className="kudiCardValue">{bd.tap ?? 0}</div>
                    </div>
                    <div className="kudiCard">
                      <div className="kudiCardLabel">Check-in Count</div>
                      <div className="kudiCardValue">{bd.checkin ?? 0}</div>
                    </div>
                  </>
                )}
              </div>

              <div className="kudiReportSplit">
                <div className="kudiPanel">
                  <div className="kudiPanelTitle">Task Breakdown</div>
                  <div className="kudiBreakdown">
                    <div className="kudiBreakRow"><span>Daily Tap</span><b>{bd.tap ?? 0}</b></div>
                    <div className="kudiBreakRow"><span>Daily Check-in</span><b>{bd.checkin ?? 0}</b></div>
                    <div className="kudiBreakRow"><span>Daily Share</span><b>{bd.share ?? 0}</b></div>
                    <div className="kudiBreakRow"><span>KUDI Push</span><b>{bd.kudiPush ?? 0}</b></div>
                    <div className="kudiBreakRow"><span>Mini Challenge</span><b>{bd.miniChallenge ?? 0}</b></div>
                  </div>
                </div>

                <div className="kudiPanel">
                  <div className="kudiPanelTitle">Top Earners</div>
                  <div className="kudiTopList">
                    {(data?.topEarners || []).length ? (data.topEarners).map((u, i) => (
                      <div key={i} className="kudiTopRow">
                        <span className="kudiTopRank">#{i + 1}</span>
                        <span className="kudiTopName">{u.displayName || u.wallet}</span>
                        <b className="kudiTopEp">{u.ep}</b>
                      </div>
                    )) : (
                      <div className="kudiReportEmpty" style={{ padding: 10 }}>No data yet today.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="kudiReportBottom">
                <button className="btn secondary" onClick={onClose}>Close</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
