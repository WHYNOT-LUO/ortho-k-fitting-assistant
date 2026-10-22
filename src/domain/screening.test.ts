import { describe, expect, it } from 'vitest';
import { T1_INPUT, T2_INPUT, T3_INPUT, T4_INPUT, buildCase } from '../data/syntheticCases';
import { screenCase, screenEye, type Flag } from './screening';
import type { OrthoKCase } from './types';

const raised = (flags: Flag[]) => flags.filter((f) => f.level !== 'ok');
const ruleIds = (flags: Flag[]) => raised(flags).map((f) => f.ruleId);

function t1(): OrthoKCase {
  return buildCase(T1_INPUT);
}

describe('notes Section 10 test cases', () => {
  it('T1: typical candidate has no warnings', () => {
    const r = screenEye(t1(), 'OD');
    expect(raised(r.flags)).toEqual([]);
    expect(r.overall).toBe('ok');
  });

  it('T2: borderline raises exactly R2, R4, R5, R9 and R16', () => {
    const r = screenEye(buildCase(T2_INPUT), 'OD');
    expect(new Set(ruleIds(r.flags))).toEqual(new Set(['R2', 'R4', 'R5', 'R9', 'R16']));
    expect(r.flags.find((f) => f.ruleId === 'R16')!.params.reasons).toContain('longAL');
    expect(r.flags.find((f) => f.ruleId === 'R9')!.params.degrees).toBe(125);
  });

  it('T3: raises R3, R7, R6 and R16, with R3 (stop) first', () => {
    const r = screenEye(buildCase(T3_INPUT), 'OD');
    expect(new Set(ruleIds(r.flags))).toEqual(new Set(['R3', 'R7', 'R6', 'R16']));
    expect(raised(r.flags)[0]).toMatchObject({ ruleId: 'R3', level: 'stop' });
    expect(r.overall).toBe('stop');
    const r16 = r.flags.find((f) => f.ruleId === 'R16')!;
    expect(r16.params.reasons).toContain('highMyopia');
    expect(r16.params.reasons).toContain('longAL');
  });

  it('T3: refraction-based flags warn that the refraction may be inaccurate (R6)', () => {
    const r = screenEye(buildCase(T3_INPUT), 'OD');
    expect(r.flags.find((f) => f.ruleId === 'R7')!.notes).toContain('refractionUnreliable');
  });

  it('T4: unreliable CCT readings raise R17 and mark R5 as based on an unreliable value', () => {
    const r = screenEye(buildCase(T4_INPUT), 'OD');
    const r17 = r.flags.filter((f) => f.ruleId === 'R17');
    expect(r17).toHaveLength(1);
    expect(r17[0].params.field).toBe('cct');
    const r5 = r.flags.find((f) => f.ruleId === 'R5');
    expect(r5?.notes).toContain('inputUnreliable');
  });
});

