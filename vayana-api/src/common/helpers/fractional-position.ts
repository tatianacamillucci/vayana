/**
 * Fractional positioning helpers for ordered entities (phases, tasks).
 *
 * Uses fractional indexing to allow inserting items between existing items
 * without reordering all positions. When gaps become too small, a rebalance
 * redistributes positions evenly.
 */

export const REBALANCE_THRESHOLD = 0.001;

/**
 * Calculate a position between two existing positions.
 * - No prev, no next: returns 1.0 (first item)
 * - No prev: returns next - 1.0 (insert before)
 * - No next: returns prev + 1.0 (insert after)
 * - Both: returns average (insert between)
 */
export function calculatePosition(prev?: number, next?: number): number {
  if (prev == null && next == null) {
    return 1.0;
  }
  if (prev == null) {
    return next! - 1.0;
  }
  if (next == null) {
    return prev + 1.0;
  }
  return (prev + next) / 2;
}

/**
 * Check if any adjacent positions are too close together,
 * indicating a rebalance is needed.
 */
export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) {
    return false;
  }

  const sorted = [...positions].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < REBALANCE_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/**
 * Generate evenly spaced positions for a given count of items.
 * Returns [1.0, 2.0, 3.0, ...] for clean integer spacing.
 */
export function rebalancePositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1.0);
}
