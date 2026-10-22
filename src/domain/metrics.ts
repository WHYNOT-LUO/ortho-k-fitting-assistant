/**
 * Part 6: business metrics.
 *
 * Every number comes from the visit records, so the dashboard and the CSV
 * export always agree. Definitions (also shown on the dashboard):
 *
 *  - Trial lenses per case: all trial lenses recorded for the fitted eyes.
 *  - Fit-related reorder: a reorder whose reason is "fit not right",
 *    "power not right" or not given. Lost/damaged lenses are counted
 *    separately because they say nothing about fitting quality.
 *  - Visits until a successful fit: position (in date order) of the first
 *    visit where every fitted eye has been ticked "fit successful".
 *  - Right first time: an eye that reached a successful fit with at most one
 *    trial lens and no fit-related reorder.
 */
import { sortVisits } from './followup';
import { EYES, type Eye, type OrthoKCase, type ReorderReason } from './types';

export type CaseStatus = 'not-started' | 'in-progress' | 'success';

export interface EyeOutcome {
  trialLenses: number;
  reorders: number;
  fitReorders: number;
  /** 1-based index of the visit where this eye's fit was judged successful. */
  successVisit: number | null;
  /** null until the eye has a successful fit. */
  rightFirstTime: boolean | null;
}

export interface CaseOutcome {
  caseId: string;
  synthetic: boolean;
  eyes: Partial<Record<Eye, EyeOutcome>>;
  trialLenses: number;
  reorders: number;
  fitReorders: number;
  reorderReasons: Partial<Record<ReorderReason | 'unspecified', number>>;
  visits: number;
  visitsToSuccess: number | null;
  status: CaseStatus;
}

const FIT_RELATED: ReorderReason[] = ['fit', 'power', ''];

export function caseOutcome(c: OrthoKCase): CaseOutcome {
  const visits = sortVisits(c.visits);
  const fitted = EYES.filter((e) => c.eyesFitted[e]);
  const eyes: Partial<Record<Eye, EyeOutcome>> = {};
  const reorderReasons: CaseOutcome['reorderReasons'] = {};

  for (const eye of fitted) {
    let trialLenses = 0;
    let reorders = 0;
    let fitReorders = 0;
    let successVisit: number | null = null;
    visits.forEach((v, i) => {
      const e = v.eyes[eye];
      trialLenses += e.trials.length;
      if (e.reorderPlaced) {
        reorders++;
        if (FIT_RELATED.includes(e.reorderReason)) fitReorders++;
        const key = e.reorderReason || 'unspecified';
        reorderReasons[key] = (reorderReasons[key] ?? 0) + 1;
      }
      if (e.fitSuccessful && successVisit === null) successVisit = i + 1;
    });
    // Reorders after the fit was already successful (e.g. a lost lens) don't
    // change whether the first fit was right.
    const fitReordersBeforeSuccess = visits
      .slice(0, successVisit ?? visits.length)
      .filter((v) => v.eyes[eye].reorderPlaced && FIT_RELATED.includes(v.eyes[eye].reorderReason)).length;
    eyes[eye] = {
      trialLenses,
      reorders,
      fitReorders,
      successVisit,
      rightFirstTime: successVisit === null ? null : trialLenses <= 1 && fitReordersBeforeSuccess === 0,
    };
  }

  const list = fitted.map((e) => eyes[e]!);
  const allSucceeded = list.length > 0 && list.every((e) => e.successVisit !== null);
  const visitsToSuccess = allSucceeded ? Math.max(...list.map((e) => e.successVisit!)) : null;

  return {
    caseId: c.id,
    synthetic: c.synthetic,
    eyes,
    trialLenses: list.reduce((a, e) => a + e.trialLenses, 0),
    reorders: list.reduce((a, e) => a + e.reorders, 0),
    fitReorders: list.reduce((a, e) => a + e.fitReorders, 0),
    reorderReasons,
    visits: visits.length,
    visitsToSuccess,
    status: visits.length === 0 ? 'not-started' : allSucceeded ? 'success' : 'in-progress',
  };
}

