import { describe, expect, it } from 'vitest';
import { allRuleMetas, clinicRules } from './clinicRules';

describe('clinicRules config', () => {
  it('gives every rule a unique ID', () => {
    const ids = allRuleMetas().map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has Chinese and English text for every rule', () => {
    for (const meta of allRuleMetas()) {
      expect(meta.description.zh.length, meta.id).toBeGreaterThan(0);
      expect(meta.description.en.length, meta.id).toBeGreaterThan(0);
      if (meta.assumption) {
        expect(meta.assumption.zh.length, meta.id).toBeGreaterThan(0);
        expect(meta.assumption.en.length, meta.id).toBeGreaterThan(0);
      }
    }
  });

  it('includes every rule from the notes (R1–R17)', () => {
    const ids = new Set(allRuleMetas().map((m) => m.id));
    for (let n = 1; n <= 17; n++) expect(ids.has(`R${n}`), `R${n}`).toBe(true);
  });

  it('keeps ranges in a sensible order', () => {
    const s = clinicRules.screening;
    expect(s.kLow.belowD).toBeLessThan(s.kHigh.aboveD);
    expect(s.astigStandard.bestMaxD).toBeLessThan(s.astigToric.toricMaxD);
    expect(s.eValue.idealMin).toBeLessThan(s.eValue.idealMax);
    expect(s.cct.normalMinUm).toBeLessThan(s.cct.normalMaxUm);
    const f = clinicRules.followUp;
    expect(f.axialGrowth.possiblyWeakMmPerYear).toBeLessThan(f.axialGrowth.likelyWeakAboveMmPerYear);
    expect(f.underCorrection.atOrBelowD).toBeLessThan(f.overCorrection.atOrAboveD);
  });
});
