// src/components/Skeleton.tsx — reusable loading skeleton placeholders
import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: CSSProperties;
}

export function Skeleton({ width = '100%', height = 14, borderRadius = 4, style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius, display: 'block', ...style }}
    />
  );
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Skeleton width={8} height={8} borderRadius={999} />
      <Skeleton width="45%" height={14} />
      <Skeleton width="12%" height={22} borderRadius={999} style={{ marginLeft: 'auto' }} />
      <Skeleton width="10%" height={22} borderRadius={999} />
      <Skeleton width="10%" height={14} />
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton width="60%" height={16} />
      <Skeleton width="80%" height={12} />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Skeleton width={60} height={22} borderRadius={999} />
        <Skeleton width={70} height={22} borderRadius={999} />
      </div>
    </div>
  );
}

export function SkeletonTaskRows({ count = 5 }: { count?: number }) {
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}
