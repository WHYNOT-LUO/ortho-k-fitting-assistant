import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import type { OrthoKCase } from '../domain/types';
import { loadCasesWithStatus, saveCases } from './caseStore';

interface CasesContextValue {
  cases: OrthoKCase[];
  /** Last storage error, if saving failed. */
  error: string | null;
  /** Set when saved data could not be read and was copied aside under this key. */
  recoveredKey: string | null;
  getCase: (id: string) => OrthoKCase | undefined;
  upsertCase: (c: OrthoKCase) => void;
  deleteCase: (id: string) => void;
  replaceAll: (cases: OrthoKCase[]) => void;
}

const CasesContext = createContext<CasesContextValue | null>(null);

export function CasesProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadCasesWithStatus());
  const [cases, setCases] = useState<OrthoKCase[]>(initial.cases);
  const [error, setError] = useState<string | null>(null);
  // Always build on the latest list, even when two saves happen before a re-render.
  const latest = useRef(cases);

  const commit = useCallback((next: OrthoKCase[]) => {
    latest.current = next;
    setCases(next);
    setError(saveCases(next));
  }, []);

  const value: CasesContextValue = {
    cases,
    error,
    recoveredKey: initial.recoveredKey,
    getCase: (id) => cases.find((c) => c.id === id),
    upsertCase: (c) => {
      const stamped = { ...c, updatedAt: new Date().toISOString() };
      const current = latest.current;
      const exists = current.some((x) => x.id === c.id);
      commit(exists ? current.map((x) => (x.id === c.id ? stamped : x)) : [...current, stamped]);
    },
    deleteCase: (id) => commit(latest.current.filter((c) => c.id !== id)),
    replaceAll: commit,
  };

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
}

export function useCases(): CasesContextValue {
  const value = useContext(CasesContext);
  if (!value) throw new Error('useCases must be used inside <CasesProvider>');
  return value;
}
