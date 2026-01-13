import React, { useEffect, useMemo, useState } from 'react'
import bs58 from 'bs58'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import AvatarStore from './AvatarStore'
import "./styles/avatarstore.glass.css"

import { UI_V1_ENABLED } from './config/features'
import UiV1Root from './ui-v1/UiV1Root'

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

// Defaults can be overridden via .env (VITE_*)
const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://mainnet.helius-rpc.com/?api-key=72788d24-e519-4c50-a8c1-a2a6eff43187'
const USDC_MINT = import.meta.env.VITE_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET || 'BAozCCttGU7SVvpSdGzqoTrdEK3jrp3gU1nF6h8GfykR'
const USDC_DECIMALS = 6

const SESSION_KEY = 'kudi_session_id'
const REF_KEY = 'kudi_referral_code'

function fmt(n, digits = 2) {
  const x = Number(n || 0)
  return x.toLocaleString(undefined, { maximumFractionDigits: digits })
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n))
}

function getStoredSession() {
  try { return localStorage.getItem(SESSION_KEY) || '' } catch { return '' }
}

function setStoredSession(v) {
  try { localStorage.setItem(SESSION_KEY, v) } catch {}
}

function getStoredRef() {
  try { return localStorage.getItem(REF_KEY) || '' } catch { return '' }
}

function setStoredRef(v) {
  try { localStorage.setItem(REF_KEY, v) } catch {}
}

