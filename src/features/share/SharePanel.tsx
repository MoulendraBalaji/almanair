'use client';

/** Expanded local sharing: a private digest, a cited summary and a printout. */
import type { Plan } from '@/domain/plan';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Button } from '@/ui/Button';
import { Panel } from '@/ui/Panel';
import { SafeText } from '@/ui/SafeText';
import { useShare } from './useShare';
import styles from './Share.module.css';

/** Shows the exact text that copy and print actions use. */
export const SharePanel = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { t } = useApp();
  const { notice, copyDigest, copySummary, printPlan } = useShare(plan);
  return (
    <Panel title={t('share.title')}>
      <p>{t('share.subtitle')}</p>
      <details className={styles.digest}>
        <summary>{t('ask.basedOn')}</summary>
        <SafeText text={plan.digest} />
      </details>
      <div className={styles.buttons}>
        <Button onClick={copyDigest}>{t('share.copyDigest')}</Button>
        <Button variant="secondary" onClick={copySummary}>{t('share.copySummary')}</Button>
        <Button variant="quiet" onClick={printPlan}>{t('share.printPlan')}</Button>
      </div>
      <p className={styles.notice} role="status" aria-live="polite">{notice ? t(notice) : null}</p>
    </Panel>
  );
};
