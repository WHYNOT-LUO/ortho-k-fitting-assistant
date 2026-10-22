/**
 * Part 2: suitability screening.
 *
 * Takes one eye's measurements and returns flags. Each flag says which rule
 * fired (R1–R17 from the clinic notes), how serious it is, and the numbers
 * behind it. The wording lives in the i18n files, so the same flag can be
 * shown in Chinese or English and tested without any text.
 *
 * Every threshold comes from config/clinicRules.ts. Nothing is hard-coded here.
 *
 * Levels, from least to most serious:
 *  - ok       rule checked, nothing to report
 *  - info     worth knowing / consider something (e.g. a toric design)
 *  - caution  outside the clinic's best range; the optometrist should look
 *  - stop     do not fit until this is resolved (e.g. R3: rule out keratoconus)
 */
import { clinicRules } from '../config/clinicRules';
import type { MessageKey } from '../i18n/zh';
import { EYES, SD_FIELDS, meanAndSd, type Eye, type OrthoKCase, type SdField } from './types';

export type Level = 'ok' | 'info' | 'caution' | 'stop';

export const LEVEL_ORDER: Level[] = ['stop', 'caution', 'info', 'ok'];

export function worstLevel(levels: Level[]): Level {
  for (const level of LEVEL_ORDER) if (levels.includes(level)) return level;
  return 'ok';
}

/** Extra remarks attached to a flag. */
export type FlagNote =
  /** The value this flag uses failed the SD check (R17). */
  | 'inputUnreliable'
  /** LT > 4 mm without cycloplegic refraction, so the refraction may be off (R6). */
  | 'refractionUnreliable';

export interface Flag {
  ruleId: string;
  /** Message code; the text is `flag.<code>` in the i18n files. */
  code: string;
  level: Level;
  /** null for case-level flags (e.g. history). */
  eye: Eye | null;
  /**
   * Numbers and words for the message. Params ending in "Key" are i18n keys
   * that get translated before they are filled in.
   */
  params: Record<string, string | number>;
  notes: FlagNote[];
}

export interface NotChecked {
  ruleId: string;
  eye: Eye | null;
  /** Labels (i18n keys) of the fields that are missing. */
  missing: MessageKey[];
}

export interface EyeScreening {
  eye: Eye;
  flags: Flag[];
  notChecked: NotChecked[];
  overall: Level;
}

export interface CaseScreening {
  eyes: EyeScreening[];
  caseFlags: Flag[];
  /** Worst level across all fitted eyes and case-level flags. */
  overall: Level;
}

/** Stable key used to store the optometrist's response to a flag. */
export function flagKey(flag: Pick<Flag, 'eye' | 'ruleId' | 'code'>): string {
  return `${flag.eye ?? 'case'}:${flag.ruleId}:${flag.code}`;
}

// Rounding to 0.01 before comparing avoids floating-point surprises like
// 42.8 − 42.3 = 0.5000000000000071 tripping a "> 0.5" rule.
const r2 = (x: number) => Math.round(x * 100) / 100;
const fmt = (x: number, d = 2) => x.toFixed(d);
const fmtSigned = (x: number, d = 2) => (x > 0 ? `+${x.toFixed(d)}` : x.toFixed(d));

/** Display order for flags with the same level: the order of the clinic notes. */
const RULE_ORDER = ['N1', 'R3', 'R2', 'R1', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R16', 'R17', 'N2', 'N3'];

function sortFlags(flags: Flag[]): Flag[] {
  return [...flags].sort(
    (a, b) =>
      LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) ||
      RULE_ORDER.indexOf(a.ruleId) - RULE_ORDER.indexOf(b.ruleId),
  );
}

const SD_LABELS: Record<SdField, MessageKey> = {
  al: 'field.al',
  cct: 'field.cct',
  ad: 'field.ad',
  lt: 'field.lt',
  vt: 'field.vt',
  k1: 'field.bK1',
  k2: 'field.bK2',
};

/** Pick which corneal curvature to use for R1–R3, in order of preference. */
function curvatureSource(c: OrthoKCase, eye: Eye) {
  const { basic, topography, biometry } = c.eyes[eye];
  if (basic.kK1 !== null && basic.kK2 !== null) return { k1: basic.kK1, k2: basic.kK2, sourceKey: 'src.keratometer' };
  if (topography.simK1_5 !== null && topography.simK2_5 !== null)
    return { k1: topography.simK1_5, k2: topography.simK2_5, sourceKey: 'src.topography5' };
  if (biometry.k1 !== null && biometry.k2 !== null) return { k1: biometry.k1, k2: biometry.k2, sourceKey: 'src.biometer' };
  return null;
}

/** Fields whose repeated readings are too spread out (R17). */
export function unreliableFields(c: OrthoKCase, eye: Eye): { field: SdField; sd: number; max: number }[] {
  const b = c.eyes[eye].biometry;
  const out: { field: SdField; sd: number; max: number }[] = [];
  for (const field of SD_FIELDS) {
    let sd = b[`${field}Sd`];
    const readings = b.readings[field];
    if (sd === null && readings && readings.length >= 2) sd = meanAndSd(readings)!.sd;
    const max = clinicRules.screening.measurementSd.maxSd[field];
    if (sd !== null && r2(sd) > max) out.push({ field, sd, max });
  }
  return out;
}

