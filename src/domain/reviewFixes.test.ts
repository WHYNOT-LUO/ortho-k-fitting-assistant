// Regression tests for the code-review findings fixed on 2026-10-24.
import { describe, expect, it } from 'vitest';
import { T1_INPUT, T4_INPUT, buildCase, buildVisit } from '../data/syntheticCases';
import { csvEscape } from '../storage/csvExport';
import { loadCasesWithStatus, normalizeCase, CASES_STORAGE_KEY } from '../storage/caseStore';
import { suggestDesign } from './design';
import { caseOutcome } from './metrics';
import { flagKey, screenEye } from './screening';
import { emptyTrialLens } from './types';

describe('R17: one response per measurement', () => {
  it('gives each unreliable measurement its own key', () => {
    const c = buildCase(T4_INPUT);
    c.eyes.OD.biometry.alSd = 0.05; // AL also unreliable now
    const r17 = screenEye(c, 'OD').flags.filter((f) => f.ruleId === 'R17');
    expect(r17).toHaveLength(2);
    expect(new Set(r17.map(flagKey)).size).toBe(2);
  });
});

describe('plus sphere is not myopia', () => {
  it('R7 says there is no myopia instead of "150 degrees of myopia"', () => {
    const c = buildCase(T1_INPUT);
    c.eyes.OD.basic.sphere = 1.5;
    const r7 = screenEye(c, 'OD').flags.find((f) => f.ruleId === 'R7')!;
    expect(r7.code).toBe('R7.noMyopia');
    expect(r7.level).toBe('info');
  });

  it('D1 does not suggest a 4-curve lens for a non-myopic eye', () => {
    const c = buildCase(T1_INPUT);
    c.ageYears = 16;
    c.eyes.OD.basic.sphere = 0.5;
    expect(suggestDesign(c, 'OD').fourReasons.map((r) => r.ruleId)).not.toContain('D1');
  });
});

describe('right first time ignores trials after success', () => {
  it('a refit months after a successful one-lens fit does not change the first fit', () => {
    const c = buildCase({ ...T1_INPUT, visits: [] });
    c.visits = [
      buildVisit('a', '2026-01-01', 'fitting', { OD: { trials: [emptyTrialLens()] } }),
      buildVisit('b', '2026-01-08', 'follow-up', { OD: { fitSuccessful: true } }),
      buildVisit('c', '2026-08-01', 'fitting', { OD: { trials: [emptyTrialLens()] } }),
    ];
    expect(caseOutcome(c).eyes.OD!.rightFirstTime).toBe(true);
  });
});

describe('CSV formula injection', () => {
  it('neutralises text that a spreadsheet would run as a formula', () => {
    expect(csvEscape('=HYPERLINK("http://x")')).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvEscape('+1+1')).toBe("'+1+1");
    expect(csvEscape('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvEscape(-3)).toBe('-3'); // real numbers stay numbers
    expect(csvEscape('TL-1 (synthetic)')).toBe('TL-1 (synthetic)');
  });
});

describe('imported visits get unique ids', () => {
  it('fills in missing or repeated visit ids', () => {
    const c = normalizeCase({ id: 'X', visits: [{ date: '2026-01-01' }, { date: '2026-02-01' }, { id: 'v', date: '2026-03-01' }, { id: 'v' }] })!;
    const ids = c.visits.map((v) => v.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(4);
    expect(ids[2]).toBe('v');
  });
});

describe('unreadable storage is kept, not wiped', () => {
  it('saves the unreadable text under a separate key and reports it', () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    };
    store.set(CASES_STORAGE_KEY, '[{"id":"OK-2026-0001", "ageYe'); // truncated write
    const r = loadCasesWithStatus(fake);
    expect(r.cases).toEqual([]);
    expect(r.recoveredKey).toBeTruthy();
    expect(store.get(r.recoveredKey!)).toBe('[{"id":"OK-2026-0001", "ageYe');
  });

  it('loads normally when the data is fine', () => {
    const store = new Map<string, string>([[CASES_STORAGE_KEY, '[{"id":"A"}]']]);
    const r = loadCasesWithStatus({ getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v) });
    expect(r.cases.map((c) => c.id)).toEqual(['A']);
    expect(r.recoveredKey).toBeNull();
  });
});
