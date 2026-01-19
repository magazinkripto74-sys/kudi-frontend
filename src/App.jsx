import React, { useEffect, useMemo, useState } from 'react'
import bs58 from 'bs58'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import AvatarStore from './AvatarStore'
import TeamReport from './TeamReport'
import "./styles/avatarstore.glass.css"
import { UI_V1_ENABLED } from './config/features'
import UiV1Root from './ui-v1/UiV1Root'
import './ui-v1/energyGameBtn.css'
import MobileHamburgerMenu from './ui-v1/MobileHamburgerMenu'
import './ui-v1/mobileHamburgerMenu.css'
import SocialLinks from './ui-v1/SocialLinks'
import './ui-v1/socialLinks.css'
import LeaderboardTicker from './ui-v1/LeaderboardTicker'
import './ui-v1/leaderboardTicker.css'

import AquariumBanner from './ui-v1/AquariumBanner'
import './ui-v1/aquariumBanner.css'



import VideoBox from './ui-v1/VideoBox'
import './ui-v1/videoBox.css'
import SlotMachine from './SlotMachine'
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')


// Defaults can be overridden via .env (VITE_*)
const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://mainnet.helius-rpc.com/?api-key=72788d24-e519-4c50-a8c1-a2a6eff43187'
const USDC_MINT = import.meta.env.VITE_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET || 'BAozCCttGU7SVvpSdGzqoTrdEK3jrp3gU1nF6h8GfykR'
const USDC_DECIMALS = 6

const SESSION_KEY = 'kudi_session_id'
const BEARER_KEY = 'kudi_bearer_token'
const WALLET_KEY = 'kudi_wallet'

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

function uid() {
  // short, readable id
  const s = Math.random().toString(36).slice(2, 10)
  const t = Date.now().toString(36).slice(-4)
  return `u_${s}${t}`
}

function safeJson(text) {
  try { return JSON.parse(text) } catch { return null }
}

function getBearer() {
  try { return localStorage.getItem(BEARER_KEY) || '' } catch { return '' }
}

async function api(path, { method = 'GET', body, _retried } = {}) {
  const headers = { 'X-Session-Id': getSessionId() }
  const bearer = getBearer()
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const txt = await res.text()
  const data = safeJson(txt)

  // KSR-02: if server replies 409 with expectedSessionId, switch + retry once.
  // (Server is the single source of truth for the active session per userId.)
  if (res.status === 409 && data?.expectedSessionId && !_retried) {
    const expected = String(data.expectedSessionId || '')
    if (expected && expected !== getSessionId()) setSessionId(expected)
    if (expected) return api(path, { method, body, _retried: true })
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || txt || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data ?? {}
}


function mapReferralError(code) {
  const c = String(code || '').trim()
  if (!c) return 'Something went wrong.'
  if (c === 'invalid_refCode') return 'Invalid referral code.'
  if (c === 'self_referral_not_allowed') return 'You cannot use your own referral code.'
  if (c === 'missing_refCode') return 'Please enter a referral code.'
  if (c === 'invalid_token') return 'Session expired. Please reconnect your wallet.'
  if (c === 'already_attached' || c === 'alreadyAttached') return 'ℹ️ Referral already attached.'
  // Fallback: show raw code (developer-friendly)
  return `Referral error: ${c}`
}


function mapCashoutError(code) {
  const c = String(code || '').trim()
  if (!c) return 'Something went wrong.'
  if (c === 'missing_amount') return 'Enter an amount.'
  if (c === 'invalid_amount') return 'Invalid amount.'
  if (c === 'min_withdraw_10') return 'Minimum withdrawal is 10.'
  if (c === 'max_withdraw_500') return 'Maximum per withdrawal is 500.'
  if (c === 'daily_cap_reached' || c === 'daily_limit_reached') return 'Daily limit reached (max 500).'
  if (c === 'insufficient_cash') return 'Insufficient Career Cash Earned.'
  if (c === 'invalid_token') return 'Session expired. Please reconnect wallet.'
  if (c === 'transfer_failed') return 'Transfer failed. Try again.'
  return c
}
function mapNicknameError(code) {
  const c = String(code || '').trim()
  if (!c) return 'Something went wrong.'
  if (c === 'missing_nickname') return 'Enter a nickname.'
  if (c === 'nickname_too_short') return 'Nickname must be at least 3 characters.'
  if (c === 'nickname_too_long') return 'Nickname must be at most 15 characters.'
  if (c === 'invalid_token') return 'Session expired. Please reconnect wallet.'
  return `Nickname error: ${c}`
}



function moneyUsdc(n) {
  const num = Number(n || 0)
  const fixed = (Math.round(num * 100) / 100).toFixed(2)
  return `${fixed} USDC`
}

function copyToClipboard(value) {
  return navigator.clipboard?.writeText(value)
}
function sanitizeNickname(raw) {
  const s = String(raw || '').trim().replace(/^@+/, '')
  const cleaned = s.replace(/[^a-zA-Z0-9_]/g, '')
  return cleaned.slice(0, 15)
}




// === BUY 4T COIN (LOCKED URLs) ===
const PUMP_FUN_URL =
  'https://pump.fun/coin/35bdtoPTGxnzbVnWuyVpRRkcNgjwhKYE9oUk4Pdfpump'
const MEXC_DEX_URL =
  'https://www.mexc.com/en-TR/dex/trade?pair_ca=nWYzBvfMqUmqXD7DDHpNskHuboPLbf4GDFcXJSnTHqV&chain_id=100000&token_ca=35bdtoPTGxnzbVnWuyVpRRkcNgjwhKYE9oUk4Pdfpump&base_token_ca=So11111111111111111111111111111111111111112'

function openExternal(url) {
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    window.location.href = url
  }
}

// === TRUST LINKS (OFFICIAL) ===
const TRUST_LINKS = {
  x: 'https://x.com/4tfourt2025',
  instagram: 'https://www.instagram.com/fourt4t2025',
  telegram: 'https://t.me/+Zs5LyuF88AViMzI0',
  web: 'https://fourt4t.com',
  mail: 'mailto:4tfourt2025@gmail.com',
}


