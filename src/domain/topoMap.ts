/**
 * SIMULATED corneal topography maps for the synthetic demo cases.
 *
 * These pictures are drawn from a case's numbers with a simple textbook
 * model. They are NOT real scans and carry no information beyond the numbers
 * they are made from. A real cornea can be irregular (e.g. keratoconus) in
 * ways a smooth model would hide, so the app only shows them for synthetic
 * cases.
 *
 * Model
 *  - Shape: a toric conic. Along each meridian the cornea flattens away from
 *    the centre according to the e-value; at 5 mm (radius 2.5 mm) its power
 *    equals the 5 mm Sim K for that meridian (K1 on the flat axis, K2 on the
 *    steep axis), so the map agrees with the case data at the main reference.
 *    Axial (sagittal) power: K = 337.5 / sqrt(R0² + e²·r²).
 *  - After ortho-k wear: the centre flattens by the achieved correction, and
 *    a steeper ring forms at about 2.5 mm from the treatment centre
 *    (optical zone about 3.5 mm across, as in Faria-Ribeiro et al., 2016).
 *    If the visit is marked "red inside the central 3 mm", the treatment
 *    zone is drawn decentred so the ring crosses the centre.
 *
 * Colours: absolute scale, 0.5 D steps from 37 to 49 D, blue = flat,
 * red = steep (the convention the clinic notes describe).
 */
import { analyzeCentralRed, type CentralRedResult } from './topoImage';
import { sortVisits } from './followup';
import type { Eye, EyeExam, OrthoKCase, Visit } from './types';

/** Keratometric index conversion: K (D) = 337.5 / radius (mm). */
const N = 337.5;

export type ModelSource = 'topography5' | 'keratometer' | 'biometer';

export interface CorneaModel {
  k1: number;
  k1Axis: number;
  k2: number;
  k2Axis: number;
  e: number;
  source: ModelSource;
  /** Inputs the model had to assume (shown under the map). */
  assumed: ('axes' | 'e')[];
}

const DEFAULT_E = 0.5;

export function corneaModel(exam: EyeExam): CorneaModel | null {
  const { topography: t, basic: b, biometry: m } = exam;
  const pick =
    t.simK1_5 !== null && t.simK2_5 !== null
      ? { k1: t.simK1_5, a1: t.simK1Axis_5, k2: t.simK2_5, a2: t.simK2Axis_5, source: 'topography5' as const }
      : b.kK1 !== null && b.kK2 !== null
        ? { k1: b.kK1, a1: b.kK1Axis, k2: b.kK2, a2: b.kK2Axis, source: 'keratometer' as const }
        : m.k1 !== null && m.k2 !== null
          ? { k1: m.k1, a1: m.k1Axis, k2: m.k2, a2: m.k2Axis, source: 'biometer' as const }
          : null;
  if (!pick) return null;

  const assumed: CorneaModel['assumed'] = [];
  // Axes: from the same instrument if given, else borrow another instrument's.
  let k1Axis = pick.a1 ?? b.kK1Axis ?? t.simK1Axis_5 ?? m.k1Axis;
  const a2 = pick.a2 ?? b.kK2Axis ?? t.simK2Axis_5 ?? m.k2Axis;
  if (k1Axis === null) {
    // Flat axis unknown: use the other axis if we have it, else "with-the-rule" (flat at 180°).
    k1Axis = a2 !== null ? (a2 + 90) % 180 : 180;
    assumed.push('axes');
  }
  const e = t.e6 ?? t.e7 ?? t.e8;
  if (e === null) assumed.push('e');
  // K1 is the flatter one by definition; swap if entered the other way round.
  const [k1, k2] = pick.k1 <= pick.k2 ? [pick.k1, pick.k2] : [pick.k2, pick.k1];
  const flatAxis = pick.k1 <= pick.k2 ? k1Axis : (k1Axis + 90) % 180;
  return { k1, k1Axis: flatAxis, k2, k2Axis: (flatAxis + 90) % 180, e: e ?? DEFAULT_E, source: pick.source, assumed };
}

/** 5 mm power along a meridian (degrees, 0 = 3 o'clock, counter-clockwise). */
function meridianK(m: CorneaModel, thetaDeg: number): number {
  const d = ((thetaDeg - m.k1Axis) * Math.PI) / 180;
  return m.k1 * Math.cos(d) ** 2 + m.k2 * Math.sin(d) ** 2;
}

/** Axial power (D) at distance r (mm) from the centre along meridian theta. */
export function axialPower(m: CorneaModel, rMm: number, thetaDeg: number): number {
  const rs5 = N / meridianK(m, thetaDeg); // sagittal radius at r = 2.5 mm
  // Positive e = prolate (flattens outward). A negative value is read as oblate (steepens outward).
  const e2 = m.e >= 0 ? m.e * m.e : -(m.e * m.e);
  const r0sq = rs5 * rs5 - e2 * 2.5 * 2.5;
  return N / Math.sqrt(Math.max(1, r0sq + e2 * rMm * rMm));
}

export interface Treatment {
  /** Achieved flattening in D (≈ myopia corrected). */
  amountD: number;
  /** Treatment-zone centre offset from the corneal centre, mm (x right, y down as viewed). */
  offsetMm: { x: number; y: number };
}

/** Change in power caused by ortho-k at distance d (mm) from the treatment centre. */
export function treatmentChange(t: Treatment, dMm: number): number {
  const flat = -t.amountD / (1 + (dMm / 1.6) ** 8); // flat-topped central zone ≈ 3.2–3.5 mm
  const ringHeight = 1.2 * t.amountD + 1;
  const ring = ringHeight * Math.exp(-(((dMm - 2.5) / 0.55) ** 2));
  return flat + ring;
}

