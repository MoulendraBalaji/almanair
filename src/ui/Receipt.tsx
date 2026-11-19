'use client';

/** Explains one modelled change with the same numbers used by the plan. */
import type { ImpactReceipt } from '@/domain/impact/receipt';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { Panel } from './Panel';
import { SourceList } from './SourceList';
import { formatUnit } from './format';
import styles from './Receipt.module.css';

/** One labelled value in the receipt definition list. */
const Line = ({ label, value }: Readonly<{ label: string; value: string }>): ReactElement => (
  <div className={styles.line}>
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

/** Structured exposure, carbon and confidence disclosure for one action. */
export const Receipt = ({ receipt }: Readonly<{ receipt: ImpactReceipt }>): ReactElement => {
  const { locale, plan, t, tk } = useApp();
  const sources = plan?.sources.filter((source) => receipt.sources.includes(source.id)) ?? [];
  return (
    <Panel title={t('receipt.title')} tone="accent">
      <dl className={styles.values}>
        <Line label={t('receipt.exposure')} value={formatUnit({ locale, translate: tk, key: 'units.microgramsPerDay', value: receipt.exposureDelta })} />
        <Line label={t('receipt.emissions')} value={formatUnit({ locale, translate: tk, key: 'units.kgPerWeek', value: receipt.emissionsDelta })} />
        <Line label={t('receipt.confidence')} value={tk(`app.${receipt.confidence}`)} />
      </dl>
      <details className={styles.details}>
        <summary>{t('app.more')}</summary>
        <p>{t('receipt.formulaDose')}</p>
        <p>{t('receipt.envelope')}</p>
        <p>{t('receipt.noHealth')}</p>
      </details>
      <SourceList sources={sources} title={t('app.source')} />
    </Panel>
  );
};
