import { describe, expect, it } from 'vitest';
import { T1_INPUT, T2_INPUT, T3_INPUT, buildCase } from '../data/syntheticCases';
import { makeDecision, suggestDesign } from './design';
import type { OrthoKCase } from './types';

const ids = (reasons: { ruleId: string }[]) => reasons.map((r) => r.ruleId);

function t1(edit?: (c: OrthoKCase) => void): OrthoKCase {
  const c = buildCase(T1_INPUT);
  edit?.(c);
  return c;
}

describe('suggestDesign (notes Section 8, unverified)', () => {
  it('T1: child with low myopia shows the conflict with BOTH reasons, no silent pick', () => {
    const s = suggestDesign(t1(), 'OD');
    expect(s.kind).toBe('conflict');
    expect(ids(s.fourReasons)).toEqual(['D1']);
    expect(ids(s.fiveReasons)).toEqual(['D4']);
  });

  it('adult with low myopia and a regular cornea → 4-curve', () => {
    const s = suggestDesign(t1((c) => (c.ageYears = 16)), 'OD');
    expect(s.kind).toBe('4-curve');
  });

  it('T3: high myopia → 5-curve, with a warning that screening says stop', () => {
    const s = suggestDesign(buildCase(T3_INPUT), 'OD');
    expect(s.kind).toBe('5-curve');
    expect(ids(s.fiveReasons)).toContain('D2');
    expect(s.screeningStop).toBe(true);
  });

  it('−4.00 D counts as high myopia (D2), −3.75 D as low-to-moderate (D1)', () => {
    expect(suggestDesign(t1((c) => ((c.ageYears = 16), (c.eyes.OD.basic.sphere = -4))), 'OD').kind).toBe('5-curve');
    expect(suggestDesign(t1((c) => ((c.ageYears = 16), (c.eyes.OD.basic.sphere = -3.75))), 'OD').kind).toBe('4-curve');
  });

  it('astigmatism over 1.50 D and a sensitive cornea each add a 5-curve reason', () => {
    const s = suggestDesign(
      t1((c) => {
        c.ageYears = 16;
        c.eyes.OD.basic.cylinder = -1.75;
        c.eyes.OD.basic.sensitiveCornea = true;
      }),
      'OD',
    );
    expect(ids(s.fiveReasons)).toEqual(['D3', 'D5']);
  });

  it('fast correction wanted adds a 4-curve reason (D6)', () => {
    const s = suggestDesign(t1((c) => ((c.ageYears = 16), (c.wantsFastCorrection = true))), 'OD');
    expect(ids(s.fourReasons)).toEqual(['D1', 'D6']);
  });

  it('T2: K below 40 means the cornea is not "regular", so no rule matches; toric is suggested from R9', () => {
    const s = suggestDesign(buildCase(T2_INPUT), 'OD');
    expect(s.kind).toBe('none');
    expect(s.regularCornea).toBe(false);
    expect(s.toricRuleIds).toContain('R9');
  });

  it('cannot judge a regular cornea without curvature, and says what is missing', () => {
    const s = suggestDesign(
      t1((c) => {
        c.ageYears = 16;
        c.eyes.OD.basic.kK1 = null;
        c.eyes.OD.basic.kK2 = null;
        c.eyes.OD.topography.simK1_5 = null;
        c.eyes.OD.topography.simK2_5 = null;
      }),
      'OD',
    );
    expect(s.regularCornea).toBeNull();
    expect(s.kind).toBe('none');
    expect(s.missing.length).toBeGreaterThan(0);
  });

  it('a vertical thick tear layer on a trial lens also suggests toric (R15)', () => {
    const c = t1();
    c.visits[0].eyes.OD.trials[0].thickDirection = 'vertical';
    expect(suggestDesign(c, 'OD').toricRuleIds).toContain('R15');
  });
});

describe('makeDecision', () => {
  it('records what was suggested, what was chosen and the rules version', () => {
    const s = suggestDesign(t1((c) => (c.ageYears = 16)), 'OD');
    const d = makeDecision(s, '4-curve', false, 'looks fine');
    expect(d).toMatchObject({ suggested: '4-curve', chosen: '4-curve', accepted: true, suggestionRuleIds: ['D1'] });
    expect(d.rulesVersion).toMatch(/\d+\.\d+\.\d+/);
    expect(makeDecision(s, '5-curve', false, '').accepted).toBe(false);
  });

  it('counts choosing either side of a conflict as following the suggestion', () => {
    const s = suggestDesign(t1(), 'OD');
    expect(makeDecision(s, '5-curve', false, '').accepted).toBe(true);
    expect(makeDecision(s, '4-curve', false, '').suggestionRuleIds).toEqual(['D1', 'D4']);
  });
});
