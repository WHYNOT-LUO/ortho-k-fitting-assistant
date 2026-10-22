import { describe, expect, it } from 'vitest';
import { T1_INPUT, T3_INPUT, buildCase, syntheticCases } from '../data/syntheticCases';
import { optometristSummary, parentSummary } from './summary';

describe('optometrist summary', () => {
  it('T3: leads with the stop flag and lists the key flags by rule ID', () => {
    const text = optometristSummary(buildCase(T3_INPUT), 'en');
    expect(text).toContain('DEMO-T3');
    expect(text).toMatch(/Stop.*R3/);
    for (const id of ['R3', 'R6', 'R7', 'R16']) expect(text).toContain(id);
    expect(text.indexOf('R3')).toBeLessThan(text.indexOf('R6'));
  });

  it('T1: includes the design conflict and the follow-up flags', () => {
    const text = optometristSummary(buildCase(T1_INPUT), 'zh');
    expect(text).toContain('规则冲突');
    expect(text).toContain('R11');
    expect(text).toContain('R12');
  });
});

describe('parent summary', () => {
  it('explains the numbers in plain words, without rule IDs', () => {
    const text = parentSummary(buildCase(T1_INPUT), 'en');
    expect(text).toContain('300 degrees');
    expect(text).toContain('24.80 mm');
    expect(text).not.toMatch(/\bR\d+\b/);
    expect(text).not.toMatch(/\bD\d\b/);
  });

  it('never promises results', () => {
    for (const lang of ['zh', 'en'] as const) {
      const text = parentSummary(buildCase(T1_INPUT), lang);
      expect(text).toMatch(lang === 'en' ? /not a promise|no promise|cannot promise/i : /不承诺|不能保证/);
      expect(text).not.toMatch(/guarantee(?!d? no)|will stop|保证治愈|一定会/i);
    }
  });

  it('T3: tells parents a further check is needed before fitting', () => {
    expect(parentSummary(buildCase(T3_INPUT), 'en')).toMatch(/further check/i);
  });

  it('works for every demo case in both languages with no leftover {placeholders}', () => {
    for (const c of syntheticCases()) {
      for (const lang of ['zh', 'en'] as const) {
        expect(optometristSummary(c, lang)).not.toMatch(/\{\w+\}/);
        expect(parentSummary(c, lang)).not.toMatch(/\{\w+\}/);
      }
    }
  });
});