describe('thresholds and boundaries', () => {
  function withOD(edit: (c: OrthoKCase) => void): OrthoKCase {
    const c = t1();
    edit(c);
    return c;
  }

  it('K exactly 46.00 is normal; above it stops (R3); below 40 is R2', () => {
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.basic.kK2 = 46)), 'OD').flags)).toEqual([]);
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.basic.kK2 = 46.25)), 'OD').flags)).toEqual(['R3']);
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.basic.kK1 = 39.75)), 'OD').flags)).toEqual(['R2']);
  });

  it('falls back to topography 5 mm Sim K when keratometry is missing', () => {
    const c = withOD((c) => {
      c.eyes.OD.basic.kK1 = null;
      c.eyes.OD.basic.kK2 = null;
      c.eyes.OD.topography.simK2_5 = 46.5;
    });
    const f = screenEye(c, 'OD').flags.find((f) => f.ruleId === 'R3')!;
    expect(f.params.sourceKey).toBe('src.topography5');
  });

  it('reports K as not checked when no curvature is entered anywhere', () => {
    const c = withOD((c) => {
      c.eyes.OD.basic.kK1 = null;
      c.eyes.OD.basic.kK2 = null;
      c.eyes.OD.topography.simK1_5 = null;
      c.eyes.OD.topography.simK2_5 = null;
    });
    const r = screenEye(c, 'OD');
    expect(r.notChecked.map((n) => n.ruleId)).toContain('R1');
  });

  it('e-value: 0.60 is fine, above 0.60 warns (R4)', () => {
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.topography.e6 = 0.6)), 'OD').flags)).toEqual([]);
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.topography.e6 = 0.61)), 'OD').flags)).toEqual(['R4']);
  });

  it('LT above 4 mm flags R6 unless the refraction was cycloplegic', () => {
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.biometry.lt = 4)), 'OD').flags)).toEqual([]);
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.biometry.lt = 4.1)), 'OD').flags)).toEqual(['R6']);
    const cyclo = withOD((c) => {
      c.eyes.OD.biometry.lt = 4.1;
      c.eyes.OD.basic.cycloplegic = true;
    });
    expect(ruleIds(screenEye(cyclo, 'OD').flags)).toEqual([]);
  });

  it('myopia: −6.00 D is within the best range, −6.25 D is not (R7)', () => {
    // −6.00 D is still "high myopia" for R16, so only check R7 here.
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.basic.sphere = -6)), 'OD').flags)).not.toContain('R7');
    expect(ruleIds(screenEye(withOD((c) => (c.eyes.OD.basic.sphere = -6.25)), 'OD').flags)).toContain('R7');
  });

  it('astigmatism: −1.00 standard, −1.25 consider toric, −2.25 beyond the rules', () => {
    const cyl = (v: number) => screenEye(withOD((c) => (c.eyes.OD.basic.cylinder = v)), 'OD').flags;
    expect(ruleIds(cyl(-1))).toEqual([]);
    expect(raised(cyl(-1.25))).toMatchObject([{ ruleId: 'R9', code: 'R9.toric' }]);
    expect(raised(cyl(-2.25))).toMatchObject([{ ruleId: 'R9', code: 'R9.beyond', level: 'caution' }]);
  });

  it('zone difference: 7 mm vs 5 mm flags only above 0.50 D (R10), without float errors', () => {
    const zones = (k7: number) =>
      withOD((c) => {
        c.eyes.OD.topography.simK1_5 = 42.3;
        c.eyes.OD.topography.simK2_5 = 43;
        c.eyes.OD.topography.simK1_7 = k7;
        c.eyes.OD.topography.simK2_7 = 43;
      });
    expect(ruleIds(screenEye(zones(42.8), 'OD').flags)).toEqual([]);
    expect(ruleIds(screenEye(zones(42.85), 'OD').flags)).toEqual(['R10']);
  });

  it('R16 lists the missing inputs when it cannot rule the risk out', () => {
    const r = screenEye(t1(), 'OD');
    const nc = r.notChecked.find((n) => n.ruleId === 'R16');
    expect(nc?.missing).toContain('field.progression');
  });

  it('R16 drops to a note once IOP and fundus are recorded', () => {
    const c = buildCase(T2_INPUT);
    c.eyes.OD.basic.iop = 15;
    c.eyes.OD.basic.fundusChecked = true;
    expect(screenEye(c, 'OD').flags.find((f) => f.ruleId === 'R16')!.level).toBe('info');
  });

  it('keratoconus panel "suspect" stops the fit (N1)', () => {
    const r = screenEye(withOD((c) => (c.eyes.OD.topography.keratoconusPanel = 'suspect')), 'OD');
    expect(raised(r.flags)[0]).toMatchObject({ ruleId: 'N1', level: 'stop' });
  });
});

describe('screenCase', () => {
  it('only screens eyes that are being fitted, and adds case-level flags', () => {
    const c = t1();
    c.history.severeAllergicRhinitis = true;
    const r = screenCase(c);
    expect(r.eyes.map((e) => e.eye)).toEqual(['OD']);
    expect(r.caseFlags.map((f) => f.ruleId)).toEqual(['N3']);
    expect(r.eyes[0].overall).toBe('info');
  });
});