// --------------------------------------------------------------- colours

export const SCALE_MIN = 37;
export const SCALE_STEP = 0.5;
/** 24 colours, flat → steep. Reds start at 46.0 D (so the R12 image check sees them as red). */
export const SCALE_COLORS = [
  '#1a0a5e', '#21207f', '#1f3a9e', '#1d55c0', '#1f6fdb', '#2b8ae8', // 37.0–39.5 deep → mid blue
  '#3ea4ef', '#58bdf2', '#74d2ee', '#7fdccb', '#6fd59a', '#7ccf6a', // 40.0–42.5 light blue → green
  '#a3d651', '#cbe04a', '#efe74a', '#ffd23c', '#ffae2a', '#ff8c1a', // 43.0–45.5 yellow-green → orange (no red)
  '#f04a24', '#e02a1c', '#c81818', '#aa1212', '#8c0c0c', '#700808', // 46.0–48.5 red → dark red
] as const;

export function colorIndex(powerD: number): number {
  const i = Math.floor((powerD - SCALE_MIN) / SCALE_STEP);
  return Math.min(SCALE_COLORS.length - 1, Math.max(0, i));
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const RGB = SCALE_COLORS.map(hexToRgb);

export function colorFor(powerD: number): [number, number, number] {
  return RGB[colorIndex(powerD)];
}

// --------------------------------------------------------------- rendering

/** Radius of the drawn map in mm (a 9 mm wide map, like most topographers show). */
export const MAP_RADIUS_MM = 4.5;

export interface RenderedMap {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  pxPerMm: number;
  centre: { x: number; y: number };
}

/** Paint a power function into an RGBA buffer; outside the map stays transparent. */
export function renderMap(power: (xMm: number, yMm: number) => number, sizePx: number): RenderedMap {
  const data = new Uint8ClampedArray(sizePx * sizePx * 4);
  const pxPerMm = sizePx / (2 * MAP_RADIUS_MM);
  const c = sizePx / 2;
  for (let py = 0; py < sizePx; py++) {
    for (let px = 0; px < sizePx; px++) {
      const x = (px + 0.5 - c) / pxPerMm;
      const y = (py + 0.5 - c) / pxPerMm;
      if (x * x + y * y > MAP_RADIUS_MM * MAP_RADIUS_MM) continue;
      const [r, g, b] = colorFor(power(x, y));
      data.set([r, g, b, 255], (py * sizePx + px) * 4);
    }
  }
  return { data, width: sizePx, height: sizePx, pxPerMm, centre: { x: c, y: c } };
}

/** Meridian angle (TABO: 0° at 3 o'clock, counter-clockwise) of a point on the map. */
function thetaOf(xMm: number, yMm: number): number {
  return ((Math.atan2(-yMm, xMm) * 180) / Math.PI + 360) % 180;
}

export function preFitPower(m: CorneaModel) {
  return (x: number, y: number) => axialPower(m, Math.hypot(x, y), thetaOf(x, y));
}

export function postWearPower(m: CorneaModel, t: Treatment) {
  return (x: number, y: number) =>
    axialPower(m, Math.hypot(x, y), thetaOf(x, y)) + treatmentChange(t, Math.hypot(x - t.offsetMm.x, y - t.offsetMm.y));
}

// --------------------------------------------------------------- per visit

const DECENTRATION_MM = 1.3;

/**
 * Treatment for a follow-up visit, from the data: amount = baseline myopia,
 * less any residual myopia (or plus any over-correction) on over-refraction.
 * Decentred when the visit is marked "red inside the central 3 mm".
 */
export function visitTreatment(c: OrthoKCase, eye: Eye, visit: Visit): Treatment | null {
  const sphere = c.eyes[eye].basic.sphere;
  if (sphere === null || sphere >= 0) return null;
  const v = visit.eyes[eye];
  const amountD = Math.max(0.5, -sphere + (v.overRefraction ?? 0));
  // Drawn as seen by the examiner: the right eye's temporal side is on the left.
  const temporal = eye === 'OD' ? -1 : 1;
  const offsetMm = v.redInCentral3mm
    ? { x: temporal * DECENTRATION_MM * 0.92, y: DECENTRATION_MM * 0.4 } // infero-temporal
    : { x: 0, y: 0 };
  return { amountD, offsetMm };
}

/** Follow-up visits after the lens was first delivered: the ones with a post-wear map. */
export function postWearVisits(c: OrthoKCase): Visit[] {
  const visits = sortVisits(c.visits);
  const delivered = visits.findIndex((v) => v.kind === 'delivery');
  if (delivered < 0) return [];
  return visits.slice(delivered + 1).filter((v) => v.kind === 'follow-up');
}

/** Render a post-wear map and run the experimental red-in-centre check on it. */
export function simulatePostWear(
  c: OrthoKCase,
  eye: Eye,
  visit: Visit,
  sizePx: number,
): { map: RenderedMap; check: CentralRedResult; treatment: Treatment } | null {
  const model = corneaModel(c.eyes[eye]);
  const treatment = visitTreatment(c, eye, visit);
  if (!model || !treatment) return null;
  const map = renderMap(postWearPower(model, treatment), sizePx);
  return { map, check: analyzeCentralRed(map, map.centre, map.pxPerMm), treatment };
}
