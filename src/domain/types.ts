/**
 * The case data model. Everything the app stores is one of these shapes.
 * Follows ortho-k-fitting-notes.md Sections 2, 3 and 11.
 *
 * Privacy by design: there is no field for a name, birth date, phone number
 * or ID number. A case is identified only by an anonymous case ID.
 *
 * Conventions:
 *  - number | null: null means "not measured / not entered".
 *  - Refraction in dioptres. Myopia and cylinder are negative:
 *    −3.00 D = 300 degrees (300度). Cylinder in minus-cylinder form, as the
 *    autorefractor prints it.
 *  - Dates as 'YYYY-MM-DD' strings.
 */

export const EYES = ['OD', 'OS'] as const;
/** OD = right eye (右眼), OS = left eye (左眼). */
export type Eye = (typeof EYES)[number];

export const SCHEMA_VERSION = 1;

export type FamilyMyopia = '' | 'none' | 'one-parent' | 'both-parents' | 'unknown';
export type Health = '' | 'normal' | 'abnormal';
export type KeratoconusPanel = '' | 'clear' | 'suspect';

export interface History {
  familyMyopia: FamilyMyopia;
  /** Age (years) when myopia was first found. */
  myopiaOnsetAge: number | null;
  /** How fast myopia is getting worse, in D per year (a positive number). */
  progressionDPerYear: number | null;
  severeAllergicRhinitis: boolean;
  notes: string;
}

/** Workflow step 2 (basic tests) plus the autorefractor/keratometer printout (notes 3.1). */
export interface BasicTests {
  /** Free text, so the clinic can use its own scale (e.g. 4.8 or 0.6). */
  vaUncorrected: string;
  vaCorrected: string;
  cornealHealth: Health;
  ocularSurfaceHealth: Health;
  surfaceNotes: string;
  /** Optometrist judgement; used by design rule D5. */
  sensitiveCornea: boolean;
  /** Refraction: the AVERAGE line of the printout, not single readings. */
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
  /** Was this refraction done under cycloplegia (慢散)? */
  cycloplegic: boolean;
  /** Keratometry (KRT. DATA): R1 = flat meridian, R2 = steep meridian. */
  kK1: number | null;
  kK1Axis: number | null;
  kK2: number | null;
  kK2Axis: number | null;
  iop: number | null;
  fundusChecked: boolean;
  fundusNotes: string;
}

/** Biometer fields that come with 5 readings plus AVG and SD (notes 3.2, rule R17). */
export const SD_FIELDS = ['al', 'cct', 'ad', 'lt', 'vt', 'k1', 'k2'] as const;
export type SdField = (typeof SD_FIELDS)[number];

/** Workflow step 3: biometer (生物测量仪), for one eye. Main values are the AVG. */
export interface Biometry {
  al: number | null; // axial length, mm
  cct: number | null; // central corneal thickness, μm
  ad: number | null; // anterior chamber depth, mm
  lt: number | null; // lens thickness, mm
  vt: number | null; // vitreous length, mm
  k1: number | null; // D
  k1Axis: number | null; // degrees
  k2: number | null;
  k2Axis: number | null;
  cornealAstig: number | null; // AST, D
  pupil: number | null; // mm
  wtw: number | null; // white-to-white, mm
  alSd: number | null;
  cctSd: number | null;
  adSd: number | null;
  ltSd: number | null;
  vtSd: number | null;
  k1Sd: number | null;
  k2Sd: number | null;
  /** Optional raw readings; when entered, the app fills in AVG and SD. */
  readings: Partial<Record<SdField, number[]>>;
}

/**
 * Workflow step 4: corneal topography (角膜地形图), for one eye.
 * Kept flat (one field per number) so it maps straight onto CSV columns.
 * DK (Sim K2 − Sim K1) is calculated, not stored.
 */
