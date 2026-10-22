/**
 * Part 5: plain-language summaries.
 *
 * Built from templates and the same flags the rest of the app shows, so a
 * case always produces the same text and nothing leaves the device. This is
 * rule-based text, not a large language model.
 *
 *  - optometristSummary: the key flags with rule IDs, design and follow-up.
 *  - parentSummary: what the numbers mean in everyday words, no rule IDs,
 *    and never a promise of results.
 */
import { RULES_VERSION, allRuleMetas } from '../config/clinicRules';
import { flagText, notCheckedText } from '../i18n/flags';
import { translate, type Lang } from '../i18n';
import type { MessageKey } from '../i18n/zh';
import { suggestDesign } from './design';
import { axialGrowth, sortVisits, visitFlags } from './followup';
import { caseOutcome } from './metrics';
import { screenCase, type Flag } from './screening';
import { EYES, type Eye, type OrthoKCase } from './types';

const fmtSigned = (x: number) => (x > 0 ? `+${x.toFixed(2)}` : x < 0 ? `−${Math.abs(x).toFixed(2)}` : x.toFixed(2));

function fittedEyes(c: OrthoKCase): Eye[] {
  return EYES.filter((e) => c.eyesFitted[e]);
}

/** Raised (non-ok) flags from the most recent visit for this eye. */
function latestVisitFlags(c: OrthoKCase, eye: Eye): { date: string; flags: Flag[] } | null {
  const visits = sortVisits(c.visits);
  for (let i = visits.length - 1; i >= 0; i--) {
    const flags = visitFlags(c, visits[i], eye).filter((f) => f.level !== 'ok');
    if (flags.length) return { date: visits[i].date, flags };
  }
  return null;
}

export function optometristSummary(c: OrthoKCase, lang: Lang): string {
  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params);
  const joiner = lang === 'zh' ? '；' : '; ';
  const screening = screenCase(c);
  const outcome = caseOutcome(c);
  const lines: string[] = [];

  lines.push(
    t('sum.header', { id: c.id, age: c.ageYears ?? '—', date: c.examDate, eyes: fittedEyes(c).join('/') }) +
      (c.synthetic ? ` ${t('sum.synthetic')}` : ''),
  );

  for (const r of screening.eyes) {
    const eye = r.eye;
    lines.push('');
    lines.push(t('sum.eye', { eye: t(`eye.${eye}`), overall: t(`overall.${r.overall}` as MessageKey) }));

    const raised = r.flags.filter((f) => f.level !== 'ok');
    if (raised.length === 0) lines.push(`  • ${t('sum.noFlags')}`);
    for (const f of raised) {
      lines.push(`  • ${t('sum.flagLine', { level: t(`level.${f.level}` as MessageKey), rule: f.ruleId, text: flagText(lang, f) })}`);
    }
    if (r.notChecked.length) {
      lines.push(`  • ${t('sum.notChecked', { items: r.notChecked.map((n) => `${n.ruleId} (${notCheckedText(lang, n)})`).join(joiner) })}`);
    }

    const s = suggestDesign(c, eye);
    const d = c.design[eye];
    const decision = d
      ? t('sum.decision', {
          design: t(`design.${d.chosen}` as MessageKey),
          toric: d.toric ? t('design.toricSuffix') : '',
          status: t(`design.status.${d.suggested === 'none' ? 'none' : d.accepted ? 'accepted' : 'rejected'}` as MessageKey),
        })
      : t('sum.decisionNone');
    const ruleIds = [...s.fourReasons, ...s.fiveReasons].map((x) => x.ruleId).join(', ') || '—';
    lines.push(`  • ${t('sum.design', { suggestion: t(`design.kind.${s.kind}` as MessageKey), rules: ruleIds, decision })}`);

    const follow: string[] = [];
    const growth = axialGrowth(c, eye).flag;
    if (growth) follow.push(`${growth.ruleId}: ${flagText(lang, growth)}`);
    const latest = latestVisitFlags(c, eye);
    if (latest) {
      for (const f of latest.flags) follow.push(t('sum.followLine', { date: latest.date, rule: f.ruleId, text: flagText(lang, f) }));
    }
    lines.push(`  • ${t('sum.followUp')} ${follow.length ? '' : t('sum.followNone')}`);
    for (const f of follow) lines.push(`      – ${f}`);

    const e = outcome.eyes[eye];
    if (e && c.visits.length) {
      lines.push(
        `  • ${t('sum.fitting', {
          trials: e.trialLenses,
          reorders: e.reorders,
          fit: e.fitReorders,
          status: e.successVisit ? t('sum.fitSuccessAt', { n: e.successVisit }) : t('sum.fitPending'),
        })}`,
      );
    }
  }

  if (screening.caseFlags.length) {
    lines.push('');
    lines.push(t('sum.caseLevel'));
    for (const f of screening.caseFlags) lines.push(`  • ${f.ruleId}: ${flagText(lang, f)}`);
  }

  const metas = allRuleMetas();
  lines.push('');
  lines.push(t('sum.footer', { version: RULES_VERSION, confirmed: metas.filter((m) => m.confirmed).length, total: metas.length }));
  return lines.join('\n');
}

