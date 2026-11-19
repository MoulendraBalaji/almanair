'use client';

/** Shared application chrome around each route. */
import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import { useApp } from './AppProvider';
import { Navigation } from './Navigation';
import styles from './Shell.module.css';

/** Skip link, navigation, main region, offline badge and safety footer. */
export const Shell = ({ children }: Readonly<{ children: ReactNode }>): ReactElement => {
  const { t, online, status } = useApp();
  return (
    <div className={styles.app}>
      <a className="skip-link" href="#main">
        {t('app.skip')}
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Link href="/today">{t('app.name')}</Link>
          <p>{t('app.tagline')}</p>
        </div>
        <Navigation />
      </header>
      {!online ? <p className={styles.offline}>{t('app.offline')}</p> : null}
      <main className={styles.main} id="main">
        {status === 'loading' ? <p>{t('app.loading')}</p> : children}
      </main>
      <footer className={styles.footer}>
        <p>{t('app.notMedical')}</p>
        <p>{t('app.seekCare')}</p>
        <p>{t('app.about')}</p>
      </footer>
    </div>
  );
};
