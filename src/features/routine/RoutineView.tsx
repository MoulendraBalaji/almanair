'use client';

/** Hour-by-hour comparison of the usual day and the low-smog day. */
import type { Plan, PlanHour } from '@/domain/plan';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { HourChart } from '@/ui/HourChart';
import { Panel } from '@/ui/Panel';
import { formatNumber, formatUnit } from '@/ui/format';
import styles from './Routine.module.css';

/** Whole-day exposure and emissions comparison. */
const Headline = ({ plan }: Readonly<{ plan: Plan }>): ReactElement => {
  const { locale, t, tk } = useApp();
  return (
    <Panel title={t('routine.headline')} tone="accent">
      <dl className={styles.totals}>
        <dt>{t('routine.usual')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.microgramsPerDay', value: plan.baselineDose.central })}</dd>
        <dt>{t('routine.adjusted')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.microgramsPerDay', value: plan.adjustedDose.central })}</dd>
        <dt>{t('receipt.total')}</dt>
        <dd>{formatUnit({ locale, translate: tk, key: 'units.microgramsPerDay', value: plan.receipt.exposureDelta })}</dd>
      </dl>
    </Panel>
  );
};

/** One hour of the adjusted day with its usual-day alternative. */
const HourRow = ({ hour }: Readonly<{ hour: PlanHour }>): ReactElement => {
  const { locale, t, tk } = useApp();
  return (
    <li className={styles.hour}>
      <p className={styles.time}>{t('routine.block', { time: String(hour.hour), name: tk(`activity.${hour.usualActivity}`) })}</p>
      <p>{t('routine.block', { time: String(hour.hour), name: tk(`activity.${hour.adjustedActivity}`) })}</p>
      <p className={styles.dose}>{t('routine.dose', { value: formatNumber(locale, hour.adjustedDose) })}</p>
    </li>
  );
};

/** The 24-hour plan in an accessible list. */
const Schedule = ({ hours }: Readonly<{ hours: readonly PlanHour[] }>): ReactElement => {
  const { t } = useApp();
  return (
    <Panel title={t('routine.title')}>
      <ul className={styles.hours}>
        {hours.map((hour) => <HourRow key={hour.hour} hour={hour} />)}
      </ul>
    </Panel>
  );
};

/** Highest and lowest inhaled dose in the adjusted day. */
const Extremes = ({ hours }: Readonly<{ hours: readonly PlanHour[] }>): ReactElement => {
  const { t, tk } = useApp();
  const peak = hours.reduce<PlanHour | undefined>((best, hour) => (!best || hour.adjustedDose > best.adjustedDose ? hour : best), undefined);
  const low = hours.reduce<PlanHour | undefined>((best, hour) => (!best || hour.adjustedDose < best.adjustedDose ? hour : best), undefined);
  return (
    <Panel title={t('routine.dateline')}>
      {peak ? <p>{t('routine.peakAt', { time: String(peak.hour), name: tk(`activity.${peak.adjustedActivity}`) })}</p> : null}
      {low ? <p>{t('routine.lowAt', { time: String(low.hour), name: tk(`activity.${low.adjustedActivity}`) })}</p> : null}
    </Panel>
  );
};

/** Composes the complete routine report. */
export const RoutineView = (): ReactElement => {
  const { plan, t } = useApp();
  if (!plan) return <p>{t('routine.empty')}</p>;
  return (
    <div className={styles.view}>
      <Headline plan={plan} />
      <Panel title={t('routine.chart')}>
        <HourChart hours={plan.hours} />
      </Panel>
      <Extremes hours={plan.hours} />
      <Schedule hours={plan.hours} />
    </div>
  );
};
