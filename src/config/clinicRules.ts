/**
 * CLINIC RULES — the single place for every rule and threshold the app uses.
 *
 * How to use this file:
 *  1. Go through each rule with the optometrist.
 *  2. Change the numbers if the clinic uses different ones.
 *  3. Set `confirmed: true` only after the optometrist has agreed to that rule.
 *  4. Bump `RULES_VERSION` whenever you change anything. Each saved design
 *     decision records the version it was made under, so old decisions stay
 *     traceable after the rules change.
 *
 * `source` says where a rule came from:
 *  - 'clinic'      the clinic told us this rule
 *  - 'ai-search'   came from an AI search; must be checked before use
 *  - 'placeholder' the clinic rule was unclear, so we picked a default (see `assumption`)
 *
 * Units: dioptres (D) for curvature and refraction, mm for lengths,
 * μm for corneal thickness. Myopia is negative (−6.00 D = 600 degrees / 600度).
 */

export const RULES_VERSION = '0.1.0';

export type RuleSource = 'clinic' | 'ai-search' | 'placeholder';

export interface Bilingual {
  zh: string;
  en: string;
}

export interface RuleMeta {
  /** Stable ID, shown next to every flag so you can trace it back here. */
  id: string;
  source: RuleSource;
  /** true only after the optometrist has checked this rule. */
  confirmed: boolean;
  description: Bilingual;
  /** What we assumed where the clinic rule was ambiguous. */
  assumption?: Bilingual;
}

