/**
 * Describes every per-eye exam field once: label, unit, step, decimals and a
 * plausible range. The form, the read-only overview and the CSV export all
 * read from this list, so a field only has to be added in one place.
 *
 * `range` is a data-entry sanity check (e.g. catching 2.48 typed for 24.8),
 * NOT a clinical rule. Clinical rules live in config/clinicRules.ts.
 */
import type { MessageKey } from '../i18n/zh';
import type { EyeExam, SdField } from './types';

interface BaseSpec {
  label: MessageKey;
  hint?: MessageKey;
}

export interface NumberSpec extends BaseSpec {
  kind: 'number';
  key: string;
  unit?: string;
  step: number;
  decimals: number;
  range?: [number, number];
}

export interface TextSpec extends BaseSpec {
  kind: 'text';
  key: string;
  wide?: boolean;
}

export interface SelectSpec extends BaseSpec {
  kind: 'select';
  key: string;
  options: { value: string; label: MessageKey }[];
}

export interface CheckSpec extends BaseSpec {
  kind: 'check';
  key: string;
}

/** A biometer value that comes with an SD and optional raw readings (rule R17). */
export interface MeasuredSpec extends BaseSpec {
  kind: 'measured';
  key: SdField;
  sdKey: string;
  unit: string;
  step: number;
  decimals: number;
  range: [number, number];
}

export interface ComputedSpec extends BaseSpec {
  kind: 'computed';
  /** Used as the CSV column name. */
  key: string;
  unit?: string;
  decimals: number;
  compute: (values: Record<string, unknown>) => number | null;
}

export type FieldSpec = NumberSpec | TextSpec | SelectSpec | CheckSpec | MeasuredSpec | ComputedSpec;

export interface FieldGroup {
  title?: MessageKey;
  columns?: number;
  /** Show the group title before each row in the read-only overview (for ambiguous labels like "Axis"). */
  prefixRows?: boolean;
  fields: FieldSpec[];
}

export type SectionId = keyof EyeExam;

