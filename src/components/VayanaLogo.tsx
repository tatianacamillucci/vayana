import React, { useState } from 'react';

interface VayanaLogoProps {
  size?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
}

export function VayanaLogo({
  size = 24,
  showWordmark = false,
  wordmarkSize = 20,
}: VayanaLogoProps): React.ReactElement {
  const [isMotionPaused, setIsMotionPaused] = useState(false);
  const flowDurationSeconds = 4.8;

  const tunnelDots = Array.from({ length: 24 }, (_, index) => {
    const t = index / 23; // 0 outer, 1 inner
    const turns = 2.35;
    const angle = -Math.PI / 2 + turns * Math.PI * 2 * (1 - t);
    const radius = 31 - 25.5 * t;
    const dotRadius = 4.9 - 2.9 * t;
    return {
      cx: 44 + Math.cos(angle) * radius,
      cy: 44 + Math.sin(angle) * radius,
      r: dotRadius,
      o: 0.34 + (1 - t) * 0.62,
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.4 }}>
      <svg
        className={`vayana-logo-mark ${isMotionPaused ? 'is-paused' : ''}`}
        width={size}
        height={size}
        viewBox="0 0 88 88"
        fill="none"
        aria-hidden="true"
        onClick={() => setIsMotionPaused((prev) => !prev)}
      >
        <defs>
          <radialGradient id="vg-tunnel" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(44 44) rotate(90) scale(38)">
            <stop offset="0%" stopColor="var(--logo-dot-inner)" />
            <stop offset="65%" stopColor="var(--logo-dot-mid)" />
            <stop offset="100%" stopColor="var(--logo-dot-outer)" />
          </radialGradient>
        </defs>
        <g className="vayana-logo-tunnel">
          {tunnelDots.map((dot, index) => (
            <circle
              key={`tunnel-${index}`}
              className="vayana-logo-dot-flow"
              style={{ animationDelay: `${(index * flowDurationSeconds) / (tunnelDots.length - 1)}s` }}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill="url(#vg-tunnel)"
              opacity={dot.o}
            />
          ))}
        </g>
        <circle className="vayana-logo-core-pulse" cx="44" cy="44" r="2.2" fill="var(--logo-core-color)" opacity="0.95" />
      </svg>

      {showWordmark && (
        <span
          className="logo-wordmark"
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 500,
            fontSize: wordmarkSize,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: 'var(--logo-wordmark-color)',
          }}
        >
          vay
          <span className="logo-wordmark-accent">
            ana
          </span>
        </span>
      )}
    </div>
  );
}
