import type { ReactElement, ReactNode } from 'react';
import styles from './SeverityBadge.module.css';

/** Severity colour comes from tokens via a data attribute, not inline values. */
export const SeverityBadge = ({ severity, children }: Readonly<{ severity: number; children: ReactNode }>): ReactElement => (
  <span className={styles.badge} data-severity={severity}>
    {children}
  </span>
);
