// src/ui-v1/UiV1Root.jsx
import React from 'react'

export default function UiV1Root() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>UI V1 Active</div>
        <div style={{ opacity: 0.8, lineHeight: 1.5 }}>
          This is a safe placeholder. If anything goes wrong, set
          <b> VITE_UI_V1_ENABLED=false </b>
          in Vercel and redeploy.
        </div>
      </div>
    </div>
  )
}
