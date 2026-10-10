// apps/web/src/lib/crash-calibration.ts

/**
 * Calibrated Horizontal Progress Mapping for Aviator-style Crash Game.
 *
 * Requirements:
 * - 1.00x: airplane near left start (3–5% across canvas) -> 0.04 (4%)
 * - 1.20x: approximately 22–28% across -> 0.25 (25%)
 * - 1.50x: approximately 48–52% across -> 0.50 (50% - EXACTLY HALFWAY!)
 * - 2.00x: approximately 65–72% across -> 0.68 (68%)
 * - 3.00x: approximately 80–85% across -> 0.82 (82%)
 * - Higher multipliers: progressively approach right edge (up to 0.94)
 */
export function getCalibratedXRatio(multiplier: number): number {
  if (multiplier <= 1.00) return 0.04;

  const points = [
    { m: 1.00, x: 0.04 },
    { m: 1.20, x: 0.25 },
    { m: 1.50, x: 0.50 }, // Halfway across canvas at 1.50x!
    { m: 2.00, x: 0.68 },
    { m: 3.00, x: 0.82 },
    { m: 5.00, x: 0.87 },
    { m: 10.00, x: 0.90 },
    { m: 50.00, x: 0.93 },
    { m: 100.00, x: 0.94 },
  ];

  if (multiplier >= points[points.length - 1].m) {
    return points[points.length - 1].x;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (multiplier >= p0.m && multiplier <= p1.m) {
      const t = (multiplier - p0.m) / (p1.m - p0.m);
      const easeT = t * t * (3 - 2 * t); // smoothstep interpolation
      return p0.x + (p1.x - p0.x) * easeT;
    }
  }

  return 0.94;
}

/**
 * Calibrated Vertical Progress Mapping.
 * Starts near bottom-left edge and curves upward smoothly.
 */
export function getCalibratedYRatio(multiplier: number): number {
  if (multiplier <= 1.00) return 0.82; // Near runway bottom

  const points = [
    { m: 1.00, y: 0.82 },
    { m: 1.20, y: 0.72 },
    { m: 1.50, y: 0.56 }, // Smoothly elevated halfway
    { m: 2.00, y: 0.42 },
    { m: 3.00, y: 0.30 },
    { m: 5.00, y: 0.22 },
    { m: 10.00, y: 0.18 },
    { m: 50.00, y: 0.14 },
    { m: 100.00, y: 0.13 },
  ];

  if (multiplier >= points[points.length - 1].m) {
    return points[points.length - 1].y;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    if (multiplier >= p0.m && multiplier <= p1.m) {
      const t = (multiplier - p0.m) / (p1.m - p0.m);
      const easeT = t * t * (3 - 2 * t);
      return p0.y + (p1.y - p0.y) * easeT;
    }
  }

  return 0.13;
}
