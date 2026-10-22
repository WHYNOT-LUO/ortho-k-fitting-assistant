import { describe, expect, it } from 'vitest';
import { T1_INPUT, buildCase, buildVisit } from '../data/syntheticCases';
import { caseOutcome, clinicMetrics } from './metrics';
import { emptyTrialLens, type OrthoKCase } from './types';

const trials = (n: number) => Array.from({ length: n }, emptyTrialLens);

function twoEyeCase(id: string, edit: (c: OrthoKCase) => void): OrthoKCase {
  const c = buildCase({ ...T1_INPUT, id, visits: [], eyes: { OD: T1_INPUT.eyes.OD, OS: T1_INPUT.eyes.OD } });
  edit(c);
  return c;
}

describe('caseOutcome', () => {
  it('DEMO-T1: 2 trial lenses, no reorders, fit successful at the 3rd visit', () => {
    const o = caseOutcome(buildCase(T1_INPUT));
    expect(o.trialLenses).toBe(2);
    expect(o.reorders).toBe(0);
    expect(o.visitsToSuccess).toBe(3);
    expect(o.status).toBe('success');
    expect(o.eyes.OD!.rightFirstTime).toBe(false);
  });

  it('waits for every fitted eye before counting the case as successful', () => {
    const c = twoEyeCase('X', (c) => {
      c.visits = [
        buildVisit('a', '2026-01-01', 'fitting', { OD: { trials: trials(1) }, OS: { trials: trials(2) } }),
        buildVisit('b', '2026-01-08', 'follow-up', { OD: { fitSuccessful: true } }),
      ];
    });
    expect(caseOutcome(c).status).toBe('in-progress');
    expect(caseOutcome(c).visitsToSuccess).toBeNull();
    c.visits.push(buildVisit('c', '2026-01-20', 'follow-up', { OS: { fitSuccessful: true } }));
    expect(caseOutcome(c)).toMatchObject({ status: 'success', visitsToSuccess: 3, trialLenses: 3 });
  });

  it('counts visits in date order even if they were entered out of order', () => {
    const c = twoEyeCase('Y', (c) => {
      c.eyesFitted.OS = false;
      c.visits = [
        buildVisit('late', '2026-02-01', 'follow-up', { OD: { fitSuccessful: true } }),
        buildVisit('early', '2026-01-01', 'fitting', { OD: { trials: trials(1) } }),
      ];
    });
    expect(caseOutcome(c).visitsToSuccess).toBe(2);
    expect(caseOutcome(c).eyes.OD!.rightFirstTime).toBe(true);
  });

  it('separates fitting-related reorders from lost or damaged lenses', () => {
    const c = twoEyeCase('Z', (c) => {
      c.visits = [
        buildVisit('a', '2026-01-01', 'fitting', { OD: { reorderPlaced: true, reorderReason: 'fit' } }),
        buildVisit('b', '2026-05-01', 'follow-up', { OS: { reorderPlaced: true, reorderReason: 'damaged-lost' } }),
      ];
    });
    const o = caseOutcome(c);
    expect(o.reorders).toBe(2);
    expect(o.fitReorders).toBe(1);
  });

  it('ignores data entered for an eye that is not being fitted', () => {
    const c = twoEyeCase('W', (c) => {
      c.eyesFitted.OS = false;
      c.visits = [buildVisit('a', '2026-01-01', 'fitting', { OD: { trials: trials(1) }, OS: { trials: trials(5) } })];
    });
    expect(caseOutcome(c).trialLenses).toBe(1);
  });
});

describe('clinicMetrics', () => {
  it('averages over the cases that have the data, and reports n', () => {
    const a = twoEyeCase('A', (c) => {
      c.eyesFitted.OS = false;
      c.visits = [
        buildVisit('1', '2026-01-01', 'fitting', { OD: { trials: trials(1) } }),
        buildVisit('2', '2026-01-08', 'follow-up', { OD: { fitSuccessful: true } }),
      ];
    });
    const b = twoEyeCase('B', (c) => {
      c.eyesFitted.OS = false;
      c.visits = [
        buildVisit('1', '2026-01-01', 'fitting', { OD: { trials: trials(3), reorderPlaced: true, reorderReason: 'fit' } }),
        buildVisit('2', '2026-01-08', 'follow-up', {}),
        buildVisit('3', '2026-01-20', 'follow-up', { OD: { fitSuccessful: true } }),
      ];
    });
    const empty = twoEyeCase('C', () => {});
    const m = clinicMetrics([a, b, empty]);
    expect(m.cases).toBe(3);
    expect(m.casesWithFittingData).toBe(2);
    expect(m.avgTrialLensesPerCase).toBeCloseTo(2);
    expect(m.reorderRatePercent).toBeCloseTo(50);
    expect(m.avgVisitsToSuccess).toBeCloseTo(2.5);
    expect(m.completedCases).toBe(2);
    expect(m.rightFirstTimePercent).toBeCloseTo(50);
    expect(m.trialDistribution).toEqual([
      { label: '1', count: 1 },
      { label: '2', count: 0 },
      { label: '3', count: 1 },
      { label: '4+', count: 0 },
    ]);
  });

  it('returns nulls instead of zeros when there is no data', () => {
    const m = clinicMetrics([]);
    expect(m.avgTrialLensesPerCase).toBeNull();
    expect(m.avgVisitsToSuccess).toBeNull();
  });
});
