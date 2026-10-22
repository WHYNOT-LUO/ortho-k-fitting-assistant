import { useLang } from './i18n';
import { href, useHashPath } from './router';

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
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <div className="brand-title">{t('app.title')}</div>
            <div className="brand-sub">{t('app.subtitle')}</div>
          </div>
        </div>
        <nav className="nav">
          <a className={section === 'cases' ? 'active' : ''} href={href('/cases')}>
            {t('nav.cases')}
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
        <p className="muted">{t('common.notFound')}</p>
      </main>
      <footer className="footer">{t('app.privacy')}</footer>
    </div>
  );
}