export function parentSummary(c: OrthoKCase, lang: Lang): string {
  const t = (key: MessageKey, params?: Record<string, string | number>) => translate(lang, key, params);
  const screening = screenCase(c);
  const lines: string[] = [t('parent.title', { id: c.id }), t('parent.intro')];

  const parentLine = (f: Flag) => {
    const key = `parent.flag.${f.ruleId}` as MessageKey;
    const text = translate(lang, key);
    return text === key ? t('parent.flag.generic') : text;
  };

  for (const r of screening.eyes) {
    const eye = r.eye;
    const { basic, biometry } = c.eyes[eye];
    lines.push('');
    lines.push(t(`eye.${eye}`));

    if (basic.sphere !== null && basic.sphere < 0) {
      lines.push(`• ${t('parent.myopia', { degrees: Math.round(Math.abs(basic.sphere) * 100), sphere: fmtSigned(basic.sphere) })}`);
    }
    if (basic.cylinder !== null && basic.cylinder !== 0) {
      lines.push(`• ${t('parent.astig', { degrees: Math.round(Math.abs(basic.cylinder) * 100) })}`);
    }
    if (biometry.al !== null) lines.push(`• ${t('parent.al', { al: biometry.al.toFixed(2) })}`);
    if (basic.kK1 !== null && basic.kK2 !== null) {
      lines.push(`• ${t('parent.cornea', { k1: basic.kK1.toFixed(2), k2: basic.kK2.toFixed(2) })}`);
    }
    if (biometry.cct !== null) lines.push(`• ${t('parent.cct', { cct: biometry.cct.toFixed(0) })}`);

    const growth = axialGrowth(c, eye);
    if (growth.flag && growth.flag.code !== 'R11.tooSoon') {
      lines.push(
        `• ${t('parent.growth', { months: Math.round(growth.months), mm: growth.mm.toFixed(2), perYear: growth.mmPerYear.toFixed(2) })}`,
      );
    }

    const watch = new Set<string>();
    for (const f of r.flags) if (f.level !== 'ok') watch.add(parentLine(f));
    if (growth.flag && growth.flag.level === 'caution') watch.add(parentLine(growth.flag));
    for (const f of latestVisitFlags(c, eye)?.flags ?? []) watch.add(parentLine(f));

    if (watch.size) {
      lines.push(t('parent.watch'));
      for (const w of watch) lines.push(`  – ${w}`);
    } else {
      lines.push(t('parent.nothing'));
    }
  }

  for (const f of screening.caseFlags) lines.push(`• ${parentLine(f)}`);

  lines.push('');
  lines.push(c.visits.length ? t('parent.nextFollow') : t('parent.nextExam'));
  lines.push(t('parent.footer'));
  return lines.join('\n');
}
