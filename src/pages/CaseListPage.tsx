import { useRef, useState } from 'react';
import { syntheticCases } from '../data/syntheticCases';
import { EyeStatus } from '../components/FlagList';
import { screenCase } from '../domain/screening';
import { EYES } from '../domain/types';
import { useLang } from '../i18n';
import { href, navigate } from '../router';
import { backupJson, mergeCases, parseCases } from '../storage/caseStore';
import { useCases } from '../storage/CasesContext';
import { downloadText } from '../storage/download';

export function CaseListPage() {
  const { t } = useLang();
  const { cases, replaceAll, error } = useCases();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const sorted = [...cases].sort((a, b) => b.examDate.localeCompare(a.examDate) || a.id.localeCompare(b.id));
  const demoCount = cases.filter((c) => c.synthetic).length;

  const loadDemo = () => {
    const demo = syntheticCases();
    replaceAll(mergeCases(cases, demo));
    setMessage(t('cases.demoLoaded', { n: demo.length }));
  };

  const deleteDemo = () => {
    if (!window.confirm(t('cases.confirmDeleteDemo', { n: demoCount }))) return;
    replaceAll(cases.filter((c) => !c.synthetic));
    setMessage(null);
  };

  const importFile = async (file: File) => {
    try {
      const incoming = parseCases(await file.text());
      replaceAll(mergeCases(cases, incoming));
      setMessage(t('cases.importDone', { n: incoming.length }));
    } catch {
      setMessage(t('cases.importFailed'));
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{t('cases.title')}</h1>
          <span className="muted small">{t('cases.count', { n: cases.length })}</span>
        </div>
        <div className="toolbar">
          <a className="btn btn-primary" href={href('/new')}>
            + {t('cases.new')}
          </a>
          <button className="btn" onClick={loadDemo}>
            {t('cases.loadDemo')}
          </button>
          {demoCount > 0 && (
            <button className="btn btn-danger" onClick={deleteDemo}>
              {t('cases.deleteDemo')}
            </button>
          )}
          <button
            className="btn"
            disabled={cases.length === 0}
            onClick={() => downloadText(`orthok-backup-${new Date().toISOString().slice(0, 10)}.json`, backupJson(cases), 'application/json')}
          >
            {t('cases.backup')}
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            {t('cases.import')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importFile(file);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {error && <div className="notice level-stop">{t('cases.storageError', { error })}</div>}
      {message && <div className="notice level-info">{message}</div>}

      {sorted.length === 0 ? (
        <div className="card empty">{t('cases.empty')}</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('cases.col.id')}</th>
                  <th>{t('cases.col.exam')}</th>
                  <th>{t('cases.col.age')}</th>
                  <th>{t('cases.col.eyes')}</th>
                  <th>{t('cases.col.screening')}</th>
                  <th>{t('cases.col.visits')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => navigate(`/cases/${encodeURIComponent(c.id)}`)}>
                    <td>
                      <a href={href(`/cases/${encodeURIComponent(c.id)}`)} className="mono" onClick={(e) => e.stopPropagation()}>
                        {c.id}
                      </a>{' '}
                      {c.synthetic && <span className="badge badge-synthetic">{t('common.synthetic')}</span>}
                    </td>
                    <td>{c.examDate}</td>
                    <td>{c.ageYears ?? '—'}</td>
                    <td>
                      {EYES.filter((e) => c.eyesFitted[e]).map((e) => (
                        <span key={e} className={`eye-tag ${e}`}>
                          {e}
                        </span>
                      ))}
                    </td>
                    <td>
                      {screenCase(c).eyes.map((r) => (
                        <div key={r.eye} style={{ whiteSpace: 'nowrap' }}>
                          <span className="mono small">{r.eye}</span> <EyeStatus level={r.overall} notChecked={r.notChecked.length} />
                        </div>
                      ))}
                    </td>
                    <td>{c.visits.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
