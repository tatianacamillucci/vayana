import React from 'react';

interface VayanaBrandLogoProps {
  size?: number;
}

export function VayanaBrandLogo({ size = 24 }: VayanaBrandLogoProps): React.ReactElement {
  return (
    <span className="vayana-brand" aria-label="vayana">
      <svg
        className="vayana-brand-icon"
        width={size}
        height={size}
        viewBox="0 0 88 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <line x1="18" y1="66" x2="44" y2="24" stroke="#8a6cff" strokeWidth="4.2" strokeOpacity="0.55" />
        <line x1="44" y1="24" x2="70" y2="66" stroke="#8a6cff" strokeWidth="4.2" strokeOpacity="0.55" />
        <line x1="18" y1="66" x2="70" y2="66" stroke="#8a6cff" strokeWidth="3.2" strokeOpacity="0.32" />
        <circle cx="44" cy="24" r="12" fill="#b19bff" />
        <circle cx="18" cy="66" r="9" fill="#7c5cfc" />
        <circle cx="70" cy="66" r="9" fill="#8a6cff" />
      </svg>
      <span className="logo-wordmark">vayana</span>
    </span>
  );
}
