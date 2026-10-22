import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { OrthoKCase } from '../domain/types';
import { loadCases, saveCases } from './caseStore';

interface CasesContextValue {
  cases: OrthoKCase[];
  /** Last storage error, if saving failed. */
  error: string | null;
  getCase: (id: string) => OrthoKCase | undefined;
  upsertCase: (c: OrthoKCase) => void;
  deleteCase: (id: string) => void;
  replaceAll: (cases: OrthoKCase[]) => void;
}

const CasesContext = createContext<CasesContextValue | null>(null);

export function CasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<OrthoKCase[]>(loadCases);
  const [error, setError] = useState<string | null>(null);

  const commit = useCallback((next: OrthoKCase[]) => {
    setCases(next);
    setError(saveCases(next));
  }, []);

  const value: CasesContextValue = {
    cases,
    error,
    getCase: (id) => cases.find((c) => c.id === id),
    upsertCase: (c) => {
      const stamped = { ...c, updatedAt: new Date().toISOString() };
      const exists = cases.some((x) => x.id === c.id);
      commit(exists ? cases.map((x) => (x.id === c.id ? stamped : x)) : [...cases, stamped]);
    },
    deleteCase: (id) => commit(cases.filter((c) => c.id !== id)),
    replaceAll: commit,
  };

  return <CasesContext.Provider value={value}>{children}</CasesContext.Provider>;
}

export function useCases(): CasesContextValue {
  const value = useContext(CasesContext);
  if (!value) throw new Error('useCases must be used inside <CasesProvider>');
  return value;
}
