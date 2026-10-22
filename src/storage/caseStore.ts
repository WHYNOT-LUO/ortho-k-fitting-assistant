/**
 * Local storage for cases. Data never leaves this browser.
 *
 * Everything is kept as one JSON array under one localStorage key.
 * localStorage holds about 5 MB, which is thousands of cases without images.
 * Clearing the browser's site data deletes the cases, so the app also offers
 * a JSON backup file (export/import).
 */
import {
  SCHEMA_VERSION,
  emptyBasic,
  emptyBiometry,
  emptyCase,
  emptyFinalLens,
  emptyTopography,
  emptyTrialLens,
  emptyVisitEye,
  type OrthoKCase,
  type Visit,
} from '../domain/types';

export const CASES_STORAGE_KEY = 'orthok.cases.v1';

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Fill in any missing fields with defaults, so older saved data keeps working. */
function withDefaults<T extends object>(defaults: T, raw: unknown): T {
  if (!isObject(raw)) return defaults;
  const out: Raw = { ...(defaults as Raw) };
  for (const key of Object.keys(defaults)) {
    if (key in raw) out[key] = raw[key];
  }
  return out as T;
}

function normalizeVisit(raw: unknown): Visit {
  const v = withDefaults<Visit>(
    { id: '', date: '', kind: 'follow-up', eyes: { OD: emptyVisitEye(), OS: emptyVisitEye() }, notes: '' },
    raw,
  );
  const eyes = isObject(v.eyes) ? v.eyes : ({} as Raw);
  for (const eye of ['OD', 'OS'] as const) {
    const e = withDefaults(emptyVisitEye(), (eyes as Raw)[eye]);
    e.trials = Array.isArray(e.trials) ? e.trials.map((t) => withDefaults(emptyTrialLens(), t)) : [];
    v.eyes = { ...v.eyes, [eye]: e };
  }
  return v;
}

/** Turn anything parsed from JSON into a well-formed case (or null if it has no ID). */
export function normalizeCase(raw: unknown): OrthoKCase | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') return null;
  const base = emptyCase(raw.id);
  const c = withDefaults(base, raw);
  c.schemaVersion = SCHEMA_VERSION;
  c.history = withDefaults(base.history, raw.history);
  c.eyesFitted = withDefaults(base.eyesFitted, raw.eyesFitted);
  const rawEyes = isObject(raw.eyes) ? raw.eyes : {};
  const rawDesign = isObject(raw.design) ? raw.design : {};
  const rawLens = isObject(raw.finalLens) ? raw.finalLens : {};
  for (const eye of ['OD', 'OS'] as const) {
    const exam = isObject(rawEyes[eye]) ? (rawEyes[eye] as Raw) : {};
    c.eyes[eye] = {
      basic: withDefaults(emptyBasic(), exam.basic),
      biometry: withDefaults(emptyBiometry(), exam.biometry),
      topography: withDefaults(emptyTopography(), exam.topography),
    };
    if (!isObject(c.eyes[eye].biometry.readings)) c.eyes[eye].biometry.readings = {};
    c.design[eye] = isObject(rawDesign[eye]) ? (rawDesign[eye] as unknown as OrthoKCase['design']['OD']) : null;
    c.finalLens[eye] = withDefaults(emptyFinalLens(), rawLens[eye]);
  }
  c.flagResponses = isObject(raw.flagResponses) ? (raw.flagResponses as OrthoKCase['flagResponses']) : {};
  c.visits = Array.isArray(raw.visits) ? raw.visits.map(normalizeVisit) : [];
  return c;
}

export function parseCases(json: string): OrthoKCase[] {
  const data: unknown = JSON.parse(json);
  const list = Array.isArray(data) ? data : isObject(data) && Array.isArray(data.cases) ? data.cases : null;
  if (!list) throw new Error('Not a case backup file');
  return list.map(normalizeCase).filter((c): c is OrthoKCase => c !== null);
}

export function loadCases(): OrthoKCase[] {
  try {
    const json = localStorage.getItem(CASES_STORAGE_KEY);
    return json ? parseCases(json) : [];
  } catch {
    return [];
  }
}

/** Returns an error message if saving failed (e.g. storage full or blocked). */
export function saveCases(cases: OrthoKCase[]): string | null {
  try {
    localStorage.setItem(CASES_STORAGE_KEY, JSON.stringify(cases));
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** Next anonymous ID for the year, e.g. OK-2026-0007. */
export function nextCaseId(existing: { id: string }[], year = new Date().getFullYear()): string {
  const prefix = `OK-${year}-`;
  let max = 0;
  for (const { id } of existing) {
    if (id.startsWith(prefix)) {
      const n = Number(id.slice(prefix.length));
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

export function backupJson(cases: OrthoKCase[]): string {
  return JSON.stringify(
    { app: 'ortho-k-fitting-assistant', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), cases },
    null,
    2,
  );
}

/** Merge imported cases into existing ones; imported cases replace same-ID cases. */
export function mergeCases(existing: OrthoKCase[], incoming: OrthoKCase[]): OrthoKCase[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const c of incoming) byId.set(c.id, c);
  return [...byId.values()];
}
