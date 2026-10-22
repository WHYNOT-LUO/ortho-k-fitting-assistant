import { useLang } from './i18n';
import { CaseFormPage } from './pages/CaseFormPage';
import { CaseListPage } from './pages/CaseListPage';
import { CASE_TABS, CaseViewPage, type CaseTab } from './pages/CaseViewPage';
import { DashboardPage } from './pages/DashboardPage';
import { RulesPage } from './pages/RulesPage';
import { href, useHashPath } from './router';

function Page({ path }: { path: string[] }) {
  const { t } = useLang();
  const [section = 'cases', id, sub] = path;

  if (section === 'new') return <CaseFormPage key="new" />;
  if (section === 'cases' && !id) return <CaseListPage />;
  if (section === 'cases' && id) {
    if (sub === 'edit') return <CaseFormPage key={`edit-${id}`} caseId={id} />;
    const tab = (CASE_TABS as readonly string[]).includes(sub ?? '') ? (sub as CaseTab) : 'overview';
    return <CaseViewPage caseId={id} tab={tab} />;
  }
  if (section === 'rules') return <RulesPage />;
  if (section === 'dashboard') return <DashboardPage />;
  return <p className="muted">{t('common.notFound')}</p>;
}

export function App() {
  const { t, lang, setLang } = useLang();
  const path = useHashPath();
  const section = path[0] ?? 'cases';

  return (
    <div className="app">
      <div className="banner" role="note">
        {t('app.banner')}
      </div>
      <header className="topbar">
        <a className="brand" href={href('/cases')} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <div className="brand-title">{t('app.title')}</div>
            <div className="brand-sub">{t('app.subtitle')}</div>
          </div>
        </a>
        <nav className="nav">
          <a className={section === 'cases' ? 'active' : ''} href={href('/cases')}>
            {t('nav.cases')}
          </a>
          <a className={section === 'new' ? 'active' : ''} href={href('/new')}>
            {t('nav.newCase')}
          </a>
          <a className={section === 'dashboard' ? 'active' : ''} href={href('/dashboard')}>
            {t('nav.dashboard')}
          </a>
          <a className={section === 'rules' ? 'active' : ''} href={href('/rules')}>
            {t('nav.rules')}
          </a>
          <button className="btn btn-ghost" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
            {t('lang.toggle')}
          </button>
        </nav>
      </header>
      <main className="main">
        <Page path={path} />
      </main>
      <footer className="footer">{t('app.privacy')}</footer>
    </div>
  );
}