export interface Topography {
  simK1_3: number | null;
  simK1Axis_3: number | null;
  simK2_3: number | null;
  simK2Axis_3: number | null;
  simK1_5: number | null;
  simK1Axis_5: number | null;
  simK2_5: number | null;
  simK2Axis_5: number | null;
  simK1_7: number | null;
  simK1Axis_7: number | null;
  simK2_7: number | null;
  simK2Axis_7: number | null;
  e6: number | null;
  e7: number | null;
  e8: number | null;
  /** Shape factor @6 mm. */
  shapeFactor: number | null;
  keratoconusPanel: KeratoconusPanel;
}

export interface EyeExam {
  basic: BasicTests;
  biometry: Biometry;
  topography: Topography;
}

export type DesignType = '4-curve' | '5-curve';

/** Part 3: what the app suggested and what the optometrist decided. */
export interface DesignDecision {
  /** Snapshot of the suggestion at decision time: '4-curve', '5-curve', 'conflict' or 'none'. */
  suggested: DesignType | 'conflict' | 'none';
  suggestionRuleIds: string[];
  /** true if the optometrist went with the suggestion (or picked a side of a conflict). */
  accepted: boolean;
  chosen: DesignType;
  toric: boolean;
  note: string;
  decidedAt: string; // ISO timestamp
  rulesVersion: string;
}

/**
 * The lens actually ordered, copied from the manufacturer's software.
 * This app never calculates lens parameters. It only records them, because a
 * future model needs them as the "answer" to learn from (notes Section 11).
 */
export interface FinalLens {
  brandDesign: string;
  designType: DesignType | '';
  toric: boolean;
  diameterMm: number | null;
  targetPowerD: number | null;
  alignmentCurve: string;
  notes: string;
}

export type Fluorescein = '' | 'loose' | 'ideal' | 'tight';
export type ThickDirection = '' | 'none' | 'vertical' | 'horizontal' | 'oblique';
export type Adjustment = '' | 'steeper' | 'keep' | 'flatter' | 'other';

/** One trial lens tried on the eye (notes Section 6). */
export interface TrialLens {
  /** As printed on the trial lens, e.g. "42.75 / −3.00". Recorded, not calculated. */
  lens: string;
  fluorescein: Fluorescein;
  /** Where the tear layer looks too thick under fluorescein (rule R15). */
  thickDirection: ThickDirection;
  adjustment: Adjustment;
  notes: string;
}

export type ReorderReason = '' | 'fit' | 'power' | 'damaged-lost' | 'other';

export type VisitKind = 'fitting' | 'delivery' | 'follow-up' | 'other';

/** Part 4: one eye at one visit. */
export interface VisitEye {
  trials: TrialLens[];
  reorderPlaced: boolean;
  reorderReason: ReorderReason;
  /** Tick on the visit where the optometrist judges this eye's fit successful. */
  fitSuccessful: boolean;
  vaUnaided: string;
  al: number | null;
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
  /** Over-refraction (戴镜验光) sphere, D. */
  overRefraction: number | null;
  redInCentral3mm: boolean;
  topoNotes: string;
}

export interface Visit {
  id: string;
  date: string;
  kind: VisitKind;
  eyes: Record<Eye, VisitEye>;
  notes: string;
}

export type FlagResponseKind = 'agree' | 'disagree' | 'noted';

/** The optometrist's response to one flag (notes Section 11). */
export interface FlagResponse {
  response: FlagResponseKind;
  note: string;
  at: string;
}

export interface OrthoKCase {
  schemaVersion: number;
  /** Anonymous case ID, e.g. OK-2026-0001. Never a name. */
  id: string;
  /** true for made-up demo cases. Shown everywhere and exported. */
  synthetic: boolean;
  createdAt: string;
  updatedAt: string;
  examDate: string;
  /** Whole years only: enough for the "child" rule, without a birth date. */
  ageYears: number | null;
  eyesFitted: Record<Eye, boolean>;
  /** Patient wants fast short-term correction (design rule D6). */
  wantsFastCorrection: boolean;
  history: History;
  eyes: Record<Eye, EyeExam>;
  /** Keyed by flag key (see flagKey in screening.ts). */
  flagResponses: Record<string, FlagResponse>;
  design: Record<Eye, DesignDecision | null>;
  finalLens: Record<Eye, FinalLens>;
  visits: Visit[];
  notes: string;
}

