'use client';

/** Accessible hourly comparison of the usual and low-smog days. */
import { config } from '@/config';
import type { PlanHour } from '@/domain/plan';
import type { ReactElement } from 'react';
import { useApp } from '@/features/app/AppProvider';
import { formatNumber } from './format';
import styles from './HourChart.module.css';

/** Converts a dose into a bounded bar height percentage. */
const heightFor = (dose: number, scale: number): string => `${((dose / scale) * config.math.percent).toFixed(config.math.decimals)}%`;

/** Equivalent data table for assistive technology. */
const HourTable = ({ hours }: Readonly<{ hours: readonly PlanHour[] }>): ReactElement => {
  const { locale, t, tk } = useApp();
  return (
    <table className={styles.table}>
      <caption className="sr-only">{t('routine.chartAlt')}</caption>
      <thead>
        <tr>
          <th scope="col">{t('app.today')}</th>
          <th scope="col">{t('routine.usual')}</th>
          <th scope="col">{t('routine.adjusted')}</th>
        </tr>
      </thead>
      <tbody>
        {hours.map((hour) => (
          <tr key={hour.hour}>
            <th scope="row">{hour.hour}</th>
            <td>{tk(`activity.${hour.usualActivity}`)}</td>
            <td>
              <span className={styles.cellText}>
                <span>{tk(`activity.${hour.adjustedActivity}`)}</span>
                <span>{formatNumber(locale, hour.adjustedDose)}</span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/** Chart plus an equivalent data table for assistive technology. */
export const HourChart = ({ hours }: Readonly<{ hours: readonly PlanHour[] }>): ReactElement => {
  const { t } = useApp();
  const peak = hours.reduce((highest, hour) => Math.max(highest, hour.usualDose, hour.adjustedDose), 0);
  const scale = Math.max(peak, 1);
  return (
    <figure className={styles.figure}>
      <figcaption>{t('routine.chart')}</figcaption>
      <div className={styles.chart} aria-hidden="true">
        {hours.map((hour) => (
          <div className={styles.column} key={hour.hour}>
            <div className={styles.bars}>
              <span className={styles.usual} style={{ height: heightFor(hour.usualDose, scale) }} />
              <span className={styles.adjusted} style={{ height: heightFor(hour.adjustedDose, scale) }} />
            </div>
            <span className={styles.hour}>{hour.hour}</span>
          </div>
        ))}
      </div>
      <HourTable hours={hours} />
    </figure>
  );
};
