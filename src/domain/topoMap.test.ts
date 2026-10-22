import { describe, expect, it } from 'vitest';
import { T1_INPUT, T3_INPUT, buildCase, syntheticCases } from '../data/syntheticCases';
import { isRed } from './topoImage';
import {
  SCALE_COLORS,
  axialPower,
  colorFor,
  corneaModel,
  postWearVisits,
  preFitPower,
  renderMap,
  simulatePostWear,
} from './topoMap';
import { analyzeCentralRed } from './topoImage';

const t1 = () => buildCase(T1_INPUT);

describe('cornea model', () => {
  it('matches the 5 mm Sim K on the flat and steep axes (T1: 42.30 / 43.00)', () => {
    const m = corneaModel(t1().eyes.OD)!;
    expect(m.source).toBe('topography5');
    expect(axialPower(m, 2.5, m.k1Axis)).toBeCloseTo(42.3, 2);
    expect(axialPower(m, 2.5, m.k2Axis)).toBeCloseTo(43.0, 2);
  });

  it('borrows the keratometer axes when the topography axes are blank (T1)', () => {
    const m = corneaModel(t1().eyes.OD)!;
    expect(m.k1Axis).toBe(180);
    expect(m.assumed).toEqual([]);
  });

  it('is steeper in the centre and flatter at the edge when e > 0', () => {
    const m = corneaModel(t1().eyes.OD)!;
    expect(axialPower(m, 0, 0)).toBeGreaterThan(axialPower(m, 2.5, 0));
    expect(axialPower(m, 4.5, 0)).toBeLessThan(axialPower(m, 2.5, 0));
  });

  it('falls back to keratometry and records assumed axes (T3 has no axes or topography K)', () => {
    const m = corneaModel(buildCase(T3_INPUT).eyes.OD)!;
    expect(m.source).toBe('keratometer');
    expect(m.assumed).toContain('axes');
    expect(m.k1).toBe(46.75);
  });
});

describe('colour scale', () => {
  it('is blue for flat, red only from 46 D up', () => {
    expect(isRed(...colorFor(45.9))).toBe(false);
    expect(isRed(...colorFor(46.1))).toBe(true);
    expect(isRed(...colorFor(48.9))).toBe(true);
    const [r, , b] = colorFor(39);
    expect(b).toBeGreaterThan(r);
    expect(SCALE_COLORS).toHaveLength(24);
  });
});

describe('simulated maps agree with the case data', () => {
  it('T3 (K 46.75 / 47.50): the pre-fit map is red in the centre, matching R3', () => {
    const map = renderMap(preFitPower(corneaModel(buildCase(T3_INPUT).eyes.OD)!), 180);
    expect(analyzeCentralRed(map, map.centre, map.pxPerMm).flagged).toBe(true);
  });

  it('T1 pre-fit map has no red in the centre', () => {
    const map = renderMap(preFitPower(corneaModel(t1().eyes.OD)!), 180);
    expect(analyzeCentralRed(map, map.centre, map.pxPerMm).redFraction).toBe(0);
  });

  it('every post-wear demo map is flagged exactly when the visit says "red in central 3 mm"', () => {
    let checked = 0;
    for (const c of syntheticCases()) {
      for (const visit of postWearVisits(c)) {
        for (const eye of ['OD', 'OS'] as const) {
          if (!c.eyesFitted[eye]) continue;
          const sim = simulatePostWear(c, eye, visit, 180);
          if (!sim) continue;
          checked++;
          expect(sim.check.flagged, `${c.id} ${visit.date} ${eye}`).toBe(visit.eyes[eye].redInCentral3mm);
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('T1 12-month visit: treatment zone drawn decentred, centre otherwise flattened (blue)', () => {
    const c = t1();
    const last = postWearVisits(c).at(-1)!;
    expect(last.date).toBe('2026-09-15');
    const sim = simulatePostWear(c, 'OD', last, 180)!;
    expect(Math.hypot(sim.treatment.offsetMm.x, sim.treatment.offsetMm.y)).toBeGreaterThan(1);
    const six = postWearVisits(c).find((v) => v.date === '2026-03-15')!;
    const ok = simulatePostWear(c, 'OD', six, 180)!;
    expect(ok.treatment.offsetMm).toEqual({ x: 0, y: 0 });
    const centrePx = (90 * 180 + 90) * 4;
    const [r, , b] = ok.map.data.slice(centrePx, centrePx + 3);
    expect(b).toBeGreaterThan(r);
  });
});
