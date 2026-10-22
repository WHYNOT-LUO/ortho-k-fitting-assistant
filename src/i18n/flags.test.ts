import { describe, expect, it } from 'vitest';
import { T2_INPUT, T3_INPUT, buildCase } from '../data/syntheticCases';
import { screenCase, screenEye } from '../domain/screening';
import { en } from './en';
import { flagText, notCheckedText } from './flags';
import { zh } from './zh';

describe('flag wording', () => {
  it('has a Chinese and English message for every flag the demo cases can raise', () => {
    for (const input of [T2_INPUT, T3_INPUT]) {
      for (const eye of screenCase(buildCase(input)).eyes) {
        for (const f of eye.flags) {
          const key = `flag.${f.code}`;
          expect(key in zh, key).toBe(true);
          expect(key in en, key).toBe(true);
        }
      }
    }
  });

  it('fills in numbers and translated words, leaving no {placeholders}', () => {
    const r = screenEye(buildCase(T2_INPUT), 'OD');
    for (const f of r.flags) {
      for (const lang of ['zh', 'en'] as const) {
        expect(flagText(lang, f), `${lang} ${f.code}`).not.toMatch(/\{\w+\}/);
      }
    }
    const r16 = r.flags.find((f) => f.ruleId === 'R16')!;
    expect(flagText('en', r16)).toContain('long axial length');
    expect(flagText('zh', r16)).toContain('眼轴长');
    const r2 = r.flags.find((f) => f.ruleId === 'R2')!;
    expect(flagText('en', r2)).toContain('39.50');
  });

  it('describes missing data in plain words', () => {
    const r = screenEye(buildCase(T2_INPUT), 'OD');
    const nc = r.notChecked.find((n) => n.ruleId === 'R10')!;
    expect(notCheckedText('en', nc)).toContain('Sim K @7 mm');
  });
});
