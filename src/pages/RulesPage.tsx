import { RULES_VERSION, allRuleMetas, clinicRules, type RuleMeta } from '../config/clinicRules';
import { useLang, type MessageKey } from '../i18n';

/** Lists every rule from config/clinicRules.ts so it can be checked with the optometrist. */
export function RulesPage() {
  const { t, lang } = useLang();
  const all = allRuleMetas();
  const confirmed = all.filter((m) => m.confirmed).length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{t('rules.title')}</h1>
          <div className="muted small">
            {t('rules.version', { v: RULES_VERSION })} · {t('rules.summary', { confirmed, total: all.length })}
          </div>
        </div>
        <button className="btn no-print" onClick={() => window.print()}>
          {t('rules.print')}
        </button>
      </div>
      <p className="small">{t('rules.intro')}</p>

      {Object.entries(clinicRules).map(([group, rules]) => (
        <section key={group} className="card" style={{ padding: 0 }}>
          <h2 style={{ padding: '14px 16px 0' }}>{t(`rules.group.${group}` as MessageKey)}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 70 }}>{t('rules.col.rule')}</th>
                  <th />
                  <th style={{ width: 140 }}>{t('rules.col.source')}</th>
                  <th style={{ width: 110 }}>{t('rules.col.status')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(rules).map((rule) => {
                  const meta = (rule as { meta: RuleMeta }).meta;
                  return (
                    <tr key={meta.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {meta.id}
                      </td>
                      <td>
                        <div>{meta.description[lang]}</div>
                        {meta.assumption && (
                          <div className="small" style={{ color: 'var(--caution)', marginTop: 4 }}>
                            {t('rules.assumption')} {meta.assumption[lang]}
                          </div>
                        )}
                        {meta.question && (
                          <div className="small muted" style={{ marginTop: 2 }}>
                            {t('rules.question', { q: meta.question })}
                          </div>
                        )}
                      </td>
                      <td className="small">{t(`rules.source.${meta.source}` as MessageKey)}</td>
                      <td>
                        <span className={`badge ${meta.confirmed ? 'badge-confirmed' : 'badge-unconfirmed'}`}>
                          {t(meta.confirmed ? 'rules.status.confirmed' : 'rules.status.unconfirmed')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className="small">{t('rules.signoff')}</p>
    </div>
  );
}