export const clinicRules = {
  // ---------------------------------------------------------------- Part 2
  screening: {
    cornealCurvature: {
      meta: {
        id: 'S1-K-RANGE',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '角膜曲率正常范围 40–46 D。低于 40 D 塑形效果可能较弱；高于 46 D 需先排除圆锥角膜等眼病。',
          en: 'Normal corneal curvature is 40–46 D. Below 40 D expect a weaker shaping effect; above 46 D rule out eye disease such as keratoconus first.',
        },
        assumption: {
          zh: '使用角膜地形图 5 mm Sim K1 和 Sim K2（两条子午线都检查）；若无地形图数据则用生物测量仪 K1/K2。',
          en: 'Uses topography 5 mm Sim K1 and Sim K2 (both meridians); falls back to biometer K1/K2 if topography is missing.',
        },
      } satisfies RuleMeta,
      minD: 40,
      maxD: 46,
    },

    myopia: {
      meta: {
        id: 'S2-MYOPIA',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '近视 600 度（−6.00 D）以内效果最好。',
          en: 'Best results for myopia up to 600 degrees (−6.00 D).',
        },
        assumption: {
          zh: '用电脑验光的球镜度数（不是等效球镜）；超过 −6.00 D 只提示"超出最佳范围"，不判定为不适合。',
          en: 'Uses autorefractor sphere (not spherical equivalent). Beyond −6.00 D gives an "outside best range" warning, not an exclusion.',
        },
      } satisfies RuleMeta,
      bestMaxMyopiaD: -6.0,
    },

    astigmatism: {
      meta: {
        id: 'S3-ASTIG',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '散光 100 度（1.00 D）以内效果最好；100–200 度考虑环曲设计。',
          en: 'Best results for astigmatism up to 100 degrees (1.00 D); 100–200 degrees: consider a toric design (环曲设计).',
        },
        assumption: {
          zh: '用电脑验光的柱镜度数（屈光散光，不是角膜散光）；超过 200 度只提示，由验光师判断。',
          en: 'Uses autorefractor cylinder (refractive, not corneal astigmatism). Above 200 degrees gives a warning; the optometrist decides.',
        },
      } satisfies RuleMeta,
      bestMaxD: 1.0,
      toricMaxD: 2.0,
    },

    eValue: {
      meta: {
        id: 'S4-E-VALUE',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: 'e 值约 0.5 最理想。e 值越高塑形效果越强，但长期配戴可能偏紧（水肿或缺氧风险）。',
          en: 'An e-value of about 0.5 is ideal. Higher e gives a stronger shaping effect, but the lens may feel tighter over time (oedema or low-oxygen risk).',
        },
        assumption: {
          zh: '使用 7 mm 处 e 值；0.40–0.60 为理想，>0.70 提示注意，0.60–0.70 和 <0.40 作一般提示。',
          en: 'Uses the 7 mm e-value. 0.40–0.60 is ideal; above 0.70 is a caution; 0.60–0.70 and below 0.40 are notes.',
        },
      } satisfies RuleMeta,
      zoneMm: 7 as 6 | 7 | 8,
      idealMin: 0.4,
      idealMax: 0.6,
      cautionAbove: 0.7,
    },

    cct: {
      meta: {
        id: 'S5-CCT',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '中央角膜厚度正常 500–550 μm。偏薄则塑形效果较小、可矫正范围有限。',
          en: 'Normal central corneal thickness is 500–550 μm. Thinner means a smaller effect and a limited correction range.',
        },
        assumption: {
          zh: '高于 550 μm 时只作记录提示，诊所未给出具体规则。',
          en: 'Above 550 μm is noted only; the clinic gave no specific rule.',
        },
      } satisfies RuleMeta,
      normalMinUm: 500,
      normalMaxUm: 550,
    },

    lensThickness: {
      meta: {
        id: 'S6-LT-CYCLO',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '晶状体厚度 LT > 4 mm 需先做慢散验光，否则测得的近视度数可能不准确。',
          en: 'Lens thickness (LT) above 4 mm needs cycloplegic refraction (慢散) first, or the measured myopia may be inaccurate.',
        },
      } satisfies RuleMeta,
      cycloplegiaAboveMm: 4.0,
    },

    zoneDifference: {
      meta: {
        id: 'S7-ZONE-DIFF',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '5 mm Sim K 是主要参考。若 6–8 mm 的数值与其相差超过 0.5，提示参数可能需要调整。',
          en: '5 mm Sim K is the main reference. If the 6–8 mm values differ from it by more than 0.5, flag that the parameters may need adjusting.',
        },
        assumption: {
          zh: '比较 7 mm Sim K 与 5 mm Sim K，单位 D，K1 或 K2 任一相差 >0.50 D 即提示。需向诊所确认具体做法。',
          en: 'Compares 7 mm Sim K with 5 mm Sim K in dioptres; flags if K1 or K2 differs by more than 0.50 D. Ask the clinic how they actually apply this.',
        },
      } satisfies RuleMeta,
      compareZoneMm: 7 as 3 | 7,
      maxDiffD: 0.5,
    },

    extraChecks: {
      meta: {
        id: 'S8-IOP-FUNDUS',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '高度近视、进展快或眼轴长的儿童需做眼压和眼底检查。',
          en: 'Children with high myopia, fast progression or long axial length need intraocular pressure and fundus checks.',
        },
        assumption: {
          zh: '高度近视 ≤ −6.00 D；进展快 ≥ 0.50 D/年；眼轴长 ≥ 26.0 mm。',
          en: 'High myopia: −6.00 D or worse. Fast progression: 0.50 D/year or more. Long axial length: 26.0 mm or more.',
        },
      } satisfies RuleMeta,
      highMyopiaD: -6.0,
      fastProgressionDPerYear: 0.5,
      longAxialLengthMm: 26.0,
    },

    ocularSurface: {
      meta: {
        id: 'S9-SURFACE',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '基础检查中角膜或眼表异常，需先处理再验配。',
          en: 'Cornea or ocular surface marked abnormal in the basic tests: resolve before fitting.',
        },
      } satisfies RuleMeta,
    },

    allergicRhinitis: {
      meta: {
        id: 'S10-RHINITIS',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '病史中记录了严重过敏性鼻炎。',
          en: 'Severe allergic rhinitis recorded in the history.',
        },
        assumption: {
          zh: '诊所把它列入病史，但未说明如何影响验配，所以只作提示。',
          en: 'The clinic lists it in the history but did not say how it changes the fitting, so it is a note only.',
        },
      } satisfies RuleMeta,
    },
  },

  // ---------------------------------------------------------------- Part 3
  // These came from an AI search. They MUST be confirmed by the optometrist.
  design: {
    fourCurveLowMyopia: {
      meta: {
        id: 'D1-4C-LOW',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '低到中度近视（浅于 −4.00 D）且角膜规则 → 四弧区设计。',
          en: 'Low-to-moderate myopia (less myopic than −4.00 D) with a regular cornea → 4-curve.',
        },
      } satisfies RuleMeta,
      myopiaLimitD: -4.0,
    },
    fourCurveFastCorrection: {
      meta: {
        id: 'D2-4C-FAST',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '需要快速矫正 → 四弧区设计。',
          en: 'A need for fast correction → 4-curve.',
        },
      } satisfies RuleMeta,
    },
    fiveCurveHighMyopia: {
      meta: {
        id: 'D3-5C-HIGH',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '近视 −4.00 D 及以上 → 五弧区设计（定位更稳定）。',
          en: 'Myopia of −4.00 D or more → 5-curve (more stable centring).',
        },
      } satisfies RuleMeta,
      myopiaAtOrBeyondD: -4.0,
    },
    fiveCurveAstigmatism: {
      meta: {
        id: 'D4-5C-ASTIG',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '散光大于 1.50 D → 五弧区设计。',
          en: 'Astigmatism over 1.50 D → 5-curve.',
        },
      } satisfies RuleMeta,
      astigAboveD: 1.5,
    },
    fiveCurveChild: {
      meta: {
        id: 'D5-5C-CHILD',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '儿童 → 五弧区设计。',
          en: 'Children → 5-curve.',
        },
        assumption: {
          zh: '"儿童"指 12 岁以下。',
          en: '"Child" means under 12 years old.',
        },
      } satisfies RuleMeta,
      childUnderAgeYears: 12,
    },
    fiveCurveSensitive: {
      meta: {
        id: 'D6-5C-SENSITIVE',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '角膜敏感 → 五弧区设计。',
          en: 'Sensitive cornea → 5-curve.',
        },
        assumption: {
          zh: '由验光师在基础检查中勾选"角膜敏感"。',
          en: 'The optometrist ticks "sensitive cornea" in the basic tests.',
        },
      } satisfies RuleMeta,
    },
    regularCornea: {
      meta: {
        id: 'D7-REGULAR',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '"角膜规则"的判断标准。',
          en: 'What counts as a "regular cornea".',
        },
        assumption: {
          zh: '5 mm 角膜散光（|Sim K2 − Sim K1|）≤ 1.50 D，曲率在 40–46 D 内，且 7 mm 与 5 mm 相差不超过 0.50 D。',
          en: '5 mm corneal astigmatism (|Sim K2 − Sim K1|) of 1.50 D or less, curvature within 40–46 D, and 7 mm within 0.50 D of 5 mm.',
        },
      } satisfies RuleMeta,
      maxCornealAstigD: 1.5,
    },
    tieBreak: {
      meta: {
        id: 'D8-TIE',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '四弧区和五弧区规则同时满足时，以哪个为准。',
          en: 'Which design wins when both 4-curve and 5-curve rules match.',
        },
        assumption: {
          zh: '任何一条五弧区规则满足即建议五弧区。',
          en: 'Any matching 5-curve rule wins.',
        },
      } satisfies RuleMeta,
      winner: '5-curve' as '4-curve' | '5-curve',
    },
  },

  // ---------------------------------------------------------------- Part 4
  followUp: {
    axialGrowth: {
      meta: {
        id: 'F1-AL-GROWTH',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '眼轴增长 0.2–0.3 mm 提示近视控制可能偏弱（也可能是正常生长）。',
          en: 'Axial length growth of 0.2–0.3 mm suggests possibly weak myopia control (it can also be normal growth).',
        },
        assumption: {
          zh: '按每 12 个月计算（按实际间隔折算成年增长）；两次测量间隔至少 6 个月才判断；>0.3 mm/年提示"控制可能不足"。需向诊所确认时间窗口。',
          en: 'Measured per 12 months (scaled from the actual gap between measurements); needs at least 6 months between measurements; above 0.3 mm/year is "likely weak control". Ask the clinic for their time window.',
        },
      } satisfies RuleMeta,
      windowMonths: 12,
      minGapMonths: 6,
      possiblyWeakMmPerYear: 0.2,
      likelyWeakMmPerYear: 0.3,
    },
    overRefraction: {
      meta: {
        id: 'F2-OVER-REFRACTION',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '追加验光判断塑形力度：欠矫（力度不足）或过矫（力度过大，出现远视）。',
          en: 'Over-refraction shows whether the treatment force is right: under-correction (not enough force) or over-correction (too much force, causing hyperopia).',
        },
        assumption: {
          zh: '残余 ≤ −0.50 D 为欠矫；≥ +0.50 D 为过矫。',
          en: 'Residual of −0.50 D or more myopic is under-correction; +0.50 D or more is over-correction.',
        },
      } satisfies RuleMeta,
      underCorrectionAtOrBelowD: -0.5,
      overCorrectionAtOrAboveD: 0.5,
    },
    centralRed: {
      meta: {
        id: 'F3-CENTRAL-RED',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '戴镜后地形图中央 3 mm 区域内出现红色：可能偏位、镜下气泡或干燥点。',
          en: 'Red inside the central 3 mm zone on post-wear topography: possible decentration, an air bubble under the lens, or a dry spot.',
        },
      } satisfies RuleMeta,
      zoneDiameterMm: 3,
    },
  },

  // ---------------------------------------------------------- Stretch goal
  imageCheck: {
    centralRedFraction: {
      meta: {
        id: 'X1-IMAGE-RED',
        source: 'placeholder',
        confirmed: false,
        description: {
          zh: '（实验功能）从上传的地形图图片中自动检测中央 3 mm 内的红色像素。',
          en: '(Experimental) Detects red pixels inside the central 3 mm of an uploaded topography map image.',
        },
        assumption: {
          zh: '中央区内红色像素超过 5% 即提示。阈值未经验证。',
          en: 'Flags when more than 5% of central-zone pixels are red. Threshold is unvalidated.',
        },
      } satisfies RuleMeta,
      redFractionThreshold: 0.05,
    },
  },
} as const;

/** Every rule's metadata as a flat list, for the Rules page and checks. */
export function allRuleMetas(): RuleMeta[] {
  const metas: RuleMeta[] = [];
  for (const group of Object.values(clinicRules)) {
    for (const rule of Object.values(group)) {
      metas.push((rule as { meta: RuleMeta }).meta);
    }
  }
  return metas;
}

export function ruleMetaById(id: string): RuleMeta | undefined {
  return allRuleMetas().find((m) => m.id === id);
}