// ------------------------------------------------------------ empty values

export function emptyBasic(): BasicTests {
  return {
    vaUncorrected: '',
    vaCorrected: '',
    cornealHealth: '',
    ocularSurfaceHealth: '',
    surfaceNotes: '',
    sensitiveCornea: false,
    sphere: null,
    cylinder: null,
    axis: null,
    cycloplegic: false,
    kK1: null,
    kK1Axis: null,
    kK2: null,
    kK2Axis: null,
    iop: null,
    fundusChecked: false,
    fundusNotes: '',
  };
}

export function emptyBiometry(): Biometry {
  return {
    al: null,
    cct: null,
    ad: null,
    lt: null,
    vt: null,
    k1: null,
    k1Axis: null,
    k2: null,
    k2Axis: null,
    cornealAstig: null,
    pupil: null,
    wtw: null,
    alSd: null,
    cctSd: null,
    adSd: null,
    ltSd: null,
    vtSd: null,
    k1Sd: null,
    k2Sd: null,
    readings: {},
  };
}

export function emptyTopography(): Topography {
  return {
    simK1_3: null,
    simK1Axis_3: null,
    simK2_3: null,
    simK2Axis_3: null,
    simK1_5: null,
    simK1Axis_5: null,
    simK2_5: null,
    simK2Axis_5: null,
    simK1_7: null,
    simK1Axis_7: null,
    simK2_7: null,
    simK2Axis_7: null,
    e6: null,
    e7: null,
    e8: null,
    shapeFactor: null,
    keratoconusPanel: '',
  };
}

export function emptyEyeExam(): EyeExam {
  return { basic: emptyBasic(), biometry: emptyBiometry(), topography: emptyTopography() };
}

export function emptyFinalLens(): FinalLens {
  return {
    brandDesign: '',
    designType: '',
    toric: false,
    diameterMm: null,
    targetPowerD: null,
    alignmentCurve: '',
    notes: '',
  };
}

export function emptyTrialLens(): TrialLens {
  return { lens: '', fluorescein: '', thickDirection: '', adjustment: '', notes: '' };
}

export function emptyVisitEye(): VisitEye {
  return {
    trials: [],
    reorderPlaced: false,
    reorderReason: '',
    fitSuccessful: false,
    vaUnaided: '',
    al: null,
    sphere: null,
    cylinder: null,
    axis: null,
    overRefraction: null,
    redInCentral3mm: false,
    topoNotes: '',
  };
}

export function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function emptyVisit(id: string): Visit {
  return {
    id,
    date: today(),
    kind: 'follow-up',
    eyes: { OD: emptyVisitEye(), OS: emptyVisitEye() },
    notes: '',
  };
}

export function emptyCase(id: string): OrthoKCase {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    id,
    synthetic: false,
    createdAt: now,
    updatedAt: now,
    examDate: today(),
    ageYears: null,
    eyesFitted: { OD: true, OS: true },
    wantsFastCorrection: false,
    history: {
      familyMyopia: '',
      myopiaOnsetAge: null,
      progressionDPerYear: null,
      severeAllergicRhinitis: false,
      notes: '',
    },
    eyes: { OD: emptyEyeExam(), OS: emptyEyeExam() },
    flagResponses: {},
    design: { OD: null, OS: null },
    finalLens: { OD: emptyFinalLens(), OS: emptyFinalLens() },
    visits: [],
    notes: '',
  };
}

// ------------------------------------------------------------ small helpers

/** Spherical equivalent S.E. = S + C/2 (notes Section 1). */
export function sphericalEquivalent(sphere: number | null, cylinder: number | null): number | null {
  if (sphere === null) return null;
  return sphere + (cylinder ?? 0) / 2;
}

/** Population SD, to match how the biometer reports it (notes test case T4: SD ≈ 22). */
export function meanAndSd(readings: number[]): { mean: number; sd: number } | null {
  if (readings.length === 0) return null;
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
  const variance = readings.reduce((a, b) => a + (b - mean) ** 2, 0) / readings.length;
  return { mean, sd: Math.sqrt(variance) };
}
