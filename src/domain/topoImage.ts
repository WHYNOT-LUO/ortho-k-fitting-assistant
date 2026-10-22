/**
 * Stretch goal (EXPERIMENTAL): look for red inside the central 3 mm of a
 * post-wear topography map image (rule R12, threshold I1).
 *
 * On a curvature map red = steeper. After good ortho-k wear the central
 * 3 mm is yellow to blue (flattened) and a red ring sits further out. If the
 * lens is decentred, the ring moves and red shows up inside the centre.
 *
 * The user marks the map centre and the scale (pixels per mm); this code
 * then counts red pixels. It works on raw RGBA pixels, so it can be tested
 * without a browser. It is not validated on real maps and is shown as a hint
 * only.
 */
import { clinicRules } from '../config/clinicRules';

export interface Rgba {
  data: Uint8ClampedArray | number[];
  width: number;
  height: number;
}

/** Red-ish: hue within ±20° of pure red, clearly saturated and not dark. */
export function isRed(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 90) return false; // too dark (e.g. black text, grid lines)
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.45) return false; // grey/white background
  if (max !== r) return false;
  const hue = (60 * (g - b)) / (max - min); // −60..60 when red is the max channel
  return hue >= -20 && hue <= 20;
}

export interface CentralRedResult {
  /** Share of pixels inside the central zone that are red (0–1). */
  redFraction: number;
  pixelsChecked: number;
  flagged: boolean;
  threshold: number;
  /**
   * Where the red pixels within twice the zone radius cluster, relative to
   * the centre, in mm (x right, y down). A rough hint of decentration
   * direction; null if there is no red nearby.
   */
  redCentroidOffsetMm: { x: number; y: number; distance: number } | null;
}

export function analyzeCentralRed(
  img: Rgba,
  centre: { x: number; y: number },
  pxPerMm: number,
  zoneDiameterMm = clinicRules.followUp.centralRed.zoneDiameterMm,
  threshold = clinicRules.imageCheck.centralRedFraction.redFractionThreshold,
): CentralRedResult {
  const r = (zoneDiameterMm / 2) * pxPerMm;
  const outer = 2 * r;
  let inside = 0;
  let redInside = 0;
  let sx = 0;
  let sy = 0;
  let nRed = 0;

  const x0 = Math.max(0, Math.floor(centre.x - outer));
  const x1 = Math.min(img.width - 1, Math.ceil(centre.x + outer));
  const y0 = Math.max(0, Math.floor(centre.y - outer));
  const y1 = Math.min(img.height - 1, Math.ceil(centre.y + outer));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - centre.x;
      const dy = y - centre.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > outer * outer) continue;
      const i = (y * img.width + x) * 4;
      const red = isRed(img.data[i], img.data[i + 1], img.data[i + 2]);
      if (d2 <= r * r) {
        inside++;
        if (red) redInside++;
      }
      if (red) {
        sx += dx;
        sy += dy;
        nRed++;
      }
    }
  }

  const redFraction = inside ? redInside / inside : 0;
  const offset =
    nRed > 0
      ? (() => {
          const x = sx / nRed / pxPerMm;
          const y = sy / nRed / pxPerMm;
          return { x, y, distance: Math.hypot(x, y) };
        })()
      : null;

  return { redFraction, pixelsChecked: inside, flagged: redFraction > threshold, threshold, redCentroidOffsetMm: offset };
}
