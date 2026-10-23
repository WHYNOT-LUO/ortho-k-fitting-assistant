import { useEffect, useState, type CSSProperties } from 'react';
import {
  formatNumber,
  formatSigned,
  isOutOfRange,
  sectionValues,
  type ExamSection,
  type FieldSpec,
  type MeasuredSpec,
  type SectionId,
} from '../domain/fieldSpecs';
import { EYES, meanAndSd, type Eye, type EyeExam } from '../domain/types';
import { useLang } from '../i18n';
import { CheckField, NumberField, NumberInput, ReadonlyValue, SelectField, TextField, parseReadings } from './Fields';

export type SetExamValue = (eye: Eye, section: SectionId, key: string, value: unknown) => void;

interface Props {
  section: ExamSection;
  exams: Record<Eye, EyeExam>;
  eyesFitted: Record<Eye, boolean>;
  setValue: SetExamValue;
  copyODtoOS: (section: SectionId) => void;
}

const SIGNED_KEYS = new Set(['sphere', 'cylinder', 'se']);

function MeasuredRow({
  spec,
  values,
  readings,
  onSet,
  disabled,
}: {
  spec: MeasuredSpec;
  values: Record<string, unknown>;
  readings: number[] | undefined;
  onSet: (key: string, value: unknown) => void;
  disabled: boolean;
}) {
  const { t } = useLang();
  const [text, setText] = useState(readings?.join(', ') ?? '');
  const [applied, setApplied] = useState<number | null>(null);
  const value = values[spec.key] as number | null;
  const sd = values[spec.sdKey] as number | null;

  // Follow changes made elsewhere (e.g. "copy right eye to left eye").
  useEffect(() => {
    if (parseReadings(text).join(',') !== (readings ?? []).join(',')) setText(readings?.join(', ') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readings]);

  /** Typing AVG or SD by hand means the old raw readings no longer match: drop them. */
  const setByHand = (key: string, v: number | null) => {
    onSet(key, v);
    if (readings?.length) {
      const nextReadings = { ...((values.readings as Record<string, number[]>) ?? {}) };
      delete nextReadings[spec.key];
      onSet('readings', nextReadings);
      setApplied(null);
    }
  };

  const applyReadings = (raw: string) => {
    setText(raw);
    const list = parseReadings(raw);
    const nextReadings = { ...((values.readings as Record<string, number[]>) ?? {}) };
    if (list.length >= 2) {
      const stats = meanAndSd(list)!;
      const factor = 10 ** (spec.decimals + 1);
      onSet(spec.key, Math.round(stats.mean * factor) / factor);
      onSet(spec.sdKey, Math.round(stats.sd * factor) / factor);
      nextReadings[spec.key] = list;
      setApplied(list.length);
    } else {
      delete nextReadings[spec.key];
      setApplied(null);
    }
    onSet('readings', nextReadings);
  };

  return (
    <div>
      <div className="small muted" style={{ marginBottom: 3 }}>
        {t(spec.label)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 0.8fr 1.6fr', gap: 8 }}>
        <NumberInput
          ariaLabel={`${t(spec.label)} ${t('field.avg')}`}
          value={value}
          unit={spec.unit}
          step={spec.step}
          range={spec.range}
          disabled={disabled}
          onChange={(v) => setByHand(spec.key, v)}
        />
        <NumberInput
          ariaLabel={`${t(spec.label)} SD`}
          value={sd}
          unit="SD"
          step={spec.step}
          disabled={disabled}
          onChange={(v) => setByHand(spec.sdKey, v)}
        />
        <input
          type="text"
          aria-label={`${t(spec.label)} ${t('field.readings')}`}
          placeholder={t('field.readings')}
          title={t('hint.readings')}
          value={text}
          disabled={disabled}
          onChange={(e) => applyReadings(e.target.value)}
        />
      </div>
      {isOutOfRange(value, spec.range) && (
        <div className="warn small">{t('form.outOfRange', { min: spec.range[0], max: spec.range[1] })}</div>
      )}
      {applied !== null && <div className="hint small muted">{t('form.readingsApplied', { n: applied })}</div>}
    </div>
  );
}

function FieldEditor({
  spec,
  values,
  onSet,
  disabled,
}: {
  spec: FieldSpec;
  values: Record<string, unknown>;
  onSet: (key: string, value: unknown) => void;
  disabled: boolean;
}) {
  const { t } = useLang();
  switch (spec.kind) {
    case 'number':
      return (
        <NumberField
          label={spec.label}
          hint={spec.hint}
          value={values[spec.key] as number | null}
          unit={spec.unit}
          step={spec.step}
          range={spec.range}
          disabled={disabled}
          onChange={(v) => onSet(spec.key, v)}
        />
      );
    case 'text':
      return (
        <TextField
          label={spec.label}
          hint={spec.hint}
          wide={spec.wide}
          value={values[spec.key] as string}
          disabled={disabled}
          onChange={(v) => onSet(spec.key, v)}
        />
      );
    case 'select':
      return (
        <SelectField
          label={spec.label}
          options={spec.options}
          value={values[spec.key] as string}
          disabled={disabled}
          onChange={(v) => onSet(spec.key, v)}
        />
      );
    case 'check':
      return (
        <CheckField
          label={spec.label}
          checked={values[spec.key] as boolean}
          disabled={disabled}
          onChange={(v) => onSet(spec.key, v)}
        />
      );
    case 'computed': {
      const v = spec.compute(values);
      const text = SIGNED_KEYS.has(spec.key) ? formatSigned(v, spec.decimals) : formatNumber(v, spec.decimals);
      return <ReadonlyValue label={t(spec.label)} value={text ? `${text}${spec.unit ? ` ${spec.unit}` : ''}` : ''} />;
    }
    case 'measured':
      return (
        <MeasuredRow
          spec={spec}
          values={values}
          readings={(values.readings as Record<string, number[]> | undefined)?.[spec.key]}
          onSet={onSet}
          disabled={disabled}
        />
      );
  }
}

export function ExamSectionEditor({ section, exams, eyesFitted, setValue, copyODtoOS }: Props) {
  const { t } = useLang();
  return (
    <section className="card">
      <div className="page-head" style={{ marginBottom: 4 }}>
        <h2>{t(section.title)}</h2>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            if (window.confirm(t('form.confirmCopyOD'))) copyODtoOS(section.id);
          }}
        >
          {t('form.copyOD')}
        </button>
      </div>
      <p className="card-sub">{t(section.subtitle)}</p>
      <div className="eyes">
        {EYES.map((eye) => {
          const values = sectionValues(exams[eye], section.id);
          const disabled = !eyesFitted[eye];
          return (
            <div key={eye} className={`eye-col${disabled ? ' disabled' : ''}`}>
              <div className="eye-head">
                <span className={`eye-tag ${eye}`}>{eye}</span>
                {t(`eye.${eye}`)}
                {disabled && <span className="muted small" style={{ marginLeft: 8 }}>({t('eye.notFitted')})</span>}
              </div>
              {section.groups.map((group, gi) => (
                <div key={gi}>
                  {group.title && <div className="subhead">{t(group.title)}</div>}
                  <div className={`fgrid cols-${group.columns ?? 2}`} style={{ '--cols': group.columns ?? 2 } as CSSProperties}>
                    {group.fields.map((spec, fi) => (
                      <FieldEditor
                        key={`${spec.kind}-${'key' in spec ? spec.key : fi}`}
                        spec={spec}
                        values={values}
                        disabled={disabled}
                        onSet={(key, value) => setValue(eye, section.id, key, value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