export default function App() {
  
  const [menuOpen, setMenuOpen] = useState(false)
const [wallet, setWallet] = useState('')
  const [bearerToken, setBearerToken] = useState('')
  const [pendingLogin, setPendingLogin] = useState(null) // { wallet, token, message }
  const [termsOk, setTermsOk] = useState(false)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [referralLocked, setReferralLocked] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState('PRO')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [summary, setSummary] = useState(null)
  // Nickname (server-backed, fixed-slot UI)
  const [nickDraft, setNickDraft] = useState('')
  const [nickEditing, setNickEditing] = useState(false)
  const [nickSaving, setNickSaving] = useState(false)
  const [nickMsg, setNickMsg] = useState('')
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [cashoutLoading, setCashoutLoading] = useState(false)
  const [cashoutMsg, setCashoutMsg] = useState('')
  const [dailyTapMsg, setDailyTapMsg] = useState('')
  const [dailyTapLoading, setDailyTapLoading] = useState(false)
  const [checkinMsg, setCheckinMsg] = useState('')
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [kudiPushMsg, setKudiPushMsg] = useState('')
  const [kudiPushLoading, setKudiPushLoading] = useState(false)
  const [miniMsg, setMiniMsg] = useState('')
  const [miniLoading, setMiniLoading] = useState(false)


  // Leaderboard (server-backed, UTC daily reset)
  const [leaderMode, setLeaderMode] = useState('today') // 'today' | 'alltime'
  const [leaderLoading, setLeaderLoading] = useState(false)
  const [leaderErr, setLeaderErr] = useState('')
  const [leaderTop3, setLeaderTop3] = useState([]) // [{rank,wallet,name,score,isChampion}]
  const [leaderMeta, setLeaderMeta] = useState({ dayKey: '', resetAtUtc: '', dailyChampion: null })

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const claimedToday = (summary?.dailyTapLast || '') === todayKey
  const checkinDoneToday = (summary?.dailyCheckinLast || '') === todayKey
  const kudiPushDoneToday = (summary?.dailyKudiPushLast || '') === todayKey
  const miniDoneToday = (summary?.dailyMiniChallengeLast || '') === todayKey


  const [isBuyCoinOpen, setIsBuyCoinOpen] = useState(false)
  const [isAvatarStoreOpen, setIsAvatarStoreOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)

  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)
  const [isWhitepaperOpen, setIsWhitepaperOpen] = useState(false)
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false)


  // Initial load: restore wallet/token, remember referral code (from URL or storage).
  useEffect(() => {
    try {
      const savedWallet = localStorage.getItem(WALLET_KEY) || ''
      const savedBearer = localStorage.getItem(BEARER_KEY) || ''
      if (savedWallet) setWallet(savedWallet)
      if (savedBearer) setBearerToken(savedBearer)
    } catch {}

    const storedRef = (localStorage.getItem('kudi_referralCode') || '').trim()
    const url = new URL(window.location.href)
    const refFromUrl = (url.searchParams.get('ref') || '').trim()
    const finalRef = refFromUrl || storedRef
    if (finalRef) {
      setReferralCode(finalRef)
      try { localStorage.setItem('kudi_referralCode', finalRef) } catch {}
    }
  }, [])

  // Lock referral input per-wallet after successful attach/save
  useEffect(() => {
    try {
      if (!wallet) { setReferralLocked(false); return }
      const key = `kudi_referralLocked_${wallet}`
      const locked = localStorage.getItem(key) === '1'
      setReferralLocked(locked)
    } catch {
      // ignore
    }
  }, [wallet])

  // One-time social follow tasks (gate before other tasks)
  const [followDone, setFollowDone] = useState({ x: false, telegram: false, instagram: false })
  const [followAllDone, setFollowAllDone] = useState(false)


  const hasNickname = !!(summary?.nickname && String(summary.nickname).trim())
  const isDailyChampion = !!(summary?.dailyChampionUntil && Date.parse(String(summary.dailyChampionUntil)) > Date.now())
  const canShare = followAllDone && hasNickname

  // Leaderboard derived (render-safe)
  const lb1 = leaderTop3.find(r => r.rank === 1) || null
  const lb2 = leaderTop3.find(r => r.rank === 2) || null
  const lb3 = leaderTop3.find(r => r.rank === 3) || null
  const lbLabel = leaderMode === 'alltime' ? 'All-time' : 'Today'
const inviteLink = useMemo(() => {
    const code = summary?.refCode || summary?.myReferralCode
    if (!code) return ''
    return `${window.location.origin}/?ref=${encodeURIComponent(code)}`
  }, [summary?.refCode, summary?.myReferralCode])


const makeSharePayload = () => {
  const url = inviteLink || TRUST_LINKS.web || window.location.origin
  const text = `KUDI SKUNK — join my lobby. Use my invite link: ${url}`
  return { url, text }
}

const openShare = (url) => {
  try {
    // Mobile browsers may block popups; fall back to same-tab navigation.
    const w = window.open(url, '_blank')
    if (!w) window.location.assign(url)
    else w.opener = null
  } catch {
    window.location.assign(url)
  }
}

const shareX = () => {
  const { url, text } = makeSharePayload()
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  openShare(intent)
}

const shareTelegram = () => {
  const { url, text } = makeSharePayload()
  const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  openShare(tg)
}

