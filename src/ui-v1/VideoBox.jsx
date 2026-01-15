import React from 'react'

export default function VideoBox({ src }) {
  if (!src) return null
  return (
    <div className="kudiVideoBox">
      <div className="kudiVideoFrame" aria-label="KUDI video banner">
        <video
          className="kudiVideoEl"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      </div>
    </div>
  )
}
