import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 32, height: 32, display: "flex" }}>
      <svg viewBox="0 0 88 88" width="32" height="32">
        <line x1="18" y1="66" x2="44" y2="24"
          stroke="#a78bfa" strokeWidth="5" strokeOpacity="0.7" />
        <line x1="44" y1="24" x2="70" y2="66"
          stroke="#a78bfa" strokeWidth="5" strokeOpacity="0.7" />
        <circle cx="44" cy="24" r="13" fill="#7c5cfc" />
        <circle cx="18" cy="66" r="10" fill="#7c5cfc" opacity="0.8" />
        <circle cx="70" cy="66" r="10" fill="#a78bfa" opacity="0.8" />
      </svg>
    </div>,
    { ...size }
  );
}