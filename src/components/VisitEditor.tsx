import { useState } from 'react';
import { suggestedAdjustment } from '../domain/followup';
import {
  EYES,
  emptyTrialLens,
  type Adjustment,
  type Eye,
  type Fluorescein,
  type ReorderReason,
  type ThickDirection,
  type TrialLens,
  type Visit,
  type VisitEye,
  type VisitKind,
} from '../domain/types';
import { useLang, type MessageKey } from '../i18n';
import { CheckField, NumberField, SelectField, TextField } from './Fields';

const opts = <T extends string>(prefix: string, values: T[]) =>
  values.map((value) => ({ value, label: `${prefix}.${value}` as MessageKey }));

const FLUOR = opts<Fluorescein>('opt.fluor', ['loose', 'ideal', 'tight'] as Fluorescein[]);
const DIRS = opts<ThickDirection>('opt.dir', ['none', 'vertical', 'horizontal', 'oblique'] as ThickDirection[]);
const ADJ = opts<Adjustment>('opt.adj', ['steeper', 'keep', 'flatter', 'other'] as Adjustment[]);
const REORDER = opts<ReorderReason>('opt.reorder', ['fit', 'power', 'damaged-lost', 'other'] as ReorderReason[]);
const KINDS = opts<VisitKind>('opt.visit', ['fitting', 'delivery', 'follow-up', 'other']);

function TrialRow({
  trial,
  index,
  onChange,
  onRemove,
}: {
  trial: TrialLens;
  index: number;
  onChange: (t: TrialLens) => void;
  onRemove: () => void;
}) {
  const { t } = useLang();
  const suggestion = suggestedAdjustment(trial.fluorescein);
  return (
    <div className="trial-row">
      <div className="trial-index">#{index + 1}</div>
      <div className="fgrid cols-2" style={{ flex: 1 }}>
        <TextField label="fu.trialLens" hint="fu.trialLensHint" value={trial.lens} onChange={(lens) => onChange({ ...trial, lens })} />
        <SelectField
          label="fu.fluorescein"
          value={trial.fluorescein}
          options={FLUOR}
          onChange={(v) => {
            const fluorescein = v as Fluorescein;
            // Pre-fill the adjustment from the supplier guide (G1); the optometrist can change it.
            const adjustment = trial.adjustment || suggestedAdjustment(fluorescein);
            onChange({ ...trial, fluorescein, adjustment });
          }}
        />
        <SelectField
          label="fu.thick"
          value={trial.thickDirection}
          options={DIRS}
          onChange={(v) => onChange({ ...trial, thickDirection: v as ThickDirection })}
        />
        <div>
          <SelectField
            label="fu.adjustment"
            value={trial.adjustment}
            options={ADJ}
            onChange={(v) => onChange({ ...trial, adjustment: v as Adjustment })}
          />
          {suggestion && (
            <div className="hint small muted">
              {t('fu.guide', { adj: t(`opt.adj.${suggestion}` as MessageKey) })} (G1)
            </div>
          )}
        </div>
        <TextField label="fu.trialNotes" wide value={trial.notes} onChange={(notes) => onChange({ ...trial, notes })} />
      </div>
      <button type="button" className="btn btn-sm btn-ghost" onClick={onRemove} aria-label={t('common.remove')}>
        ✕
      </button>
    </div>
  );
}

