// src/ui-v1/SocialLinks.jsx
import React from 'react'

export default function SocialLinks({ links }) {
  const L = links || {}
  return (
    <span className="kudiSocialRow" aria-label="Official links">
      <a className="kudiSocialIcon" href={L.x} target="_blank" rel="noreferrer" aria-label="X" title="X">
        𝕏
      </a>
      <a className="kudiSocialIcon" href={L.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" title="Instagram">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5v-9A3.5 3.5 0 0 0 16.5 4Zm-4.5 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm5.2-.9a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>
        </svg>
      </a>
      <a className="kudiSocialIcon" href={L.telegram} target="_blank" rel="noreferrer" aria-label="Telegram" title="Telegram">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M21.8 4.6c.3-1.2-1-2.2-2.2-1.7L2.9 9.6c-1.4.6-1.3 2.7.2 3.1l4.7 1.3 1.8 5.7c.4 1.2 1.9 1.5 2.7.7l2.6-2.6 5 3.7c1 .7 2.4.2 2.7-1l4.2-15.5Zm-4.8 3.4-7.5 6.8-.3 3.5-1.6-5 9.4-5.3Z"/>
        </svg>
      </a>
      <a className="kudiSocialIcon" href={L.web} target="_blank" rel="noreferrer" aria-label="Website" title="Website">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.9 9h-3.2a15.7 15.7 0 0 0-1.2-6 8.1 8.1 0 0 1 4.4 6ZM12 4c1 1.4 1.9 3.7 2.3 7H9.7c.4-3.3 1.3-5.6 2.3-7ZM4.1 13h3.2c.2 2.1.7 4.1 1.2 6a8.1 8.1 0 0 1-4.4-6Zm3.2-2H4.1a8.1 8.1 0 0 1 4.4-6c-.5 1.9-1 3.9-1.2 6ZM12 20c-1-1.4-1.9-3.7-2.3-7h4.6c-.4 3.3-1.3 5.6-2.3 7Zm3.5-.9c.5-1.9 1-3.9 1.2-6h3.2a8.1 8.1 0 0 1-4.4 6Z"/>
        </svg>
      </a>
      <a className="kudiSocialIcon" href={L.mail} aria-label="Email" title="Email">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"/>
        </svg>
      </a>
    </span>
  )
}
