/**
 * Part 3: 4-curve vs 5-curve design suggestion.
 *
 * The rules (D1–D6) came from an AI search (notes Section 8) and are
 * UNVERIFIED. The app shows the suggestion with its reasons; the optometrist
 * accepts or rejects it and the decision is recorded.
 *
 * When 4-curve and 5-curve rules both match (e.g. a child with low myopia),
 * the result is 'conflict' and BOTH reasons are shown. The app never picks
 * one silently (notes Section 8, Q4).
 *
 * This file never calculates lens parameters. That is the manufacturer's
 * fitting software and the optometrist's job.
 */
import { RULES_VERSION, clinicRules } from '../config/clinicRules';
import type { MessageKey } from '../i18n/zh';
import { formatFixed, formatSigned, round2 } from './format';
import { curvatureSource, screenEye } from './screening';
import type { DesignDecision, DesignType, Eye, OrthoKCase } from './types';

export interface DesignReason {
  ruleId: string;
  design: DesignType;
  /** Message code: text is `design.reason.<code>`. */
  code: string;
  params: Record<string, string | number>;
}

export type SuggestionKind = DesignType | 'conflict' | 'none';

/** Why a cornea does not count as regular (rule D7). */
export type IrregularReason = 'astig' | 'kRange' | 'zoneDiff' | 'kcSuspect';

export interface DesignSuggestion {
  eye: Eye;
  kind: SuggestionKind;
  fourReasons: DesignReason[];
  fiveReasons: DesignReason[];
  /** true / false, or null when there is not enough data to tell. */
  regularCornea: boolean | null;
  irregularBecause: IrregularReason[];
  /** Rules that point to considering a toric design (R9 refraction, R15 fluorescein). */
  toricRuleIds: string[];
  /** Screening has a "stop" flag for this eye: resolve that before choosing a design. */
  screeningStop: boolean;
  /** Inputs that are missing and could change the suggestion. */
  missing: MessageKey[];
}

const r2 = round2;
const fmtSigned = formatSigned;

function regularCornea(c: OrthoKCase, eye: Eye, zoneDiffFlag: boolean) {
  const k = curvatureSource(c, eye);
  if (!k) return { regular: null, because: [] as IrregularReason[], astig: null as number | null };
  const s = clinicRules.screening;
  const astig = r2(Math.abs(k.k2 - k.k1));
  const because: IrregularReason[] = [];
  if (astig > clinicRules.design.regularCornea.maxCornealAstigD) because.push('astig');
  if ([k.k1, k.k2].some((v) => r2(v) < s.kLow.belowD || r2(v) > s.kHigh.aboveD)) because.push('kRange');
  if (zoneDiffFlag) because.push('zoneDiff');
  if (c.eyes[eye].topography.keratoconusPanel === 'suspect') because.push('kcSuspect');
  return { regular: because.length === 0, because, astig };
}

export function suggestDesign(c: OrthoKCase, eye: Eye): DesignSuggestion {
  const d = clinicRules.design;
  const { basic } = c.eyes[eye];
  const screening = screenEye(c, eye);
  const zoneDiff = screening.flags.some((f) => f.code === 'R10.diff');
  const regular = regularCornea(c, eye, zoneDiff);

  const four: DesignReason[] = [];
  const five: DesignReason[] = [];
  const missing: MessageKey[] = [];
  const add = (list: DesignReason[], ruleId: string, design: DesignType, code: string, params = {}) =>
    list.push({ ruleId, design, code, params });

  // D1 (4-curve) and D2 (5-curve): myopia level.
  if (basic.sphere === null) {
    missing.push('field.sphere');
  } else if (r2(basic.sphere) <= d.fiveCurveHighMyopia.atOrBeyondD) {
    add(five, 'D2', '5-curve', 'D2', { sphere: fmtSigned(basic.sphere), limit: formatFixed(d.fiveCurveHighMyopia.atOrBeyondD) });
  } else if (basic.sphere < 0 && r2(basic.sphere) > d.fourCurveLowMyopia.lessMyopicThanD) {
    if (regular.regular === true) {
      add(four, 'D1', '4-curve', 'D1', { sphere: fmtSigned(basic.sphere), astig: regular.astig?.toFixed(2) ?? '—' });
    } else if (regular.regular === null) {
      missing.push('field.kK1', 'field.kK2');
    }
  }

  // D3: astigmatism over 1.50 D.
  if (basic.cylinder !== null && r2(Math.abs(basic.cylinder)) > d.fiveCurveAstigmatism.aboveD) {
    add(five, 'D3', '5-curve', 'D3', { cyl: fmtSigned(-Math.abs(basic.cylinder)), limit: d.fiveCurveAstigmatism.aboveD.toFixed(2) });
  }

  // D4: child.
  if (c.ageYears === null) missing.push('field.ageYears');
  else if (c.ageYears < d.fiveCurveChild.underAgeYears) add(five, 'D4', '5-curve', 'D4', { age: c.ageYears, limit: d.fiveCurveChild.underAgeYears });

  // D5: sensitive cornea.
  if (basic.sensitiveCornea) add(five, 'D5', '5-curve', 'D5');

  // D6: patient wants fast short-term correction.
  if (c.wantsFastCorrection) add(four, 'D6', '4-curve', 'D6');

  const kind: SuggestionKind =
    four.length && five.length ? 'conflict' : four.length ? '4-curve' : five.length ? '5-curve' : 'none';

  const toricRuleIds: string[] = [];
  if (screening.flags.some((f) => f.ruleId === 'R9')) toricRuleIds.push('R9');
  if (c.visits.some((v) => v.eyes[eye].trials.some((t) => t.thickDirection === 'vertical'))) toricRuleIds.push('R15');

  return {
    eye,
    kind,
    fourReasons: four,
    fiveReasons: five,
    regularCornea: regular.regular,
    irregularBecause: regular.because,
    toricRuleIds,
    screeningStop: screening.overall === 'stop',
    missing: [...new Set(missing)],
  };
}

/** Freeze the suggestion together with the optometrist's choice. */
export function makeDecision(s: DesignSuggestion, chosen: DesignType, toric: boolean, note: string): DesignDecision {
  const accepted = s.kind === 'conflict' ? true : s.kind === chosen;
  return {
    suggested: s.kind,
    suggestionRuleIds: [...s.fourReasons, ...s.fiveReasons].map((r) => r.ruleId),
    accepted,
    chosen,
    toric,
    note,
    decidedAt: new Date().toISOString(),
    rulesVersion: RULES_VERSION,
  };
}
