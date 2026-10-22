import { describe, expect, it } from 'vitest';
import { examSections, sectionValues } from './fieldSpecs';
import { emptyEyeExam } from './types';

describe('examSections', () => {
  it('only refers to fields that exist in the data model', () => {
    const exam = emptyEyeExam();
    for (const section of examSections) {
      const values = sectionValues(exam, section.id);
      for (const group of section.groups) {
        for (const field of group.fields) {
          if (field.kind === 'computed') continue;
          expect(field.key in values, `${section.id}.${field.key}`).toBe(true);
          if (field.kind === 'measured') expect(field.sdKey in values, `${section.id}.${field.sdKey}`).toBe(true);
        }
      }
    }
  });

  it('computes S.E. and corneal CYL from the T1 printout values', () => {
    const basic = examSections[0];
    const fields = basic.groups.flatMap((g) => g.fields);
    const se = fields.find((f) => f.key === 'se');
    const kCyl = fields.find((f) => f.key === 'kCyl');
    if (se?.kind !== 'computed' || kCyl?.kind !== 'computed') throw new Error('missing computed fields');
    expect(se.compute({ sphere: -3, cylinder: -0.75 })).toBeCloseTo(-3.375);
    expect(kCyl.compute({ kK1: 42.25, kK2: 43 })).toBeCloseTo(0.75);
  });
});