async function api(path, opts = {}) {
  const url = `${API_BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const r = await fetch(url, { ...opts, headers })
  const ct = r.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await r.json().catch(() => ({})) : await r.text().catch(() => '')
  if (!r.ok) {
    const msg = (data && data.error) ? data.error : (typeof data === 'string' ? data : 'Request failed')
    const e = new Error(msg)
    e.status = r.status
    e.data = data
    throw e
  }
  return data
}

async function ensureSession() {
  let sid = getStoredSession()
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setStoredSession(sid)
  }
  return sid
}

function nowUTCDateKey() {
  const d = new Date()
  // daily reset assumed 00:00 UTC
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function parseReferralFromUrl() {
  try {
    const u = new URL(window.location.href)
    const ref = u.searchParams.get('ref') || ''
    if (ref && /^REF-[A-Z0-9]{5,}$/.test(ref)) {
      setStoredRef(ref)
    }
  } catch {}
}

export default function App() {
  const [wallet, setWallet] = useState(null)
  const [walletPubkey, setWalletPubkey] = useState('')
  const [status, setStatus] = useState('')
  const [err, setErr] = useState('')
  const [connected, setConnected] = useState(false)
  const [mode, setMode] = useState('dashboard') // dashboard | store | withdraw | etc
  const [loading, setLoading] = useState(false)

  // User/Stats
  const [summary, setSummary] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderLoading, setLeaderLoading] = useState(false)

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawTo, setWithdrawTo] = useState('')
  const [withdrawBusy, setWithdrawBusy] = useState(false)

  // Nickname
  const [nickname, setNickname] = useState('')
  const [nickEditing, setNickEditing] = useState(false)

  const connection = useMemo(() => new Connection(SOLANA_RPC, 'confirmed'), [])

  useEffect(() => {
    parseReferralFromUrl()
  }, [])

  useEffect(() => {
    const w = window?.solana
    setWallet(w || null)

    if (w?.isPhantom) {
      w.connect({ onlyIfTrusted: true }).then(({ publicKey }) => {
        setConnected(true)
        const pk = publicKey?.toString?.() || ''
        setWalletPubkey(pk)
      }).catch(() => {})
    }
  }, [])

  async function loadSummary(pk) {
    if (!API_BASE) return
    try {
      const sid = await ensureSession()
      const data = await api('/me/summary', {
        method: 'POST',
        body: JSON.stringify({ wallet: pk }),
        headers: { 'x-session-id': sid }
      })
      setSummary(data || null)
      if (data?.nickname) setNickname(data.nickname)
    } catch (e) {
      // Keep UI stable: don't crash
    }
  }

  async function loadLeaderboard() {
    if (!API_BASE) return
    setLeaderLoading(true)
    try {
      const sid = await ensureSession()
      const data = await api('/leaderboard', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'x-session-id': sid }
      })
      setLeaderboard(Array.isArray(data?.rows) ? data.rows : (Array.isArray(data) ? data : []))
    } catch (e) {
      // ignore
    } finally {
      setLeaderLoading(false)
    }
  }

  useEffect(() => {
    if (!connected || !walletPubkey) return
    loadSummary(walletPubkey)
    loadLeaderboard()
    const t = setInterval(() => loadLeaderboard(), 30_000)
    return () => clearInterval(t)
  }, [connected, walletPubkey])

  async function connectWallet() {
    setErr('')
    setStatus('')
    if (!wallet) {
      setErr('No wallet detected.')
      return
    }
    try {
      setLoading(true)
      const res = await wallet.connect()
      const pk = res?.publicKey?.toString?.() || ''
      setConnected(true)
      setWalletPubkey(pk)
      setStatus('Wallet connected.')
      // Optional referral attach could happen later in your flow
    } catch (e) {
      setErr(e?.message || 'Wallet connect failed.')
    } finally {
      setLoading(false)
    }
  }

  async function disconnectWallet() {
    setErr('')
    setStatus('')
    try {
      await wallet?.disconnect?.()
    } catch {}
    setConnected(false)
    setWalletPubkey('')
    setSummary(null)
  }

  async function sendWithdraw() {
    setErr('')
    setStatus('')
    if (!connected || !walletPubkey) return setErr('Connect wallet first.')
    const amt = Number(withdrawAmount)
    if (!amt || amt <= 0) return setErr('Enter amount.')
    if (!withdrawTo) return setErr('Enter destination address.')
    try {
      setWithdrawBusy(true)
      const sid = await ensureSession()
      const data = await api('/withdraw/request', {
        method: 'POST',
        body: JSON.stringify({ wallet: walletPubkey, amount: amt, to: withdrawTo }),
        headers: { 'x-session-id': sid }
      })
      setStatus(data?.ok ? 'Withdraw requested.' : 'Request submitted.')
      await loadSummary(walletPubkey)
    } catch (e) {
      setErr(e?.message || 'Withdraw failed.')
    } finally {
      setWithdrawBusy(false)
    }
  }

  const ep = summary?.ep ?? 0
  const usdc = summary?.usdc ?? 0
  const tier = summary?.tier || ''
  const nextTarget = summary?.nextTarget || null
  const progress = summary?.progress || 0
  const remaining = nextTarget ? Math.max(0, nextTarget - ep) : 0

  return UI_V1_ENABLED ? (<UiV1Root />) : (
    <div className="container">
      <div className="topbar">
        <div className="brand">KUDI SKUNK</div>

        <div className="topActions">
          {!connected ? (
            <button className="btn" disabled={loading} onClick={connectWallet}>
              {loading ? 'Connecting…' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="walletBox">
              <div className="walletAddr">{walletPubkey.slice(0, 4)}…{walletPubkey.slice(-4)}</div>
              <button className="btn ghost" onClick={disconnectWallet}>Disconnect</button>
            </div>
          )}
        </div>
      </div>

      {!!status && <div className="toast ok">{status}</div>}
      {!!err && <div className="toast err">{err}</div>}

      <div className="tabs">
        <button className={mode === 'dashboard' ? 'tab active' : 'tab'} onClick={() => setMode('dashboard')}>Dashboard</button>
        <button className={mode === 'store' ? 'tab active' : 'tab'} onClick={() => setMode('store')}>Avatar Store</button>
        <button className={mode === 'withdraw' ? 'tab active' : 'tab'} onClick={() => setMode('withdraw')}>Withdraw</button>
      </div>

      {mode === 'store' ? (
        <AvatarStore
          walletPubkey={walletPubkey}
          connected={connected}
          apiBase={API_BASE}
          onNeedConnect={connectWallet}
        />
      ) : mode === 'withdraw' ? (
        <div className="card">
          <div className="title">Withdraw</div>
          <div className="row">
            <div className="field">
              <div className="label">Amount (USDC)</div>
              <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="10" />
            </div>
            <div className="field">
              <div className="label">To address</div>
              <input value={withdrawTo} onChange={(e) => setWithdrawTo(e.target.value)} placeholder="Solana address" />
            </div>
          </div>

          <button className="btn" disabled={!connected || withdrawBusy} onClick={sendWithdraw}>
            {withdrawBusy ? 'Sending…' : 'Request Withdraw'}
          </button>

          <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
            Rules: min/max limits apply.
          </div>
        </div>
      ) : (
        <>
          <div className="grid">
            <div className="card">
              <div className="title">My Summary</div>
              <div className="kpis">
                <div className="kpi">
                  <div className="kpiLabel">EP</div>
                  <div className="kpiValue">{fmt(ep, 0)}</div>
                </div>
                <div className="kpi">
                  <div className="kpiLabel">USDC</div>
                  <div className="kpiValue">{fmt(usdc, 2)}</div>
                </div>
                <div className="kpi">
                  <div className="kpiLabel">Tier</div>
                  <div className="kpiValue">{tier || '-'}</div>
                </div>
              </div>

              {!!nextTarget && (
                <div className="progressBox">
                  <div className="progressTop">
                    <div>Next target: {fmt(nextTarget, 0)} EP</div>
                    <div>Remaining: {fmt(remaining, 0)} EP</div>
                  </div>
                  <div className="progressBar">
                    <div className="progressFill" style={{ width: `${clamp(progress, 0, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="title">Leaderboard</div>
              <div className="leaderSub">{leaderLoading ? 'Loading…' : (leaderboard?.length ? `Top ${leaderboard.length}` : '—')}</div>
              <div className="leaderList">
                {(leaderboard || []).slice(0, 10).map((row, i) => (
                  <div className="leaderRow" key={row.wallet || i}>
                    <div className="leaderRank">{i + 1}</div>
                    <div className="leaderAddr">{String(row.wallet || '').slice(0, 4)}…{String(row.wallet || '').slice(-4)}</div>
                    <div className="leaderVal">{fmt(row.ep ?? row.score ?? 0, 0)}</div>
                  </div>
                ))}
              </div>
              <button className="btn ghost" onClick={() => loadLeaderboard()}>Refresh</button>
            </div>
          </div>

          <div className="card">
            <div className="title">Nickname</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Enter nickname" disabled={!connected} />
              <button className="btn ghost" disabled={!connected} onClick={() => setNickEditing(!nickEditing)}>
                {nickEditing ? 'Done' : 'Edit'}
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
              Your nickname appears on leaderboard.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
