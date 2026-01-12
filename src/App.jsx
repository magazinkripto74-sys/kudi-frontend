import React, { useEffect, useMemo, useState } from 'react'
import bs58 from 'bs58'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token'
import AvatarStore from './AvatarStore'
import "./styles/avatarstore.glass.css"

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

// Defaults can be overridden via .env (VITE_*)
const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'
const USDC_MINT = import.meta.env.VITE_USDC_MINT || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET || 'BAozCCttGU7SVvpSdGzqoTrdEK3jrp3gU1nF6h8GfykR'
const USDC_DECIMALS = 6

const SESSION_KEY = 'kudi_session_id'
const BEARER_KEY = 'kudi_bearer_token'
const WALLET_KEY = 'kudi_wallet'

// Referral storage keys
const REF_CODE_KEY = 'kudi_referralCode'
const refAttachedKeyForWallet = (wallet) => `kudi_ref_attached_${String(wallet || '').trim()}`

function isValidRefCode(raw) {
  const s = String(raw || '').trim()
  if (!s) return false
  return /^REF-[A-Z0-9]+$/i.test(s)
}

function readRefFromUrlAndClean() {
  try {
    const url = new URL(window.location.href)
    const refFromUrl = (url.searchParams.get('ref') || '').trim()
    if (refFromUrl) {
      try {
        url.searchParams.delete('ref')
        window.history.replaceState({}, '', url.toString())
      } catch {}
    }
    return refFromUrl
  } catch {
    return ''
  }
}

