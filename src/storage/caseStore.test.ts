import { describe, expect, it } from 'vitest';
import { emptyCase } from '../domain/types';
import { backupJson, mergeCases, nextCaseId, normalizeCase, parseCases } from './caseStore';

describe('nextCaseId', () => {
  it('starts at 0001 for a new year', () => {
    expect(nextCaseId([], 2026)).toBe('OK-2026-0001');
  });

  it('continues after the highest ID of that year and ignores other prefixes', () => {
    const ids = [{ id: 'OK-2026-0003' }, { id: 'OK-2026-0010' }, { id: 'OK-2025-0099' }, { id: 'DEMO-T1' }];
    expect(nextCaseId(ids, 2026)).toBe('OK-2026-0011');
  });
});

describe('normalizeCase', () => {
  it('rejects data without an ID', () => {
    expect(normalizeCase({})).toBeNull();
    expect(normalizeCase('nope')).toBeNull();
  });

  it('fills missing fields from older or partial data', () => {
    const c = normalizeCase({ id: 'OK-2026-0001', ageYears: 10, eyes: { OD: { biometry: { al: 24.8 } } } });
    expect(c).not.toBeNull();
    expect(c!.ageYears).toBe(10);
    expect(c!.eyes.OD.biometry.al).toBe(24.8);
    expect(c!.eyes.OD.biometry.cct).toBeNull();
    expect(c!.eyes.OS.topography.keratoconusPanel).toBe('');
    expect(c!.visits).toEqual([]);
  });

  it('drops unknown fields instead of keeping them', () => {
    const c = normalizeCase({ id: 'X', patientName: 'should not be kept' });
    expect(c).not.toHaveProperty('patientName');
  });
});

describe('backup round trip', () => {
  it('parses its own backup file', () => {
    const a = emptyCase('OK-2026-0001');
    a.ageYears = 11;
    const back = parseCases(backupJson([a]));
    expect(back).toHaveLength(1);
    expect(back[0].ageYears).toBe(11);
  });

  it('merges imported cases, replacing same IDs', () => {
    const a = emptyCase('A');
    const b = emptyCase('B');
    const a2 = { ...emptyCase('A'), ageYears: 9 };
    const merged = mergeCases([a, b], [a2]);
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.id === 'A')!.ageYears).toBe(9);
  });
});
