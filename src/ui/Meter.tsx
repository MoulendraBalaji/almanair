import { config } from '@/config';
import type { ReactElement } from 'react';
import styles from './Meter.module.css';

/** Accessible proportion bar; the caller supplies the percentage value. */
export const Meter = ({ value, label }: Readonly<{ value: number; label: string }>): ReactElement => (
  <div
    className={styles.track}
    role="meter"
    aria-label={label}
    aria-valuemin={0}
    aria-valuemax={config.math.percent}
    aria-valuenow={Math.round(value)}
  >
    <span className={styles.fill} style={{ width: `${value.toFixed(config.math.decimals)}%` }} />
  </div>
);