export function screenEye(c: OrthoKCase, eye: Eye): EyeScreening {
  const rules = clinicRules.screening;
  const { basic, biometry, topography } = c.eyes[eye];
  const flags: Flag[] = [];
  const notChecked: NotChecked[] = [];

  const flag = (ruleId: string, code: string, level: Level, params: Flag['params'] = {}, notes: FlagNote[] = []) =>
    flags.push({ ruleId, code, level, eye, params, notes });
  const missing = (ruleId: string, fields: MessageKey[]) => notChecked.push({ ruleId, eye, missing: fields });

  // R17 first, because other rules mark values that failed it.
  const unreliable = unreliableFields(c, eye);
  const isUnreliable = (field: SdField) => unreliable.some((u) => u.field === field);
  for (const u of unreliable) {
    flag('R17', 'R17.sd', 'caution', {
      field: u.field,
      fieldKey: SD_LABELS[u.field],
      sd: fmt(u.sd, 2),
      max: u.max,
    });
  }

  // R6 next, because refraction-based rules depend on it.
  let refractionUnreliable = false;
  if (biometry.lt === null) {
    missing('R6', ['field.lt']);
  } else if (r2(biometry.lt) > rules.lensThickness.cycloplegiaAboveMm) {
    if (basic.cycloplegic) {
      flag('R6', 'R6.done', 'ok', { lt: fmt(biometry.lt) });
    } else {
      refractionUnreliable = true;
      flag('R6', 'R6.needCyclo', 'caution', { lt: fmt(biometry.lt), limit: rules.lensThickness.cycloplegiaAboveMm }, isUnreliable('lt') ? ['inputUnreliable'] : []);
    }
  } else {
    flag('R6', 'R6.ok', 'ok', { lt: fmt(biometry.lt) });
  }
  const refractionNotes: FlagNote[] = refractionUnreliable ? ['refractionUnreliable'] : [];

  // N1: keratoconus screening panel (notes 3.3).
  if (topography.keratoconusPanel === 'suspect') flag('N1', 'N1.suspect', 'stop');
  else if (topography.keratoconusPanel === 'clear') flag('N1', 'N1.clear', 'ok');
  else missing('N1', ['field.kcPanel']);

  // R1–R3: corneal curvature.
  const k = curvatureSource(c, eye);
  if (!k) {
    missing('R1', ['field.kK1', 'field.kK2']);
  } else {
    const kNotes: FlagNote[] = k.sourceKey === 'src.biometer' && (isUnreliable('k1') || isUnreliable('k2')) ? ['inputUnreliable'] : [];
    const params = { k1: fmt(k.k1), k2: fmt(k.k2), sourceKey: k.sourceKey };
    const high = [k.k1, k.k2].filter((v) => r2(v) > rules.kHigh.aboveD);
    const low = [k.k1, k.k2].filter((v) => r2(v) < rules.kLow.belowD);
    if (high.length) flag('R3', 'R3.high', 'stop', { ...params, limit: rules.kHigh.aboveD }, kNotes);
    if (low.length) flag('R2', 'R2.low', 'caution', { ...params, limit: rules.kLow.belowD }, kNotes);
    if (!high.length && !low.length)
      flag('R1', 'R1.normal', 'ok', { ...params, min: rules.kLow.belowD, max: rules.kHigh.aboveD });
  }

  // R4: e-value at the configured zone.
  const eKey = `e${rules.eValue.zoneMm}` as 'e6' | 'e7' | 'e8';
  const e = topography[eKey];
  if (e === null) {
    missing('R4', [`field.${eKey}` as MessageKey]);
  } else {
    const params = { e: fmt(e), zone: rules.eValue.zoneMm, min: fmt(rules.eValue.idealMin), max: fmt(rules.eValue.idealMax) };
    if (r2(e) > rules.eValue.idealMax) flag('R4', 'R4.high', 'caution', params);
    else if (r2(e) < rules.eValue.idealMin) flag('R4', 'R4.low', 'info', params);
    else flag('R4', 'R4.ideal', 'ok', params);
  }

  // R5: central corneal thickness.
  if (biometry.cct === null) {
    missing('R5', ['field.cct']);
  } else {
    const params = { cct: fmt(biometry.cct, 0), min: rules.cct.normalMinUm, max: rules.cct.normalMaxUm };
    const notes: FlagNote[] = isUnreliable('cct') ? ['inputUnreliable'] : [];
    if (biometry.cct < rules.cct.normalMinUm) flag('R5', 'R5.low', 'caution', params, notes);
    else if (biometry.cct > rules.cct.normalMaxUm) flag('R5', 'R5.high', 'info', params, notes);
    else flag('R5', 'R5.normal', 'ok', params, notes);
  }

  // R7: myopia (sphere).
  if (basic.sphere === null) {
    missing('R7', ['field.sphere']);
  } else {
    const params = { sphere: fmtSigned(basic.sphere), degrees: Math.round(Math.abs(basic.sphere) * 100), limit: fmt(rules.myopia.bestMaxMyopiaD) };
    if (r2(basic.sphere) < rules.myopia.bestMaxMyopiaD) flag('R7', 'R7.beyond', 'caution', params, refractionNotes);
    else flag('R7', 'R7.ok', 'ok', params, refractionNotes);
  }

  // R8 / R9: astigmatism (refractive cylinder C).
  if (basic.cylinder === null) {
    missing('R8', ['field.cylinder']);
  } else {
    const cyl = r2(Math.abs(basic.cylinder));
    const kCyl = basic.kK1 !== null && basic.kK2 !== null ? fmt(basic.kK2 - basic.kK1) : '—';
    const params = { cyl: fmt(-cyl), degrees: Math.round(cyl * 100), kCyl };
    if (cyl <= rules.astigStandard.bestMaxD) flag('R8', 'R8.standard', 'ok', params, refractionNotes);
    else if (cyl <= rules.astigToric.toricMaxD) flag('R9', 'R9.toric', 'info', params, refractionNotes);
    else flag('R9', 'R9.beyond', 'caution', { ...params, limit: Math.round(rules.astigToric.toricMaxD * 100) }, refractionNotes);
  }

  // R10: Sim K at the comparison zone vs 5 mm.
  const z = rules.zoneDifference.compareZoneMm;
  const k1z = topography[`simK1_${z}`];
  const k2z = topography[`simK2_${z}`];
  if (topography.simK1_5 === null || topography.simK2_5 === null || k1z === null || k2z === null) {
    missing('R10', [z === 7 ? 'group.simK7' : 'group.simK3', 'group.simK5']);
  } else {
    const d1 = r2(Math.abs(k1z - topography.simK1_5));
    const d2 = r2(Math.abs(k2z - topography.simK2_5));
    const params = { zone: z, d1: fmt(d1), d2: fmt(d2), limit: fmt(rules.zoneDifference.maxDiffD) };
    if (d1 > rules.zoneDifference.maxDiffD || d2 > rules.zoneDifference.maxDiffD) flag('R10', 'R10.diff', 'caution', params);
    else flag('R10', 'R10.ok', 'ok', params);
  }

  // R16: high-risk child: check IOP and fundus.
  {
    const hr = rules.highRiskChild;
    const reasons: string[] = [];
    const unknown: MessageKey[] = [];
    if (basic.sphere === null) unknown.push('field.sphere');
    else if (r2(basic.sphere) <= hr.highMyopiaD) reasons.push('highMyopia');
    if (c.history.progressionDPerYear === null) unknown.push('field.progression');
    else if (r2(c.history.progressionDPerYear) >= hr.fastProgressionDPerYear) reasons.push('fastProgression');
    if (biometry.al === null) unknown.push('field.al');
    else if (r2(biometry.al) >= hr.longAxialLengthMm) reasons.push('longAL');

    if (reasons.length) {
      const done = basic.iop !== null && basic.fundusChecked;
      flag('R16', done ? 'R16.done' : 'R16.check', done ? 'info' : 'caution', {
        reasons: reasons.join(','),
        reasonsKey: reasons.map((r) => `reason.${r}`).join(','),
        iop: basic.iop ?? '—',
      });
    } else if (unknown.length) {
      missing('R16', unknown);
    } else {
      flag('R16', 'R16.ok', 'ok');
    }
  }

  // N2: cornea / ocular surface health.
  if (basic.cornealHealth === 'abnormal' || basic.ocularSurfaceHealth === 'abnormal') {
    flag('N2', 'N2.abnormal', 'caution', { notes: basic.surfaceNotes || '—' });
  } else if (basic.cornealHealth === 'normal' && basic.ocularSurfaceHealth === 'normal') {
    flag('N2', 'N2.ok', 'ok');
  } else {
    missing('N2', ['field.cornealHealth', 'field.ocularSurfaceHealth']);
  }

  const sorted = sortFlags(flags);
  return { eye, flags: sorted, notChecked, overall: worstLevel(sorted.map((f) => f.level)) };
}

/** Case-level flags that do not belong to one eye (history). */
export function screenHistory(c: OrthoKCase): Flag[] {
  const flags: Flag[] = [];
  if (c.history.severeAllergicRhinitis) {
    flags.push({ ruleId: 'N3', code: 'N3.rhinitis', level: 'info', eye: null, params: {}, notes: [] });
  }
  return flags;
}

export function screenCase(c: OrthoKCase): CaseScreening {
  const caseFlags = screenHistory(c);
  const caseLevels = caseFlags.map((f) => f.level);
  const eyes = EYES.filter((e) => c.eyesFitted[e]).map((eye) => {
    const r = screenEye(c, eye);
    return { ...r, overall: worstLevel([r.overall, ...caseLevels]) };
  });
  return {
    eyes,
    caseFlags,
    overall: worstLevel([...eyes.map((e) => e.overall), ...caseLevels]),
  };
}
