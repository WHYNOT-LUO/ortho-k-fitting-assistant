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

  it('explains every placeholder rule with an assumption', () => {
    for (const meta of allRuleMetas().filter((m) => m.source === 'placeholder')) {
      expect(meta.assumption, meta.id).toBeDefined();
    }
  });

  it('keeps ranges in a sensible order', () => {
    const s = clinicRules.screening;
    expect(s.cornealCurvature.minD).toBeLessThan(s.cornealCurvature.maxD);
    expect(s.astigmatism.bestMaxD).toBeLessThan(s.astigmatism.toricMaxD);
    expect(s.eValue.idealMin).toBeLessThan(s.eValue.idealMax);
    expect(s.eValue.idealMax).toBeLessThanOrEqual(s.eValue.cautionAbove);
    expect(s.cct.normalMinUm).toBeLessThan(s.cct.normalMaxUm);
    const f = clinicRules.followUp;
    expect(f.axialGrowth.possiblyWeakMmPerYear).toBeLessThan(f.axialGrowth.likelyWeakMmPerYear);
    expect(f.overRefraction.underCorrectionAtOrBelowD).toBeLessThan(f.overRefraction.overCorrectionAtOrAboveD);
  });
});
