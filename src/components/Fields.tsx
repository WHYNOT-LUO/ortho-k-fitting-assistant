import { useEffect, useState, type ReactNode } from 'react';
import { formatNumber, isOutOfRange } from '../domain/fieldSpecs';
import { useLang, type MessageKey } from '../i18n';

function parseNumber(text: string): number | null {
  // Accept the typographic minus sign and full-width characters people paste in.
  const cleaned = text.replace(/[−–]/g, '-').replace(/，/g, ',').replace(/＋/g, '+').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '+') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

interface NumberInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  step?: number;
  decimals?: number;
  range?: [number, number];
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Number box that keeps what you type (so "-" or "4." are allowed mid-typing)
 * and stores null when empty. Shows a soft warning outside the usual range.
 */
export function NumberInput({ value, onChange, unit, step, range, id, ariaLabel, disabled }: NumberInputProps) {
  const [text, setText] = useState(value === null ? '' : String(value));

  // Keep in sync when the value changes from outside (e.g. readings, demo data).
  useEffect(() => {
    if (parseNumber(text) !== value) setText(value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const out = isOutOfRange(value, range);
  return (
    <div className="input-wrap">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        className={out ? 'out-of-range' : ''}
        value={text}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseNumber(e.target.value));
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
}

let idCounter = 0;
function useFieldId() {
  const [id] = useState(() => `f${++idCounter}`);
  return id;
}

export function Field({
  label,
  hint,
  warn,
  children,
  id,
  wide,
}: {
  label: string;
  hint?: string;
  warn?: string | null;
  children: ReactNode;
  id?: string;
  wide?: boolean;
}) {
  return (
    <div className="field" style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <label htmlFor={id}>{label}</label>
      {children}
      {warn ? <span className="warn">{warn}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function NumberField(props: NumberInputProps & { label: MessageKey; hint?: MessageKey }) {
  const { t } = useLang();
  const id = useFieldId();
  const warn =
    props.range && isOutOfRange(props.value, props.range)
      ? t('form.outOfRange', { min: props.range[0], max: props.range[1] })
      : null;
  return (
    <Field label={t(props.label)} hint={props.hint ? t(props.hint) : undefined} warn={warn} id={id}>
      <NumberInput {...props} id={id} />
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  multiline,
  wide,
  disabled,
}: {
  label: MessageKey;
  value: string;
  onChange: (v: string) => void;
  hint?: MessageKey;
  multiline?: boolean;
  wide?: boolean;
  disabled?: boolean;
}) {
  const { t } = useLang();
  const id = useFieldId();
  return (
    <Field label={t(label)} hint={hint ? t(hint) : undefined} id={id} wide={wide}>
      {multiline ? (
        <textarea id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type="text" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: MessageKey;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: MessageKey }[];
  disabled?: boolean;
}) {
  const { t } = useLang();
  const id = useFieldId();
  return (
    <Field label={t(label)} id={id}>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('common.select')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: MessageKey;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="field" style={{ justifyContent: 'flex-end' }}>
      <label className="check">
        <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        {t(label)}
      </label>
    </div>
  );
}

export function ReadonlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="mono" style={{ padding: '6px 0' }}>
        {value || '—'}
      </div>
    </div>
  );
}

/** Parses "450, 496, 450" (commas, spaces or Chinese commas) into numbers. */
export function parseReadings(text: string): number[] {
  return text
    .replace(/[−–]/g, '-')
    .split(/[\s,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export { formatNumber, parseNumber };