const shareWhatsApp = () => {
  const { url, text } = makeSharePayload()
  const wa = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
  openShare(wa)
}

  useEffect(() => {
    const storedRef = localStorage.getItem('kudi_referralCode') || ''
    const url = new URL(window.location.href)
    const refFromUrl = url.searchParams.get('ref') || ''
    const finalRef = refFromUrl || storedRef
    setReferralCode(finalRef)
    if (finalRef) localStorage.setItem('kudi_referralCode', finalRef)

    // keep URL clean
    if (refFromUrl) {
      url.searchParams.delete('ref')
      window.history.replaceState({}, '', url.toString())
    }

    // restore auth if present
    const savedWallet = localStorage.getItem(WALLET_KEY) || ''
    const savedBearer = getBearer()
    if (savedWallet) setWallet(savedWallet)
    if (savedBearer) setBearerToken(savedBearer)

    // one-time follow tasks
    const savedFollow = safeJson(localStorage.getItem('kudi_follow_tasks_done') || '') || null
    if (savedFollow && typeof savedFollow === 'object') {
      const next = { x: !!savedFollow.x, telegram: !!savedFollow.telegram, instagram: !!savedFollow.instagram }
      setFollowDone(next)
      setFollowAllDone(!!(next.x && next.telegram && next.instagram))
    }

    // ensure a session exists before any API call
    getSessionId()
  }, [])


  

  useEffect(() => {
    if (!isAvatarStoreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isAvatarStoreOpen])
  useEffect(() => {
    if (!bearerToken) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bearerToken])

  // Leaderboard: load on mode change + periodic refresh (today only)
  useEffect(() => {
    loadLeaderboard(leaderMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderMode])

  useEffect(() => {
    if (leaderMode !== 'today') return
    const t = setInterval(() => {
      loadLeaderboard('today')
    }, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderMode])


  async function refresh() {
    try {
      const r = await api('/me/summary')
      setSummary(r || null)
    } catch (e) {
      setToast(`Summary error: ${e.message}`)
    }
  }

  async function refreshSummary() {
    await refresh()
  }  

  async function loadLeaderboard(mode = leaderMode) {
    const m = mode === 'alltime' ? 'alltime' : 'today'
    setLeaderLoading(true)
    setLeaderErr('')
    try {
      const r = await api(`/leaderboard?mode=${encodeURIComponent(m)}`)
      const top3 = Array.isArray(r?.top3) ? r.top3 : []
      setLeaderTop3(top3)
      setLeaderMeta({ dayKey: r?.dayKey || '', resetAtUtc: r?.resetAtUtc || '', dailyChampion: r?.dailyChampion || null })
    } catch (e) {
      setLeaderErr(e?.message || 'leaderboard_failed')
      setLeaderTop3([])
    } finally {
      setLeaderLoading(false)
    }
  }

// Keep nickname draft in sync with server summary (unless actively editing)
  useEffect(() => {
    const current = (summary?.nickname || '').trim()
    if (nickEditing) return
    setNickDraft(current)
    setNickMsg('')
  }, [summary?.nickname])




  async function startConnect() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    setToast('')
    setTermsOk(false)
    try {
      const sol = window?.solana
      if (!sol || !sol.isPhantom) {
        // Mobile browsers won't have window.solana. Open the dApp inside Phantom.
        if (isMobile) {
          const here = window.location.href
          window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(here)}`
          return
        }
        setToast('Phantom wallet not found. Please install Phantom and refresh.')
        return
      }

      // Ask Phantom to connect (user approves).
      const resp = await sol.connect()
      const w = (resp?.publicKey?.toString?.() || sol.publicKey?.toString?.() || '').trim()
      if (!w) {
        setToast('Wallet connect failed.')
        return
      }

      // Get server nonce + message
      const nonceRes = await api(`/auth/nonce?wallet=${encodeURIComponent(w)}`)
      const token = nonceRes?.token
      const message = nonceRes?.message
      if (!token || !message) {
        setToast('Auth nonce failed.')
        return
      }
      setPendingLogin({ wallet: w, token, message })
      setIsConnectOpen(true)
    } catch (e) {
      setToast(e?.message || 'Wallet connect failed')
    }
  }

  async function signAndConnect() {
    if (!pendingLogin?.wallet || !pendingLogin?.token || !pendingLogin?.message) return
    if (!termsOk) {
      setToast('Please read and accept the Terms to continue.')
      return
    }
    setLoading(true)
    setToast('')
    try {
      const sol = window?.solana
      if (!sol?.signMessage) {
        setToast('Phantom signMessage is not available.')
        return
      }
      const msgBytes = new TextEncoder().encode(pendingLogin.message)
      const signed = await sol.signMessage(msgBytes, 'utf8')
      const sigBytes = signed?.signature
      if (!sigBytes) {
        setToast('Signature rejected.')
        return
      }
      const signature58 = bs58.encode(sigBytes)

      const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': getSessionId() },
        body: JSON.stringify({ token: pendingLogin.token, signature: signature58 }),
      })
      const txt = await verifyRes.text()
      const data = safeJson(txt)
      if (!verifyRes.ok) {
        throw new Error(data?.error || data?.message || txt || `HTTP ${verifyRes.status}`)
      }

      const bearer = data?.bearerToken || pendingLogin.token
      setWallet(pendingLogin.wallet)
      setBearerToken(bearer)
      try {
        localStorage.setItem(WALLET_KEY, pendingLogin.wallet)
        localStorage.setItem(BEARER_KEY, bearer)
      } catch {}

      setIsConnectOpen(false)
      setPendingLogin(null)

      // Referral attach (safe + visible)
      if (referralCode) {
        try {
          const r = await api('/referral/attach', { method: 'POST', body: { refCode: referralCode } })
          if (r?.alreadyAttached) setToast('ℹ️ Referral already attached.')
          else setToast('✅ Referral attached.')
        } catch (e) {
          setToast(mapReferralError(e.message))
        }
      }
      await refresh()
      // Do not overwrite referral result toast.
      if (!referralCode) setToast('✅ Wallet connected.')
    } catch (e) {
      setToast(e?.message || 'Auth failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDailyTap() {
    if (!bearerToken) return
    setDailyTapLoading(true)
    setDailyTapMsg('')
    try {
      const r = await api('/daily/tap', { method: 'POST' })
      if (r?.ok) {
        setToast('✅ +25 EP added!')
        await refreshSummary()
      } else {
        setDailyTapMsg(r?.error || 'daily_tap_failed')
      }
    } catch (e) {
      setDailyTapMsg(e?.message || 'daily_tap_failed')
    } finally {
      setDailyTapLoading(false)
    }
  }


  
  async function handleDailyCheckin() {
    if (!bearerToken) return
    setCheckinLoading(true)
    setCheckinMsg('')
    try {
      const r = await api('/daily/checkin', { method: 'POST' })
      if (r?.ok) {
        setToast('✅ +15 EP added!')
        await refreshSummary()
      } else {
        const msg = r?.message || r?.error || 'daily_checkin_failed'
        setCheckinMsg(msg)
        if (msg) setToast(msg)
      }
    } catch (e) {
      setCheckinMsg(e?.message || 'daily_checkin_failed')
    } finally {
      setCheckinLoading(false)
    }
  }

  async function handleKudiPush() {
    if (!bearerToken) return
    setKudiPushLoading(true)
    setKudiPushMsg('')
    try {
      const r = await api('/daily/kudi-push', { method: 'POST' })
      if (r?.ok) {
        setToast('✅ +20 EP added!')
        await refreshSummary()
      } else {
        const msg = r?.message || r?.error || 'kudi_push_failed'
        setKudiPushMsg(msg)
        if (msg) setToast(msg)
      }
    } catch (e) {
      setKudiPushMsg(e?.message || 'kudi_push_failed')
    } finally {
      setKudiPushLoading(false)
    }
  }

  async function handleMiniChallenge() {
    if (!bearerToken) return
    setMiniLoading(true)
    setMiniMsg('')
    try {
      const r = await api('/daily/mini-challenge', { method: 'POST' })
      if (r?.ok) {
        setToast('✅ +20 EP added!')
        await refreshSummary()
      } else {
        const msg = r?.message || r?.error || 'mini_challenge_failed'
        setMiniMsg(msg)
        if (msg) setToast(msg)
      }
    } catch (e) {
      setMiniMsg(e?.message || 'mini_challenge_failed')
    } finally {
      setMiniLoading(false)
    }
  }

async function handleBuy() {
    if (!bearerToken) return
    const provider = window?.solana
    if (!provider?.isPhantom) {
      setToast('Phantom not detected.')
      return
    }

    const amountUsdc = selectedPackage === 'STARTER' ? 5 : selectedPackage === 'PRO' ? 50 : 100

    setLoading(true)
    try {
      // 1) Build USDC transfer tx (user -> treasury)
      const connection = new Connection(SOLANA_RPC, 'confirmed')
      const mint = new PublicKey(USDC_MINT)
      const fromOwner = new PublicKey(wallet)
      const toOwner = new PublicKey(TREASURY_WALLET)

      const fromAta = await getAssociatedTokenAddress(mint, fromOwner)
      const toAta = await getAssociatedTokenAddress(mint, toOwner)

      const tx = new Transaction()

      // Ensure treasury ATA exists (first time only)
      const toInfo = await connection.getAccountInfo(toAta)
      if (!toInfo) {
        tx.add(createAssociatedTokenAccountInstruction(fromOwner, toAta, toOwner, mint))
      }

      const ix = createTransferCheckedInstruction(
        fromAta,
        mint,
        toAta,
        fromOwner,
        BigInt(Math.round(amountUsdc * 10 ** USDC_DECIMALS)),
        USDC_DECIMALS
      )

      tx.add(ix)
      tx.feePayer = fromOwner
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      tx.recentBlockhash = blockhash

      const sent = await provider.signAndSendTransaction(tx)
      const txSig = sent?.signature
      if (!txSig) throw new Error('tx_signature_missing')

      // Wait for confirmation
      await connection.confirmTransaction({ signature: txSig, blockhash, lastValidBlockHeight }, 'confirmed')

      // 2) Tell backend to verify tx + credit ledger / referrals
      const verify = await api('/purchase/verify', {
        method: 'POST',
        body: { packageId: selectedPackage, signature: txSig }
      })

      if (!verify?.ok) {
        setToast(`Verify failed: ${verify?.error || 'unknown'}`)
        return
      }

      setToast('✅ Package activated!')
      await refreshSummary()
    } catch (e) {
      setToast(e?.message || 'purchase_failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveRef() {
    const code = (referralCode || '').trim()
    try { localStorage.setItem('kudi_referralCode', code) } catch {}

    // If user is not connected, only store locally (no validation claim).
    if (!bearerToken) {
      setToast(code ? 'Saved locally. Connect wallet to validate.' : 'Referral code cleared.')
      return
    }

    // Connected: validate by calling backend.
    if (!code) {
      setToast(mapReferralError('missing_refCode'))
      return
    }

    setLoading(true)
    try {
      const r = await api('/referral/attach', { method: 'POST', body: { refCode: code } })
      if (r?.alreadyAttached) setToast('ℹ️ Referral already attached.')
      else setToast('✅ Referral attached.')

      // After a successful attach (or already attached), lock the input for this wallet
      try {
        if (wallet) localStorage.setItem(`kudi_referralLocked_${wallet}`, '1')
      } catch {}
      setReferralLocked(true)

      await refresh()
    } catch (e) {
      setToast(mapReferralError(e?.message))
    } finally {
      setLoading(false)
    }
  }

  function handleResetUser() {
    // "Disconnect"
    try {
      localStorage.removeItem(BEARER_KEY)
      localStorage.removeItem(WALLET_KEY)
    } catch {}
    setBearerToken('')
    setWallet('')
    setSummary(null)
    setToast('Disconnected.')
  }

  async function handleCopy(text, label) {
    try {
      await copyToClipboard(text)
      setToast(`Copied: ${label}`)
    } catch {
      setToast('Copy failed (browser blocked clipboard).')
    }
  }
  async function handleSaveNickname() {
    setNickMsg('')
    if (!bearerToken) {
      setNickMsg('Connect wallet first.')
      return
    }
    const nick = sanitizeNickname(nickDraft)
    if (!nick) {
      setNickMsg('Enter a nickname.')
      return
    }
    if (nick.length < 3) {
      setNickMsg('Nickname must be at least 3 characters.')
      return
    }

    setNickSaving(true)
    try {
      const r = await api('/me/nickname', { method: 'POST', body: { nickname: nick } })
      if (r?.ok) {
        setToast('✅ Nickname saved.')
        setNickEditing(false)
        await refresh()
      } else {
        setNickMsg(mapNicknameError(r?.error || 'unknown'))
      }
    } catch (e) {
      setNickMsg(mapNicknameError(e?.message))
    } finally {
      setNickSaving(false)
    }
  }

  function handleEditNickname() {
    setNickEditing(true)
    setNickMsg('')
  }

  function handleCancelNickname() {
    setNickEditing(false)
    setNickDraft((summary?.nickname || '').trim())
    setNickMsg('')
  }





function setFollowFlag(kind) {
  const next = { ...followDone, [kind]: true }
  setFollowDone(next)
  const all = !!(next.x && next.telegram && next.instagram)
  setFollowAllDone(all)
  localStorage.setItem('kudi_follow_tasks_done', JSON.stringify(next))
  if (all) setToast('✅ Social tasks completed. Daily tasks unlocked.')
  else setToast('✅ Task completed.')
}

function doFollow(kind) {
  if (kind === 'x') openExternal(TRUST_LINKS.x)
  else if (kind === 'telegram') openExternal(TRUST_LINKS.telegram)
  else if (kind === 'instagram') openExternal(TRUST_LINKS.instagram)
  setFollowFlag(kind)
}

  const statusDot = summary ? 'good' : 'bad'


  const ep = Number(summary?.ep ?? 0)
  const tier = String(summary?.careerTier || 'K0')
  const tierOrder = ['K0','K1','K2','K3']
  const thresholds = { K1: 1000, K2: 5000, K3: 10000 }

  let nextTier = 'K1'
  if (tier === 'K1') nextTier = 'K2'
  else if (tier === 'K2') nextTier = 'K3'
  else if (tier === 'K3') nextTier = null

  const nextTarget = nextTier ? thresholds[nextTier] : null
  const prevTarget = tier === 'K0' ? 0 : thresholds[tier] || 0
  const remaining = nextTarget ? Math.max(0, nextTarget - ep) : 0
  const progress = nextTarget ? Math.min(1, Math.max(0, (ep - prevTarget) / Math.max(1, (nextTarget - prevTarget)))) : 1

  // SAFE UI gate (default OFF). When enabled, render UI V1 root only.
  if (UI_V1_ENABLED) return <UiV1Root />


  return (
    <div className="container">
      <MobileHamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <style>{`
        .kudiHamburgerBtn{
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.92);
          cursor: pointer;
          margin-right: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          line-height: 18px;
        }
      `}</style>

      <div className="header">
        <div className="brand">
          <div className="logo">
            <button className="kudiHamburgerBtn" onClick={() => setMenuOpen(true)} aria-label="Open menu">☰</button>
          </div>
          <div>
            <div className="title">KUDI SKUNK</div>
            <div className="small">USDC on Solana • Wallet login</div>
            <div className="powered">Powered by 4T Ecosystem</div>
          </div>
        </div>
        <div className="headerRight">
{!bearerToken ? (
            <button className="btn" onClick={startConnect}>Connect Wallet</button>
          ) : (
            <button className="btn ghostBtn" onClick={handleResetUser} title={wallet ? `Connected: ${wallet}` : 'Connected'}>
              {wallet ? `Connected: ${wallet.slice(0,4)}…${wallet.slice(-4)}` : 'Connected'}
            </button>
          )}

          <button className="btn ghostBtn" onClick={() => setIsAvatarStoreOpen(true)}>Avatar Store</button>
          <button className="btn ghostBtn" onClick={() => setIsReportOpen(true)}>Team Report</button>
<button className="btn coinBtn" onClick={() => setIsBuyCoinOpen(true)}>

            BUY 4T COIN

          </button>

          <button className="btn energyGameBtnSoon" type="button" disabled>
            <span className="energyGameBtnMain">ENERGY SKUNK GAME</span>
            <span className="energyGameBtnBadge">COMING SOON</span>
          </button>

        </div>
      </div>

            <VideoBox src="/media/hero16x9.mp4" />

            {/* Daily Slot (between hero video and leaderboard) */}
            <SlotMachine />

      <div className="leaderHero">
        
        <div className="leaderBox">
          <div className="leaderTop">
            <div>
              <div className="leaderTitle">Leaderboard</div>
              <div className="leaderSub">{leaderLoading ? 'Loading…' : (leaderErr ? leaderErr : `Top 3 • ${lbLabel} • resets 00:00 UTC`)}</div>
            </div>

            <div className="leaderToggle" role="tablist" aria-label="Leaderboard mode">
              <button
                className={`leaderTab ${leaderMode === 'today' ? 'isActive' : ''}`}
                type="button"
                onClick={() => setLeaderMode('today')}
                aria-pressed={leaderMode === 'today'}
              >
                Today
              </button>
              <button
                className={`leaderTab ${leaderMode === 'alltime' ? 'isActive' : ''}`}
                type="button"
                onClick={() => setLeaderMode('alltime')}
                aria-pressed={leaderMode === 'alltime'}
              >
                All-time
              </button>
            </div>
          </div>

          <div className="podium">
            <div className="podiumRow gold">
              <div className="podiumRank">🥇</div>
              <div className="podiumName">{lb1 ? `${lb1.name}${lb1.isChampion ? ' 🎖️' : ''}` : '—'}</div>
              <div className="podiumScore">{lb1 ? `${lb1.score} REF` : '0 REF'}</div>
            </div>

            <div className="podiumRow silver">
              <div className="podiumRank">🥈</div>
              <div className="podiumName">{lb2 ? `${lb2.name}${lb2.isChampion ? ' 🎖️' : ''}` : '—'}</div>
              <div className="podiumScore">{lb2 ? `${lb2.score} REF` : '0 REF'}</div>
            </div>

            <div className="podiumRow bronze">
              <div className="podiumRank">🥉</div>
              <div className="podiumName">{lb3 ? `${lb3.name}${lb3.isChampion ? ' 🎖️' : ''}` : '—'}</div>
              <div className="podiumScore">{lb3 ? `${lb3.score} REF` : '0 REF'}</div>
            </div>
          </div>

          <div className="leaderHint">Daily #1 earns +100 EP + 24h 🎖️ badge (UTC reset).</div>
        </div>

        <div className="leaderArtWrap">
          <img className="leaderArt" src="/kudi-buy-coin.png" alt="KUDI SKUNK" />
        </div>
      </div>

      <LeaderboardTicker direction="ltr" includeWelcome={false} />

      <VideoBox src="/media/ticker16x9.mp4" />


<div className="taskStack">
  <div className="taskCard">
    <div className="taskTop">
      <div>
        <div className="taskTitle">First Task (One-time)</div>
        <div className="taskSub">Follow our official channels once to unlock daily tasks.</div>
      </div>
      <div className={`taskPill ${followAllDone ? 'done' : ''}`}>{followAllDone ? 'DONE' : 'LOCK'}</div>
    </div>

    <div className="taskBtns">
      <button className={`btn secondary btnX ${followDone.x ? 'isDone' : ''}`} onClick={() => doFollow('x')} disabled={followDone.x}>
        {followDone.x ? '✓ X followed' : 'Follow X'}
      </button>
      <button className={`btn secondary btnTg ${followDone.telegram ? 'isDone' : ''}`} onClick={() => doFollow('telegram')} disabled={followDone.telegram}>
        {followDone.telegram ? '✓ Telegram joined' : 'Join Telegram'}
      </button>
      <button className={`btn secondary btnIg ${followDone.instagram ? 'isDone' : ''}`} onClick={() => doFollow('instagram')} disabled={followDone.instagram}>
        {followDone.instagram ? '✓ Instagram followed' : 'Follow Instagram'}
      </button>
    </div>

    <div className="taskNote">One-time only. No spam.</div>
  </div>

  <div className={`taskCard ${followAllDone ? '' : 'isLocked'}`}>
    <div className="taskTop">
      <div>
        <div className="taskTitle">Daily Viral Task</div>
        <div className="taskSub">Share on X / Telegram / WhatsApp to at least <b>5 friends</b>.</div>
      </div>
      <div className="taskPill">DAILY</div>
    </div>

    <div className="taskBtns">
      <button className="btn secondary btnX" onClick={shareX} disabled={!canShare}>Share on X</button>
      <button className="btn secondary btnTg" onClick={shareTelegram} disabled={!canShare}>Share on Telegram</button>
      <button className="btn secondary btnWa" onClick={shareWhatsApp} disabled={!canShare}>Share on WhatsApp</button>
    
    {bearerToken && !hasNickname ? (
      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="small" style={{ display: 'block', marginBottom: 6 }}>Nickname</label>
          <input
            value={nickDraft}
            onChange={(e) => setNickDraft(e.target.value)}
            placeholder="@yourname"
            autoComplete="off"
            style={{ width: '100%' }}
          />
          {nickMsg ? <div className="miniGameMsg" style={{ marginTop: 6 }}>{nickMsg}</div> : null}
        </div>
        <button className="btn" onClick={handleSaveNickname} disabled={nickSaving || !bearerToken}>
          {nickSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    ) : null}


</div>

    {!followAllDone ? <div className="taskLockHint">Complete the one-time follow task first.</div> : (!hasNickname ? <div className="taskLockHint">Create a nickname to unlock sharing.</div> : null)}
  </div>
</div>


      <div className="grid">
        <div className="card buyCard">
          <h2>Buy Package (USDC)</h2>

          <div className="row">
            <div className="field">
              <label>Wallet</label>
              <input readOnly value={wallet || ''} placeholder="Connect Phantom wallet" />
              <div className="row">
                {!bearerToken ? (
                  <button className="btn" onClick={startConnect}>Connect Wallet</button>
                ) : (
                  <button className="btn secondary" onClick={() => handleCopy(wallet, 'wallet')} disabled={!wallet}>Copy</button>
                )}
              </div>
            </div>

            <div className="field">
              <label>Referral Code (optional)</label>
              <input value={referralCode} onChange={(e) => { if (!referralLocked) setReferralCode(e.target.value) }} placeholder="REF-XXXX" readOnly={referralLocked} />
              <div className="row">
                <button className="btn secondary" onClick={handleSaveRef} disabled={loading || referralLocked}>{referralLocked ? 'Saved' : 'Save'}</button>
                <button className="btn secondary" onClick={() => handleCopy(referralCode, 'referral code')} disabled={!referralCode}>Copy</button>
              </div>
            </div>
          </div>

          <div className="hr" />

          <div className="row">
            <div className="field">
              <label>Packages</label>

              <div className="pkgMiniGrid" role="radiogroup" aria-label="Select package">
                <button
                  type="button"
                  className={`pkgMiniBtn pkgStarter ${selectedPackage === 'STARTER' ? 'active' : ''}`}
                  onClick={() => setSelectedPackage('STARTER')}
                  aria-pressed={selectedPackage === 'STARTER'}
                >
                  <div className="t">STARTER</div>
                  <div className="p">5 USDC</div>
                  <div className="e">20 EP (%10)</div>
                </button>

                <button
                  type="button"
                  className={`pkgMiniBtn pkgPro ${selectedPackage === 'PRO' ? 'active' : ''}`}
                  onClick={() => setSelectedPackage('PRO')}
                  aria-pressed={selectedPackage === 'PRO'}
                >
                  <div className="t">PRO</div>
                  <div className="p">50 USDC</div>
                  <div className="e">150 EP (%20)</div>
                </button>

                <button
                  type="button"
                  className={`pkgMiniBtn pkgElite ${selectedPackage === 'ELITE' ? 'active' : ''}`}
                  onClick={() => setSelectedPackage('ELITE')}
                  aria-pressed={selectedPackage === 'ELITE'}
                >
                  <div className="t">ELITE</div>
                  <div className="p">100 USDC</div>
                  <div className="e">300 EP (%25)</div>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn" onClick={handleBuy} disabled={loading || !bearerToken}>
                {loading ? 'Processing…' : 'Buy (USDC)'}
              </button>
            </div>
          </div>

          <div className="underPackages">
            <div className="miniGameCard">
              <div className="miniGameHead">
                <div>
                  <div className="miniGameTitle">Daily Energy Tap</div>
                  <div className="miniGameSub">1 tap per day • +25 EP</div>
                </div>
                <div className={`miniGameBadge ${claimedToday ? 'done' : ''}`}>{claimedToday ? 'COLLECTED' : 'READY'}</div>
              </div>

              <button
                className="btn btnMiniGame btnDailyTap"
                onClick={handleDailyTap}
                disabled={dailyTapLoading || !bearerToken || claimedToday}
              >
                {claimedToday ? 'Collected ✓' : (dailyTapLoading ? 'Claiming…' : 'Claim +25 EP')}
              </button>

              {dailyTapMsg ? <div className="miniGameMsg">{dailyTapMsg}</div> : null}
              <div className="dailyExtraTasks" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <button className="btn btnMiniGame btnDailyCheckin" style={{ flex: '1 1 160px', minWidth: 160, whiteSpace: 'normal' }} onClick={handleDailyCheckin}
                  disabled={checkinLoading || !bearerToken || checkinDoneToday}
                >
                  {checkinDoneToday ? 'Check-in ✓' : (checkinLoading ? 'Claiming…' : 'Daily Check-in +15 EP')}
                </button>

                <button className="btn btnMiniGame btnKudiPush" style={{ flex: '1 1 160px', minWidth: 160, whiteSpace: 'normal' }} onClick={handleKudiPush}
                  disabled={kudiPushLoading || !bearerToken || kudiPushDoneToday}
                >
                  {kudiPushDoneToday ? 'Kudi Push ✓' : (kudiPushLoading ? 'Claiming…' : 'Kudi Push +20 EP')}
                </button>

                <button className="btn btnMiniGame btnMiniChallenge" style={{ flex: '1 1 160px', minWidth: 160, whiteSpace: 'normal' }} onClick={handleMiniChallenge}
                  disabled={miniLoading || !bearerToken || miniDoneToday}
                >
                  {miniDoneToday ? 'Mini ✓' : (miniLoading ? 'Claiming…' : 'Mini Challenge +20 EP')}
                </button>
              </div>

              {checkinMsg ? <div className="miniGameMsg">{checkinMsg}</div> : null}
              {kudiPushMsg ? <div className="miniGameMsg">{kudiPushMsg}</div> : null}
              {miniMsg ? <div className="miniGameMsg">{miniMsg}</div> : null}

            </div>
          </div>


          {toast ? <div className="toast">{toast}</div> : null}
        </div>

        <div className="card summaryCard">
          <h2>My Summary</h2>
          <div className="small">Data from <span className="mono">GET /me/summary</span></div>

          {/* Nickname (fixed slot to avoid layout shift) */}
          <div style={{ minHeight: 52, display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            {!bearerToken ? (
              <div className="small">Connect wallet to create a nickname.</div>
            ) : (!hasNickname || nickEditing) ? (
              <>
                <div style={{ flex: 1 }}>
                  <label className="small" style={{ display: 'block', marginBottom: 6 }}>Nickname</label>
                  <input
                    value={nickDraft}
                    onChange={(e) => setNickDraft(e.target.value)}
                    placeholder="@yourname"
                    autoComplete="off"
                  />
                  {nickMsg ? <div className="hint">{nickMsg}</div> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                  <button className="btn" onClick={handleSaveNickname} disabled={nickSaving || !bearerToken}>
                    {nickSaving ? 'Saving…' : 'Save'}
                  </button>
                  {hasNickname ? (
                    <button className="btn secondary" onClick={handleCancelNickname} disabled={nickSaving}>Cancel</button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div className="small">
                  Nickname: <span className="mono">@{summary?.nickname || ''}</span>{isDailyChampion ? <span style={{ marginLeft: 8 }}>🎖️</span> : null}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button className="btn secondary" onClick={handleEditNickname}>Edit</button>
                </div>
              </>
            )}
          </div>

          <div className="kpis">
            <div className="kpi">
              <div className="k">USDC Balance</div>
              <div className="v">{moneyUsdc(summary?.usdAvailable ?? 0)}</div>
            </div>
            <div className="kpi">
              <div className="k">EP</div>
              <div className="v">{Number(summary?.ep ?? 0).toLocaleString()}</div>
            </div>
            <div className="kpi kpiTier">
              <div className="k">Career Tier</div>
              <div className="v">{summary?.careerTier || '—'}</div>

              <div className="l12">
                <div className="lbox">
                  <div className="lk">L1</div>
                  <div className="lv">{Number(summary?.l1 ?? summary?.l1Count ?? summary?.refL1 ?? 0).toLocaleString()}</div>
                </div>
                <div className="lbox">
                  <div className="lk">L2</div>
                  <div className="lv">{Number(summary?.l2 ?? summary?.l2Count ?? summary?.refL2 ?? 0).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hr" />

          <div className="row">
            <div className="field">
              <label>Career Cash Earned</label>
              <input readOnly value={moneyUsdc(summary?.usdAvailable ?? 0)} />
            </div>
            
<div className="field">
              <label>Withdraw (min 10 / max 500 per day)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={cashoutAmount}
                  onChange={(e) => setCashoutAmount(e.target.value)}
                  placeholder="Amount (USDC)"
                  inputMode="numeric"
                />
                <button
                  className="btn"
                  onClick={withdrawCashout}
                  disabled={!wallet || cashoutLoading}
                  title={!wallet ? 'Connect wallet to withdraw' : undefined}
                >
                  {cashoutLoading ? 'Withdrawing…' : 'Withdraw'}
                </button>
              </div>
              {cashoutMsg ? <div className="hint">{cashoutMsg}</div> : null}
            </div>
            <div className="field">
              <label>My Referral Code</label>
              <input readOnly value={summary?.refCode || ''} placeholder="(available after connect)" />
              <div className="row">
                <button className="btn secondary" onClick={() => handleCopy(summary?.refCode || '', 'my referral code')} disabled={!summary?.refCode}>Copy</button>
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div className="field">
              <label>Invite Link</label>
              <input readOnly value={inviteLink} placeholder="(available after referral code exists)" />
              <div className="row">
                <button className="btn secondary" onClick={() => handleCopy(inviteLink, 'invite link')} disabled={!inviteLink}>Copy</button>
              </div>
            </div>
          </div>

          <div className="hr" />

          <div className="row">
            <button className="btn secondary" onClick={refresh}>Refresh</button>
          </div>

          
        </div>
      </div>


      <AquariumBanner />


<div className="footerWrap">
        <div className="footerLeft">
          <a href="#" className="footLink" onClick={(e)=>{e.preventDefault();setIsTermsOpen(true)}}>Terms</a>
          <span className="footSep">•</span>
          <a href="#" className="footLink" onClick={(e)=>{e.preventDefault();setIsPrivacyOpen(true)}}>Privacy</a>
          <span className="footSep">•</span>
          <a href="#" className="footLink" onClick={(e)=>{e.preventDefault();setIsHowToPlayOpen(true)}}>How to Play</a>
	          <span className="footSep">•</span>
	          <a href="#" className="footLink" onClick={(e)=>{e.preventDefault();setIsWhitepaperOpen(true)}}>Whitepaper</a>
	          <span className="footSep">•</span>
	          <a href="#" className="footLink" onClick={(e)=>{e.preventDefault();setIsRoadmapOpen(true)}}>Roadmap</a>
          <span className="footSep">•</span>
          <a href={TRUST_LINKS.mail} className="footLink">Contact</a>
        </div>

        <div className="footerRight">
          <div className="footerSocialTop">
            <SocialLinks links={TRUST_LINKS} />
            <div className="footerAddr">
              <a className="footerAddrItem" href={TRUST_LINKS.x} target="_blank" rel="noreferrer">x.com/4tfourt2025</a>
              <a className="footerAddrItem" href={TRUST_LINKS.instagram} target="_blank" rel="noreferrer">instagram.com/fourt4t2025</a>
              <a className="footerAddrItem" href={TRUST_LINKS.telegram} target="_blank" rel="noreferrer">t.me/+Zs5LyuF88AViMzI0</a>
              <a className="footerAddrItem" href={TRUST_LINKS.web} target="_blank" rel="noreferrer">fourt4t.com</a>
              <a className="footerAddrItem" href={TRUST_LINKS.mail}>4tfourt2025@gmail.com</a>
            </div>
          </div>

          <div className="footerInfo">
            <div>🔥 Elite package gives 25% direct referral bonus</div>
            <div>⚡ Daily tasks reset at 00:00 UTC</div>
            <div>🎁 Invite friends → earn L1 5% + L2 2%</div>
            <div>👑 Reach KUDI BABA to unlock perks</div>
          </div>
        </div>
      </div>

      {isConnectOpen ? (
        <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsConnectOpen(false); setPendingLogin(null) } }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div>
                <div className="modalTitle">Terms & Wallet Signature</div>
                <div className="small">To continue, you must accept the Terms and sign a one-time message with Phantom.</div>
              </div>
              <button className="iconBtn" onClick={() => { setIsConnectOpen(false); setPendingLogin(null) }}>✕</button>
            </div>

            <div className="modalBody" style={{ maxHeight: 380, overflow: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>Disclaimer</h3>
              <p>
                KudiSkunk is an entertainment product. It is not a bank, broker, exchange, or investment platform.
                Rewards are recorded in an in-app ledger and may change as the product evolves.
              </p>
              <p>
                You are solely responsible for your wallet security, transactions, and any taxes or reporting obligations.
                We do not guarantee profits, refunds, availability, or uninterrupted service.
              </p>
              <p>
                By signing, you confirm you are legally permitted to use this service in your jurisdiction and that you accept
                the Terms & Privacy policy.
              </p>

              <div className="hr" />

              <div className="small"><b>Message to be signed:</b></div>
              <pre className="mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 8 }}>
                {pendingLogin?.message || ''}
              </pre>

              <label style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
                <input type="checkbox" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} />
                <span>I have read and agree to the Terms & Privacy policy, and I agree to sign electronically.</span>
              </label>
            </div>

            <div className="modalActions">
              <button className="btn secondary" onClick={() => { setIsConnectOpen(false); setPendingLogin(null) }}>Cancel</button>
              <button className="btn" onClick={signAndConnect} disabled={loading || !termsOk}>
                {loading ? 'Signing…' : 'I Agree & Sign'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isBuyCoinOpen ? (
        <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsBuyCoinOpen(false) } }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modalTop">
              <div>
                <div className="modalTitle">Buy 4T Coin</div>
                <div className="modalSub">Choose an exchange to continue.</div>
              </div>
              <button className="xBtn" onClick={() => setIsBuyCoinOpen(false)}>✕</button>
            </div>

            <div className="modalGrid">
              <button
                className="exCard"
                onClick={() => {
                  openExternal(PUMP_FUN_URL)
                  setIsBuyCoinOpen(false)
                }}
              >
                <div className="exName">pump.fun</div>
                <div className="exDesc">Fast buy page (recommended for quick access).</div>
                <div className="exFoot">Open ↗</div>
              </button>

              <button
                className="exCard"
                onClick={() => {
                  openExternal(MEXC_DEX_URL)
                  setIsBuyCoinOpen(false)
                }}
              >
                <div className="exName">MEXC DEX</div>
                <div className="exDesc">DEX trade page (advanced).</div>
                <div className="exFoot">Open ↗</div>
              </button>
            </div>

            <div className="modalBottom">
              <button className="btn secondary" onClick={() => setIsBuyCoinOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}




{isTermsOpen ? (
  <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsTermsOpen(false) } }}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modalTop">
        <div>
          <div className="modalTitle">Terms & Conditions</div>
          <div className="modalSub">Please read carefully.</div>
        </div>
        <button className="xBtn" onClick={() => setIsTermsOpen(false)}>✕</button>
      </div>
      <div className="modalBody" style={{maxHeight:'60vh', overflow:'auto'}}>
        <p><b>KUDI SKUNK</b> is an experimental entertainment product. It is not a bank, exchange, broker, or investment service.</p>
        <p><b>USDC balances shown in the dashboard are ledger entries</b> used for internal accounting of rewards. Availability of withdrawals, limits, and rules may change as the product evolves.</p>
        <p>You are solely responsible for your wallet security, transactions, network fees, and any taxes or legal/compliance obligations in your jurisdiction.</p>
        <p>We make no warranties and provide the service “as is”. We do not guarantee profit, availability, uninterrupted service, or refunds.</p>
        <p>Daily energy claims, packages, and rewards may be changed, limited, or removed at any time to protect system balance.</p>
        <p>We do not guarantee uninterrupted access, future availability of items, or continued operation of the platform.</p>
        <p>Any abuse, automation, or exploitation may result in restriction or loss of access without notice.</p>
        <p><i>This platform is provided “as is” without warranties of any kind.</i></p>
      </div>
      <div className="modalBottom">
        <button className="btn secondary" onClick={() => setIsTermsOpen(false)}>Close</button>
      </div>
    </div>
  </div>
) : null}

{isRoadmapOpen ? (
  <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsRoadmapOpen(false) } }}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modalTop">
        <div>
          <div className="modalTitle">Roadmap</div>
          <div className="modalSub">What we ship next (high-level)</div>
        </div>
        <button className="xBtn" onClick={() => setIsRoadmapOpen(false)}>×</button>
      </div>
      <div className="modalBody">
        <h3>Phase 1 — Foundation</h3>
        <ul>
          <li>Wallet login, secure sessions, stable backend.</li>
          <li>Avatar Store (EP-only) with limited drops and idempotent purchases.</li>
          <li>Daily EP tasks and leaderboard experience.</li>
        </ul>

        <h3>Phase 2 — Community Growth</h3>
        <ul>
          <li>Referral system improvements (attach-once, abuse guards, clear UI).</li>
          <li>Social tasks & share flows optimized for mobile.</li>
          <li>Better onboarding + ecosystem pages (About / Mission / Vision).</li>
        </ul>

        <h3>Phase 3 — Energy Skunk Game</h3>
        <ul>
          <li>"Energy Skunk Game" release (core gameplay loop).</li>
          <li>EP utilities inside the game and seasonal events.</li>
        </ul>

        <h3>Phase 4 — On-chain Utilities</h3>
        <ul>
          <li>USDC flows with safety: queues, idempotency keys, treasury guards.</li>
          <li>Admin/Ops tools (withdraw logs, daily reports, manual review if needed).</li>
        </ul>

        <h3>Phase 5 — Marketplace & Expansion</h3>
        <ul>
          <li>More avatar collections, special editions, and partnerships.</li>
          <li>Marketplace/utility expansion (as ecosystem matures).</li>
        </ul>
      </div>
      <div className="modalBottom">
        <button className="btn secondary" onClick={() => setIsRoadmapOpen(false)}>Close</button>
      </div>
    </div>
  </div>
) : null}


{isPrivacyOpen ? (
  <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsPrivacyOpen(false) } }}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modalTop">
        <div>
          <div className="modalTitle">Privacy Policy</div>
          <div className="modalSub">Your data, your control.</div>
        </div>
        <button className="xBtn" onClick={() => setIsPrivacyOpen(false)}>✕</button>
      </div>
      <div className="modalBody" style={{maxHeight:'60vh', overflow:'auto'}}>
        <p>KUDI SKUNK respects your privacy.</p>
        <p>We only store the minimum data required to operate the platform, such as wallet address, nickname, and gameplay progress.</p>
        <p>No personal identity information is collected.</p>
        <p>User data is not sold, shared, or distributed to third parties.</p>
        <p>Data may be stored locally in your browser or on our servers solely for gameplay functionality.</p>
        <p>By using the platform, you consent to this data usage.</p>
      </div>
      <div className="modalBottom">
        <button className="btn secondary" onClick={() => setIsPrivacyOpen(false)}>Close</button>
      </div>
    </div>
  </div>
) : null}

{isWhitepaperOpen ? (
  <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsWhitepaperOpen(false) } }}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modalTop">
        <div>
          <div className="modalTitle">Whitepaper</div>
          <div className="modalSub">KUDI SKUNK — EP Economy & Rewards (short version)</div>
        </div>
        <button className="xBtn" onClick={() => setIsWhitepaperOpen(false)}>×</button>
      </div>
      <div className="modalBody">
        <h3>What is KUDI SKUNK?</h3>
        <p>KUDI SKUNK is a gamified community layer built on Solana. You earn <b>EP</b> (Energy Points) from activities and use EP to unlock limited avatar drops and perks.</p>

        <h3>EP (Energy Points)</h3>
        <ul>
          <li>EP is earned from in-app tasks (daily actions, community engagement, events).</li>
          <li>EP is used for rewards (limited avatars, status tiers, future game utilities).</li>
          <li>EP is tracked server-side per wallet (idempotent: no double-awards).</li>
        </ul>

        <h3>Packages & Status</h3>
        <p>Packages give status benefits (e.g., Elite) and may unlock higher referral bonuses or special access. Core/Team wallets can be assigned Elite status for internal operations.</p>

        <h3>Referral</h3>
        <p>Invite links can reward the inviter (L1/L2 network rules) based on the invited user’s actions or purchases. The referral system is designed to be transparent and abuse-resistant.</p>

        <h3>Rewards & Payouts</h3>
        <p>Rewards may include EP, limited drops, and future USDC on-chain utilities. Any on-chain payout flow should use clear limits, audit logs, and safe guards (rate limits, idempotency keys, and treasury checks).</p>

        <h3>Security & Fairness</h3>
        <ul>
          <li>One wallet = one account identity (wallet signature auth).</li>
          <li>No duplicate purchases / no duplicate EP awards (idempotent checks).</li>
          <li>Anti-abuse controls and daily caps for task rewards.</li>
        </ul>
      </div>
      <div className="modalBottom">
        <button className="btn secondary" onClick={() => setIsWhitepaperOpen(false)}>Close</button>
      </div>
    </div>
  </div>
) : null}

{isRoadmapOpen ? (
  <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsRoadmapOpen(false) } }}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modalTop">
        <div>
          <div className="modalTitle">Roadmap</div>
          <div className="modalSub">Where we’re going next</div>
        </div>
        <button className="xBtn" onClick={() => setIsRoadmapOpen(false)}>×</button>
      </div>
      <div className="modalBody">
        <h3>Phase 1 — Foundation (Now)</h3>
        <ul>
          <li>Stable dashboard + wallet login</li>
          <li>Avatar Store (limited drops, server-side inventory)</li>
          <li>EP economy basics + daily tasks</li>
          <li>Referral attach + tracking improvements</li>
        </ul>

        <h3>Phase 2 — Energy Skunk Game</h3>
        <ul>
          <li>"Energy Skunk Game" launch (Coming Soon)</li>
          <li>Gameplay loops that generate/consume EP</li>
          <li>Leaderboards + seasonal resets</li>
        </ul>

        <h3>Phase 3 — Rewards Expansion</h3>
        <ul>
          <li>More avatar series + special drops</li>
          <li>Better social tasks (share flows, invites, campaigns)</li>
          <li>Ops/admin tooling (logs, reports, manual approvals if needed)</li>
        </ul>

        <h3>Phase 4 — On-chain Utilities</h3>
        <ul>
          <li>USDC flows with strong safeguards (limits, queues, confirmations)</li>
          <li>Transparency dashboards (treasury + payout history)</li>
        </ul>
      </div>
      <div className="modalBottom">
        <button className="btn secondary" onClick={() => setIsRoadmapOpen(false)}>Close</button>
      </div>
    </div>
  </div>
) : null}

{isHowToPlayOpen ? (
  <div className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) { setIsHowToPlayOpen(false) } }}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modalTop">
        <div>
          <div className="modalTitle">How to Play</div>
          <div className="modalSub">Referral (L1/L2) + KUDI Baba basics.</div>
        </div>
        <button className="xBtn" onClick={() => setIsHowToPlayOpen(false)}>✕</button>
      </div>

      <div className="modalBody" style={{maxHeight:'60vh', overflow:'auto'}}>
        <h3 style={{marginTop:0}}>Welcome to KUDI</h3>
        <p>
          KUDI is a social-first game where you grow your <b>KUDI Baba</b>, complete daily actions,
          and earn rewards by inviting others.
        </p>

        <h3>1) Your KUDI Baba (Avatar Game)</h3>
        <ul>
          <li>Connect your Solana wallet to create your profile.</li>
          <li>Your <b>KUDI Baba</b> avatar is your in-game identity.</li>
          <li>Customize your look with items from the <b>Avatar Store</b>.</li>
          <li>Your progress is linked to your wallet, so you can return anytime.</li>
        </ul>

        <h3>2) Daily Gameplay</h3>
        <ul>
          <li>Go to <b>Daily Tasks</b> and complete tasks to earn progress and rewards.</li>
          <li>Some tasks are <b>once per day</b> and reset daily.</li>
          <li>Follow the UI feedback after each claim (success / already claimed / limits).</li>
        </ul>

        <h3>3) Referral System (L1 &amp; L2)</h3>
        <p>
          KUDI grows through community. Share your referral code and build your network.
          Referral rewards are calculated automatically based on your network activity.
        </p>
        <ul>
          <li><b>Your Referral Code:</b> Share it with friends before they connect and join.</li>
          <li><b>L1 (Level 1):</b> Players who join using your code. You earn a <b>5%</b> referral bonus.</li>
          <li><b>L2 (Level 2):</b> Players invited by your L1 referrals. You earn a <b>2%</b> referral bonus.</li>
        </ul>

        <h3>4) Referral Packages &amp; Earnings</h3>
        <p>
          Your referral income depends on the package you own. Higher packages unlock higher referral earning power:
        </p>
        <ul>
          <li><b>Starter Package:</b> <b>+10%</b> referral income</li>
          <li><b>Pro Package:</b> <b>+20%</b> referral income</li>
          <li><b>Elite Package:</b> <b>+25%</b> referral income</li>
        </ul>

        <p>
          Referral bonuses are applied on top of your base rewards.
          Any abuse (fake accounts, self-referrals, automation, or suspicious behavior)
          may result in restriction or loss of rewards.
        </p>

        <h3>Tips</h3>
        <ul>
          <li>Start with daily tasks to build momentum.</li>
          <li>Invite active players to grow a strong L1 network.</li>
          <li>Strong L1 networks create long-term L2 benefits.</li>
          <li>Upgrading your package increases your referral earning potential.</li>
        </ul>
<p style={{ marginTop: 14 }}>
          <b>Result:</b> Whoever captures KUDI Baba earns a <b>500 USDC</b> bonus and it is credited to their account.
        </p>
        <p className="small" style={{ marginTop: 8 }}>
          <b>Note:</b> Daily withdrawals are limited to a minimum of <b>10 USDC</b> and a maximum of <b>500 USDC</b>.
        </p>
      </div>

      <div className="modalBottom">
        <button className="btn secondary" onClick={() => setIsHowToPlayOpen(false)}>Close</button>
      </div>
    </div>
  </div>
) : null}


      <AvatarStore
        open={isAvatarStoreOpen}
        onClose={() => setIsAvatarStoreOpen(false)}
        userId={wallet}
        onChanged={refresh}
      />


      <TeamReport
        open={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        apiBase={API_BASE}
        bearerToken={bearerToken}
      />

    </div>
  )


async function withdrawCashout() {
  setCashoutMsg('')
  if (!wallet) {
    setCashoutMsg('Connect wallet first.')
    return
  }

  const amt = Number(cashoutAmount)
  if (!Number.isFinite(amt)) {
    setCashoutMsg('Enter a valid amount.')
    return
  }

  setCashoutLoading(true)
  try {
    const r = await api('/cashout/withdraw', { method: 'POST', body: { amount: amt } })
    if (r?.signature) {
      setCashoutMsg(`✅ Withdraw sent. Tx: ${r.signature}`)
    } else {
      setCashoutMsg('✅ Withdraw successful.')
    }
    setCashoutAmount('')
    await refresh()
  } catch (e) {
    setCashoutMsg(mapCashoutError(e?.message))
  } finally {
    setCashoutLoading(false)
  }
}
}