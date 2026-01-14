// src/ui-v1/KudiSideMenu.jsx
import React, { useMemo, useState, useEffect } from 'react'
import { MENU_ORDER, MENU_CONTENT } from './menuContent.en'
import './kudiSideMenu.css'

/**
 * KudiSideMenu (SAFE)
 * - Pure UI component, does not touch existing game logic.
 * - You decide where to mount it (recommended: top-left header area).
 *
 * Optional props:
 * - onConnectWallet(): open/connect wallet flow
 * - onOpenAvatarStore(): navigate to Avatar Store view
 */
export default function KudiSideMenu({ onConnectWallet, onOpenAvatarStore }) {
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState(null)

  const active = useMemo(() => (activeKey ? MENU_CONTENT[activeKey] : null), [activeKey])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        setActiveKey(null)
      }
    }
    if (open) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const closeAll = () => {
    setOpen(false)
    setActiveKey(null)
  }

  const handleItem = (key) => {
    if (key === 'connect' && typeof onConnectWallet === 'function') {
      closeAll()
      onConnectWallet()
      return
    }
    if (key === 'avatar' && typeof onOpenAvatarStore === 'function') {
      closeAll()
      onOpenAvatarStore()
      return
    }
    setActiveKey(key)
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button className="kudi-hamburger" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
        <span style={{ fontSize: 16 }}>☰</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Menu</span>
      </button>

      {open ? <div className="kudi-drawer-overlay" onClick={closeAll} /> : null}

      <div className={'kudi-drawer' + (open ? ' open' : '')} role="dialog" aria-modal="true">
        <div className="kudi-drawer-header">
          <div className="kudi-drawer-title">KUDI SKUNK</div>
          <button className="kudi-drawer-close" type="button" onClick={closeAll} aria-label="Close menu">
            ✕
          </button>
        </div>

        <div className="kudi-drawer-nav">
          {MENU_ORDER.map((it) => (
            <button key={it.key} className="kudi-drawer-item" type="button" onClick={() => handleItem(it.key)}>
              {it.label}
            </button>
          ))}
        </div>

        {active ? (
          <div className="kudi-drawer-content">
            <div className="kudi-content-title">{active.title}</div>
            <div className="kudi-content-body">{(active.body || []).join('\n')}</div>
            <div className="kudi-content-actions">
              <button className="kudi-content-btn" type="button" onClick={() => setActiveKey(null)}>
                Back
              </button>
              <button className="kudi-content-btn" type="button" onClick={closeAll}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
