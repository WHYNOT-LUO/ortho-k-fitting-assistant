import { describe, expect, it } from 'vitest';
import { screenCase } from '../domain/screening';
import { suggestDesign } from '../domain/design';
import { clinicMetrics } from '../domain/metrics';
import { syntheticCases } from './syntheticCases';

describe('synthetic demo cases', () => {
  const cases = syntheticCases();

  it('are all marked synthetic and have unique IDs', () => {
    expect(cases.every((c) => c.synthetic)).toBe(true);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it('give the dashboard enough to show', () => {
    const m = clinicMetrics(cases);
    expect(m.casesWithFittingData).toBeGreaterThanOrEqual(6);
    expect(m.completedCases).toBeGreaterThanOrEqual(5);
    expect(m.reorderReasons.length).toBeGreaterThanOrEqual(3);
  });

  it('keep the notes cases T1-T4 behaving as the notes expect', () => {
    const byId = Object.fromEntries(cases.map((c) => [c.id, c]));
    expect(screenCase(byId['DEMO-T1']).eyes[0].overall).toBe('ok');
    expect(screenCase(byId['DEMO-T3']).eyes[0].overall).toBe('stop');
    expect(suggestDesign(byId['DEMO-T1'], 'OD').kind).toBe('conflict');
  });
});
