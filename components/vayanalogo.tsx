export function VayanaLogo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vayanaGrad" x1="8" y1="8" x2="80" y2="80"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c5cfc" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      <line x1="18" y1="66" x2="44" y2="24" stroke="url(#vayanaGrad)"
        strokeWidth="3" strokeOpacity="0.5" />
      <line x1="44" y1="24" x2="70" y2="66" stroke="url(#vayanaGrad)"
        strokeWidth="3" strokeOpacity="0.5" />
      <circle cx="44" cy="24" r="10" fill="url(#vayanaGrad)" />
      <circle cx="18" cy="66" r="7"  fill="#7c5cfc" opacity="0.85" />
      <circle cx="70" cy="66" r="7"  fill="#a78bfa" opacity="0.85" />
      <circle cx="31" cy="45" r="4"  fill="#7c5cfc" opacity="0.45" />
      <circle cx="57" cy="45" r="4"  fill="#7c5cfc" opacity="0.45" />
    </svg>
  );
}