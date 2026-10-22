import { ExamOverview } from '../components/ExamOverview';
import { ScreeningPanel } from '../components/ScreeningPanel';
import { formatNumber } from '../domain/fieldSpecs';
import { EYES, type OrthoKCase } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';
import { href, navigate } from '../router';
import { useCases } from '../storage/CasesContext';

export const CASE_TABS = ['overview', 'screening'] as const;
export type CaseTab = (typeof CASE_TABS)[number];

const TAB_LABELS: Record<CaseTab, MessageKey> = {
  overview: 'case.tab.overview',
  screening: 'case.tab.screening',
};

function HistoryCard({ c }: { c: OrthoKCase }) {
  const { t } = useLang();
  const h = c.history;
  const family = h.familyMyopia ? t(`opt.family.${h.familyMyopia}` as MessageKey) : '—';
  const items: [MessageKey, string][] = [
    ['field.familyMyopia', family],
    ['field.onsetAge', h.myopiaOnsetAge === null ? '—' : `${h.myopiaOnsetAge} ${t('unit.years')}`],
    ['field.progression', h.progressionDPerYear === null ? '—' : `${formatNumber(h.progressionDPerYear, 2)} ${t('unit.dPerYear')}`],
    ['field.rhinitis', h.severeAllergicRhinitis ? t('common.yes') : t('common.no')],
    ['field.wantsFast', c.wantsFastCorrection ? t('common.yes') : t('common.no')],
  ];
  return (
    <section className="card">
      <h3>{t('section.history')}</h3>
      <div className="grid grid-auto">
        {items.map(([label, value]) => (
          <div key={label} className="field">
            <span className="label">{t(label)}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {h.notes && <p className="small" style={{ marginBottom: 0 }}>{h.notes}</p>}
      {c.notes && <p className="small muted" style={{ marginBottom: 0 }}>{c.notes}</p>}
    </section>
  );
}

export function CaseViewPage({ caseId, tab }: { caseId: string; tab: CaseTab }) {
  const { t } = useLang();
  const { getCase, deleteCase } = useCases();
  const c = getCase(caseId);
  if (!c) return <p className="muted">{t('case.notFound', { id: caseId })}</p>;
  const base = `/cases/${encodeURIComponent(c.id)}`;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="mono" style={{ marginBottom: 4 }}>
            {c.id} {c.synthetic && <span className="badge badge-synthetic">{t('common.synthetic')}</span>}
          </h1>
          <div className="muted small">
            {t('field.examDate')}: {c.examDate} · {t('field.ageYears')}: {c.ageYears ?? '—'} ·{' '}
            {EYES.filter((e) => c.eyesFitted[e]).map((e) => (
              <span key={e} className={`eye-tag ${e}`}>
                {e}
              </span>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <a className="btn" href={href(`${base}/edit`)}>
            {t('common.edit')}
          </a>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(t('case.confirmDelete', { id: c.id }))) {
                deleteCase(c.id);
                navigate('/cases');
              }
            }}
          >
            {t('case.delete')}
          </button>
        </div>
      </div>

      {c.synthetic && <div className="notice badge-synthetic">{t('case.syntheticNote')}</div>}

      <nav className="tabs">
        {CASE_TABS.map((key) => (
          <a key={key} className={tab === key ? 'active' : ''} href={href(key === 'overview' ? base : `${base}/${key}`)}>
            {t(TAB_LABELS[key])}
          </a>
        ))}
      </nav>

      {tab === 'screening' && <ScreeningPanel c={c} />}
      {tab === 'overview' && (
        <>
          <HistoryCard c={c} />
          <ExamOverview c={c} />
        </>
      )}
    </div>
  );
}
