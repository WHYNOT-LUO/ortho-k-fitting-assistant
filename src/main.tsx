import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { LangProvider } from './i18n';
import { CasesProvider } from './storage/CasesContext';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <CasesProvider>
        <App />
      </CasesProvider>
    </LangProvider>
  </StrictMode>,
);
