import { useState } from 'react';
import { ruleMetaById } from '../config/clinicRules';
import { makeDecision, suggestDesign, type DesignReason, type DesignSuggestion } from '../domain/design';
import { EYES, type DesignType, type Eye, type FinalLens, type OrthoKCase } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';
import { useCases } from '../storage/CasesContext';
import { CheckField, NumberField, SelectField, TextField } from './Fields';

const OTHER: Record<DesignType, DesignType> = { '4-curve': '5-curve', '5-curve': '4-curve' };

function Reason({ r }: { r: DesignReason }) {
  const { t } = useLang();
  const meta = ruleMetaById(r.ruleId);
  return (
    <li style={{ marginBottom: 4 }}>
      {t(`design.reason.${r.code}` as MessageKey, r.params)}{' '}
      <span className="small muted mono">{r.ruleId}</span>
      {meta && !meta.confirmed && <span className="badge badge-unconfirmed" style={{ marginLeft: 4 }}>{t('screen.unconfirmed')}</span>}
    </li>
  );
}

function SuggestionView({ s }: { s: DesignSuggestion }) {
  const { t, lang } = useLang();
  const joiner = lang === 'zh' ? '、' : ', ';
  const tone = s.kind === 'conflict' ? 'level-caution' : s.kind === 'none' ? 'level-info' : 'level-ok';
  return (
    <div>
      <div className={`notice ${tone}`} style={{ fontWeight: 600 }}>
        {t(`design.kind.${s.kind}` as MessageKey)}
      </div>
      {s.screeningStop && <div className="notice level-stop">{t('design.stop')}</div>}
      {s.fourReasons.length > 0 && (
        <>
          <div className="subhead">{t('design.for4')}</div>
          <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
            {s.fourReasons.map((r) => (
              <Reason key={r.ruleId} r={r} />
            ))}
          </ul>
        </>
      )}
      {s.fiveReasons.length > 0 && (
        <>
          <div className="subhead">{t('design.for5')}</div>
          <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>
            {s.fiveReasons.map((r) => (
              <Reason key={r.ruleId} r={r} />
            ))}
          </ul>
        </>
      )}
      {s.regularCornea === false && (
        <p className="small muted">
          {t('design.irregular', { reasons: s.irregularBecause.map((b) => t(`design.irr.${b}` as MessageKey)).join(joiner) })}
        </p>
      )}
      {s.toricRuleIds.length > 0 && <p className="small">{t('design.toric', { rules: s.toricRuleIds.join(', ') })}</p>}
      {s.missing.length > 0 && (
        <p className="small muted">{t('design.missing', { fields: s.missing.map((m) => t(m)).join(joiner) })}</p>
      )}
    </div>
  );
}

