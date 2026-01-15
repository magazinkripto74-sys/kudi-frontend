import React, { useEffect, useMemo, useState } from "react"

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4010").replace(/\/$/, "")

const SESSION_KEY = "kudi_session_id"
const BEARER_KEY = "kudi_bearer_token"

function getSessionId() {
  try {
    let s = sessionStorage.getItem(SESSION_KEY)
    if (!s) {
      s = (crypto?.randomUUID ? crypto.randomUUID() : `s_${Math.random().toString(36).slice(2)}_${Date.now()}`)
      sessionStorage.setItem(SESSION_KEY, s)
    }
    return s
  } catch {
    // if sessionStorage blocked, fall back to per-page memory
    if (!window.__kudi_sid) window.__kudi_sid = `s_${Math.random().toString(36).slice(2)}_${Date.now()}`
    return window.__kudi_sid
  }
}

function setSessionId(next) {
  try { sessionStorage.setItem(SESSION_KEY, next) } catch {}
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

async function api(path, { method = "GET", body, _retried } = {}) {
  const headers = { "X-Session-Id": getSessionId() }
  const bearer = localStorage.getItem(BEARER_KEY) || ""
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`
  if (body) headers["Content-Type"] = "application/json"

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await res.text()
  const data = safeJson(txt)

  if (res.status === 409 && (data?.code === "KSR-02" || data?.error === "KSR-02")) {
    const expected = (data?.expectedSessionId || "").toString()
    if (expected && expected !== getSessionId() && !_retried) {
      setSessionId(expected)
      return api(path, { method, body, _retried: true })
    }
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || txt || `HTTP ${res.status}`
    const err = new Error(msg)
    err.data = data
    err.status = res.status
    throw err
  }
  return data ?? {}
}

export default function AvatarStore({ open, onClose, userId, onChanged }) {
  const [catalog, setCatalog] = useState([])
  const [owned, setOwned] = useState([])
  const [ep, setEp] = useState(0)
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setMsg("")
    setLoading(true)

    ;(async () => {
      try {
        const [c, s] = await Promise.all([
          api("/api/avatarstore/catalog"),
          api("/api/avatarstore/state"),
        ])
        setCatalog(Array.isArray(c?.catalog) ? c.catalog : [])
        setOwned(Array.isArray(s?.ownedAvatarIds) ? s.ownedAvatarIds : [])
        setEp(Number(s?.ep ?? 0))
      } catch (e) {
        setMsg(e.message || "Store load failed")
      } finally {
        setLoading(false)
      }
    })()
  }, [open, userId])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const ownedSet = useMemo(() => new Set(owned), [owned])

  const groups = useMemo(() => {
    const by = { KUDI: [], LEGENDARY: [], EPIC: [] }
    for (const a of catalog) by[a.tier]?.push(a)
    return by
  }, [catalog])

  async function buy(a) {
    if (!userId) return
    if (ownedSet.has(a.id)) return

    setMsg("")
    setLoading(true)
    try {
      const r = await api("/api/avatarstore/buy", {
        method: "POST",
        body: { userId, avatarId: a.id },
      })
      const nextOwned = Array.isArray(r?.ownedAvatarIds) ? r.ownedAvatarIds : owned
      const nextEp = Number(r?.ep ?? ep)
      setOwned(nextOwned)
      setEp(nextEp)
      // refresh catalog to update remaining / sold-out state
      try {
        const c2 = await api("/api/avatarstore/catalog")
        setCatalog(Array.isArray(c2?.catalog) ? c2.catalog : catalog)
      } catch {}
      onChanged?.()
    } catch (e) {
      // Insufficient EP returns structured payload: { error:"INSUFFICIENT_EP", needMore }
      if (e?.data?.error === "SOLD_OUT") {
        setMsg("Sold out")
        try {
          const c2 = await api("/api/avatarstore/catalog")
          setCatalog(Array.isArray(c2?.catalog) ? c2.catalog : catalog)
        } catch {}
        return
      }
      const need = Number(e?.data?.needMore ?? 0)
      if (need > 0) setMsg(`Need ${need} EP more`)
      else setMsg(e.message || "Buy failed")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="Avatar Store">
      <div className="modalCard storeModal">
        <div className="modalHead">
          <div>
            <div className="modalTitle">Avatar Store</div>
            <div className="modalSub">Server-backed • EP-only • Limited drops</div>
          </div>

          <div className="storeHeadRight">
            <div className="storeEpPill">
              <span className="muted">Your EP</span>
              <span className="mono">{Number(ep || 0)}</span>
            </div>
            <button className="iconBtn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="storeBody">
          {msg ? <div className="miniGameMsg">{msg}</div> : null}
          {loading && !catalog.length ? <div className="small muted">Loading…</div> : null}

          <Section
            title="KUDI"
            hint="Only 1 • non-transferable"
            items={groups.KUDI}
            ownedSet={ownedSet}
            onBuy={buy}
            ep={ep}
            busy={loading}
          />

          <Section
            title="LEGENDARY"
            hint="Only 4 • first come"
            items={groups.LEGENDARY}
            ownedSet={ownedSet}
            onBuy={buy}
            ep={ep}
            busy={loading}
          />

          <Section
            title="EPIC"
            hint="Only 15 • early grinders"
            items={groups.EPIC}
            ownedSet={ownedSet}
            onBuy={buy}
            ep={ep}
            busy={loading}
          />
        </div>

        <div className="modalFoot">
          <div className="small muted">
            * Purchases are stored server-side per userId. Same avatar can’t be double-bought (idempotent).
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, hint, items, ownedSet, onBuy, ep, busy }) {
  return (
    <div className="storeSection">
      <div className="storeSectionHead">
        <div>
          <div className={`storeTierTitle tier_${title}`}>{title}</div>
          <div className="storeTierHint">{hint}</div>
        </div>
      </div>

      <div className="storeGrid">
        {(items || []).map((a) => {
          const isOwned = ownedSet.has(a.id)
          const remaining = Number(a.remaining ?? (Number(a.maxSupply ?? a.supply ?? 1) - Number(a.soldCount ?? 0)))
          const isSoldOut = !isOwned && Number.isFinite(remaining) && remaining <= 0
          const canBuy = !isOwned && Number(ep || 0) >= Number(a.priceEP || 0)
          const needMore = Math.max(0, Number(a.priceEP || 0) - Number(ep || 0))

          return (
            <div key={a.id} className={`avatarCard tier_${a.tier} ${isOwned ? "isOwned" : ""}`}>
              <div className="avatarMedia">
                <img src={a.img} alt={a.name} loading="lazy" />
              </div>

              <div className="avatarInfo">
                <div className="avatarName">{a.name}</div>
                <div className="avatarMeta">
                  <span className="pill">{a.tier}</span>
                  <span className="pill mono">{a.priceEP} EP</span>
                  {Number.isFinite(remaining) ? (
                    <span className="pill mono">{Math.max(0, remaining)} left</span>
                  ) : null}
                </div>
              </div>

              <div className="avatarActions">
                {isOwned ? (
                  <button className="btn okBtn" disabled>Owned</button>
                ) : isSoldOut ? (
                  <button className="btn ghostBtn" disabled>Sold out</button>
                ) : (
                  <button
                    className={`btn ${canBuy ? "coinBtn" : "ghostBtn"}`}
                    onClick={() => onBuy(a)}
                    disabled={busy || !canBuy}
                    title={!canBuy ? `Need ${needMore} EP more` : "Buy"}
                  >
                    {canBuy ? "Buy" : `Need ${needMore} EP`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
