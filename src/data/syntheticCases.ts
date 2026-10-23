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
import { makeDecision, suggestDesign } from '../domain/design';
import { round2 } from '../domain/format';
import {
  emptyCase,
  emptyVisit,
  meanAndSd,
  type BasicTests,
  type Biometry,
  type DesignType,
  type Eye,
  type OrthoKCase,
  type Topography,
  type TrialLens,
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
  // Follow-up from the notes: AL 24.80 → 24.86 (6 months) → 25.08 (12 months),
  // red in central 3 mm at 12 months. The fitting visits are made up for the demo.
  visits: [
    buildVisit('T1-v1', '2025-09-22', 'fitting', {
      OD: {
        trials: [
          { lens: 'TL-1 (synthetic)', fluorescein: 'tight', thickDirection: 'none', adjustment: 'flatter', notes: '' },
          { lens: 'TL-2 (synthetic)', fluorescein: 'ideal', thickDirection: 'none', adjustment: 'keep', notes: '' },
        ],
      },
    }),
    buildVisit('T1-v2', '2025-10-06', 'delivery', { OD: {} }),
    buildVisit('T1-v3', '2025-10-13', 'follow-up', { OD: { overRefraction: -0.25, fitSuccessful: true } }),
    buildVisit('T1-v4', '2026-03-15', 'follow-up', { OD: { al: 24.86 } }),
    buildVisit('T1-v5', '2026-09-15', 'follow-up', { OD: { al: 25.08, redInCentral3mm: true, topoNotes: 'red in central 3 mm' } }),
  ],
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
  visits: [],
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

// ----------------------------------------------------- extra demo cases
// Made up so the dashboard has something to show: two eyes, trial fittings,
// reorders and outcomes. Not from the notes, not real patients.

interface EyeSpec {
  s: number;
  c: number;
  a: number;
  k1: number;
  k2: number;
  e6: number;
  cct: number;
  lt: number;
  al: number;
}

function fullEye(p: EyeSpec, extra: Partial<BasicTests> = {}): EyeInput {
  const r2 = round2;
  return {
    basic: {
      vaUncorrected: '4.6',
      vaCorrected: '5.0',
      cornealHealth: 'normal',
      ocularSurfaceHealth: 'normal',
      sphere: p.s,
      cylinder: p.c,
      axis: p.a,
      kK1: p.k1,
      kK1Axis: 180,
      kK2: p.k2,
      kK2Axis: 90,
      ...extra,
    },
    biometry: { al: p.al, alSd: 0.01, cct: p.cct, cctSd: 3, lt: p.lt, ltSd: 0.02, ad: 3.6, k1: p.k1, k2: p.k2, pupil: 5.5, wtw: 11.6 },
    topography: {
      simK1_3: r2(p.k1 + 0.1),
      simK2_3: r2(p.k2 + 0.05),
      simK1_5: r2(p.k1 + 0.05),
      simK2_5: p.k2,
      simK1_7: r2(p.k1 - 0.2),
      simK2_7: r2(p.k2 - 0.25),
      e6: p.e6,
      e7: r2(p.e6 + 0.03),
      e8: r2(p.e6 + 0.05),
      shapeFactor: r2(p.e6 * p.e6),
      keratoconusPanel: 'clear',
    },
  };
}

type T = Partial<TrialLens>;
const lens = (n: number, fluorescein: TrialLens['fluorescein'], extra: T = {}): TrialLens => ({
  lens: `TL-${n} (synthetic)`,
  fluorescein,
  thickDirection: 'none',
  adjustment: fluorescein === 'loose' ? 'steeper' : fluorescein === 'tight' ? 'flatter' : 'keep',
  notes: '',
  ...extra,
});

const EXTRA_INPUTS: CaseInput[] = [
  {
    id: 'DEMO-05',
    examDate: '2025-11-03',
    ageYears: 9,
    history: { familyMyopia: 'both-parents', progressionDPerYear: 0.75, myopiaOnsetAge: 7 },
    eyes: {
      OD: fullEye({ s: -2, c: -0.5, a: 180, k1: 42.75, k2: 43.5, e6: 0.48, cct: 540, lt: 3.45, al: 24.3 }, { iop: 15, fundusChecked: true }),
      OS: fullEye({ s: -2.25, c: -0.5, a: 175, k1: 42.75, k2: 43.25, e6: 0.5, cct: 538, lt: 3.46, al: 24.42 }, { iop: 15, fundusChecked: true }),
    },
    visits: [
      buildVisit('05-1', '2025-11-10', 'fitting', { OD: { trials: [lens(1, 'ideal')] }, OS: { trials: [lens(1, 'ideal')] } }),
      buildVisit('05-2', '2025-11-24', 'delivery', {}),
      buildVisit('05-3', '2025-12-01', 'follow-up', {
        OD: { fitSuccessful: true, overRefraction: -0.25, vaUnaided: '5.0' },
        OS: { fitSuccessful: true, overRefraction: 0, vaUnaided: '5.0' },
      }),
      buildVisit('05-4', '2026-05-04', 'follow-up', { OD: { al: 24.38 }, OS: { al: 24.49 } }),
      buildVisit('05-5', '2026-10-12', 'follow-up', { OD: { al: 24.47 }, OS: { al: 24.58 } }),
    ],
  },
  {
    id: 'DEMO-06',
    examDate: '2025-08-18',
    ageYears: 13,
    history: { familyMyopia: 'one-parent', progressionDPerYear: 0.5 },
    eyes: {
      OD: fullEye({ s: -4.5, c: -0.5, a: 180, k1: 43.25, k2: 44, e6: 0.55, cct: 525, lt: 3.6, al: 25.4 }, { iop: 14, fundusChecked: true }),
      OS: fullEye({ s: -4.75, c: -0.75, a: 170, k1: 43.5, k2: 44.25, e6: 0.57, cct: 522, lt: 3.6, al: 25.55 }, { iop: 14, fundusChecked: true }),
    },
    visits: [
      buildVisit('06-1', '2025-08-25', 'fitting', {
        OD: { trials: [lens(1, 'tight'), lens(2, 'ideal')] },
        OS: { trials: [lens(1, 'loose'), lens(2, 'loose'), lens(3, 'ideal')] },
      }),
      buildVisit('06-2', '2025-09-08', 'delivery', {}),
      buildVisit('06-3', '2025-09-15', 'follow-up', {
        OD: { fitSuccessful: true, overRefraction: 0 },
        OS: { overRefraction: -0.75, reorderPlaced: true, reorderReason: 'fit' },
      }),
      buildVisit('06-4', '2025-10-13', 'follow-up', { OS: { fitSuccessful: true, overRefraction: -0.25 } }),
      buildVisit('06-5', '2026-02-16', 'follow-up', { OD: { al: 25.45 }, OS: { al: 25.62 } }),
      buildVisit('06-6', '2026-08-17', 'follow-up', { OD: { al: 25.58 }, OS: { al: 25.8 } }),
    ],
  },
  {
    id: 'DEMO-07',
    examDate: '2026-01-12',
    ageYears: 16,
    wantsFastCorrection: true,
    history: { familyMyopia: 'none', progressionDPerYear: 0.25 },
    eyes: {
      OD: fullEye({ s: -1.75, c: -0.25, a: 180, k1: 42, k2: 42.5, e6: 0.45, cct: 545, lt: 3.55, al: 24.1 }),
      OS: fullEye({ s: -2, c: -0.5, a: 180, k1: 42, k2: 42.75, e6: 0.46, cct: 548, lt: 3.55, al: 24.18 }),
    },
    visits: [
      buildVisit('07-1', '2026-01-19', 'fitting', { OD: { trials: [lens(1, 'ideal')] }, OS: { trials: [lens(1, 'ideal')] } }),
      buildVisit('07-2', '2026-02-02', 'delivery', {}),
      buildVisit('07-3', '2026-02-09', 'follow-up', {
        OD: { fitSuccessful: true, overRefraction: 0 },
        OS: { fitSuccessful: true, overRefraction: -0.25 },
      }),
      buildVisit('07-4', '2026-07-13', 'follow-up', { OD: { al: 24.12 }, OS: { al: 24.2 } }),
    ],
  },
  {
    id: 'DEMO-08',
    examDate: '2025-12-01',
    ageYears: 11,
    history: { familyMyopia: 'one-parent', progressionDPerYear: 0.5 },
    eyes: {
      OD: fullEye({ s: -3.25, c: -1.75, a: 180, k1: 42.5, k2: 44.25, e6: 0.52, cct: 530, lt: 3.5, al: 24.9 }, { iop: 16, fundusChecked: true }),
      OS: fullEye({ s: -3, c: -1, a: 175, k1: 42.75, k2: 43.75, e6: 0.5, cct: 532, lt: 3.5, al: 24.75 }, { iop: 16, fundusChecked: true }),
    },
    visits: [
      buildVisit('08-1', '2025-12-08', 'fitting', {
        OD: { trials: [lens(1, 'tight', { thickDirection: 'vertical' }), lens(2, 'tight'), lens(3, 'ideal')] },
        OS: { trials: [lens(1, 'loose'), lens(2, 'ideal')] },
      }),
      buildVisit('08-2', '2025-12-22', 'delivery', {}),
      buildVisit('08-3', '2025-12-29', 'follow-up', {
        OD: { overRefraction: -0.75, reorderPlaced: true, reorderReason: 'power' },
        OS: { fitSuccessful: true, overRefraction: 0 },
      }),
      buildVisit('08-4', '2026-01-26', 'follow-up', { OD: { fitSuccessful: true, overRefraction: -0.25 } }),
      buildVisit('08-5', '2026-06-01', 'follow-up', { OD: { al: 25 }, OS: { al: 24.83 } }),
    ],
  },
  {
    id: 'DEMO-09',
    examDate: '2026-06-15',
    ageYears: 10,
    history: { familyMyopia: 'both-parents', progressionDPerYear: 0.75, myopiaOnsetAge: 7 },
    eyes: {
      OD: fullEye({ s: -5.25, c: -0.5, a: 180, k1: 43.75, k2: 44.5, e6: 0.62, cct: 515, lt: 3.7, al: 25.9 }, { iop: 16, fundusChecked: true }),
      OS: fullEye({ s: -5.5, c: -0.5, a: 5, k1: 44, k2: 44.5, e6: 0.6, cct: 512, lt: 3.7, al: 26.1 }, { iop: 16, fundusChecked: true }),
    },
    visits: [
      buildVisit('09-1', '2026-06-22', 'fitting', {
        OD: { trials: [lens(1, 'tight'), lens(2, 'tight')] },
        OS: { trials: [lens(1, 'tight'), lens(2, 'ideal')] },
      }),
      buildVisit('09-2', '2026-07-06', 'delivery', {}),
      buildVisit('09-3', '2026-07-13', 'follow-up', {
        OD: { redInCentral3mm: true, topoNotes: 'decentred temporally (synthetic)', reorderPlaced: true, reorderReason: 'fit' },
        OS: { fitSuccessful: true, overRefraction: 0 },
      }),
      buildVisit('09-4', '2026-08-10', 'follow-up', { OD: { overRefraction: 0.75 } }),
    ],
  },
  {
    id: 'DEMO-10',
    examDate: '2025-07-07',
    ageYears: 14,
    history: { familyMyopia: 'none', progressionDPerYear: 0.25 },
    eyes: {
      OD: fullEye({ s: -2.5, c: -0.5, a: 180, k1: 41.75, k2: 42.5, e6: 0.47, cct: 550, lt: 3.5, al: 24.6 }),
      OS: fullEye({ s: -2.75, c: -0.25, a: 180, k1: 41.75, k2: 42.25, e6: 0.49, cct: 551, lt: 3.5, al: 24.7 }),
    },
    visits: [
      buildVisit('10-1', '2025-07-14', 'fitting', { OD: { trials: [lens(1, 'ideal')] }, OS: { trials: [lens(1, 'ideal')] } }),
      buildVisit('10-2', '2025-07-28', 'delivery', {}),
      buildVisit('10-3', '2025-08-04', 'follow-up', {
        OD: { fitSuccessful: true, overRefraction: 0 },
        OS: { fitSuccessful: true, overRefraction: 0 },
      }),
      buildVisit('10-4', '2026-01-12', 'follow-up', { OD: { al: 24.66 }, OS: { al: 24.75 } }),
      buildVisit('10-5', '2026-03-09', 'other', { OS: { reorderPlaced: true, reorderReason: 'damaged-lost' } }),
      buildVisit('10-6', '2026-07-06', 'follow-up', { OD: { al: 24.74 }, OS: { al: 24.86 } }),
    ],
  },
];

/** The optometrist's (made-up) design decisions for the extra demo cases. */
const DEMO_DECISIONS: Record<string, Partial<Record<Eye, { chosen: DesignType; toric?: boolean; note?: string }>>> = {
  'DEMO-05': { OD: { chosen: '5-curve', note: 'Young child: centring first' }, OS: { chosen: '5-curve' } },
  'DEMO-06': { OD: { chosen: '5-curve' }, OS: { chosen: '5-curve' } },
  'DEMO-07': { OD: { chosen: '4-curve' }, OS: { chosen: '4-curve' } },
  'DEMO-08': { OD: { chosen: '5-curve', toric: true }, OS: { chosen: '5-curve' } },
  'DEMO-09': { OD: { chosen: '5-curve' }, OS: { chosen: '5-curve' } },
  'DEMO-10': { OD: { chosen: '5-curve', note: 'Prefers 5-curve stability' }, OS: { chosen: '5-curve' } },
};

function withDecisions(c: OrthoKCase): OrthoKCase {
  const plan = DEMO_DECISIONS[c.id];
  if (!plan) return c;
  for (const eye of ['OD', 'OS'] as const) {
    const p = plan[eye];
    if (!p) continue;
    const decision = makeDecision(suggestDesign(c, eye), p.chosen, p.toric ?? false, p.note ?? '');
    decision.decidedAt = `${c.examDate}T10:00:00.000Z`;
    c.design[eye] = decision;
    c.finalLens[eye] = { ...c.finalLens[eye], brandDesign: 'Demo lens (synthetic)', designType: p.chosen, toric: p.toric ?? false };
  }
  return c;
}

export function syntheticCases(): OrthoKCase[] {
  return [T1_INPUT, T2_INPUT, T3_INPUT, T4_INPUT, ...EXTRA_INPUTS].map(buildCase).map(withDecisions);
}