function DecisionEditor({ c, eye, s }: { c: OrthoKCase; eye: Eye; s: DesignSuggestion }) {
  const { t } = useLang();
  const { upsertCase } = useCases();
  const existing = c.design[eye];
  const [editing, setEditing] = useState(!existing);
  const [chosen, setChosen] = useState<DesignType | null>(existing?.chosen ?? null);
  const [toric, setToric] = useState(existing?.toric ?? false);
  const [note, setNote] = useState(existing?.note ?? '');
  const name = (d: DesignType) => t(`design.${d}` as MessageKey);

  if (existing && !editing) {
    const status = existing.suggested === 'none' ? 'none' : existing.accepted ? 'accepted' : 'rejected';
    return (
      <div>
        <div className="notice level-ok">
          {t('design.recorded', {
            design: name(existing.chosen),
            toric: existing.toric ? t('design.toricSuffix') : '',
            status: t(`design.status.${status}` as MessageKey),
            date: existing.decidedAt.slice(0, 10),
            version: existing.rulesVersion,
          })}
          {existing.note && <div className="small">“{existing.note}”</div>}
        </div>
        {existing.suggested !== s.kind && <p className="small" style={{ color: 'var(--caution)' }}>{t('design.changed')}</p>}
        <button className="btn btn-sm" onClick={() => setEditing(true)}>
          {t('design.change')}
        </button>
      </div>
    );
  }

  const choices: { design: DesignType; label: string }[] =
    s.kind === '4-curve' || s.kind === '5-curve'
      ? [
          { design: s.kind, label: `✓ ${t('design.accept', { design: name(s.kind) })}` },
          { design: OTHER[s.kind], label: `✗ ${t('design.reject', { design: name(OTHER[s.kind]) })}` },
        ]
      : (['4-curve', '5-curve'] as DesignType[]).map((d) => ({ design: d, label: t('design.choose', { design: name(d) }) }));

  const save = () => {
    if (!chosen) return;
    upsertCase({ ...c, design: { ...c.design, [eye]: makeDecision(s, chosen, toric, note) } });
    setEditing(false);
  };

  return (
    <div>
      <div className="toolbar" style={{ marginBottom: 8 }}>
        {choices.map((ch) => (
          <button
            key={ch.design}
            type="button"
            className={`btn${chosen === ch.design ? ' btn-primary' : ''}`}
            onClick={() => setChosen(ch.design)}
          >
            {ch.label}
          </button>
        ))}
      </div>
      <div className="fgrid cols-2">
        <CheckField label="design.toricCheck" checked={toric} onChange={setToric} />
        <TextField label="design.note" value={note} onChange={setNote} />
      </div>
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" disabled={!chosen} onClick={save}>
          {t('design.save')}
        </button>
        {existing && (
          <button className="btn" onClick={() => setEditing(false)}>
            {t('common.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}

function FinalLensEditor({ c, eye }: { c: OrthoKCase; eye: Eye }) {
  const { t } = useLang();
  const { upsertCase } = useCases();
  const [lens, setLens] = useState<FinalLens>(() => structuredClone(c.finalLens[eye]));
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof FinalLens>(key: K, v: FinalLens[K]) => {
    setLens({ ...lens, [key]: v });
    setSaved(false);
  };
  return (
    <div>
      <div className="fgrid cols-2">
        <TextField label="lens.brandDesign" value={lens.brandDesign} onChange={(v) => set('brandDesign', v)} />
        <SelectField
          label="lens.designType"
          value={lens.designType}
          options={[
            { value: '4-curve', label: 'design.4-curve' },
            { value: '5-curve', label: 'design.5-curve' },
          ]}
          onChange={(v) => set('designType', v as FinalLens['designType'])}
        />
        <NumberField label="lens.diameter" value={lens.diameterMm} unit="mm" step={0.1} range={[9, 12]} onChange={(v) => set('diameterMm', v)} />
        <NumberField
          label="lens.targetPower"
          value={lens.targetPowerD}
          unit="D"
          step={0.25}
          range={[-10, 0]}
          onChange={(v) => set('targetPowerD', v)}
        />
        <TextField label="lens.alignmentCurve" value={lens.alignmentCurve} onChange={(v) => set('alignmentCurve', v)} />
        <CheckField label="lens.toric" checked={lens.toric} onChange={(v) => set('toric', v)} />
        <TextField label="lens.notes" wide value={lens.notes} onChange={(v) => set('notes', v)} />
      </div>
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button
          className="btn"
          onClick={() => {
            upsertCase({ ...c, finalLens: { ...c.finalLens, [eye]: lens } });
            setSaved(true);
          }}
        >
          {t('design.saveLens')}
        </button>
        {saved && <span className="small muted">{t('design.lensSaved')}</span>}
      </div>
    </div>
  );
}

/** Part 3: design suggestion, the optometrist's decision, and the lens actually ordered. */
export function DesignPanel({ c }: { c: OrthoKCase }) {
  const { t } = useLang();
  const eyes = EYES.filter((e) => c.eyesFitted[e]);
  return (
    <div>
      <p className="muted small">{t('design.intro')}</p>
      <div className={`eyes${eyes.length === 1 ? ' single' : ''}`}>
        {eyes.map((eye) => {
          const s = suggestDesign(c, eye);
          return (
            <section key={eye} className="card">
              <div className="eye-head">
                <span className={`eye-tag ${eye}`}>{eye}</span>
                {t(`eye.${eye}`)}
              </div>
              <SuggestionView s={s} />
              <div className="subhead" style={{ marginTop: 16 }}>
                {t('design.decision')}
              </div>
              <DecisionEditor key={`${c.id}-${eye}`} c={c} eye={eye} s={s} />
              <div className="subhead" style={{ marginTop: 16 }}>
                {t('design.lens')}
              </div>
              <p className="small muted" style={{ marginTop: 0 }}>
                {t('design.lensIntro')}
              </p>
              <FinalLensEditor key={`lens-${c.id}-${eye}`} c={c} eye={eye} />
            </section>
          );
        })}
      </div>
      <p className="small muted">{t('design.research')}</p>
    </div>
  );
}
