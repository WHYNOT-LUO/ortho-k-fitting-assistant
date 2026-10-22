import { useEffect, useMemo, useState } from 'react';
import { CheckField, NumberField, SelectField, TextField } from '../components/Fields';
import { ExamSectionEditor } from '../components/ExamSectionEditor';
import { examSections, type SectionId } from '../domain/fieldSpecs';
import { EYES, emptyCase, type Eye, type OrthoKCase } from '../domain/types';
import { useLang } from '../i18n';
import { navigate, setNavigationGuard } from '../router';
import { nextCaseId } from '../storage/caseStore';
import { useCases } from '../storage/CasesContext';

/** New case (no caseId) or edit an existing one. */
export function CaseFormPage({ caseId }: { caseId?: string }) {
  const { t } = useLang();
  const { cases, getCase, upsertCase } = useCases();
  const existing = caseId ? getCase(caseId) : undefined;

  const original = useMemo<OrthoKCase>(
    () => existing ?? emptyCase(nextCaseId(cases)),
    // Only compute once per page open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [caseId],
  );
  const [draft, setDraft] = useState<OrthoKCase>(() => structuredClone(original));
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);

  // Warn before leaving with unsaved changes (closing the tab, or another page in the app).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    setNavigationGuard(() => window.confirm(t('form.confirmLeave')));
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      setNavigationGuard(null);
    };
  }, [dirty, t]);

  if (caseId && !existing) {
    return <p className="muted">{t('case.notFound', { id: caseId })}</p>;
  }

  const update = (fn: (c: OrthoKCase) => void) => {
    setDraft((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  };

  const setExamValue = (eye: Eye, section: SectionId, key: string, value: unknown) =>
    update((c) => {
      (c.eyes[eye][section] as unknown as Record<string, unknown>)[key] = value;
    });

  const copyODtoOS = (section: SectionId) =>
    update((c) => {
      (c.eyes.OS as unknown as Record<string, unknown>)[section] = structuredClone(c.eyes.OD[section]);
    });

  const save = () => {
    upsertCase(draft);
    setNavigationGuard(null);
    navigate(`/cases/${encodeURIComponent(draft.id)}`);
  };

  const cancel = () => navigate(existing ? `/cases/${encodeURIComponent(existing.id)}` : '/cases');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="page-head">
        <div>
          <h1>{existing ? t('form.editTitle', { id: draft.id }) : t('form.newTitle')}</h1>
          <p className="muted small" style={{ margin: 0 }}>
            {t('form.noPersonalData')}
          </p>
        </div>
        {draft.synthetic && <span className="badge badge-synthetic">{t('common.synthetic')}</span>}
      </div>

      <section className="card">
        <h2>{t('section.caseInfo')}</h2>
        <div className="grid grid-4">
          <div className="field">
            <span className="label">{t('field.caseId')}</span>
            <div className="mono" style={{ padding: '6px 0', fontWeight: 600 }}>
              {draft.id}
            </div>
          </div>
          <div className="field">
            <label htmlFor="examDate">{t('field.examDate')}</label>
            <input
              id="examDate"
              type="date"
              value={draft.examDate}
              onChange={(e) => update((c) => void (c.examDate = e.target.value))}
            />
          </div>
          <NumberField
            label="field.ageYears"
            value={draft.ageYears}
            step={1}
            range={[5, 60]}
            onChange={(v) => update((c) => void (c.ageYears = v === null ? null : Math.round(v)))}
          />
          <div className="field">
            <span className="label">{t('field.eyesFitted')}</span>
            <div className="toolbar" style={{ paddingTop: 4 }}>
              {EYES.map((eye) => (
                <label key={eye} className="check">
                  <input
                    type="checkbox"
                    checked={draft.eyesFitted[eye]}
                    onChange={(e) => update((c) => void (c.eyesFitted[eye] = e.target.checked))}
                  />
                  {t(`eye.${eye}`)}
                </label>
              ))}
            </div>
          </div>
          <CheckField
            label="field.wantsFast"
            checked={draft.wantsFastCorrection}
            onChange={(v) => update((c) => void (c.wantsFastCorrection = v))}
          />
        </div>
      </section>

      <section className="card">
        <h2>{t('section.history')}</h2>
        <div className="grid grid-4">
          <SelectField
            label="field.familyMyopia"
            value={draft.history.familyMyopia}
            options={[
              { value: 'none', label: 'opt.family.none' },
              { value: 'one-parent', label: 'opt.family.one-parent' },
              { value: 'both-parents', label: 'opt.family.both-parents' },
              { value: 'unknown', label: 'opt.family.unknown' },
            ]}
            onChange={(v) => update((c) => void (c.history.familyMyopia = v as OrthoKCase['history']['familyMyopia']))}
          />
          <NumberField
            label="field.onsetAge"
            value={draft.history.myopiaOnsetAge}
            unit={t('unit.years')}
            step={1}
            range={[2, 40]}
            onChange={(v) => update((c) => void (c.history.myopiaOnsetAge = v))}
          />
          <NumberField
            label="field.progression"
            hint="hint.progression"
            value={draft.history.progressionDPerYear}
            unit={t('unit.dPerYear')}
            step={0.25}
            range={[0, 3]}
            onChange={(v) => update((c) => void (c.history.progressionDPerYear = v))}
          />
          <CheckField
            label="field.rhinitis"
            checked={draft.history.severeAllergicRhinitis}
            onChange={(v) => update((c) => void (c.history.severeAllergicRhinitis = v))}
          />
          <TextField
            label="field.historyNotes"
            wide
            value={draft.history.notes}
            onChange={(v) => update((c) => void (c.history.notes = v))}
          />
        </div>
      </section>

      {examSections.map((section) => (
        <ExamSectionEditor
          key={section.id}
          section={section}
          exams={draft.eyes}
          eyesFitted={draft.eyesFitted}
          setValue={setExamValue}
          copyODtoOS={copyODtoOS}
        />
      ))}

      <section className="card">
        <h2>{t('section.notes')}</h2>
        <TextField label="field.notes" multiline value={draft.notes} onChange={(v) => update((c) => void (c.notes = v))} />
      </section>

      <div className="savebar">
        <span className="muted small">{dirty ? t('form.unsaved') : ''}</span>
        <span className="spacer" />
        <button type="button" className="btn" onClick={cancel}>
          {t('common.cancel')}
        </button>
        <button type="submit" className="btn btn-primary">
          {t('common.save')}
        </button>
      </div>
    </form>
  );
}
