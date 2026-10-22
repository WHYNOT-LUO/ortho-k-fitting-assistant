/**
 * SYNTHETIC demo cases. None of these are real patients.
 *
 * DEMO-T1 to DEMO-T4 copy test cases T1–T4 from ortho-k-fitting-notes.md
 * Section 10 exactly (right eye only, as in the notes). They double as the
 * fixtures for the automated tests.
 *
 * Every case is marked `synthetic: true`, shown with a badge in the app and
 * exported with synthetic = 1, so it can never be mistaken for clinic data.
 */
import {
  emptyCase,
  emptyVisit,
  meanAndSd,
  type BasicTests,
  type Biometry,
  type Eye,
  type OrthoKCase,
  type Topography,
  type Visit,
  type VisitEye,
} from '../domain/types';

interface EyeInput {
  basic?: Partial<BasicTests>;
  biometry?: Partial<Biometry>;
  topography?: Partial<Topography>;
}

interface CaseInput {
  id: string;
  examDate: string;
  ageYears: number;
  eyes: Partial<Record<Eye, EyeInput>>;
  history?: Partial<OrthoKCase['history']>;
  wantsFastCorrection?: boolean;
  visits?: Visit[];
  notes?: string;
}

export function buildCase(input: CaseInput): OrthoKCase {
  const c = emptyCase(input.id);
  c.synthetic = true;
  c.createdAt = `${input.examDate}T09:00:00.000Z`;
  c.updatedAt = c.createdAt;
  c.examDate = input.examDate;
  c.ageYears = input.ageYears;
  c.wantsFastCorrection = input.wantsFastCorrection ?? false;
  c.history = { ...c.history, ...input.history };
  c.eyesFitted = { OD: Boolean(input.eyes.OD), OS: Boolean(input.eyes.OS) };
  for (const eye of ['OD', 'OS'] as const) {
    const e = input.eyes[eye];
    if (!e) continue;
    Object.assign(c.eyes[eye].basic, e.basic);
    Object.assign(c.eyes[eye].biometry, e.biometry);
    Object.assign(c.eyes[eye].topography, e.topography);
  }
  c.visits = input.visits ?? [];
  c.notes = input.notes ?? '';
  return c;
}

/** Build a visit; eyes not listed stay empty. */
export function buildVisit(
  id: string,
  date: string,
  kind: Visit['kind'],
  eyes: Partial<Record<Eye, Partial<VisitEye>>>,
  notes = '',
): Visit {
  const v = emptyVisit(id);
  v.date = date;
  v.kind = kind;
  v.notes = notes;
  for (const eye of ['OD', 'OS'] as const) Object.assign(v.eyes[eye], eyes[eye]);
  return v;
}

// ----------------------------------------------------------- notes Section 10

/** T1: typical candidate, right eye. Expected: suitable, no warnings; design conflict. */
export const T1_INPUT: CaseInput = {
  id: 'DEMO-T1',
  examDate: '2025-09-15',
  ageYears: 10,
  eyes: {
    OD: {
      basic: { sphere: -3.0, cylinder: -0.75, axis: 180, kK1: 42.25, kK1Axis: 180, kK2: 43.0, kK2Axis: 90 },
      biometry: { cct: 535, lt: 3.5, al: 24.8, pupil: 5.5, wtw: 11.6 },
      topography: { simK1_5: 42.3, simK2_5: 43.0, e6: 0.52 },
    },
  },
  notes: 'Notes test case T1 (synthetic).',
};

/** T2: borderline, right eye. Expected: R2, R4, R5, R9, R16. */
export const T2_INPUT: CaseInput = {
  id: 'DEMO-T2',
  examDate: '2025-10-08',
  ageYears: 15,
  eyes: {
    OD: {
      basic: { sphere: -2.25, cylinder: -1.25, axis: 170, kK1: 39.5, kK1Axis: 170, kK2: 40.75, kK2Axis: 80 },
      biometry: { cct: 490, lt: 3.4, al: 26.3 },
      topography: { simK1_5: 41.9, simK2_5: 42.8, e6: 0.7 },
    },
  },
  notes: 'Notes test case T2 (synthetic).',
};

/** T3: should not proceed yet, right eye. Expected: R3 (first), R7, R6, R16. */
export const T3_INPUT: CaseInput = {
  id: 'DEMO-T3',
  examDate: '2025-11-20',
  ageYears: 12,
  eyes: {
    OD: {
      basic: { sphere: -7.5, cylinder: -0.5, axis: 10, kK1: 46.75, kK2: 47.5 },
      biometry: { cct: 520, lt: 4.2, al: 26.9 },
      topography: { e6: 0.45 },
    },
  },
  notes: 'Notes test case T3 (synthetic).',
};

const T4_CCT_READINGS = [450, 496, 450, 496, 450];
const t4Stats = meanAndSd(T4_CCT_READINGS)!;

/** T4: same as T1 but unreliable CCT readings. Expected: R17 on CCT. */
export const T4_INPUT: CaseInput = {
  ...T1_INPUT,
  id: 'DEMO-T4',
  eyes: {
    OD: {
      ...T1_INPUT.eyes.OD,
      biometry: {
        ...T1_INPUT.eyes.OD!.biometry,
        cct: Math.round(t4Stats.mean * 10) / 10,
        cctSd: Math.round(t4Stats.sd * 10) / 10,
        readings: { cct: T4_CCT_READINGS },
      },
    },
  },
  notes: 'Notes test case T4 (synthetic): T1 with unreliable CCT readings.',
};

export function syntheticCases(): OrthoKCase[] {
  return [T1_INPUT, T2_INPUT, T3_INPUT, T4_INPUT].map(buildCase);
}
