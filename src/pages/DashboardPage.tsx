import { useState } from 'react';
import { BarChart } from '../components/BarChart';
import { NumberInput } from '../components/Fields';
import { clinicRules } from '../config/clinicRules';
import { clinicMetrics } from '../domain/metrics';
import { EYES } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';
import { href } from '../router';
import { useCases } from '../storage/CasesContext';

const COST_KEY = 'orthok.dashboard.costs';

function loadCosts(): { reorder: number | null; trial: number | null } {
  try {
    const raw = localStorage.getItem(COST_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
      return { reorder: num(saved?.reorder), trial: num(saved?.trial) };
    }
  } catch {
    // ignore: costs are a convenience only
  }
  return { reorder: null, trial: null };
}

const fmt = (x: number | null, d = 1) => (x === null ? '—' : x.toFixed(d));

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}

/** Part 6: business metrics from the visit records. */
export function DashboardPage() {
  const { t } = useLang();
  const { cases } = useCases();
  const [includeSynthetic, setIncludeSynthetic] = useState(true);
  const [costs, setCosts] = useState(loadCosts);

  const selected = includeSynthetic ? cases : cases.filter((c) => !c.synthetic);
  const m = clinicMetrics(selected);
  const usesSynthetic = selected.some((c) => c.synthetic);
  const baseline = clinicRules.business.clinicBaseline;

  const setCost = (key: 'reorder' | 'trial', v: number | null) => {
    const next = { ...costs, [key]: v };
    setCosts(next);
    try {
      localStorage.setItem(COST_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const extraTrials = m.outcomes.flatMap((o) => Object.values(o.eyes)).reduce((a, e) => a + Math.max(0, e.trialLenses - 1), 0);
  const costTotal =
    costs.reorder !== null && costs.trial !== null ? m.fitReorders * costs.reorder + extraTrials * costs.trial : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{t('dash.title')}</h1>
          <p className="muted small" style={{ margin: 0, maxWidth: 720 }}>
            {t('dash.intro')}
          </p>
        </div>
        <label className="check">
          <input type="checkbox" checked={includeSynthetic} onChange={(e) => setIncludeSynthetic(e.target.checked)} />
          {t('dash.includeSynthetic')}
        </label>
      </div>

      {usesSynthetic && <div className="notice badge-synthetic">{t('dash.syntheticWarning')}</div>}

      {m.casesWithFittingData === 0 ? (
        <div className="card empty">{t('dash.empty')}</div>
      ) : (
        <>
          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            <Stat
              label={t('dash.trialsPerCase')}
              value={fmt(m.avgTrialLensesPerCase)}
              note={t('dash.trialsPerCaseNote', { perEye: fmt(m.avgTrialLensesPerEye), n: m.casesWithFittingData })}
            />
            <Stat
              label={t('dash.reorderRate')}
              value={m.reorderRatePercent === null ? '—' : `${fmt(m.reorderRatePercent, 0)}%`}
              note={t('dash.reorderRateNote', { fit: m.fitReorders, total: m.totalReorders, n: m.casesWithFittingData })}
            />
            <Stat
              label={t('dash.visits')}
              value={fmt(m.avgVisitsToSuccess)}
              note={t('dash.visitsNote', { n: m.completedCases })}
            />
            <Stat
              label={t('dash.rft')}
              value={m.rightFirstTimePercent === null ? '—' : `${fmt(m.rightFirstTimePercent, 0)}%`}
              note={t('dash.rftNote', { n: m.successfulEyes })}
            />
            <Stat
              label={t('dash.accept')}
              value={m.suggestionAcceptedPercent === null ? '—' : `${fmt(m.suggestionAcceptedPercent, 0)}%`}
              note={t('dash.acceptNote', { n: m.suggestionsDecided, conflicts: m.conflictsDecided })}
            />
            <Stat
              label={t('dash.casesTile')}
              value={`${m.cases} / ${m.eyesFitted}`}
              note={t('dash.casesNote', { cases: m.cases, eyes: m.eyesFitted })}
            />
          </div>

          <div className="notice level-info small">
            <strong>{t('dash.baseline')}: </strong>
            {baseline.avgTrialLensesPerCase === null || baseline.reorderRatePercent === null
              ? t('dash.baselineMissing')
              : t('dash.baselineValues', { trials: baseline.avgTrialLensesPerCase, rate: baseline.reorderRatePercent })}
          </div>

          <div className="grid grid-2">
            <section className="card">
              <h3>{t('dash.trialChart')}</h3>
              <BarChart
                ariaLabel={t('dash.trialChart')}
                labels={m.trialDistribution.map((d) => d.label)}
                values={m.trialDistribution.map((d) => d.count)}
                xTitle={t('dash.trialChartX')}
                yTitle={t('dash.trialChartY')}
              />
            </section>
            <section className="card">
              <h3>{t('dash.reorderChart')}</h3>
              {m.reorderReasons.length === 0 ? (
                <p className="muted small">{t('dash.noReorders')}</p>
              ) : (
                <BarChart
                  horizontal
                  ariaLabel={t('dash.reorderChart')}
                  labels={m.reorderReasons.map((r) => (r.reason === 'unspecified' ? t('common.notRecorded') : t(`opt.reorder.${r.reason}` as MessageKey)))}
                  values={m.reorderReasons.map((r) => r.count)}
                  yTitle={t('dash.reorderChartY')}
                />
              )}
            </section>
          </div>

          <section className="card">
            <h3>{t('dash.cost')}</h3>
            <p className="small muted" style={{ marginTop: 0 }}>
              {t('dash.costIntro')}
            </p>
            <div className="grid grid-2" style={{ maxWidth: 560 }}>
              <div className="field">
                <span className="label">{t('dash.costReorder')}</span>
                <NumberInput value={costs.reorder} unit="¥" onChange={(v) => setCost('reorder', v)} ariaLabel={t('dash.costReorder')} />
              </div>
              <div className="field">
                <span className="label">{t('dash.costTrial')}</span>
                <NumberInput value={costs.trial} unit="¥" onChange={(v) => setCost('trial', v)} ariaLabel={t('dash.costTrial')} />
              </div>
            </div>
            <p style={{ marginBottom: 0 }}>
              {costTotal === null
                ? t('dash.costEmpty')
                : t('dash.costResult', {
                    total: `¥${costTotal.toFixed(0)}`,
                    fit: m.fitReorders,
                    c1: `¥${costs.reorder}`,
                    extra: extraTrials,
                    c2: `¥${costs.trial}`,
                  })}
            </p>
          </section>
        </>
      )}

      {m.cases > 0 && (
        <section className="card" style={{ padding: 0 }}>
          <h3 style={{ padding: '14px 16px 0' }}>{t('dash.table')}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('cases.col.id')}</th>
                  <th>{t('dash.col.status')}</th>
                  <th>{t('dash.col.trials')}</th>
                  <th>{t('dash.col.reorders')}</th>
                  <th>{t('dash.col.visits')}</th>
                  <th>{t('dash.col.design')}</th>
                </tr>
              </thead>
              <tbody>
                {m.outcomes.map((o) => {
                  const c = selected.find((x) => x.id === o.caseId)!;
                  const designs = EYES.filter((e) => c.eyesFitted[e])
                    .map((e) => (c.design[e] ? `${e} ${t(`design.${c.design[e]!.chosen}` as MessageKey)}` : ''))
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <tr key={o.caseId}>
                      <td>
                        <a className="mono" href={href(`/cases/${encodeURIComponent(o.caseId)}/followup`)}>
                          {o.caseId}
                        </a>
                      </td>
                      <td>{t(`dash.status.${o.status}` as MessageKey)}</td>
                      <td>{o.trialLenses}</td>
                      <td>
                        {o.reorders} ({o.fitReorders})
                      </td>
                      <td>{o.visitsToSuccess ?? '—'}</td>
                      <td className="small">{designs || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <details className="card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('dash.definitions')}</summary>
        <ul className="small">
          <li>{t('dash.def1')}</li>
          <li>{t('dash.def2')}</li>
          <li>{t('dash.def3')}</li>
          <li>{t('dash.def4')}</li>
        </ul>
      </details>
    </div>
  );
}
