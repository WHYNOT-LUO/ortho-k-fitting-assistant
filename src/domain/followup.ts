/**
 * Part 4: follow-up checks.
 *
 *  - R11  axial length growth over time (the main myopia-control measure)
 *  - R12  red inside the central 3 mm on post-wear topography
 *  - R13  over-refraction shows residual myopia (not enough force)
 *  - R14  over-refraction shows over-correction / hyperopia (too much force)
 *  - R15  fluorescein tear layer too thick in one direction (trial lens)
 *  - G1   supplier guide: which way to adjust after a fluorescein check
 *
 * Thresholds come from config/clinicRules.ts.
 */
import { clinicRules } from '../config/clinicRules';
import type { Flag, Level } from './screening';
import type { Adjustment, Eye, Fluorescein, OrthoKCase, TrialLens, Visit } from './types';

const r2 = (x: number) => Math.round(x * 100) / 100;
const fmtSigned = (x: number) => (x > 0 ? `+${x.toFixed(2)}` : x.toFixed(2));
const DAY_MS = 24 * 60 * 60 * 1000;
/** A "6-month" visit is often booked a few days early; allow about a week. */
const GAP_TOLERANCE_MONTHS = 0.25;

function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1) / DAY_MS;
}

export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}

export function monthsBetween(a: string, b: string): number {
  return daysBetween(a, b) / (365.25 / 12);
}

export function sortVisits(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => a.date.localeCompare(b.date));
}

export interface AxialPoint {
  date: string;
  al: number;
  source: 'baseline' | 'visit';
  visitId?: string;
}

/** Axial length readings for one eye: the exam (baseline) plus every visit that measured it. */
export function axialSeries(c: OrthoKCase, eye: Eye): AxialPoint[] {
  const points: AxialPoint[] = [];
  const baseline = c.eyes[eye].biometry.al;
  if (baseline !== null && c.examDate) points.push({ date: c.examDate, al: baseline, source: 'baseline' });
  for (const v of sortVisits(c.visits)) {
    const al = v.eyes[eye].al;
    if (al !== null && v.date) points.push({ date: v.date, al, source: 'visit', visitId: v.id });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export interface AxialGrowth {
  from: AxialPoint | null;
  to: AxialPoint | null;
  months: number;
  mm: number;
  mmPerYear: number;
  flag: Flag | null;
}

/**
 * R11: compare the latest reading with the one closest to `windowMonths`
 * earlier (at least `minGapMonths` apart), and scale the growth to mm/year.
 */
export function axialGrowth(c: OrthoKCase, eye: Eye): AxialGrowth {
  const rule = clinicRules.followUp.axialGrowth;
  const series = axialSeries(c, eye);
  const none: AxialGrowth = { from: null, to: null, months: 0, mm: 0, mmPerYear: 0, flag: null };
  if (series.length < 2) return none;

  const to = series[series.length - 1];
  const earlier = series.slice(0, -1);
  const candidates = earlier.filter((p) => monthsBetween(p.date, to.date) >= rule.minGapMonths - GAP_TOLERANCE_MONTHS);

  if (candidates.length === 0) {
    const months = monthsBetween(earlier[0].date, to.date);
    return {
      ...none,
      from: earlier[0],
      to,
      months,
      mm: r2(to.al - earlier[0].al),
      flag: makeFlag('R11', 'R11.tooSoon', 'info', eye, { months: months.toFixed(1), min: rule.minGapMonths }),
    };
  }

  const from = candidates.reduce((best, p) =>
    Math.abs(monthsBetween(p.date, to.date) - rule.windowMonths) <
    Math.abs(monthsBetween(best.date, to.date) - rule.windowMonths)
      ? p
      : best,
  );
  const months = monthsBetween(from.date, to.date);
  const mm = r2(to.al - from.al);
  const mmPerYear = r2((to.al - from.al) / (daysBetween(from.date, to.date) / 365.25));
  const params = {
    mm: mm.toFixed(2),
    perYear: mmPerYear.toFixed(2),
    months: months.toFixed(1),
    from: from.date,
    to: to.date,
    min: rule.possiblyWeakMmPerYear.toFixed(1),
    max: rule.likelyWeakAboveMmPerYear.toFixed(1),
  };

  let flag: Flag;
  if (mmPerYear > rule.likelyWeakAboveMmPerYear) flag = makeFlag('R11', 'R11.likelyWeak', 'caution', eye, params);
  else if (mmPerYear >= rule.possiblyWeakMmPerYear) flag = makeFlag('R11', 'R11.possiblyWeak', 'caution', eye, params);
  else flag = makeFlag('R11', 'R11.ok', 'ok', eye, params);

  return { from, to, months, mm, mmPerYear, flag };
}

function makeFlag(ruleId: string, code: string, level: Level, eye: Eye, params: Flag['params'] = {}): Flag {
  return { ruleId, code, level, eye, params, notes: [] };
}

/** G1 (supplier guide): which way to change the curvature after a fluorescein check. */
export function suggestedAdjustment(fluorescein: Fluorescein): Adjustment {
  switch (fluorescein) {
    case 'loose':
      return 'steeper';
    case 'ideal':
      return 'keep';
    case 'tight':
      return 'flatter';
    default:
      return '';
  }
}

/** R15: tear layer too thick in one direction under fluorescein. */
export function trialFlags(trial: TrialLens, eye: Eye): Flag[] {
  const dir = trial.thickDirection;
  if (dir === '' || dir === 'none') return [];
  if (dir === 'vertical') return [makeFlag('R15', 'R15.vertical', 'caution', eye)];
  return [makeFlag('R15', 'R15.thick', 'caution', eye, { directionKey: `opt.dir.${dir}` })];
}

/** Checks for one eye at one visit: R12, R13/R14 and R15. */
export function visitFlags(_c: OrthoKCase, visit: Visit, eye: Eye): Flag[] {
  const rules = clinicRules.followUp;
  const v = visit.eyes[eye];
  const flags: Flag[] = [];

  if (v.redInCentral3mm) {
    flags.push(makeFlag('R12', 'R12.red', 'caution', eye, { zone: rules.centralRed.zoneDiameterMm }));
  }

  if (v.overRefraction !== null) {
    const over = r2(v.overRefraction);
    const params = { over: fmtSigned(over) };
    if (over <= rules.underCorrection.atOrBelowD) flags.push(makeFlag('R13', 'R13.under', 'caution', eye, params));
    else if (over >= rules.overCorrection.atOrAboveD) flags.push(makeFlag('R14', 'R14.over', 'caution', eye, params));
    else flags.push(makeFlag('R13', 'OR.ok', 'ok', eye, params));
  }

  for (const trial of v.trials) flags.push(...trialFlags(trial, eye));
  return flags;
}

/** Visits with any raised (non-ok) flag for this eye, newest first. */
export function followUpAlerts(c: OrthoKCase, eye: Eye): { visit: Visit; flags: Flag[] }[] {
  return sortVisits(c.visits)
    .reverse()
    .map((visit) => ({ visit, flags: visitFlags(c, visit, eye).filter((f) => f.level !== 'ok') }))
    .filter((x) => x.flags.length > 0);
}
