import { describe, expect, it } from 'vitest';
import { T1_INPUT, buildCase, syntheticCases } from '../data/syntheticCases';
import { csvEscape, eyesCsv, parseCsvRows, visitsCsv } from './csvExport';

describe('csvEscape', () => {
  it('quotes commas, quotes and new lines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('two\nlines')).toBe('"two\nlines"');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(true)).toBe('1');
  });
});

describe('eyesCsv', () => {
  const cases = syntheticCases();
  const csv = eyesCsv(cases);
  const rows = parseCsvRows(csv);
  const header = rows[0];
  const col = (name: string) => header.indexOf(name);

  it('starts with a BOM so Excel reads Chinese correctly', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('has one row per fitted eye', () => {
    const eyes = cases.reduce((a, c) => a + Number(c.eyesFitted.OD) + Number(c.eyesFitted.OS), 0);
    expect(rows.length - 1).toBe(eyes);
  });

  it('follows the path measurements → flags → design → trial lenses → outcome', () => {
    for (const name of ['case_id', 'synthetic', 'eye', 'age_years', 'sphere', 'al', 'simK1_5', 'e6', 'flags_raised', 'design_suggested', 'design_chosen', 'trial_lenses', 'fit_reorders', 'visits_to_success', 'right_first_time', 'al_growth_mm_per_year']) {
      expect(col(name), name).toBeGreaterThanOrEqual(0);
    }
    const t1 = rows.find((r) => r[col('case_id')] === 'DEMO-T1')!;
    expect(t1[col('synthetic')]).toBe('1');
    expect(t1[col('sphere')]).toBe('-3');
    expect(t1[col('trial_lenses')]).toBe('2');
    expect(t1[col('al_growth_mm_per_year')]).toBe('0.28');
  });

  it('contains no calendar dates and no free-text notes', () => {
    expect(csv).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    for (const name of ['notes', 'surfaceNotes', 'fundusNotes', 'examDate']) expect(col(name), name).toBe(-1);
  });

  it('records the optometrist response to each flag', () => {
    const c = buildCase(T1_INPUT);
    c.history.severeAllergicRhinitis = true;
    c.flagResponses['case:N3:N3.rhinitis'] = { response: 'noted', note: '', at: '2026-01-01T00:00:00Z' };
    const r = parseCsvRows(eyesCsv([c]));
    expect(r[1][r[0].indexOf('flag_responses')]).toContain('N3:noted');
  });
});

describe('visitsCsv', () => {
  it('has one row per visit per fitted eye, timed in days since the exam', () => {
    const c = buildCase(T1_INPUT);
    const rows = parseCsvRows(visitsCsv([c]));
    expect(rows.length - 1).toBe(c.visits.length);
    const h = rows[0];
    expect(rows[1][h.indexOf('days_from_exam')]).toBe('7');
    expect(rows[1][h.indexOf('fluorescein_sequence')]).toBe('tight>ideal');
    expect(rows[5][h.indexOf('flags')]).toContain('R12');
  });
});