export interface ClinicMetrics {
  cases: number;
  eyesFitted: number;
  /** Cases with at least one trial lens recorded: the base for the fitting averages. */
  casesWithFittingData: number;
  avgTrialLensesPerCase: number | null;
  avgTrialLensesPerEye: number | null;
  totalReorders: number;
  fitReorders: number;
  /** % of cases with fitting data that needed at least one fit-related reorder. */
  reorderRatePercent: number | null;
  completedCases: number;
  avgVisitsToSuccess: number | null;
  /** % of successfully fitted eyes that were right first time. */
  rightFirstTimePercent: number | null;
  successfulEyes: number;
  /** How many eyes needed 1, 2, 3 or 4+ trial lenses (eyes with at least one recorded). */
  trialDistribution: { label: string; count: number }[];
  reorderReasons: { reason: ReorderReason | 'unspecified'; count: number }[];
  /** Design suggestions (4-/5-curve only, not conflicts) the optometrist accepted. */
  suggestionsDecided: number;
  suggestionAcceptedPercent: number | null;
  conflictsDecided: number;
  outcomes: CaseOutcome[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (part: number, whole: number) => (whole ? (part / whole) * 100 : null);

export function clinicMetrics(cases: OrthoKCase[]): ClinicMetrics {
  const outcomes = cases.map(caseOutcome);
  const withData = outcomes.filter((o) => o.trialLenses > 0);
  const completed = outcomes.filter((o) => o.visitsToSuccess !== null);
  const eyeOutcomes = outcomes.flatMap((o) => Object.values(o.eyes));
  const successful = eyeOutcomes.filter((e) => e.rightFirstTime !== null);

  const eyesWithTrials = eyeOutcomes.filter((e) => e.trialLenses > 0);
  const buckets = ['1', '2', '3', '4+'];
  const trialDistribution = buckets.map((label, i) => ({
    label,
    count: eyesWithTrials.filter((e) => (i === 3 ? e.trialLenses >= 4 : e.trialLenses === i + 1)).length,
  }));

  const reasonTotals = new Map<ReorderReason | 'unspecified', number>();
  for (const o of outcomes) {
    for (const [reason, n] of Object.entries(o.reorderReasons)) {
      const key = reason as ReorderReason | 'unspecified';
      reasonTotals.set(key, (reasonTotals.get(key) ?? 0) + (n ?? 0));
    }
  }

  const decisions = cases.flatMap((c) => EYES.filter((e) => c.eyesFitted[e]).map((e) => c.design[e])).filter((d) => d !== null);
  const decidedSuggestions = decisions.filter((d) => d.suggested === '4-curve' || d.suggested === '5-curve');

  return {
    cases: cases.length,
    eyesFitted: cases.reduce((a, c) => a + EYES.filter((e) => c.eyesFitted[e]).length, 0),
    casesWithFittingData: withData.length,
    avgTrialLensesPerCase: mean(withData.map((o) => o.trialLenses)),
    avgTrialLensesPerEye: mean(eyesWithTrials.map((e) => e.trialLenses)),
    totalReorders: outcomes.reduce((a, o) => a + o.reorders, 0),
    fitReorders: outcomes.reduce((a, o) => a + o.fitReorders, 0),
    reorderRatePercent: pct(withData.filter((o) => o.fitReorders > 0).length, withData.length),
    completedCases: completed.length,
    avgVisitsToSuccess: mean(completed.map((o) => o.visitsToSuccess!)),
    rightFirstTimePercent: pct(successful.filter((e) => e.rightFirstTime).length, successful.length),
    successfulEyes: successful.length,
    trialDistribution,
    reorderReasons: [...reasonTotals.entries()].map(([reason, count]) => ({ reason, count })),
    suggestionsDecided: decidedSuggestions.length,
    suggestionAcceptedPercent: pct(decidedSuggestions.filter((d) => d.accepted).length, decidedSuggestions.length),
    conflictsDecided: decisions.filter((d) => d.suggested === 'conflict').length,
    outcomes,
  };
}
