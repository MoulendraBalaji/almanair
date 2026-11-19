'use client';

/** Today's reading, situation, ventilation, indoor estimate and top actions. */
import type { Plan } from '@/domain/plan';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { ActionCard } from '@/ui/ActionCard';
import { Panel } from '@/ui/Panel';
import { SeverityBadge } from '@/ui/SeverityBadge';
import { SourceList } from '@/ui/SourceList';
import { formatNumber } from '@/ui/format';
import { SharePanel } from '@/features/share/SharePanel';
import { ReadingForm } from './ReadingForm';
import styles from './Today.module.css';

/** The validated reading in the selected standard. */
const Score = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { locale, t, tk } = useApp();
  return (
    <div className={styles.score} data-severity={plan.severityKey}>
      <p className={styles.scoreValue}>{formatNumber(locale, plan.reading.index)}</p>
      <SeverityBadge severity={plan.reading.severity}>{tk(plan.severityKey)}</SeverityBadge>
      <dl className={styles.facts}>
        <dt>{t('today.aqiLabel')}</dt>
        <dd>{tk(plan.standardLabelKey)}</dd>
        <dt>{t('today.pmLabel')}</dt>
        <dd>{formatNumber(locale, plan.reading.concentration)}</dd>
        <dt>{t('today.readingLabel')}</dt>
        <dd>{tk(plan.location.nameKey)}</dd>
      </dl>
    </div>
  );
};

/** One clean-air window, or an explicit instruction to keep windows shut. */
const Ventilation = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { t } = useApp();
  const window = plan.ventilation;
  const advice = window.open && window.startHour !== null && window.endHour !== null
    ? t('today.ventOpen', { start: String(window.startHour), end: String(window.endHour) })
    : t('today.ventClosed');
  return (
    <Panel title={t('today.ventilation')}>
      <p>{advice}</p>
    </Panel>
  );
};

/** The modelled concentration in the largest room. */
const Indoor = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { locale, t } = useApp();
  return (
    <Panel title={t('today.indoor')}>
      <p>{t('today.indoorDetail', { value: formatNumber(locale, plan.indoor.central) })}</p>
    </Panel>
  );
};

/** Ranked moves using the same receipts as the rest of the plan. */
const TopActions = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={t('today.topActions')}>
      <div className={styles.actions}>
        {plan.actions.map((item) => <ActionCard key={item.action.id} item={item} />)}
      </div>
    </Panel>
  );
};

/** Plain-language guidance for the household and its vulnerable members. */
const Guidance = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { t, tk } = useApp();
  return (
    <Panel title={t('today.guidance')}>
      <p>{tk(plan.guidance.generalKey)}</p>
      <h3>{t('today.vulnerable')}</h3>
      <p>{tk(plan.guidance.vulnerableKey)}</p>
    </Panel>
  );
};

/** Composes the whole report from one deterministic plan. */
export const TodayView = (): ReactElement => {
  const { plan, t, tk } = useApp();
  if (!plan) return <p>{t('app.empty')}</p>;
  return (
    <div className={styles.view}>
      <Panel title={t('today.title')}>
        <p className={styles.dateline}>{t('today.dateline')}</p>
        <Score plan={plan} />
        <p>{t('today.skySummary', { label: tk(plan.severityKey) })}</p>
        <details className={styles.editor}>
          <summary>{t('today.setReading')}</summary>
          <ReadingForm />
        </details>
      </Panel>
      <Ventilation plan={plan} />
      <Indoor plan={plan} />
      <TopActions plan={plan} />
      <Guidance plan={plan} />
      <SharePanel plan={plan} />
      <Panel>
        <SourceList sources={plan.sources} title={t('app.source')} />
      </Panel>
    </div>
  );
};
