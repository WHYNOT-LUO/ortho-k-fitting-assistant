import { useState } from 'react';
import { axialGrowth, axialSeries, sortVisits, visitFlags } from '../domain/followup';
import { formatNumber, formatSigned } from '../domain/fieldSpecs';
import { EYES, emptyVisit, type OrthoKCase, type Visit } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';
import { useCases } from '../storage/CasesContext';
import { AxialChart } from './AxialChart';
import { FlagItem } from './FlagList';
import { VisitEditor } from './VisitEditor';

function newVisitId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `v${Date.now().toString(36)}`;
}

/** Part 4: visits, axial length chart and follow-up flags. */
export function FollowUpPanel({ c }: { c: OrthoKCase }) {
  const { t } = useLang();
  const { upsertCase } = useCases();
  const [editing, setEditing] = useState<Visit | null>(null);
  const eyes = EYES.filter((e) => c.eyesFitted[e]);
  const visits = sortVisits(c.visits).reverse();

  const saveVisit = (v: Visit) => {
    const exists = c.visits.some((x) => x.id === v.id);
    upsertCase({ ...c, visits: exists ? c.visits.map((x) => (x.id === v.id ? v : x)) : [...c.visits, v] });
    setEditing(null);
  };

  const deleteVisit = (v: Visit) => {
    if (!window.confirm(t('fu.confirmDeleteVisit', { date: v.date }))) return;
    upsertCase({ ...c, visits: c.visits.filter((x) => x.id !== v.id) });
  };

  return (
    <div>
      <p className="muted small">{t('fu.intro')}</p>

      <section className="card">
        <h3>{t('fu.chartTitle')}</h3>
        <AxialChart c={c} />
        <div className="subhead">{t('fu.growth')}</div>
        {eyes.map((eye) => {
          const g = axialGrowth(c, eye);
          return g.flag ? (
            <FlagItem key={eye} flag={g.flag} />
          ) : (
            <p key={eye} className="small muted">
              <span className={`eye-tag ${eye}`}>{eye}</span> {t('fu.noChart')}
            </p>
          );
        })}
        <details>
          <summary className="small" style={{ cursor: 'pointer' }}>
            {t('fu.tableView')}
          </summary>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>{t('fu.date')}</th>
                {eyes.map((e) => (
                  <th key={e}>{e} AL (mm)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...new Set(eyes.flatMap((e) => axialSeries(c, e).map((p) => p.date)))].sort().map((date) => (
                <tr key={date}>
                  <td>{date}</td>
                  {eyes.map((e) => (
                    <td key={e} className="mono">
                      {formatNumber(axialSeries(c, e).find((p) => p.date === date)?.al ?? null, 2) || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <div className="page-head" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{t('fu.visits')}</h3>
        {!editing && (
          <button className="btn btn-primary" onClick={() => setEditing(emptyVisit(newVisitId()))}>
            + {t('fu.addVisit')}
          </button>
        )}
      </div>

      {editing && (
        <VisitEditor key={editing.id} initial={editing} eyesFitted={c.eyesFitted} onSave={saveVisit} onCancel={() => setEditing(null)} />
      )}

      {visits.length === 0 && !editing && <div className="card empty">{t('fu.noVisits')}</div>}

      {visits.map((v) => (
        <section key={v.id} className="card">
          <div className="page-head" style={{ marginBottom: 8 }}>
            <div>
              <strong>{v.date}</strong> · {t(`opt.visit.${v.kind}` as MessageKey)}
              {v.notes && <span className="muted small"> · {v.notes}</span>}
            </div>
            <div className="toolbar">
              <button className="btn btn-sm" onClick={() => setEditing(v)}>
                {t('common.edit')}
              </button>
              <button className="btn btn-sm btn-danger" onClick={() => deleteVisit(v)}>
                {t('common.delete')}
              </button>
            </div>
          </div>
          <div className={`eyes${eyes.length === 1 ? ' single' : ''}`}>
            {eyes.map((eye) => {
              const e = v.eyes[eye];
              const flags = visitFlags(c, v, eye);
              const facts = [
                e.trials.length ? t('fu.trialsCount', { n: e.trials.length }) : '',
                e.trials.map((tr) => (tr.fluorescein ? t(`opt.fluor.${tr.fluorescein}` as MessageKey) : '')).filter(Boolean).join(' → '),
                e.al !== null ? `AL ${formatNumber(e.al, 2)} mm` : '',
                e.sphere !== null ? `S ${formatSigned(e.sphere)}${e.cylinder !== null ? ` C ${formatSigned(e.cylinder)}` : ''}${e.axis !== null ? ` × ${e.axis}` : ''}` : '',
                e.vaUnaided ? `${t('fu.vaUnaided')} ${e.vaUnaided}` : '',
                e.topoNotes,
              ].filter(Boolean);
              return (
                <div key={eye}>
                  <div style={{ marginBottom: 6 }}>
                    <span className={`eye-tag ${eye}`}>{eye}</span>
                    {e.fitSuccessful && <span className="badge level-ok">{t('fu.success')}</span>}{' '}
                    {e.reorderPlaced && (
                      <span className="badge level-caution">
                        {t('fu.reorderTag')}
                        {e.reorderReason ? `: ${t(`opt.reorder.${e.reorderReason}` as MessageKey)}` : ''}
                      </span>
                    )}
                  </div>
                  {facts.length > 0 && <div className="small" style={{ marginBottom: 6 }}>{facts.join(' · ')}</div>}
                  {flags.map((f, i) => (
                    <FlagItem key={i} flag={f} />
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
