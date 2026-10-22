import { examSections, formatNumber, formatSigned, sectionValues, type FieldSpec } from '../domain/fieldSpecs';
import { EYES, type OrthoKCase } from '../domain/types';
import { useLang } from '../i18n';

const SIGNED_KEYS = new Set(['sphere', 'cylinder', 'se']);

function useDisplay() {
  const { t } = useLang();
  return (spec: FieldSpec, values: Record<string, unknown>): string => {
    switch (spec.kind) {
      case 'number': {
        const v = values[spec.key] as number | null;
        const s = SIGNED_KEYS.has(spec.key) ? formatSigned(v, spec.decimals) : formatNumber(v, spec.decimals);
        return s ? `${s}${spec.unit ? ` ${spec.unit}` : ''}` : '';
      }
      case 'computed': {
        const v = spec.compute(values);
        const s = SIGNED_KEYS.has(spec.key) ? formatSigned(v, spec.decimals) : formatNumber(v, spec.decimals);
        return s ? `${s}${spec.unit ? ` ${spec.unit}` : ''}` : '';
      }
      case 'measured': {
        const v = formatNumber(values[spec.key] as number | null, spec.decimals);
        const sd = formatNumber(values[spec.sdKey] as number | null, spec.decimals + 1);
        if (!v) return '';
        return `${v} ${spec.unit}${sd ? `  (SD ${sd})` : ''}`;
      }
      case 'text':
        return values[spec.key] as string;
      case 'select': {
        const opt = spec.options.find((o) => o.value === values[spec.key]);
        return opt ? t(opt.label) : '';
      }
      case 'check':
        return values[spec.key] ? t('common.yes') : '';
    }
  };
}

/** Read-only table of the exam, OD and OS side by side. Empty rows are hidden. */
export function ExamOverview({ c }: { c: OrthoKCase }) {
  const { t } = useLang();
  const display = useDisplay();
  const eyes = EYES.filter((e) => c.eyesFitted[e]);

  return (
    <>
      {examSections.map((section) => {
        const rows = section.groups.flatMap((group) =>
          group.fields
            .map((spec) => ({
              group: group.prefixRows ? group.title : undefined,
              spec,
              cells: eyes.map((eye) => display(spec, sectionValues(c.eyes[eye], section.id))),
            }))
            .filter((r) => r.cells.some(Boolean)),
        );
        return (
          <section key={section.id} className="card">
            <h3>{t(section.title)}</h3>
            {rows.length === 0 ? (
              <p className="muted small">{t('common.notRecorded')}</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '34%' }} />
                      {eyes.map((eye) => (
                        <th key={eye}>
                          <span className={`eye-tag ${eye}`}>{eye}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="muted">
                          {r.group ? <span className="small">{t(r.group)} · </span> : null}
                          {t(r.spec.label)}
                        </td>
                        {r.cells.map((cell, j) => (
                          <td key={j} className="mono">
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
