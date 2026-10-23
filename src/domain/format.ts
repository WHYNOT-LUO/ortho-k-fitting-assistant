/**
 * Small number helpers shared by the rules, summaries and demo data, so every
 * screen rounds and prints values the same way.
 */

/**
 * Round to 0.01 before comparing with a threshold. Avoids floating-point
 * surprises like 42.8 − 42.3 = 0.5000000000000071 tripping a "> 0.5" rule.
 */
export const round2 = (x: number): number => Math.round(x * 100) / 100;

/** Signed value with a typographic minus: +1.25, −3.00, 0.00. */
export function formatSigned(value: number | null, decimals = 2): string {
  if (value === null || !Number.isFinite(value)) return '';
  const s = Math.abs(value).toFixed(decimals);
  return value > 0 ? `+${s}` : value < 0 ? `−${s}` : s;
}

/** Fixed decimals with a typographic minus for negatives (e.g. limits like −6.00). */
export function formatFixed(value: number, decimals = 2): string {
  return value < 0 ? `−${Math.abs(value).toFixed(decimals)}` : value.toFixed(decimals);
}
