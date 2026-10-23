import { flagKey, screenCase } from '../domain/screening';
import type { FlagResponse, OrthoKCase } from '../domain/types';
import { useLang } from '../i18n';
import { notCheckedText } from '../i18n/flags';
import { useCases } from '../storage/CasesContext';
import { EyeStatus, FlagItem } from './FlagList';

/** Part 2: suitability screening for each fitted eye, with optometrist responses. */
export function ScreeningPanel({ c }: { c: OrthoKCase }) {
  const { t, lang } = useLang();
  const { upsertCase } = useCases();
  const result = screenCase(c);

  const respond = (key: string, r: FlagResponse | null) => {
    const flagResponses = { ...c.flagResponses };
    if (r) flagResponses[key] = r;
    else delete flagResponses[key];
    upsertCase({ ...c, flagResponses });
  };

  return (
    <div>
      <p className="muted small">{t('screen.intro')}</p>

      {result.caseFlags.length > 0 && (
        <section className="card">
          <h3>{t('screen.caseLevel')}</h3>
          {result.caseFlags.map((f) => (
            <FlagItem key={flagKey(f)} flag={f} response={c.flagResponses[flagKey(f)]} onRespond={respond} />
          ))}
        </section>
      )}

      <div className={`eyes${result.eyes.length === 1 ? ' single' : ''}`}>
        {result.eyes.map((r) => {
          const raised = r.flags.filter((f) => f.level !== 'ok');
          const passed = r.flags.filter((f) => f.level === 'ok');
          return (
            <section key={r.eye} className="card">
              <div className="eye-head" style={{ justifyContent: 'space-between' }}>
                <span>
                  <span className={`eye-tag ${r.eye}`}>{r.eye}</span>
                  {t(`eye.${r.eye}`)}
                </span>
                <EyeStatus level={r.overall} notChecked={r.notChecked.length} />
              </div>

              <div className="subhead">{t('screen.raised')}</div>
              {raised.length === 0 ? (
                <p className="small muted">{t('screen.none')}</p>
              ) : (
                raised.map((f) => (
                  <FlagItem
                    key={flagKey(f)}
                    flag={f}
                    response={c.flagResponses[flagKey(f)]}
                    onRespond={respond}
                  />
                ))
              )}

              {r.notChecked.length > 0 && (
                <details open>
                  <summary className="subhead" style={{ cursor: 'pointer' }}>
                    {t('screen.notChecked', { n: r.notChecked.length })}
                  </summary>
                  <ul className="small" style={{ margin: '4px 0 8px', paddingLeft: 18 }}>
                    {r.notChecked.map((n) => (
                      <li key={n.ruleId}>
                        <span className="mono">{n.ruleId}</span> — {notCheckedText(lang, n)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {passed.length > 0 && (
                <details>
                  <summary className="subhead" style={{ cursor: 'pointer' }}>
                    {t('screen.passed', { n: passed.length })}
                  </summary>
                  {passed.map((f) => (
                    <FlagItem key={flagKey(f)} flag={f} />
                  ))}
                </details>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