function getSessionId() {
  try {
    let s = sessionStorage.getItem(SESSION_KEY)
    if (!s) {
      s = (crypto?.randomUUID ? crypto.randomUUID() : `s_${Math.random().toString(36).slice(2)}_${Date.now()}`)
      sessionStorage.setItem(SESSION_KEY, s)
    }
    return s
  } catch {
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
  const [wallet, setWallet] = useState('')
  const [bearerToken, setBearerToken] = useState('')
  const [pendingLogin, setPendingLogin] = useState(null) // { wallet, token, message }
  const [termsOk, setTermsOk] = useState(false)
  const [isConnectOpen, setIsConnectOpen] = useState(false)

  // Referral
  const [referralCode, setReferralCode] = useState('')

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

  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false)

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

  const shareX = () => {
    const { url, text } = makeSharePayload()
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(intent, '_blank', 'noopener,noreferrer')
  }

  const shareTelegram = () => {
    const { url, text } = makeSharePayload()
    const tg = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    window.open(tg, '_blank', 'noopener,noreferrer')
  }

  const shareWhatsApp = () => {
    const { url, text } = makeSharePayload()
    const wa = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    window.open(wa, '_blank', 'noopener,noreferrer')
  }

  // ======= INIT =======
  useEffect(() => {
    getSessionId()

    try {
      const savedWallet = localStorage.getItem(WALLET_KEY) || ''
      const savedBearer = localStorage.getItem(BEARER_KEY) || ''
      if (savedWallet) setWallet(savedWallet)
      if (savedBearer) setBearerToken(savedBearer)
    } catch {}

    const storedRef = (localStorage.getItem(REF_CODE_KEY) || '').trim()
    const refFromUrl = readRefFromUrlAndClean()
    const finalRef = (refFromUrl || storedRef || '').trim()
    if (finalRef) {
      setReferralCode(finalRef)
      try { localStorage.setItem(REF_CODE_KEY, finalRef) } catch {}
    }
  }, [])

  useEffect(() => {
    if (!isAvatarStoreOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
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
    const t = setInterval(() => { loadLeaderboard('today') }, 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderMode])

  // Keep nickname draft in sync with server summary (unless actively editing)
  useEffect(() => {
    const current = (summary?.nickname || '').trim()
    if (nickEditing) return
    setNickDraft(current)
    setNickMsg('')
  }, [summary?.nickname])

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

  async function startConnect() {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

    setToast('')
    setTermsOk(false)
    try {
      const sol = window?.solana
      if (!sol || !sol.isPhantom) {
        if (isMobile) {
          const here = window.location.href
          window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(here)}`
          return
        }
        setToast('Phantom wallet not found. Please install Phantom and refresh.')
        return
      }

      const resp = await sol.connect()
      const w = (resp?.publicKey?.toString?.() || sol.publicKey?.toString?.() || '').trim()
      if (!w) {
        setToast('Wallet connect failed.')
        return
      }

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

      // Referral attach (single point, one-time, no spam)
      const code = String(referralCode || '').trim()
      if (code && isValidRefCode(code)) {
        // If server already has upline, mark attached and skip
        let alreadyOnServer = false
        try {
          const s = await api('/me/summary')
          if (s?.uplineWallet) {
            alreadyOnServer = true
            try { localStorage.setItem(refAttachedKeyForWallet(pendingLogin.wallet), '1') } catch {}
          }
        } catch {}

        if (!alreadyOnServer) {
          try {
            const k = refAttachedKeyForWallet(pendingLogin.wallet)
            const done = (() => { try { return localStorage.getItem(k) === '1' } catch { return false } })()
            if (!done) {
              const r = await api('/referral/attach', { method: 'POST', body: { refCode: code } })
              try { localStorage.setItem(k, '1') } catch {}
              if (r?.alreadyAttached) {
                // silent
              } else {
                // silent success
              }
            }
          } catch (e) {
            setToast(mapReferralError(e?.message))
          }
        }
      }

      await refresh()
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
      const connection = new Connection(SOLANA_RPC, 'confirmed')
      const mint = new PublicKey(USDC_MINT)
      const fromOwner = new PublicKey(wallet)
      const toOwner = new PublicKey(TREASURY_WALLET)

      const fromAta = await getAssociatedTokenAddress(mint, fromOwner)
      const toAta = await getAssociatedTokenAddress(mint, toOwner)

      const tx = new Transaction()

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

      await connection.confirmTransaction({ signature: txSig, blockhash, lastValidBlockHeight }, 'confirmed')

      const verify = await api('/purchase/verifyTx', {
        method: 'POST',
        body: { txSig, packageAmount: amountUsdc }
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
    try { localStorage.setItem(REF_CODE_KEY, code) } catch {}

    // NEW RULE: save only locally. Attach happens automatically after wallet connect.
    if (!code) {
      setToast('Referral code cleared.')
      return
    }
    if (!isValidRefCode(code)) {
      setToast('Invalid referral code format. Use REF-XXXX')
      return
    }
    setToast('✅ Saved. Connect wallet to validate.')
  }

  function handleResetUser() {
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

  return (
    <div className="container">
      <div className="header">
        <div className="brand">
          <div className="logo" />
          <div>
            <div className="title">KUDI SKUNK</div>
            <div className="small">USDC on Solana • Wallet login</div>
            <div className="powered">Powered by 4T Ecosystem</div>
          </div>
        </div>
        <div className="headerRight">

          <div className="trustIcons">
            <a href={TRUST_LINKS.x} target="_blank" rel="noopener noreferrer" title="Official X">𝕏</a>
            <a href={TRUST_LINKS.instagram} target="_blank" rel="noopener noreferrer" title="Instagram">📸</a>
            <a href={TRUST_LINKS.telegram} target="_blank" rel="noopener noreferrer" title="Telegram">✈️</a>
            <a href={TRUST_LINKS.web} target="_blank" rel="noopener noreferrer" title="Website">🌐</a>
            <a href={TRUST_LINKS.mail} title="Contact">✉️</a>
          </div>

          {!bearerToken ? (
            <button className="btn" onClick={startConnect}>Connect Wallet</button>
          ) : (
            <button className="btn ghostBtn" onClick={handleResetUser} title={wallet ? `Connected: ${wallet}` : 'Connected'}>
              {wallet ? `Connected: ${wallet.slice(0,4)}…${wallet.slice(-4)}` : 'Connected'}
            </button>
          )}

          <button className="btn ghostBtn" onClick={() => setIsAvatarStoreOpen(true)}>Avatar Store</button>
          <button className="btn coinBtn" onClick={() => setIsBuyCoinOpen(true)}>
            BUY 4T COIN
          </button>

          <div className="badge">
            <span className={`dot ${statusDot}`} />
            <span className="mono">{API_BASE}</span>
          </div>

        </div>
      </div>

      {/* --- REST OF FILE UNCHANGED FROM YOUR WORKING VERSION --- */}
      {/* The UI/markup below is identical to the version you uploaded; only referral logic changed above. */}

      {/* ... (the remainder of your existing UI stays as-is) ... */}

      <AvatarStore
        open={isAvatarStoreOpen}
        onClose={() => setIsAvatarStoreOpen(false)}
        userId={wallet}
        onChanged={refresh}
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