function EyeVisitEditor({ eye, value, onChange }: { eye: Eye; value: VisitEye; onChange: (v: VisitEye) => void }) {
  const { t } = useLang();
  const set = <K extends keyof VisitEye>(key: K, v: VisitEye[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="eye-col">
      <div className="eye-head">
        <span className={`eye-tag ${eye}`}>{eye}</span>
        {t(`eye.${eye}`)}
      </div>

      <div className="subhead">{t('fu.trials')}</div>
      {value.trials.map((trial, i) => (
        <TrialRow
          key={i}
          index={i}
          trial={trial}
          onChange={(next) => set('trials', value.trials.map((x, j) => (j === i ? next : x)))}
          onRemove={() => set('trials', value.trials.filter((_, j) => j !== i))}
        />
      ))}
      <button type="button" className="btn btn-sm" onClick={() => set('trials', [...value.trials, emptyTrialLens()])}>
        + {t('fu.addTrial')}
      </button>

      <div className="fgrid cols-2" style={{ marginTop: 12 }}>
        <CheckField label="fu.reorder" checked={value.reorderPlaced} onChange={(v) => set('reorderPlaced', v)} />
        {value.reorderPlaced ? (
          <SelectField
            label="fu.reorderReason"
            value={value.reorderReason}
            options={REORDER}
            onChange={(v) => set('reorderReason', v as ReorderReason)}
          />
        ) : (
          <span />
        )}
        <CheckField label="fu.fitSuccessful" checked={value.fitSuccessful} onChange={(v) => set('fitSuccessful', v)} />
      </div>

      <div className="subhead">{t('fu.refraction')}</div>
      <div className="fgrid cols-3">
        <NumberField label="fu.al" value={value.al} unit="mm" step={0.01} range={[19, 32]} onChange={(v) => set('al', v)} />
        <TextField label="fu.vaUnaided" value={value.vaUnaided} onChange={(v) => set('vaUnaided', v)} />
        <NumberField
          label="fu.overRefraction"
          value={value.overRefraction}
          unit="D"
          step={0.25}
          range={[-6, 6]}
          onChange={(v) => set('overRefraction', v)}
        />
        <NumberField label="field.sphere" value={value.sphere} unit="D" step={0.25} range={[-15, 8]} onChange={(v) => set('sphere', v)} />
        <NumberField
          label="field.cylinder"
          value={value.cylinder}
          unit="D"
          step={0.25}
          range={[-8, 0]}
          onChange={(v) => set('cylinder', v)}
        />
        <NumberField label="field.axis" value={value.axis} unit="°" step={1} range={[0, 180]} onChange={(v) => set('axis', v)} />
      </div>

      <div className="subhead">{t('section.topography')}</div>
      <div className="fgrid cols-1">
        <CheckField label="fu.red" checked={value.redInCentral3mm} onChange={(v) => set('redInCentral3mm', v)} />
        <TextField label="fu.topoNotes" value={value.topoNotes} onChange={(v) => set('topoNotes', v)} />
      </div>
    </div>
  );
}

export function VisitEditor({
  initial,
  eyesFitted,
  onSave,
  onCancel,
}: {
  initial: Visit;
  eyesFitted: Record<Eye, boolean>;
  onSave: (v: Visit) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [visit, setVisit] = useState<Visit>(() => structuredClone(initial));
  const eyes = EYES.filter((e) => eyesFitted[e]);

  return (
    <section className="card" style={{ borderColor: 'var(--primary)' }}>
      <h3>{t('fu.editVisit')}</h3>
      <div className="grid grid-3" style={{ marginBottom: 12 }}>
        <div className="field">
          <label htmlFor="visitDate">{t('fu.date')}</label>
          <input id="visitDate" type="date" value={visit.date} onChange={(e) => setVisit({ ...visit, date: e.target.value })} />
        </div>
        <SelectField label="fu.kind" value={visit.kind} options={KINDS} onChange={(v) => setVisit({ ...visit, kind: v as VisitKind })} />
        <TextField label="fu.visitNotes" value={visit.notes} onChange={(notes) => setVisit({ ...visit, notes })} />
      </div>
      <div className={`eyes${eyes.length === 1 ? ' single' : ''}`}>
        {eyes.map((eye) => (
          <EyeVisitEditor
            key={eye}
            eye={eye}
            value={visit.eyes[eye]}
            onChange={(v) => setVisit({ ...visit, eyes: { ...visit.eyes, [eye]: v } })}
          />
        ))}
      </div>
      <div className="toolbar" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button type="button" className="btn btn-primary" disabled={!visit.date} onClick={() => onSave(visit)}>
          {t('common.save')}
        </button>
      </div>
    </section>
  );
}
