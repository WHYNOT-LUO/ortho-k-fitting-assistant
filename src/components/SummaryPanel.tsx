import { useState } from 'react';
import { optometristSummary, parentSummary } from '../domain/summary';
import type { OrthoKCase } from '../domain/types';
import { useLang, type MessageKey } from '../i18n';

function SummaryCard({ title, text }: { title: MessageKey; text: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: the text can still be selected by hand
    }
  };
  return (
    <section className="card">
      <div className="page-head" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{t(title)}</h3>
        <button className="btn btn-sm no-print" onClick={copy}>
          {copied ? t('common.copied') : t('common.copy')}
        </button>
      </div>
      <div className="summary-text">{text}</div>
    </section>
  );
}

/** Part 5: rule-based summaries for the optometrist and for parents. */
export function SummaryPanel({ c }: { c: OrthoKCase }) {
  const { t, lang } = useLang();
  return (
    <div>
      <div className="page-head" style={{ marginBottom: 8 }}>
        <p className="muted small" style={{ margin: 0 }}>
          {t('sum.intro')}
        </p>
        <button className="btn btn-sm no-print" onClick={() => window.print()}>
          {t('sum.print')}
        </button>
      </div>
      <SummaryCard title="sum.title" text={optometristSummary(c, lang)} />
      <SummaryCard title="sum.parentTitle" text={parentSummary(c, lang)} />
    </div>
  );
}
