/**
 * Part 5: CSV export for analysis and, later, for training a model.
 *
 * Two files:
 *  - eyes.csv    one row per fitted eye: measurements → flags → design →
 *                trial lenses → outcome (the path in the project brief)
 *  - visits.csv  one row per visit per fitted eye
 *
 * Privacy: no calendar dates (time is "days since the first exam") and no
 * free-text notes, which could contain names. Synthetic cases are marked.
 */
import { examSections, sectionValues } from '../domain/fieldSpecs';
import { suggestDesign } from '../domain/design';
import { axialGrowth, daysBetween, sortVisits, visitFlags } from '../domain/followup';
import { caseOutcome } from '../domain/metrics';
import { screenCase } from '../domain/screening';
import { EYES, type Eye, type OrthoKCase } from '../domain/types';

type Cell = string | number | boolean | null | undefined;

export function csvEscape(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvEscape).join(','));
  // BOM so Excel opens UTF-8 (Chinese) correctly; CRLF line ends for Excel.
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** Minimal CSV reader (used by the tests to check the output). */
export function parseCsvRows(csv: string): string[][] {
  const text = csv.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** Exam columns come from the same field list the form uses; free-text notes are left out. */
function examColumns(): { key: string; read: (c: OrthoKCase, eye: Eye) => Cell }[] {
  const cols: { key: string; read: (c: OrthoKCase, eye: Eye) => Cell }[] = [];
  for (const section of examSections) {
    for (const group of section.groups) {
      for (const spec of group.fields) {
        if (spec.kind === 'text' && /notes$/i.test(spec.key)) continue;
        const get = (c: OrthoKCase, eye: Eye) => sectionValues(c.eyes[eye], section.id);
        if (spec.kind === 'computed') {
          cols.push({ key: spec.key, read: (c, eye) => {
            const v = spec.compute(get(c, eye));
            return v === null ? null : Math.round(v * 1000) / 1000;
          } });
        } else {
          cols.push({ key: spec.key, read: (c, eye) => get(c, eye)[spec.key] as Cell });
          if (spec.kind === 'measured') cols.push({ key: spec.sdKey, read: (c, eye) => get(c, eye)[spec.sdKey] as Cell });
        }
      }
    }
  }
  return cols;
}

export function eyesCsv(cases: OrthoKCase[]): string {
  const exam = examColumns();
  const header = [
    'case_id', 'synthetic', 'eye', 'age_years',
    'family_myopia', 'myopia_onset_age', 'progression_d_per_year', 'severe_allergic_rhinitis', 'wants_fast_correction',
    ...exam.map((c) => c.key),
    'screening_overall', 'flags_raised', 'flags_not_checked', 'flag_responses',
    'design_suggested', 'design_suggestion_rules', 'design_chosen', 'design_accepted', 'design_toric', 'design_rules_version',
    'lens_design_type', 'lens_toric', 'lens_diameter_mm', 'lens_target_power_d', 'lens_alignment_curve',
    'trial_lenses', 'reorders', 'fit_reorders', 'visits_to_success', 'right_first_time', 'case_status',
    'al_growth_mm_per_year', 'al_growth_months', 'last_over_refraction', 'last_va_unaided', 'red_central_3mm_ever', 'follow_up_days',
  ];

  const rows: Cell[][] = [];
  for (const c of cases) {
    const screening = screenCase(c);
    const outcome = caseOutcome(c);
    const visits = sortVisits(c.visits);
    for (const eye of EYES.filter((e) => c.eyesFitted[e])) {
      const s = screening.eyes.find((r) => r.eye === eye)!;
      const raised = [...screening.caseFlags, ...s.flags].filter((f) => f.level !== 'ok');
      const responses = Object.entries(c.flagResponses)
        .filter(([key]) => key.startsWith(`${eye}:`) || key.startsWith('case:'))
        .map(([key, r]) => `${key.split(':')[1]}:${r.response}`);
      const suggestion = suggestDesign(c, eye);
      const decision = c.design[eye];
      const lens = c.finalLens[eye];
      const eo = outcome.eyes[eye]!;
      const growth = axialGrowth(c, eye);
      const lastWith = <T,>(pick: (v: (typeof visits)[number]) => T | null | '') => {
        for (let i = visits.length - 1; i >= 0; i--) {
          const v = pick(visits[i]);
          if (v !== null && v !== '') return v;
        }
        return null;
      };
      rows.push([
        c.id, c.synthetic, eye, c.ageYears,
        c.history.familyMyopia, c.history.myopiaOnsetAge, c.history.progressionDPerYear, c.history.severeAllergicRhinitis, c.wantsFastCorrection,
        ...exam.map((col) => col.read(c, eye)),
        s.overall, raised.map((f) => f.ruleId).join(';'), s.notChecked.map((n) => n.ruleId).join(';'), responses.join(';'),
        suggestion.kind, [...suggestion.fourReasons, ...suggestion.fiveReasons].map((r) => r.ruleId).join(';'),
        decision?.chosen, decision ? decision.accepted : null, decision ? decision.toric : null, decision?.rulesVersion,
        lens.designType, lens.designType ? lens.toric : null, lens.diameterMm, lens.targetPowerD, lens.alignmentCurve,
        eo.trialLenses, eo.reorders, eo.fitReorders, eo.successVisit, eo.rightFirstTime, outcome.status,
        growth.flag && growth.flag.code !== 'R11.tooSoon' ? growth.mmPerYear : null,
        growth.flag ? Math.round(growth.months * 10) / 10 : null,
        lastWith((v) => v.eyes[eye].overRefraction),
        lastWith((v) => v.eyes[eye].vaUnaided),
        visits.some((v) => v.eyes[eye].redInCentral3mm),
        visits.length && c.examDate ? daysBetween(c.examDate, visits[visits.length - 1].date) : null,
      ]);
    }
  }
  return toCsv(header, rows);
}

export function visitsCsv(cases: OrthoKCase[]): string {
  const header = [
    'case_id', 'synthetic', 'eye', 'visit_number', 'days_from_exam', 'kind',
    'trial_lens_count', 'trial_lens_labels', 'fluorescein_sequence', 'thick_directions', 'adjustments',
    'reorder', 'reorder_reason', 'fit_successful', 'va_unaided',
    'al', 'sphere', 'cylinder', 'axis', 'over_refraction', 'red_central_3mm', 'flags',
  ];
  const rows: Cell[][] = [];
  for (const c of cases) {
    const visits = sortVisits(c.visits);
    for (const eye of EYES.filter((e) => c.eyesFitted[e])) {
      visits.forEach((v, i) => {
        const e = v.eyes[eye];
        rows.push([
          c.id, c.synthetic, eye, i + 1, c.examDate && v.date ? daysBetween(c.examDate, v.date) : null, v.kind,
          e.trials.length,
          e.trials.map((t) => t.lens).join('>'),
          e.trials.map((t) => t.fluorescein).join('>'),
          e.trials.map((t) => t.thickDirection).join('>'),
          e.trials.map((t) => t.adjustment).join('>'),
          e.reorderPlaced, e.reorderReason, e.fitSuccessful, e.vaUnaided,
          e.al, e.sphere, e.cylinder, e.axis, e.overRefraction, e.redInCentral3mm,
          visitFlags(c, v, eye).filter((f) => f.level !== 'ok').map((f) => f.ruleId).join(';'),
        ]);
      });
    }
  }
  return toCsv(header, rows);
}
