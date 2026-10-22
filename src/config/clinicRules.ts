/**
 * CLINIC RULES — the single place for every rule and threshold the app uses.
 *
 * Source of truth: ortho-k-fitting-notes.md (Section 4 rule table R1–R17,
 * Section 8 design table, Section 9 open questions Q1–Q7).
 *
 * How to use this file:
 *  1. Go through each rule with the optometrist (the Rules page lists them all).
 *  2. Change the numbers if the clinic uses different ones.
 *  3. Set `confirmed: true` only after the optometrist has agreed to that rule.
 *  4. Bump `RULES_VERSION` whenever you change anything. Each saved design
 *     decision records the version it was made under, so old decisions stay
 *     traceable after the rules change.
 *
 * `source` says where a rule came from:
 *  - 'clinic'          the clinic notes (Section 4 of the notes)
 *  - 'supplier-guide'  the lens supplier's fitting guide (Section 6)
 *  - 'ai-search'       an AI search, unverified (Section 8)
 *  - 'app'             added for the app (e.g. R17)
 * `assumption` explains any number or detail we had to assume. Rules with an
 * assumption are shown as "contains assumed values" until confirmed.
 *
 * Units: dioptres (D) for curvature and refraction, mm for lengths,
 * μm for corneal thickness. Myopia and cylinder are negative:
 * −6.00 D = 600 degrees (600度).
 */

export const RULES_VERSION = '0.2.0';

export type RuleSource = 'clinic' | 'supplier-guide' | 'ai-search' | 'app';

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
  /** What we assumed where the clinic rule was unclear. */
  assumption?: Bilingual;
  /** Open question in Section 9 of the notes that this rule depends on. */
  question?: string;
}

