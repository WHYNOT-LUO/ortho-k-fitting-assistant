import { useState } from 'react';
import { ruleMetaById } from '../config/clinicRules';
import { flagKey, type Flag, type Level } from '../domain/screening';
import type { FlagResponse, FlagResponseKind } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';
import { flagNotesText, flagText } from '../i18n/flags';

export function LevelBadge({ level, overall }: { level: Level; overall?: boolean }) {
  const { t } = useLang();
  return <span className={`badge level-${level}`}>{t(`${overall ? 'overall' : 'level'}.${level}` as MessageKey)}</span>;
}

function RuleTag({ ruleId }: { ruleId: string }) {
  const { t } = useLang();
  const meta = ruleMetaById(ruleId);
  return (
    <span>
      {t('screen.rule', { id: ruleId })}
      {meta && !meta.confirmed && (
        <>
          {' · '}
          <span className="badge badge-unconfirmed">{t('screen.unconfirmed')}</span>
        </>
      )}
      {meta?.assumption && (
        <>
          {' '}
          <span className="badge badge-unconfirmed" title={meta.assumption.zh + '\n' + meta.assumption.en}>
            {t('screen.assumed')}
          </span>
        </>
      )}
    </span>
  );
}

/** Overall result for one eye, plus how many rules could not be checked for missing data. */
export function EyeStatus({ level, notChecked }: { level: Level; notChecked: number }) {
  const { t } = useLang();
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <LevelBadge level={level} overall />
      {notChecked > 0 && (
        <>
          {' '}
          <span className="badge badge-unconfirmed">{t('screen.incomplete', { n: notChecked })}</span>
        </>
      )}
    </span>
  );
}

const RESPONSES: FlagResponseKind[] = ['agree', 'disagree', 'noted'];

function ResponseControls({
  response,
  onChange,
}: {
  response: FlagResponse | undefined;
  onChange: (r: FlagResponse | null) => void;
}) {
  const { t } = useLang();
  const [note, setNote] = useState(response?.note ?? '');
  const set = (kind: FlagResponseKind) => onChange({ response: kind, note, at: new Date().toISOString() });
  return (
    <div className="toolbar no-print" style={{ marginTop: 8, gap: 6 }}>
      <span className="small muted">{t('resp.label')}:</span>
      {RESPONSES.map((kind) => (
        <button
          key={kind}
          type="button"
          className={`btn btn-sm${response?.response === kind ? ' btn-primary' : ''}`}
          onClick={() => set(kind)}
        >
          {t(`resp.${kind}` as MessageKey)}
        </button>
      ))}
      <input
        type="text"
        style={{ flex: '1 1 160px', width: 'auto', padding: '3px 8px', fontSize: '0.85rem' }}
        placeholder={t('resp.notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => response && note !== response.note && onChange({ ...response, note })}
      />
      {response && (
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(null)}>
          {t('resp.clear')}
        </button>
      )}
    </div>
  );
}

export function FlagItem({
  flag,
  response,
  onRespond,
}: {
  flag: Flag;
  response?: FlagResponse;
  onRespond?: (key: string, r: FlagResponse | null) => void;
}) {
  const { lang } = useLang();
  return (
    <div className={`flag level-${flag.level}`}>
      <div className="flag-body">
        <div>
          <LevelBadge level={flag.level} /> {flagText(lang, flag)}
        </div>
        {flagNotesText(lang, flag).map((n) => (
          <div key={n} className="small" style={{ color: 'var(--caution)', marginTop: 2 }}>
            ⚠ {n}
          </div>
        ))}
        <div className="flag-meta">
          <RuleTag ruleId={flag.ruleId} />
        </div>
        {onRespond && <ResponseControls response={response} onChange={(r) => onRespond(flagKey(flag), r)} />}
      </div>
    </div>
  );
}
