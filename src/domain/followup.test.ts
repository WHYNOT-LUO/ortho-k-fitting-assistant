import { describe, expect, it } from 'vitest';
import { T1_INPUT, buildCase, buildVisit } from '../data/syntheticCases';
import { axialGrowth, axialSeries, suggestedAdjustment, trialFlags, visitFlags } from './followup';
import { emptyTrialLens, type OrthoKCase } from './types';

/** T1 from the notes: AL 24.80 → 24.86 (6 months) → 25.08 (12 months), red in central 3 mm at 12 months. */
function t1WithFollowUp(): OrthoKCase {
  const c = buildCase(T1_INPUT);
  c.visits = [
    buildVisit('v6', '2026-03-15', 'follow-up', { OD: { al: 24.86 } }),
    buildVisit('v12', '2026-09-15', 'follow-up', { OD: { al: 25.08, redInCentral3mm: true } }),
  ];
  return c;
}

describe('axial length (R11)', () => {
  it('builds the series from the exam baseline plus visits, in date order', () => {
    const s = axialSeries(t1WithFollowUp(), 'OD');
    expect(s.map((p) => p.al)).toEqual([24.8, 24.86, 25.08]);
    expect(s[0].source).toBe('baseline');
  });

  it('T1: 0.28 mm in 12 months raises R11 "possibly weak control"', () => {
    const g = axialGrowth(t1WithFollowUp(), 'OD');
    expect(g.flag?.code).toBe('R11.possiblyWeak');
    expect(g.flag?.level).toBe('caution');
    expect(g.mmPerYear).toBeCloseTo(0.28, 2);
    expect(g.months).toBeCloseTo(12, 0);
  });

  it('compares with the reading about 12 months back, not the 6-month one', () => {
    // 6→12 months alone would be 0.22 mm in 6 months = 0.44 mm/year.
    const g = axialGrowth(t1WithFollowUp(), 'OD');
    expect(g.from?.date).toBe('2025-09-15');
  });

  it('does not judge when the gap is under 6 months', () => {
    const c = buildCase(T1_INPUT);
    c.visits = [buildVisit('v3', '2025-12-15', 'follow-up', { OD: { al: 24.95 } })];
    const g = axialGrowth(c, 'OD');
    expect(g.flag?.code).toBe('R11.tooSoon');
    expect(g.flag?.level).toBe('info');
  });

  it('flags above 0.30 mm/year as likely weak, and slow growth as ok', () => {
    const fast = buildCase(T1_INPUT);
    fast.visits = [buildVisit('v', '2026-09-15', 'follow-up', { OD: { al: 25.2 } })];
    expect(axialGrowth(fast, 'OD').flag?.code).toBe('R11.likelyWeak');
    const slow = buildCase(T1_INPUT);
    slow.visits = [buildVisit('v', '2026-09-15', 'follow-up', { OD: { al: 24.9 } })];
    expect(axialGrowth(slow, 'OD').flag).toMatchObject({ code: 'R11.ok', level: 'ok' });
  });

  it('returns no flag with fewer than two readings', () => {
    const c = buildCase(T1_INPUT);
    c.visits = [];
    expect(axialGrowth(c, 'OD').flag).toBeNull();
  });
});

describe('demo case DEMO-T1', () => {
  it('ships the follow-up from the notes and gives the same R11 and R12 flags', () => {
    const c = buildCase(T1_INPUT);
    expect(axialGrowth(c, 'OD').flag?.code).toBe('R11.possiblyWeak');
    const last = c.visits.find((v) => v.date === '2026-09-15')!;
    expect(visitFlags(c, last, 'OD').map((f) => f.ruleId)).toContain('R12');
  });
});

describe('visit checks', () => {
  it('T1 12-month visit: red inside the central 3 mm raises R12', () => {
    const c = t1WithFollowUp();
    const flags = visitFlags(c, c.visits[1], 'OD');
    expect(flags.map((f) => f.ruleId)).toEqual(['R12']);
  });

  it('over-refraction: residual myopia is R13, hyperopic is R14, small residuals are fine', () => {
    const c = buildCase(T1_INPUT);
    const at = (over: number) => visitFlags(c, buildVisit('v', '2026-01-01', 'follow-up', { OD: { overRefraction: over } }), 'OD');
    expect(at(-0.75)[0]).toMatchObject({ ruleId: 'R13', level: 'caution' });
    expect(at(0.5)[0]).toMatchObject({ ruleId: 'R14', level: 'caution' });
    expect(at(-0.25)[0]).toMatchObject({ ruleId: 'R13', level: 'ok', code: 'OR.ok' });
  });
});

describe('trial lens evaluation', () => {
  it('follows the supplier guide: loose → steeper, ideal → keep, tight → flatter (G1)', () => {
    expect(suggestedAdjustment('loose')).toBe('steeper');
    expect(suggestedAdjustment('ideal')).toBe('keep');
    expect(suggestedAdjustment('tight')).toBe('flatter');
    expect(suggestedAdjustment('')).toBe('');
  });

  it('a tear layer too thick vertically suggests astigmatism and a toric design (R15)', () => {
    const vertical = trialFlags({ ...emptyTrialLens(), thickDirection: 'vertical' }, 'OD');
    expect(vertical).toMatchObject([{ ruleId: 'R15', code: 'R15.vertical' }]);
    const horizontal = trialFlags({ ...emptyTrialLens(), thickDirection: 'horizontal' }, 'OD');
    expect(horizontal).toMatchObject([{ ruleId: 'R15', code: 'R15.thick' }]);
    expect(trialFlags({ ...emptyTrialLens(), thickDirection: 'none' }, 'OD')).toEqual([]);
  });
});
