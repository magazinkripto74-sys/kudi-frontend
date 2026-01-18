import React from "react";

export default function AquariumBanner() {
  return (
    <div className="aquariumBannerWrap" aria-label="Aquarium video banner">
      <div className="aquariumBannerCard">
        <video
          className="aquariumBannerVideo"
          src="/media/aquarium.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="aquariumBannerGlow" />
      </div>
    </div>
  );
}