export interface ExamSection {
  id: SectionId;
  title: MessageKey;
  subtitle: MessageKey;
  groups: FieldGroup[];
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function diff(a: unknown, b: unknown): number | null {
  const x = num(a);
  const y = num(b);
  return x === null || y === null ? null : y - x;
}

const healthOptions: SelectSpec['options'] = [
  { value: 'normal', label: 'opt.health.normal' },
  { value: 'abnormal', label: 'opt.health.abnormal' },
];

const basicSection: ExamSection = {
  id: 'basic',
  title: 'section.basic',
  subtitle: 'section.basic.sub',
  groups: [
    {
      title: 'group.va',
      columns: 2,
      fields: [
        { kind: 'text', key: 'vaUncorrected', label: 'field.vaUncorrected', hint: 'hint.va' },
        { kind: 'text', key: 'vaCorrected', label: 'field.vaCorrected' },
      ],
    },
    {
      title: 'group.health',
      columns: 2,
      fields: [
        { kind: 'select', key: 'cornealHealth', label: 'field.cornealHealth', options: healthOptions },
        { kind: 'select', key: 'ocularSurfaceHealth', label: 'field.ocularSurfaceHealth', options: healthOptions },
        { kind: 'check', key: 'sensitiveCornea', label: 'field.sensitiveCornea' },
        { kind: 'text', key: 'surfaceNotes', label: 'field.surfaceNotes', wide: true },
      ],
    },
    {
      title: 'group.refraction',
      columns: 4,
      fields: [
        { kind: 'number', key: 'sphere', label: 'field.sphere', unit: 'D', step: 0.25, decimals: 2, range: [-15, 8] },
        {
          kind: 'number',
          key: 'cylinder',
          label: 'field.cylinder',
          unit: 'D',
          step: 0.25,
          decimals: 2,
          range: [-8, 0],
          hint: 'hint.minusCyl',
        },
        { kind: 'number', key: 'axis', label: 'field.axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
        {
          kind: 'computed',
          key: 'se',
          label: 'field.se',
          unit: 'D',
          decimals: 2,
          compute: (v) => {
            const s = num(v.sphere);
            return s === null ? null : s + (num(v.cylinder) ?? 0) / 2;
          },
        },
        { kind: 'check', key: 'cycloplegic', label: 'field.cycloplegic' },
      ],
    },
    {
      title: 'group.keratometry',
      columns: 5,
      prefixRows: true,
      fields: [
        { kind: 'number', key: 'kK1', label: 'field.kK1', unit: 'D', step: 0.25, decimals: 2, range: [35, 55] },
        { kind: 'number', key: 'kK1Axis', label: 'field.axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
        { kind: 'number', key: 'kK2', label: 'field.kK2', unit: 'D', step: 0.25, decimals: 2, range: [35, 55] },
        { kind: 'number', key: 'kK2Axis', label: 'field.axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
        { kind: 'computed', key: 'kCyl', label: 'field.kCyl', unit: 'D', decimals: 2, compute: (v) => diff(v.kK1, v.kK2) },
      ],
    },
    {
      title: 'group.iopFundus',
      columns: 3,
      fields: [
        { kind: 'number', key: 'iop', label: 'field.iop', unit: 'mmHg', step: 1, decimals: 0, range: [7, 30] },
        { kind: 'check', key: 'fundusChecked', label: 'field.fundusChecked' },
        { kind: 'text', key: 'fundusNotes', label: 'field.fundusNotes' },
      ],
    },
  ],
};

const biometrySection: ExamSection = {
  id: 'biometry',
  title: 'section.biometry',
  subtitle: 'section.biometry.sub',
  groups: [
    {
      title: 'group.biometerMeasured',
      columns: 1,
      fields: [
        { kind: 'measured', key: 'al', sdKey: 'alSd', label: 'field.al', unit: 'mm', step: 0.01, decimals: 2, range: [19, 32] },
        { kind: 'measured', key: 'cct', sdKey: 'cctSd', label: 'field.cct', unit: 'μm', step: 1, decimals: 0, range: [400, 700] },
        { kind: 'measured', key: 'ad', sdKey: 'adSd', label: 'field.ad', unit: 'mm', step: 0.01, decimals: 2, range: [2, 5] },
        { kind: 'measured', key: 'lt', sdKey: 'ltSd', label: 'field.lt', unit: 'mm', step: 0.01, decimals: 2, range: [2.5, 6] },
        { kind: 'measured', key: 'vt', sdKey: 'vtSd', label: 'field.vt', unit: 'mm', step: 0.01, decimals: 2, range: [13, 24] },
        { kind: 'measured', key: 'k1', sdKey: 'k1Sd', label: 'field.bK1', unit: 'D', step: 0.01, decimals: 2, range: [35, 55] },
        { kind: 'measured', key: 'k2', sdKey: 'k2Sd', label: 'field.bK2', unit: 'D', step: 0.01, decimals: 2, range: [35, 55] },
      ],
    },
    {
      title: 'group.biometerOther',
      columns: 3,
      fields: [
        { kind: 'number', key: 'k1Axis', label: 'field.bK1Axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
        { kind: 'number', key: 'k2Axis', label: 'field.bK2Axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
        { kind: 'number', key: 'cornealAstig', label: 'field.cornealAstig', unit: 'D', step: 0.01, decimals: 2, range: [-8, 8] },
        { kind: 'number', key: 'pupil', label: 'field.pupil', unit: 'mm', step: 0.1, decimals: 1, range: [2, 9] },
        { kind: 'number', key: 'wtw', label: 'field.wtw', unit: 'mm', step: 0.1, decimals: 1, range: [10, 13.5] },
      ],
    },
  ],
};

function simKGroup(zone: 3 | 5 | 7, title: MessageKey): FieldGroup {
  const k1 = `simK1_${zone}`;
  const k2 = `simK2_${zone}`;
  return {
    title,
    columns: 5,
    prefixRows: true,
    fields: [
      { kind: 'number', key: k1, label: 'field.simK1', unit: 'D', step: 0.01, decimals: 2, range: [35, 55] },
      { kind: 'number', key: `simK1Axis_${zone}`, label: 'field.axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
      { kind: 'number', key: k2, label: 'field.simK2', unit: 'D', step: 0.01, decimals: 2, range: [35, 55] },
      { kind: 'number', key: `simK2Axis_${zone}`, label: 'field.axis', unit: '°', step: 1, decimals: 0, range: [0, 180] },
      { kind: 'computed', key: `dk_${zone}`, label: 'field.dk', unit: 'D', decimals: 2, compute: (v) => diff(v[k1], v[k2]) },
    ],
  };
}

const topographySection: ExamSection = {
  id: 'topography',
  title: 'section.topography',
  subtitle: 'section.topography.sub',
  groups: [
    simKGroup(3, 'group.simK3'),
    simKGroup(5, 'group.simK5'),
    simKGroup(7, 'group.simK7'),
    {
      title: 'group.eValue',
      columns: 4,
      fields: [
        { kind: 'number', key: 'e6', label: 'field.e6', step: 0.01, decimals: 2, range: [-0.5, 1.2] },
        { kind: 'number', key: 'e7', label: 'field.e7', step: 0.01, decimals: 2, range: [-0.5, 1.2] },
        { kind: 'number', key: 'e8', label: 'field.e8', step: 0.01, decimals: 2, range: [-0.5, 1.2] },
        { kind: 'number', key: 'shapeFactor', label: 'field.shapeFactor', step: 0.01, decimals: 2, range: [-1, 1.5] },
      ],
    },
    {
      title: 'group.kcScreen',
      columns: 2,
      fields: [
        {
          kind: 'select',
          key: 'keratoconusPanel',
          label: 'field.kcPanel',
          options: [
            { value: 'clear', label: 'opt.kc.clear' },
            { value: 'suspect', label: 'opt.kc.suspect' },
          ],
        },
      ],
    },
  ],
};

export const examSections: ExamSection[] = [basicSection, biometrySection, topographySection];

/** Read one section of an eye exam as a plain record (for generic rendering). */
export function sectionValues(exam: EyeExam, id: SectionId): Record<string, unknown> {
  return exam[id] as unknown as Record<string, unknown>;
}

export function isOutOfRange(value: number | null, range?: [number, number]): boolean {
  return value !== null && range !== undefined && (value < range[0] || value > range[1]);
}

export function formatNumber(value: number | null, decimals: number): string {
  if (value === null || !Number.isFinite(value)) return '';
  return value.toFixed(decimals);
}

export { formatSigned } from './format';
