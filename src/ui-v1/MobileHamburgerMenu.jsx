import React, { useEffect, useMemo, useState } from 'react'
import './mobileHamburgerMenu.css'

/**
 * MobileHamburgerMenu (drawer + accordion)
 *
 * Critical layout is enforced with inline styles so the drawer stays fixed
 * even if CSS is not loaded or gets overridden.
 */
export default function MobileHamburgerMenu({
  open,
  onClose,
  onNavigate = () => {},
  onConnectWallet = null,
  onOpenAvatarStore = null,
}) {
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const sections = useMemo(
    () => [
      {
        key: 'wallet_avatar',
        title: 'Wallet & Avatar',
        items: [
          {
            label: 'Connect Wallet',
            action: () => (onConnectWallet ? onConnectWallet() : onNavigate('connect')),
          },
          {
            label: 'Avatar Store',
            action: () => (onOpenAvatarStore ? onOpenAvatarStore() : onNavigate('avatar_store')),
          },
        ],
      },
      {
        key: 'about',
        title: 'About Us',
        body: [
          'KUDI SKUNK is part of the 4T Ecosystem — a playful, community-first Web3 universe.',
          'The dashboard is built to be simple: connect a wallet, complete tasks, collect EP, and unlock perks.',
          'We focus on clarity, consistency, and a smooth mobile experience.',
        ],
      },
      {
        key: 'mission',
        title: 'Mission',
        body: [
          'Make daily on-chain culture approachable and fun.',
          'Reward consistent participation with clear, transparent progression.',
          'Build a friendly ecosystem that welcomes newcomers and supports long-term players.',
        ],
      },
      {
        key: 'vision',
        title: 'Vision',
        body: [
          'A lightweight “daily hub” where community actions turn into progress.',
          'A connected ecosystem: Skunk, Chit Chat, Energy Skunk Game, Mover, 4T Coin, and Avatar Series.',
          'Mobile-first, fast, and easy — without sacrificing trust and transparency.',
        ],
      },
      {
        key: 'what',
        title: 'What is KUDI SKUNK?',
        body: [
          'A gamified dashboard where your actions become progress.',
          'You earn EP (Energy Points) from daily tasks and community actions.',
          'EP improves your visibility (leaderboards) and unlocks perks and future features.',
          'Tip: consistency beats one-time spikes.',
        ],
      },
      {
        key: 'howto',
        title: 'How to Play / Guide',
        body: [
          '1) Connect your wallet to start.',
          '2) Complete daily tasks to earn EP.',
          '3) Track your rank and progress on the leaderboard.',
          '4) Optional: explore packages and referrals to grow your network.',
          '5) Keep showing up — daily reset happens at 00:00 UTC.',
        ],
      },
      {
        key: 'faq',
        title: 'Skunk Project (FAQ)',
        body: [
          'Is this a game? It’s a dashboard with game-like progression.',
          'Do I need crypto experience? No — just connect a wallet and follow the prompts.',
          'Where do rewards come from? From the system rules shown in the app.',
          'Can I participate on mobile? Yes — the UI is designed for mobile usage.',
        ],
      },
      {
        key: 'packages',
        title: 'Packages',
        body: [
          'Starter — 5 USDC → 10% direct package referral',
          'Pro — 50 USDC → 20% direct package referral',
          'Elite (Recommended) — 100 USDC → 25% direct package referral',
        ],
      },
      {
        key: 'referrals',
        title: 'Rewards & Referrals',
        body: [
          'Network:',
          'L1 = 5%',
          'L2 = 2%',
          '',
          'When your invitee buys a package, you earn the direct package referral percentage.',
          'L1/L2 are additional earnings based on network volume.',
        ],
      },
      {
        key: 'legal',
        title: 'Legal',
        body: [
          'Copyright & Legal: All names, logos, and artwork belong to their respective owners.',
          'Terms: By using this dashboard, you agree to follow the displayed rules and use it responsibly.',
          'Privacy: We minimize data collection and store only what is needed to operate the app.',
          '',
          'Reminder: Always do your own research (DYOR). Web3 assets can be volatile and involve risk.',
        ],
      },
    ],
    [onConnectWallet, onOpenAvatarStore, onNavigate]
  )

  if (!open) return null

  const rootStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
  }

  const backdropStyle = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  }

  const panelStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: 'min(360px, 88vw)',
    background: 'rgba(10, 12, 18, 0.92)',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.65)',
    overflowY: 'auto',
  }

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 14px 10px 14px',
  }

  const titleStyle = {
    fontWeight: 800,
    letterSpacing: '0.08em',
    fontSize: 14,
  }

  return (
    <div className="kudiDrawerRoot" style={rootStyle}>
      <div className="kudiDrawerBackdrop" style={backdropStyle} onClick={onClose} />
      <div className="kudiDrawerPanel" style={panelStyle} role="dialog" aria-modal="true">
        <div className="kudiDrawerHeader" style={headerStyle}>
          <div className="kudiDrawerTitle" style={titleStyle}>
            KUDI SKUNK
          </div>
          <button className="kudiCloseBtn" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </div>

        <div className="kudiDrawerBody">
          {sections.map((s) => {
            const isOpen = expanded === s.key
            return (
              <div key={s.key} className="kudiAccItem">
                <button
                  className="kudiAccHeader"
                  onClick={() => setExpanded(isOpen ? null : s.key)}
                  aria-expanded={isOpen}
                >
                  <span>{s.title}</span>
                  <span className="kudiAccChevron">{isOpen ? '▴' : '▾'}</span>
                </button>

                {isOpen && (
                  <div className="kudiAccBody">
                    {s.items ? (
                      <div className="kudiAccActions">
                        {s.items.map((it) => (
                          <button
                            key={it.label}
                            className="kudiActionBtn"
                            onClick={() => {
                              it.action?.()
                              onClose?.()
                            }}
                          >
                            {it.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="kudiAccText">
                        {s.body?.map((line, idx) =>
                          line === '' ? (
                            <div key={idx} style={{ height: 10 }} />
                          ) : (
                            <p key={idx}>{line}</p>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <button className="kudiBackBtn" onClick={onClose}>
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