export const clinicRules = {
  // ------------------------------------------------- Part 2: suitability
  screening: {
    kNormal: {
      meta: {
        id: 'R1',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '角膜曲率 (K) 40–46 D 为正常范围（下限见 R2，上限见 R3）。',
          en: 'Corneal curvature (K) of 40–46 D is the normal range (lower limit in R2, upper limit in R3).',
        },
        assumption: {
          zh: '使用电脑验光仪的角膜曲率 K1 和 K2（两条子午线都检查）。没有时依次用地形图 5 mm Sim K、生物测量仪 K。',
          en: 'Uses keratometer K1 and K2 from the autorefractor (both meridians). If missing, falls back to topography 5 mm Sim K, then biometer K.',
        },
      } satisfies RuleMeta,
    },
    kLow: {
      meta: {
        id: 'R2',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '角膜曲率低于 40 D：曲率偏低，预期塑形效果较弱。',
          en: 'Corneal curvature below 40 D: lower curvature, weaker expected effect.',
        },
      } satisfies RuleMeta,
      belowD: 40,
    },
    kHigh: {
      meta: {
        id: 'R3',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '角膜曲率高于 46 D：验配前须先排除圆锥角膜等眼病。停止并转诊。',
          en: 'Corneal curvature above 46 D: rule out eye disease such as keratoconus (圆锥角膜) before fitting. Stop and refer.',
        },
      } satisfies RuleMeta,
      aboveD: 46,
    },
    eValue: {
      meta: {
        id: 'R4',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: 'e 值约 0.5 最理想。e 值越高，角膜向周边越平，塑形效果越好，但长期配戴可能偏紧（角膜水肿或缺氧风险）。',
          en: 'An e-value of about 0.5 is ideal. Higher e means the cornea flattens more toward the edge and shaping works better, but the lens may feel tighter over time (corneal oedema or low-oxygen risk).',
        },
        assumption: {
          zh: '使用 6 mm 处 e 值。0.40–0.60 视为"约 0.5"；高于 0.60 提示偏紧风险；低于 0.40 只作提示。',
          en: 'Uses e @6 mm. 0.40–0.60 counts as "about 0.5"; above 0.60 warns about tightening; below 0.40 is a note only.',
        },
        question: 'Q3',
      } satisfies RuleMeta,
      zoneMm: 6 as 6 | 7 | 8,
      idealMin: 0.4,
      idealMax: 0.6,
    },
    cct: {
      meta: {
        id: 'R5',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '中央角膜厚度正常 500–550 μm。低于范围：效果不明显，可矫正范围有限。',
          en: 'Normal central corneal thickness is 500–550 μm. Below range: effect not obvious, limited correction range.',
        },
      } satisfies RuleMeta,
      normalMinUm: 500,
      normalMaxUm: 550,
    },
    lensThickness: {
      meta: {
        id: 'R6',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '晶体厚度 LT > 4 mm：须先做慢散验光，否则测得的近视度数可能不准确。',
          en: 'Lens thickness (LT) above 4 mm: do cycloplegic refraction (慢散) first, otherwise the measured myopia may be inaccurate.',
        },
        assumption: {
          zh: '若本次验光已勾选"慢散"，则不再提示。',
          en: 'No flag if the refraction is already marked as cycloplegic.',
        },
      } satisfies RuleMeta,
      cycloplegiaAboveMm: 4.0,
    },
    myopia: {
      meta: {
        id: 'R7',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '近视 (S) 600 度（−6.00 D）以内效果最好。超过则超出最佳范围。',
          en: 'Myopia (S) up to 600 degrees (−6.00 D) gives the best results. More than that is outside the best range.',
        },
      } satisfies RuleMeta,
      bestMaxMyopiaD: -6.0,
    },
    astigStandard: {
      meta: {
        id: 'R8',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '散光 (C) 100 度（−1.00 D）以内：标准设计效果最好。',
          en: 'Astigmatism (C) up to 100 degrees (−1.00 D): best results with a standard design.',
        },
        assumption: {
          zh: '使用电脑验光的柱镜 C（屈光散光）。诊所以角膜散光多少切换环曲设计尚待确认。',
          en: 'Uses autorefractor cylinder C (refractive astigmatism). The corneal-astigmatism point at which the clinic switches to toric is still open.',
        },
        question: 'Q6',
      } satisfies RuleMeta,
      bestMaxD: 1.0,
    },
    astigToric: {
      meta: {
        id: 'R9',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '散光 (C) 100–200 度（−1.00 至 −2.00 D）：考虑环曲设计。',
          en: 'Astigmatism (C) of 100–200 degrees (−1.00 to −2.00 D): consider a toric (环曲) design.',
        },
        assumption: {
          zh: '超过 200 度不在诊所规则范围内，提示由验光师判断。',
          en: 'Above 200 degrees is outside the clinic rules; the app warns and leaves it to the optometrist.',
        },
        question: 'Q6',
      } satisfies RuleMeta,
      toricMaxD: 2.0,
    },
    zoneDifference: {
      meta: {
        id: 'R10',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '5 mm Sim K 是主要参考；若 6–8 mm 数据相差超过 0.5，参数可能需要上调或下调。',
          en: '5 mm Sim K is the main reference; if the 6–8 mm data differ by more than 0.5, parameters may need adjusting up or down.',
        },
        assumption: {
          zh: '比较 7 mm 与 5 mm 的 Sim K（单位 D），K1 或 K2 任一相差超过 0.50 D 即提示。不提示调整哪个参数或方向。',
          en: 'Compares 7 mm with 5 mm Sim K in dioptres; flags if K1 or K2 differs by more than 0.50 D. Does not say which parameter to adjust or in which direction.',
        },
        question: 'Q1',
      } satisfies RuleMeta,
      compareZoneMm: 7 as 3 | 7,
      maxDiffD: 0.5,
    },
    highRiskChild: {
      meta: {
        id: 'R16',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '高风险儿童（高度近视、进展快或眼轴长）：检查眼压和眼底。',
          en: 'High-risk child (high myopia, fast progression or long axial length): check intraocular pressure and fundus.',
        },
        assumption: {
          zh: '高度近视 ≤ −6.00 D；进展快 ≥ 0.50 D/年；眼轴长 ≥ 26.00 mm。对所有年龄适用。',
          en: 'High myopia: −6.00 D or worse. Fast progression: 0.50 D/year or more. Long axial length: 26.00 mm or more. Applied at any age.',
        },
      } satisfies RuleMeta,
      highMyopiaD: -6.0,
      fastProgressionDPerYear: 0.5,
      longAxialLengthMm: 26.0,
    },
    measurementSd: {
      meta: {
        id: 'R17',
        source: 'app',
        confirmed: false,
        description: {
          zh: '多次测量的标准差 (SD) 过大：测量不可靠，请重新测量。',
          en: 'High SD across repeated readings: the measurement is unreliable; re-measure.',
        },
        assumption: {
          zh: 'SD 上限为暂定值：AL 0.02 mm，CCT 10 μm，AD/LT/VT 0.05 mm，K1/K2 0.25 D。由读数计算时用总体标准差。',
          en: 'SD limits are placeholders: AL 0.02 mm, CCT 10 μm, AD/LT/VT 0.05 mm, K1/K2 0.25 D. SD computed from readings uses the population SD.',
        },
      } satisfies RuleMeta,
      maxSd: { al: 0.02, cct: 10, ad: 0.05, lt: 0.05, vt: 0.05, k1: 0.25, k2: 0.25 },
    },
    keratoconusPanel: {
      meta: {
        id: 'N1',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '地形图圆锥角膜筛查必须正常才能验配（笔记 3.3 节）。',
          en: 'The topography keratoconus screening panel must be clear before fitting (notes Section 3.3).',
        },
      } satisfies RuleMeta,
    },
    ocularSurface: {
      meta: {
        id: 'N2',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '基础检查中角膜或眼表健康异常：先处理再验配（笔记第 2 节）。',
          en: 'Cornea or ocular surface marked abnormal in the basic tests: resolve before fitting (notes Section 2).',
        },
        assumption: {
          zh: '诊所未写明处理方式，提示级别为"注意"。',
          en: 'The notes do not say what to do, so this is a caution.',
        },
      } satisfies RuleMeta,
    },
    allergicRhinitis: {
      meta: {
        id: 'N3',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '病史中记录了严重过敏性鼻炎（笔记第 2 节）。',
          en: 'Severe allergic rhinitis recorded in the history (notes Section 2).',
        },
        assumption: {
          zh: '笔记把它列入病史，但未说明如何影响验配，所以只作提示。',
          en: 'The notes list it in the history but do not say how it changes the fitting, so it is a note only.',
        },
      } satisfies RuleMeta,
    },
  },

  // ------------------------------------------- Trial lens evaluation
  trialFitting: {
    fluorescein: {
      meta: {
        id: 'G1',
        source: 'supplier-guide',
        confirmed: false,
        description: {
          zh: '荧光评估：偏松 → 曲率加一档；适中 → 保持；偏紧 → 曲率减一档。重复直到适中。',
          en: 'Fluorescein: loose → increase curvature one step; ideal → keep; tight → decrease curvature one step. Repeat until ideal.',
        },
        assumption: {
          zh: '档位大小（0.25 或 0.5）和初始曲率范围在指南照片中被截掉，本应用只提示方向，不计算数值。',
          en: 'Step sizes (0.25 or 0.5) and the initial curvature range were cut off in the guide photo, so the app only shows the direction, never a value.',
        },
        question: 'Q5',
      } satisfies RuleMeta,
    },
    tearLayer: {
      meta: {
        id: 'R15',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '荧光下泪液层某一方向过厚：该方向压力不足。垂直方向多为散光，考虑环曲设计。',
          en: 'Fluorescein tear layer too thick in one direction: not enough pressure in that direction. Vertical: likely astigmatism; consider toric.',
        },
      } satisfies RuleMeta,
    },
  },

  // ------------------------------------------- Part 3: design suggestion
  // From an AI search (notes Section 8). UNVERIFIED: suggestion only.
  // When 4-curve and 5-curve rules both match, the app shows BOTH reasons and
  // leaves the choice to the optometrist. It never picks one silently (Q4).
  design: {
    fourCurveLowMyopia: {
      meta: {
        id: 'D1',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '低到中度近视（浅于 −4.00 D）且角膜规则 → 四弧区：矫正快，离焦强。',
          en: 'Low-to-moderate myopia (less myopic than −4.00 D) with a regular cornea → 4-curve: fast correction, strong defocus.',
        },
        question: 'Q4',
      } satisfies RuleMeta,
      lessMyopicThanD: -4.0,
    },
    fiveCurveHighMyopia: {
      meta: {
        id: 'D2',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '高度近视 → 五弧区：定位更稳定，偏位和不对称离焦更少。',
          en: 'High myopia → 5-curve: more stable centring, less decentration and asymmetric defocus.',
        },
        assumption: {
          zh: '"高度近视"指 −4.00 D 及以上（即不属于 D1 的低到中度）。',
          en: '"High myopia" means −4.00 D or more myopic (everything not low-to-moderate in D1).',
        },
        question: 'Q4',
      } satisfies RuleMeta,
      atOrBeyondD: -4.0,
    },
    fiveCurveAstigmatism: {
      meta: {
        id: 'D3',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '散光大于 1.50 D → 五弧区：定位更稳定。',
          en: 'Astigmatism over 1.50 D → 5-curve: more stable centring.',
        },
        assumption: {
          zh: '使用电脑验光柱镜 C 的绝对值。',
          en: 'Uses the size of the autorefractor cylinder C.',
        },
        question: 'Q6',
      } satisfies RuleMeta,
      aboveD: 1.5,
    },
    fiveCurveChild: {
      meta: {
        id: 'D4',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '儿童 → 五弧区：更安全，耐受更好。',
          en: 'Children → 5-curve: safer, better tolerated.',
        },
        assumption: {
          zh: '"儿童"指 12 岁以下。',
          en: '"Child" means under 12 years old.',
        },
        question: 'Q4',
      } satisfies RuleMeta,
      underAgeYears: 12,
    },
    fiveCurveSensitive: {
      meta: {
        id: 'D5',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '角膜敏感 → 五弧区：更安全，耐受更好。',
          en: 'Sensitive cornea → 5-curve: safer, better tolerated.',
        },
        assumption: {
          zh: '由验光师在基础检查中勾选"角膜敏感"。',
          en: 'The optometrist ticks "sensitive cornea" in the basic tests.',
        },
      } satisfies RuleMeta,
    },
    fourCurveFast: {
      meta: {
        id: 'D6',
        source: 'ai-search',
        confirmed: false,
        description: {
          zh: '患者希望短期内快速矫正 → 四弧区：起效更快。',
          en: 'Patient wants fast short-term correction → 4-curve: works faster.',
        },
      } satisfies RuleMeta,
    },
    regularCornea: {
      meta: {
        id: 'D7',
        source: 'app',
        confirmed: false,
        description: {
          zh: 'D1 中"角膜规则"的判断标准。',
          en: 'What counts as a "regular cornea" in D1.',
        },
        assumption: {
          zh: '角膜散光（K2 − K1）≤ 1.50 D，曲率在 R2–R3 之间，没有 R10 提示，圆锥角膜筛查不是"可疑"。',
          en: 'Corneal astigmatism (K2 − K1) of 1.50 D or less, curvature between the R2 and R3 limits, no R10 flag, and the keratoconus panel not "suspect".',
        },
      } satisfies RuleMeta,
      maxCornealAstigD: 1.5,
    },
  },

  // ------------------------------------------------- Part 4: follow-up
  followUp: {
    axialGrowth: {
      meta: {
        id: 'R11',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '眼轴增长 +0.2 至 0.3 mm：近视控制可能偏弱，也可能是正常生理性增长。',
          en: 'Axial length growth of +0.2 to 0.3 mm: possibly weak myopia control. It may also be normal physiological growth.',
        },
        assumption: {
          zh: '按 12 个月计算：取最近一次测量与约 12 个月前的测量比较，按实际间隔折算为每年增长；间隔不足 6 个月不判断。>0.30 mm/年提示"控制可能不足"。未按年龄区分。',
          en: 'Per 12 months: compares the latest reading with the one about 12 months earlier, scaled to growth per year; no judgement if the gap is under 6 months. Above 0.30 mm/year is "likely weak control". Not age-specific.',
        },
        question: 'Q2',
      } satisfies RuleMeta,
      windowMonths: 12,
      minGapMonths: 6,
      possiblyWeakMmPerYear: 0.2,
      likelyWeakAboveMmPerYear: 0.3,
    },
    centralRed: {
      meta: {
        id: 'R12',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '戴镜后地形图中央 3 mm 内出现红色：可能偏位、镜下气泡或干燥点。（正常应为黄到蓝。）',
          en: 'Red inside the central 3 mm on post-wear topography: possible decentration, an air bubble, or a dry spot. (Normal wear shows yellow to blue.)',
        },
      } satisfies RuleMeta,
      zoneDiameterMm: 3,
    },
    underCorrection: {
      meta: {
        id: 'R13',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '戴镜验光有残余近视：塑形力度不足。',
          en: 'Residual myopia on over-refraction: treatment force not enough.',
        },
        assumption: {
          zh: '残余 ≤ −0.50 D 才提示。',
          en: 'Flags at −0.50 D or more myopic.',
        },
      } satisfies RuleMeta,
      atOrBelowD: -0.5,
    },
    overCorrection: {
      meta: {
        id: 'R14',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '戴镜验光过矫或出现远视：压力过大。',
          en: 'Over-corrected or hyperopic on over-refraction: pressure too high.',
        },
        assumption: {
          zh: '≥ +0.50 D 才提示。',
          en: 'Flags at +0.50 D or more.',
        },
      } satisfies RuleMeta,
      atOrAboveD: 0.5,
    },
  },

  // ------------------------------------------------- Part 6: business case
  business: {
    clinicBaseline: {
      meta: {
        id: 'B1',
        source: 'clinic',
        confirmed: false,
        description: {
          zh: '诊所现有的典型数字，用于和本应用记录的数据对比。',
          en: 'The clinic’s current typical numbers, to compare against what the app records.',
        },
        assumption: {
          zh: '尚未提供；在看板中显示为"待填"。',
          en: 'Not provided yet; the dashboard shows them as "to be filled in".',
        },
        question: 'Q7',
      } satisfies RuleMeta,
      avgTrialLensesPerCase: null as number | null,
      reorderRatePercent: null as number | null,
    },
  },

  // ------------------------------------------------- Stretch goal
  imageCheck: {
    centralRedFraction: {
      meta: {
        id: 'I1',
        source: 'app',
        confirmed: false,
        description: {
          zh: '（实验功能）从上传的戴镜后地形图图片中检测中央 3 mm 内的红色像素。',
          en: '(Experimental) Detects red pixels inside the central 3 mm of an uploaded post-wear topography image.',
        },
        assumption: {
          zh: '中央区内红色像素超过 5% 即提示。阈值未经验证。',
          en: 'Flags when more than 5% of central-zone pixels are red. The threshold is unvalidated.',
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
